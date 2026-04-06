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

    // Construction du prompt + génération — tout côté serveur
    const result = await generateColoristImage(params);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? 'Génération échouée' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageUrl:  result.imageUrl,
      attempts:  result.attempts,
      durationMs:result.durationMs,
      // On expose le niveau utilisé mais PAS le prompt complet
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
