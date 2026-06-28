/**
 * GET /api/support/account?workspaceId=...
 * Fiche 360° d'un compte client (lecture seule) : profil workspace, membres,
 * compteurs, derniers dossiers, et historique des actions support.
 * Réservé aux 2 comptes support. Journalise la consultation (SupportAuditLog).
 * Aucune colonne sensible n'est renvoyée.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { isSupportEmail } from '@/lib/server/support-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    const workspaceRows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, name, slug, plan, "isActive", "trialEndsAt", "createdAt"
      FROM "Workspace" WHERE id = ${workspaceId} LIMIT 1;
    `;
    if (workspaceRows.length === 0) {
      return NextResponse.json({ error: 'Workspace introuvable' }, { status: 404 });
    }
    const workspace = workspaceRows[0];

    const members = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT u.email, u."firstName", u."lastName", u."isActive", u."lastLoginAt", u."createdAt", uw.role
      FROM "UserWorkspace" uw
      JOIN "User" u ON u.id = uw."userId"
      WHERE uw."workspaceId" = ${workspaceId}
      ORDER BY u."createdAt" ASC;
    `;

    const countsRows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT
        (SELECT count(*)::int FROM "Project"         WHERE "workspaceId" = ${workspaceId}) AS "dossiers",
        (SELECT count(*)::int FROM "Client"          WHERE "workspaceId" = ${workspaceId}) AS "clients",
        (SELECT count(*)::int FROM "Quote"           WHERE "workspaceId" = ${workspaceId}) AS "devis",
        (SELECT count(*)::int FROM "Invoice"         WHERE "workspaceId" = ${workspaceId}) AS "factures",
        (SELECT count(*)::int FROM "Demande"         WHERE "workspaceId" = ${workspaceId}) AS "demandes",
        (SELECT count(*)::int FROM "Intervenant"     WHERE "workspaceId" = ${workspaceId}) AS "intervenants",
        (SELECT count(*)::int FROM "Event"           WHERE "workspaceId" = ${workspaceId}) AS "agenda",
        (SELECT count(*)::int FROM "DossierDocument" WHERE "workspaceId" = ${workspaceId}) AS "documents",
        (SELECT count(*)::int FROM "IaJob"           WHERE "workspaceId" = ${workspaceId}) AS "rendus";
    `;
    const counts = countsRows[0] ?? {};

    const dossiers = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, name, reference, "tradeType", "lifecycleStatus", "pipelineStatus",
             priority, "saleAmount"::float8 AS "saleAmount", "createdAt", "updatedAt"
      FROM "Project"
      WHERE "workspaceId" = ${workspaceId}
      ORDER BY "updatedAt" DESC
      LIMIT 100;
    `;

    const auditLog = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT "adminEmail", action, "targetEmail", detail, "createdAt"
      FROM "SupportAuditLog"
      WHERE "targetWorkspaceId" = ${workspaceId}
      ORDER BY "createdAt" DESC
      LIMIT 25;
    `;

    const targetEmail = (members[0]?.email as string) ?? null;

    // Journalise la consultation (best-effort, ne bloque pas la réponse).
    try {
      await prisma.$executeRaw`
        INSERT INTO "SupportAuditLog" ("adminEmail", action, "targetWorkspaceId", "targetEmail", detail)
        VALUES (${auth.email}, ${'view_account'}, ${workspaceId}, ${targetEmail},
                ${JSON.stringify({ via: 'fiche-360' })}::jsonb);
      `;
    } catch (logErr) {
      console.error('[/api/support/account] audit log failed:', logErr);
    }

    return NextResponse.json({ workspace, members, counts, dossiers, auditLog });
  } catch (err) {
    console.error('[/api/support/account] error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
