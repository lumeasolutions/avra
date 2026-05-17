/**
 * POST /api/ia/rendu
 *
 * Reçoit les paramètres de style depuis le front,
 * construit le prompt photoréaliste côté serveur,
 * appelle Flux 1.1 Pro Ultra via fal.ai,
 * retourne l'URL de l'image générée.
 */

import { NextRequest, NextResponse } from 'next/server';
import { RenduParams } from '@/lib/server/prompt-builder';
import { generateRenduImage } from '@/lib/server/flux-api';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { isAuthenticated } from '@/lib/server/auth-guard';

// Vercel serverless function timeout :
// fal.ai peut prendre jusqu'a 90s + retry sur 3 niveaux de prompt.
// Sans cette ligne, Vercel utilise le defaut Hobby (10s) -> "Erreur reseau"
// pour l'utilisateur car la function est tuee avant que fal.ai reponde.
// 300s = max plan Pro. 60s = max Hobby.
export const maxDuration = 300;

// Limite : 10 générations par IP/utilisateur par heure (appels fal.ai coûteux)
const IA_RATE_LIMIT = { limit: 10, windowMs: 60 * 60 * 1000 };

export async function POST(req: NextRequest) {
  try {
    // ── Authentification ─────────────────────────────────────────────────
    if (!isAuthenticated(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Rate limiting ────────────────────────────────────────────────────
    const ip = getClientIp(req);
    const rateResult = checkRateLimit(`ia-rendu:${ip}`, IA_RATE_LIMIT);
    if (!rateResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans quelques minutes.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(IA_RATE_LIMIT.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateResult.resetAt / 1000)),
            'Retry-After': String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    const body = await req.json();

    const { facades, planTravail, style, lightingStyle, roomSize } = body;

    if (!facades || !style || !lightingStyle || !roomSize) {
      return NextResponse.json(
        { error: 'Paramètres manquants : facades, style, lightingStyle, roomSize requis' },
        { status: 400 }
      );
    }

    const params: RenduParams = {
      facades,
      planTravail:  planTravail  ?? 'quartz blanc mat',
      sol:          body.sol  ?? undefined,
      murs:         body.murs ?? undefined,
      style,
      lightingStyle,
      roomSize,
      // hasPlanFile / planImageDataUrl ont été retirés : Flux Pro Ultra est
      // un modèle text-to-image pur qui ignore toute image source. Pour
      // contraindre la disposition via un plan, il faudrait basculer sur
      // un modèle ControlNet/Kontext — pas le cas actuel.
      hasPlanFile:  false,
      extraContext: body.extraContext ?? undefined,
    };

    // Nombre de variantes a generer (1-4). Defaut 1.
    const numImages = Math.min(Math.max(parseInt(body.numImages, 10) || 1, 1), 4);

    const result = await generateRenduImage(params, numImages);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? 'Génération échouée' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageUrl:  result.imageUrl,
      imageUrls: result.imageUrls,
      attempts:  result.attempts,
      durationMs:result.durationMs,
      level:     result.prompt.level,
      warnings:  result.prompt.warnings,
    });

  } catch (err) {
    console.error('[API /ia/rendu]', err);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}
