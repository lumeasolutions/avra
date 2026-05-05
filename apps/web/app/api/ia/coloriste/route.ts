/**
 * POST /api/ia/coloriste
 *
 * Reçoit les paramètres couleurs depuis le front,
 * construit le prompt côté serveur (invisible depuis le client),
 * appelle Flux via fal.ai avec la FAL_KEY (jamais exposée),
 * retourne l'URL de l'image générée.
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildColoristPrompt, ColoristParams } from '@/lib/server/prompt-builder';
import { generateColoristImage } from '@/lib/server/flux-api';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { isAuthenticated } from '@/lib/server/auth-guard';

// Vercel serverless function timeout :
// fal.ai peut prendre jusqu'a 90s + retry sur 3 niveaux de prompt.
// Sans cette ligne, Vercel utilise le defaut Hobby (10s) -> "Erreur reseau"
// pour l'utilisateur car la function est tuee avant que fal.ai reponde.
// 300s = max plan Pro. 60s = max Hobby.
export const maxDuration = 300;

// Limite : 10 générations par IP/utilisateur par heure
const IA_RATE_LIMIT = { limit: 10, windowMs: 60 * 60 * 1000 };

export async function POST(req: NextRequest) {
  try {
    // ── Authentification ─────────────────────────────────────────────────
    if (!isAuthenticated(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Rate limiting ────────────────────────────────────────────────────
    const ip = getClientIp(req);
    const rateResult = checkRateLimit(`ia-coloriste:${ip}`, IA_RATE_LIMIT);
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

    // Validation des paramètres obligatoires
    const { facadeHex, poigneeHex, planHex, facadeFinish, lightingStyle } = body;

    if (!facadeHex || !poigneeHex || !planHex || !facadeFinish || !lightingStyle) {
      return NextResponse.json(
        { error: 'Paramètres manquants : facadeHex, poigneeHex, planHex, facadeFinish, lightingStyle requis' },
        { status: 400 }
      );
    }

    const params: ColoristParams = {
      facadeHex,
      poigneeHex,
      planHex,
      facadeFinish,
      handleMaterial:     body.handleMaterial     ?? undefined,
      countertopMaterial: body.countertopMaterial ?? undefined,
      lightingStyle,
      extraContext:       body.extraContext        ?? undefined,
    };

    // Photo de cuisine optionnelle pour img2img (data URL ou URL publique).
    // Quand presente, fal.ai utilise cette image comme base et applique
    // les transformations de couleurs/finitions au lieu de generer from scratch.
    const sourceImageUrl: string | undefined = body.sourceImageDataUrl;

    // Nombre de variantes a generer (1-4). Defaut 1.
    const numImages = Math.min(Math.max(parseInt(body.numImages, 10) || 1, 1), 4);

    // Construction du prompt + génération — tout côté serveur
    const result = await generateColoristImage(params, sourceImageUrl, numImages);

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
    console.error('[API /ia/coloriste]', err);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}
