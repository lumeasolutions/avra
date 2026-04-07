'use client';

import Image from 'next/image';
import Link from 'next/link';
import '../marketing.css';
import { useState } from 'react';
import {
  ChefHat,
  Hammer,
  Pencil,
  Layout,
  ArrowRight,
  CheckCircle,
  Sparkles,
  FileText,
  Calendar,
  Package,
  Users,
  BarChart3,
  Shield,
  Zap,
  Star,
} from 'lucide-react';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

/* ─── DATA ──────────────────────────────────────────────────── */

const metiers = [
  {
    id: 'cuisiniste',
    emoji: '🍳',
    icon: ChefHat,
    href: '/cuisiniste',
    label: 'Cuisiniste',
    tagline: 'De la conception à la pose',
    desc: 'Gérez vos projets cuisine de A à Z : chiffrage, rendus IA, commandes fournisseurs et suivi de pose — tout dans un seul outil.',
    color: '#C9A96E',
    colorLight: 'rgba(201,169,110,0.12)',
    colorBorder: 'rgba(201,169,110,0.25)',
    features: [
      'Bibliothèque de cuisines & modules',
      'Rendus photo-réalistes IA intégrés',
      'Commandes fournisseurs automatisées',
      'Suivi de chantier et planning pose',
    ],
    stat: { value: '+42%', label: 'de CA moyen après 6 mois' },
  },
  {
    id: 'menuisier',
    emoji: '🪚',
    icon: Hammer,
    href: '/menuisier',
    label: 'Menuisier',
    tagline: 'Meubles, agencements & sur-mesure',
    desc: 'Devis sur-mesure au millimètre, gestion des bois et matériaux, suivi de production atelier. AVRA parle votre langue.',
    color: '#4A7C59',
    colorLight: 'rgba(74,124,89,0.10)',
    colorBorder: 'rgba(74,124,89,0.22)',
    features: [
      'Calcul automatique des matériaux',
      'Gestion du stock atelier en temps réel',
      'Plans de débit et fiche de production',
      'Devis par module et sur-mesure',
    ],
    stat: { value: '3h', label: 'gagnées par jour en moyenne' },
  },
  {
    id: 'architecte',
    emoji: '✏️',
    icon: Pencil,
    href: '/architecte-interieur',
    label: "Architecte d'intérieur",
    tagline: 'Design, coordination & suivi de projet',
    desc: "Centralisez vos dossiers clients, coordonnez vos artisans et présentez des rendus IA époustouflants. Tout votre studio en une app.",
    color: '#7B5EA7',
    colorLight: 'rgba(123,94,167,0.08)',
    colorBorder: 'rgba(123,94,167,0.22)',
    features: [
      'Mood boards et présentations clients',
      'Coordination multi-artisans intégrée',
      'Suivi budgétaire du projet en temps réel',
      'Portail client avec avancement visuel',
    ],
    stat: { value: '94%', label: 'de clients satisfaits rapportés' },
  },
  {
    id: 'agenceur',
    emoji: '🏪',
    icon: Layout,
    href: '/agenceur',
    label: 'Agenceur',
    tagline: 'Espaces commerciaux & retail',
    desc: 'Répondez aux appels d\'offre plus vite, gérez plusieurs chantiers simultanément et offrez une expérience client premium.',
    color: '#1e6e9e',
    colorLight: 'rgba(30,110,158,0.08)',
    colorBorder: 'rgba(30,110,158,0.22)',
    features: [
      'Gestion multi-chantiers simultanés',
      'Réponses aux appels d\'offres rapides',
      'Suivi des délais et jalons projet',
      'Reporting client automatisé',
    ],
    stat: { value: '×2.3', label: 'dossiers traités par mois' },
  },
];

const commonFeatures = [
  { icon: FileText, label: 'Devis & Facturation', desc: 'Pro, conformes e-facture 2026, en quelques clics.' },
  { icon: Sparkles, label: 'IA photo-réaliste', desc: 'Rendus FLUX Pro impressionnants pour vos clients.' },
  { icon: Shield, label: 'Signature électronique', desc: 'Légal, intégrée, validez vos contrats en 1 clic.' },
  { icon: Calendar, label: 'Planning & agenda', desc: 'Visites, chantiers, équipes — tout synchronisé.' },
  { icon: Package, label: 'Gestion du stock', desc: 'Matériaux, références, alertes de réappro auto.' },
  { icon: BarChart3, label: 'Statistiques', desc: 'CA, marges, taux de conversion — tableau de bord clair.' },
  { icon: Users, label: 'Portail client', desc: "Vos clients suivent l'avancement en temps réel." },
  { icon: Zap, label: 'Automatisations', desc: 'Relances, rappels, alertes — sans y penser.' },
];

const painPoints = [
  { before: 'Devis sur Excel interminables', after: 'Devis pro générés en 5 minutes' },
  { before: 'Paperasse et dossiers éparpillés', after: 'Tout centralisé en un seul endroit' },
  { before: 'Clients sans nouvelles du chantier', after: 'Portail client avec suivi en direct' },
  { before: 'Factures non conformes 2026', after: 'E-factures automatiques et conformes' },
];

/* ─── PAGE ──────────────────────────────────────────────────── */

export default function MetiersPage() {
  const [activeMetier, setActiveMetier] = useState(0);
  const active = metiers[activeMetier];

  return (
    <>
      <Nav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Métiers AVRA',
            description: "Solutions AVRA pour cuisinistes, menuisiers, architectes d'intérieur et agenceurs",
            itemListElement: metiers.map((m, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: `Logiciel ${m.label}`,
              url: `https://avra.fr${m.href}`,
            })),
          }),
        }}
      />

      {/* ══════════════════════════════════════════
          HERO — dark split with full-bleed image
      ══════════════════════════════════════════ */}
      <section
        style={{
          paddingTop: '76px',
          background: '#0a1409',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '88vh',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Background image */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <Image
            src="/images/metiers-hero-bg.webp"
            alt="Intérieur agencement premium"
            fill
            priority
            style={{ objectFit: 'cover', opacity: 0.22 }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(160deg, rgba(10,20,9,0.97) 0%, rgba(14,30,16,0.88) 40%, rgba(10,20,9,0.70) 100%)',
          }} />
        </div>

        {/* Decorative glow */}
        <div style={{
          position: 'absolute', top: '-100px', right: '-100px', width: '500px', height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,169,110,0.10) 0%, transparent 70%)',
          zIndex: 0, pointerEvents: 'none',
        }} />

        <div style={{
          maxWidth: '1200px', margin: '0 auto', padding: '80px 5% 100px',
          position: 'relative', zIndex: 1, width: '100%',
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.3)',
            borderRadius: '100px', padding: '6px 18px', marginBottom: '28px',
          }}>
            <Star size={13} color="#C9A96E" fill="#C9A96E" />
            <span style={{ color: '#C9A96E', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Conçu pour votre métier
            </span>
          </div>

          {/* Headline */}
          <h1 style={{ color: '#fff', maxWidth: '720px', marginBottom: '20px', lineHeight: 1.08, fontSize: 'clamp(2.4rem, 5vw, 3.8rem)' }}>
            Un logiciel qui parle{' '}
            <span style={{
              background: 'linear-gradient(135deg, #C9A96E, #e8c87a)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              votre langue
            </span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '1.15rem', maxWidth: '580px', marginBottom: '48px', lineHeight: 1.7 }}>
            AVRA s&apos;adapte à chaque professionnel de l&apos;agencement. Pas un généraliste — un outil pensé avec vous, pour vous.
          </p>

          {/* Métier pills nav */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '60px' }}>
            {metiers.map((m, i) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveMetier(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 22px', borderRadius: '100px',
                    background: activeMetier === i ? m.color : 'rgba(255,255,255,0.07)',
                    color: activeMetier === i ? '#fff' : 'rgba(255,255,255,0.65)',
                    border: `2px solid ${activeMetier === i ? m.color : 'rgba(255,255,255,0.12)'}`,
                    fontSize: '0.92rem', fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    boxShadow: activeMetier === i ? `0 8px 24px ${m.color}44` : 'none',
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>{m.emoji}</span>
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Active metier showcase */}
          <div style={{
            display: 'flex', gap: '48px', alignItems: 'center', flexWrap: 'wrap',
          }}>
            {/* Left: content */}
            <div style={{ flex: '1 1 420px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: active.colorLight,
                border: `1px solid ${active.colorBorder}`,
                borderRadius: '100px', padding: '5px 14px', marginBottom: '20px',
              }}>
                <span style={{ color: active.color, fontSize: '0.8rem', fontWeight: 700 }}>{active.tagline}</span>
              </div>
              <h2 style={{ color: '#fff', fontSize: '2rem', marginBottom: '16px', lineHeight: 1.2 }}>
                {active.emoji} {active.label}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: 1.8, marginBottom: '28px', maxWidth: '460px' }}>
                {active.desc}
              </p>

              {/* Features list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                {active.features.map((f, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: active.colorLight, border: `1px solid ${active.colorBorder}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <CheckCircle size={14} color={active.color} />
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.92rem', fontWeight: 500 }}>{f}</span>
                  </div>
                ))}
              </div>

              {/* Stat badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '16px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: '16px', padding: '16px 24px', marginBottom: '32px',
              }}>
                <span style={{ color: active.color, fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                  {active.stat.value}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', maxWidth: '140px', lineHeight: 1.4 }}>
                  {active.stat.label}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Link href={active.href} style={{ textDecoration: 'none' }}>
                  <button style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: active.color,
                    color: '#fff', border: 'none', borderRadius: '12px',
                    padding: '14px 26px', fontSize: '0.95rem', fontWeight: 700,
                    cursor: 'pointer', boxShadow: `0 8px 24px ${active.color}44`,
                    transition: 'all 0.2s',
                  }}>
                    Découvrir pour {active.label} <ArrowRight size={16} />
                  </button>
                </Link>
                <Link href="/register" style={{ textDecoration: 'none' }}>
                  <button style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(255,255,255,0.07)',
                    color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '12px', padding: '14px 26px', fontSize: '0.95rem', fontWeight: 600,
                    cursor: 'pointer',
                  }}>
                    Essai gratuit 14j
                  </button>
                </Link>
              </div>
            </div>

            {/* Right: visual card */}
            <div style={{ flex: '1 1 300px', maxWidth: '360px' }}>
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${active.colorBorder}`,
                borderRadius: '24px', padding: '32px',
                boxShadow: `0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)`,
              }}>
                {/* Big icon */}
                <div style={{
                  width: '72px', height: '72px', borderRadius: '20px',
                  background: active.colorLight,
                  border: `1px solid ${active.colorBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '20px', fontSize: '2.5rem',
                }}>
                  {active.emoji}
                </div>
                <div style={{ color: active.color, fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>
                  {active.label}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', marginBottom: '24px' }}>
                  {active.tagline}
                </div>

                {/* Mini features */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {active.features.map((f, j) => (
                    <div key={j} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 14px', borderRadius: '10px',
                      background: j === 0 ? active.colorLight : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${j === 0 ? active.colorBorder : 'rgba(255,255,255,0.06)'}`,
                    }}>
                      <CheckCircle size={14} color={j === 0 ? active.color : 'rgba(255,255,255,0.3)'} />
                      <span style={{ color: j === 0 ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: '0.82rem', fontWeight: j === 0 ? 600 : 400 }}>
                        {f}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          ALL 4 MÉTIERS GRID
      ══════════════════════════════════════════ */}
      <section className="section-pad" style={{ padding: '100px 5%', background: '#fff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(30,43,34,0.06)', borderRadius: '100px',
              padding: '6px 18px', marginBottom: '16px',
            }}>
              <span style={{ color: '#1e2b22', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                4 métiers, 1 seul outil
              </span>
            </div>
            <h2 style={{ color: '#1e2b22', marginBottom: '14px' }}>
              Choisissez votre métier
            </h2>
            <p style={{ color: '#6b7d6f', fontSize: '1rem', maxWidth: '480px', margin: '0 auto' }}>
              Chaque solution est taillée sur mesure avec des fonctionnalités propres à votre activité.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            {metiers.map((m, i) => {
              const Icon = m.icon;
              return (
                <Link key={m.id} href={m.href} style={{ textDecoration: 'none' }}>
                  <div
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 20px 56px ${m.color}22`;
                      (e.currentTarget as HTMLDivElement).style.borderColor = m.colorBorder;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 16px rgba(30,43,34,0.06)';
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(30,43,34,0.08)';
                    }}
                    style={{
                      background: '#fff', borderRadius: '20px', padding: '32px',
                      border: '2px solid rgba(30,43,34,0.08)',
                      boxShadow: '0 2px 16px rgba(30,43,34,0.06)',
                      transition: 'all 0.3s ease', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', height: '100%',
                    }}
                  >
                    {/* Icon block */}
                    <div style={{
                      width: '64px', height: '64px', borderRadius: '18px',
                      background: m.colorLight, border: `1px solid ${m.colorBorder}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '2rem', marginBottom: '20px',
                    }}>
                      {m.emoji}
                    </div>

                    <h3 style={{ color: '#1e2b22', fontSize: '1.2rem', marginBottom: '6px' }}>{m.label}</h3>
                    <p style={{ color: '#9aab9e', fontSize: '0.82rem', fontWeight: 600, marginBottom: '14px', letterSpacing: '0.02em' }}>
                      {m.tagline}
                    </p>
                    <p style={{ color: '#5a6e5e', fontSize: '0.9rem', lineHeight: 1.7, flex: 1, marginBottom: '24px' }}>
                      {m.desc}
                    </p>

                    {/* Stat */}
                    <div style={{
                      padding: '12px 16px', borderRadius: '12px',
                      background: m.colorLight, marginBottom: '20px',
                      display: 'flex', alignItems: 'center', gap: '12px',
                    }}>
                      <span style={{ color: m.color, fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                        {m.stat.value}
                      </span>
                      <span style={{ color: '#5a6e5e', fontSize: '0.78rem', lineHeight: 1.4 }}>{m.stat.label}</span>
                    </div>

                    {/* CTA */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      color: m.color, fontWeight: 700, fontSize: '0.88rem',
                    }}>
                      <span>Voir la solution {m.label}</span>
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          AVANT / APRÈS  (pain points)
      ══════════════════════════════════════════ */}
      <section className="section-pad" style={{ padding: '100px 5%', background: 'linear-gradient(160deg, #f8f5ef 0%, #eef2ec 100%)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '60px', alignItems: 'center', flexWrap: 'wrap' }}>

            {/* Left text */}
            <div style={{ flex: '1 1 400px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'rgba(201,169,110,0.12)', border: '1px solid rgba(201,169,110,0.25)',
                borderRadius: '100px', padding: '6px 18px', marginBottom: '20px',
              }}>
                <Zap size={13} color="#C9A96E" />
                <span style={{ color: '#8a6d3e', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Avant / Après AVRA
                </span>
              </div>
              <h2 style={{ color: '#1e2b22', marginBottom: '16px', lineHeight: 1.2 }}>
                Fini les galères du quotidien
              </h2>
              <p style={{ color: '#6b7d6f', fontSize: '1rem', lineHeight: 1.8, marginBottom: '32px', maxWidth: '420px' }}>
                Nos utilisateurs nous le disent : en quelques semaines, AVRA transforme concrètement leur façon de travailler.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {painPoints.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: '16px', alignItems: 'center',
                    background: '#fff', borderRadius: '14px', padding: '16px 20px',
                    boxShadow: '0 2px 12px rgba(30,43,34,0.06)',
                    border: '1px solid rgba(30,43,34,0.06)',
                  }}>
                    {/* Before */}
                    <div style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
                    }}>
                      <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: '#ef5350', flexShrink: 0,
                      }} />
                      <span style={{ color: '#8a9a8d', fontSize: '0.85rem', textDecoration: 'line-through' }}>{p.before}</span>
                    </div>
                    {/* Arrow */}
                    <ArrowRight size={14} color="#C9A96E" style={{ flexShrink: 0 }} />
                    {/* After */}
                    <div style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
                    }}>
                      <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: '#4A7C59', flexShrink: 0,
                      }} />
                      <span style={{ color: '#304035', fontSize: '0.85rem', fontWeight: 600 }}>{p.after}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '36px' }}>
                <Link href="/register" style={{ textDecoration: 'none' }}>
                  <button style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: 'linear-gradient(135deg, #1e2b22, #304035)',
                    color: '#fff', border: 'none', borderRadius: '12px',
                    padding: '14px 28px', fontSize: '0.95rem', fontWeight: 700,
                    cursor: 'pointer', boxShadow: '0 8px 24px rgba(30,43,34,0.25)',
                  }}>
                    Essayer gratuitement <ArrowRight size={16} />
                  </button>
                </Link>
              </div>
            </div>

            {/* Right: team image */}
            <div style={{ flex: '1 1 380px', maxWidth: '480px', position: 'relative' }}>
              <div style={{
                borderRadius: '24px', overflow: 'hidden',
                boxShadow: '0 32px 80px rgba(30,43,34,0.18)',
                border: '1px solid rgba(30,43,34,0.08)',
              }}>
                <Image
                  src="/images/metiers-team.webp"
                  alt="Équipe de professionnels de l'agencement utilisant AVRA"
                  width={480}
                  height={380}
                  style={{ objectFit: 'cover', width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
              {/* Floating quote */}
              <div style={{
                position: 'absolute', bottom: '-20px', left: '-20px',
                background: '#fff', borderRadius: '16px',
                padding: '16px 20px', maxWidth: '240px',
                boxShadow: '0 16px 48px rgba(30,43,34,0.15)',
                border: '1px solid rgba(30,43,34,0.06)',
              }}>
                <div style={{ display: 'flex', gap: '2px', marginBottom: '8px' }}>
                  {[...Array(5)].map((_, i) => <Star key={i} size={12} color="#C9A96E" fill="#C9A96E" />)}
                </div>
                <p style={{ color: '#304035', fontSize: '0.8rem', lineHeight: 1.5, margin: '0 0 6px', fontStyle: 'italic' }}>
                  &ldquo;AVRA a changé mon quotidien. Je gagne 3h par jour minimum.&rdquo;
                </p>
                <p style={{ color: '#9aab9e', fontSize: '0.72rem', margin: 0, fontWeight: 600 }}>
                  Marc D. — Cuisiniste, Lyon
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          COMMON FEATURES GRID
      ══════════════════════════════════════════ */}
      <section className="section-pad" style={{ padding: '100px 5%', background: '#fff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(30,43,34,0.06)', borderRadius: '100px',
              padding: '6px 18px', marginBottom: '16px',
            }}>
              <CheckCircle size={13} color="#4A7C59" />
              <span style={{ color: '#1e2b22', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Inclus pour tous
              </span>
            </div>
            <h2 style={{ color: '#1e2b22', marginBottom: '14px' }}>
              Le socle commun à tous les métiers
            </h2>
            <p style={{ color: '#6b7d6f', maxWidth: '500px', margin: '0 auto', fontSize: '1rem', lineHeight: 1.7 }}>
              Quel que soit votre métier, vous bénéficiez de ces fonctionnalités essentielles, incluses dans tous les plans.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            {commonFeatures.map((f, i) => {
              const Icon = f.icon;
              const colors = [
                { bg: 'rgba(201,169,110,0.10)', color: '#C9A96E' },
                { bg: 'rgba(123,94,167,0.08)', color: '#7B5EA7' },
                { bg: 'rgba(74,124,89,0.10)', color: '#4A7C59' },
                { bg: 'rgba(30,110,158,0.08)', color: '#1e6e9e' },
                { bg: 'rgba(201,169,110,0.10)', color: '#C9A96E' },
                { bg: 'rgba(46,125,50,0.08)', color: '#2E7D32' },
                { bg: 'rgba(123,94,167,0.08)', color: '#7B5EA7' },
                { bg: 'rgba(74,124,89,0.10)', color: '#4A7C59' },
              ];
              const c = colors[i % colors.length];
              return (
                <div
                  key={i}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
                  style={{
                    background: '#fafafa', borderRadius: '16px', padding: '28px 24px',
                    border: '1px solid rgba(30,43,34,0.07)',
                    transition: 'transform 0.25s ease',
                    display: 'flex', flexDirection: 'column', gap: '14px',
                  }}
                >
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '14px',
                    background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={22} color={c.color} />
                  </div>
                  <div>
                    <h4 style={{ color: '#1e2b22', fontSize: '0.95rem', marginBottom: '6px' }}>{f.label}</h4>
                    <p style={{ color: '#6b7d6f', fontSize: '0.85rem', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA FINAL
      ══════════════════════════════════════════ */}
      <section style={{
        padding: '120px 5%',
        background: 'linear-gradient(160deg, #0a1409 0%, #1e2b22 50%, #0a1409 100%)',
        position: 'relative', overflow: 'hidden', textAlign: 'center',
      }}>
        {/* Glow circles */}
        <div style={{ position: 'absolute', top: '50%', left: '30%', transform: 'translate(-50%,-50%)', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,0.10) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', right: '10%', transform: 'translateY(-50%)', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,124,89,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '700px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Metier emoji row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '28px' }}>
            {metiers.map((m) => (
              <div key={m.id} style={{
                width: '52px', height: '52px', borderRadius: '16px',
                background: m.colorLight, border: `1px solid ${m.colorBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem',
              }}>
                {m.emoji}
              </div>
            ))}
          </div>

          <h2 style={{ color: '#fff', marginBottom: '16px', fontSize: '2.4rem', lineHeight: 1.1 }}>
            Quel que soit votre métier,{' '}
            <span style={{ color: '#C9A96E' }}>AVRA est fait pour vous</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.05rem', marginBottom: '44px', lineHeight: 1.7 }}>
            Rejoignez 2 400+ professionnels de l&apos;agencement qui gagnent du temps chaque jour.
            14 jours gratuits, sans carte bancaire.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '32px' }}>
            <Link href="/register" style={{ textDecoration: 'none' }}>
              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'linear-gradient(135deg, #C9A96E, #b8944f)',
                color: '#fff', border: 'none', borderRadius: '12px',
                padding: '16px 32px', fontSize: '1rem', fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 8px 32px rgba(201,169,110,0.35)',
              }}>
                Commencer l&apos;essai gratuit <ArrowRight size={18} />
              </button>
            </Link>
            <Link href="/temoignages" style={{ textDecoration: 'none' }}>
              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.8)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px', padding: '16px 32px',
                fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
              }}>
                <Star size={16} /> Lire les témoignages
              </button>
            </Link>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {['Sans engagement', '14j gratuits', 'Sans CB', 'Support inclus'].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={13} color="#4A7C59" />
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
