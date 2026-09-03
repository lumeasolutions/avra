/**
 * POST /api/ia/render-realistic
 *
 * Passage « Rendre réaliste » : prend une image déjà colorisée (typiquement le
 * résultat du Coloriste ✨ /change-textures, qui pose la MATIÈRE mais « à plat »)
 * et la re-rend via MyArchitectAI render/interior pour ajouter le réalisme
 * (lumière, ombres de contact, reflets, perspective, intégration des surfaces)
 * SANS changer les matières/couleurs déjà présentes.
 *
 * change-textures = matière posée mais plate ; render/interior = réaliste mais
 * texte-seul. En enchaînant les deux (la matière est déjà VISIBLE dans l'image),
 * render/interior a de bien meilleures chances de la conserver tout en relightant.
 *
 * Entrée : `sourceUrl` (http, image résultat déjà sur Supabase — réutilisée
 * directement, pas de ré-upload) OU `sourceImageDataUrl` (data URL, fallback).
 *
 * ⚙️  Activation : MYARCHITECT_API_KEY (Vercel). Sans clé → mode démo.
 */

import { NextRequest, NextResponse } from 'next/server';
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

const IA_RATE_LIMIT = { limit: 150, windowMs: 60 * 60 * 1000 }; // 150/h par showroom

/** Prompt de re-rendu : PRÉSERVER matières/couleurs, ne recalculer que le réalisme. */
const REALISM_PROMPT =
  'Re-render this existing interior photo photorealistically. CRITICAL: keep every material, '
  + 'colour, texture and finish EXACTLY as they already appear in the image — do NOT change, '
  + 'repaint or swap any material or colour. Only improve realism: recompute natural lighting, '
  + 'soft and contact shadows, and reflections, and integrate the applied materials so they look '
  + 'physically part of the scene — respect panel edges, joints, thickness and the room perspective '
  + '(vanishing lines). Keep the exact same geometry, sizes, layout, camera angle and every object. '
  + 'DO NOT add or remove furniture, appliances, decor, lights or fixtures. No warped or deformed '
  + 'shapes, no text. Sharp focus, high detail.';

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
  const rateResult = checkRateLimit(`ia-render-realistic:user:${userId}`, IA_RATE_LIMIT);
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

  const providedSourceUrl =
    typeof body.sourceUrl === 'string' && (body.sourceUrl as string).startsWith('http')
      ? (body.sourceUrl as string)
      : null;
  const sourceImageDataUrl =
    typeof body.sourceImageDataUrl === 'string' && body.sourceImageDataUrl.startsWith('data:')
      ? body.sourceImageDataUrl
      : null;
  if (!providedSourceUrl && !sourceImageDataUrl) {
    return NextResponse.json(
      { error: 'Image à rendre réaliste requise (sourceUrl ou sourceImageDataUrl).' },
      { status: 400 },
    );
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
        type: 'EDIT',
        status: 'QUEUED',
        modelsUsed: ['myarchitectai/render-interior'],
        params: { engine: 'myarchitectai-render-realistic' },
      },
    });
  } catch (dbErr) {
    console.error('[API /ia/render-realistic] prisma.iaJob.create échec:',
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

    // ── 5) Source → URL fetchable par MyArchitectAI
    let sourceSignedUrl: string;
    if (providedSourceUrl) {
      // Résultat déjà sur Supabase (URL signée) → réutilisé directement.
      sourceSignedUrl = providedSourceUrl;
    } else {
      try {
        const { buffer, contentType } = dataUrlToBuffer(sourceImageDataUrl!);
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
        const sourcePath = `${workspaceId}/${job.id}/source.${ext}`;
        await uploadToIaRenders(sourcePath, buffer, contentType);
        sourceSignedUrl = await createIaRendersSignedUrl(sourcePath);
      } catch (uploadErr) {
        console.warn('[API /ia/render-realistic] upload source échec:',
          uploadErr instanceof Error ? uploadErr.message : uploadErr);
        return fail(502, 'Impossible de préparer l\'image source. Réessayez dans un instant.');
      }
    }
    try {
      await prisma.iaJob.update({
        where: { id: job.id },
        data: { inputImageUrls: { source: sourceSignedUrl } },
      });
    } catch { /* best-effort */ }

    // ── 6) Re-rendu réaliste MyArchitectAI render/interior
    const result = await generateColoristeRender(REALISM_PROMPT, sourceSignedUrl);
    if (!result.success || result.imageUrls.length === 0) {
      const err = (result.error ?? '').toLowerCase();
      const status = err.includes('délai') || err.includes('aucune image') ? 504 : 502;
      return fail(status, result.error ?? 'Re-rendu échoué.');
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
          meta: { engine: 'myarchitectai-render-realistic', endpoint: result.endpoint },
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
    console.error('[API /ia/render-realistic] exception:', err);
    return fail(500, err instanceof Error ? err.message : 'Erreur serveur interne');
  }
}
