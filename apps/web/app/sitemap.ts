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

const BASE_URL = 'https://avra-app.fr';

type SitemapEntry = MetadataRoute.Sitemap[number];

/**
 * Date de derniere modification reelle de chaque page, au format AAAA-MM-JJ.
 *
 * Avant septembre 2026, toutes les URLs portaient `new Date()` : le sitemap
 * annonçait donc que les 33 pages avaient change le jour meme, a chaque
 * deploiement. Google finit par ignorer un lastmod dont il constate qu'il ne
 * correspond a rien, et on perd le seul signal qui lui dit ou revenir en
 * priorite.
 *
 * Pour les articles, la date est celle qu'ils declarent eux-memes dans leur
 * balisage (dateModified) : c'est la date editoriale, plus juste qu'une date
 * de commit qui bouge des qu'on retouche un titre.
 *
 * A METTRE A JOUR quand le contenu d'une page change vraiment. Une date figee
 * mais honnete vaut mieux qu'une date fraiche et fausse.
 */
const DERNIERE_MODIF: Record<string, string> = {
  '/': '2026-09-06',
  '/fonctionnalites': '2026-09-06',
  '/tarifs': '2026-09-06',
  '/comment-ca-marche': '2026-07-13',
  '/temoignages': '2026-09-06',
  '/demo': '2026-09-06',
  '/contact': '2026-09-06',
  '/rejoindre': '2026-09-06',
  '/blog': '2026-09-06',
  '/glossaire': '2026-09-06',
  // Articles : date declaree dans leur propre balisage BlogPosting.
  '/blog/comment-choisir-erp-cuisiniste': '2026-05-01',
  '/blog/logiciel-menuisier-2026': '2026-05-01',
  '/blog/5-erreurs-marge-cuisiniste': '2026-05-01',
  '/blog/devis-cuisine-modele-mentions-legales': '2026-05-01',
  '/blog/ia-architecte-interieur': '2026-05-01',
  '/blog/e-facture-2026': '2026-04-12',
  '/blog/logiciel-cuisiniste-comparatif': '2026-04-15',
  '/metiers': '2026-09-06',
  '/cuisiniste': '2026-09-06',
  '/menuisier': '2026-09-06',
  '/architecte-interieur': '2026-09-06',
  '/agenceur': '2026-09-06',
  '/cuisiniste-paris': '2026-09-06',
  '/cuisiniste-lyon': '2026-09-06',
  '/cuisiniste-marseille': '2026-09-06',
  '/menuisier-paris': '2026-09-06',
  '/menuisier-lyon': '2026-09-06',
  '/menuisier-bordeaux': '2026-09-06',
  '/agencement-toulouse': '2026-09-06',
  '/agencement-nantes': '2026-09-06',
  '/mentions-legales': '2026-09-06',
  '/confidentialite': '2026-09-06',
  '/cgv': '2026-09-06',
};

/** Repli si une page est ajoutee au sitemap sans etre datee ci-dessus. */
const DATE_PAR_DEFAUT = '2026-09-06';

function url(
  path: string,
  opts?: Partial<Omit<SitemapEntry, 'url'>>,
): SitemapEntry {
  return {
    url: `${BASE_URL}${path}`,
    lastModified: new Date(`${DERNIERE_MODIF[path] ?? DATE_PAR_DEFAUT}T00:00:00Z`),
    changeFrequency: opts?.changeFrequency ?? 'monthly',
    priority: opts?.priority ?? 0.7,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // ── Pages principales ───────────────────────────────────────────
    url('/', { changeFrequency: 'weekly', priority: 1.0 }),
    url('/fonctionnalites', { changeFrequency: 'weekly', priority: 0.9 }),
    url('/tarifs', { changeFrequency: 'weekly', priority: 0.9 }),
    url('/comment-ca-marche', { changeFrequency: 'weekly', priority: 0.85 }),
    url('/temoignages', { changeFrequency: 'weekly', priority: 0.8 }),
    url('/demo', { changeFrequency: 'weekly', priority: 0.85 }),
    url('/contact', { changeFrequency: 'monthly', priority: 0.75 }),
    url('/rejoindre', { changeFrequency: 'weekly', priority: 0.85 }),

    // ── Blog ─────────────────────────────────────────────────────────
    url('/blog', { changeFrequency: 'weekly', priority: 0.8 }),
    url('/glossaire', { changeFrequency: 'monthly', priority: 0.75 }),
    url('/blog/comment-choisir-erp-cuisiniste', { changeFrequency: 'monthly', priority: 0.85 }),
    url('/blog/logiciel-menuisier-2026', { changeFrequency: 'monthly', priority: 0.85 }),
    url('/blog/5-erreurs-marge-cuisiniste', { changeFrequency: 'monthly', priority: 0.85 }),
    url('/blog/devis-cuisine-modele-mentions-legales', { changeFrequency: 'monthly', priority: 0.85 }),
    url('/blog/ia-architecte-interieur', { changeFrequency: 'monthly', priority: 0.85 }),
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

    // ── Pages légales (indexables, importantes pour la confiance utilisateur)
    url('/mentions-legales', { changeFrequency: 'yearly', priority: 0.4 }),
    url('/confidentialite', { changeFrequency: 'yearly', priority: 0.4 }),
    url('/cgv', { changeFrequency: 'yearly', priority: 0.4 }),
  ];
}
