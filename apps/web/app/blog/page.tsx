
import type { Metadata } from 'next';
import Nav from '../(marketing)/components/Nav';
import Footer from '../(marketing)/components/Footer';
import ScrollReveal from '../(marketing)/components/ScrollReveal';
import Link from 'next/link';
import { Calendar, Clock, Tag, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Blog AVRA — Conseils et guides pour les pros de l\'agencement',
  description: 'Guides pratiques, comparatifs logiciels, conseils métier et actualités pour cuisinistes, menuisiers et architectes d\'intérieur. En savoir plus sur AVRA.',
  alternates: { canonical: 'https://avra.fr/blog' },
  openGraph: {
    title: 'Blog AVRA — Conseils et guides pour les pros de l\'agencement',
    description: 'Guides pratiques, comparatifs logiciels, conseils métier et actualités pour cuisinistes, menuisiers et architectes d\'intérieur.',
    url: 'https://avra.fr/blog',
  },
};

const articles = [
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
      <Nav />
      <ScrollReveal />

      {/* Hero */}
      <section style={{ padding: '80px 5%', background: 'linear-gradient(135deg, #f9f6f0 0%, #ede5dd 100%)' }}>
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
      <section style={{ padding: '80px 5%', background: '#ffffff' }}>
        <div className="container">
          <h2 style={{ fontSize: '1.75rem', marginBottom: '48px', color: '#1e2b22' }}>À la une</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '40px', marginBottom: '60px' }}>
            {articles.map((article) => (
              <Link key={article.slug} href={`/blog/${article.slug}`} style={{ textDecoration: 'none' }}>
                <div className="reveal" style={{
                  padding: '32px',
                  background: '#f9f6f0',
                  borderRadius: '12px',
                  border: '2px solid rgba(201,169,110,0.25)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#c9a96e';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(201,169,110,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(201,169,110,0.25)';
                  e.currentTarget.style.boxShadow = 'none';
                }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px', lineHeight: 1.4 }}>
                    {article.title}
                  </h3>

                  <p style={{ fontSize: '1rem', color: '#6b7c70', marginBottom: '16px', flex: 1, lineHeight: 1.6 }}>
                    {article.excerpt}
                  </p>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem', color: '#6b7c70', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(201,169,110,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={16} />
                      {article.date}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={16} />
                      {article.readTime}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <h2 style={{ fontSize: '1.75rem', marginBottom: '48px', color: '#1e2b22' }}>Tous les articles</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '32px' }}>
            {articles.map((article) => (
              <Link key={article.slug} href={`/blog/${article.slug}`} style={{ textDecoration: 'none' }}>
                <div className="reveal" style={{
                  padding: '24px',
                  background: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid rgba(201,169,110,0.15)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 24px rgba(30,43,34,0.12)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>
                    {article.title}
                  </h3>

                  <p style={{ fontSize: '0.95rem', color: '#6b7c70', marginBottom: '12px', flex: 1 }}>
                    {article.excerpt}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                    {article.tags.map((tag) => (
                      <span key={tag} style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        background: 'rgba(201,169,110,0.1)',
                        color: '#c9a96e',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: 500
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', color: '#6b7c70', paddingTop: '12px', borderTop: '1px solid rgba(201,169,110,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Calendar size={14} />
                      {article.date}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={14} />
                      {article.readTime}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section style={{ padding: '80px 5%', background: '#f9f6f0' }}>
        <div className="container">
          <div style={{ maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '16px', color: '#1e2b22' }}>
              Recevez nos guides et conseils
            </h2>

            <p style={{ fontSize: '1rem', color: '#6b7c70', marginBottom: '32px' }}>
              Inscrivez-vous à notre newsletter. Actualisé avec les meilleurs conseils pour pros de l'agencement.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input type="email" placeholder="votre@email.fr" style={{
                flex: 1,
                minWidth: '200px',
                padding: '12px 16px',
                border: '1px solid rgba(30,43,34,0.2)',
                borderRadius: '8px',
                fontSize: '1rem',
                fontFamily: 'inherit'
              }} />
              <button style={{
                padding: '12px 32px',
                background: '#1e2b22',
                color: '#f9f6f0',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#253029'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#1e2b22'}>
                S'inscrire
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#6b7c70', marginTop: '12px' }}>
              Nous respectons votre vie privée. Pas de spam. Désinscription facile.
            </p>
          </div>
        </div>
      </section>

      <Footer />

      <script type="application/ld+json">{JSON.stringify({ '@context': 'https://schema.org', '@type': 'Blog', name: 'Blog AVRA', description: 'Blog des professionnels de l\'agencement intérieur', url: 'https://avra.fr/blog' })}</script>

      <style jsx>{`
        .container { max-width: 1200px; margin: 0 auto; }
        .reveal { opacity: 0; transform: translateY(20px); animation: revealAnim 0.8s ease forwards; }
        @keyframes revealAnim { to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}
