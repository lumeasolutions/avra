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
          // Auth
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          // Application privée (route group app)
          '/dashboard',
          '/assistant',
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
    sitemap: 'https://avra.fr/sitemap.xml',
  };
}
