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
          background: 'linear-gradient(160deg, #0e1810 0%, #1e2b22 40%, #243020 100%)',
          padding: '80px 5% 100px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '-10%', left: '15%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

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
        <div style={{ maxWidth: 1020, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'stretch' }}>

          {/* ── Indépendant ── */}
          <div style={{ position: 'relative', borderRadius: 28, overflow: 'visible' }}>
            {/* Glow border effect */}
            <div style={{ position: 'absolute', inset: -2, borderRadius: 30, background: 'linear-gradient(135deg, #c9a96e, #f0d080, #a67749)', zIndex: 0, opacity: 0.8 }} />
            <div style={{ position: 'relative', zIndex: 1, background: 'linear-gradient(160deg, #ffffff 0%, #faf7f2 100%)', borderRadius: 28, padding: '2.8rem', height: '100%', boxSizing: 'border-box' as const }}>

              {/* Badge */}
              <div style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #c9a96e, #a67749)', color: '#fff', borderRadius: 50, padding: '5px 22px', fontSize: '.73rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const, boxShadow: '0 4px 20px rgba(201,169,110,0.5)', zIndex: 10 }}>
                ⭐ Le plus populaire
              </div>

              {/* Plan name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '2rem', paddingTop: '0.5rem' }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #c9a96e, #a67749)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(201,169,110,0.4)', flexShrink: 0 }}>
                  <Building2 size={24} style={{ color: '#fff' }} />
                </div>
                <div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1e2b22', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>Indépendant</div>
                  <div style={{ fontSize: '.8rem', color: '#8a9a8d', fontWeight: 500 }}>Pour les professionnels du showroom</div>
                </div>
              </div>

              {/* Séparateur */}
              <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.4), transparent)', marginBottom: '1.8rem' }} />

              {/* Prix */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 'clamp(3.5rem, 7vw, 4.5rem)', fontWeight: 900, color: '#1e2b22', fontFamily: 'var(--font-display)', lineHeight: 1, letterSpacing: '-0.03em' }}>
                    {annual ? '130' : '149'}
                  </span>
                  <div style={{ paddingBottom: 8 }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#c9a96e', lineHeight: 1 }}>€</div>
                    <div style={{ fontSize: '.78rem', color: '#8a9a8d', fontWeight: 600 }}>/mois</div>
                  </div>
                </div>
                {annual ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.3)', borderRadius: 50, padding: '3px 12px', fontSize: '.78rem', fontWeight: 700, color: '#a67749' }}>
                    💰 Économisez 228€/an
                  </div>
                ) : (
                  <div style={{ fontSize: '.82rem', color: '#8a9a8d' }}>ou <strong style={{ color: '#a67749' }}>130€/mois</strong> en annuel</div>
                )}
              </div>

              {/* CTA */}
              <a href="/comment-ca-marche" style={{ textDecoration: 'none', display: 'block', marginBottom: '2rem' }}>
                <button style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px 24px', background: 'linear-gradient(135deg, #c9a96e, #a67749)', color: '#ffffff', border: 'none', borderRadius: 14, fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 32px rgba(201,169,110,0.45)', letterSpacing: '0.01em' }}>
                  Demander une démo
                  <ArrowRight size={18} />
                </button>
              </a>

              {/* Tag inclus */}
              <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#8a9a8d', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '0.9rem' }}>Ce qui est inclus</div>

              {/* Features */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {showroomFeatures.map((f) => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(201,169,110,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle size={12} style={{ color: '#c9a96e' }} />
                    </div>
                    <span style={{ fontSize: '.88rem', color: '#304035', fontWeight: 500, lineHeight: 1.4 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Mes équipes ── */}
          <div style={{ background: 'linear-gradient(160deg, #0e1810 0%, #1a2b1e 100%)', borderRadius: 28, padding: '2.8rem', border: '1px solid rgba(201,169,110,0.2)', boxShadow: '0 24px 80px rgba(0,0,0,0.4)', position: 'relative', overflow: 'hidden' }}>
            {/* Pattern décoratif */}
            <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', border: '1px solid rgba(201,169,110,0.08)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: '50%', border: '1px solid rgba(201,169,110,0.05)', pointerEvents: 'none' }} />

            {/* Plan name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '2rem' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Users size={24} style={{ color: '#c9a96e' }} />
              </div>
              <div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>Mes équipes</div>
                <div style={{ fontSize: '.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Franchises · Groupes · Grandes structures</div>
              </div>
            </div>

            {/* Séparateur */}
            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.25), transparent)', marginBottom: '1.8rem' }} />

            {/* Prix */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontSize: 'clamp(2.4rem, 5vw, 3.2rem)', fontWeight: 900, color: '#c9a96e', fontFamily: 'var(--font-display)', lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 8 }}>
                Sur devis
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: 50, padding: '4px 14px', fontSize: '.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                Tarif personnalisé selon vos besoins
              </div>
            </div>

            {/* CTA */}
            <a href="/contact" style={{ textDecoration: 'none', display: 'block', marginBottom: '2rem' }}>
              <button style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px 24px', background: 'rgba(201,169,110,0.12)', color: '#c9a96e', border: '1.5px solid rgba(201,169,110,0.4)', borderRadius: 14, fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.01em', transition: 'all 0.2s ease' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(201,169,110,0.2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(201,169,110,0.12)'; }}
              >
                <Phone size={17} />
                Nous contacter
              </button>
            </a>

            {/* Tag inclus */}
            <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '0.9rem' }}>Ce qui est inclus</div>

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {enterpriseFeatures.map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(201,169,110,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle size={12} style={{ color: '#c9a96e' }} />
                  </div>
                  <span style={{ fontSize: '.88rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500, lineHeight: 1.4 }}>{f}</span>
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
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
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

      <Footer />
    </>
  );
}
