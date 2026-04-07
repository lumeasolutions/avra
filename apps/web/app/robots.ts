import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/login', '/register', '/(app)/', '/portal-select', '/e-facturation/'],
      },
    ],
    sitemap: 'https://avra-kappa.vercel.app/sitemap.xml',
  }
}
