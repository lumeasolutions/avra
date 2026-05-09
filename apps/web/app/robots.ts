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
          // Auth — on laisse /login indexable (page publique)
          '/register',
          '/forgot-password',
          '/reset-password',
          // Assets systeme : Google les explore mais on ne veut pas les indexer
          '/_next/',
          '/blog/feed.xml',
          '/manifest.json',
          '/browserconfig.xml',
          '/opengraph-image',
          '/sw.js',
          '/icons/',
          '/favicon.ico',
          // Application privée (route group app)
          '/dashboard',
          '/assistant',
          '/commandes',
          '/dossiers',
          '/dossiers-signes',
          '/e-paiement',
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
          // Pages de confirmation (pas utiles à indexer)
          '/rejoindre/merci',
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
