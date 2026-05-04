/**
 * Copie le worker pdfjs-dist depuis node_modules vers /public.
 *
 * Pourquoi ? La CSP d'AVRA n'autorise pas les scripts depuis cdnjs.cloudflare.com.
 * Si on tente de charger le worker pdfjs depuis le CDN, il est bloqué et la
 * génération de thumbnails PDF échoue silencieusement (fallback sur l'icône
 * rouge générique). En servant le worker depuis notre propre origin (/public),
 * on respecte la CSP `script-src 'self'` et le rendu fonctionne.
 *
 * Lancé en `prebuild` et `postinstall` pour garantir que le fichier est à jour
 * dans /public avant chaque build.
 */

const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.resolve(__dirname, '../public');
const TARGET = path.join(TARGET_DIR, 'pdf.worker.min.mjs');

/**
 * Localise le worker pdfjs-dist. Tente plusieurs stratégies pour gérer
 * pnpm (.pnpm), npm flat (node_modules/pdfjs-dist) et yarn.
 */
function findWorkerSource() {
  const candidates = [
    // npm/yarn flat
    path.resolve(__dirname, '../../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
    // local apps/web hoisted
    path.resolve(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  // pnpm : chercher dans .pnpm/pdfjs-dist@*
  try {
    const pnpmDir = path.resolve(__dirname, '../../../node_modules/.pnpm');
    if (fs.existsSync(pnpmDir)) {
      const entries = fs.readdirSync(pnpmDir).filter((d) => d.startsWith('pdfjs-dist@'));
      for (const e of entries) {
        const p = path.join(pnpmDir, e, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
        if (fs.existsSync(p)) return p;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

try {
  const source = findWorkerSource();
  if (!source) {
    console.warn(
      '[copy-pdf-worker] worker source not found — skipping (pdfjs-dist not installed yet?)',
    );
    process.exit(0);
  }
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }
  fs.copyFileSync(source, TARGET);
  const stats = fs.statSync(TARGET);
  // eslint-disable-next-line no-console
  console.log(
    `[copy-pdf-worker] copied ${source} → ${TARGET} (${(stats.size / 1024).toFixed(1)} KB)`,
  );
} catch (err) {
  // Non-fatal : on log et on continue. Le rendu PDF côté client fallback sur
  // l'icône générique si le worker n'est pas dispo.
  console.warn('[copy-pdf-worker] failed:', err.message);
}
