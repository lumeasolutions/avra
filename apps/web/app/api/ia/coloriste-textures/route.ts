/**
 * POST /api/ia/coloriste-textures
 *
 * Coloriste « chirurgical » via MyArchitectAI /change-textures (≠ /coloriste
 * qui tourne sur Flux/fal.ai, et ≠ /coloriste-architect qui utilise
 * render/interior). L'endpoint /change-textures change les couleurs / matières
 * (façades / poignées / plan de travail) EN PRÉSERVANT la géométrie et le layout
 * d'origine — c'est le vrai comportement « coloriste » qui manquait.
 *
 * Module de TEST isolé : s'il échoue, le Coloriste fal.ai reste intact.
 *
 * ⚙️  Activation : MYARCHITECT_API_KEY (Vercel). Sans clé → mode démo (renvoie
 *     l'image source).
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildTextureEditPrompt, type ColoristParams } from '@/lib/server/prompt-builder';
import { generateColoristeTextures } from '@/lib/server/myarchitect-api';
import { segmentSurfaceMask } from '@/lib/server/flux-api';
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

  const sourceImageDataUrl =
    typeof body.sourceImageDataUrl === 'string' && body.sourceImageDataUrl.startsWith('data:')
      ? body.sourceImageDataUrl
      : null;
  if (!sourceImageDataUrl) {
    return NextResponse.json(
      { error: 'Photo de la cuisine requise (importez une image).' },
      { status: 400 },
    );
  }

  // Échantillon de matière importé (optionnel) : /change-textures appliquera
  // CETTE matière réelle au lieu (ou en plus) d'une couleur décrite.
  const referenceImageDataUrl =
    typeof body.referenceImageDataUrl === 'string' && body.referenceImageDataUrl.startsWith('data:')
      ? body.referenceImageDataUrl
      : null;

  // Masque (optionnel mais REQUIS par /change-textures) : image noir/blanc de la
  // zone à retexturer, peinte par l'utilisateur. Sans masque → repli edit-by-prompt.
  const maskDataUrl =
    typeof body.maskDataUrl === 'string' && body.maskDataUrl.startsWith('data:')
      ? body.maskDataUrl
      : null;

  // Mode de sélection de la zone :
  //  - 'auto'  → EVF-SAM détecte la surface choisie (referenceTarget) côté serveur.
  //  - 'brush' → l'utilisateur a fourni un masque (pinceau ou lasso) via maskDataUrl.
  // On considère qu'on AURA un masque si auto est demandé OU si un masque manuel est fourni.
  const autoMask = body.maskMode === 'auto';
  const willHaveMask = autoMask || !!maskDataUrl;

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

  // Prompt IMPÉRATIF verbe-en-tête, surface par surface, conforme au guide
  // officiel MyArchitectAI « Editing best practices » (« Replace the [surface]
  // material with … keep everything else unchanged »). /change-textures préserve
  // déjà la géométrie : pas besoin des lourdes contraintes anti-déformation.
  // Surface cible de la texture importée (le prompt dit au moteur OÙ l'appliquer).
  const REF_TARGET_PHRASES: Record<string, string> = {
    facades: 'the kitchen cabinet fronts (doors and drawer fronts)',
    plan: 'the countertop / worktop surface',
    poignees: 'the cabinet door handles and knobs',
    sol: 'the floor',
    credence: 'the backsplash',
  };
  const refTarget = str(body.referenceTarget) ?? 'facades';
  const refPhrase = REF_TARGET_PHRASES[refTarget] ?? REF_TARGET_PHRASES.facades;
  // Construction du prompt. RÈGLE CLÉ : si une TEXTURE est importée + une zone
  // peinte, c'est la MATIÈRE DE RÉFÉRENCE qui gagne — on ne décrit AUCUNE couleur
  // (sinon la couleur écraserait la texture, cf. bug « ça met le vert, pas le cuir »).
  let prompt: string;
  if (referenceImageDataUrl && willHaveMask) {
    prompt =
      'Replace the material of the masked region with the exact material, colour, pattern and finish '
      + 'shown in the attached reference image; reproduce the reference material faithfully. '
      + 'Keep everything outside the mask exactly unchanged. Photorealistic, sharp, high detail.';
  } else if (willHaveMask) {
    // Zone peinte sans texture → couleurs choisies, limitées à la zone peinte.
    prompt = `${buildTextureEditPrompt(params)} Only change the area inside the provided mask; keep everything outside the mask exactly unchanged.`;
  } else if (referenceImageDataUrl) {
    // Texture SANS zone peinte : change-textures exige un masque → on retombera sur
    // edit-by-prompt (qui ne sait pas lire la texture) et on applique les couleurs.
    prompt = `${buildTextureEditPrompt(params)} Apply the exact material shown in the attached reference image to ${refPhrase}; keep all other surfaces as described above.`;
  } else {
    prompt = buildTextureEditPrompt(params);
  }
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

    // ── 5) Upload de la photo source → Supabase (URL signée fetchable par MyArchitectAI)
    let sourceSignedUrl: string;
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

    // ── 5b) Upload de l'échantillon de matière (optionnel) → URL signée
    let referenceSignedUrl: string | undefined;
    if (referenceImageDataUrl) {
      try {
        const { buffer, contentType } = dataUrlToBuffer(referenceImageDataUrl);
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
        const refPath = `${workspaceId}/${job.id}/reference.${ext}`;
        await uploadToIaRenders(refPath, buffer, contentType);
        referenceSignedUrl = await createIaRendersSignedUrl(refPath);
      } catch (refErr) {
        // Non bloquant : si l'échantillon échoue, on colorise quand même par prompt.
        console.warn('[API /ia/coloriste-textures] upload référence échec:',
          refErr instanceof Error ? refErr.message : refErr);
      }
    }

    // ── 5c) Masque (zone à retexturer) → URL signée / URL fal
    let maskSignedUrl: string | undefined;
    if (autoMask) {
      // Mode AUTO : EVF-SAM détecte la surface choisie sur la photo source.
      // Renvoie une URL de masque (fal CDN, blanc = surface) directement
      // fetchable par MyArchitectAI. Si SAM échoue → pas de masque (repli).
      try {
        const samMaskUrl = await segmentSurfaceMask(sourceSignedUrl, refTarget);
        if (samMaskUrl) {
          maskSignedUrl = samMaskUrl;
        } else {
          console.warn('[API /ia/coloriste-textures] SAM: aucune surface détectée pour', refTarget);
        }
      } catch (samErr) {
        console.warn('[API /ia/coloriste-textures] SAM échec:',
          samErr instanceof Error ? samErr.message : samErr);
      }
    } else if (maskDataUrl) {
      // Mode MANUEL (pinceau / lasso) : masque peint par l'utilisateur.
      try {
        const { buffer, contentType } = dataUrlToBuffer(maskDataUrl);
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
        const maskPath = `${workspaceId}/${job.id}/mask.${ext}`;
        await uploadToIaRenders(maskPath, buffer, contentType);
        maskSignedUrl = await createIaRendersSignedUrl(maskPath);
      } catch (maskErr) {
        // Non bloquant : sans masque, le moteur retombe sur edit-by-prompt.
        console.warn('[API /ia/coloriste-textures] upload masque échec:',
          maskErr instanceof Error ? maskErr.message : maskErr);
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
