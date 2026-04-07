import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://avra-kappa.vercel.app'
  const now = new Date()

  return [
    // Home
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    // Pages marketing principales
    {
      url: `${baseUrl}/accueil`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/fonctionnalites`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tarifs`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/comment-ca-marche`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/temoignages`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/demo`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    // Pages métiers
    {
      url: `${baseUrl}/metiers/cuisiniste`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/metiers/menuisier`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/metiers/architecte-interieur`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/metiers/agenceur`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    // Pages géographiques - Cuisinistes
    {
      url: `${baseUrl}/cuisiniste/paris`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/cuisiniste/lyon`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/cuisiniste/marseille`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // Pages géographiques - Menuisiers
    {
      url: `${baseUrl}/menuisier/paris`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/menuisier/lyon`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/menuisier/bordeaux`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // Pages géographiques - Agencement
    {
      url: `${baseUrl}/agenceur/toulouse`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/agenceur/nantes`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // Pages légales
    {
      url: `${baseUrl}/mentions-legales`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/confidentialite`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/cgv`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
