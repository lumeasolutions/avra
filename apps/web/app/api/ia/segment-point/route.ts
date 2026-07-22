/**
 * POST /api/ia/segment-point
 *
 * Aperçu de sélection au CLIC (SAM2) pour le module « Coloriste ✨ ».
 * L'utilisateur clique sur une surface de la photo ; on segmente l'objet exact
 * sous le clic et on renvoie l'URL d'un masque (blanc = zone sélectionnée) que
 * le front superpose en direct. Appelé à chaque clic (ajout/retrait de points).
 *
 * Réutilisation : au premier clic le front envoie `sourceImageDataUrl` ; on
 * l'upload une fois et on renvoie `sourceUrl`. Les clics suivants renvoient
 * `sourceUrl` → pas de ré-upload (rapide). Le masque final part ensuite dans
 * /api/ia/coloriste-textures (mode 'points') avec ce même `sourceUrl`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { segmentByPoints, type SamPoint } from '@/lib/server/flux-api';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { getUserContextFromRequest } from '@/lib/server/auth-guard';
import { uploadToIaRenders, createIaRendersSignedUrl } from '@/lib/server/supabase-storage';

export const maxDuration = 60;

// Interactif : on autorise beaucoup d'appels (un par clic), mais borné.
const RATE_LIMIT = { limit: 200, windowMs: 60 * 60 * 1000 };

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error('Image source invalide (data URL attendue).');
  return { contentType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

export async function POST(req: NextRequest) {
  const userCtx = getUserContextFromRequest(req);
  if (!userCtx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, workspaceId } = userCtx;

  const rate = checkRateLimit(`ia-segment-point:user:${userId}`, RATE_LIMIT);
  if (!rate.success) {
    return NextResponse.json({ error: 'Trop de sélections. Patientez un instant.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  // Points cliqués (obligatoires).
  const rawPoints = Array.isArray(body.points) ? body.points : [];
  const points: SamPoint[] = rawPoints
    .map((p) => {
      const o = p as Record<string, unknown>;
      return {
        x: Number(o.x),
        y: Number(o.y),
        label: (Number(o.label) === 0 ? 0 : 1) as 0 | 1,
      };
    })
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (points.length === 0) {
    return NextResponse.json({ error: 'Aucun point de sélection fourni.' }, { status: 400 });
  }

  // Source : soit une URL déjà uploadée (réutilisation), soit un data URL à uploader.
  const providedSourceUrl =
    typeof body.sourceUrl === 'string' && body.sourceUrl.startsWith('http') ? body.sourceUrl : null;
  const sourceImageDataUrl =
    typeof body.sourceImageDataUrl === 'string' && body.sourceImageDataUrl.startsWith('data:')
      ? body.sourceImageDataUrl
      : null;

  let sourceUrl: string;
  try {
    if (providedSourceUrl) {
      sourceUrl = providedSourceUrl;
    } else if (sourceImageDataUrl) {
      const { buffer, contentType } = dataUrlToBuffer(sourceImageDataUrl);
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const path = `${workspaceId}/click-select/${Date.now()}-src.${ext}`;
      await uploadToIaRenders(path, buffer, contentType);
      sourceUrl = await createIaRendersSignedUrl(path);
    } else {
      return NextResponse.json({ error: 'Photo source requise.' }, { status: 400 });
    }
  } catch (err) {
    console.warn('[API /ia/segment-point] upload source échec:',
      err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Impossible de préparer la photo.' }, { status: 502 });
  }

  // Segmentation SAM2.
  try {
    const maskUrl = await segmentByPoints(sourceUrl, points);
    if (!maskUrl) {
      return NextResponse.json({ error: 'La sélection n\'a rien détecté ici. Cliquez sur la surface.' , sourceUrl }, { status: 422 });
    }
    return NextResponse.json({ maskUrl, sourceUrl });
  } catch (err) {
    console.error('[API /ia/segment-point] exception:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur serveur', sourceUrl },
      { status: 500 },
    );
  }
}
