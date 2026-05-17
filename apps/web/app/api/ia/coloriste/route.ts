/**
 * POST /api/ia/coloriste
 *
 * Reçoit les paramètres couleurs depuis le front,
 * construit le prompt côté serveur (invisible depuis le client),
 * appelle Flux via fal.ai avec la FAL_KEY (jamais exposée),
 * retourne l'URL de l'image générée.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ColoristParams } from '@/lib/server/prompt-builder';
import { generateColoristImageKontext } from '@/lib/server/flux-api';
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

    // Photo cuisine source OBLIGATOIRE : Kontext édite une image existante.
    // On rejette tôt avec un message utilisateur clair.
    const sourceKitchenUrl: string | undefined = body.sourceImageDataUrl;
    if (!sourceKitchenUrl || typeof sourceKitchenUrl !== 'string') {
      return NextResponse.json(
        { error: 'Photo de la cuisine requise. Importez une photo pour utiliser le coloriste IA.' },
        { status: 400 }
      );
    }

    const params: ColoristParams = {
      facadeHex,
      poigneeHex,
      planHex,
      facadeFinish,
      poigneeFinish:      body.poigneeFinish      ?? undefined,
      planFinish:         body.planFinish         ?? undefined,
      handleMaterial:     body.handleMaterial     ?? undefined,
      countertopMaterial: body.countertopMaterial ?? undefined,
      lightingStyle,
      extraContext:       body.extraContext        ?? undefined,
      // Textures importées : data URL ou URL https. Envoyées comme références
      // image_urls[1+] à Flux Kontext Max Multi. Le prompt y fait référence
      // explicitement par index ("apply material from image N to ...").
      facadeTextureDataUrl:  body.facadeTextureDataUrl  ?? undefined,
      poigneeTextureDataUrl: body.poigneeTextureDataUrl ?? undefined,
      planTextureDataUrl:    body.planTextureDataUrl    ?? undefined,
    };

    // Nombre de variantes a generer (1-4). Defaut 1.
    const numImages = Math.min(Math.max(parseInt(body.numImages, 10) || 1, 1), 4);

    // Génération via Flux Kontext Max Multi (multi-image édition).
    const result = await generateColoristImageKontext(
      params,
      sourceKitchenUrl,
      {
        facade:  params.facadeTextureDataUrl,
        poignee: params.poigneeTextureDataUrl,
        plan:    params.planTextureDataUrl,
      },
      numImages,
    );

    if (!result.success) {
      // Tri par cause pour renvoyer un status HTTP cohérent. Le front
      // utilise ce status pour afficher un message ciblé (cf callColoristAPI).
      const err = (result.error ?? '').toLowerCase();
      let status = 500;
      if (err.includes('uploader') || err.includes('storage') || err.includes('fal-cdn')) {
        status = 502; // upload vers fal-cdn impossible
      } else if (err.includes('timeout') || err.includes('aucun résultat')) {
        status = 504; // génération a dépassé les délais
      } else if (err.includes('data uri') || err.includes('invalide')) {
        status = 400;
      }
      return NextResponse.json(
        { error: result.error ?? 'Génération échouée' },
        { status },
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
