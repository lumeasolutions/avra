/**
 * POST /api/ia/retouch
 *
 * Mode « Retouche photo » de l'IA Studio (IA Architect) — édition ciblée d'un
 * rendu ou d'une photo via l'endpoint /edit-by-prompt de MyArchitectAI.
 *
 * Contrairement au rendu complet (/api/ia/architect) qui régénère toute la scène,
 * la retouche applique UNE modification en gardant le reste identique (fidélité
 * max : niche, égouttoir, meubles non touchés préservés).
 *
 * Consigne d'édition :
 *   - Retouche GUIDÉE : { zone, material } → consigne déterministe (aucune IA).
 *   - Texte LIBRE     : { instruction }   → reformulée/traduite par gpt-4o-mini.
 *                       Si trop vague → 422 (l'UI repose une question).
 *
 * Même plomberie que /api/ia/architect : auth JWT, rate-limit, IaJob, upload
 * source Supabase → URL signée, copie du résultat → Supabase 30 j.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateRetouch } from '@/lib/server/myarchitect-api';
import { buildStructuredInstruction, buildStructuredInstructionMulti, reformulateFreeText } from '@/lib/server/retouch-instruction';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { getUserContextFromRequest } from '@/lib/server/auth-guard';
import { prisma } from '@/lib/server/prisma';
import {
  uploadToIaRenders,
  createIaRendersSignedUrl,
  copyExternalImageToIaRenders,
  buildIaRenderPath,
} from '@/lib/server/supabase-storage';

export const maxDuration = 120;

const IA_RATE_LIMIT = { limit: 20, windowMs: 60 * 60 * 1000 };

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
  const rateResult = checkRateLimit(`ia-retouch:user:${userId}`, IA_RATE_LIMIT);
  if (!rateResult.success) {
    return NextResponse.json(
      { error: 'Trop de retouches cette heure. Réessayez plus tard.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(IA_RATE_LIMIT.limit),
          'X-RateLimit-Remaining': '0',
          'Retry-After': String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  // ── 3) Parse
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
      { error: 'Image à retoucher requise.' },
      { status: 400 },
    );
  }

  const zone = typeof body.zone === 'string' ? body.zone : '';
  const material = typeof body.material === 'string' ? body.material : '';
  const freeText = typeof body.instruction === 'string' ? body.instruction : '';
  // Retouche GROUPÉE : plusieurs { zone, material } appliqués en UNE génération.
  const changes: Array<{ zone: string; material: string }> = Array.isArray(body.changes)
    ? body.changes
        .filter((c: unknown): c is { zone: string; material: string } =>
          !!c && typeof (c as { zone?: unknown }).zone === 'string' &&
          typeof (c as { material?: unknown }).material === 'string')
        .map((c: { zone: string; material: string }) => ({ zone: c.zone, material: c.material }))
    : [];
  const projectId =
    typeof body.projectId === 'string' && body.projectId.length > 0 ? body.projectId : null;

  // ── 4) Construction de la consigne d'édition (propre, anglais)
  let instruction: string | null = null;
  if (changes.length > 0) {
    instruction = buildStructuredInstructionMulti(changes);
  } else if (zone && material) {
    instruction = buildStructuredInstruction(zone, material);
  } else if (freeText.trim()) {
    instruction = await reformulateFreeText(freeText);
  }
  if (!instruction) {
    return NextResponse.json(
      {
        error:
          'Consigne trop vague pour être appliquée. Précisez quel élément changer et comment (ex. « meubles hauts en blanc mat »).',
        unclear: true,
      },
      { status: 422 },
    );
  }

  // ── 5) INSERT IaJob
  let job;
  try {
    job = await prisma.iaJob.create({
      data: {
        workspaceId,
        createdById: userId,
        projectId,
        type: 'EDIT',
        status: 'QUEUED',
        modelsUsed: ['myarchitectai/edit-by-prompt'],
        params: {
          engine: 'myarchitectai-retouch',
          zone: zone || null,
          material: material || null,
          changes: changes.length > 0 ? changes : null,
          freeText: freeText || null,
          instruction,
        },
      },
    });
  } catch (dbErr) {
    console.error('[API /ia/retouch] prisma.iaJob.create échec:',
      dbErr instanceof Error ? dbErr.message : String(dbErr));
    return NextResponse.json(
      { error: 'Impossible d\'enregistrer la retouche. Réessayez.' },
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
    } catch { /* non bloquant */ }
    return NextResponse.json({ error: message, jobId: job.id }, { status });
  };

  try {
    await prisma.iaJob.update({ where: { id: job.id }, data: { status: 'PROCESSING' } });

    // ── 6) Upload de l'image à retoucher → URL signée
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
      console.warn('[API /ia/retouch] upload source échec:',
        uploadErr instanceof Error ? uploadErr.message : uploadErr);
      return fail(502, 'Impossible de préparer l\'image. Réessayez.');
    }

    // ── 7) Retouche via edit-by-prompt
    const result = await generateRetouch(instruction, sourceSignedUrl);
    if (!result.success || result.imageUrls.length === 0) {
      const err = (result.error ?? '').toLowerCase();
      const status = err.includes('délai') || err.includes('aucune image') ? 504 : 502;
      return fail(status, result.error ?? 'Retouche échouée.');
    }

    // ── 8) Copie du résultat → Supabase
    const copied = await Promise.all(
      result.imageUrls.map((url, idx) =>
        copyExternalImageToIaRenders(url, buildIaRenderPath(workspaceId, job.id, idx))
          .then(({ path, signedUrl }) => ({ path, signedUrl })),
      ),
    );

    // ── 9) DONE — coût indicatif edit-by-prompt : ~0,03 $/appel
    const costUSD = result.endpoint === 'mock' ? 0 : 0.03 * result.imageUrls.length;
    await prisma.iaJob.update({
      where: { id: job.id },
      data: {
        status: 'DONE',
        prompt: result.prompt,
        resultImageUrls: {
          paths: copied.map(c => c.path),
          signedUrls: copied.map(c => c.signedUrl),
          meta: { engine: 'myarchitectai-retouch', endpoint: result.endpoint },
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
      instruction, // consigne réellement appliquée (affichée à l'utilisateur)
      engine: result.endpoint,
      durationMs: Date.now() - tStart,
      rateLimit: { remaining: rateResult.remaining, resetAt: rateResult.resetAt },
    });
  } catch (err) {
    console.error('[API /ia/retouch] exception:', err);
    return fail(500, err instanceof Error ? err.message : 'Erreur serveur interne');
  }
}
