import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, Res, Req, ForbiddenException } from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { SignatureService } from './signature.service';
import { CreateSignatureDto } from './dto/create-signature.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '@avra/types';

@Controller('signature')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SignatureController {
  constructor(
    private readonly signature: SignatureService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Webhook endpoint for YouSign events.
   *
   * SÉCURITÉ (SEC-H8) : Vérifie la signature HMAC-SHA256 envoyée par YouSign
   * dans l'en-tête `X-Yousign-Signature-256` contre `YOUSIGN_WEBHOOK_SECRET`.
   * Sans ça, n'importe qui sur internet pouvait flipper un `SignatureRequest`
   * à SIGNED/REFUSED en devinant le `providerRef`.
   */
  @Post('webhook/yousign')
  @Public()
  async handleYousignWebhook(@Req() req: Request, @Body() body: any, @Res() res: Response) {
    const secret = process.env.YOUSIGN_WEBHOOK_SECRET;
    // En prod, le secret DOIT être configuré. En dev, on peut bypass si explicitement absent.
    if (process.env.NODE_ENV === 'production' && !secret) {
      console.error('[YouSign] YOUSIGN_WEBHOOK_SECRET not configured — rejecting webhook');
      return res.status(500).json({ received: false });
    }

    if (secret) {
      const signature = (req.get('X-Yousign-Signature-256') || req.get('x-yousign-signature-256') || '').replace(/^sha256=/, '');
      // Le corps est déjà parsé par Nest → on recalcule depuis la représentation JSON canonique.
      // Pour une vérification 100 % fiable il faut un raw-body middleware — à défaut, on vérifie
      // sur le JSON ré-sérialisé (stable car YouSign envoie du JSON plat).
      const rawBody = (req as any).rawBody ? (req as any).rawBody.toString('utf8') : JSON.stringify(body);
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      const sigBuf = Buffer.from(signature, 'hex');
      const expBuf = Buffer.from(expected, 'hex');
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        throw new ForbiddenException('Invalid YouSign webhook signature');
      }
    }

    try {
      const eventType = body?.subscription?.type;
      const yousignRequestId = body?.data?.signature_request?.id;

      if (yousignRequestId) {
        const record = await this.prisma.signatureRequest.findFirst({
          where: { providerRef: yousignRequestId },
        });

        if (record) {
          let newStatus: string | undefined;

          if (eventType === 'signature_request.done' || eventType === 'signer.done') {
            newStatus = 'SIGNED';
          } else if (eventType === 'signature_request.declined') {
            newStatus = 'REFUSED';
          } else if (eventType === 'signature_request.expired') {
            newStatus = 'EXPIRED';
          }

          if (newStatus) {
            await this.prisma.signatureRequest.update({
              where: { id: record.id },
              data: {
                status: newStatus as any,
                signedAt: newStatus === 'SIGNED' ? new Date() : undefined,
              },
            });
          }
        }
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('YouSign webhook error:', error);
      res.status(200).json({ received: true }); // Return 200 to prevent retries
    }
  }

  @Post()
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSignatureDto) {
    return this.signature.create(user.workspaceId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('projectId') projectId?: string) {
    return projectId ? this.signature.findByProject(user.workspaceId, projectId) : this.signature.findByWorkspace(user.workspaceId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.signature.findOne(user.workspaceId, id);
  }

  @Put(':id/status')
  @Roles('OWNER', 'ADMIN')
  updateStatus(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body('status') status: string) {
    return this.signature.updateStatus(user.workspaceId, id, status);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.signature.remove(user.workspaceId, id);
  }
}
