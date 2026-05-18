/**
 * GET /api/ia/jobs
 *
 * Liste paginée des générations IA du workspace courant.
 * Utilisé par le panneau historique de /ia-studio.
 *
 * Filtres :
 *   ?type=COLOR_VARIATION | PHOTOREALISM_ENHANCE
 *   ?status=DONE | FAILED | PROCESSING | QUEUED
 *   ?projectId=<cuid>
 *   ?page=0 (default 0)
 *   ?pageSize=20 (default 20, max 100)
 *
 * Scope automatique : tous les rendus du workspace courant — pas seulement
 * ceux de l'utilisateur connecté (l'équipe partage l'historique).
 *
 * Les URLs signées Supabase stockées sont valables 30 jours. Si elles
 * expirent, le client peut demander une régénération via un futur endpoint
 * `POST /api/ia/jobs/:id/refresh-urls` (pas implémenté dans ce sprint).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserContextFromRequest } from '@/lib/server/auth-guard';
import { prisma } from '@/lib/server/prisma';
import type { IaJobType, IaJobStatus, Prisma } from '@prisma/client';

const VALID_TYPES: IaJobType[] = [
  'COLOR_VARIATION',
  'PHOTOREALISM_ENHANCE',
  'EDIT',
  'PLAN_COMPARISON',
  'TEXT_ASSISTANT',
];
const VALID_STATUSES: IaJobStatus[] = ['QUEUED', 'PROCESSING', 'DONE', 'FAILED'];

// Seuil de "stuck" : un job en QUEUED ou PROCESSING depuis plus de 10 min
// est considéré comme mort (la fonction Vercel a probablement été killée).
const STUCK_JOB_THRESHOLD_MS = 10 * 60 * 1000;

export async function GET(req: NextRequest) {
  const userCtx = getUserContextFromRequest(req);
  if (!userCtx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { workspaceId } = userCtx;

  // Auto-cleanup opportuniste : on profite de chaque appel à /jobs pour
  // marquer FAILED les jobs coincés depuis > 10 min dans CE workspace.
  // Pas de cron nécessaire en bêta privée — l'historique est consulté
  // suffisamment souvent. Best-effort : si Prisma rate, on continue.
  try {
    const threshold = new Date(Date.now() - STUCK_JOB_THRESHOLD_MS);
    await prisma.iaJob.updateMany({
      where: {
        workspaceId,
        status:    { in: ['QUEUED', 'PROCESSING'] },
        updatedAt: { lt: threshold },
      },
      data: {
        status:       'FAILED',
        errorMessage: 'Timeout serveur — fonction Vercel killée (auto-cleanup au fetch historique).',
        completedAt:  new Date(),
      },
    });
  } catch (cleanupErr) {
    console.warn('[GET /api/ia/jobs] auto-cleanup soft-fail:',
      cleanupErr instanceof Error ? cleanupErr.message : cleanupErr);
  }

  const { searchParams } = new URL(req.url);

  // Validation des paramètres (on accepte uniquement les valeurs connues)
  const rawType   = searchParams.get('type');
  const rawStatus = searchParams.get('status');
  const projectId = searchParams.get('projectId') || undefined;

  const typeFilter   = rawType   && (VALID_TYPES   as string[]).includes(rawType)   ? (rawType as IaJobType)   : undefined;
  const statusFilter = rawStatus && (VALID_STATUSES as string[]).includes(rawStatus) ? (rawStatus as IaJobStatus) : undefined;

  // Pagination (bornée)
  const page     = Math.max(0, parseInt(searchParams.get('page')     ?? '0', 10) || 0);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10) || 20));

  const where: Prisma.IaJobWhereInput = {
    workspaceId,
    ...(typeFilter   && { type:      typeFilter }),
    ...(statusFilter && { status:    statusFilter }),
    ...(projectId    && { projectId: projectId }),
  };

  const [total, jobs] = await Promise.all([
    prisma.iaJob.count({ where }),
    prisma.iaJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:    page * pageSize,
      take:    pageSize,
      select: {
        id:              true,
        type:            true,
        status:          true,
        prompt:          true,
        params:          true,
        inputImageUrls:  true,
        resultImageUrls: true,
        errorMessage:    true,
        durationMs:      true,
        costEUR:         true,
        modelsUsed:      true,
        completedAt:     true,
        createdAt:       true,
        projectId:       true,
        createdById:     true,
        createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        project:   { select: { id: true, name: true } },
      },
    }),
  ]);

  return NextResponse.json({
    page,
    pageSize,
    total,
    hasMore: (page + 1) * pageSize < total,
    jobs,
  });
}
