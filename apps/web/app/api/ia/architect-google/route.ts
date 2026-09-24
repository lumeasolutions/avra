/**
 * POST /api/ia/architect-google
 *
 * Jumeau de /api/ia/architect, moteur Google (Gemini 3.1 Flash Image) au lieu
 * de MyArchitectAI. Même entrée, même sortie, même historique : l'onglet
 * « Rendu Réaliste · Google » de l'IA Studio partage l'interface du Rendu
 * Réaliste, pour qu'une comparaison porte sur le MOTEUR et sur rien d'autre.
 *
 * Deux différences de fond avec le jumeau MyArchitectAI :
 *   - pas d'upload préalable : Gemini reçoit l'image en base64 dans la requête,
 *     donc pas d'URL signée à fabriquer ni de fenêtre de 5 min à respecter ;
 *   - `materialSamples` : jusqu'à 13 échantillons de matière réels, transmis
 *     comme images de référence. C'est ce que MyArchitectAI ne sait pas faire
 *     correctement (il réinvente le motif) et la raison d'être de cet essai.
 *
 * ⚙️  GOOGLE_AI_API_KEY. Sans elle → mode démo (renvoie l'image source).
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ArchitectMode, ArchitectParams } from '@/lib/server/myarchitect-api';
import {
  generateGoogleRender,
  ratioProche,
  isGoogleImageEnabled,
  type TailleImage,
} from '@/lib/server/google-image-api';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { getUserContextFromRequest } from '@/lib/server/auth-guard';
import { prisma } from '@/lib/server/prisma';
import {
  uploadToIaRenders,
  createIaRendersSignedUrl,
  buildIaRenderPath,
} from '@/lib/server/supabase-storage';

export const maxDuration = 300;

const IA_RATE_LIMIT = { limit: 150, windowMs: 60 * 60 * 1000 };

/** Tarif éditeur au 24/09/2026, par image de sortie. */
const COUT: Record<TailleImage, number> = { '1K': 0.067, '2K': 0.101, '4K': 0.151 };

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string; base64: string } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error('Image invalide (data URL attendue).');
  return { contentType: match[1], base64: match[2], buffer: Buffer.from(match[2], 'base64') };
}

/** Dimensions d'un PNG/JPEG, lues dans l'en-tête — sans dépendance ni décodage. */
function dimensions(buf: Buffer): { largeur: number; hauteur: number } | null {
  // PNG : IHDR à l'offset 16
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    return { largeur: buf.readUInt32BE(16), hauteur: buf.readUInt32BE(20) };
  }
  // JPEG : on parcourt les segments jusqu'à un SOFn
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marqueur = buf[i + 1];
      const taille = buf.readUInt16BE(i + 2);
      const estSOF = marqueur >= 0xc0 && marqueur <= 0xcf
        && marqueur !== 0xc4 && marqueur !== 0xc8 && marqueur !== 0xcc;
      if (estSOF) return { hauteur: buf.readUInt16BE(i + 5), largeur: buf.readUInt16BE(i + 7) };
      i += 2 + taille;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const userCtx = getUserContextFromRequest(req);
  if (!userCtx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, workspaceId } = userCtx;

  const rateResult = checkRateLimit(`ia-architect-google:ws:${workspaceId}`, IA_RATE_LIMIT);
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

  // Échantillons de matière (0 à 9) — c'est l'apport de ce moteur.
  // Plafond à 9 : Google garantit la haute fidélité jusqu'à 10 images d'objets
  // au total, photo source comprise. Au-delà on perdrait précisément ce qu'on
  // vient chercher.
  const echantillonsDataUrls = Array.isArray(body.materialSamples)
    ? (body.materialSamples as unknown[])
        .filter((s): s is string => typeof s === 'string' && s.startsWith('data:'))
        .slice(0, 9)
    : [];

  // Garde-fou taille : la fonction serverless plafonne le corps de requête à
  // 4,5 Mo. Mieux vaut un message clair ici qu'un 413 opaque côté plateforme.
  const poidsBase64 = referenceImageDataUrl.length
    + echantillonsDataUrls.reduce((n, s) => n + s.length, 0);
  if (poidsBase64 > 4_200_000) {
    return NextResponse.json(
      {
        error: 'Images trop lourdes au total (limite ~4 Mo). Retirez un échantillon, '
          + 'ou réimportez une photo source moins lourde.',
      },
      { status: 413 },
    );
  }

  const mode: ArchitectMode = body.mode === 'exterior' ? 'exterior' : 'interior';
  const params: ArchitectParams = {
    mode,
    facades: typeof body.facades === 'string' ? body.facades : undefined,
    facadesBas: typeof body.facadesBas === 'string' ? body.facadesBas : undefined,
    facadesHaut: typeof body.facadesHaut === 'string' ? body.facadesHaut : undefined,
    planTravail: typeof body.planTravail === 'string' ? body.planTravail : undefined,
    sol: typeof body.sol === 'string' ? body.sol : undefined,
    murs: typeof body.murs === 'string' ? body.murs : undefined,
    poignees: typeof body.poignees === 'string' ? body.poignees : undefined,
    credence: typeof body.credence === 'string' ? body.credence : undefined,
    evier: typeof body.evier === 'string' ? body.evier : undefined,
    cooktop:
      body.cooktop === 'induction' || body.cooktop === 'gas' || body.cooktop === 'downdraft'
        ? body.cooktop
        : undefined,
    ambiance: typeof body.ambiance === 'string' ? body.ambiance : undefined,
    highRes: body.highRes === true,
  };
  /**
   * Toujours 4K (décision du 24/09/2026).
   *
   * La netteté est l'un des deux défauts mesurés du moteur actuel : ses
   * sorties 1K, recollées dans une source 4K, font perdre 68 à 84 % de
   * netteté sur la zone modifiée. On ne va pas refaire l'essai en se
   * handicapant. L'écart de prix est de 5 centimes par rendu (0,151 $ en 4K
   * contre 0,101 $ en 2K) : sans commune mesure avec le temps perdu à
   * comparer des images trop molles pour trancher.
   *
   * La case « Haute définition » continue donc de ne piloter que le jumeau
   * MyArchitectAI, où elle déclenche un upscale facturé.
   */
  const taille: TailleImage = '4K';
  const projectId =
    typeof body.projectId === 'string' && body.projectId.length > 0 ? body.projectId : null;

  let job;
  try {
    job = await prisma.iaJob.create({
      data: {
        workspaceId,
        createdById: userId,
        projectId,
        type: 'EDIT', // même enum que le jumeau MyArchitectAI, pas de migration
        status: 'QUEUED',
        modelsUsed: [`google/gemini-3.1-flash-image/${mode}`],
        params: {
          engine: 'google-render-realistic',
          mode,
          taille,
          echantillons: echantillonsDataUrls.length,
          facades: params.facades ?? null,
          facadesBas: params.facadesBas ?? null,
          facadesHaut: params.facadesHaut ?? null,
          planTravail: params.planTravail ?? null,
          sol: params.sol ?? null,
          murs: params.murs ?? null,
          poignees: params.poignees ?? null,
          credence: params.credence ?? null,
          evier: params.evier ?? null,
          cooktop: params.cooktop ?? null,
          ambiance: params.ambiance ?? null,
          highRes: params.highRes ?? false,
        },
      },
    });
  } catch (dbErr) {
    console.error('[API /ia/architect-google] prisma.iaJob.create échec:',
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
      console.warn(`[API /ia/architect-google] fail() couldn't update IaJob ${job.id}:`,
        dbErr instanceof Error ? dbErr.message : String(dbErr));
    }
    return NextResponse.json({ error: message, jobId: job.id }, { status });
  };

  try {
    await prisma.iaJob.update({ where: { id: job.id }, data: { status: 'PROCESSING' } });

    const src = dataUrlToBuffer(referenceImageDataUrl);
    const dim = dimensions(src.buffer);
    const ratio = dim ? ratioProche(dim.largeur, dim.hauteur) : '16:9';

    // On archive la source comme le jumeau, pour que l'historique soit comparable.
    try {
      const ext = src.contentType.includes('png') ? 'png' : src.contentType.includes('webp') ? 'webp' : 'jpg';
      const sourcePath = `${workspaceId}/${job.id}/source.${ext}`;
      await uploadToIaRenders(sourcePath, src.buffer, src.contentType);
      const signee = await createIaRendersSignedUrl(sourcePath);
      await prisma.iaJob.update({
        where: { id: job.id },
        data: { inputImageUrls: { source: signee } },
      });
    } catch (uploadErr) {
      // Non bloquant ici : Gemini reçoit l'image en base64, pas par URL.
      console.warn('[API /ia/architect-google] archivage source échec:',
        uploadErr instanceof Error ? uploadErr.message : uploadErr);
    }

    const echantillons = echantillonsDataUrls.map(d => {
      const e = dataUrlToBuffer(d);
      return { base64: e.base64, mime: e.contentType };
    });

    const result = await generateGoogleRender(
      params,
      { base64: src.base64, mime: src.contentType },
      echantillons,
      taille,
      ratio,
    );
    if (!result.success || !result.base64) {
      return fail(502, result.error ?? 'Génération du rendu échouée.');
    }

    // Stockage du rendu (URL signée 30 j), même chemin que le jumeau.
    const buffer = Buffer.from(result.base64, 'base64');
    const path = buildIaRenderPath(workspaceId, job.id, 0);
    await uploadToIaRenders(path, buffer, 'image/jpeg');
    const signedUrl = await createIaRendersSignedUrl(path);

    const costUSD = result.endpoint === 'mock' ? 0 : COUT[taille];
    await prisma.iaJob.update({
      where: { id: job.id },
      data: {
        status: 'DONE',
        prompt: result.prompt,
        resultImageUrls: {
          paths: [path],
          signedUrls: [signedUrl],
          meta: { engine: 'google', endpoint: result.endpoint, taille, ratio, mode },
        },
        durationMs: Date.now() - tStart,
        costEUR: costUSD,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      jobId: job.id,
      imageUrl: signedUrl,
      imageUrls: [signedUrl],
      engine: result.endpoint,
      upscaled: result.upscaled,
      taille,
      configured: isGoogleImageEnabled(),
      durationMs: Date.now() - tStart,
      rateLimit: { remaining: rateResult.remaining, resetAt: rateResult.resetAt },
    });
  } catch (err) {
    console.error('[API /ia/architect-google] exception:', err);
    const message = err instanceof Error ? err.message : 'Erreur serveur interne';
    return fail(500, message);
  }
}
