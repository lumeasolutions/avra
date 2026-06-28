/**
 * GET /api/support/dossier?dossierId=...
 * Détail complet d'un dossier client, EN LECTURE SEULE, pour le diagnostic
 * support (« voir ce que voit le client » sans aucun risque d'écriture).
 * Réservé aux 2 comptes support. Journalise la consultation (view_dossier).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { isSupportEmail } from '@/lib/server/support-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const safeJson = (obj: unknown) =>
  JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));

export async function GET(req: NextRequest) {
  const auth = isSupportEmail(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Accès réservé au support.' }, { status: 401 });
  }

  const dossierId = (new URL(req.url).searchParams.get('dossierId') ?? '').trim();
  if (!dossierId) {
    return NextResponse.json({ error: 'dossierId manquant' }, { status: 400 });
  }

  try {
    const projectRows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT * FROM "Project" WHERE id = ${dossierId} LIMIT 1;
    `;
    if (projectRows.length === 0) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
    }
    const project = projectRows[0];
    const clientId = (project.clientId as string) ?? null;
    const workspaceId = (project.workspaceId as string) ?? null;

    const [client, devis, factures, demandes, documents, rendus, events, intervenants] = await Promise.all([
      clientId
        ? prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM "Client" WHERE id = ${clientId} LIMIT 1;`
        : Promise.resolve([] as Array<Record<string, unknown>>),
      prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT id, status, "totalTTC"::float8 AS "totalTTC", "createdAt" FROM "Quote" WHERE "projectId" = ${dossierId} ORDER BY "createdAt" DESC;`,
      prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT id, type, status, "totalTTC"::float8 AS "totalTTC", "createdAt" FROM "Invoice" WHERE "projectId" = ${dossierId} ORDER BY "createdAt" DESC;`,
      prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT id, type, status, title, "createdAt" FROM "Demande" WHERE "projectId" = ${dossierId} ORDER BY "createdAt" DESC;`,
      prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT * FROM "DossierDocument" WHERE "projectId" = ${dossierId} ORDER BY "createdAt" DESC LIMIT 200;`,
      prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT id, type, status, prompt, "createdAt" FROM "IaJob" WHERE "projectId" = ${dossierId} ORDER BY "createdAt" DESC LIMIT 50;`,
      prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT id, type, title, "createdAt" FROM "Event" WHERE "projectId" = ${dossierId} ORDER BY "createdAt" DESC;`,
      prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT i.id, i.type, i.name, i.email, i.phone FROM "ProjectIntervenant" pi
        JOIN "Intervenant" i ON i.id = pi."intervenantId" WHERE pi."projectId" = ${dossierId};`,
    ]);

    try {
      await prisma.$executeRaw`
        INSERT INTO "SupportAuditLog" ("adminEmail", action, "targetWorkspaceId", detail)
        VALUES (${auth.email}, ${'view_dossier'}, ${workspaceId}, ${JSON.stringify({ dossierId, name: project.name ?? null })}::jsonb);
      `;
    } catch (logErr) {
      console.error('[/api/support/dossier] audit log failed:', logErr);
    }

    return new NextResponse(
      safeJson({ project, client: client[0] ?? null, devis, factures, demandes, documents, rendus, events, intervenants }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  } catch (err) {
    console.error('[/api/support/dossier] error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
