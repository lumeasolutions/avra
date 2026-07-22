/**
 * POST /api/ia/coloriste-test
 *
 * « Coloriste test » — 5e module IA Studio, ISOLÉ des autres (Coloriste
 * fal.ai, Rendu, IA Architect, Coloriste ✨). Refonte demandée après retour
 * utilisateur sur le Coloriste ✨ actuel : détection imprécise + résultats
 * parfois déformés.
 *
 * Même principe que Coloriste ✨ (clic → SAM2 → MyArchitectAI /change-textures)
 * MAIS avec deux garde-fous ajoutés ici (voir coloriste-test-compositor.ts) :
 *
 *   1. Le masque SAM2 brut (transmis par le front, sélection au clic, via la
 *      route EXISTANTE /api/ia/segment-point — réutilisée en LECTURE SEULE,
 *      non modifiée) est RAFFINÉ (dilaté puis adouci) avant d'être envoyé au
 *      moteur — corrige les bords non couverts / trop durs.
 *   2. Le résultat n'est JAMAIS renvoyé tel quel : on le RECOMPOSE nous-mêmes
 *      avec l'image source (original hors-masque, généré dans le masque
 *      affiné) → garantie mathématique que rien ne bouge hors de la zone
 *      choisie, quel que soit le comportement du moteur distant.
 *   3. Pas de repli silencieux vers /edit-by-prompt (sans masque) : si le
 *      masque est absent ou si /change-textures échoue, on ÉCHOUE
 *      explicitement avec un message clair plutôt que de renvoyer un résultat
 *      non maîtrisé en silence.
 *
 * ⚙️  Réutilise MYARCHITECT_API_KEY (même clé que Coloriste ✨ / IA Architect).
 *     Sans clé → mode démo (renvoie l'image source, aucun appel externe).
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildTextureEditPrompt, type ColoristParams } from '@/lib/server/prompt-builder';
import { changeTextures, isArchitectEnabled } from '@/lib/server/myarchitect-api';
import {
  fetchImageBuffer,
  refineSelectionMask,
  compositeMaskedResult,
} from '@/lib/server/coloriste-test-compositor';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { getUserContextFromRequest } from '@/lib/server/auth-guard';
import { prisma } from '@/lib/server/prisma';
import {
  uploadToIaRenders,
  createIaRendersSignedUrl,
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

  // ── 2) Rate limit (compteur dédié — indépendant de Coloriste ✨)
  const rateResult = checkRateLimit(`ia-coloriste-test:user:${userId}`, IA_RATE_LIMIT);
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
      { error: 'Photo requise (importez une image).' },
      { status: 400 },
    );
  }

  const referenceImageDataUrl =
    typeof body.referenceImageDataUrl === 'string' && body.referenceImageDataUrl.startsWith('data:')
      ? body.referenceImageDataUrl
      : null;

  // Masque OBLIGATOIRE ici (pas de repli sans masque, contrairement à
  // generateColoristeTextures côté Coloriste ✨) : sans sélection, on refuse
  // plutôt que de risquer un edit non maîtrisé sur toute l'image.
  const providedMaskUrl =
    typeof body.maskUrl === 'string' && (body.maskUrl as string).startsWith('http')
      ? (body.maskUrl as string)
      : null;
  if (!providedMaskUrl) {
    return NextResponse.json(
      { error: 'Sélectionnez d\'abord une surface (clic sur la photo) avant de générer.' },
      { status: 400 },
    );
  }

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

  const prompt = referenceImageDataUrl
    ? 'Replace the material of the masked region with the exact material, colour, pattern and finish '
      + 'shown in the attached reference image; reproduce it faithfully. Keep everything outside the '
      + 'mask unchanged. Photorealistic, sharp, high detail.'
    : `${buildTextureEditPrompt(params)} Only change the area inside the provided mask; keep everything outside the mask exactly unchanged.`;

  const projectId =
    typeof body.projectId === 'string' && body.projectId.length > 0 ? body.projectId : null;

  // ── 4) IaJob (QUEUED) — tag "coloriste-test" dans params pour distinguer
  //      des jobs Coloriste ✨ dans l'historique, sans migration Prisma
  //      (même enum COLOR_VARIATION, cf. pattern déjà utilisé par l'IA Architect).
  let job;
  try {
    job = await prisma.iaJob.create({
      data: {
        workspaceId,
        createdById: userId,
        projectId,
        type: 'COLOR_VARIATION',
        status: 'QUEUED',
        modelsUsed: ['myarchitectai/change-textures', 'coloriste-test-compositor'],
        params: {
          engine: 'coloriste-test',
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
    console.error('[API /ia/coloriste-test] prisma.iaJob.create échec:',
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

    // ── 5) Photo source → buffer (pour le compositing final) + URL signée (pour le moteur)
    let sourceBuffer: Buffer;
    let sourceSignedUrl: string;
    if (providedSourceUrl) {
      sourceSignedUrl = providedSourceUrl;
      try {
        sourceBuffer = await fetchImageBuffer(providedSourceUrl);
      } catch (dlErr) {
        console.warn('[API /ia/coloriste-test] téléchargement source échec:',
          dlErr instanceof Error ? dlErr.message : dlErr);
        return fail(502, 'Impossible de récupérer la photo source. Réessayez dans un instant.');
      }
      try {
        await prisma.iaJob.update({ where: { id: job.id }, data: { inputImageUrls: { source: sourceSignedUrl } } });
      } catch { /* best-effort */ }
    } else if (sourceImageDataUrl) {
      try {
        const { buffer, contentType } = dataUrlToBuffer(sourceImageDataUrl);
        sourceBuffer = buffer;
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
        const sourcePath = `${workspaceId}/${job.id}/source.${ext}`;
        await uploadToIaRenders(sourcePath, buffer, contentType);
        sourceSignedUrl = await createIaRendersSignedUrl(sourcePath);
        await prisma.iaJob.update({ where: { id: job.id }, data: { inputImageUrls: { source: sourceSignedUrl } } });
      } catch (uploadErr) {
        console.warn('[API /ia/coloriste-test] upload source échec:',
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
        console.warn('[API /ia/coloriste-test] upload référence échec:',
          refErr instanceof Error ? refErr.message : refErr);
      }
    }

    // ── 5c) Masque SAM2 brut → téléchargé + RAFFINÉ (dilate + feather) →
    //       re-uploadé sur Supabase pour une URL stable envoyée au moteur.
    let refinedMaskBuffer: Buffer;
    let maskSignedUrl: string;
    try {
      const rawMaskBuffer = await fetchImageBuffer(providedMaskUrl);
      refinedMaskBuffer = await refineSelectionMask(rawMaskBuffer);
      const maskPath = `${workspaceId}/${job.id}/mask-refined.png`;
      await uploadToIaRenders(maskPath, refinedMaskBuffer, 'image/png');
      maskSignedUrl = await createIaRendersSignedUrl(maskPath);
    } catch (maskErr) {
      console.warn('[API /ia/coloriste-test] affinage masque échec:',
        maskErr instanceof Error ? maskErr.message : maskErr);
      return fail(502, 'Impossible de traiter la sélection. Réessayez de cliquer sur la surface.');
    }

    // ── 6) Mode démo (pas de clé) → renvoie la source telle quelle, sans appel externe.
    if (!isArchitectEnabled()) {
      const demoPath = `${workspaceId}/${job.id}/0.jpg`;
      await uploadToIaRenders(demoPath, sourceBuffer, 'image/jpeg');
      const demoSignedUrl = await createIaRendersSignedUrl(demoPath);
      await prisma.iaJob.update({
        where: { id: job.id },
        data: {
          status: 'DONE',
          prompt: `${prompt} [MODE DÉMO — clé du moteur de rendu non configurée]`,
          resultImageUrls: { paths: [demoPath], signedUrls: [demoSignedUrl], meta: { engine: 'coloriste-test', endpoint: 'mock' } },
          durationMs: Date.now() - tStart,
          costEUR: 0,
          completedAt: new Date(),
        },
      });
      return NextResponse.json({
        jobId: job.id,
        imageUrl: demoSignedUrl,
        imageUrls: [demoSignedUrl],
        engine: 'mock',
        durationMs: Date.now() - tStart,
        rateLimit: { remaining: rateResult.remaining, resetAt: rateResult.resetAt },
      });
    }

    // ── 7) Génération MyArchitectAI /change-textures — appel DIRECT (pas
    //      generateColoristeTextures) : on veut un échec EXPLICITE, jamais de
    //      repli silencieux vers /edit-by-prompt (sans masque).
    const texPrompt = referenceSignedUrl
      ? 'Apply the material and texture from the reference image to the masked area; keep everything outside the mask unchanged.'
      : prompt;
    const genResult = await changeTextures(sourceSignedUrl, texPrompt, referenceSignedUrl, maskSignedUrl);
    if (!genResult.ok || genResult.outputs.length === 0) {
      const status = (genResult.error ?? '').toLowerCase().includes('délai') ? 504 : 502;
      return fail(status, genResult.error ?? 'Le moteur n\'a renvoyé aucun résultat.');
    }

    // ── 8) Compositing pixel-safe : hors-masque = pixels ORIGINAUX garantis,
    //      quel que soit le comportement du moteur sur le reste de l'image.
    let finalBuffer: Buffer;
    try {
      const generatedBuffer = await fetchImageBuffer(genResult.outputs[0]);
      finalBuffer = await compositeMaskedResult({
        originalBuffer: sourceBuffer,
        generatedBuffer,
        maskBuffer: refinedMaskBuffer,
      });
    } catch (compErr) {
      console.error('[API /ia/coloriste-test] compositing échec:',
        compErr instanceof Error ? compErr.message : compErr);
      return fail(500, 'La recomposition finale de l\'image a échoué. Réessayez.');
    }

    // ── 9) Upload résultat final → Supabase
    const finalPath = `${workspaceId}/${job.id}/0.jpg`;
    await uploadToIaRenders(finalPath, finalBuffer, 'image/jpeg');
    const finalSignedUrl = await createIaRendersSignedUrl(finalPath);

    // ── 10) DONE
    await prisma.iaJob.update({
      where: { id: job.id },
      data: {
        status: 'DONE',
        prompt: texPrompt,
        resultImageUrls: {
          paths: [finalPath],
          signedUrls: [finalSignedUrl],
          meta: { engine: 'coloriste-test', endpoint: 'change-textures+composite' },
        },
        durationMs: Date.now() - tStart,
        costEUR: 0.03,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      jobId: job.id,
      imageUrl: finalSignedUrl,
      imageUrls: [finalSignedUrl],
      engine: 'change-textures+composite',
      durationMs: Date.now() - tStart,
      rateLimit: { remaining: rateResult.remaining, resetAt: rateResult.resetAt },
    });
  } catch (err) {
    console.error('[API /ia/coloriste-test] exception:', err);
    return fail(500, err instanceof Error ? err.message : 'Erreur serveur interne');
  }
}
