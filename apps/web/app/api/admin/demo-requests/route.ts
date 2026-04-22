/**
 * GET /api/admin/demo-requests
 * Retourne toutes les demandes de démo.
 *
 * Sécurité :
 * - Vérifie que l'email du token JWT est dans BETA_ADMIN_EMAILS
 * - Sinon : 401 Unauthorized
 *
 * Paramètres query optionnels :
 * - limit    : nombre max (défaut : 1000)
 * - offset   : décalage (défaut : 0)
 * - contacted : "true" | "false" — filtrer par statut contacté
 *
 * Note : le schéma Prisma utilise `contacted: Boolean` (pas de champ status texte).
 * Le dashboard mappe ce booléen en libellé lisible côté client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { isAdminEmail } from '@/lib/server/admin-guard';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // Vérification admin
  const authResult = isAdminEmail(req);
  if (!authResult.ok) {
    return NextResponse.json(
      { error: 'Accès non autorisé. Email non whitelisté.' },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '1000', 10), 5000);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const contactedFilter = searchParams.get('contacted');

  const where =
    contactedFilter === 'true'
      ? { contacted: true }
      : contactedFilter === 'false'
      ? { contacted: false }
      : undefined;

  try {
    const [rawEntries, total] = await Promise.all([
      prisma.demoRequest.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          company: true,
          phone: true,
          metier: true,
          message: true,
          contacted: true,
          source: true,
          createdAt: true,
        },
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.demoRequest.count({ where }),
    ]);

    // Normalise le champ contacted → status lisible pour le dashboard
    const entries = rawEntries.map((e) => ({
      ...e,
      status: e.contacted ? 'contacte' : 'nouveau',
    }));

    return NextResponse.json({
      entries,
      total,
      limit,
      offset,
    });
  } catch (err) {
    console.error('[/api/admin/demo-requests] error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
