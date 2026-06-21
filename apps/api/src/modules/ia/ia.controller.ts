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
import { AIService } from './ai.service';
import { ExtractionService } from './extraction.service';
import { ExtractDossierDto } from './dto/extract-dossier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { SkipCsrf } from '../../common/guards/csrf.guard';
import type { JwtPayload } from '@avra/types';
import { IaJobType } from '../../prisma-enums';
import { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { Throttle } from '@nestjs/throttler';

@Controller('ia')
@UseGuards(JwtAuthGuard)
export class IaController {
  private readonly logger = new Logger(IaController.name);

  constructor(
    private readonly ia: IaService,
    private readonly ai: AIService,
    private readonly extraction: ExtractionService,
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
  @SkipCsrf()
  @Post('chat')
  async chatStream(@CurrentUser() user: JwtPayload | undefined, @Body() body: { messages: Array<{ role: 'user' | 'assistant'; content: string }>; personnalite?: 'professionnel' | 'amical' | 'concis'; acces?: { dossiers?: boolean; facturation?: boolean; planning?: boolean; stock?: boolean; stats?: boolean; intervenants?: boolean }; actions?: { dossier?: boolean; devis?: boolean; facture?: boolean; navigation?: boolean; event?: boolean; demande?: boolean } }, @Res() res: Response) {
    try {
      // Volet 3 (28/05/2026) : l'assistant ne recoit que les categories de
      // donnees autorisees (Parametres → IA). Defaut = autorise si non fourni
      // (retro-compat avec les anciens clients qui n'envoient pas 'acces').
      const acces = body?.acces ?? {};
      const canDossiers = acces.dossiers !== false;
      const canFacturation = acces.facturation !== false;
      const canIntervenants = acces.intervenants !== false;
      const canPlanning = acces.planning !== false;
      const canStock = acces.stock !== false;

      // Volet 5 (06/2026) : actions REELLES via function-calling. On n'expose un
      // outil que si le toggle correspondant est explicitement actif. Defaut =
      // false (anciens clients sans 'actions' -> chat pur, aucune mutation).
      const a = body?.actions ?? {};
      const enabledActions = {
        dossier: a.dossier === true,
        devis: a.devis === true,
        facture: a.facture === true,
        navigation: a.navigation === true,
        event: a.event === true,
        demande: a.demande === true,
      };

      // Charger le contexte workspace si user connecté
      let dossiers: any[] = [];
      let invoices: any[] = [];
      let intervenants: any[] = [];
      let demandes: any[] = [];
      let invitationsPending = 0;
      let events: any[] = [];
      let stock: any[] = [];

      if (user?.workspaceId) {
        const ws = user.workspaceId;
        const now = new Date();
        [dossiers, invoices, intervenants, demandes, invitationsPending, events, stock] = await Promise.all([
          canDossiers
            ? this.prisma.project.findMany({
                where: { workspaceId: ws },
                select: { id: true, name: true, lifecycleStatus: true, priority: true },
                orderBy: { createdAt: 'desc' },
              })
            : Promise.resolve([] as any[]),
          canFacturation
            ? this.prisma.paymentRequest.findMany({
                where: { workspaceId: ws },
                // Volet 6 : montants + client pour repondre "qui me doit combien".
                select: {
                  id: true, status: true, amount: true, type: true,
                  project: { select: { name: true, client: { select: { firstName: true, lastName: true } } } },
                },
                orderBy: { createdAt: 'desc' },
              })
            : Promise.resolve([] as any[]),
          canIntervenants
            ? this.prisma.intervenant.findMany({
                where: { workspaceId: ws },
                select: { id: true, type: true, companyName: true, firstName: true, lastName: true, userId: true },
                orderBy: { createdAt: 'desc' },
                take: 20,
              })
            : Promise.resolve([] as any[]),
          canIntervenants
            ? (this.prisma as any).demande.findMany({
                where: { workspaceId: ws },
                // Volet 6 : titre + echeance + intervenant cible pour "qui attend quoi".
                select: {
                  id: true, status: true, type: true, title: true, scheduledFor: true,
                  intervenant: { select: { companyName: true, firstName: true, lastName: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 200,
              })
            : Promise.resolve([] as any[]),
          canIntervenants
            ? (this.prisma as any).intervenantInvitation.count({
                where: { workspaceId: ws, status: 'PENDING' },
              })
            : Promise.resolve(0),
          // Volet 6 : les 8 prochains RDV / interventions a venir.
          canPlanning
            ? this.prisma.event.findMany({
                where: { workspaceId: ws, startAt: { gte: now } },
                select: { title: true, startAt: true, type: true },
                orderBy: { startAt: 'asc' },
                take: 8,
              })
            : Promise.resolve([] as any[]),
          // Volet 6 : articles en rupture de stock.
          canStock
            ? this.prisma.stockItem.findMany({
                where: { workspaceId: ws, status: 'OUT_OF_STOCK' },
                select: { name: true, model: true },
                take: 12,
              })
            : Promise.resolve([] as any[]),
        ]);
      }

      // Statuts du cycle de vie (enum Prisma FR). Aligne sur useDataSync :
      // signe = SIGNE/EN_CHANTIER/RECEPTION/SAV ; inactif = signe + CLOTURE/PERDU/ARCHIVE.
      // FIX 28/05/2026 : avant on comparait a des valeurs ANGLAISES ('SIGNED'...)
      // qui n'existent pas dans l'enum → signedDossiers toujours vide et
      // activeDossiers gonfle. L'assistant annoncait donc des chiffres faux.
      const SIGNED_STATUSES = ['SIGNE', 'EN_CHANTIER', 'RECEPTION', 'SAV'];
      const INACTIVE_STATUSES = [...SIGNED_STATUSES, 'CLOTURE', 'PERDU', 'ARCHIVE'];
      const activeDossiers = dossiers.filter((d: any) =>
        !INACTIVE_STATUSES.includes(d.lifecycleStatus)
      );
      const signedDossiers = dossiers.filter((d: any) =>
        SIGNED_STATUSES.includes(d.lifecycleStatus)
      );
      const urgentCount = dossiers.filter((d: any) => d.priority === 'URGENT').length;
      const pendingInvoiceCount = invoices.filter((i: any) => i.status === 'PENDING').length;

      // Résumé nommé des dossiers actifs pour que l'IA soit précise
      const activeDossierNames = activeDossiers.map((d: any) => d.name).join(', ') || 'aucun';

      // Phase 7 — contexte demandes/intervenants
      const intervenantNames = intervenants
        .slice(0, 8)
        .map((i: any) =>
          (i.companyName ?? `${i.firstName ?? ''} ${i.lastName ?? ''}`.trim() ?? '—')
            + ` (${i.type})`,
        )
        .join(', ');
      const demandePendingCount = demandes.filter((d: any) =>
        d.status === 'ENVOYEE' || d.status === 'VUE'
      ).length;
      const demandeEnCoursCount = demandes.filter((d: any) =>
        d.status === 'ACCEPTEE' || d.status === 'EN_COURS'
      ).length;

      // ── Volet 6 : textes de contexte ENRICHI (l'assistant "voit" le detail) ──
      const fmtFr = (d: any) => {
        try {
          return new Date(d).toLocaleString('fr-FR', {
            timeZone: 'Europe/Paris', weekday: 'short', day: '2-digit', month: '2-digit',
            hour: '2-digit', minute: '2-digit',
          });
        } catch { return ''; }
      };
      const eur = (n: number) => `${Math.round(n)}€`;

      // Factures impayees (PENDING) + en retard (FAILED) avec montants + client.
      const unpaidList = invoices.filter((i: any) => i.status === 'PENDING' || i.status === 'FAILED');
      const unpaidTotalEUR = unpaidList.reduce((s: number, i: any) => s + Number(i.amount ?? 0), 0);
      const clientOfInvoice = (i: any) => {
        const c = i.project?.client;
        const n = c ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() : '';
        return n || i.project?.name || 'client';
      };
      const unpaidInvoicesText = unpaidList.slice(0, 10)
        .map((i: any) => `${clientOfInvoice(i)} : ${eur(Number(i.amount ?? 0))} (${i.status === 'FAILED' ? 'en retard' : 'en attente'})`)
        .join(' ; ');

      // RDV / interventions a venir.
      const upcomingEventsText = events
        .map((e: any) => `${fmtFr(e.startAt)} — ${e.title}`)
        .join(' ; ');

      // Ruptures de stock.
      const stockRuptureText = stock
        .map((s: any) => (s.model ? `${s.name} (${s.model})` : s.name))
        .join(', ');

      // Demandes en attente : titre + intervenant cible + echeance.
      const intervenantOfDemande = (d: any) => {
        const iv = d.intervenant;
        if (!iv) return '—';
        return iv.companyName || `${iv.firstName ?? ''} ${iv.lastName ?? ''}`.trim() || '—';
      };
      const waitingDemandes = demandes.filter((d: any) => d.status === 'ENVOYEE' || d.status === 'VUE');
      const demandesWaitingText = waitingDemandes.slice(0, 10)
        .map((d: any) => `${d.title} → ${intervenantOfDemande(d)}${d.scheduledFor ? ' (prévu ' + fmtFr(d.scheduledFor) + ')' : ''}`)
        .join(' ; ');

      // Convertir au format messages
      const messages = (body.messages || []).map((m) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: m.content,
      }));

      // Obtenir le stream — Volet 3 : on ne transmet que les champs des
      // categories autorisees (undefined => ligne omise dans le prompt).
      // Volet 2 : personnalite transmise pour piloter le ton.
      const stream = await this.ai.chatStream(messages, {
        dossierCount: canDossiers ? activeDossiers.length : undefined,
        urgentCount: canDossiers ? urgentCount : undefined,
        signedCount: canDossiers ? signedDossiers.length : undefined,
        activeDossierNames: canDossiers ? activeDossierNames : undefined,
        invoiceCount: canFacturation ? invoices.length : undefined,
        pendingInvoiceCount: canFacturation ? pendingInvoiceCount : undefined,
        intervenantCount: canIntervenants ? intervenants.length : undefined,
        activeIntervenantNames: canIntervenants ? (intervenantNames || undefined) : undefined,
        demandeCount: canIntervenants ? demandes.length : undefined,
        demandePendingCount: canIntervenants ? demandePendingCount : undefined,
        demandeEnCoursCount: canIntervenants ? demandeEnCoursCount : undefined,
        invitationsPendingCount: canIntervenants ? invitationsPending : undefined,
        // Volet 6 : contexte enrichi (chaine vide -> undefined -> ligne omise).
        unpaidInvoicesText: canFacturation ? (unpaidInvoicesText || undefined) : undefined,
        unpaidTotalEUR: canFacturation && unpaidTotalEUR > 0 ? unpaidTotalEUR : undefined,
        upcomingEventsText: canPlanning ? (upcomingEventsText || undefined) : undefined,
        stockRuptureText: canStock ? (stockRuptureText || undefined) : undefined,
        demandesWaitingText: canIntervenants ? (demandesWaitingText || undefined) : undefined,
        personnalite: body?.personnalite,
        enabledActions,
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

      // Streamer les evenements (object-mode) : texte token-par-token OU une
      // action a confirmer. Tolere aussi une string brute par securite.
      stream.on('data', (evt: unknown) => {
        if (res.writableEnded) return;
        if (evt && typeof evt === 'object' && (evt as any).type === 'action') {
          res.write(`data: ${JSON.stringify({ action: (evt as any).value })}\n\n`);
        } else if (evt && typeof evt === 'object' && (evt as any).type === 'text') {
          res.write(`data: ${JSON.stringify({ content: (evt as any).value })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({ content: String(evt) })}\n\n`);
        }
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

      const analysis = await this.ai.analyzeDossier({
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

      const alerts = await this.ai.suggestAlerts({
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

  /**
   * Extraction IA d'un dossier : analyse les documents PDF du dossier et
   * retourne dates butoires + commandes + livraisons + score de confiance.
   *
   * POST /api/v1/ia/extract-dossier
   * Body: { dossierId: string }
   *
   * Sécurité :
   *  - JwtAuthGuard (déjà appliqué au controller)
   *  - Throttler 'ai' : 5/min/IP
   *  - Vérification d'ownership workspace dans le service
   */
  @Post('extract-dossier')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async extractDossier(
    @CurrentUser() user: JwtPayload,
    @Body() body: ExtractDossierDto,
  ) {
    return this.extraction.extractFromDossier(user.workspaceId, body.dossierId, body.scope ?? 'all');
  }
}
