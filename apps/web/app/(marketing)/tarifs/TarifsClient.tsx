'use client';

import { useState } from 'react';
import {
  CheckCircle,
  X,
  ArrowRight,
  MessageSquare,
  Lock,
  Zap,
  Shield,
  TrendingUp,
  Star,
  ChevronDown,
  ChevronUp,
  Clock,
  Users,
  FileText,
  Camera,
  BarChart2,
  Puzzle,
  Phone,
  Award,
} from 'lucide-react';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Puis-je changer de plan à tout moment ?',
      acceptedAnswer: { '@type': 'Answer', text: "Oui. Vous pouvez passer d'un plan à un autre à tout moment. Les changements sont appliqués immédiatement et facturés au prorata." },
    },
    {
      '@type': 'Question',
      name: "Y a-t-il un engagement ?",
      acceptedAnswer: { '@type': 'Answer', text: "Aucun. Vous pouvez résilier votre abonnement en 1 clic, à tout moment, sans frais ni justification." },
    },
    {
      '@type': 'Question',
      name: "AVRA est-il conforme à la e-facture obligatoire 2026 ?",
      acceptedAnswer: { '@type': 'Answer', text: "Oui. 100% conforme. Toutes vos factures sont automatiquement générées aux normes e-facture UBL/XML." },
    },
    {
      '@type': 'Question',
      name: "Comment fonctionne l'essai gratuit ?",
      acceptedAnswer: { '@type': 'Answer', text: "14 jours d'accès complet sans carte bancaire. Aucun prélèvement automatique. À l'expiration, vous choisissez votre plan ou nous supprimons votre compte." },
    },
  ],
};

const plans = [
  {
    id: 'solo',
    name: 'Solo',
    emoji: '🧑‍💼',
    price: 49,
    desc: 'Pour les indépendants qui veulent un outil professionnel sans complexité.',
    badge: null,
    color: '#3a7d5a',
    colorLight: 'rgba(58,125,90,0.08)',
    cta: "Commencer l'essai gratuit",
    ctaStyle: 'outline',
    users: '1 utilisateur',
    highlights: ['Dossiers clients illimités', 'Devis & Facturation', 'IA 20 rendus/mois', 'Planning basique'],
  },
  {
    id: 'pro',
    name: 'Pro',
    emoji: '🚀',
    price: 89,
    desc: "Le choix des équipes qui veulent aller plus vite et décrocher plus de chantiers.",
    badge: 'Le plus populaire ⭐',
    color: '#C9A96E',
    colorLight: 'rgba(201,169,110,0.1)',
    cta: 'Essayer Pro gratuitement',
    ctaStyle: 'gold',
    users: 'Utilisateurs illimités',
    highlights: ['Tout Solo +', 'IA 100 rendus/mois', 'CRM Pipeline visuel', 'Statistiques avancées'],
  },
  {
    id: 'equipe',
    name: 'Équipe',
    emoji: '🏢',
    price: 149,
    desc: 'Pour les entreprises et franchises qui veulent le contrôle total.',
    badge: null,
    color: '#1e2b22',
    colorLight: 'rgba(30,43,34,0.06)',
    cta: "Contacter l'équipe",
    ctaStyle: 'dark',
    users: 'Multi-agences',
    highlights: ['Tout Pro +', 'IA illimitée', 'SSO & SAML', 'Support 24/7 + Manager'],
  },
];

// Feature comparison table
const featureGroups = [
  {
    label: 'Essentiel',
    icon: FileText,
    features: [
      { name: 'Dossiers clients illimités', solo: true, pro: true, equipe: true },
      { name: 'Devis & Facturation', solo: true, pro: true, equipe: true },
      { name: 'Signature électronique', solo: true, pro: true, equipe: true },
      { name: 'E-facture 2026 (UBL/XML)', solo: true, pro: true, equipe: true },
      { name: 'Gestion de stock', solo: 'Basique', pro: 'Avancée', equipe: 'Complète' },
    ],
  },
  {
    label: 'Équipe & Planning',
    icon: Users,
    features: [
      { name: 'Utilisateurs', solo: '1', pro: 'Illimité', equipe: 'Illimité' },
      { name: 'Planning', solo: 'Basique', pro: 'Avancé + équipe', equipe: 'Multi-agences' },
      { name: 'Pipeline CRM', solo: false, pro: true, equipe: true },
      { name: 'Multi-agences / franchises', solo: false, pro: false, equipe: true },
    ],
  },
  {
    label: 'IA & Rendus 3D',
    icon: Camera,
    features: [
      { name: 'Rendus IA photo-réalistes', solo: '20/mois', pro: '100/mois', equipe: 'Illimité' },
      { name: 'Styles & personnalisation IA', solo: true, pro: true, equipe: true },
    ],
  },
  {
    label: 'Analyses & Intégrations',
    icon: BarChart2,
    features: [
      { name: 'Tableaux de bord & stats', solo: false, pro: true, equipe: true },
      { name: 'API & Webhooks', solo: false, pro: false, equipe: true },
      { name: 'SSO & SAML', solo: false, pro: false, equipe: true },
      { name: 'Intégrations tierces', solo: false, pro: false, equipe: true },
    ],
  },
  {
    label: 'Support & Sécurité',
    icon: Shield,
    features: [
      { name: 'Support', solo: 'Email', pro: 'Email + Chat', equipe: 'Prioritaire 24/7' },
      { name: 'Onboarding', solo: 'Guidé', pro: 'Personnalisé', equipe: 'Dédié sur site' },
      { name: 'Account Manager dédié', solo: false, pro: false, equipe: true },
      { name: 'SLA 99.9%', solo: false, pro: false, equipe: true },
      { name: 'Hébergement France + RGPD', solo: true, pro: true, equipe: true },
    ],
  },
];

const faqs = [
  { q: "Puis-je changer de plan à tout moment ?", a: "Oui, sans problème. Vous pouvez passer d'un plan à un autre à tout moment. Les changements sont appliqués immédiatement et votre facture sera ajustée au prorata." },
  { q: "Y a-t-il un engagement ou des frais cachés ?", a: "Aucun. Vous pouvez résilier votre abonnement en 1 clic à tout moment, sans justification. Aucun frais caché, aucun engagement minimum." },
  { q: "AVRA est-il conforme à la e-facture 2026 ?", a: "Oui, 100% conforme. Toutes les factures générées par AVRA respectent les normes UBL/XML obligatoires en 2026. Conformité garantie dès aujourd'hui." },
  { q: "Comment fonctionne l'essai gratuit ?", a: "14 jours d'accès complet à toutes les fonctionnalités du plan Pro. Aucune carte bancaire requise. Aucun prélèvement automatique. À l'expiration, vous choisissez votre plan ou nous supprimons votre compte." },
  { q: "Puis-je migrer mes données depuis un autre logiciel ?", a: "Oui. Notre équipe vous accompagne pour importer vos dossiers, clients et données depuis votre ancien logiciel. Migration gratuite et assistée incluse dans tous les plans." },
  { q: "Que se passe-t-il si je dépasse mes rendus IA ?", a: "Vous recevez une notification à 80% de votre quota. Vous pouvez acheter des rendus supplémentaires à la carte ou passer au plan supérieur à tout moment." },
];

const testimonials = [
  { name: 'Sophie L.', role: 'Cuisiniste, Paris', text: "J'ai récupéré 3h par jour dès la première semaine. Le plan Pro se rembourse en un seul devis signé.", stars: 5 },
  { name: 'Mathieu R.', role: 'Menuisier, Lyon', text: "Le ROI est immédiat. Mon taux de signature a augmenté de 40% grâce aux rendus IA. Jamais vu ça.", stars: 5 },
  { name: 'Claire B.', role: 'Agenceuse, Bordeaux', text: "Migration en 48h, onboarding top. Mon équipe de 5 personnes a adopté AVRA en moins d'une semaine.", stars: 5 },
];

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) return <CheckCircle size={18} style={{ color: '#3a7d5a', margin: '0 auto', display: 'block' }} />;
  if (value === false) return <X size={16} style={{ color: '#ccc', margin: '0 auto', display: 'block' }} />;
  return <span style={{ fontSize: '.82rem', color: '#4a5e52', fontWeight: 600 }}>{value}</span>;
}

export default function TarifsClient() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [openGroup, setOpenGroup] = useState<number | null>(0);

  const getPrice = (base: number) => isAnnual ? Math.round(base * 0.8) : base;
  const getAnnualSaving = (base: number) => Math.round(base * 12 * 0.2);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />

      {/* ── HERO ── */}
      <section style={{
        paddingTop: '76px',
        background: 'linear-gradient(160deg, #0e1810 0%, #1e2b22 50%, #0e1810 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative glow circles */}
        <div style={{ position: 'absolute', top: '-80px', left: '10%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', right: '8%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(58,125,90,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 780, margin: '0 auto', padding: '80px 5% 60px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* Label */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(201,169,110,0.12)', border: '1px solid rgba(201,169,110,0.25)', borderRadius: '40px', padding: '6px 18px', marginBottom: '2rem' }}>
            <span style={{ color: '#C9A96E', fontSize: '.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tarifs simples & transparents</span>
          </div>

          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem, 5vw, 3.2rem)', lineHeight: 1.15, marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>
            Investissez <span style={{ color: '#C9A96E' }}>49€/mois</span>,<br />récupérez des heures chaque jour
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '1.1rem', maxWidth: 560, margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
            Sans engagement, sans frais cachés. 14 jours d'essai gratuit sans carte bancaire.
          </p>

          {/* Toggle mensuel/annuel */}
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.07)', borderRadius: '50px', padding: '5px', gap: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setIsAnnual(false)}
              style={{
                padding: '10px 28px', borderRadius: '40px',
                background: !isAnnual ? '#C9A96E' : 'transparent',
                color: !isAnnual ? '#0e1810' : 'rgba(255,255,255,0.65)',
                border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '.88rem',
                transition: 'all 0.25s ease',
              }}
            >Mensuel</button>
            <button
              onClick={() => setIsAnnual(true)}
              style={{
                padding: '10px 28px', borderRadius: '40px',
                background: isAnnual ? '#C9A96E' : 'transparent',
                color: isAnnual ? '#0e1810' : 'rgba(255,255,255,0.65)',
                border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '.88rem',
                transition: 'all 0.25s ease',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              Annuel
              <span style={{ background: '#3a7d5a', color: '#fff', fontSize: '.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>−20%</span>
            </button>
          </div>

          {isAnnual && (
            <p style={{ color: '#C9A96E', fontSize: '.85rem', marginTop: '12px', fontWeight: 600 }}>
              ✨ Économisez jusqu'à {getAnnualSaving(149)}€/an sur le plan Équipe
            </p>
          )}
        </div>
      </section>

      {/* ── PRICING CARDS ── */}
      <section style={{ background: '#f7f6f1', padding: '0 5% 80px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Cards pulled up over hero bottom */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
            marginTop: '-40px',
            alignItems: 'start',
          }}>
            {plans.map((plan) => {
              const price = getPrice(plan.price);
              const saving = isAnnual ? getAnnualSaving(plan.price) : 0;
              const isHighlighted = plan.id === 'pro';

              return (
                <div
                  key={plan.id}
                  style={{
                    background: isHighlighted ? '#0e1810' : '#fff',
                    borderRadius: '24px',
                    padding: '2.25rem 2rem',
                    border: isHighlighted ? '2px solid #C9A96E' : '1px solid rgba(30,43,34,0.1)',
                    boxShadow: isHighlighted
                      ? '0 32px 80px rgba(14,24,16,0.35), 0 0 0 1px rgba(201,169,110,0.2)'
                      : '0 4px 24px rgba(30,43,34,0.06)',
                    transform: isHighlighted ? 'translateY(-20px)' : 'none',
                    position: 'relative',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div style={{
                      position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg, #d4b87a, #C9A96E)',
                      color: '#0e1810', padding: '5px 20px', borderRadius: '20px',
                      fontSize: '.75rem', fontWeight: 700, whiteSpace: 'nowrap',
                      boxShadow: '0 4px 16px rgba(201,169,110,0.4)',
                    }}>
                      {plan.badge}
                    </div>
                  )}

                  {/* Header */}
                  <div style={{ marginBottom: '1.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1.6rem' }}>{plan.emoji}</span>
                      <h3 style={{ color: isHighlighted ? '#fff' : '#1e2b22', margin: 0, fontSize: '1.4rem' }}>{plan.name}</h3>
                    </div>
                    <p style={{ color: isHighlighted ? 'rgba(255,255,255,0.55)' : '#7a8e80', fontSize: '.88rem', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
                      {plan.desc}
                    </p>

                    {/* Price */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', marginBottom: '4px' }}>
                      <span style={{
                        fontFamily: 'var(--font-display)', fontSize: '3.5rem', fontWeight: 800, lineHeight: 1,
                        color: isHighlighted ? '#C9A96E' : '#1e2b22',
                      }}>{price}€</span>
                      <span style={{ color: isHighlighted ? 'rgba(255,255,255,0.4)' : '#9aab9e', fontSize: '.95rem', paddingBottom: '8px' }}>/mois</span>
                    </div>
                    {isAnnual && saving > 0 && (
                      <p style={{ color: '#3a7d5a', fontSize: '.8rem', fontWeight: 600, margin: '0 0 1.25rem' }}>
                        Économie de {saving}€/an
                      </p>
                    )}
                    {!isAnnual && <div style={{ marginBottom: '1.25rem' }} />}

                    {/* Users badge */}
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      background: isHighlighted ? 'rgba(255,255,255,0.08)' : plan.colorLight,
                      borderRadius: '20px', padding: '5px 12px',
                    }}>
                      <Users size={13} style={{ color: isHighlighted ? 'rgba(255,255,255,0.6)' : plan.color }} />
                      <span style={{ fontSize: '.78rem', fontWeight: 600, color: isHighlighted ? 'rgba(255,255,255,0.6)' : plan.color }}>{plan.users}</span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <a href="/register" style={{ display: 'block', marginBottom: '1.75rem', textDecoration: 'none' }}>
                    <button style={{
                      width: '100%', padding: '14px 20px', borderRadius: '12px', cursor: 'pointer',
                      fontWeight: 700, fontSize: '.92rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      transition: 'all 0.2s ease',
                      ...(plan.ctaStyle === 'gold' ? {
                        background: 'linear-gradient(135deg, #d4b87a, #C9A96E)',
                        color: '#0e1810', border: 'none',
                        boxShadow: '0 8px 24px rgba(201,169,110,0.35)',
                      } : plan.ctaStyle === 'outline' ? {
                        background: 'transparent', color: '#1e2b22',
                        border: '1.5px solid rgba(30,43,34,0.2)',
                      } : {
                        background: 'rgba(255,255,255,0.1)', color: '#fff',
                        border: '1px solid rgba(255,255,255,0.2)',
                      }),
                    }}>
                      {plan.cta} <ArrowRight size={16} />
                    </button>
                  </a>

                  {/* Feature highlights */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {plan.highlights.map((feat, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CheckCircle size={16} style={{ color: isHighlighted ? '#C9A96E' : '#3a7d5a', flexShrink: 0 }} />
                        <span style={{ fontSize: '.87rem', color: isHighlighted ? 'rgba(255,255,255,0.85)' : '#304035' }}>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA compare */}
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button
              onClick={() => setShowTable(!showTable)}
              style={{
                background: 'transparent', border: '1.5px solid rgba(30,43,34,0.18)',
                borderRadius: '12px', padding: '12px 28px', cursor: 'pointer',
                color: '#1e2b22', fontWeight: 600, fontSize: '.9rem',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              {showTable ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showTable ? 'Masquer' : 'Comparer toutes les fonctionnalités'}
            </button>
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      {showTable && (
        <section style={{ background: '#fff', padding: '60px 5%', borderTop: '1px solid rgba(30,43,34,0.06)' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', color: '#1e2b22', marginBottom: '2.5rem', fontSize: '1.8rem' }}>
              Comparaison détaillée
            </h2>

            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0', marginBottom: '8px', padding: '0 0 16px', borderBottom: '2px solid #f0efe8', position: 'sticky', top: '76px', background: '#fff', zIndex: 10 }}>
              <div />
              {plans.map(p => (
                <div key={p.id} style={{ textAlign: 'center', padding: '8px' }}>
                  <span style={{ fontSize: '1.1rem' }}>{p.emoji}</span>
                  <div style={{ fontWeight: 700, color: p.id === 'pro' ? '#C9A96E' : '#1e2b22', fontSize: '.95rem', marginTop: '4px' }}>{p.name}</div>
                </div>
              ))}
            </div>

            {/* Feature groups */}
            {featureGroups.map((group, gi) => {
              const Icon = group.icon;
              const isOpen = openGroup === gi;
              return (
                <div key={gi} style={{ marginBottom: '4px' }}>
                  <button
                    onClick={() => setOpenGroup(isOpen ? null : gi)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '14px 12px', background: '#f7f6f1', border: 'none', cursor: 'pointer',
                      borderRadius: '10px', marginBottom: '2px',
                    }}
                  >
                    <Icon size={16} style={{ color: '#C9A96E' }} />
                    <span style={{ fontWeight: 700, color: '#1e2b22', fontSize: '.92rem', flex: 1, textAlign: 'left' }}>{group.label}</span>
                    {isOpen ? <ChevronUp size={16} style={{ color: '#9aab9e' }} /> : <ChevronDown size={16} style={{ color: '#9aab9e' }} />}
                  </button>

                  {isOpen && group.features.map((feat, fi) => (
                    <div key={fi} style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
                      padding: '12px 12px',
                      background: fi % 2 === 0 ? '#fff' : '#fafaf7',
                      borderRadius: '8px',
                    }}>
                      <span style={{ fontSize: '.87rem', color: '#4a5e52', paddingRight: '8px' }}>{feat.name}</span>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}><FeatureCell value={feat.solo} /></div>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}><FeatureCell value={feat.pro} /></div>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}><FeatureCell value={feat.equipe} /></div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── INCLUS DANS TOUS LES PLANS ── */}
      <section style={{ background: '#f7f6f1', padding: '80px 5%' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: '40px', padding: '6px 18px', marginBottom: '1rem' }}>
              <span style={{ color: '#C9A96E', fontSize: '.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Inclus partout</span>
            </div>
            <h2 style={{ color: '#1e2b22', fontSize: '1.9rem', marginBottom: '0.5rem' }}>Quel que soit votre plan</h2>
            <p style={{ color: '#7a8e80', fontSize: '1rem' }}>Ces garanties s'appliquent à tous nos abonnements.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {[
              { icon: MessageSquare, color: '#3a7d5a', bg: 'rgba(58,125,90,0.08)', title: 'Support humain', desc: 'Email, chat ou téléphone. Réponse en moins de 2h ouvrées.' },
              { icon: Zap, color: '#C9A96E', bg: 'rgba(201,169,110,0.1)', title: 'Mises à jour incluses', desc: 'Nouvelles fonctionnalités chaque mois, sans surcoût.' },
              { icon: Lock, color: '#1e2b22', bg: 'rgba(30,43,34,0.06)', title: 'Sécurité RGPD', desc: 'Hébergement France, chiffrement AES-256, sauvegardes quotidiennes.' },
              { icon: Award, color: '#C9A96E', bg: 'rgba(201,169,110,0.1)', title: 'Onboarding offert', desc: 'Configuration, import de données et formation à votre rythme.' },
              { icon: TrendingUp, color: '#3a7d5a', bg: 'rgba(58,125,90,0.08)', title: 'Sans engagement', desc: 'Résiliation en 1 clic, quand vous voulez. Aucun frais.' },
              { icon: FileText, color: '#1e2b22', bg: 'rgba(30,43,34,0.06)', title: 'E-facture 2026', desc: 'Conformité obligatoire UBL/XML incluse d\'emblée.' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} style={{
                  background: '#fff', borderRadius: '16px', padding: '1.5rem',
                  border: '1px solid rgba(30,43,34,0.07)',
                  boxShadow: '0 2px 12px rgba(30,43,34,0.04)',
                }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    <Icon size={20} style={{ color: item.color }} />
                  </div>
                  <h4 style={{ color: '#1e2b22', marginBottom: '0.4rem', fontSize: '1rem' }}>{item.title}</h4>
                  <p style={{ color: '#7a8e80', fontSize: '.85rem', margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── ROI CALCULATOR ── */}
      <section style={{ background: '#0e1810', padding: '80px 5%', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(201,169,110,0.12)', border: '1px solid rgba(201,169,110,0.25)', borderRadius: '40px', padding: '6px 18px', marginBottom: '1.5rem' }}>
            <TrendingUp size={14} style={{ color: '#C9A96E' }} />
            <span style={{ color: '#C9A96E', fontSize: '.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Retour sur investissement</span>
          </div>
          <h2 style={{ color: '#fff', fontSize: '1.9rem', marginBottom: '1rem' }}>
            AVRA se rembourse dès le <span style={{ color: '#C9A96E' }}>premier chantier</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', maxWidth: 560, margin: '0 auto 3rem', lineHeight: 1.7 }}>
            En moyenne, nos clients gagnent 3h/jour et augmentent leur taux de signature de 35%.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {[
              { val: '3h', label: 'gagnées par jour', icon: Clock, desc: 'Sur l\'administration' },
              { val: '+35%', label: 'taux de signature', icon: TrendingUp, desc: 'Grâce aux rendus IA' },
              { val: '14j', label: 'essai gratuit', icon: Shield, desc: 'Sans carte bancaire' },
              { val: '30j', label: 'remboursé sinon', icon: Award, desc: 'Satisfait ou remboursé' },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <Icon size={20} style={{ color: '#C9A96E', marginBottom: '0.75rem' }} />
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: '#C9A96E', marginBottom: '4px' }}>{stat.val}</div>
                  <div style={{ color: '#fff', fontSize: '.88rem', fontWeight: 600, marginBottom: '4px' }}>{stat.label}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '.78rem' }}>{stat.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ background: '#f7f6f1', padding: '80px 5%' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ color: '#1e2b22', fontSize: '1.9rem' }}>Ils ont franchi le pas</h2>
            <p style={{ color: '#7a8e80' }}>Des professionnels comme vous, qui ont vu le ROI dès le premier mois.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {testimonials.map((t, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: '20px', padding: '2rem',
                border: '1px solid rgba(30,43,34,0.08)',
                boxShadow: '0 4px 20px rgba(30,43,34,0.06)',
              }}>
                <div style={{ display: 'flex', gap: '3px', marginBottom: '1rem' }}>
                  {[...Array(t.stars)].map((_, s) => <Star key={s} size={14} fill="#C9A96E" color="#C9A96E" />)}
                </div>
                <p style={{ color: '#304035', fontSize: '.95rem', lineHeight: 1.65, marginBottom: '1.25rem', fontStyle: 'italic' }}>
                  &ldquo;{t.text}&rdquo;
                </p>
                <div>
                  <div style={{ fontWeight: 700, color: '#1e2b22', fontSize: '.9rem' }}>{t.name}</div>
                  <div style={{ color: '#9aab9e', fontSize: '.8rem' }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GARANTIE ── */}
      <section style={{ background: '#fff', padding: '80px 5%' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(201,169,110,0.15), rgba(201,169,110,0.05))',
            border: '2px solid rgba(201,169,110,0.25)',
            marginBottom: '1.5rem',
          }}>
            <Shield size={36} style={{ color: '#C9A96E' }} />
          </div>
          <h2 style={{ color: '#1e2b22', fontSize: '2rem', marginBottom: '1rem' }}>
            30 jours satisfait ou remboursé
          </h2>
          <p style={{ color: '#7a8e80', fontSize: '1.05rem', lineHeight: 1.7, maxWidth: 500, margin: '0 auto 2rem' }}>
            Si AVRA ne vous convient pas dans les 30 premiers jours, nous vous remboursons intégralement. Zéro question posée, zéro tracas.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Aucun engagement', 'Remboursement immédiat', 'Sans justification'].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} style={{ color: '#3a7d5a' }} />
                <span style={{ fontSize: '.88rem', color: '#4a5e52', fontWeight: 500 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ background: '#f7f6f1', padding: '80px 5%' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: '40px', padding: '6px 18px', marginBottom: '1rem' }}>
              <span style={{ color: '#C9A96E', fontSize: '.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>FAQ Tarifs</span>
            </div>
            <h2 style={{ color: '#1e2b22', fontSize: '1.9rem' }}>Questions fréquentes</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} style={{
                  background: '#fff', borderRadius: '16px',
                  border: isOpen ? '1.5px solid rgba(201,169,110,0.4)' : '1px solid rgba(30,43,34,0.08)',
                  overflow: 'hidden',
                  boxShadow: isOpen ? '0 8px 32px rgba(30,43,34,0.08)' : '0 2px 8px rgba(30,43,34,0.03)',
                  transition: 'all 0.2s ease',
                }}>
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    style={{
                      width: '100%', padding: '1.25rem 1.5rem', background: 'none', border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#1e2b22', fontSize: '.95rem', textAlign: 'left' }}>{faq.q}</span>
                    {isOpen
                      ? <ChevronUp size={18} style={{ color: '#C9A96E', flexShrink: 0 }} />
                      : <ChevronDown size={18} style={{ color: '#9aab9e', flexShrink: 0 }} />}
                  </button>
                  {isOpen && (
                    <div style={{ padding: '0 1.5rem 1.25rem' }}>
                      <p style={{ color: '#7a8e80', fontSize: '.92rem', lineHeight: 1.7, margin: 0 }}>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{
        background: 'linear-gradient(160deg, #0e1810, #1e2b22)',
        padding: '100px 5%',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
      }}>
        <div style={{ position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)', width: '700px', height: '700px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 620, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {['🍳 Cuisiniste', '🪚 Menuisier', '✏️ Architecte', '🏠 Agenceur'].map((m, i) => (
              <span key={i} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '4px 12px', fontSize: '.78rem', color: 'rgba(255,255,255,0.6)' }}>{m}</span>
            ))}
          </div>
          <h2 style={{ color: '#fff', fontSize: 'clamp(1.7rem, 4vw, 2.6rem)', lineHeight: 1.2, marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
            Commencez gratuitement<br /><span style={{ color: '#C9A96E' }}>dès aujourd'hui</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', maxWidth: 480, margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
            14 jours d'accès complet. Aucune carte bancaire. Aucun engagement. Commencez maintenant, arrêtez quand vous voulez.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/register" style={{ textDecoration: 'none' }}>
              <button style={{
                background: 'linear-gradient(135deg, #d4b87a, #C9A96E)',
                color: '#0e1810', border: 'none', padding: '16px 36px',
                borderRadius: '12px', fontWeight: 700, fontSize: '1rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                boxShadow: '0 12px 40px rgba(201,169,110,0.35)',
              }}>
                Démarrer mon essai gratuit <ArrowRight size={18} />
              </button>
            </a>
            <a href="mailto:contact@avra.fr" style={{ textDecoration: 'none' }}>
              <button style={{
                background: 'rgba(255,255,255,0.07)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.18)', padding: '16px 28px',
                borderRadius: '12px', fontWeight: 600, fontSize: '1rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <Phone size={16} /> Parler à un conseiller
              </button>
            </a>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '.78rem', marginTop: '1.5rem' }}>
            Sans CB · Sans engagement · Données hébergées en France 🇫🇷
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}
