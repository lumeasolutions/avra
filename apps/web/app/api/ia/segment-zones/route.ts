/**
 * POST /api/ia/segment-zones
 *
 * Detecte les zones d'une cuisine (meubles bas, meubles hauts, ilot, poignees,
 * plan de travail, credence) sur une photo, en UN seul appel.
 *
 * A quoi ca sert : aucun modele de generation d'image de Google n'accepte de
 * masque en entree. Pour garantir que SEULES les couleurs changent, on genere
 * puis on ne recolle les pixels generes qu'a l'interieur des zones. Cette
 * route produit ces zones.
 *
 * Elle renvoie aussi un diagnostic (`formatMasque`, `apercuMasque`) : la
 * documentation de Google se contredit sur le format des masques, et le forum
 * officiel rapporte trois comportements differents. On observe donc ce qui
 * arrive reellement plutot que de parier.
 *
 * ⚙️  GOOGLE_AI_API_KEY. Cout : moins de 0,002 $ par appel.
 */

import { NextRequest, NextResponse } from 'next/server';
import { segmenterZones, ZONES_CUISINE, isSegmentEnabled } from '@/lib/server/google-segment';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { getUserContextFromRequest } from '@/lib/server/auth-guard';

export const maxDuration = 120;

const LIMITE = { limit: 120, windowMs: 60 * 60 * 1000 };

export async function POST(req: NextRequest) {
  const userCtx = getUserContextFromRequest(req);
  if (!userCtx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rate = checkRateLimit(`ia-segment:ws:${userCtx.workspaceId}`, LIMITE);
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Trop de détections cette heure. Réessayez plus tard.' },
      { status: 429 },
    );
  }

  if (!isSegmentEnabled()) {
    return NextResponse.json({ error: 'Détection des zones non configurée.' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const dataUrl = typeof body.sourceImageDataUrl === 'string' && body.sourceImageDataUrl.startsWith('data:')
    ? body.sourceImageDataUrl
    : null;
  if (!dataUrl) {
    return NextResponse.json({ error: 'Photo requise (data URL attendue).' }, { status: 400 });
  }

  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return NextResponse.json({ error: 'Photo illisible.' }, { status: 400 });

  // Sous-ensemble de zones, si l'appelant n'en veut que certaines.
  const ids = Array.isArray(body.zones)
    ? (body.zones as unknown[]).filter((z): z is string => typeof z === 'string')
    : null;
  const zones = ids && ids.length > 0
    ? ZONES_CUISINE.filter(z => ids.includes(z.id))
    : ZONES_CUISINE;

  const t0 = Date.now();
  const res = await segmenterZones(m[2], m[1], zones);

  return NextResponse.json({
    ok: res.ok,
    // Diagnostic : c'est lui qui repond aux deux questions ouvertes de l'audit.
    formatMasque: res.formatMasque,
    apercuMasque: res.apercuMasque,
    labelsDemandes: zones.map(z => z.id),
    labelsTrouves: res.zones.map(z => z.label),
    boites: res.zones.map(z => ({ label: z.label, box_2d: z.box_2d })),
    nb: res.zones.length,
    ms: Date.now() - t0,
    brut: res.brut,
    error: res.error,
  }, { status: res.ok ? 200 : 502 });
}
