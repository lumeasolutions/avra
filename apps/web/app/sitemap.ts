/**
 * sitemap.xml dynamique — AVRA
 *
 * Référence toutes les pages marketing publiques indexables.
 * Les routes privées (/portail-*, /dashboard, /api/*, etc.) sont exclues.
 *
 * Next.js génère automatiquement /sitemap.xml à partir de ce fichier.
 * Mis en cache 1h (revalidate = 3600 dans le layout marketing).
 */

import { MetadataRoute } from 'next';

const BASE_URL = 'https://avra.fr';

type SitemapEntry = MetadataRoute.Sitemap[number];

function url(
  path: string,
  opts?: Partial<Omit<SitemapEntry, 'url'>>,
): SitemapEntry {
  return {
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: opts?.changeFrequency ?? 'monthly',
    priority: opts?.priority ?? 0.7,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // ── Pages principales ───────────────────────────────────────────
    url('/', { changeFrequency: 'weekly', priority: 1.0 }),
    url('/accueil', { changeFrequency: 'weekly', priority: 0.9 }),
    url('/fonctionnalites', { changeFrequency: 'weekly', priority: 0.9 }),
    url('/tarifs', { changeFrequency: 'weekly', priority: 0.9 }),
    url('/comment-ca-marche', { changeFrequency: 'weekly', priority: 0.85 }),
    url('/temoignages', { changeFrequency: 'weekly', priority: 0.8 }),
    url('/demo', { changeFrequency: 'weekly', priority: 0.85 }),
    url('/contact', { changeFrequency: 'monthly', priority: 0.75 }),
    url('/rejoindre', { changeFrequency: 'weekly', priority: 0.85 }),

    // ── Blog ─────────────────────────────────────────────────────────
    url('/blog', { changeFrequency: 'weekly', priority: 0.8 }),
    url('/blog/e-facture-2026', { changeFrequency: 'monthly', priority: 0.75 }),
    url('/blog/logiciel-cuisiniste-comparatif', { changeFrequency: 'monthly', priority: 0.75 }),

    // ── Pages métiers ────────────────────────────────────────────────
    url('/metiers', { changeFrequency: 'monthly', priority: 0.85 }),
    url('/cuisiniste', { changeFrequency: 'monthly', priority: 0.85 }),
    url('/menuisier', { changeFrequency: 'monthly', priority: 0.85 }),
    url('/architecte-interieur', { changeFrequency: 'monthly', priority: 0.85 }),
    url('/agenceur', { changeFrequency: 'monthly', priority: 0.85 }),

    // ── Pages géo — Cuisinistes ──────────────────────────────────────
    url('/cuisiniste-paris', { changeFrequency: 'monthly', priority: 0.8 }),
    url('/cuisiniste-lyon', { changeFrequency: 'monthly', priority: 0.8 }),
    url('/cuisiniste-marseille', { changeFrequency: 'monthly', priority: 0.8 }),

    // ── Pages géo — Menuisiers ───────────────────────────────────────
    url('/menuisier-paris', { changeFrequency: 'monthly', priority: 0.8 }),
    url('/menuisier-lyon', { changeFrequency: 'monthly', priority: 0.8 }),
    url('/menuisier-bordeaux', { changeFrequency: 'monthly', priority: 0.8 }),

    // ── Pages géo — Agencement ───────────────────────────────────────
    url('/agencement-toulouse', { changeFrequency: 'monthly', priority: 0.8 }),
    url('/agencement-nantes', { changeFrequency: 'monthly', priority: 0.8 }),

    // ── Légales ──────────────────────────────────────────────────────
    url('/mentions-legales', { changeFrequency: 'yearly', priority: 0.3 }),
    url('/confidentialite', { changeFrequency: 'yearly', priority: 0.3 }),
    url('/cgv', { changeFrequency: 'yearly', priority: 0.3 }),
    url('/e-facturation', { changeFrequency: 'yearly', priority: 0.4 }),
  ];
}
