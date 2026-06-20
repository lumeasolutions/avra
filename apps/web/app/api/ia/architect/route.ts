/**
 * POST /api/ia/architect
 *
 * Module « IA Architect » de l'IA Studio — 3e moteur de rendu, basé sur l'API
 * MyArchitectAI (≠ fal.ai/Flux des modules Coloriste & Rendu).
 *
 * Flux :
 *   1. Auth (cookie JWT) + rate-limit par utilisateur
 *   2. Création d'un IaJob (QUEUED → PROCESSING → DONE/FAILED)
 *   3. Upload de l'image source vers Supabase → URL signée (fetchable par
 *      MyArchitectAI pendant sa fenêtre de 5 min)
 *   4. Appel MyArchitectAI (render/interior ou render/exterior, + upscale 4K)
 *   5. Copie du rendu MyArchitectAI → Supabase (URL signée 30 j)
 *
 * ⚙️  Une seule variable à poser pour activer le module : MYARCHITECT_API_KEY.
 *     Sans elle, le module tourne en mode démo (renvoie l'image source).
 *
 * NB type IaJob : on réutilise la valeur d'enum « EDIT » (inutilisée ailleurs)
 *     pour donner à IA Architect son propre historique SANS migration Prisma
 *     (les modules Coloriste = COLOR_VARIATION et Rendu = PHOTOREALISM_ENHANCE).
 *     Pour un libellé d'enum dédié (ex. ARCHITECT_RENDER), ajouter la valeur au
 *     schéma puis migrer — non requis pour le fonctionnement.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateArchitectRender,
  type ArchitectMode,
  type ArchitectParams,
} from '@/lib/server/myarchitect-api';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { getUserContextFromRequest } from '@/lib/server/auth-guard';
import { prisma } from '@/lib/server/prisma';
import {
  uploadToIaRenders,
  createIaRendersSignedUrl,
  copyExternalImageToIaRenders,
  buildIaRenderPath,
} from '@/lib/server/supabase-storage';

// MyArchitectAI rend en ~13 s ; le maxDuration large couvre upload + upscale.
export const maxDuration = 300;

// Limite : 10 générations par utilisateur par heure (cohérent avec /ia/rendu).
const IA_RATE_LIMIT = { limit: 10, windowMs: 60 * 60 * 1000 };

/** Convertit une data URL (data:image/...;base64,xxx) en Buffer + content-type. */
function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error('Image source invalide (data URL attendue).');
  return { contentType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

export async function POST(req: NextRequest) {
  // ── 1) Auth
  const userCtx = getUserContextFromRequest(req);
  if (!userCtx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { userId, workspaceId } = userCtx;

  // ── 2) Rate limit
  const rateResult = checkRateLimit(`ia-architect:user:${userId}`, IA_RATE_LIMIT);
  if (!rateResult.success) {
    return NextResponse.json(
      { error: 'Trop de générations cette heure. Réessayez plus tard.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(IA_RATE_LIMIT.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(rateResult.resetAt / 1000)),
          'Retry-After': String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  // ── 3) Parse + validation
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const referenceImageDataUrl =
    typeof body.referenceImageDataUrl === 'string' && body.referenceImageDataUrl.startsWith('data:')
      ? body.referenceImageDataUrl
      : null;
  if (!referenceImageDataUrl) {
    return NextResponse.json(
      { error: 'Image de référence requise. Importez un plan, un rendu 3D, un sketch ou une photo.' },
      { status: 400 },
    );
  }

  const mode: ArchitectMode = body.mode === 'exterior' ? 'exterior' : 'interior';
  const params: ArchitectParams = {
    mode,
    facades: typeof body.facades === 'string' ? body.facades : undefined,
    planTravail: typeof body.planTravail === 'string' ? body.planTravail : undefined,
    sol: typeof body.sol === 'string' ? body.sol : undefined,
    murs: typeof body.murs === 'string' ? body.murs : undefined,
    ambiance: typeof body.ambiance === 'string' ? body.ambiance : undefined,
    highRes: body.highRes === true,
  };
  const projectId =
    typeof body.projectId === 'string' && body.projectId.length > 0 ? body.projectId : null;

  // ── 4) INSERT IaJob (QUEUED) — protégé contre toute erreur Prisma
  let job;
  try {
    job = await prisma.iaJob.create({
      data: {
        workspaceId,
        createdById: userId,
        projectId,
        type: 'EDIT', // cf. en-tête : IA Architect (réutilisation d'enum, sans migration)
        status: 'QUEUED',
        modelsUsed: [`myarchitectai/${mode}`],
        params: {
          engine: 'myarchitectai',
          mode,
          facades: params.facades ?? null,
          planTravail: params.planTravail ?? null,
          sol: params.sol ?? null,
          murs: params.murs ?? null,
          ambiance: params.ambiance ?? null,
          highRes: params.highRes ?? false,
        },
      },
    });
  } catch (dbErr) {
    console.error('[API /ia/architect] prisma.iaJob.create échec:',
      dbErr instanceof Error ? dbErr.message : String(dbErr));
    return NextResponse.json(
      { error: 'Impossible d\'enregistrer la demande en base. Réessayez dans un instant.' },
      { status: 500 },
    );
  }

  const tStart = Date.now();

  const fail = async (status: number, message: string) => {
    try {
      await prisma.iaJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', errorMessage: message, durationMs: Date.now() - tStart, completedAt: new Date() },
      });
    } catch (dbErr) {
      console.warn(`[API /ia/architect] fail() couldn't update IaJob ${job.id}:`,
        dbErr instanceof Error ? dbErr.message : String(dbErr));
    }
    return NextResponse.json({ error: message, jobId: job.id }, { status });
  };

  try {
    // ── 5) PROCESSING
    await prisma.iaJob.update({ where: { id: job.id }, data: { status: 'PROCESSING' } });

    // ── 6) Upload de l'image source vers Supabase → URL signée publique
    //       MyArchitectAI télécharge l'image depuis cette URL (fenêtre 5 min).
    let sourceSignedUrl: string;
    try {
      const { buffer, contentType } = dataUrlToBuffer(referenceImageDataUrl);
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const sourcePath = `${workspaceId}/${job.id}/source.${ext}`;
      await uploadToIaRenders(sourcePath, buffer, contentType);
      sourceSignedUrl = await createIaRendersSignedUrl(sourcePath);
      await prisma.iaJob.update({
        where: { id: job.id },
        data: { inputImageUrls: { source: sourceSignedUrl } },
      });
    } catch (uploadErr) {
      console.warn('[API /ia/architect] upload source échec:',
        uploadErr instanceof Error ? uploadErr.message : uploadErr);
      return fail(502, 'Impossible de préparer l\'image source. Réessayez dans un instant.');
    }

    // ── 7) Génération MyArchitectAI (+ upscale optionnel)
    const result = await generateArchitectRender(params, sourceSignedUrl);
    if (!result.success || result.imageUrls.length === 0) {
      const err = (result.error ?? '').toLowerCase();
      const status = err.includes('délai') || err.includes('aucune image') ? 504 : 502;
      return fail(status, result.error ?? 'Génération du rendu échouée.');
    }

    // ── 8) Copie du/des rendu(s) → Supabase (URL signée 30 j)
    //       En mode mock, result.imageUrls[0] = l'URL source Supabase (déjà
    //       hébergée) ; copyExternalImageToIaRenders la recopie proprement.
    const copied = await Promise.all(
      result.imageUrls.map((url, idx) =>
        copyExternalImageToIaRenders(url, buildIaRenderPath(workspaceId, job.id, idx))
          .then(({ path, signedUrl }) => ({ path, signedUrl })),
      ),
    );

    // ── 9) DONE — coût indicatif : 0,03 $/rendu (+0,02 $ si upscale 4K)
    const costUSD =
      (result.endpoint === 'mock' ? 0 : 0.03 * result.imageUrls.length) +
      (result.upscaled ? 0.02 : 0);
    await prisma.iaJob.update({
      where: { id: job.id },
      data: {
        status: 'DONE',
        prompt: result.prompt,
        resultImageUrls: {
          paths: copied.map(c => c.path),
          signedUrls: copied.map(c => c.signedUrl),
          meta: {
            engine: 'myarchitectai',
            endpoint: result.endpoint,
            upscaled: result.upscaled,
            mode,
          },
        },
        durationMs: Date.now() - tStart,
        costEUR: costUSD, // champ historique nommé EUR ; on y stocke l'estimation USD
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      jobId: job.id,
      imageUrl: copied[0]?.signedUrl ?? null,
      imageUrls: copied.map(c => c.signedUrl),
      engine: result.endpoint,
      upscaled: result.upscaled,
      durationMs: Date.now() - tStart,
      rateLimit: { remaining: rateResult.remaining, resetAt: rateResult.resetAt },
    });
  } catch (err) {
    console.error('[API /ia/architect] exception:', err);
    const message = err instanceof Error ? err.message : 'Erreur serveur interne';
    return fail(500, message);
  }
}
