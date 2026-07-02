/**
 * GET /api/support/search?q=...
 * Recherche un client par email, nom/prénom ou nom de workspace.
 * Réservé aux 2 comptes support (isSupportEmail). Lecture seule.
 * Ne renvoie JAMAIS de colonne sensible (mot de passe, tokens).
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

  const q = (new URL(req.url).searchParams.get('q') ?? '').trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const pattern = `%${q}%`;

  try {
    const results = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT
        u.id              AS "userId",
        u.email           AS "email",
        u."firstName"     AS "firstName",
        u."lastName"      AS "lastName",
        u."isActive"      AS "isActive",
        u."lastLoginAt"   AS "lastLoginAt",
        uw."workspaceId"  AS "workspaceId",
        w.name            AS "workspaceName",
        w.plan            AS "plan",
        (SELECT count(*)::int FROM "Project" p WHERE p."workspaceId" = uw."workspaceId") AS "dossiers"
      FROM "User" u
      LEFT JOIN "UserWorkspace" uw ON uw."userId" = u.id
      LEFT JOIN "Workspace" w ON w.id = uw."workspaceId"
      WHERE u.email ILIKE ${pattern}
         OR (coalesce(u."firstName",'') || ' ' || coalesce(u."lastName",'')) ILIKE ${pattern}
         OR w.name ILIKE ${pattern}
      ORDER BY u."lastLoginAt" DESC NULLS LAST, u.email ASC
      LIMIT 50;
    `;

    // Traçabilité « qui a cherché qui » — non bloquant.
    try {
      await prisma.$executeRaw`
        INSERT INTO "SupportAuditLog" ("adminEmail", action, "targetWorkspaceId", "targetEmail", detail)
        VALUES (${auth.email}, ${'search'}, ${null}, ${null},
                ${JSON.stringify({ q, count: results.length })}::jsonb);
      `;
    } catch (logErr) {
      console.error('[/api/support/search] audit log failed:', logErr);
    }

    return NextResponse.json({ results, query: q });
  } catch (err) {
    console.error('[/api/support/search] error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
