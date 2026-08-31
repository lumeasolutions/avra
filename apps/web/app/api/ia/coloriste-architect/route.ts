/**
 * POST /api/ia/coloriste-architect
 *
 * Coloriste via MyArchitectAI (≠ /api/ia/coloriste qui tourne sur Flux/fal.ai).
 * Même principe que le Coloriste classique : photo de cuisine + couleurs
 * (façades / poignées / plan de travail) + finitions + éclairage. Le prompt est
 * construit avec le MÊME builder que le Coloriste Flux (buildColoristPrompt),
 * puis envoyé à MyArchitectAI render/interior.
 *
 * ⚙️  Activation : MYARCHITECT_API_KEY (Vercel). Sans clé → mode démo.
 * NB : MyArchitectAI re-rend l'intérieur guidé par le prompt couleur (l'« Edit
 *      by prompt » par surface n'est pas encore exposé en API) — moins
 *      chirurgical que le Coloriste Flux+SAM, mais sans détourage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildColoristPrompt, type ColoristParams } from '@/lib/server/prompt-builder';
import { generateColoristeRender } from '@/lib/server/myarchitect-api';
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

const IA_RATE_LIMIT = { limit: 150, windowMs: 60 * 60 * 1000 }; // 150/h par showroom (avant 10/h)

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
  const rateResult = checkRateLimit(`ia-coloriste-architect:user:${userId}`, IA_RATE_LIMIT);
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

  // Prompt coloriste pour MyArchitectAI (render/interior re-rend la pièce).
  // ORDRE VOLONTAIRE : on met l'ORDRE DE RECOLORISATION EN PREMIER (les modèles
  // de diffusion pondèrent davantage le début du prompt) pour que le changement
  // de couleur soit réellement appliqué, PUIS la description des couleurs, PUIS
  // une préservation LÉGÈRE (layout/cadrage) — sans « identique » qui étoufferait
  // le changement de couleur.
  const RECOLOR_DIRECTIVE =
    'Repaint and recolor this existing kitchen. Strongly change the colors: apply the new '
    + 'colors and finishes to the cabinet fronts, the handles and the countertop. The new '
    + 'colors must be clearly and fully applied (no leftover original colors). ';
  const PRESERVE =
    ' Change ONLY the colors and materials: keep the exact same shapes, geometry, sizes and positions '
    + 'of every cabinet, drawer and panel, the same room layout and the same camera angle. '
    + 'Keep the existing lighting of the room: DO NOT add any spotlights, recessed ceiling lights, '
    + 'LED strips, lamps or new light fixtures. DO NOT add or remove furniture, appliances, decor or any '
    + 'object. No warped or deformed shapes, no text. Photorealistic, sharp focus, high detail.';
  const prompt = `${RECOLOR_DIRECTIVE}${buildColoristPrompt(params).prompt}${PRESERVE}`;
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
        modelsUsed: ['myarchitectai/render-interior'],
        params: {
          engine: 'myarchitectai',
          facadeHex: params.facadeHex,
          poigneeHex: params.poigneeHex,
          planHex: params.planHex,
          facadeFinish: params.facadeFinish,
          lightingStyle: params.lightingStyle,
        },
      },
    });
  } catch (dbErr) {
    console.error('[API /ia/coloriste-architect] prisma.iaJob.create échec:',
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
      console.warn('[API /ia/coloriste-architect] upload source échec:',
        uploadErr instanceof Error ? uploadErr.message : uploadErr);
      return fail(502, 'Impossible de préparer la photo source. Réessayez dans un instant.');
    }

    // ── 6) Colorisation MyArchitectAI
    const result = await generateColoristeRender(prompt, sourceSignedUrl);
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
          meta: { engine: 'myarchitectai', endpoint: result.endpoint },
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
    console.error('[API /ia/coloriste-architect] exception:', err);
    return fail(500, err instanceof Error ? err.message : 'Erreur serveur interne');
  }
}
