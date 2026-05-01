/**
 * RSS feed AVRA blog — sert /blog/feed.xml
 *
 * Format RSS 2.0 + extension Atom self-link. Compatible avec tous les
 * agregateurs (Feedly, Inoreader, NetNewsWire, etc.) et boost le SEO via
 * un signal de fraicheur supplementaire pour Google.
 *
 * ISR : revalide toutes les heures (3600s) pour reflecter les nouveaux
 * articles publies sans rebuild complet du site.
 */

const SITE_URL = 'https://avra-app.fr';
const FEED_TITLE = 'Blog AVRA — Conseils et guides pour les pros de l\'agencement';
const FEED_DESC = "Guides pratiques, comparatifs logiciels, conseils metier et actualites pour cuisinistes, menuisiers et architectes d'interieur.";

type Article = {
  slug: string;
  title: string;
  description: string;
  pubDate: string; // RFC 822
  category: string;
};

// Liste centralisee des articles. A maintenir en parallele de blog/page.tsx.
// (Une refacto possible plus tard : extraire dans blog/articles.ts partage.)
const ARTICLES: Article[] = [
  {
    slug: 'comment-choisir-erp-cuisiniste',
    title: 'Comment choisir son logiciel ERP de cuisiniste en 2026',
    description: '12 criteres essentiels, comparatif des solutions, pieges a eviter et methode en 1 semaine pour comparer 3 logiciels sans se tromper.',
    pubDate: 'Tue, 28 Apr 2026 08:00:00 GMT',
    category: 'Guide',
  },
  {
    slug: 'devis-cuisine-modele-mentions-legales',
    title: 'Devis cuisine 2026 : modele, mentions legales obligatoires et pieges a eviter',
    description: 'Le guide complet du devis cuisine professionnel : 14 mentions obligatoires, modele pret a l\'emploi et 9 leviers pour augmenter votre taux de signature.',
    pubDate: 'Sat, 25 Apr 2026 08:00:00 GMT',
    category: 'Reglementation',
  },
  {
    slug: 'ia-architecte-interieur',
    title: "IA pour architectes d'interieur : 7 outils qui changent vraiment le metier en 2026",
    description: 'Photo-realisme, coloriste, moodboards generatifs, reconnaissance de plan : panorama honnete des outils IA qui transforment le metier d\'architecte.',
    pubDate: 'Wed, 22 Apr 2026 08:00:00 GMT',
    category: 'IA',
  },
  {
    slug: 'logiciel-cuisiniste-comparatif',
    title: 'Meilleur logiciel cuisiniste 2026 : top 7 comparatif complet',
    description: 'Decouvrez le comparatif detaille des 7 meilleurs logiciels pour cuisinistes en 2026. Fonctionnalites, prix, points forts et faibles.',
    pubDate: 'Wed, 15 Apr 2026 08:00:00 GMT',
    category: 'Comparatif',
  },
  {
    slug: 'e-facture-2026',
    title: 'E-facture obligatoire 2026 : tout ce que les artisans doivent savoir',
    description: 'La facturation electronique devient obligatoire en 2026. Calendrier, obligations concretes et solutions de conformite.',
    pubDate: 'Sun, 12 Apr 2026 08:00:00 GMT',
    category: 'Reglementation',
  },
];

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildRssXml(): string {
  const items = ARTICLES.map((a) => {
    const link = `${SITE_URL}/blog/${a.slug}`;
    return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escapeXml(a.description)}</description>
      <pubDate>${a.pubDate}</pubDate>
      <category>${escapeXml(a.category)}</category>
    </item>`;
  }).join('\n');

  const lastBuildDate = new Date().toUTCString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(FEED_DESC)}</description>
    <language>fr-FR</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>AVRA Next.js (App Router)</generator>
    <image>
      <url>${SITE_URL}/icons/icon-512x512.png</url>
      <title>${escapeXml(FEED_TITLE)}</title>
      <link>${SITE_URL}/blog</link>
    </image>
${items}
  </channel>
</rss>`;
}

export const revalidate = 3600;

export async function GET() {
  const xml = buildRssXml();
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
