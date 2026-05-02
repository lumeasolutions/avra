'use client';

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import '../marketing.css';
import { useState, useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle,
  Clock,
  UserPlus,
  Settings,
  FolderOpen,
  Sparkles,
  TrendingUp,
  Shield,
  Download,
  MessageCircle,
  BookOpen,
  Play,
  ChevronDown,
  ChevronUp,
  Star,
  Zap,
} from 'lucide-react';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

const steps = [
  {
    num: '01',
    color: '#C9A96E',
    bg: 'rgba(201,169,110,0.10)',
    icon: UserPlus,
    emoji: '👋',
    title: 'Créez votre compte',
    subtitle: 'Accessible sur PC et téléphone',
    desc: 'Demandez une démo, créez votre compte, et vous êtes immédiatement dans l\'application, accessible aussi bien sur PC que sur téléphone.',
    tag: '30 secondes',
    tagColor: '#C9A96E',
    checks: ['Email + mot de passe uniquement', 'Accès immédiat à toutes les fonctionnalités', 'Accessible sur PC et téléphone'],
  },
  {
    num: '02',
    color: '#4A7C59',
    bg: 'rgba(74,124,89,0.10)',
    icon: Settings,
    emoji: '⚙️',
    title: 'Configurez en 5 min',
    subtitle: 'L\'assistant vous guide pas à pas',
    desc: 'Choisissez votre métier, ajoutez votre logo, personnalisez vos modèles. Un assistant simple vous accompagne étape par étape. En 5 minutes vous avez une app à vos couleurs.',
    tag: '5 minutes',
    tagColor: '#4A7C59',
    checks: ['Sélection du métier (cuisiniste, menuisier…)', 'Upload logo + couleurs de l\'entreprise', 'Personnalisation des modèles devis/factures'],
  },
  {
    num: '03',
    color: '#1e4d6b',
    bg: 'rgba(30,77,107,0.08)',
    icon: FolderOpen,
    emoji: '📁',
    title: 'Importez vos données',
    subtitle: 'Vos clients, produits, catalogues',
    desc: 'Importez depuis Excel, CSV ou depuis votre ancien logiciel. AVRA vérifie et corrige automatiquement les erreurs. Votre équipe retrouve ses repères dès le premier jour.',
    tag: '10 minutes',
    tagColor: '#1e4d6b',
    checks: ['Import Excel & CSV guidé', 'Correction automatique des erreurs', 'Compatible avec tous les logiciels du marché'],
  },
  {
    num: '04',
    color: '#7B5EA7',
    bg: 'rgba(123,94,167,0.08)',
    icon: Sparkles,
    emoji: '✨',
    title: 'Créez votre 1er dossier',
    subtitle: 'Devis, planning, IA — tout en un',
    desc: 'Ajoutez un projet client, générez un devis professionnel, planifiez la visite, utilisez l\'IA pour créer des rendus photo-réalistes. Tout est là, tout est simple.',
    tag: '< 10 min',
    tagColor: '#7B5EA7',
    checks: ['Création devis en quelques clics', 'IA photo-réaliste intégrée', 'Planning et suivi en temps réel'],
  },
  {
    num: '05',
    color: '#2E7D32',
    bg: 'rgba(46,125,50,0.08)',
    icon: TrendingUp,
    emoji: '🚀',
    title: 'Développez votre activité',
    subtitle: 'Stats, automatisations, équipe',
    desc: 'Suivez vos performances avec des tableaux de bord clairs, automatisez vos relances, invitez vos collaborateurs. AVRA évolue avec vous à chaque étape de votre croissance.',
    tag: 'Continu',
    tagColor: '#2E7D32',
    checks: ['Tableaux de bord et statistiques claires', 'Automatisation des relances clients', 'Multi-utilisateurs et gestion d\'équipe'],
  },
];

const guarantees = [
  { icon: '⚡', title: 'Opérationnel en 30 min', desc: 'Configuration guidée, données importées, équipe formée. Tout de suite.', color: '#C9A96E' },
  { icon: '🔓', title: 'Sans engagement', desc: 'Résiliez en 1 clic, à tout moment, sans frais — hormis abonnement annuel.', color: '#4A7C59' },
  { icon: '📦', title: 'Vos données à vous', desc: 'Export CSV/Excel à tout moment, sans limite ni frais.', color: '#1e4d6b' },
  { icon: '🔒', title: 'Sécurisé & fiable', desc: 'Hébergé en France, chiffré TLS, conformité RGPD.', color: '#7B5EA7' },
];

const faqs = [
  {
    q: 'Dois-je installer quelque chose ?',
    a: 'Aucune installation obligatoire. AVRA fonctionne directement depuis votre navigateur sur PC, tablette ou smartphone. Vous pouvez aussi l\'installer en 2 clics comme une application native (PWA) depuis Chrome, Edge ou Safari — sans passer par l\'App Store.',
  },
  {
    q: 'Puis-je importer mes données existantes ?',
    a: 'Oui. AVRA accepte les imports depuis Excel, CSV, et peut récupérer vos données depuis la plupart des logiciels du marché. Notre équipe vous accompagne si besoin.',
  },
  {
    q: 'Combien de temps prend la prise en main ?',
    a: 'La majorité de nos utilisateurs est opérationnelle en moins de 30 minutes. L\'interface est intuitive, et des tutoriels vidéo sont disponibles pour chaque fonctionnalité.',
  },
  {
    q: 'Est-ce que ça marche pour mon métier ?',
    a: 'AVRA est conçu spécifiquement pour les cuisinistes, menuisiers, agenceurs et architectes d\'intérieur. Chaque module est adapté aux besoins concrets de votre métier.',
  },
];

import dynamic from 'next/dynamic';
const PWAInstallCCM = dynamic(() => import('../components/PWAInstallHero').then(m => m.PWAInstallCCM), { ssr: false });

export default function CommentCaMarchePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  return (
    <>
      <Nav />

      {/* ─── JSON-LD ─── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: 'Comment démarrer avec AVRA',
            description: 'Guide de démarrage en 5 étapes pour les professionnels de l\'agencement',
            totalTime: 'PT25M',
            step: steps.map((s, i) => ({
              '@type': 'HowToStep',
              position: i + 1,
              name: s.title,
              text: s.desc,
            })),
          }),
        }}
      />

      {/* ─── HERO ─── */}
      <section
        style={{
          paddingTop: '76px',
          background: 'linear-gradient(160deg, #0e1810 0%, #1e2b22 55%, #2d3e30 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,169,110,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', left: '-60px',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(74,124,89,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 5% 100px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '60px', flexWrap: 'wrap' }}>

            {/* Left text */}
            <div style={{ flex: '1 1 480px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.3)',
                borderRadius: '100px', padding: '6px 16px', marginBottom: '24px',
              }}>
                <Zap size={14} color="#C9A96E" />
                <span style={{ color: '#C9A96E', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Démarrage rapide
                </span>
              </div>

              <h1 style={{ color: '#fff', marginBottom: '20px', lineHeight: 1.1 }}>
                De zéro à{' '}
                <span style={{ color: '#C9A96E' }}>opérationnel</span>
                <br />en 5 minutes
              </h1>

              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.15rem', maxWidth: '520px', marginBottom: '36px', lineHeight: 1.7 }}>
                Après une présentation rapide de la plateforme en 20 à 30 minutes, vous pouvez déjà prendre en main AVRA et commencer à travailler immédiatement — sans formation longue ni prise de tête.
              </p>

              {/* Time indicators */}
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '40px' }}>
                {[
                  { label: 'Configuration', time: '5 min' },
                  { label: 'Premier devis', time: '< 10 min' },
                  { label: 'Sans engagement', time: '0€' },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: '#C9A96E', fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                      {item.time}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Link href="/contact" style={{ textDecoration: 'none' }}>
                  <button style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: 'linear-gradient(135deg, #C9A96E, #b8944f)',
                    color: '#fff', border: 'none', borderRadius: '12px',
                    padding: '14px 28px', fontSize: '1rem', fontWeight: 700,
                    cursor: 'pointer', boxShadow: '0 8px 24px rgba(201,169,110,0.35)',
                    transition: 'all 0.2s ease',
                  }}>
                    Demander une démo <ArrowRight size={18} />
                  </button>
                </Link>
                <Link href="#etapes" style={{ textDecoration: 'none' }}>
                  <button style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)',
                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px',
                    padding: '14px 28px', fontSize: '1rem', fontWeight: 600,
                    cursor: 'pointer',
                  }}>
                    Voir les étapes
                  </button>
                </Link>
              </div>
            </div>

            {/* Right - Image */}
            <div style={{ flex: '1 1 380px', maxWidth: '480px' }}>
              <div style={{
                position: 'relative',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <Image
                  src="/images/comment-ca-marche-hero.webp"
                  alt="Artisan cuisiniste utilisant AVRA sur tablette sur un chantier"
                  width={480}
                  height={360}
                  style={{ objectFit: 'cover', width: '100%', height: 'auto', display: 'block' }}
                />
                {/* Floating badge */}
                <div style={{
                  position: 'absolute', bottom: '20px', left: '20px',
                  background: 'rgba(14,24,16,0.9)', backdropFilter: 'blur(12px)',
                  borderRadius: '14px', padding: '12px 16px',
                  border: '1px solid rgba(201,169,110,0.3)',
                  display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4caf50', boxShadow: '0 0 8px #4caf50' }} />
                  <div>
                    <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}>2 400+ pros actifs</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem' }}>Rejoignez-les aujourd&apos;hui</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── STEPS ─── */}
      <style>{`
        @keyframes stepGlow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes stepSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes stepNumPulse {
          0%, 100% { opacity: 0.06; }
          50% { opacity: 0.13; }
        }
        @keyframes connectorFill {
          from { height: 0%; }
          to { height: 100%; }
        }
        @media (max-width: 768px) {
          .pwa-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
        }
      `}</style>
      <section id="etapes" style={{
        padding: '120px 5%',
        background: 'linear-gradient(180deg, #080d09 0%, #0e1810 40%, #0a0c0a 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glow orb */}
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: '900px', height: '600px', borderRadius: '50%',
          background: `radial-gradient(ellipse, ${steps[activeStep]?.color ?? '#C9A96E'}0d 0%, transparent 70%)`,
          transition: 'background 0.6s ease',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '1060px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.25)',
              borderRadius: '100px', padding: '6px 18px', marginBottom: '20px',
            }}>
              <Zap size={13} color="#C9A96E" />
              <span style={{ color: '#C9A96E', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                5 étapes simples
              </span>
            </div>
            <h2 style={{ color: '#fff', marginBottom: '16px', fontSize: '2.6rem' }}>
              C&apos;est vraiment aussi simple
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.05rem', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
              Chaque étape prend quelques minutes. Pas de formation, pas de technicien requis.
            </p>
          </div>

          {/* Step navigator pills */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '64px', flexWrap: 'wrap' }}>
            {steps.map((step, i) => (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 20px', borderRadius: '100px',
                  background: activeStep === i ? step.color : 'rgba(255,255,255,0.04)',
                  color: activeStep === i ? '#fff' : 'rgba(255,255,255,0.4)',
                  border: `1.5px solid ${activeStep === i ? step.color : 'rgba(255,255,255,0.1)'}`,
                  fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  boxShadow: activeStep === i ? `0 0 20px ${step.color}55` : 'none',
                }}
              >
                <span style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: activeStep === i ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 800,
                }}>
                  {step.num}
                </span>
                <span style={{ fontSize: '1rem' }}>{step.emoji}</span>
              </button>
            ))}
          </div>

          {/* Steps — two-column layout on active */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {steps.map((step, i) => {
              const isActive = activeStep === i;
              return (
                <div
                  key={i}
                  onClick={() => setActiveStep(i)}
                  style={{
                    position: 'relative', overflow: 'hidden',
                    borderRadius: '24px',
                    border: `1px solid ${isActive ? step.color + '55' : 'rgba(255,255,255,0.06)'}`,
                    background: isActive
                      ? `linear-gradient(135deg, ${step.color}0f 0%, rgba(255,255,255,0.03) 100%)`
                      : 'rgba(255,255,255,0.025)',
                    cursor: 'pointer',
                    transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                    boxShadow: isActive ? `0 0 60px ${step.color}1a, inset 0 1px 0 ${step.color}20` : 'none',
                  }}
                >
                  {/* Left color bar */}
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: isActive ? '4px' : '0px',
                    background: `linear-gradient(180deg, ${step.color}, ${step.color}66)`,
                    borderRadius: '24px 0 0 24px',
                    transition: 'width 0.3s ease',
                    boxShadow: isActive ? `0 0 16px ${step.color}` : 'none',
                  }} />

                  {/* Giant background number */}
                  <div style={{
                    position: 'absolute', right: '-10px', top: '50%', transform: 'translateY(-50%)',
                    fontSize: '9rem', fontWeight: 900, color: '#fff',
                    opacity: isActive ? 0.04 : 0.025,
                    lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
                    fontFamily: 'var(--font-display, sans-serif)',
                    animation: isActive ? 'stepNumPulse 3s ease-in-out infinite' : 'none',
                    transition: 'opacity 0.4s ease',
                  }}>
                    {step.num}
                  </div>

                  <div style={{
                    padding: isActive ? '36px 40px' : '22px 36px',
                    transition: 'padding 0.3s ease',
                    display: 'flex', gap: '28px', alignItems: isActive ? 'flex-start' : 'center',
                  }}>
                    {/* Icon */}
                    <div style={{ flexShrink: 0 }}>
                      <div style={{
                        width: isActive ? '72px' : '52px',
                        height: isActive ? '72px' : '52px',
                        borderRadius: isActive ? '20px' : '14px',
                        background: isActive ? step.color : `${step.color}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: isActive ? '2rem' : '1.5rem',
                        transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                        boxShadow: isActive ? `0 12px 40px ${step.color}55` : 'none',
                        animation: isActive ? 'stepGlow 2.5s ease-in-out infinite' : 'none',
                      }}>
                        {step.emoji}
                      </div>
                      {isActive && (
                        <div style={{
                          marginTop: '10px', textAlign: 'center',
                          fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em',
                          color: step.color, textTransform: 'uppercase',
                        }}>
                          Étape {step.num}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: isActive ? '12px' : '4px' }}>
                        <h3 style={{
                          margin: 0,
                          fontSize: isActive ? '1.45rem' : '1.05rem',
                          color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                          fontWeight: 700,
                          transition: 'all 0.3s ease',
                        }}>
                          {step.title}
                        </h3>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          background: isActive ? `${step.color}20` : 'rgba(255,255,255,0.05)',
                          color: isActive ? step.color : 'rgba(255,255,255,0.3)',
                          borderRadius: '100px', padding: '4px 14px',
                          fontSize: '0.75rem', fontWeight: 700,
                          border: `1px solid ${isActive ? step.color + '40' : 'transparent'}`,
                          transition: 'all 0.3s ease',
                        }}>
                          <Clock size={11} />
                          {step.tag}
                        </span>
                      </div>

                      {!isActive && (
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.88rem', margin: 0 }}>
                          {step.subtitle}
                        </p>
                      )}

                      {isActive && (
                        <div style={{ animation: 'stepSlideIn 0.35s ease forwards' }}>
                          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1rem', lineHeight: 1.75, marginBottom: '24px' }}>
                            {step.desc}
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {step.checks.map((check, j) => (
                              <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                  width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                                  background: `${step.color}20`,
                                  border: `1.5px solid ${step.color}50`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                  <CheckCircle size={13} color={step.color} />
                                </div>
                                <span style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{check}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── GUARANTEES ─── */}
      <section style={{ padding: '80px 5%', background: 'linear-gradient(135deg, #f8f5ef 0%, #eef2ec 100%)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(30,43,34,0.06)', borderRadius: '100px',
              padding: '6px 16px', marginBottom: '16px',
            }}>
              <Shield size={14} color="#4A7C59" />
              <span style={{ color: '#1e2b22', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Nos garanties
              </span>
            </div>
            <h2 style={{ color: '#1e2b22', marginBottom: '12px' }}>Zéro risque, zéro surprise</h2>
            <p style={{ color: '#6b7d6f', maxWidth: '620px', margin: '0 auto', lineHeight: 1.75 }}>
              Pas d&apos;engagement, pas de mauvaise surprise. Vous restez maître de votre abonnement, de vos données et de votre rythme — à tout moment.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {guarantees.map((g, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: '20px',
                padding: '32px 24px', textAlign: 'center',
                boxShadow: '0 4px 24px rgba(30,43,34,0.06)',
                border: '1px solid rgba(30,43,34,0.06)',
                transition: 'transform 0.2s ease',
              }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '20px', margin: '0 auto 20px',
                  background: `${g.color}14`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem',
                }}>
                  {g.icon}
                </div>
                <h4 style={{ color: '#1e2b22', marginBottom: '8px', fontSize: '1rem' }}>{g.title}</h4>
                <p style={{ color: '#6b7d6f', fontSize: '0.88rem', margin: 0, lineHeight: 1.6 }}>{g.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="section-pad" style={{ padding: '100px 5%', background: '#fff' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(30,43,34,0.06)', borderRadius: '100px',
              padding: '6px 16px', marginBottom: '16px',
            }}>
              <MessageCircle size={14} color="#4A7C59" />
              <span style={{ color: '#1e2b22', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                FAQ
              </span>
            </div>
            <h2 style={{ color: '#1e2b22', marginBottom: '12px' }}>Vos questions, nos réponses</h2>
            <p style={{ color: '#6b7d6f', maxWidth: '400px', margin: '0 auto' }}>
              Des doutes ? C&apos;est normal. Voici les questions les plus fréquentes.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqs.map((faq, i) => (
              <div
                key={i}
                style={{
                  borderRadius: '16px',
                  border: `2px solid ${openFaq === i ? '#C9A96E' : 'rgba(30,43,34,0.08)'}`,
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  background: openFaq === i ? 'rgba(201,169,110,0.04)' : '#fff',
                }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: '16px',
                    padding: '20px 24px', background: 'none', border: 'none',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ color: '#1e2b22', fontWeight: 700, fontSize: '0.98rem' }}>{faq.q}</span>
                  <span style={{ flexShrink: 0, color: openFaq === i ? '#C9A96E' : '#9aab9e' }}>
                    {openFaq === i ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 24px 20px', color: '#6b7d6f', fontSize: '0.93rem', lineHeight: 1.8 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ INSTALLER L'APP — section complète ════════════ */}
      <section
        aria-label="Installer l'application AVRA PWA sur mobile et ordinateur"
        style={{
          background: 'linear-gradient(160deg, #060b07 0%, #0e1810 45%, #080f09 100%)',
          padding: '96px 5% 100px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated background orbs */}
        <div style={{ position: 'absolute', top: '-80px', right: '5%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(201,169,110,0.06) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none', animation: 'pwaOrb1 8s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '-100px', left: '0%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(74,124,89,0.05) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none', animation: 'pwaOrb2 10s ease-in-out infinite' }} />

        <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Badge + Title */}
          <div style={{ textAlign: 'center', marginBottom: '72px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.22)',
              borderRadius: '50px', padding: '7px 20px', marginBottom: '28px',
              fontSize: '0.78rem', fontWeight: 700, color: '#C9A96E',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              <span>📲</span> Disponible sur tous vos appareils
            </div>

            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800,
              color: '#fff', marginBottom: '20px', lineHeight: 1.15,
            }}>
              Installez AVRA sur votre{' '}
              <span style={{ background: 'linear-gradient(135deg, #e8c97a, #C9A96E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                téléphone ou PC
              </span>
              <br />en 30 secondes
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.05rem', maxWidth: '580px', margin: '0 auto', lineHeight: 1.75 }}>
              Pas d&apos;App Store, pas de téléchargement pesant. AVRA est une Progressive Web App (PWA) : installez-la en 2 clics depuis votre navigateur et accédez à toutes vos fonctionnalités même hors ligne.
            </p>
          </div>

          {/* Main content: left benefits + right platform steps */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'start', marginBottom: '72px' }} className="pwa-grid">
            {/* Left — benefits */}
            <div>
              <h3 style={{ color: '#C9A96E', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '32px' }}>
                Pourquoi installer l&apos;app ?
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { icon: '⚡', title: 'Ultra rapide', desc: 'L\'app s\'ouvre instantanément, sans temps de chargement. Vos données sont en cache local.' },
                  { icon: '📵', title: 'Fonctionne hors ligne', desc: 'Consultez vos dossiers et devis même sans connexion internet sur chantier.' },
                  { icon: '🔔', title: 'Notifications push', desc: 'Recevez les alertes de signature, paiement et messages clients directement sur votre téléphone.' },
                  { icon: '🖥️', title: 'Comme une app native', desc: 'Plein écran, sans barre de navigateur. Icône sur l\'écran d\'accueil, raccourci bureau.' },
                  { icon: '🔄', title: 'Toujours à jour', desc: 'Mises à jour automatiques silencieuses. Vous avez toujours la dernière version sans rien faire.' },
                ].map((b, i) => (
                  <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{
                      flexShrink: 0, width: '44px', height: '44px', borderRadius: '12px',
                      background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
                    }}>{b.icon}</div>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.92rem', marginBottom: '4px' }}>{b.title}</div>
                      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.83rem', lineHeight: 1.6 }}>{b.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — platform steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ color: '#C9A96E', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>
                Installation par appareil
              </h3>
              {[
                {
                  platform: '🤖 Android (Chrome)',
                  color: '#4A7C59',
                  steps: [
                    'Visitez avra.fr dans Chrome',
                    'Une bannière apparaît en bas : "Ajouter à l\'écran d\'accueil"',
                    'Appuyez sur Installer → c\'est fait !',
                  ],
                },
                {
                  platform: '🍎 iPhone / iPad (Safari)',
                  color: '#C9A96E',
                  steps: [
                    'Ouvrez avra.fr dans Safari',
                    'Appuyez sur le bouton Partager ↑',
                    'Choisissez "Sur l\'écran d\'accueil" → Ajouter',
                  ],
                },
                {
                  platform: '💻 PC / Mac (Chrome ou Edge)',
                  color: '#7B5EA7',
                  steps: [
                    'Ouvrez avra.fr dans Chrome ou Edge',
                    'Cliquez sur l\'icône ⊕ dans la barre d\'adresse',
                    'Confirmez l\'installation → fenêtre dédiée',
                  ],
                },
              ].map((p, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${p.color}28`,
                  borderRadius: '16px',
                  padding: '20px 24px',
                  borderLeft: `3px solid ${p.color}`,
                }}>
                  <div style={{ color: p.color, fontWeight: 700, fontSize: '0.88rem', marginBottom: '12px' }}>{p.platform}</div>
                  <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {p.steps.map((s, si) => (
                      <li key={si} style={{ display: 'flex', gap: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '0.83rem', lineHeight: 1.5 }}>
                        <span style={{ color: p.color, fontWeight: 700, flexShrink: 0 }}>{si + 1}.</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>

          {/* CTA button */}
          <div style={{ textAlign: 'center' }}>
            <PWAInstallCCM />
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', marginTop: '16px' }}>
              Compatible Chrome · Edge · Safari · Firefox · 100% gratuit
            </p>
          </div>
        </div>

        <style>{`
          @keyframes pwaOrb1 { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-30px) scale(1.05)} }
          @keyframes pwaOrb2 { 0%,100%{transform:translateX(0) scale(1)} 50%{transform:translateX(30px) scale(1.08)} }
          @media(max-width:768px) { .pwa-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </section>

      {/* ─── SUPPORT ─── */}
      <section style={{ padding: '80px 5%', background: '#f8f5ef' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ color: '#1e2b22', marginBottom: '12px' }}>On est là pour vous</h2>
            <p style={{ color: '#6b7d6f', maxWidth: '420px', margin: '0 auto' }}>
              Une question ? Un problème ? Notre équipe répond vite.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {[
              { icon: <MessageCircle size={22} color="#C9A96E" />, title: 'Chat en direct', desc: 'Réponse en temps réel, lun–ven.', bg: 'rgba(201,169,110,0.10)' },
              { icon: <Download size={22} color="#4A7C59" />, title: 'Email 24/7', desc: 'Réponse garantie en moins de 2h.', bg: 'rgba(74,124,89,0.10)' },
              { icon: <BookOpen size={22} color="#1e4d6b" />, title: 'Documentation', desc: 'Articles et guides détaillés.', bg: 'rgba(30,77,107,0.08)' },
              { icon: <Play size={22} color="#7B5EA7" />, title: 'Vidéos tutoriels', desc: 'Suivez chaque fonctionnalité pas à pas.', bg: 'rgba(123,94,167,0.08)' },
            ].map((item, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: '16px', padding: '28px 24px',
                boxShadow: '0 2px 16px rgba(30,43,34,0.05)',
                border: '1px solid rgba(30,43,34,0.06)',
              }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px',
                  background: item.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', marginBottom: '16px',
                }}>
                  {item.icon}
                </div>
                <h4 style={{ color: '#1e2b22', fontSize: '0.98rem', marginBottom: '6px' }}>{item.title}</h4>
                <p style={{ color: '#6b7d6f', fontSize: '0.85rem', margin: 0, lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      <Footer />
    </>
  );
}
