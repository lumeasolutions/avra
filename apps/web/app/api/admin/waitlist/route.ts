/**
 * GET /api/admin/waitlist
 * Retourne toutes les entrées de la liste d'attente.
 *
 * Sécurité :
 * - Vérifie que l'email du token JWT est dans BETA_ADMIN_EMAILS
 * - Sinon : 401 Unauthorized
 *
 * Paramètres query optionnels :
 * - limit  : nombre max d'entrées (défaut : 1000)
 * - offset : décalage pour pagination (défaut : 0)
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

  try {
    const [entries, total] = await Promise.all([
      prisma.waitlist.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          company: true,
          metier: true,
          source: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.waitlist.count(),
    ]);

    return NextResponse.json({
      entries,
      total,
      limit,
      offset,
    });
  } catch (err) {
    console.error('[/api/admin/waitlist] error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
