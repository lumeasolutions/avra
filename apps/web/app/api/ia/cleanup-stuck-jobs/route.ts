/**
 * POST /api/ia/cleanup-stuck-jobs
 *
 * Marque FAILED les IaJob coincés en QUEUED ou PROCESSING depuis plus de 10 min
 * dans le workspace courant. Utile quand une fonction Vercel a été killée
 * (504 Gateway Timeout) avant d'avoir pu UPDATE l'IaJob.
 *
 * Idempotent : peut être appelé sans risque, ne touche que les jobs vraiment
 * coincés (durée > 10 min depuis le dernier updatedAt).
 *
 * Pas auto-déclenché via cron pour l'instant (Beta privée, faible volume).
 * À ajouter dans `vercel.json` crons quand le volume grossira :
 *   { "path": "/api/ia/cleanup-stuck-jobs?token=...", "schedule": "*\/30 * * * *" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserContextFromRequest } from '@/lib/server/auth-guard';
import { prisma } from '@/lib/server/prisma';

const STUCK_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(req: NextRequest) {
  const userCtx = getUserContextFromRequest(req);
  if (!userCtx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { workspaceId } = userCtx;

  const threshold = new Date(Date.now() - STUCK_THRESHOLD_MS);

  // Trouver les jobs coincés (status PROCESSING/QUEUED et pas touchés depuis > 10 min)
  const stuck = await prisma.iaJob.findMany({
    where: {
      workspaceId,
      status:    { in: ['QUEUED', 'PROCESSING'] },
      updatedAt: { lt: threshold },
    },
    select: { id: true, type: true, status: true, updatedAt: true },
  });

  if (stuck.length === 0) {
    return NextResponse.json({ cleaned: 0, jobs: [] });
  }

  // Marquer FAILED en lot
  await prisma.iaJob.updateMany({
    where: { id: { in: stuck.map(j => j.id) } },
    data:  {
      status:       'FAILED',
      errorMessage: 'Timeout serveur — fonction Vercel killée avant la fin (probablement saturation fal.ai).',
      completedAt:  new Date(),
    },
  });

  return NextResponse.json({
    cleaned: stuck.length,
    jobs:    stuck.map(j => ({ id: j.id, type: j.type, wasStatus: j.status, lastTouchedAt: j.updatedAt })),
  });
}
