import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IaService } from './ia.service';
import { QwenService } from './qwen.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { JwtPayload } from '@avra/types';
import { IaJobType } from '../../prisma-enums';
import { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('ia')
@UseGuards(JwtAuthGuard)
export class IaController {
  private readonly logger = new Logger(IaController.name);

  constructor(
    private readonly ia: IaService,
    private readonly qwen: QwenService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async upload(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer?: Buffer },
    @Body() body: { projectId: string; title?: string },
  ) {
    if (!file) throw new Error('Fichier requis');
    if (!body?.projectId) throw new Error('projectId requis');
    const buffer = (file as { buffer?: Buffer }).buffer;
    if (!buffer) throw new Error('Fichier invalide');
    return this.ia.uploadFile(user.workspaceId, user.sub, { ...file, buffer }, body.projectId, body.title ?? file.originalname);
  }

  @Post('job')
  createJob(
    @CurrentUser() user: JwtPayload,
    @Body() body: { type: IaJobType; projectId?: string; prompt?: string; sourceDocumentId?: string; style?: string },
  ) {
    return this.ia.createJob(user.workspaceId, user.sub, body.projectId ?? null, body.type, {
      prompt: body.prompt,
      sourceDocumentId: body.sourceDocumentId,
      style: body.style,
    });
  }

  @Get('jobs')
  findJobs(@CurrentUser() user: JwtPayload, @Query('projectId') projectId?: string) {
    return this.ia.findJobsByWorkspace(user.workspaceId, projectId);
  }

  @Get('jobs/:id')
  getJob(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.ia.getJob(user.workspaceId, id);
  }

  /**
   * Chat endpoint avec support streaming SSE (public pour démo sans auth)
   * POST /api/ia/chat
   * Body: { messages: Array<{ role: 'user'|'assistant', content: string }> }
   */
  @Post('chat')
  async chatStream(@CurrentUser() user: JwtPayload | undefined, @Body() body: { messages: Array<{ role: 'user' | 'assistant'; content: string }> }, @Res() res: Response) {
    try {
      // Charger le contexte workspace si user connecté
      let dossiers: any[] = [];
      let invoices: any[] = [];

      if (user?.workspaceId) {
        [dossiers, invoices] = await Promise.all([
          this.prisma.project.findMany({
            where: { workspaceId: user.workspaceId },
            select: { id: true, name: true, lifecycleStatus: true, priority: true },
            orderBy: { createdAt: 'desc' },
          }),
          this.prisma.paymentRequest.findMany({
            where: { workspaceId: user.workspaceId },
            select: { id: true, status: true },
          }),
        ]);
      }

      // Dossiers actifs = ceux qui ne sont pas signés/archivés
      const activeDossiers = dossiers.filter((d: any) =>
        !['SIGNED', 'ARCHIVED', 'LOST'].includes(d.lifecycleStatus)
      );
      const signedDossiers = dossiers.filter((d: any) => d.lifecycleStatus === 'SIGNED');
      const urgentCount = dossiers.filter((d: any) => d.priority === 'URGENT').length;
      const pendingInvoiceCount = invoices.filter((i: any) => i.status === 'PENDING').length;

      // Résumé nommé des dossiers actifs pour que l'IA soit précise
      const activeDossierNames = activeDossiers.map((d: any) => d.name).join(', ') || 'aucun';

      // Convertir au format messages
      const messages = (body.messages || []).map((m) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: m.content,
      }));

      // Obtenir le stream
      const stream = await this.qwen.chatStream(messages, {
        dossierCount: activeDossiers.length,
        urgentCount,
        invoiceCount: invoices.length,
        pendingInvoiceCount,
        signedCount: signedDossiers.length,
        activeDossierNames,
      });

      // Configurer la réponse SSE
      const allowedOrigin = process.env.WEB_URL ?? 'http://localhost:3002';
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      res.setHeader('Vary', 'Origin');

      // Envoyer les headers SSE maintenant (avant les events)
      res.flushHeaders();

      // Streamer les chunks
      stream.on('data', (chunk) => {
        if (res.writableEnded) return;
        res.write(`data: ${JSON.stringify({ content: chunk.toString() })}\n\n`);
      });

      stream.on('end', () => {
        if (res.writableEnded) return;
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      });

      stream.on('error', (error) => {
        this.logger.error('Chat stream error:', error);
        if (res.writableEnded) return;
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      });
    } catch (error) {
      this.logger.error('Chat endpoint error:', error);
      // Si headers SSE déjà envoyés, on ne peut plus faire de .json() — on ferme proprement
      if (res.headersSent) {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ error: (error as Error).message })}\n\n`);
          res.end();
        }
      } else {
        res.status(500).json({ error: (error as Error).message });
      }
    }
  }

  /**
   * Analyse un dossier avec l'IA
   * POST /api/ia/analyze
   */
  @Post('analyze')
  async analyzeDossier(@CurrentUser() user: JwtPayload, @Body() body: { dossierId: string }) {
    try {
      const dossier = await this.prisma.project.findFirst({
        where: { id: body.dossierId, workspaceId: user.workspaceId },
        select: {
          name: true,
          client: { select: { firstName: true, lastName: true, companyName: true } },
          lifecycleStatus: true,
          description: true,
          createdAt: true,
        },
      });

      if (!dossier) {
        return { error: 'Dossier not found' };
      }

      const clientName = dossier.client
        ? [dossier.client.firstName, dossier.client.lastName].filter(Boolean).join(' ') || dossier.client.companyName || undefined
        : undefined;

      const analysis = await this.qwen.analyzeDossier({
        name: dossier.name,
        client: clientName,
        status: dossier.lifecycleStatus,
        description: dossier.description ?? undefined,
        createdAt: dossier.createdAt?.toISOString(),
      });
      return { analysis };
    } catch (error) {
      this.logger.error('Analyze error:', error);
      return { error: (error as Error).message };
    }
  }

  /**
   * Génère des alertes intelligentes
   * POST /api/ia/suggest-alerts
   */
  @Post('suggest-alerts')
  async suggestAlerts(@CurrentUser() user: JwtPayload) {
    try {
      const [dossiers, invoices, events] = await Promise.all([
        this.prisma.project.findMany({
          where: { workspaceId: user.workspaceId },
          select: { name: true, lifecycleStatus: true, updatedAt: true },
        }),
        this.prisma.paymentRequest.findMany({
          where: { workspaceId: user.workspaceId },
          select: { id: true, status: true, amount: true },
        }),
        this.prisma.event.findMany({
          where: { workspaceId: user.workspaceId },
          select: { title: true, startAt: true },
          take: 10,
        }),
      ]);

      const alerts = await this.qwen.suggestAlerts({
        dossiers,
        invoices,
        schedule: events,
      });

      return { alerts };
    } catch (error) {
      this.logger.error('Suggest alerts error:', error);
      return { error: (error as Error).message };
    }
  }

  /**
   * Rendu photoréaliste (IA Studio)
   * POST /api/ia/rendu
   */
  @Post('rendu')
  async generateRender(
    @CurrentUser() user: JwtPayload,
    @Body() body: { facades: string; planTravail: string; style: string; lightingStyle: string; roomSize: string },
  ) {
    try {
      const prompt = `Génère un rendu 3D photoréaliste d'une cuisine moderne avec:
- Façades: ${body.facades}
- Plan de travail: ${body.planTravail}
- Style: ${body.style}
- Éclairage: ${body.lightingStyle}
- Taille pièce: ${body.roomSize}
Haute qualité, détails réalistes, perspective professionnelle.`;

      const result = await this.ia.generateRealisticRender(prompt);
      return result;
    } catch (error) {
      this.logger.error('Generate render error:', error);
      return { imageUrl: null, error: (error as Error).message };
    }
  }

  /**
   * Coloriste (IA Studio - img2img)
   * POST /api/ia/coloriste
   */
  @Post('coloriste')
  async colorize(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      facadeHex: string;
      poigneeHex: string;
      planHex: string;
      facadeFinish: string;
      lightingStyle: string;
      handleMaterial?: string;
      countertopMaterial?: string;
    },
  ) {
    try {
      const prompt = `Professional interior photography of a French kitchen with the following color scheme:
- Cabinet fronts: ${body.facadeHex} (${body.facadeFinish} finish)
- Handles: ${body.handleMaterial || body.poigneeHex}
- Countertop: ${body.countertopMaterial || body.planHex}
- Lighting: ${body.lightingStyle}
Preserve proportions and layout, modify only colors and finishes. Photorealistic, 8K, Canon EOS R5.`;

      // Le coloriste génère une image complète avec les couleurs spécifiées
      // Pour un vrai img2img, passer sourceImageUrl dans le body
      const sourceImageUrl = (body as any).sourceImageUrl;
      const result = sourceImageUrl
        ? await this.ia.colorizeImage(sourceImageUrl, prompt)
        : await this.ia.generateRealisticRender(prompt);
      return result;
    } catch (error) {
      this.logger.error('Colorize error:', error);
      return { imageUrl: null, error: (error as Error).message };
    }
  }

  /**
   * Status des services IA
   * GET /api/ia/status
   */
  @Get('status')
  getStatus() {
    return this.ia.getIaStatus();
  }
}
