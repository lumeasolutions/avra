/**
 * DELETE /api/ia/jobs/[id]
 *
 * Supprime UNE génération IA de l'historique du workspace courant.
 * Scope strict : le job doit appartenir au workspace de l'appelant
 * (deleteMany filtré sur workspaceId → renvoie 404 si un autre workspace
 * tente de supprimer un job qui n'est pas le sien).
 *
 * Seule la ligne IaJob est supprimée ; les fichiers stockés (URLs signées
 * Supabase, valables 30 j) ne sont pas purgés ici — ils expirent d'eux-mêmes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserContextFromRequest } from '@/lib/server/auth-guard';
import { prisma } from '@/lib/server/prisma';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userCtx = getUserContextFromRequest(req);
  if (!userCtx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { workspaceId } = userCtx;
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  try {
    const result = await prisma.iaJob.deleteMany({ where: { id, workspaceId } });
    if (result.count === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
