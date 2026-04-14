'use client';

import { useState } from 'react';
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
    a: "Aucun. Résiliez en 1 clic, à tout moment, sans frais.",
  },
  {
    q: "Comment fonctionne l'essai gratuit ?",
    a: "14 jours d'accès complet sans carte bancaire. Aucun prélèvement automatique à l'expiration.",
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

      {/* ── PLANS ── */}
      <section
        style={{
          background: '#f9f6f0',
          padding: '80px 5%',
        }}
      >
        {/* Toggle mensuel / annuel */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 48 }}>
          <div
            style={{
              display: 'inline-flex',
              background: '#e8e2d9',
              borderRadius: 50,
              padding: 4,
              gap: 4,
            }}
          >
            <button
              onClick={() => setAnnual(false)}
              style={{
                padding: '8px 22px',
                borderRadius: 50,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '.88rem',
                fontWeight: 700,
                background: !annual ? '#1e2b22' : 'transparent',
                color: !annual ? '#ffffff' : '#6b7c70',
                transition: 'all 0.2s ease',
              }}
            >
              Mensuel
            </button>
            <button
              onClick={() => setAnnual(true)}
              style={{
                padding: '8px 22px',
                borderRadius: 50,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '.88rem',
                fontWeight: 700,
                background: annual ? '#1e2b22' : 'transparent',
                color: annual ? '#ffffff' : '#6b7c70',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              Annuel
              <span
                style={{
                  background: 'linear-gradient(135deg, #c9a96e, #a67749)',
                  color: '#fff',
                  borderRadius: 50,
                  padding: '2px 8px',
                  fontSize: '.72rem',
                  fontWeight: 700,
                }}
              >
                -13%
              </span>
            </button>
          </div>
        </div>
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: 28,
            alignItems: 'start',
          }}
        >
          {/* ── Plan Showroom ── */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 24,
              padding: '2.5rem',
              border: '2px solid #c9a96e',
              boxShadow: '0 12px 48px rgba(201,169,110,0.15)',
              position: 'relative',
            }}
          >
            {/* Badge populaire */}
            <div
              style={{
                position: 'absolute',
                top: -14,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #c9a96e, #a67749)',
                color: '#ffffff',
                borderRadius: 50,
                padding: '4px 20px',
                fontSize: '.75rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                whiteSpace: 'nowrap' as const,
              }}
            >
              ⭐ Le plus populaire
            </div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem', marginTop: '0.5rem' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'rgba(201,169,110,0.12)',
                  border: '1px solid rgba(201,169,110,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Building2 size={22} style={{ color: '#c9a96e' }} />
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e2b22', fontFamily: 'var(--font-display)' }}>
                  Indépendant
                </div>
                <div style={{ fontSize: '.82rem', color: '#6b7c70' }}>Pour les professionnels indépendants</div>
              </div>
            </div>

            {/* Prix */}
            <div style={{ marginBottom: '1.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span
                  style={{
                    fontSize: 'clamp(3rem, 6vw, 3.8rem)',
                    fontWeight: 900,
                    color: '#1e2b22',
                    fontFamily: 'var(--font-display)',
                    lineHeight: 1,
                  }}
                >
                  {annual ? '130€' : '149€'}
                </span>
                <span style={{ fontSize: '1rem', color: '#6b7c70', fontWeight: 500 }}>/mois</span>
              </div>
              {annual && (
                <div style={{ fontSize: '.82rem', color: '#c9a96e', fontWeight: 600, marginTop: 2 }}>
                  soit 1 560€/an · économisez 228€
                </div>
              )}
              <p style={{ fontSize: '.88rem', color: '#6b7c70', marginTop: 6, lineHeight: 1.6 }}>
                1 showroom · 4 utilisateurs inclus · sans engagement
              </p>
            </div>

            {/* CTA */}
            <a href="/register" style={{ textDecoration: 'none', display: 'block', marginBottom: '2rem' }}>
              <button
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '15px 24px',
                  background: 'linear-gradient(135deg, #c9a96e, #a67749)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: '0 6px 24px rgba(201,169,110,0.35)',
                }}
              >
                Demander une démo
                <ArrowRight size={18} />
              </button>
            </a>

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {showroomFeatures.map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle size={16} style={{ color: '#c9a96e', flexShrink: 0 }} />
                  <span style={{ fontSize: '.92rem', color: '#1e2b22', fontWeight: 500 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Plan Entreprise ── */}
          <div
            style={{
              background: '#1e2b22',
              borderRadius: 24,
              padding: '2.5rem',
              border: '2px solid rgba(201,169,110,0.25)',
              boxShadow: '0 12px 48px rgba(30,43,34,0.2)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'rgba(201,169,110,0.15)',
                  border: '1px solid rgba(201,169,110,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={22} style={{ color: '#c9a96e' }} />
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-display)' }}>
                  Mes équipes
                </div>
                <div style={{ fontSize: '.82rem', color: 'rgba(255,255,255,0.5)' }}>Franchises · Groupes · Grandes structures</div>
              </div>
            </div>

            {/* Prix */}
            <div style={{ marginBottom: '1.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span
                  style={{
                    fontSize: 'clamp(2.2rem, 5vw, 3rem)',
                    fontWeight: 900,
                    color: '#c9a96e',
                    fontFamily: 'var(--font-display)',
                    lineHeight: 1,
                  }}
                >
                  Sur devis
                </span>
              </div>
              <p style={{ fontSize: '.88rem', color: 'rgba(255,255,255,0.5)', marginTop: 6, lineHeight: 1.6 }}>
                Multi-showrooms · Utilisateurs illimités · SLA dédié
              </p>
            </div>

            {/* CTA */}
            <a href="/contact" style={{ textDecoration: 'none', display: 'block', marginBottom: '2rem' }}>
              <button
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '15px 24px',
                  background: 'rgba(201,169,110,0.15)',
                  color: '#c9a96e',
                  border: '1.5px solid rgba(201,169,110,0.5)',
                  borderRadius: 12,
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <Phone size={17} />
                Nous contacter
              </button>
            </a>

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {enterpriseFeatures.map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle size={16} style={{ color: '#c9a96e', flexShrink: 0 }} />
                  <span style={{ fontSize: '.92rem', color: 'rgba(255,255,255,0.82)', fontWeight: 500 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── GARANTIES ── */}
      <section style={{ background: '#ffffff', padding: '60px 5%' }}>
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 24,
          }}
        >
          {[
            { icon: Shield, title: 'Sans engagement', desc: 'Résiliation en 1 clic, à tout moment.' },
            { icon: Zap, title: 'Accès immédiat', desc: "Opérationnel en moins de 5 minutes." },
            { icon: Sparkles, title: 'Tout inclus', desc: "Aucun module payant en supplément." },
            { icon: MessageSquare, title: 'Support 7j/7', desc: 'Réponse en moins de 2h en semaine.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              style={{
                textAlign: 'center',
                padding: '1.5rem 1rem',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'rgba(201,169,110,0.1)',
                  border: '1px solid rgba(201,169,110,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                  color: '#c9a96e',
                }}
              >
                <Icon size={20} />
              </div>
              <div style={{ fontWeight: 700, color: '#1e2b22', marginBottom: 4, fontSize: '.95rem' }}>{title}</div>
              <div style={{ fontSize: '.85rem', color: '#6b7c70', lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
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

      <Footer />
    </>
  );
}
