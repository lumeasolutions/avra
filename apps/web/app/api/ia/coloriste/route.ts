/**
 * POST /api/ia/coloriste — « Changer les couleurs »
 *
 * Reçoit les paramètres couleurs depuis le front, construit la consigne côté
 * serveur (invisible depuis le client) et l'applique à la photo via
 * MyArchitectAI /edit-by-prompt (MYARCHITECT_API_KEY, jamais exposée).
 *
 * 22/09/2026 : moteur fal.ai (Flux Kontext) remplacé par MyArchitectAI —
 * tout l'IA Studio passe désormais par un seul fournisseur. Mesure sur photo
 * test : couleur demandée appliquée, mur et sol identiques au pixel près.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ColoristParams, buildColoristeEditInstruction, type ElementColoriste } from '@/lib/server/prompt-builder';
import { editByPrompt, isArchitectEnabled } from '@/lib/server/myarchitect-api';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { getUserContextFromRequest } from '@/lib/server/auth-guard';
import { prisma } from '@/lib/server/prisma';
import {
  copyExternalImageToIaRenders,
  buildIaRenderPath,
  uploadToIaRenders,
  createIaRendersSignedUrl,
} from '@/lib/server/supabase-storage';

/**
 * Image reçue (data URL ou https) → URL https lisible par MyArchitectAI.
 * Les data URL sont déposées dans le bucket ia-renders (URL signée).
 */
async function versUrlHttps(src: string, chemin: string): Promise<string> {
  if (/^https:\/\//i.test(src)) return src;
  const m = /^data:([^;]+);base64,(.+)$/.exec(src);
  if (!m) throw new Error('Image invalide (data URL ou https attendue).');
  const type = m[1];
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
  await uploadToIaRenders(`${chemin}.${ext}`, Buffer.from(m[2], 'base64'), type);
  return createIaRendersSignedUrl(`${chemin}.${ext}`);
}

// Vercel serverless function timeout :
// fal.ai peut prendre jusqu'a 90s + retry sur 3 niveaux de prompt.
// Sans cette ligne, Vercel utilise le defaut Hobby (10s) -> "Erreur reseau"
// pour l'utilisateur car la function est tuee avant que fal.ai reponde.
// 300s = max plan Pro. 60s = max Hobby.
export const maxDuration = 300;

// Limite : 150 générations par heure par SHOWROOM (workspace). (Avant :
// 10/h/utilisateur, trop bas — bloquait un usage normal.)
const IA_RATE_LIMIT = { limit: 150, windowMs: 60 * 60 * 1000 };

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

  // ── 2) Rate limiting par SHOWROOM (workspace) : 150/h partagés par l'équipe.
  const rateResult = checkRateLimit(`ia-coloriste:ws:${workspaceId}`, IA_RATE_LIMIT);
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
    facadeMaterial:     (body.facadeMaterial     as string | undefined)                   ?? undefined,
    handleMaterial:     (body.handleMaterial     as string | undefined)                   ?? undefined,
    countertopMaterial: (body.countertopMaterial as string | undefined)                   ?? undefined,
    lightingStyle:      lightingStyle as ColoristParams['lightingStyle'],
    extraContext:       (body.extraContext       as string | undefined)                   ?? undefined,
    facadeTextureDataUrl:  (body.facadeTextureDataUrl  as string | undefined) ?? undefined,
    poigneeTextureDataUrl: (body.poigneeTextureDataUrl as string | undefined) ?? undefined,
    planTextureDataUrl:    (body.planTextureDataUrl    as string | undefined) ?? undefined,
    // Mode de combinaison couleur/texture par élément (19/05/2026, demande asso).
    facadeColorMode:       (body.facadeColorMode  as ColoristParams['facadeColorMode'])  ?? undefined,
    poigneeColorMode:      (body.poigneeColorMode as ColoristParams['poigneeColorMode']) ?? undefined,
    planColorMode:         (body.planColorMode    as ColoristParams['planColorMode'])    ?? undefined,
  };
  const numImages = Math.min(Math.max(parseInt(String(body.numImages), 10) || 1, 1), 4);
  const projectId = typeof body.projectId === 'string' && body.projectId.length > 0 ? body.projectId : null;

  // ── 4) INSERT IaJob (QUEUED) — on enregistre la demande AVANT toute action
  //       coûteuse pour avoir une trace même si fal.ai timeout/crash. Le
  //       champ `params` reçoit un snapshot non-sensible (les data URIs
  //       sont *exclues* — trop volumineuses et inutiles à long terme).
  //
  // Moteur : MyArchitectAI /edit-by-prompt (0,03 $ par appel). Une texture
  // importée passe en `referenceImage` (une seule par appel) : la 1re est
  // traitée dans l'appel principal, les suivantes dans des appels enchaînés.
  const texturesUtilisees: Array<{ element: ElementColoriste; src: string; mode: 'attached' | 'attached-tinted' }> = [];
  const pousserTexture = (element: ElementColoriste, src: string | undefined, mode: ColoristParams['facadeColorMode']) => {
    // mode 'color' : couleur seule, la texture est ignorée.
    if (src && mode !== 'color') texturesUtilisees.push({ element, src, mode: mode === 'mix' ? 'attached-tinted' : 'attached' });
  };
  pousserTexture('facade',  params.facadeTextureDataUrl,  params.facadeColorMode);
  pousserTexture('poignee', params.poigneeTextureDataUrl, params.poigneeColorMode);
  pousserTexture('plan',    params.planTextureDataUrl,    params.planColorMode);
  const modelUsed = isArchitectEnabled() ? 'myarchitectai/edit-by-prompt' : 'mock';
  const appelsParImage = 1 + Math.max(0, texturesUtilisees.length - 1);
  const costPerImage = 0.03 * appelsParImage;

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
    // ── 5) Photo + textures → URLs https (bucket ia-renders) lisibles par MyArchitectAI
    const base = `${workspaceId}/${job.id}`;
    const sourceHttps = await versUrlHttps(sourceKitchenUrl, `${base}/source`);
    const texturesHttps = await Promise.all(
      texturesUtilisees.map((t) => versUrlHttps(t.src, `${base}/texture-${t.element}`)),
    );

    await prisma.iaJob.update({
      where: { id: job.id },
      data:  {
        status:         'PROCESSING',
        inputImageUrls: {
          source:  sourceHttps,
          textures: texturesUtilisees.map((t, k) => ({ element: t.element, url: texturesHttps[k] })),
        },
      },
    });

    // ── 6) Génération MyArchitectAI /edit-by-prompt
    //   Appel principal : TOUS les éléments en une consigne (géométrie mieux
    //   préservée qu'en 3 appels), avec la 1re texture en image jointe.
    //   Textures suivantes : un appel enchaîné chacune, sur le résultat précédent.
    // Les éléments dont la texture est appliquée dans un appel suivant ne sont
    // PAS recolorés dans l'appel principal (sinon double traitement, et la
    // couleur demandée entrerait en conflit avec la texture appliquée ensuite).
    const plusTard = new Set(texturesUtilisees.slice(1).map((t) => t.element));
    const elementsPrincipal = (['facade', 'poignee', 'plan'] as ElementColoriste[]).filter((el) => !plusTard.has(el));
    const consignePrincipale = buildColoristeEditInstruction(
      params, elementsPrincipal, texturesUtilisees[0] ? { element: texturesUtilisees[0].element, mode: texturesUtilisees[0].mode } : undefined,
    );
    const genererUne = async (): Promise<string> => {
      if (!isArchitectEnabled()) return sourceHttps; // mode démo : renvoie la photo
      const r1 = await editByPrompt(sourceHttps, consignePrincipale, texturesHttps[0]);
      if (!r1.ok || !r1.outputs[0]) throw new Error(r1.error || 'Le moteur n\u2019a pas renvoyé d\u2019image.');
      let courante = r1.outputs[0];
      for (let k = 1; k < texturesUtilisees.length; k++) {
        const t = texturesUtilisees[k];
        const consigne = buildColoristeEditInstruction(params, [t.element], { element: t.element, mode: t.mode });
        const rk = await editByPrompt(courante, consigne, texturesHttps[k]);
        if (!rk.ok || !rk.outputs[0]) throw new Error(rk.error || 'Le moteur n\u2019a pas renvoyé d\u2019image.');
        courante = rk.outputs[0];
      }
      return courante;
    };
    let urls: string[];
    try {
      urls = await Promise.all(Array.from({ length: numImages }, () => genererUne()));
    } catch (genErr) {
      const msg = genErr instanceof Error ? genErr.message : String(genErr);
      const low = msg.toLowerCase();
      const status = low.includes('crédit') || low.includes('insufficient') ? 402 : low.includes('timeout') || low.includes('délai') ? 504 : 502;
      return fail(status, msg, Date.now() - tStart);
    }
    const result = {
      imageUrls: urls,
      attempts: 1,
      prompt: { prompt: consignePrincipale, level: 'standard' as const, warnings: [] as string[] },
    };

    // ── 7) Copie → Supabase (URLs signées 30 jours ; le rendu est ensuite
    //       enregistré définitivement dans le dossier via « Sauvegarder »)
    const copied = await Promise.all(
      result.imageUrls.map((url, idx) =>
        copyExternalImageToIaRenders(url, buildIaRenderPath(workspaceId, job.id, idx))
          .then(({ path, signedUrl }) => ({ path, signedUrl, moteurUrl: url })),
      ),
    );

    // ── 8) UPDATE IaJob (DONE) — coût aligné sur le moteur réellement utilisé
    const costEUR = costPerImage * result.imageUrls.length;

    // Récupère les `steps` du pipeline SAM si dispo, pour debug
    // (quelle région a un mask trouvé / inpaint OK / combien de ms).
    // Ces infos vont dans params.pipelineSteps pour pouvoir auditer
    // précisément ce qui rate sur les jobs ratés.
    const samSteps = undefined as unknown;
    const previousParams = (job.params as Record<string, unknown> | null) ?? {};
    await prisma.iaJob.update({
      where: { id: job.id },
      data:  {
        status:          'DONE',
        prompt:          result.prompt.prompt,
        resultImageUrls: {
          paths:      copied.map(c => c.path),
          signedUrls: copied.map(c => c.signedUrl),
          moteurRaw:  copied.map(c => c.moteurUrl),
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
