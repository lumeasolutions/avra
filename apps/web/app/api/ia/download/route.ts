/**
 * GET /api/ia/download?url=<image_url>&name=<filename>
 *
 * Proxy de téléchargement : le navigateur ne peut pas récupérer directement
 * l'image (la CSP `connect-src` n'autorise pas *.supabase.co, et un <a download>
 * cross-origin est ignoré pour le nom de fichier). Cette route, SAME-ORIGIN,
 * va chercher l'image côté serveur (aucune contrainte CORS) et la renvoie avec
 * `Content-Disposition: attachment` → vrai téléchargement avec le bon nom.
 *
 * Sécurité : on n'accepte QUE les hôtes d'images connus (anti-SSRF) et le
 * protocole https. Les URL Supabase signées sont déjà des credentials
 * temporaires et non devinables.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Hôtes autorisés : Supabase Storage (rendus IA), fal.ai CDN, GCS.
// Une entrée commençant par "." matche n'importe quel sous-domaine.
const ALLOWED_HOSTS = [
  '.supabase.co',
  '.fal.media',
  'fal.media',
  'storage.googleapis.com',
];

function isAllowedUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    return ALLOWED_HOSTS.some(h =>
      h.startsWith('.') ? u.hostname.endsWith(h) : u.hostname === h,
    );
  } catch {
    return false;
  }
}

/** Nettoie le nom de fichier (évite l'injection dans le header + caractères invalides). */
function safeFilename(name: string | null): string {
  const fallback = 'avra-visuel.jpg';
  if (!name) return fallback;
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  return cleaned || fallback;
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('url');
  const filename = safeFilename(req.nextUrl.searchParams.get('name'));

  if (!target || !isAllowedUrl(target)) {
    return NextResponse.json({ error: 'URL non autorisée' }, { status: 400 });
  }

  try {
    const upstream = await fetch(target, { cache: 'no-store' });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: 'Image introuvable' }, { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Téléchargement impossible' }, { status: 502 });
  }
}
