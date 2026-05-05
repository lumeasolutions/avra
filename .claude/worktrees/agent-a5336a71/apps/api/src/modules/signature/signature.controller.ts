import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
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
   * Webhook endpoint for YouSign events
   * Placed before other routes to avoid conflicts
   */
  @Post('webhook/yousign')
  @Public()
  async handleYousignWebhook(@Body() body: any, @Res() res: Response) {
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
