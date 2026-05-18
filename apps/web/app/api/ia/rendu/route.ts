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
import { generateRenduImage, ensureHttpsUrl } from '@/lib/server/flux-api';
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
  };
  // Image de référence optionnelle (plan WinnerFlex, inspiration, sketch).
  // data URI ou https — sera uploadée vers fal-cdn si data URI.
  const referenceImageDataUrl =
    typeof body.referenceImageDataUrl === 'string' && body.referenceImageDataUrl.length > 0
      ? body.referenceImageDataUrl
      : null;
  const numImages = Math.min(Math.max(parseInt(String(body.numImages), 10) || 1, 1), 4);
  const projectId = typeof body.projectId === 'string' && body.projectId.length > 0 ? body.projectId : null;

  // ── 4) INSERT IaJob (QUEUED) — protégé pour ne jamais laisser une erreur
  //       Prisma escape en uncaught (cf. coloriste pour le même pattern).
  let job;
  try {
    job = await prisma.iaJob.create({
      data: {
        workspaceId,
        createdById: userId,
        projectId,
        type:        'PHOTOREALISM_ENHANCE',
        status:      'QUEUED',
        modelsUsed:  ['fal-ai/flux-pro/v1.1-ultra'],
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

    // ── 6) Si image de référence fournie, on l'upload vers fal-cdn d'abord
    //       puis on passe l'URL https à generateRenduImage pour image_prompt.
    let referenceHttpsUrl: string | null = null;
    if (referenceImageDataUrl) {
      try {
        referenceHttpsUrl = await ensureHttpsUrl(referenceImageDataUrl);
        await prisma.iaJob.update({
          where: { id: job.id },
          data: { inputImageUrls: { reference: referenceHttpsUrl } },
        });
      } catch (uploadErr) {
        console.warn('[API /ia/rendu] upload reference image échec:',
          uploadErr instanceof Error ? uploadErr.message : uploadErr);
        // On continue sans référence — pure text2img.
        referenceHttpsUrl = null;
      }
    }

    // ── 7) Génération Flux Pro Ultra (text2img, avec ou sans image_prompt)
    const result = await generateRenduImage(params, numImages, referenceHttpsUrl);

    if (!result.success) {
      const err = (result.error ?? '').toLowerCase();
      const status = err.includes('timeout') || err.includes('aucun résultat') ? 504 : 500;
      return fail(status, result.error ?? 'Génération échouée', Date.now() - tStart);
    }

    // ── 7) Copie fal-cdn → Supabase
    const copied = await Promise.all(
      result.imageUrls.map((falUrl, idx) =>
        copyExternalImageToIaRenders(falUrl, buildIaRenderPath(workspaceId, job.id, idx))
          .then(({ path, signedUrl }) => ({ path, signedUrl, falUrl })),
      ),
    );

    // ── 8) UPDATE DONE
    const costEUR = 0.06 * result.imageUrls.length; // ~$0.06 / image Flux Ultra
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
