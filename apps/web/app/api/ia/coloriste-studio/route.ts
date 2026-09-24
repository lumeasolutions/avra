/**
 * POST /api/ia/coloriste-studio
 *
 * « Changer les couleurs Studio » : plusieurs elements recolorises en UNE
 * generation. L'utilisateur coche meubles hauts, meubles bas, ilot, plan de
 * travail, credence, poignees — dans n'importe quelle combinaison — donne une
 * couleur a chacun, et recoit une seule image.
 *
 * Pas de zone a tracer : la demande passe entierement par la consigne. C'est
 * impose par l'outil autant que par l'usage — aucun modele d'image de Google
 * n'accepte de masque en entree, et aucune API commerciale n'accepte une liste
 * [{masque, couleur}] permettant une couleur differente par zone en une seule
 * requete.
 *
 * ⚙️  GOOGLE_AI_API_KEY. Sans clé → mode démo (renvoie la photo).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  recolorerAvecGoogle,
  ELEMENTS_COULEUR,
  type ChoixCouleur,
  type TailleCouleur,
} from '@/lib/server/google-colors';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { getUserContextFromRequest } from '@/lib/server/auth-guard';
import { prisma } from '@/lib/server/prisma';
import {
  uploadToIaRenders,
  createIaRendersSignedUrl,
  buildIaRenderPath,
} from '@/lib/server/supabase-storage';

export const maxDuration = 300;

const LIMITE = { limit: 150, windowMs: 60 * 60 * 1000 };

/** Tarif editeur au 24/09/2026, par image de sortie. */
const COUT: Record<TailleCouleur, number> = { '1K': 0.067, '2K': 0.101, '4K': 0.151 };

function dataUrlToBuffer(d: string): { buffer: Buffer; contentType: string; base64: string } {
  const m = /^data:([^;]+);base64,(.+)$/.exec(d);
  if (!m) throw new Error('Image invalide (data URL attendue).');
  return { contentType: m[1], base64: m[2], buffer: Buffer.from(m[2], 'base64') };
}

/** Dimensions d'un PNG/JPEG lues dans l'en-tete, sans decoder l'image. */
function dimensions(buf: Buffer): { largeur: number; hauteur: number } | null {
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    return { largeur: buf.readUInt32BE(16), hauteur: buf.readUInt32BE(20) };
  }
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

  const rate = checkRateLimit(`ia-coloriste-studio:ws:${workspaceId}`, LIMITE);
  if (!rate.success) {
    return NextResponse.json({ error: 'Trop de générations cette heure. Réessayez plus tard.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const dataUrl = typeof body.sourceImageDataUrl === 'string' && body.sourceImageDataUrl.startsWith('data:')
    ? body.sourceImageDataUrl
    : null;
  if (!dataUrl) {
    return NextResponse.json({ error: 'Photo de la cuisine requise (importez une image).' }, { status: 400 });
  }

  // Les elements coches, avec leur couleur. On ne garde que ceux qu'on sait
  // nommer au modele et dont le code hexa est valide.
  const bruts = Array.isArray(body.elements) ? (body.elements as unknown[]) : [];
  const choix: ChoixCouleur[] = bruts
    .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
    .map(e => ({
      id: String(e.id ?? ''),
      hex: String(e.hex ?? ''),
      nom: typeof e.nom === 'string' && e.nom ? e.nom : undefined,
      finition: typeof e.finition === 'string' && e.finition ? e.finition : undefined,
    }))
    .filter(c => ELEMENTS_COULEUR.some(d => d.id === c.id) && /^#[0-9a-f]{6}$/i.test(c.hex));

  if (choix.length === 0) {
    return NextResponse.json(
      { error: 'Cochez au moins un élément et choisissez sa couleur.' },
      { status: 400 },
    );
  }

  const taille: TailleCouleur = body.highRes === true ? '4K' : '2K';
  const projectId = typeof body.projectId === 'string' && body.projectId ? body.projectId : null;

  let job;
  try {
    job = await prisma.iaJob.create({
      data: {
        workspaceId,
        createdById: userId,
        projectId,
        type: 'COLOR_VARIATION',
        status: 'QUEUED',
        modelsUsed: ['google/gemini-3.1-flash-image/recolor'],
        params: {
          engine: 'coloriste-studio',
          taille,
          elements: choix.map(c => `${c.id}:${c.hex}`),
        },
      },
    });
  } catch (dbErr) {
    console.error('[API /ia/coloriste-studio] iaJob.create échec:',
      dbErr instanceof Error ? dbErr.message : String(dbErr));
    return NextResponse.json(
      { error: 'Impossible d\'enregistrer la demande. Réessayez dans un instant.' },
      { status: 500 },
    );
  }

  const t0 = Date.now();
  const fail = async (status: number, message: string) => {
    try {
      await prisma.iaJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', errorMessage: message, durationMs: Date.now() - t0, completedAt: new Date() },
      });
    } catch { /* best effort */ }
    return NextResponse.json({ error: message, jobId: job.id }, { status });
  };

  try {
    await prisma.iaJob.update({ where: { id: job.id }, data: { status: 'PROCESSING' } });

    const src = dataUrlToBuffer(dataUrl);
    const dim = dimensions(src.buffer) ?? { largeur: 1600, hauteur: 900 };

    // Archivage de la source, pour que l'historique montre l'avant et l'après.
    try {
      const ext = src.contentType.includes('png') ? 'png' : 'jpg';
      const chemin = `${workspaceId}/${job.id}/source.${ext}`;
      await uploadToIaRenders(chemin, src.buffer, src.contentType);
      const signee = await createIaRendersSignedUrl(chemin);
      await prisma.iaJob.update({ where: { id: job.id }, data: { inputImageUrls: { source: signee } } });
    } catch (e) {
      console.warn('[API /ia/coloriste-studio] archivage source ignoré:', e instanceof Error ? e.message : e);
    }

    const res = await recolorerAvecGoogle(
      src.base64, src.contentType, choix, taille, dim.largeur, dim.hauteur,
    );
    if (!res.ok || !res.base64) {
      return fail(502, res.error ?? 'La recolorisation n\'a pas abouti.');
    }

    const buffer = Buffer.from(res.base64, 'base64');
    const chemin = buildIaRenderPath(workspaceId, job.id, 0);
    await uploadToIaRenders(chemin, buffer, 'image/jpeg');
    const signedUrl = await createIaRendersSignedUrl(chemin);

    await prisma.iaJob.update({
      where: { id: job.id },
      data: {
        status: 'DONE',
        prompt: res.prompt,
        resultImageUrls: {
          paths: [chemin],
          signedUrls: [signedUrl],
          meta: { engine: 'coloriste-studio', taille, elements: choix.map(c => c.id) },
        },
        durationMs: Date.now() - t0,
        costEUR: res.modele === 'mock' ? 0 : COUT[taille],
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      jobId: job.id,
      imageUrl: signedUrl,
      imageUrls: [signedUrl],
      elements: choix.map(c => c.id),
      taille,
      durationMs: Date.now() - t0,
    });
  } catch (err) {
    console.error('[API /ia/coloriste-studio] exception:', err);
    return fail(500, err instanceof Error ? err.message : 'Erreur serveur interne');
  }
}
