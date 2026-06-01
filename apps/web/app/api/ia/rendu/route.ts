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
import {
  generateRenduFromReferenceKontext,
  generateRenduFromReferenceControlNet,
  refineRenduMaterialsSAM,
  ensureHttpsUrl,
} from '@/lib/server/flux-api';
import { assessRenduFidelity } from '@/lib/server/vision-critic';
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

// Limite : 10 générations par IP/utilisateur par heure (appels fal.ai coûteux)
const IA_RATE_LIMIT = { limit: 10, windowMs: 60 * 60 * 1000 };

export async function POST(req: NextRequest) {
  // ── 1) Auth + extraction contexte
  const userCtx = getUserContextFromRequest(req);
  if (!userCtx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { userId, workspaceId } = userCtx;

  // ── 2) Rate limit par userId
  const rateResult = checkRateLimit(`ia-rendu:user:${userId}`, IA_RATE_LIMIT);
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

  // ── 3) Parse + validation
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const { facades, planTravail, style, lightingStyle, roomSize } = body as Record<string, unknown>;
  if (!facades || !style || !lightingStyle || !roomSize) {
    return NextResponse.json(
      { error: 'Paramètres manquants : facades, style, lightingStyle, roomSize requis' },
      { status: 400 },
    );
  }

  // Dimensions natives de l'image source (anchor numérique pour le prompt
  // Kontext — force le respect strict du ratio et des proportions).
  const srcW = typeof body.sourceWidth === 'number'  && body.sourceWidth  > 0 ? body.sourceWidth  : undefined;
  const srcH = typeof body.sourceHeight === 'number' && body.sourceHeight > 0 ? body.sourceHeight : undefined;

  const params: RenduParams = {
    facades:       String(facades),
    planTravail:   typeof planTravail === 'string' && planTravail.length > 0 ? planTravail : 'quartz blanc mat',
    sol:           (body.sol  as string | undefined) ?? undefined,
    murs:          (body.murs as string | undefined) ?? undefined,
    style:         style as RenduParams['style'],
    lightingStyle: lightingStyle as RenduParams['lightingStyle'],
    roomSize:      roomSize as RenduParams['roomSize'],
    hasPlanFile:   !!body.referenceImageDataUrl,
    extraContext:  (body.extraContext as string | undefined) ?? undefined,
    sourceWidth:   srcW,
    sourceHeight:  srcH,
  };
  // Image de référence OBLIGATOIRE (plan WinnerFlex, render 3D, sketch ou
  // photo d'inspiration). Le mode text-to-image pur a été retiré (juin 2026) :
  // sans source visuelle, l'IA inventait sol/crédence/ouvertures de façon
  // incohérente avec la pièce réelle du client. Seul Kontext img2img est
  // désormais supporté pour ce module.
  const referenceImageDataUrl =
    typeof body.referenceImageDataUrl === 'string' && body.referenceImageDataUrl.length > 0
      ? body.referenceImageDataUrl
      : null;
  if (!referenceImageDataUrl) {
    return NextResponse.json(
      { error: 'Image de référence requise. Importez un plan, un rendu 3D, un sketch ou une photo d\'inspiration pour générer le rendu réaliste.' },
      { status: 400 },
    );
  }
  const numImages = Math.min(Math.max(parseInt(String(body.numImages), 10) || 1, 1), 4);
  const projectId = typeof body.projectId === 'string' && body.projectId.length > 0 ? body.projectId : null;
  // Phase 2 — toggle "Précision maximale" (SAM+Inpaint matériaux après génération).
  const maxPrecision = body.maxPrecision === true;
  // Phase 5 — nombre de "Régénérer" cliqués par l'utilisateur sur cette image.
  const userRetryCount = typeof body.userRetryCount === 'number' && body.userRetryCount >= 0
    ? Math.min(body.userRetryCount, 20) : 0;

  // ── 4) INSERT IaJob (QUEUED) — protégé pour ne jamais laisser une erreur
  //       Prisma escape en uncaught (cf. coloriste pour le même pattern).
  // Routing du moteur (juin 2026 — Phase 1) :
  //   - Pipeline primaire : ControlNet Canny (verrouillage géométrique strict)
  //   - Fallback transparent : Kontext img2img si ControlNet rate
  //   Le modelsUsed définitif est mis à jour à la fin selon le pipeline réellement utilisé.
  let job;
  try {
    job = await prisma.iaJob.create({
      data: {
        workspaceId,
        createdById: userId,
        projectId,
        type:        'PHOTOREALISM_ENHANCE',
        status:      'QUEUED',
        modelsUsed:  ['fal-ai/flux-control-lora-canny/image-to-image', 'fal-ai/flux-pro/kontext'],
        params: {
          facades:       params.facades,
          planTravail:   params.planTravail,
          sol:           params.sol ?? null,
          murs:          params.murs ?? null,
          style:         params.style,
          lightingStyle: params.lightingStyle,
          roomSize:      params.roomSize,
          numImages,
        },
      },
    });
  } catch (dbErr) {
    console.error('[API /ia/rendu] prisma.iaJob.create échec:',
      dbErr instanceof Error ? dbErr.message : String(dbErr));
    return NextResponse.json(
      { error: 'Impossible d\'enregistrer la demande en base. Réessayez dans un instant.' },
      { status: 500 },
    );
  }

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
      console.warn(`[API /ia/rendu] fail() couldn't update IaJob ${job.id}:`,
        dbErr instanceof Error ? dbErr.message : String(dbErr));
    }
    return NextResponse.json({ error: message, jobId: job.id }, { status });
  };

  const tStart = Date.now();

  // Garde-fou global 250s — voir commentaire dans /api/ia/coloriste/route.ts.
  const GLOBAL_TIMEOUT_MS = 250_000;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const globalTimeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error('Délai serveur dépassé (250s). Le service IA est probablement saturé.')),
      GLOBAL_TIMEOUT_MS,
    );
  });

  try {
    return await Promise.race([globalTimeout, (async () => {
    // ── 5) Transition PROCESSING
    await prisma.iaJob.update({
      where: { id: job.id },
      data:  { status: 'PROCESSING' },
    });

    // ── 6) Upload de l'image de référence vers fal-cdn (obligatoire).
    //       Si l'upload échoue, on FAIL la requête au lieu de tomber en
    //       text-to-image — c'est précisément ce mode qu'on a supprimé.
    let referenceHttpsUrl: string;
    try {
      referenceHttpsUrl = await ensureHttpsUrl(referenceImageDataUrl);
      await prisma.iaJob.update({
        where: { id: job.id },
        data: { inputImageUrls: { reference: referenceHttpsUrl } },
      });
    } catch (uploadErr) {
      console.warn('[API /ia/rendu] upload reference image échec:',
        uploadErr instanceof Error ? uploadErr.message : uploadErr);
      return fail(502, 'Impossible d\'uploader l\'image de référence vers le service IA. Réessayez dans un instant.', Date.now() - tStart);
    }

    // ── 7) Génération : pipeline ControlNet Canny en premier (verrouillage
    //       géométrique strict), fallback automatique sur Kontext si échec.
    //       Phase 5 (monitoring) : on trace pipelineUsed pour analyse.
    let pipelineUsed: 'controlnet-canny' | 'kontext-fallback' = 'controlnet-canny';
    let result = await generateRenduFromReferenceControlNet(params, referenceHttpsUrl, numImages);
    if (!result.success) {
      console.warn(`[API /ia/rendu] ControlNet Canny KO (${result.error ?? 'unknown'}) → fallback Kontext`);
      pipelineUsed = 'kontext-fallback';
      result = await generateRenduFromReferenceKontext(params, referenceHttpsUrl, numImages);
    }

    if (!result.success) {
      const err = (result.error ?? '').toLowerCase();
      const status = err.includes('timeout') || err.includes('aucun résultat') ? 504 : 500;
      return fail(status, result.error ?? 'Génération échouée', Date.now() - tStart);
    }

    // ── 7bis) Phase 4 — Auto-validation Vision-LLM + retry invisible.
    //  On envoie le couple (image source, résultat) à GPT-4o-mini Vision pour
    //  obtenir un score de fidélité géométrique. Si fidelity < 0.7 ET qu'on
    //  a encore du budget temps, on relance avec une seed différente
    //  (jusqu'à 2 retries supplémentaires, total max 3 tentatives).
    //
    //  Budget temps strict : on garde au moins 60s de marge avant le timeout
    //  global de 250s pour ne pas faire planter la requête. Au-delà du
    //  budget, on accepte le résultat actuel même imparfait.
    let autoRetryCount = 0;
    let fidelityScore: number | null = null;
    let fidelityIssues: string[] = [];
    const TIME_BUDGET_MS    = 250_000;
    const MIN_MARGIN_MS     = 60_000;
    const MAX_AUTO_RETRIES  = 2;

    while (autoRetryCount < MAX_AUTO_RETRIES) {
      const elapsed = Date.now() - tStart;
      if (elapsed > TIME_BUDGET_MS - MIN_MARGIN_MS) {
        console.log(`[API /ia/rendu] budget temps écoulé (${elapsed}ms), skip auto-validation`);
        break;
      }
      const firstUrl = result.imageUrls[0];
      if (!firstUrl) break;

      const report = await assessRenduFidelity(referenceHttpsUrl, firstUrl);
      if (!report.ok) {
        console.log(`[API /ia/rendu] vision-critic indisponible, garde résultat tel quel`);
        break;
      }
      fidelityScore  = report.fidelity;
      fidelityIssues = report.issues;
      console.log(`[API /ia/rendu] fidelity=${report.fidelity.toFixed(2)} issues=${report.issues.length} (try ${autoRetryCount + 1})`);

      if (!report.shouldRetry) break; // fidelity >= 0.7, on garde

      // Retry avec seed différente. On force une nouvelle seed via Date.now()
      // injectée dans params.extraContext qui modifie le hash du seed builder.
      autoRetryCount++;
      const retrySeedHint = `retry-${autoRetryCount}-${Date.now() % 100000}`;
      const retryParams: RenduParams = {
        ...params,
        extraContext: params.extraContext ? `${params.extraContext} ${retrySeedHint}` : retrySeedHint,
      };
      const retryResult = pipelineUsed === 'controlnet-canny'
        ? await generateRenduFromReferenceControlNet(retryParams, referenceHttpsUrl, numImages)
        : await generateRenduFromReferenceKontext(retryParams, referenceHttpsUrl, numImages);
      if (retryResult.success) {
        result = retryResult;
      } else {
        // Retry échoué, on garde le résultat précédent
        console.warn(`[API /ia/rendu] auto-retry ${autoRetryCount} ÉCHEC: ${retryResult.error}`);
        break;
      }
    }

    // ── 7ter) Phase 2 — refinement SAM "Précision maximale" (optionnel).
    //  N'est appliqué QUE si l'utilisateur a coché le toggle UI ET qu'il
    //  reste du budget temps (le pipeline SAM+Inpaint prend +20-40s).
    //  Échec gracieux : si SAM rate, on garde l'image résultat actuelle.
    let samSteps: Array<{ region: string; maskFound: boolean; inpaintOk: boolean; durationMs: number }> = [];
    let samApplied = false;
    if (maxPrecision) {
      const elapsed = Date.now() - tStart;
      if (elapsed < TIME_BUDGET_MS - MIN_MARGIN_MS) {
        try {
          const firstUrl = result.imageUrls[0];
          if (firstUrl) {
            const refined = await refineRenduMaterialsSAM(firstUrl, params);
            samSteps = refined.steps;
            samApplied = refined.steps.some(s => s.inpaintOk);
            if (samApplied) {
              // Remplace la 1re URL par l'image affinée. Les autres variantes
              // restent inchangées (SAM séquentiel coûteux, on l'applique
              // qu'au choix principal de l'utilisateur).
              result = { ...result, imageUrls: [refined.imageUrl, ...result.imageUrls.slice(1)], imageUrl: refined.imageUrl };
            }
          }
        } catch (samErr) {
          console.warn(`[API /ia/rendu] SAM refinement ÉCHEC: ${samErr instanceof Error ? samErr.message : samErr}`);
        }
      } else {
        console.log(`[API /ia/rendu] budget temps insuffisant pour SAM (${elapsed}ms)`);
      }
    }

    // ── 7quater) Copie fal-cdn → Supabase
    const copied = await Promise.all(
      result.imageUrls.map((falUrl, idx) =>
        copyExternalImageToIaRenders(falUrl, buildIaRenderPath(workspaceId, job.id, idx))
          .then(({ path, signedUrl }) => ({ path, signedUrl, falUrl })),
      ),
    );

    // ── 8) UPDATE DONE
    //  - costEUR : ~$0.06/image pour Kontext, ~$0.09/image pour ControlNet Canny
    //    (Canny extract ~$0.01 + Flux ControlNet ~$0.08).
    //  - modelsUsed reflète le pipeline réellement utilisé (pas la liste prévue).
    const costEUR = (pipelineUsed === 'controlnet-canny' ? 0.09 : 0.06) * result.imageUrls.length;
    const finalModelsUsed = pipelineUsed === 'controlnet-canny'
      ? ['fal-ai/flux-control-lora-canny/image-to-image']
      : ['fal-ai/flux-pro/kontext'];
    await prisma.iaJob.update({
      where: { id: job.id },
      data:  {
        status:          'DONE',
        prompt:          result.prompt.prompt,
        modelsUsed:      finalModelsUsed,
        resultImageUrls: {
          paths:      copied.map(c => c.path),
          signedUrls: copied.map(c => c.signedUrl),
          falRaw:     copied.map(c => c.falUrl),
          // Phase 5 — tracking complet pour analyse fidélité et amélioration continue.
          meta: {
            pipelineUsed,
            autoRetryCount,
            fidelityScore,         // null si vision-critic indisponible
            fidelityIssues,        // liste des dérives détectées
            samApplied,            // true si refinement SAM matériaux appliqué
            samSteps,              // détail SAM par région (façade/plan/sol)
            maxPrecisionRequested: maxPrecision,
            userRetryCount,        // combien de fois l'user a cliqué "Régénérer"
          },
        },
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
      rateLimit:  { remaining: rateResult.remaining, resetAt: rateResult.resetAt },
    });
    })()]);

  } catch (err) {
    console.error('[API /ia/rendu] exception:', err);
    const message = err instanceof Error ? err.message : 'Erreur serveur interne';
    const status = message.includes('Délai serveur dépassé') ? 504 : 500;
    return fail(status, message, Date.now() - tStart);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}
