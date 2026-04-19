'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle,
  ArrowRight,
  MessageSquare,
  Shield,
  Zap,
  ChevronDown,
  Users,
  Building2,
  Sparkles,
  Phone,
  TrendingUp,
  FileText,
  Award,
} from 'lucide-react';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

const faqItems = [
  {
    q: "Qu'est-ce qu'un showroom ?",
    a: "Un showroom correspond à un point de vente ou un magasin. Le plan Showroom inclut 1 espace distinct avec ses dossiers, son planning et ses 4 utilisateurs.",
  },
  {
    q: "Puis-je ajouter des utilisateurs supplémentaires ?",
    a: "Le plan Showroom inclut 4 utilisateurs. Pour des besoins supplémentaires ou plusieurs showrooms, le plan Entreprise sur devis est fait pour vous.",
  },
  {
    q: "Y a-t-il un engagement ?",
    a: "Aucun. Résiliez en 1 clic, à tout moment, sans frais — sauf abonnement annuel.",
  },
  {
    q: "Qu'inclut le plan Entreprise ?",
    a: "Le plan Entreprise est entièrement personnalisé : plusieurs showrooms, utilisateurs illimités, intégrations sur-mesure, SLA dédié et accompagnement. Contactez-nous pour un devis.",
  },
];

const showroomFeatures = [
  '1 showroom · 4 utilisateurs inclus',
  'Assistant AVRA',
  'IA photo-réalisme — 160 rendus/mois',
  '50 signatures électroniques/mois',
  'Facturation électronique (module externe)',
  'Dossiers clients illimités',
  'Devis & facturation',
  'Planning & gestion de chantiers',
  'Gestion de stock',
  'E-paiement intégré',
  'Tableau de bord & statistiques',
  'Support 7j/7 inclus',
];

const enterpriseFeatures = [
  'Plusieurs showrooms',
  'Utilisateurs illimités',
  'Tout le plan Showroom inclus',
  'Portails intervenants personnalisés',
  'Intégrations sur-mesure',
  'SSO / SAML',
  'SLA & support dédié',
  'Onboarding & formation inclus',
  'Manager de compte dédié',
  'Facturation personnalisée',
];

import dynamic from 'next/dynamic';
const PWAInstallTarifs = dynamic(() => import('../components/PWAInstallHero').then(m => m.PWAInstallTarifs), { ssr: false });

export default function TarifsClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [annual, setAnnual] = useState(false);

  return (
    <>
      <Nav />

      {/* ── HERO ── */}
      <section
        style={{
          background: '#1e2b22',
          paddingTop: 120,
          paddingBottom: 80,
          paddingLeft: '5%',
          paddingRight: '5%',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 30% 50%, rgba(201,169,110,0.07) 0%, transparent 60%), radial-gradient(circle at 70% 50%, rgba(201,169,110,0.05) 0%, transparent 60%)',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(201,169,110,0.15)',
              border: '1px solid rgba(201,169,110,0.35)',
              borderRadius: 50,
              padding: '6px 20px',
              marginBottom: '1.5rem',
              fontSize: '.8rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase' as const,
              color: '#c9a96e',
            }}
          >
            <Zap size={13} />
            Tarifs simples & transparents
          </div>

          <h1
            style={{
              color: '#ffffff',
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: '1.2rem',
            }}
          >
            Un seul plan.{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #c9a96e, #d4b882)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Tout inclus.
            </span>
          </h1>

          <p
            style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '1.1rem',
              lineHeight: 1.75,
              maxWidth: 520,
              margin: '0 auto',
            }}
          >
            AVRA est conçu pour les professionnels de l&apos;agencement. Un tarif clair,
            toutes les fonctionnalités incluses, sans mauvaise surprise.
          </p>
        </div>
      </section>

      <style>{`
        @keyframes pricePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,169,110,0.4), 0 24px 80px rgba(201,169,110,0.25); }
          50% { box-shadow: 0 0 0 12px rgba(201,169,110,0), 0 24px 80px rgba(201,169,110,0.4); }
        }
        @keyframes badgeGlow {
          0%, 100% { box-shadow: 0 4px 20px rgba(201,169,110,0.5); }
          50% { box-shadow: 0 4px 32px rgba(201,169,110,0.9), 0 0 60px rgba(201,169,110,0.3); }
        }
        @keyframes floatCard {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @media (max-width: 768px) {
          .tarifs-plans-grid {
            grid-template-columns: 1fr !important;
            max-width: 480px;
            margin: 0 auto;
          }
          .tarifs-plans-grid > div:first-child {
            animation: none !important;
          }
          .garanties-top {
            grid-template-columns: 1fr 1fr !important;
          }
          .garanties-bottom {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .garanties-bottom > div {
            width: 100% !important;
          }
        }
        @media (max-width: 480px) {
          .garanties-top {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* ── PLANS ── */}
      <section
        style={{
          background: 'linear-gradient(180deg, #080f09 0%, #0e1810 30%, #152018 60%, #1a2b1e 100%)',
          padding: '80px 5% 120px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow orbs dramatiques */}
        <div style={{ position: 'absolute', top: '10%', left: '5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,0.12) 0%, transparent 65%)', pointerEvents: 'none', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '0%', right: '0%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,0.09) 0%, transparent 65%)', pointerEvents: 'none', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 300, background: 'radial-gradient(ellipse, rgba(201,169,110,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 56 }}>
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 50, padding: 5, gap: 4, backdropFilter: 'blur(12px)' }}>
            <button onClick={() => setAnnual(false)} style={{ padding: '9px 26px', borderRadius: 50, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '.88rem', fontWeight: 700, background: !annual ? 'linear-gradient(135deg, #c9a96e, #a67749)' : 'transparent', color: !annual ? '#ffffff' : 'rgba(255,255,255,0.5)', transition: 'all 0.25s ease', boxShadow: !annual ? '0 4px 16px rgba(201,169,110,0.35)' : 'none' }}>
              Mensuel
            </button>
            <button onClick={() => setAnnual(true)} style={{ padding: '9px 26px', borderRadius: 50, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '.88rem', fontWeight: 700, background: annual ? 'linear-gradient(135deg, #c9a96e, #a67749)' : 'transparent', color: annual ? '#ffffff' : 'rgba(255,255,255,0.5)', transition: 'all 0.25s ease', display: 'flex', alignItems: 'center', gap: 8, boxShadow: annual ? '0 4px 16px rgba(201,169,110,0.35)' : 'none' }}>
              Annuel
              <span style={{ background: annual ? 'rgba(255,255,255,0.25)' : 'rgba(201,169,110,0.25)', color: annual ? '#fff' : '#c9a96e', borderRadius: 50, padding: '2px 8px', fontSize: '.7rem', fontWeight: 700 }}>-13%</span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="tarifs-plans-grid" style={{ maxWidth: 1060, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.08fr 0.92fr', gap: 20, alignItems: 'start' }}>

          {/* ══════════════════════════════════
              CARTE INDÉPENDANT — HERO
          ══════════════════════════════════ */}
          <div style={{ position: 'relative', animation: 'floatCard 6s ease-in-out infinite' }}>
            {/* Halo doré derrière la carte */}
            <div style={{ position: 'absolute', inset: -3, borderRadius: 32, background: 'linear-gradient(135deg, #f0d080, #c9a96e, #8a5c2a, #c9a96e, #f0d080)', backgroundSize: '300% 300%', animation: 'shimmer 4s linear infinite', zIndex: 0 }} />
            {/* Card body */}
            <div style={{ position: 'relative', zIndex: 1, background: 'linear-gradient(155deg, #ffffff 0%, #fdf9f3 60%, #f7f0e6 100%)', borderRadius: 30, padding: '3rem 3rem 3rem', overflow: 'hidden' }}>

              {/* Fond décoratif lumière */}
              <div style={{ position: 'absolute', top: -80, right: -80, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />

              {/* Badge flottant */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #c9a96e, #a67749)', color: '#fff', borderRadius: 50, padding: '6px 20px', fontSize: '.73rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' as const, animation: 'badgeGlow 2.5s ease-in-out infinite', marginBottom: '1.6rem' }}>
                ⭐ Le plus populaire
              </div>

              {/* En-tête plan */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: '1.6rem' }}>
                <div style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg, #c9a96e 0%, #8a5c2a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 28px rgba(201,169,110,0.5)', flexShrink: 0 }}>
                  <Building2 size={28} style={{ color: '#fff' }} />
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1e2b22', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Indépendant</div>
                  <div style={{ fontSize: '.82rem', color: '#8a9a8d', fontWeight: 500, marginTop: 2 }}>1 showroom · 4 utilisateurs</div>
                </div>
              </div>

              {/* Ligne dorée */}
              <div style={{ height: 2, background: 'linear-gradient(90deg, #c9a96e, #f0d080, #a67749)', borderRadius: 2, marginBottom: '1.8rem', opacity: 0.6 }} />

              {/* Bloc prix */}
              <div style={{ background: 'linear-gradient(135deg, rgba(201,169,110,0.08), rgba(201,169,110,0.04))', border: '1px solid rgba(201,169,110,0.25)', borderRadius: 20, padding: '1.4rem 1.6rem', marginBottom: '1.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: 'clamp(4rem, 8vw, 5.5rem)', fontWeight: 900, color: '#1e2b22', fontFamily: 'var(--font-display)', lineHeight: 1, letterSpacing: '-0.04em' }}>
                    {annual ? '130' : '149'}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 10, gap: 0 }}>
                    <span style={{ fontSize: '2rem', fontWeight: 900, color: '#c9a96e', lineHeight: 1 }}>€</span>
                    <span style={{ fontSize: '.78rem', color: '#8a9a8d', fontWeight: 600, lineHeight: 1.2 }}>/mois</span>
                  </div>
                </div>
                {annual ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.4)', borderRadius: 50, padding: '4px 14px', fontSize: '.78rem', fontWeight: 700, color: '#a67749' }}>
                    💰 Économisez 228€/an
                  </div>
                ) : (
                  <div style={{ fontSize: '.82rem', color: '#8a9a8d' }}>
                    Soit <strong style={{ color: '#a67749' }}>130€/mois</strong> en abonnement annuel
                  </div>
                )}
              </div>

              {/* CTA principal */}
              <a href="/comment-ca-marche" style={{ textDecoration: 'none', display: 'block', marginBottom: '2rem' }}>
                <button style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '18px 28px', background: 'linear-gradient(135deg, #c9a96e 0%, #b8843a 50%, #a67749 100%)', color: '#fff', border: 'none', borderRadius: 16, fontSize: '1.05rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 40px rgba(201,169,110,0.55), 0 2px 8px rgba(0,0,0,0.1)', letterSpacing: '0.01em', animation: 'pricePulse 3s ease-in-out infinite' }}>
                  Demander une démo
                  <ArrowRight size={19} />
                </button>
              </a>

              {/* Features */}
              <div style={{ fontSize: '.72rem', fontWeight: 800, color: '#c9a96e', textTransform: 'uppercase' as const, letterSpacing: '0.14em', marginBottom: '1rem' }}>Tout est inclus</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {showroomFeatures.map((f) => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 8, background: 'linear-gradient(135deg, rgba(201,169,110,0.2), rgba(201,169,110,0.08))', border: '1px solid rgba(201,169,110,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle size={13} style={{ color: '#c9a96e' }} />
                    </div>
                    <span style={{ fontSize: '.9rem', color: '#2e4030', fontWeight: 500 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════
              CARTE MES ÉQUIPES
          ══════════════════════════════════ */}
          <div style={{ background: 'linear-gradient(155deg, #111d13 0%, #1a2b1e 50%, #0f1a11 100%)', borderRadius: 28, padding: '2.6rem 2.4rem', border: '1px solid rgba(201,169,110,0.18)', boxShadow: '0 32px 100px rgba(0,0,0,0.6)', position: 'relative', overflow: 'hidden' }}>
            {/* Cercles décoratifs */}
            <div style={{ position: 'absolute', top: -80, right: -80, width: 260, height: 260, borderRadius: '50%', border: '1px solid rgba(201,169,110,0.07)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: -130, right: -130, width: 380, height: 380, borderRadius: '50%', border: '1px solid rgba(201,169,110,0.04)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -40, left: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.25)', borderRadius: 50, padding: '5px 16px', fontSize: '.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#c9a96e', marginBottom: '1.6rem' }}>
              🏢 Multi-sites
            </div>

            {/* En-tête */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.6rem' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Users size={26} style={{ color: '#c9a96e' }} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Mes équipes</div>
                <div style={{ fontSize: '.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500, marginTop: 2 }}>Franchises · Groupes · Grandes structures</div>
              </div>
            </div>

            {/* Ligne */}
            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.3), transparent)', marginBottom: '1.8rem' }} />

            {/* Prix */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontSize: 'clamp(2.8rem, 5.5vw, 3.8rem)', fontWeight: 900, color: '#c9a96e', fontFamily: 'var(--font-display)', lineHeight: 1, letterSpacing: '-0.03em', marginBottom: 10 }}>
                Sur devis
              </div>
              <div style={{ fontSize: '.84rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                Tarif personnalisé selon le nombre de showrooms et d&apos;utilisateurs.
              </div>
            </div>

            {/* CTA */}
            <a href="/contact" style={{ textDecoration: 'none', display: 'block', marginBottom: '2rem' }}>
              <button style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '17px 24px', background: 'transparent', color: '#c9a96e', border: '1.5px solid rgba(201,169,110,0.45)', borderRadius: 14, fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.01em', transition: 'all 0.25s ease' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(201,169,110,0.12)'; el.style.borderColor = 'rgba(201,169,110,0.7)'; el.style.boxShadow = '0 0 24px rgba(201,169,110,0.2)'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.borderColor = 'rgba(201,169,110,0.45)'; el.style.boxShadow = 'none'; }}
              >
                <Phone size={17} />
                Nous contacter
              </button>
            </a>

            {/* Features */}
            <div style={{ fontSize: '.72rem', fontWeight: 800, color: 'rgba(201,169,110,0.6)', textTransform: 'uppercase' as const, letterSpacing: '0.14em', marginBottom: '1rem' }}>Ce qui est inclus</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {enterpriseFeatures.map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle size={11} style={{ color: '#c9a96e' }} />
                  </div>
                  <span style={{ fontSize: '.87rem', color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── INCLUS PARTOUT ── */}
      <section
        style={{
          background: '#1e2b22',
          padding: '80px 5%',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow décoratif */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(201,169,110,0.09) 0%, transparent 55%), radial-gradient(ellipse at 80% 50%, rgba(201,169,110,0.06) 0%, transparent 55%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.35)',
              borderRadius: 50, padding: '5px 18px', marginBottom: '1rem',
              fontSize: '.76rem', fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase' as const, color: '#c9a96e',
            }}>
              <Award size={12} />
              Inclus partout
            </div>
            <h2 style={{
              color: '#ffffff', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
              fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: '0.6rem',
            }}>
              Quel que soit votre plan
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '.95rem' }}>
              Ces garanties s&apos;appliquent à tous nos abonnements.
            </p>
          </div>

          {/* Cards — ligne de 4 + ligne de 2 centrée */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            marginBottom: 16,
          }}
          className="garanties-top"
          >
            {[
              { icon: MessageSquare, title: 'Support humain', desc: 'Email, chat ou téléphone. Réponse en moins de 2h ouvrées.' },
              { icon: Zap, title: 'Mises à jour incluses', desc: 'Nouvelles fonctionnalités chaque mois, sans surcoût.' },
              { icon: Shield, title: 'Sécurité RGPD', desc: 'Hébergement France, chiffrement AES-256, sauvegardes quotidiennes.' },
              { icon: Award, title: 'Onboarding offert', desc: 'Configuration, import de données et formation à votre rythme.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(201,169,110,0.15)',
                  borderRadius: 20,
                  padding: '1.75rem 1.5rem',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(201,169,110,0.08)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,169,110,0.4)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,169,110,0.15)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '1rem', color: '#c9a96e',
                }}>
                  <Icon size={19} />
                </div>
                <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: 6, fontSize: '.95rem' }}>{title}</div>
                <div style={{ fontSize: '.84rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65 }}>{desc}</div>
              </div>
            ))}
          </div>

          {/* Ligne du bas — 2 cards centrées */}
          <div className="garanties-bottom" style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            {[
              { icon: TrendingUp, title: 'Sans engagement', desc: 'Résiliation en 1 clic, quand vous voulez — hormis abonnement annuel.' },
              { icon: FileText, title: 'E-facture 2026', desc: 'Conformité obligatoire UBL/XML incluse d\'emblée. Module intégré.', highlight: true },
            ].map(({ icon: Icon, title, desc, highlight }) => (
              <div
                key={title}
                style={{
                  background: highlight ? 'rgba(201,169,110,0.1)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${highlight ? 'rgba(201,169,110,0.4)' : 'rgba(201,169,110,0.15)'}`,
                  borderRadius: 20,
                  padding: '1.75rem 1.5rem',
                  width: 'calc(25% - 8px)',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(201,169,110,0.12)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = highlight ? 'rgba(201,169,110,0.1)' : 'rgba(255,255,255,0.05)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '1rem', color: '#c9a96e',
                }}>
                  <Icon size={19} />
                </div>
                <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: 6, fontSize: '.95rem' }}>{title}</div>
                <div style={{ fontSize: '.84rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ background: '#f9f6f0', padding: '80px 5%' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2
            style={{
              textAlign: 'center',
              fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
              fontFamily: 'var(--font-display)',
              color: '#1e2b22',
              marginBottom: '2.5rem',
            }}
          >
            Questions fréquentes
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {faqItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  borderRadius: 14,
                  border: `1px solid ${openFaq === idx ? 'rgba(201,169,110,0.4)' : 'rgba(48,64,53,0.1)'}`,
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '18px 22px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: '.95rem',
                    fontWeight: 600,
                    color: '#1e2b22',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    size={18}
                    style={{
                      color: openFaq === idx ? '#c9a96e' : '#6b7c70',
                      transform: openFaq === idx ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease',
                      flexShrink: 0,
                    }}
                  />
                </button>
                {openFaq === idx && (
                  <div
                    style={{
                      padding: '0 22px 18px',
                      fontSize: '.9rem',
                      color: '#6b7c70',
                      lineHeight: 1.75,
                      borderTop: '1px solid rgba(201,169,110,0.12)',
                      paddingTop: 14,
                    }}
                  >
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ APP BANNER ════════ */}
      <section style={{
        background: 'linear-gradient(135deg, #0a0f0b 0%, #0e1810 100%)',
        padding: '60px 5%',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse at 20% 50%, rgba(201,169,110,0.07) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '32px', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '1.8rem' }}>📲</span>
              <h2 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
                Disponible sur tous vos appareils
              </h2>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', maxWidth: '480px', lineHeight: 1.65, margin: 0 }}>
              iPhone, Android, PC, Mac — installez AVRA en 2 clics depuis votre navigateur. Pas d&apos;App Store requis.
            </p>
            <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
              {['🤖 Android', '🍎 iPhone / iPad', '💻 PC / Mac'].map((p, i) => (
                <span key={i} style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50px', padding: '4px 12px' }}>{p}</span>
              ))}
            </div>
          </div>
          <PWAInstallTarifs />
        </div>
      </section>

      <Footer />
    </>
  );
}
