'use client';

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import '../marketing.css';
import { useState } from 'react';
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
    subtitle: '30 secondes, sans carte bancaire',
    desc: 'Entrez votre email, choisissez un mot de passe. C\'est tout. Pas de CB, pas d\'engagement, pas de surprise. Vous êtes dans l\'app immédiatement.',
    tag: '30 secondes',
    tagColor: '#C9A96E',
    checks: ['Email + mot de passe uniquement', 'Accès immédiat à toutes les fonctionnalités', 'Aucune information bancaire requise'],
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
  { icon: '🎁', title: '14 jours gratuits', desc: 'Accès complet Pro. Sans CB.', color: '#C9A96E' },
  { icon: '🔓', title: 'Sans engagement', desc: 'Résiliez en 1 clic. 0 frais cachés.', color: '#4A7C59' },
  { icon: '📦', title: 'Vos données à vous', desc: 'Export CSV/Excel à tout moment.', color: '#1e4d6b' },
  { icon: '🔒', title: 'Sécurisé & fiable', desc: 'Hébergé en France, chiffré TLS.', color: '#7B5EA7' },
];

const faqs = [
  {
    q: 'Dois-je installer quelque chose ?',
    a: 'Non. AVRA est 100% web, accessible depuis n\'importe quel navigateur sur ordinateur, tablette ou smartphone. Aucune installation requise.',
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
    q: 'Que se passe-t-il après les 14 jours d\'essai ?',
    a: 'Vous choisissez le plan qui vous convient. Si vous ne souhaitez pas continuer, vos données sont exportables et supprimées sur demande. Aucun prélèvement automatique.',
  },
  {
    q: 'Est-ce que ça marche pour mon métier ?',
    a: 'AVRA est conçu spécifiquement pour les cuisinistes, menuisiers, agenceurs et architectes d\'intérieur. Chaque module est adapté aux besoins concrets de votre métier.',
  },
];

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
                  { label: 'Sans CB', time: '0€' },
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
                <Link href="/register" style={{ textDecoration: 'none' }}>
                  <button style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: 'linear-gradient(135deg, #C9A96E, #b8944f)',
                    color: '#fff', border: 'none', borderRadius: '12px',
                    padding: '14px 28px', fontSize: '1rem', fontWeight: 700,
                    cursor: 'pointer', boxShadow: '0 8px 24px rgba(201,169,110,0.35)',
                    transition: 'all 0.2s ease',
                  }}>
                    Essayer gratuitement <ArrowRight size={18} />
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
      <section id="etapes" style={{ padding: '100px 5%', background: '#fff' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '70px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(30,43,34,0.06)', borderRadius: '100px',
              padding: '6px 16px', marginBottom: '16px',
            }}>
              <span style={{ color: '#1e2b22', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                5 étapes simples
              </span>
            </div>
            <h2 style={{ color: '#1e2b22', marginBottom: '16px' }}>
              C&apos;est vraiment aussi simple
            </h2>
            <p style={{ color: '#6b7d6f', fontSize: '1.05rem', maxWidth: '500px', margin: '0 auto' }}>
              Chaque étape prend quelques minutes. Pas de formation, pas de technicien requis.
            </p>
          </div>

          {/* Step navigator pills */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '56px', flexWrap: 'wrap' }}>
            {steps.map((step, i) => (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 18px', borderRadius: '100px',
                  background: activeStep === i ? step.color : 'transparent',
                  color: activeStep === i ? '#fff' : '#6b7d6f',
                  border: `2px solid ${activeStep === i ? step.color : 'rgba(30,43,34,0.12)'}`,
                  fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: activeStep === i ? 'rgba(255,255,255,0.25)' : step.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 800, color: activeStep === i ? '#fff' : step.color,
                }}>
                  {step.num}
                </span>
                <span style={{ display: 'none' }}>{step.title}</span>
                {step.emoji}
              </button>
            ))}
          </div>

          {/* Steps list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isActive = activeStep === i;
              return (
                <div
                  key={i}
                  onClick={() => setActiveStep(i)}
                  style={{
                    display: 'flex', gap: '28px', alignItems: 'flex-start',
                    padding: '28px 32px',
                    background: isActive ? step.bg : '#fafafa',
                    borderRadius: '20px',
                    border: `2px solid ${isActive ? step.color : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: isActive ? `0 8px 32px ${step.color}22` : 'none',
                  }}
                >
                  {/* Number + icon */}
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '56px', height: '56px', borderRadius: '16px',
                      background: isActive ? step.color : 'rgba(30,43,34,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.6rem', transition: 'all 0.3s ease',
                      boxShadow: isActive ? `0 8px 24px ${step.color}44` : 'none',
                    }}>
                      {step.emoji}
                    </div>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em',
                      color: isActive ? step.color : 'rgba(30,43,34,0.3)',
                    }}>
                      ÉTAPE {step.num}
                    </span>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '1.2rem', color: '#1e2b22', margin: 0 }}>{step.title}</h3>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        background: isActive ? `${step.color}18` : 'rgba(30,43,34,0.05)',
                        color: isActive ? step.color : '#6b7d6f',
                        borderRadius: '100px', padding: '4px 12px',
                        fontSize: '0.78rem', fontWeight: 700,
                      }}>
                        <Clock size={12} />
                        {step.tag}
                      </span>
                    </div>
                    <p style={{ color: '#6b7d6f', fontSize: '0.9rem', margin: '0 0 4px', fontWeight: 500 }}>{step.subtitle}</p>

                    {isActive && (
                      <div style={{ marginTop: '16px' }}>
                        <p style={{ color: '#304035', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '16px' }}>{step.desc}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {step.checks.map((check, j) => (
                            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <CheckCircle size={16} color={step.color} />
                              <span style={{ fontSize: '0.88rem', color: '#304035', fontWeight: 500 }}>{check}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
            <p style={{ color: '#6b7d6f', maxWidth: '440px', margin: '0 auto' }}>
              On ne vous demande rien d&apos;engageant pour démarrer. Essayez, adoptez, ou partez — sans friction.
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

      {/* ─── CTA FINAL ─── */}
      <section className="section-pad" style={{
        padding: '100px 5%',
        background: 'linear-gradient(160deg, #0e1810 0%, #1e2b22 60%, #2d3e30 100%)',
        position: 'relative', overflow: 'hidden',
        textAlign: 'center',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,169,110,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '620px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🚀</div>
          <h2 style={{ color: '#fff', marginBottom: '16px', fontSize: '2.2rem' }}>
            Prêt à essayer ?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.05rem', marginBottom: '40px', lineHeight: 1.7 }}>
            14 jours gratuits, sans carte bancaire. Rejoignez 2 400+ professionnels qui gagnent du temps chaque jour avec AVRA.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '28px' }}>
            <Link href="/register" style={{ textDecoration: 'none' }}>
              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'linear-gradient(135deg, #C9A96E, #b8944f)',
                color: '#fff', border: 'none', borderRadius: '12px',
                padding: '16px 32px', fontSize: '1rem', fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 8px 32px rgba(201,169,110,0.35)',
              }}>
                Commencer gratuitement <ArrowRight size={18} />
              </button>
            </Link>
            <Link href="mailto:contact@avra.fr" style={{ textDecoration: 'none' }}>
              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.85)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px', padding: '16px 32px',
                fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
              }}>
                <MessageCircle size={18} /> Contacter l&apos;équipe
              </button>
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {['Sans engagement', 'Données sécurisées', 'Support inclus'].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={14} color="#4A7C59" />
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
