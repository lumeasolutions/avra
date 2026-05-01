
import type { Metadata } from 'next';
import Nav from '../(marketing)/components/Nav';
import Footer from '../(marketing)/components/Footer';
import ScrollReveal from '../(marketing)/components/ScrollReveal';
import BetaBanner from '../(marketing)/components/BetaBanner';
import BlogArticleCard from './BlogArticleCard';
import NewsletterForm from './NewsletterForm';
import BlogList from './BlogList';
import '../(marketing)/marketing.css';

export const metadata: Metadata = {
  title: 'Blog AVRA — Conseils et guides pour les pros de l\'agencement',
  description: 'Guides pratiques, comparatifs logiciels, conseils métier et actualités pour cuisinistes, menuisiers et architectes d\'intérieur. En savoir plus sur AVRA.',
  alternates: {
    canonical: 'https://avra-app.fr/blog',
    types: {
      'application/rss+xml': [
        { url: 'https://avra-app.fr/blog/feed.xml', title: 'Blog AVRA — RSS feed' },
      ],
    },
  },
  openGraph: {
    title: 'Blog AVRA — Conseils et guides pour les pros de l\'agencement',
    description: 'Guides pratiques, comparatifs logiciels, conseils métier et actualités pour cuisinistes, menuisiers et architectes d\'intérieur.',
    url: 'https://avra-app.fr/blog',

    images: ['/opengraph-image.png'],
  },
};

const articles = [
  {
    slug: 'comment-choisir-erp-cuisiniste',
    title: 'Comment choisir son logiciel ERP de cuisiniste en 2026 — Guide complet',
    excerpt: '12 critères essentiels, comparatif des solutions, pièges à éviter et méthode en 1 semaine pour comparer 3 logiciels sans se tromper.',
    date: '28 avril 2026',
    readTime: '15 min',
    tags: ['Guide', 'ERP', 'Cuisiniste']
  },
  {
    slug: 'devis-cuisine-modele-mentions-legales',
    title: 'Devis cuisine 2026 : modèle, mentions légales obligatoires et pièges à éviter',
    excerpt: 'Le guide complet du devis cuisine professionnel : 14 mentions obligatoires, modèle prêt à l\'emploi et 9 leviers pour augmenter votre taux de signature.',
    date: '25 avril 2026',
    readTime: '14 min',
    tags: ['Réglementation', 'Devis', 'Cuisiniste']
  },
  {
    slug: 'ia-architecte-interieur',
    title: 'IA pour architectes d\'intérieur : 7 outils qui changent vraiment le métier en 2026',
    excerpt: 'Photo-réalisme, coloriste, moodboards génératifs, reconnaissance de plan : panorama honnête des outils IA qui transforment le métier d\'architecte.',
    date: '22 avril 2026',
    readTime: '13 min',
    tags: ['IA', 'Architecture intérieure', 'Outils']
  },
  {
    slug: 'logiciel-cuisiniste-comparatif',
    title: 'Meilleur logiciel cuisiniste 2026 : top 7 comparatif complet',
    excerpt: 'Découvrez le comparatif détaillé des 7 meilleurs logiciels pour cuisinistes en 2026. Fonctionnalités, prix, points forts et faibles.',
    date: '15 avril 2026',
    readTime: '8 min',
    tags: ['Logiciels', 'Comparatif', 'Cuisiniste']
  },
  {
    slug: 'e-facture-2026',
    title: 'E-facture obligatoire 2026 : tout ce que les artisans doivent savoir',
    excerpt: 'La facturation électronique devient obligatoire en 2026. Calendrier, obligations concrètes et solutions de conformité.',
    date: '12 avril 2026',
    readTime: '10 min',
    tags: ['E-facture', 'Réglementation', 'Facturation']
  }
];

export default function BlogPage() {
  return (
    <>
      <BetaBanner />
      <Nav />
      <ScrollReveal />

      {/* Hero */}
      <section className="section-pad" style={{ background: 'linear-gradient(135deg, #f9f6f0 0%, #ede5dd 100%)' }}>
        <div className="container">
          <h1 style={{ fontSize: 'clamp(2.2rem, 5.5vw, 4rem)', marginBottom: '16px', color: '#1e2b22', fontWeight: 800 }}>
            Le blog des pros de l'agencement
          </h1>

          <p style={{ fontSize: '1.2rem', color: '#6b7c70', marginBottom: '24px', maxWidth: '700px' }}>
            Guides pratiques, comparatifs logiciels, conseils métier et actualités pour cuisinistes, menuisiers, architectes d'intérieur et agenceurs.
          </p>
        </div>
      </section>

      {/* À la une */}
      <section className="section-pad" style={{ background: '#ffffff' }}>
        <div className="container">
          <h2 style={{ fontSize: '1.75rem', marginBottom: '48px', color: '#1e2b22' }}>À la une</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '40px', marginBottom: '60px' }}>
            {articles.map((article) => (
              <BlogArticleCard
                key={article.slug}
                slug={article.slug}
                title={article.title}
                excerpt={article.excerpt}
                date={article.date}
                readTime={article.readTime}
                tags={article.tags}
                variant="featured"
              />
            ))}
          </div>

          <h2 style={{ fontSize: '1.75rem', marginBottom: '24px', color: '#1e2b22' }}>Tous les articles</h2>

          <BlogList articles={articles} />
        </div>
      </section>

      {/* Newsletter */}
      <section className="section-pad" style={{ background: '#f9f6f0' }}>
        <div className="container">
          <div style={{ maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '16px', color: '#1e2b22' }}>
              Recevez nos guides et conseils
            </h2>

            <p style={{ fontSize: '1rem', color: '#6b7c70', marginBottom: '32px' }}>
              Inscrivez-vous à notre newsletter. Actualisé avec les meilleurs conseils pour pros de l'agencement.
            </p>

            <NewsletterForm />

            <p style={{ fontSize: '0.85rem', color: '#6b7c70', marginTop: '12px' }}>
              Nous respectons votre vie privée. Pas de spam. Désinscription facile.
            </p>
          </div>
        </div>
      </section>

      <Footer />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Blog', name: 'Blog AVRA', description: "Blog des professionnels de l'agencement intérieur", url: 'https://avra-app.fr/blog' }) }} />

      <style>{`
        .container { max-width: 1200px; margin: 0 auto; }
        .reveal { opacity: 0; transform: translateY(20px); animation: revealAnim 0.8s ease forwards; }
        @keyframes revealAnim { to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}
