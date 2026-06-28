/**
 * GET /api/support/errors?email=...
 * Erreurs techniques (Sentry) attribuées à un client, pour anticiper les bugs.
 * Réservé aux 2 comptes support.
 *
 * Dégradation propre : si SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT ne
 * sont pas configurés, renvoie { configured:false } (l'UI affiche un mode d'emploi)
 * au lieu d'échouer. Filtre par `user.email` — fonctionne pour les erreurs
 * remontées APRÈS la mise en place de l'attribution Sentry (SentryUserProvider).
 */

import { NextRequest, NextResponse } from 'next/server';
import { isSupportEmail } from '@/lib/server/support-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = isSupportEmail(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Accès réservé au support.' }, { status: 401 });
  }

  const email = (new URL(req.url).searchParams.get('email') ?? '').trim();
  if (!email) {
    return NextResponse.json({ error: 'email manquant' }, { status: 400 });
  }

  const token = process.env.SENTRY_AUTH_TOKEN;
  const org = process.env.SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT;
  const apiBase = process.env.SENTRY_API_BASE || 'https://sentry.io';

  if (!token || !org || !project) {
    return NextResponse.json({ configured: false, issues: [] });
  }

  const url =
    `${apiBase}/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/issues/` +
    `?query=${encodeURIComponent(`user.email:${email}`)}&statsPeriod=90d&limit=25`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      return NextResponse.json(
        { configured: true, error: `Sentry a renvoyé ${res.status}.`, issues: [] },
        { status: 200 },
      );
    }
    const raw = (await res.json()) as Array<Record<string, unknown>>;
    const issues = (Array.isArray(raw) ? raw : []).map((i) => {
      const meta = (i.metadata && typeof i.metadata === 'object') ? (i.metadata as Record<string, unknown>) : {};
      const title = (typeof i.title === 'string' && i.title.length > 0)
        ? i.title
        : (typeof meta.value === 'string' ? meta.value : 'Erreur');
      return {
        id: String(i.id ?? ''),
        title,
        culprit: (i.culprit as string) ?? null,
        level: (i.level as string) ?? null,
        count: Number(i.count ?? 0),
        userCount: Number(i.userCount ?? 0),
        lastSeen: (i.lastSeen as string) ?? null,
        firstSeen: (i.firstSeen as string) ?? null,
        status: (i.status as string) ?? null,
        permalink: (i.permalink as string) ?? null,
      };
    });
    return NextResponse.json({ configured: true, issues });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return NextResponse.json(
      { configured: true, error: aborted ? 'Délai Sentry dépassé.' : 'Connexion à Sentry impossible.', issues: [] },
      { status: 200 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
