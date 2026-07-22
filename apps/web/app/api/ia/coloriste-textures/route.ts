/**
 * POST /api/ia/coloriste-textures
 *
 * Coloriste « chirurgical » via MyArchitectAI /change-textures : applique une
 * MATIÈRE importée (mode référence) OU des COULEURS choisies (mode prompt) sur
 * la zone SÉLECTIONNÉE AU CLIC (masque SAM2), en préservant la géométrie.
 *
 * Sélection unique = clic (SAM2, /api/ia/segment-point). Le front nous transmet
 * l'URL du masque (blanc = zone à changer) + l'URL de la source (même image →
 * alignement garanti). On recopie le masque sur Supabase pour une URL stable.
 *
 * ⚙️  Activation : MYARCHITECT_API_KEY (Vercel). Sans clé → mode démo (renvoie
 *     l'image source).
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildTextureEditPrompt, type ColoristParams } from '@/lib/server/prompt-builder';
import { generateColoristeTextures } from '@/lib/server/myarchitect-api';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { getUserContextFromRequest } from '@/lib/server/auth-guard';
import { prisma } from '@/lib/server/prisma';
import {
  uploadToIaRenders,
  createIaRendersSignedUrl,
  copyExternalImageToIaRenders,
  buildIaRenderPath,
} from '@/lib/server/supabase-storage';

export const maxDuration = 300;

const IA_RATE_LIMIT = { limit: 10, windowMs: 60 * 60 * 1000 };

/** data:image/...;base64,xxx → Buffer + content-type. */
function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error('Image source invalide (data URL attendue).');
  return { contentType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

export async function POST(req: NextRequest) {
  // ── 1) Auth
  const userCtx = getUserContextFromRequest(req);
  if (!userCtx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, workspaceId } = userCtx;

  // ── 2) Rate limit
  const rateResult = checkRateLimit(`ia-coloriste-textures:user:${userId}`, IA_RATE_LIMIT);
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

  const { facadeHex, poigneeHex, planHex, facadeFinish, lightingStyle } = body as Record<string, unknown>;
  if (!facadeHex || !poigneeHex || !planHex || !facadeFinish || !lightingStyle) {
    return NextResponse.json(
      { error: 'Paramètres manquants : facadeHex, poigneeHex, planHex, facadeFinish, lightingStyle requis' },
      { status: 400 },
    );
  }

  // Source : URL déjà uploadée (sélection au clic) OU data URL directe (fallback).
  const sourceImageDataUrl =
    typeof body.sourceImageDataUrl === 'string' && body.sourceImageDataUrl.startsWith('data:')
      ? body.sourceImageDataUrl
      : null;
  const providedSourceUrl =
    typeof body.sourceUrl === 'string' && (body.sourceUrl as string).startsWith('http')
      ? (body.sourceUrl as string)
      : null;
  if (!sourceImageDataUrl && !providedSourceUrl) {
    return NextResponse.json(
      { error: 'Photo de la cuisine requise (importez une image).' },
      { status: 400 },
    );
  }

  // Échantillon de matière importé (optionnel). Présent → mode RÉFÉRENCE (la
  // matière réelle est reproduite). Absent → mode COULEURS (prompt).
  const referenceImageDataUrl =
    typeof body.referenceImageDataUrl === 'string' && body.referenceImageDataUrl.startsWith('data:')
      ? body.referenceImageDataUrl
      : null;

  // Masque de la zone à changer (sélection au clic SAM2, blanc = zone à changer).
  const providedMaskUrl =
    typeof body.maskUrl === 'string' && (body.maskUrl as string).startsWith('http')
      ? (body.maskUrl as string)
      : null;

  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const params: ColoristParams = {
    facadeHex: String(facadeHex),
    poigneeHex: String(poigneeHex),
    planHex: String(planHex),
    facadeFinish: facadeFinish as ColoristParams['facadeFinish'],
    poigneeFinish: str(body.poigneeFinish) as ColoristParams['poigneeFinish'],
    planFinish: str(body.planFinish) as ColoristParams['planFinish'],
    lightingStyle: lightingStyle as ColoristParams['lightingStyle'],
    handleMaterial: str(body.handleMaterial),
    countertopMaterial: str(body.countertopMaterial),
  };

  // Prompt. /change-textures est mutuellement exclusif (référence OU prompt) :
  //  - Référence + masque → matière réelle, AUCUNE couleur décrite (sinon la
  //    couleur écraserait la texture). Le prompt est de toute façon ignoré côté
  //    wrapper quand une référence est fournie ; on le garde pour la traçabilité.
  //  - Couleurs + masque → couleurs limitées à la zone.
  const prompt = referenceImageDataUrl
    ? 'Replace the material of the masked region with the exact material, colour, pattern and finish '
      + 'shown in the attached reference image; reproduce it faithfully. Keep everything outside the '
      + 'mask unchanged. Photorealistic, sharp, high detail.'
    : `${buildTextureEditPrompt(params)} Only change the area inside the provided mask; keep everything outside the mask exactly unchanged.`;

  const projectId =
    typeof body.projectId === 'string' && body.projectId.length > 0 ? body.projectId : null;

  // ── 4) IaJob (QUEUED)
  let job;
  try {
    job = await prisma.iaJob.create({
      data: {
        workspaceId,
        createdById: userId,
        projectId,
        type: 'COLOR_VARIATION',
        status: 'QUEUED',
        modelsUsed: ['myarchitectai/change-textures'],
        params: {
          engine: 'myarchitectai-textures',
          mode: referenceImageDataUrl ? 'reference' : 'colors',
          facadeHex: params.facadeHex,
          poigneeHex: params.poigneeHex,
          planHex: params.planHex,
          facadeFinish: params.facadeFinish,
          lightingStyle: params.lightingStyle,
        },
      },
    });
  } catch (dbErr) {
    console.error('[API /ia/coloriste-textures] prisma.iaJob.create échec:',
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
    } catch { /* best-effort */ }
    return NextResponse.json({ error: message, jobId: job.id }, { status });
  };

  try {
    await prisma.iaJob.update({ where: { id: job.id }, data: { status: 'PROCESSING' } });

    // ── 5) Photo source → URL fetchable par MyArchitectAI
    // Sélection au clic : on RÉUTILISE l'URL déjà uploadée (même image que le
    // masque SAM2 → alignement pixel garanti). Sinon on upload le data URL.
    let sourceSignedUrl: string;
    if (providedSourceUrl) {
      sourceSignedUrl = providedSourceUrl;
      try {
        await prisma.iaJob.update({
          where: { id: job.id },
          data: { inputImageUrls: { source: sourceSignedUrl } },
        });
      } catch { /* best-effort */ }
    } else if (sourceImageDataUrl) {
      try {
        const { buffer, contentType } = dataUrlToBuffer(sourceImageDataUrl);
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
        const sourcePath = `${workspaceId}/${job.id}/source.${ext}`;
        await uploadToIaRenders(sourcePath, buffer, contentType);
        sourceSignedUrl = await createIaRendersSignedUrl(sourcePath);
        await prisma.iaJob.update({
          where: { id: job.id },
          data: { inputImageUrls: { source: sourceSignedUrl } },
        });
      } catch (uploadErr) {
        console.warn('[API /ia/coloriste-textures] upload source échec:',
          uploadErr instanceof Error ? uploadErr.message : uploadErr);
        return fail(502, 'Impossible de préparer la photo source. Réessayez dans un instant.');
      }
    } else {
      return fail(400, 'Photo source manquante.');
    }

    // ── 5b) Échantillon de matière (optionnel) → URL signée
    let referenceSignedUrl: string | undefined;
    if (referenceImageDataUrl) {
      try {
        const { buffer, contentType } = dataUrlToBuffer(referenceImageDataUrl);
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
        const refPath = `${workspaceId}/${job.id}/reference.${ext}`;
        await uploadToIaRenders(refPath, buffer, contentType);
        referenceSignedUrl = await createIaRendersSignedUrl(refPath);
      } catch (refErr) {
        console.warn('[API /ia/coloriste-textures] upload référence échec:',
          refErr instanceof Error ? refErr.message : refErr);
      }
    }

    // ── 5c) Masque SAM2 → recopié sur Supabase (URL stable même origine que la source)
    let maskSignedUrl: string | undefined;
    if (providedMaskUrl) {
      try {
        const { signedUrl } = await copyExternalImageToIaRenders(
          providedMaskUrl,
          `${workspaceId}/${job.id}/mask.png`,
        );
        maskSignedUrl = signedUrl;
      } catch (maskErr) {
        // Repli : à défaut de copie, on tente l'URL d'origine directement.
        console.warn('[API /ia/coloriste-textures] copie masque échec, URL directe:',
          maskErr instanceof Error ? maskErr.message : maskErr);
        maskSignedUrl = providedMaskUrl;
      }
    }

    // ── 6) Colorisation MyArchitectAI /change-textures
    const result = await generateColoristeTextures(prompt, sourceSignedUrl, referenceSignedUrl, maskSignedUrl);
    if (!result.success || result.imageUrls.length === 0) {
      const err = (result.error ?? '').toLowerCase();
      const status = err.includes('délai') || err.includes('aucune image') ? 504 : 502;
      return fail(status, result.error ?? 'Colorisation échouée.');
    }

    // ── 7) Copie du résultat → Supabase
    const copied = await Promise.all(
      result.imageUrls.map((url, idx) =>
        copyExternalImageToIaRenders(url, buildIaRenderPath(workspaceId, job.id, idx))
          .then(({ path, signedUrl }) => ({ path, signedUrl })),
      ),
    );

    // ── 8) DONE
    const costUSD = result.endpoint === 'mock' ? 0 : 0.03 * result.imageUrls.length;
    await prisma.iaJob.update({
      where: { id: job.id },
      data: {
        status: 'DONE',
        prompt: result.prompt,
        resultImageUrls: {
          paths: copied.map(c => c.path),
          signedUrls: copied.map(c => c.signedUrl),
          meta: { engine: 'myarchitectai-textures', endpoint: result.endpoint },
        },
        durationMs: Date.now() - tStart,
        costEUR: costUSD,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      jobId: job.id,
      imageUrl: copied[0]?.signedUrl ?? null,
      imageUrls: copied.map(c => c.signedUrl),
      engine: result.endpoint,
      durationMs: Date.now() - tStart,
      rateLimit: { remaining: rateResult.remaining, resetAt: rateResult.resetAt },
    });
  } catch (err) {
    console.error('[API /ia/coloriste-textures] exception:', err);
    return fail(500, err instanceof Error ? err.message : 'Erreur serveur interne');
  }
}
