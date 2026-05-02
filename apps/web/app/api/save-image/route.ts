import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { isAuthenticated } from '@/lib/server/auth-guard';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';

// ── Allowlist des domaines autorisés pour le fetch d'image (anti-SSRF) ────────
const ALLOWED_ORIGINS = [
  'fal.media',
  'fal.run',
  'fal-cdn.batuhan-941.workers.dev',
  'storage.googleapis.com',
  'storage.gcs.fal.ai',
  'v2.fal.media',
];

// ── Rate limiting : 20 sauvegardes par heure par IP ───────────────────────────
const UPLOAD_RATE_LIMIT = { limit: 20, windowMs: 60 * 60 * 1000 };

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // HTTPS uniquement
    if (parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    // Bloquer les adresses IP privées (SSRF)
    if (/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|0\.|169\.254\.|::1|localhost)/.test(hostname)) {
      return false;
    }
    return ALLOWED_ORIGINS.some(a => hostname === a || hostname.endsWith('.' + a));
  } catch {
    return false;
  }
}

/**
 * Extrait l'extension image depuis le Content-Type.
 * Retourne null si le type n'est pas une image reconnue.
 */
function extensionFromContentType(ct: string): string | null {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  const base = ct.split(';')[0].trim().toLowerCase();
  return map[base] ?? null;
}

export async function POST(req: NextRequest) {
  try {
    // ── Authentification ──────────────────────────────────────────────────
    if (!isAuthenticated(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Rate limiting ─────────────────────────────────────────────────────
    const ip = getClientIp(req);
    const rateResult = checkRateLimit(`save-image:${ip}`, UPLOAD_RATE_LIMIT);
    if (!rateResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans une heure.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    const body = await req.json();
    const { url } = body;
    if (!url) {
      return NextResponse.json({ error: 'Paramètre url manquant' }, { status: 400 });
    }

    // ── Validation de l'URL (anti-SSRF) ───────────────────────────────────
    if (!isAllowedUrl(url)) {
      return NextResponse.json({ error: 'URL non autorisée' }, { status: 403 });
    }

    // ── Fetch de l'image ──────────────────────────────────────────────────
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AVRA-App/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Échec du téléchargement distant' }, { status: 502 });
    }

    // Vérifier le Content-Type
    const contentType = res.headers.get('content-type') ?? '';
    const ext = extensionFromContentType(contentType);
    if (!ext) {
      return NextResponse.json({ error: 'Le contenu distant n\'est pas une image reconnue' }, { status: 400 });
    }

    // Limiter la taille (max 10 Mo)
    const MAX_SIZE = 10 * 1024 * 1024;
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: 'Image trop volumineuse (max 10 Mo)' }, { status: 400 });
    }

    // ── Nom de fichier généré aléatoirement (anti-path-traversal + anti-overwrite)
    const safeName = `ia_${crypto.randomUUID().replace(/-/g, '')}.${ext}`;

    // ── Écriture du fichier ───────────────────────────────────────────────
    const imagesDir = join(process.cwd(), 'public', 'images');
    await mkdir(imagesDir, { recursive: true });
    const filePath = join(imagesDir, safeName);
    await writeFile(filePath, Buffer.from(buffer));

    return NextResponse.json({ ok: true, path: '/images/' + safeName, size: buffer.byteLength });
  } catch (err) {
    // Ne jamais exposer les détails de l'erreur au client
    console.error('[API /save-image]', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
