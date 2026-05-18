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
import {
  generateColoristImageSAM,     // SAM + Inpaint — pixel-perfect, ~40-60s, mode par défaut
  generateColoristImageKontext, // Kontext Multi — supporte les textures importées, ~30-60s
  ensureHttpsUrl,
} from '@/lib/server/flux-api';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { getUserContextFromRequest } from '@/lib/server/auth-guard';
import { prisma } from '@/lib/server/prisma';
import {
  copyExternalImageToIaRenders,
  buildIaRenderPath,
} from '@/lib/server/supabase-storage';

// Vercel serverless function timeout :
// fal.ai peut prendre jusqu'a 90s + retry sur 3 niveaux de prompt.
// Sans cette ligne, Vercel utilise le defaut Hobby (10s) -> "Erreur reseau"
// pour l'utilisateur car la function est tuee avant que fal.ai reponde.
// 300s = max plan Pro. 60s = max Hobby.
export const maxDuration = 300;

// Limite : 10 générations par IP/utilisateur par heure
const IA_RATE_LIMIT = { limit: 10, windowMs: 60 * 60 * 1000 };

export async function POST(req: NextRequest) {
  // ── 1) Authentification + extraction contexte (user + workspace) ─────────
  // On utilise getUserContextFromRequest pour récupérer le workspaceId,
  // nécessaire pour persister IaJob et stocker le rendu dans le bon dossier
  // Supabase. Le helper renvoie null si JWT absent / invalide / expiré.
  const userCtx = getUserContextFromRequest(req);
  if (!userCtx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { userId, workspaceId } = userCtx;

  // ── 2) Rate limiting par userId (au lieu d'IP : un seul user qui partage
  //       son NAT avec un collègue ne grille plus son quota commun).
  const rateResult = checkRateLimit(`ia-coloriste:user:${userId}`, IA_RATE_LIMIT);
  if (!rateResult.success) {
    return NextResponse.json(
      { error: 'Trop de générations cette heure. Réessayez plus tard.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit':     String(IA_RATE_LIMIT.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset':     String(Math.ceil(rateResult.resetAt / 1000)),
          'Retry-After':           String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  // ── 3) Parse + validation body
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const { facadeHex, poigneeHex, planHex, facadeFinish, lightingStyle } = body as Record<string, unknown>;
  if (!facadeHex || !poigneeHex || !planHex || !facadeFinish || !lightingStyle) {
    return NextResponse.json(
      { error: 'Paramètres manquants : facadeHex, poigneeHex, planHex, facadeFinish, lightingStyle requis' },
      { status: 400 },
    );
  }
  const sourceKitchenUrl = typeof body.sourceImageDataUrl === 'string' ? body.sourceImageDataUrl : null;
  if (!sourceKitchenUrl) {
    return NextResponse.json(
      { error: 'Photo de la cuisine requise. Importez une photo pour utiliser le coloriste IA.' },
      { status: 400 },
    );
  }

  const params: ColoristParams = {
    facadeHex:          String(facadeHex),
    poigneeHex:         String(poigneeHex),
    planHex:            String(planHex),
    facadeFinish:       facadeFinish as ColoristParams['facadeFinish'],
    poigneeFinish:      (body.poigneeFinish      as ColoristParams['poigneeFinish'])      ?? undefined,
    planFinish:         (body.planFinish         as ColoristParams['planFinish'])         ?? undefined,
    handleMaterial:     (body.handleMaterial     as string | undefined)                   ?? undefined,
    countertopMaterial: (body.countertopMaterial as string | undefined)                   ?? undefined,
    lightingStyle:      lightingStyle as ColoristParams['lightingStyle'],
    extraContext:       (body.extraContext       as string | undefined)                   ?? undefined,
    facadeTextureDataUrl:  (body.facadeTextureDataUrl  as string | undefined) ?? undefined,
    poigneeTextureDataUrl: (body.poigneeTextureDataUrl as string | undefined) ?? undefined,
    planTextureDataUrl:    (body.planTextureDataUrl    as string | undefined) ?? undefined,
  };
  const numImages = Math.min(Math.max(parseInt(String(body.numImages), 10) || 1, 1), 4);
  const projectId = typeof body.projectId === 'string' && body.projectId.length > 0 ? body.projectId : null;

  // ── 4) INSERT IaJob (QUEUED) — on enregistre la demande AVANT toute action
  //       coûteuse pour avoir une trace même si fal.ai timeout/crash. Le
  //       champ `params` reçoit un snapshot non-sensible (les data URIs
  //       sont *exclues* — trop volumineuses et inutiles à long terme).
  //
  // Routing du moteur (stratégie infaillible, 18/05/2026) :
  //  - sans texture importée → SAM + Inpaint pixel-perfect (~40-60s, ~$0.12)
  //    Garantit que tout pixel hors façades/poignées/plan reste identique au source.
  //  - avec au moins une texture → Kontext Multi (~30-60s, ~$0.06)
  //    Le seul mode capable d'utiliser des images de référence en multi-input.
  const willUseTextures = !!(
    params.facadeTextureDataUrl || params.poigneeTextureDataUrl || params.planTextureDataUrl
  );
  const modelUsed = willUseTextures
    ? 'fal-ai/flux-pro/kontext/multi'
    : 'fal-ai/evf-sam + fal-ai/flux-lora/inpainting'; // pipeline SAM
  const costPerImage = willUseTextures ? 0.06 : 0.12;

  // Création initiale du job (statut QUEUED) — isolée pour ne jamais laisser
  // une erreur Prisma escape en uncaught (auquel cas Vercel renvoie son
  // enveloppe `{code, id, message}` et le front crashe en React #31).
  let job;
  try {
    job = await prisma.iaJob.create({
      data: {
        workspaceId,
        createdById: userId,
        projectId,
        type:        'COLOR_VARIATION',
        status:      'QUEUED',
        modelsUsed:  [modelUsed],
        params: {
          facadeHex:          params.facadeHex,
          poigneeHex:         params.poigneeHex,
          planHex:            params.planHex,
          facadeFinish:       params.facadeFinish,
          poigneeFinish:      params.poigneeFinish ?? null,
          planFinish:         params.planFinish ?? null,
          handleMaterial:     params.handleMaterial ?? null,
          countertopMaterial: params.countertopMaterial ?? null,
          lightingStyle:      params.lightingStyle,
          numImages,
          hasSourceImage:     true,
          hasFacadeTexture:   !!params.facadeTextureDataUrl,
          hasPoigneeTexture:  !!params.poigneeTextureDataUrl,
          hasPlanTexture:     !!params.planTextureDataUrl,
        },
      },
    });
  } catch (dbErr) {
    console.error('[API /ia/coloriste] prisma.iaJob.create échec:',
      dbErr instanceof Error ? dbErr.message : String(dbErr));
    return NextResponse.json(
      { error: 'Impossible d\'enregistrer la demande en base. Réessayez dans un instant.' },
      { status: 500 },
    );
  }

  // Helper local pour marquer le job FAILED avec un message.
  // Le prisma.iaJob.update peut throw (DB déconnectée, contrainte violée,
  // job déjà cleanup), donc on l'isole pour ne JAMAIS laisser une exception
  // remonter jusqu'au caller — sinon Vercel renvoie son enveloppe d'erreur
  // par défaut `{code, id, message}` que le front ne sait pas gérer.
  const fail = async (status: number, message: string, durationMs: number) => {
    try {
      await prisma.iaJob.update({
        where: { id: job.id },
        data:  {
          status:       'FAILED',
          errorMessage: message,
          durationMs,
          completedAt:  new Date(),
        },
      });
    } catch (dbErr) {
      console.warn(`[API /ia/coloriste] fail() couldn't update IaJob ${job.id}:`,
        dbErr instanceof Error ? dbErr.message : String(dbErr));
    }
    return NextResponse.json({ error: message, jobId: job.id }, { status });
  };

  const tStart = Date.now();

  // ── Garde-fou global : on déclenche notre propre timeout à 250s,
  //    50s avant que Vercel ne tue la fonction (300s max sur Pro). Ça nous
  //    laisse le temps de faire un UPDATE IaJob status=FAILED avant le kill,
  //    sinon le job resterait coincé en PROCESSING pour toujours.
  const GLOBAL_TIMEOUT_MS = 250_000;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const globalTimeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error('Délai serveur dépassé (250s). Le service IA est probablement saturé.')),
      GLOBAL_TIMEOUT_MS,
    );
  });

  try {
    // Wrap toute l'opération dans une race contre le global timeout.
    return await Promise.race([globalTimeout, (async () => {
    // ── 5) Pré-upload des images vers fal-cdn (pour pouvoir les enregistrer
    //       dans IaJob.inputImageUrls avant de lancer la génération).
    //       Si une URL est déjà https, `ensureHttpsUrl` la passe directement.
    const [sourceHttps, facadeTexHttps, poigneeTexHttps, planTexHttps] = await Promise.all([
      ensureHttpsUrl(sourceKitchenUrl),
      params.facadeTextureDataUrl  ? ensureHttpsUrl(params.facadeTextureDataUrl)  : Promise.resolve(undefined),
      params.poigneeTextureDataUrl ? ensureHttpsUrl(params.poigneeTextureDataUrl) : Promise.resolve(undefined),
      params.planTextureDataUrl    ? ensureHttpsUrl(params.planTextureDataUrl)    : Promise.resolve(undefined),
    ]);

    await prisma.iaJob.update({
      where: { id: job.id },
      data:  {
        status:         'PROCESSING',
        inputImageUrls: {
          source:  sourceHttps,
          facade:  facadeTexHttps  ?? null,
          poignee: poigneeTexHttps ?? null,
          plan:    planTexHttps    ?? null,
        },
      },
    });

    // ── 6) Génération : routing engine selon présence de textures.
    //       - Sans texture → SAM + Inpaint pixel-perfect (3 régions, séquentiel)
    //       - Avec texture → Kontext Multi (multi-image, instruction-aware)
    const result = willUseTextures
      ? await generateColoristImageKontext(
          params,
          sourceHttps,
          { facade: facadeTexHttps, poignee: poigneeTexHttps, plan: planTexHttps },
          numImages,
        )
      : await generateColoristImageSAM(params, sourceHttps, numImages);

    if (!result.success) {
      const err = (result.error ?? '').toLowerCase();
      let status = 500;
      if (err.includes('uploader') || err.includes('storage') || err.includes('fal-cdn')) status = 502;
      else if (err.includes('timeout') || err.includes('aucun résultat')) status = 504;
      return fail(status, result.error ?? 'Génération échouée', Date.now() - tStart);
    }

    // ── 7) Copie fal-cdn → Supabase (URLs permanentes signées 30 jours)
    const copied = await Promise.all(
      result.imageUrls.map((falUrl, idx) =>
        copyExternalImageToIaRenders(falUrl, buildIaRenderPath(workspaceId, job.id, idx))
          .then(({ path, signedUrl }) => ({ path, signedUrl, falUrl })),
      ),
    );

    // ── 8) UPDATE IaJob (DONE) — coût aligné sur le moteur réellement utilisé
    const costEUR = costPerImage * result.imageUrls.length;

    // Récupère les `steps` du pipeline SAM si dispo, pour debug
    // (quelle région a un mask trouvé / inpaint OK / combien de ms).
    // Ces infos vont dans params.pipelineSteps pour pouvoir auditer
    // précisément ce qui rate sur les jobs ratés.
    const samSteps = (result as { steps?: unknown }).steps;
    const previousParams = (job.params as Record<string, unknown> | null) ?? {};
    await prisma.iaJob.update({
      where: { id: job.id },
      data:  {
        status:          'DONE',
        prompt:          result.prompt.prompt,
        resultImageUrls: {
          paths:      copied.map(c => c.path),
          signedUrls: copied.map(c => c.signedUrl),
          falRaw:     copied.map(c => c.falUrl),
        },
        // Merge des steps SAM dans params (sans écraser l'existant)
        params: samSteps
          ? { ...previousParams, pipelineSteps: samSteps as object }
          : previousParams as object,
        durationMs:      Date.now() - tStart,
        costEUR,
        completedAt:     new Date(),
      },
    });

    return NextResponse.json({
      jobId:      job.id,
      imageUrl:   copied[0]?.signedUrl ?? null,
      imageUrls:  copied.map(c => c.signedUrl),
      attempts:   result.attempts,
      durationMs: Date.now() - tStart,
      level:      result.prompt.level,
      warnings:   result.prompt.warnings,
      // Pipeline SAM transparency : permet à l'UI d'afficher quelles régions
      // ont été effectivement modifiées (✓ façades, ✗ poignées, ✓ plan).
      // Indispensable pour que l'user comprenne si un résultat décevant vient
      // d'un mask raté plutôt que d'un défaut global.
      steps:      samSteps ?? null,
      rateLimit:  { remaining: rateResult.remaining, resetAt: rateResult.resetAt },
    });
    })()]);

  } catch (err) {
    console.error('[API /ia/coloriste] exception:', err);
    const message = err instanceof Error ? err.message : 'Erreur serveur interne';
    // 504 si c'est notre garde-fou global qui a triggered, sinon 500.
    const status = message.includes('Délai serveur dépassé') ? 504 : 500;
    return fail(status, message, Date.now() - tStart);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}
