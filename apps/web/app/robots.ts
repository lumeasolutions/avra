/**
 * robots.txt dynamique — AVRA
 *
 * Autorise l'indexation de toutes les pages marketing publiques.
 * Bloque les routes privées, API, et pages de l'application.
 *
 * Next.js génère automatiquement /robots.txt à partir de ce fichier.
 */

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // Routes API
          '/api/',
          // 06/09/2026 — Les assets systeme ne sont plus bloques.
          //
          // `/_next/` interdisait a Googlebot de telecharger le JS et le CSS
          // du site : il rendait donc les pages sans style ni hydratation, ce
          // que Google documente explicitement comme nuisible au classement.
          // `/favicon.ico` + `/icons/` privaient la SERP mobile du logo, et
          // `/opengraph-image` cassait l'apercu des liens chez les crawlers
          // sociaux qui respectent robots.txt (LinkedIn notamment).
          // Ces fichiers sont explores mais ne remontent pas en resultat :
          // les bloquer ne servait a rien et coutait cher.
          '/sw.js',
          // Les pages sans valeur de recherche portent desormais un `noindex`
          // (voir les layouts /login, /forgot-password, /reset-password,
          // /rejoindre/merci). On les laisse crawlables A DESSEIN : une URL
          // bloquee par robots.txt empeche Google de LIRE le noindex, et elle
          // peut alors rester indexee en URL nue. Interdire OU desindexer,
          // jamais les deux.
          // Application privée (route group app)
          '/dashboard',
          '/commandes',
          '/dossiers',
          '/dossiers-signes',
          '/epaiement',
          '/facturation',
          '/historique',
          '/ia-studio',
          '/intervenants',
          '/notifications',
          '/parametres',
          '/planning',
          '/planning-gestion',
          '/signature',
          '/statistiques',
          '/stock',
          '/admin-docs',
          // Portails
          '/portail-admin',
          '/portail-architecte',
          '/portail-cuisiniste',
          '/portail-menuisier',
          '/portail-agenceur',
          '/portal-select',
          // Module admin-only Plan Technique IA (bêta interne, ne JAMAIS indexer)
          '/plan-technique-ia',
          '/plan-technique-ia/',
        ],
      },
      // Bloquer les bots IA sur le contenu
      {
        userAgent: ['GPTBot', 'Google-Extended', 'anthropic-ai', 'ClaudeBot'],
        disallow: '/',
      },
    ],
    sitemap: 'https://avra-app.fr/sitemap.xml',
  };
}
