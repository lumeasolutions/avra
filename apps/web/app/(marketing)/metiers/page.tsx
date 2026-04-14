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
    id: 'cuisiniste-agenceur',
    emoji: '🍳',
    icon: ChefHat,
    href: '/cuisiniste',
    label: 'Cuisiniste / Agenceur',
    tagline: 'De la conception à la pose',
    desc: "Le module agenceur/cuisiniste d'AVRA vous permet de suivre facilement vos commandes et vos dossiers en cours, sans risque d'oubli. L'assistant AVRA vous accompagne à chaque étape avec des rappels intelligents, tandis que le rendu IA accélère vos validations visuelles et simplifie votre travail au quotidien.",
    color: '#C9A96E',
    colorLight: 'rgba(201,169,110,0.12)',
    colorBorder: 'rgba(201,169,110,0.25)',
    features: [
      'Un suivi plus simple des commandes',
      'Un suivi plus simple des dossiers en cours',
      'Rendus photo IA intégrés',
      'E-paiement / E-signature',
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
    desc: "AVRA vous aide à suivre simplement tous vos dossiers en cours, de la fabrication à l'assemblage jusqu'à la pose. Pensé pour les menuisiers, AVRA parle votre langue et s'adapte à votre façon de travailler.",
    color: '#4A7C59',
    colorLight: 'rgba(74,124,89,0.10)',
    colorBorder: 'rgba(74,124,89,0.22)',
    features: [
      'Gestion des dossiers en cours',
      'Suivi simplifié de la partie fabrication',
      'Suivi des livraisons sur chantier',
      'Suivi de la pose des chantiers',
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
      'Suivi simplifié des modifications dossiers clients',
      'Coordination multi-artisans intégrée',
      'Rendus IA réalistes des projets',
      'Gestion du stock',
    ],
    stat: { value: '94%', label: 'de clients satisfaits rapportés' },
  },
  {
    id: 'decorateur',
    emoji: '🎨',
    icon: Layout,
    href: '/decorateur',
    label: 'Décorateur',
    tagline: 'Ambiances, matières & expérience client',
    desc: "Composez vos univers décoratifs, présentez des ambiances photo-réalistes et gérez vos devis de A à Z — AVRA vous libère du temps pour créer.",
    color: '#c0627a',
    colorLight: 'rgba(192,98,122,0.09)',
    colorBorder: 'rgba(192,98,122,0.25)',
    features: [
      'Suivi de projet et livraisons',
      'Rendus IA photo-réalistes pour vos clients',
      'Devis déco professionnels en quelques clics',
      'Suivi des dossiers client et du stock',
    ],
    stat: { value: '×3', label: 'plus vite de la déco au bon de commande' },
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
  { before: 'Perte de temps sur les 3Ds', after: 'Rendus photo-réalisme IA rapide' },
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
          AVANT / APRÈS — RENDU IA PHOTO-RÉALISTE
      ══════════════════════════════════════════ */}
      <style>{`
        @keyframes avApresGlow {
          0%, 100% { box-shadow: 0 0 40px rgba(201,169,110,0.15), 0 0 0 1px rgba(201,169,110,0.2); }
          50% { box-shadow: 0 0 80px rgba(201,169,110,0.35), 0 0 0 1px rgba(201,169,110,0.5); }
        }
        @keyframes avApresShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes avApresFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes badgePop {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
      `}</style>
      <section style={{
        padding: '120px 5%',
        background: 'linear-gradient(180deg, #07100a 0%, #0d1a10 50%, #060d08 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Ambient glow orbs */}
        <div style={{ position: 'absolute', top: '10%', left: '15%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,124,89,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.25)',
              borderRadius: '100px', padding: '6px 18px', marginBottom: '20px',
            }}>
              <Sparkles size={13} color="#C9A96E" />
              <span style={{ color: '#C9A96E', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                IA photo-réaliste intégrée
              </span>
            </div>
            <h2 style={{ color: '#fff', fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '16px', lineHeight: 1.15 }}>
              De la photo brute au{' '}
              <span style={{
                background: 'linear-gradient(135deg, #C9A96E 0%, #e8c87a 50%, #C9A96E 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                animation: 'avApresShimmer 4s linear infinite',
              }}>
                rendu époustouflant
              </span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.05rem', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7 }}>
              En quelques secondes, l'IA AVRA transforme vos photos en rendus photo-réalistes professionnels. Vos clients voient le résultat final avant même le chantier.
            </p>
          </div>

          {/* Before / After comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'stretch' }}>

            {/* AVANT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start',
                background: 'rgba(239,83,80,0.12)', border: '1px solid rgba(239,83,80,0.3)',
                borderRadius: '100px', padding: '6px 16px',
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef5350', boxShadow: '0 0 8px #ef5350' }} />
                <span style={{ color: '#ef9a9a', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Avant</span>
              </div>
              <div style={{
                flex: 1,
                borderRadius: '20px',
                border: '1.5px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.03)',
                overflow: 'hidden',
                minHeight: '400px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: '12px',
                position: 'relative',
              }}>
                {/* Dashed placeholder */}
                <div style={{
                  position: 'absolute', inset: '20px',
                  border: '2px dashed rgba(255,255,255,0.08)',
                  borderRadius: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: '10px',
                }}>
                  <div style={{ fontSize: '2.5rem', opacity: 0.2 }}>📸</div>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.82rem', fontWeight: 600 }}>Photo à intégrer</span>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem', textAlign: 'center', margin: 0 }}>
                La photo brute de l&apos;espace vide
              </p>
            </div>

            {/* APRÈS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.35)',
                  borderRadius: '100px', padding: '6px 16px',
                }}>
                  <Sparkles size={11} color="#C9A96E" />
                  <span style={{ color: '#C9A96E', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Après — IA AVRA</span>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #C9A96E, #b8944f)',
                  borderRadius: '100px', padding: '4px 12px',
                  fontSize: '0.72rem', fontWeight: 800, color: '#fff',
                  animation: 'badgePop 2s ease-in-out infinite',
                }}>
                  ✨ Quelques secondes
                </div>
              </div>
              <div style={{
                flex: 1,
                borderRadius: '20px',
                border: '1.5px solid rgba(201,169,110,0.3)',
                background: 'rgba(201,169,110,0.04)',
                overflow: 'hidden',
                minHeight: '400px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
                animation: 'avApresGlow 3s ease-in-out infinite',
              }}>
                {/* Shimmer border overlay */}
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '20px',
                  background: 'linear-gradient(135deg, transparent 30%, rgba(201,169,110,0.06) 50%, transparent 70%)',
                  backgroundSize: '200% 200%',
                  animation: 'avApresShimmer 3s linear infinite',
                  pointerEvents: 'none',
                }} />
                {/* Dashed placeholder */}
                <div style={{
                  position: 'absolute', inset: '20px',
                  border: '2px dashed rgba(201,169,110,0.2)',
                  borderRadius: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: '10px',
                }}>
                  <div style={{ fontSize: '2.5rem', opacity: 0.35 }}>🏡</div>
                  <span style={{ color: 'rgba(201,169,110,0.4)', fontSize: '0.82rem', fontWeight: 600 }}>Rendu IA à intégrer</span>
                </div>
              </div>
              <p style={{ color: 'rgba(201,169,110,0.5)', fontSize: '0.82rem', textAlign: 'center', margin: 0 }}>
                Le rendu photo-réaliste généré par l&apos;IA AVRA
              </p>
            </div>
          </div>

          {/* Bottom stats row */}
          <div style={{
            display: 'flex', gap: '0', marginTop: '64px',
            background: 'rgba(255,255,255,0.03)', borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden',
          }}>
            {[
              { value: '< 30s', label: 'Temps de génération', icon: '⚡' },
              { value: '160', label: 'Rendus inclus / mois', icon: '🎨' },
              { value: '100%', label: 'Intégré dans AVRA', icon: '🔗' },
            ].map((stat, i) => (
              <div key={i} style={{
                flex: 1, padding: '32px 24px', textAlign: 'center',
                borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{stat.icon}</div>
                <div style={{ color: '#C9A96E', fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                  {stat.value}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '6px' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ textAlign: 'center', marginTop: '56px' }}>
            <Link href="/comment-ca-marche" style={{ textDecoration: 'none' }}>
              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: '10px',
                background: 'linear-gradient(135deg, #C9A96E, #b8944f)',
                color: '#fff', border: 'none', borderRadius: '14px',
                padding: '16px 36px', fontSize: '1rem', fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 12px 40px rgba(201,169,110,0.35)',
                animation: 'avApresFloat 3s ease-in-out infinite',
              }}>
                Voir le rendu IA en action <ArrowRight size={18} />
              </button>
            </Link>
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
                <Link href="/comment-ca-marche" style={{ textDecoration: 'none' }}>
                  <button style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: 'linear-gradient(135deg, #1e2b22, #304035)',
                    color: '#fff', border: 'none', borderRadius: '12px',
                    padding: '14px 28px', fontSize: '0.95rem', fontWeight: 700,
                    cursor: 'pointer', boxShadow: '0 8px 24px rgba(30,43,34,0.25)',
                  }}>
                    Demander une démo <ArrowRight size={16} />
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
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '32px' }}>
            <Link href="/comment-ca-marche" style={{ textDecoration: 'none' }}>
              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'linear-gradient(135deg, #C9A96E, #b8944f)',
                color: '#fff', border: 'none', borderRadius: '12px',
                padding: '16px 32px', fontSize: '1rem', fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 8px 32px rgba(201,169,110,0.35)',
              }}>
                Demander une démo <ArrowRight size={18} />
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
            {['Sans engagement', 'Support inclus'].map((item) => (
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
