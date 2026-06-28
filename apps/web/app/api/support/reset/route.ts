/**
 * POST /api/support/reset   { workspaceId, confirmName }
 * Remet à zéro les données métier d'un compte client (réversible via le
 * snapshot renvoyé). Réservé aux 2 comptes support.
 *
 * Sécurité :
 *   1. Gate serveur (isSupportEmail).
 *   2. `confirmName` DOIT correspondre EXACTEMENT au nom du workspace, sinon 400
 *      (garde-fou anti-erreur de cible — comme une suppression de repo GitHub).
 *   3. Snapshot complet renvoyé AVANT suppression (sauvegarde téléchargeable).
 *   4. Suppression en transaction (ordre FK sûr). Compte/login/réglages conservés.
 *   5. Action journalisée (SupportAuditLog) avec les compteurs supprimés.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { isSupportEmail } from '@/lib/server/support-guard';
import { collectWorkspaceSnapshot, deleteWorkspaceData } from '@/lib/server/support-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const safeJson = (obj: unknown) =>
  JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));

export async function POST(req: NextRequest) {
  const auth = isSupportEmail(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Accès réservé au support.' }, { status: 401 });
  }

  // Défense en profondeur CSRF : le cookie d'auth est déjà SameSite=Strict
  // (donc non envoyé en cross-site), mais on refuse en plus toute requête dont
  // l'Origin ne correspond pas à l'hôte — gratuit et solide sur une action destructive.
  const origin = req.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.get('host')) {
        return NextResponse.json({ error: 'Origine non autorisée.' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Origine invalide.' }, { status: 403 });
    }
  }

  const body = await req.json().catch(() => null);
  const workspaceId = String(body?.workspaceId ?? '').trim();
  const confirmName = String(body?.confirmName ?? '').trim();
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId manquant' }, { status: 400 });
  }

  try {
    const wsRows = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
      SELECT id, name FROM "Workspace" WHERE id = ${workspaceId} LIMIT 1;
    `;
    if (wsRows.length === 0) {
      return NextResponse.json({ error: 'Workspace introuvable' }, { status: 404 });
    }
    const workspaceName = String(wsRows[0].name ?? '');

    if (!confirmName || confirmName !== workspaceName) {
      return NextResponse.json(
        { error: 'Le nom saisi ne correspond pas exactement au nom du workspace. Réinitialisation annulée.' },
        { status: 400 },
      );
    }

    // 1) Sauvegarde AVANT suppression (renvoyée au client pour téléchargement).
    const snapshot = await collectWorkspaceSnapshot(workspaceId);

    // 2) Suppression atomique. counts = mesuré avant suppression.
    const counts = await deleteWorkspaceData(workspaceId);

    // 3) Journalisation.
    const targetEmail = (snapshot.members[0]?.email as string) ?? null;
    try {
      await prisma.$executeRaw`
        INSERT INTO "SupportAuditLog" ("adminEmail", action, "targetWorkspaceId", "targetEmail", detail)
        VALUES (${auth.email}, ${'reset_account'}, ${workspaceId}, ${targetEmail},
                ${JSON.stringify({ counts })}::jsonb);
      `;
    } catch (logErr) {
      console.error('[/api/support/reset] audit log failed:', logErr);
    }

    return new NextResponse(safeJson({ ok: true, counts, snapshot }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (err) {
    console.error('[/api/support/reset] error:', err);
    return NextResponse.json({ error: 'Erreur serveur lors de la réinitialisation.' }, { status: 500 });
  }
}
