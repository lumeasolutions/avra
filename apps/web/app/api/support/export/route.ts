/**
 * GET /api/support/export?workspaceId=...
 * Export complet (RGPD / sauvegarde) des données métier d'un compte client.
 * Réservé aux 2 comptes support. Lecture seule. Journalise l'export.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { isSupportEmail } from '@/lib/server/support-guard';
import { collectWorkspaceSnapshot } from '@/lib/server/support-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Sérialisation robuste (les bigint éventuels deviennent des strings). */
const safeJson = (obj: unknown) =>
  JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));

export async function GET(req: NextRequest) {
  const auth = isSupportEmail(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Accès réservé au support.' }, { status: 401 });
  }

  const workspaceId = (new URL(req.url).searchParams.get('workspaceId') ?? '').trim();
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId manquant' }, { status: 400 });
  }

  try {
    const snapshot = await collectWorkspaceSnapshot(workspaceId);
    if (!snapshot.workspace) {
      return NextResponse.json({ error: 'Workspace introuvable' }, { status: 404 });
    }

    const targetEmail = (snapshot.members[0]?.email as string) ?? null;
    try {
      await prisma.$executeRaw`
        INSERT INTO "SupportAuditLog" ("adminEmail", action, "targetWorkspaceId", "targetEmail", detail)
        VALUES (${auth.email}, ${'export_account'}, ${workspaceId}, ${targetEmail},
                ${JSON.stringify({ tables: Object.keys(snapshot.data) })}::jsonb);
      `;
    } catch (logErr) {
      console.error('[/api/support/export] audit log failed:', logErr);
    }

    return new NextResponse(safeJson(snapshot), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (err) {
    console.error('[/api/support/export] error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
