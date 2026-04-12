'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronDown,
  FolderOpen,
  Receipt,
  Sparkles,
  Calendar,
  Package,
  PenLine,
  ArrowRight,
  Check,
  Star,
  BarChart3,
  Users,
  Shield,
  Zap,
} from 'lucide-react';
import './(marketing)/marketing.css';
import Nav from './(marketing)/components/Nav';
import Footer from './(marketing)/components/Footer';

export default function HomePage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const faqItems = [
    {
      question: 'Comment démarrer avec AVRA ?',
      answer: "Créez un compte gratuit, configurez votre profil en 5 minutes, et commencez à gérer vos projets immédiatement. Aucune carte bancaire requise pour les 14 jours d'essai.",
    },
    {
      question: 'AVRA est-il adapté pour mon métier ?',
      answer: "AVRA est conçu pour cuisinistes, menuisiers, architectes d'intérieur et agenceurs. Chaque métier a sa propre interface et workflow. Découvrez les cas d'usage spécifiques dans notre section Métiers.",
    },
    {
      question: 'Mes données sont-elles sécurisées ?',
      answer: 'Oui, nous utilisons le chiffrement de bout en bout et respectons la RGPD. Vos données sont sauvegardées automatiquement et disponibles 24/7. Nous réalisons des audits de sécurité trimestriels.',
    },
    {
      question: 'Puis-je exporter mes données ?',
      answer: 'Absolument. Vous pouvez exporter vos données à tout moment au format Excel, PDF ou JSON. Aucune limite, aucun frais supplémentaire.',
    },
    {
      question: 'Quel support client offrez-vous ?',
      answer: 'Support 7j/7 inclus : email, chat en ligne, et vidéoconférence. Temps de réponse moyen : 2 heures. Accès à notre base de connaissances complète et webinaires mensuels.',
    },
  ];

  return (
    <>
      {/* ── JSON-LD SEO ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'AVRA',
            description: "ERP + IA pour les professionnels de l'agencement intérieur",
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: 'https://avra.fr',
            offers: { '@type': 'Offer', priceCurrency: 'EUR', price: '49' },
            author: { '@type': 'Organization', name: 'Luméa', url: 'https://avra.fr' },
            aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', reviewCount: '312' },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqItems.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: item.answer },
            })),
          }),
        }}
      />

      <Nav />

      {/* ════════════════════════════════════════════════════════════════
          HERO — full-height avec image de fond kitchen
          ════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          paddingTop: '76px',
          overflow: 'hidden',
          background: '#1e2b22',
        }}
      >
        {/* Image de fond */}
        <Image
          src="/images/home-hero-bg.webp"
          alt="Cuisine premium agencement intérieur"
          fill
          priority
          style={{ objectFit: 'cover', opacity: 0.28 }}
        />
        {/* Overlay gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(14,24,16,0.88) 0%, rgba(30,43,34,0.78) 50%, rgba(48,64,53,0.65) 100%)',
          }}
        />

        <div
          className="hero-grid"
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '80px 5%',
            width: '100%',
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '70px',
            alignItems: 'center',
          }}
        >
          {/* Colonne gauche : texte */}
          <div>
            {/* Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                background: 'rgba(201,169,110,.15)',
                border: '1px solid rgba(201,169,110,.35)',
                borderRadius: '100px',
                marginBottom: '2rem',
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#c9a96e',
                  boxShadow: '0 0 6px #c9a96e',
                }}
              />
              <span
                style={{
                  fontSize: '.82rem',
                  fontWeight: 600,
                  color: '#c9a96e',
                  textTransform: 'uppercase',
                  letterSpacing: '.1em',
                }}
              >
                N°1 de l&apos;agencement · Lancé en 2026
              </span>
            </div>

            {/* Titre principal */}
            <h1
              style={{
                color: '#ffffff',
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                marginBottom: '1.5rem',
              }}
            >
              Le logiciel qui{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #c9a96e, #d4b882)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                libère les pros
              </span>
              {' '}de l&apos;agencement
            </h1>

            <p
              style={{
                color: 'rgba(255,255,255,.82)',
                fontSize: '1.15rem',
                lineHeight: 1.7,
                marginBottom: '2.5rem',
                maxWidth: 520,
              }}
            >
              Dossiers clients, facturation conforme e-facture 2026, planning, stock et IA
              photo-réalisme — tout en une seule app pensée pour les cuisinistes, menuisiers et
              architectes d&apos;intérieur.
            </p>

            {/* CTA buttons */}
            <div
              className="cta-buttons-row"
              style={{
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap',
                alignItems: 'center',
                marginBottom: '3rem',
              }}
            >
              <Link href="/register">
                <button
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '16px 32px',
                    background: 'linear-gradient(135deg, #c9a96e, #a67749)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 8px 32px rgba(201,169,110,.4)',
                    transition: 'all 0.3s ease',
                    fontFamily: 'inherit',
                  }}
                >
                  Essai gratuit 14 jours
                  <ArrowRight size={18} />
                </button>
              </Link>
              <Link href="/comment-ca-marche">
                <button
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '15px 28px',
                    background: 'rgba(255,255,255,.1)',
                    color: '#ffffff',
                    border: '1.5px solid rgba(255,255,255,.3)',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backdropFilter: 'blur(8px)',
                    fontFamily: 'inherit',
                  }}
                >
                  Voir la démo
                </button>
              </Link>
            </div>

            {/* Stats */}
            <div className="hero-stats" style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
              {[
                { value: '2 400+', label: 'Professionnels' },
                { value: '98%', label: 'Satisfaction' },
                { value: '14 j', label: 'Essai gratuit' },
              ].map(({ value, label }) => (
                <div key={label}>
                  <div
                    style={{
                      fontSize: '1.9rem',
                      fontWeight: 800,
                      color: '#c9a96e',
                      fontFamily: 'var(--font-display)',
                      lineHeight: 1,
                      marginBottom: '4px',
                    }}
                  >
                    {value}
                  </div>
                  <div
                    style={{
                      fontSize: '.8rem',
                      color: 'rgba(255,255,255,.5)',
                      textTransform: 'uppercase',
                      letterSpacing: '.1em',
                      fontWeight: 500,
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Colonne droite : logo doré + mockup dashboard */}
          <div className="hero-right-col" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px' }}>

            {/* Chouette AVRA hero */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '280px', height: '280px', animation: 'logoFloat 5s ease-in-out infinite' }}>
              <Image
                src="/logochouette4.png"
                alt="AVRA Mascotte — Logiciel N°1 agencement"
                fill
                priority
                sizes="280px"
                style={{ objectFit: 'contain', filter: 'brightness(0.9) saturate(0.85)' }}
              />
            </div>

          {/* Mockup dashboard */}
          <div
            style={{
              background: 'rgba(255,255,255,.07)',
              borderRadius: '20px',
              padding: '1.75rem',
              border: '1px solid rgba(201,169,110,.18)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 32px 80px rgba(0,0,0,.35)',
            }}
          >
            {/* Barre navigateur */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                marginBottom: '1.5rem',
                paddingBottom: '1.5rem',
                borderBottom: '1px solid rgba(255,255,255,.08)',
              }}
            >
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
              <div
                style={{
                  flex: 1,
                  height: 28,
                  background: 'rgba(255,255,255,.07)',
                  borderRadius: 6,
                  marginLeft: 8,
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 10,
                  gap: 6,
                }}
              >
                <Shield size={11} style={{ color: '#28c840' }} />
                <span style={{ fontSize: '.75rem', color: 'rgba(255,255,255,.35)' }}>
                  app.avra.fr
                </span>
              </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {[
                { label: 'Dossiers actifs', val: '47', delta: '↑ +12%', positive: true },
                { label: 'CA du mois', val: '84 200 €', delta: '↑ +18%', positive: true },
                { label: 'Devis en attente', val: '12', delta: '3 à relancer', positive: false },
                { label: 'Rendus IA générés', val: '234', delta: 'cette semaine', positive: true },
              ].map((card) => (
                <div
                  key={card.label}
                  style={{
                    background: 'rgba(255,255,255,.06)',
                    borderRadius: 12,
                    padding: '14px',
                    border: '1px solid rgba(201,169,110,.1)',
                  }}
                >
                  <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.45)', marginBottom: 6, fontWeight: 500 }}>
                    {card.label}
                  </div>
                  <div
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      fontFamily: 'var(--font-display)',
                      marginBottom: 4,
                    }}
                  >
                    {card.val}
                  </div>
                  <div
                    style={{
                      fontSize: '.72rem',
                      color: card.positive ? '#c9a96e' : 'rgba(255,255,255,.4)',
                    }}
                  >
                    {card.delta}
                  </div>
                </div>
              ))}
            </div>

            {/* Pipeline */}
            <div
              style={{
                background: 'rgba(255,255,255,.04)',
                borderRadius: 12,
                padding: '14px',
                border: '1px solid rgba(201,169,110,.08)',
              }}
            >
              <div
                style={{
                  fontSize: '.72rem',
                  color: 'rgba(255,255,255,.35)',
                  marginBottom: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '.08em',
                }}
              >
                Pipeline clients
              </div>
              {[
                { name: 'Cuisine Dubois', stage: 'Devis envoyé', pct: 60 },
                { name: 'Dressing Martin', stage: 'En fabrication', pct: 80 },
                { name: 'Salon Perret', stage: 'Pose planifiée', pct: 95 },
              ].map((p) => (
                <div key={p.name} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.7)', fontWeight: 500 }}>
                      {p.name}
                    </span>
                    <span style={{ fontSize: '.72rem', color: '#c9a96e' }}>{p.stage}</span>
                  </div>
                  <div
                    style={{
                      height: 5,
                      background: 'rgba(255,255,255,.08)',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${p.pct}%`,
                        background: 'linear-gradient(90deg, #a67749, #c9a96e)',
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>{/* fin colonne droite flex wrapper */}
        </div>

        {/* Scroll indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: 36,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontSize: '.78rem',
              color: 'rgba(255,255,255,.4)',
              textTransform: 'uppercase',
              letterSpacing: '.1em',
            }}
          >
            Découvrez
          </span>
          <ChevronDown size={18} style={{ color: '#c9a96e' }} />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SOCIAL PROOF BAND
          ════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          padding: '36px 5%',
          background: '#f9f6f0',
          borderTop: '1px solid rgba(48,64,53,.08)',
          borderBottom: '1px solid rgba(48,64,53,.08)',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p
            style={{
              fontSize: '.82rem',
              fontWeight: 700,
              color: '#6b7c70',
              textTransform: 'uppercase',
              letterSpacing: '.12em',
              marginBottom: '1.25rem',
              textAlign: 'center',
            }}
          >
            Ils font confiance à AVRA
          </p>
          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {[
              { label: 'Cuisinistes', icon: '🍳' },
              { label: 'Menuisiers', icon: '🪵' },
              { label: "Architectes d'intérieur", icon: '📐' },
              { label: 'Agenceurs', icon: '🛋️' },
              { label: 'Décorateurs', icon: '🎨' },
            ].map(({ label, icon }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  background: '#ffffff',
                  borderRadius: '100px',
                  border: '1px solid rgba(48,64,53,.12)',
                  fontSize: '.9rem',
                  fontWeight: 600,
                  color: '#1e2b22',
                  boxShadow: '0 2px 8px rgba(30,43,34,.06)',
                }}
              >
                <span>{icon}</span>
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          FEATURES GRID — 6 cartes avec vraie image en fond de section
          ════════════════════════════════════════════════════════════════ */}
      <section className="section-pad" style={{
          padding: '100px 5%',
          background: '#ffffff',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
            <div
              style={{
                display: 'inline-block',
                padding: '5px 16px',
                background: 'rgba(201,169,110,.1)',
                border: '1px solid rgba(201,169,110,.3)',
                borderRadius: '100px',
                fontSize: '.78rem',
                fontWeight: 700,
                color: '#a67749',
                textTransform: 'uppercase',
                letterSpacing: '.12em',
                marginBottom: '1.25rem',
              }}
            >
              Fonctionnalités
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
                fontWeight: 700,
                color: '#1e2b22',
                marginBottom: '1rem',
              }}
            >
              Tout ce dont vous avez besoin,{' '}
              <span style={{ color: '#c9a96e' }}>rien de plus</span>
            </h2>
            <p
              style={{
                fontSize: '1.05rem',
                color: '#6b7c70',
                maxWidth: 580,
                margin: '0 auto',
                lineHeight: 1.7,
              }}
            >
              AVRA remplace 6 outils différents par une seule interface pensée pour votre métier.
            </p>
          </div>

          {/* Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '24px',
            }}
          >
            {[
              {
                icon: FolderOpen,
                title: 'Dossiers clients centralisés',
                desc: "Toutes les infos, documents, photos et échanges d'un dossier en un seul endroit. Fini les fichiers éparpillés.",
                badge: 'Essentiel',
                href: '/fonctionnalites#dossiers',
              },
              {
                icon: Receipt,
                title: 'Facturation intelligente',
                desc: 'Devis, acomptes, factures et avoirs générés en 2 clics. Conformes à la réglementation e-facture 2026.',
                badge: 'Populaire',
                href: '/fonctionnalites#facturation',
              },
              {
                icon: Sparkles,
                title: 'IA Photo-réalisme',
                desc: "Générez des rendus photo-réalistes de cuisines et d'aménagements directement depuis vos plans et descriptions.",
                badge: 'IA',
                href: '/fonctionnalites#ia',
              },
              {
                icon: Calendar,
                title: 'Planning & chantiers',
                desc: 'Planifiez poses, livraisons et interventions avec un calendrier visuel partagé avec votre équipe.',
                badge: 'Pro',
                href: '/fonctionnalites#planning',
              },
              {
                icon: Package,
                title: 'Gestion de stock',
                desc: 'Suivez vos matériaux, composants et commandes fournisseurs. Alertes de rupture automatiques.',
                badge: 'Pro',
                href: '/fonctionnalites#stock',
              },
              {
                icon: PenLine,
                title: 'Signature électronique',
                desc: 'Faites signer vos devis et contrats en ligne en quelques secondes. Juridiquement valable.',
                badge: 'Inclus',
                href: '/fonctionnalites#signature',
              },
            ].map((f) => {
              const Icon = f.icon;
              const isIA = f.badge === 'IA';
              return (
                <Link key={f.title} href={f.href} style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      padding: '2rem',
                      border: '1px solid rgba(48,64,53,.1)',
                      boxShadow: '0 2px 16px rgba(30,43,34,.06)',
                      height: '100%',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(30,43,34,.12)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 16px rgba(30,43,34,.06)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Icon + Badge */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '1.5rem',
                      }}
                    >
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: '14px',
                          background: isIA
                            ? 'linear-gradient(135deg, rgba(138,43,226,.12), rgba(201,169,110,.12))'
                            : 'rgba(201,169,110,.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isIA ? '#8b5cf6' : '#c9a96e',
                          border: isIA
                            ? '1px solid rgba(138,43,226,.2)'
                            : '1px solid rgba(201,169,110,.2)',
                        }}
                      >
                        <Icon size={22} />
                      </div>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '100px',
                          fontSize: '.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '.08em',
                          background: isIA
                            ? 'rgba(138,43,226,.1)'
                            : 'rgba(201,169,110,.12)',
                          color: isIA ? '#8b5cf6' : '#a67749',
                          border: isIA
                            ? '1px solid rgba(138,43,226,.2)'
                            : '1px solid rgba(201,169,110,.25)',
                        }}
                      >
                        {f.badge}
                      </span>
                    </div>

                    <h3
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color: '#1e2b22',
                        marginBottom: '.75rem',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {f.title}
                    </h3>
                    <p style={{ fontSize: '.92rem', color: '#6b7c70', lineHeight: 1.65 }}>
                      {f.desc}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '1.25rem',
                        fontSize: '.85rem',
                        fontWeight: 600,
                        color: '#c9a96e',
                      }}
                    >
                      En savoir plus <ArrowRight size={14} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* CTA vers fonctionnalites */}
          <div style={{ textAlign: 'center', marginTop: '3.5rem' }}>
            <Link href="/fonctionnalites">
              <button
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px 28px',
                  background: '#1e2b22',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 20px rgba(30,43,34,.2)',
                }}
              >
                Voir toutes les fonctionnalités
                <ArrowRight size={17} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          IA SECTION — dark bg avec vraie image
          ════════════════════════════════════════════════════════════════ */}
      <section className="section-pad" style={{
          padding: '100px 5%',
          background: '#1e2b22',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Image décorative */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '45%',
            opacity: 0.18,
          }}
        >
          <Image
            src="/images/kitchen-1.webp"
            alt="Rendu IA cuisine"
            fill
            style={{ objectFit: 'cover' }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, #1e2b22 55%, transparent 100%)',
          }}
        />

        <div
          className="grid-2col"
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '80px',
            alignItems: 'center',
          }}
        >
          {/* Texte */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 16px',
                background: 'rgba(138,43,226,.15)',
                border: '1px solid rgba(138,43,226,.3)',
                borderRadius: '100px',
                fontSize: '.78rem',
                fontWeight: 700,
                color: '#a78bfa',
                textTransform: 'uppercase',
                letterSpacing: '.1em',
                marginBottom: '1.5rem',
              }}
            >
              <Sparkles size={12} />
              Intelligence Artificielle
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '1.5rem',
                lineHeight: 1.2,
              }}
            >
              L&apos;IA qui{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #c9a96e, #d4b882)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                transforme vos projets
              </span>
            </h2>

            <p
              style={{
                color: 'rgba(255,255,255,.72)',
                fontSize: '1rem',
                lineHeight: 1.75,
                marginBottom: '2rem',
              }}
            >
              Décrivez votre projet en quelques mots, et AVRA génère des rendus photo-réalistes en
              quelques secondes. Présentez des visuels bluffants à vos clients avant même de
              commencer.
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                marginBottom: '2.5rem',
              }}
            >
              {[
                'Rendus FLUX Pro ultra-réalistes en HD',
                'Chat IA contextuel sur chaque dossier',
                'Suggestions automatiques de matériaux',
                'Export HD pour présentations clients',
              ].map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'rgba(201,169,110,.2)',
                      border: '2px solid #c9a96e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: '#c9a96e',
                    }}
                  >
                    <Check size={13} />
                  </div>
                  <span style={{ color: 'rgba(255,255,255,.82)', fontSize: '.95rem' }}>{item}</span>
                </div>
              ))}
            </div>

            <Link href="/fonctionnalites#ia">
              <button
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px 28px',
                  background: 'linear-gradient(135deg, #c9a96e, #a67749)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: '0 8px 24px rgba(201,169,110,.3)',
                }}
              >
                Découvrir l&apos;IA AVRA
                <ArrowRight size={17} />
              </button>
            </Link>
          </div>

          {/* Chat mockup */}
          <div
            style={{
              background: 'rgba(255,255,255,.06)',
              borderRadius: '20px',
              padding: '1.75rem',
              border: '1px solid rgba(201,169,110,.15)',
              backdropFilter: 'blur(16px)',
            }}
          >
            {/* Header chat */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '1.5rem',
                paddingBottom: '1.25rem',
                borderBottom: '1px solid rgba(255,255,255,.07)',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #8b5cf6, #c9a96e)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  flexShrink: 0,
                }}
              >
                ✨
              </div>
              <div>
                <div style={{ color: '#c9a96e', fontWeight: 700, fontSize: '.92rem' }}>
                  Assistant IA AVRA
                </div>
                <div style={{ color: 'rgba(255,255,255,.35)', fontSize: '.75rem' }}>
                  Basé sur Claude AI · En ligne
                </div>
              </div>
              <div
                style={{
                  marginLeft: 'auto',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#28c840',
                  boxShadow: '0 0 6px #28c840',
                }}
              />
            </div>

            {/* Messages */}
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(255,255,255,.07)',
                border: '1px solid rgba(255,255,255,.1)',
                borderRadius: '12px 12px 4px 12px',
                marginBottom: '12px',
                textAlign: 'right',
              }}
            >
              <p style={{ color: 'rgba(255,255,255,.88)', fontSize: '.88rem', margin: 0 }}>
                Génère un rendu d&apos;une cuisine moderne blanc et bois avec îlot central.
              </p>
            </div>

            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(201,169,110,.1)',
                border: '1px solid rgba(201,169,110,.2)',
                borderRadius: '4px 12px 12px 12px',
                marginBottom: '14px',
              }}
            >
              <p style={{ color: 'rgba(255,255,255,.88)', fontSize: '.88rem', margin: 0 }}>
                ✨ Rendu généré en 4 secondes. Souhaitez-vous une version avec éclairage tamisé ?
              </p>
            </div>

            {/* Rendered image preview */}
            <div
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                position: 'relative',
                aspectRatio: '16/9',
              }}
            >
              <Image
                src="/images/home-ia-preview.webp"
                alt="Rendu photo-réaliste IA cuisine"
                fill
                style={{ objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '10px 14px',
                  background: 'linear-gradient(to top, rgba(0,0,0,.7) 0%, transparent 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Sparkles size={13} style={{ color: '#c9a96e' }} />
                <span style={{ color: '#c9a96e', fontSize: '.78rem', fontWeight: 600 }}>
                  Rendu FLUX Pro · HD
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          PIPELINE CRM — avec image
          ════════════════════════════════════════════════════════════════ */}
      <section className="section-pad" style={{
          padding: '100px 5%',
          background: '#f9f6f0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          className="grid-2col"
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '80px',
            alignItems: 'center',
          }}
        >
          {/* Image + Pipeline card */}
          <div style={{ position: 'relative' }}>
            {/* Image principale */}
            <div
              style={{
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 24px 60px rgba(30,43,34,.15)',
                marginBottom: '20px',
              }}
            >
              <Image
                src="/images/home-crm-artisan.webp"
                alt="Designer cuisiniste professionnel gestion de projet AVRA"
                width={600}
                height={380}
                style={{ objectFit: 'cover', width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
            {/* Pipeline card flottante */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 8px 32px rgba(30,43,34,.12)',
                border: '1px solid rgba(48,64,53,.08)',
                position: 'relative',
                zIndex: 2,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '.88rem',
                  color: '#1e2b22',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <BarChart3 size={16} style={{ color: '#c9a96e' }} />
                Pipeline Projets
              </div>
              {[
                { stage: 'Prospect', count: 8, pct: 16 },
                { stage: 'Devis envoyé', count: 12, pct: 24 },
                { stage: 'Accepté', count: 6, pct: 12 },
                { stage: 'En cours', count: 9, pct: 18 },
                { stage: 'Livré', count: 47, pct: 94 },
              ].map((s, i) => {
                const colors = ['#6b7c70', '#c9a96e', '#4a6350', '#304035', '#1e2b22'];
                return (
                  <div
                    key={s.stage}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '10px',
                    }}
                  >
                    <div
                      style={{
                        flex: '0 0 110px',
                        fontSize: '.82rem',
                        color: '#6b7c70',
                        fontWeight: 500,
                      }}
                    >
                      {s.stage}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        height: 20,
                        background: '#f0ece6',
                        borderRadius: 6,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${s.pct}%`,
                          background: colors[i],
                          borderRadius: 6,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: '.82rem',
                        fontWeight: 700,
                        color: '#1e2b22',
                        width: 24,
                        textAlign: 'right',
                      }}
                    >
                      {s.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Texte CRM */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 16px',
                background: 'rgba(201,169,110,.1)',
                border: '1px solid rgba(201,169,110,.3)',
                borderRadius: '100px',
                fontSize: '.78rem',
                fontWeight: 700,
                color: '#a67749',
                textTransform: 'uppercase',
                letterSpacing: '.1em',
                marginBottom: '1.5rem',
              }}
            >
              <Users size={12} />
              CRM intégré
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
                fontWeight: 700,
                color: '#1e2b22',
                marginBottom: '1.25rem',
                lineHeight: 1.2,
              }}
            >
              Visualisez votre pipeline{' '}
              <span style={{ color: '#c9a96e' }}>d&apos;un coup d&apos;œil</span>
            </h2>

            <p
              style={{
                color: '#6b7c70',
                fontSize: '1rem',
                lineHeight: 1.75,
                marginBottom: '2rem',
              }}
            >
              De la première prise de contact à la livraison finale, suivez chaque projet en temps
              réel. Relances automatiques, rappels et historique complet de chaque client.
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '2.5rem',
              }}
            >
              {[
                'Suivi en temps réel de chaque projet',
                'Relances automatiques par e-mail',
                'Historique complet client',
                'Vue Kanban par étapes de projet',
              ].map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Check size={16} style={{ color: '#c9a96e', flexShrink: 0 }} />
                  <span style={{ color: '#1e2b22', fontSize: '.95rem' }}>{item}</span>
                </div>
              ))}
            </div>

            <Link href="/fonctionnalites#crm">
              <button
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '13px 24px',
                  background: 'transparent',
                  color: '#1e2b22',
                  border: '2px solid #1e2b22',
                  borderRadius: '12px',
                  fontSize: '.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                En savoir plus sur le CRM
                <ArrowRight size={17} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          STATS BANNER
          ════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          padding: '80px 5%',
          background: '#1e2b22',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Image
          src="/images/kitchen-3.webp"
          alt="Agencement intérieur premium"
          fill
          style={{ objectFit: 'cover', opacity: 0.12 }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(30,43,34,.75)',
          }}
        />
        <div
          className="stats-band-grid"
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '40px',
            textAlign: 'center',
          }}
        >
          {[
            { value: '2 400+', label: 'Professionnels actifs', icon: '👥' },
            { value: '8h/sem', label: 'Gagnées en moyenne', icon: '⏱️' },
            { value: '98%', label: 'Taux de satisfaction', icon: '⭐' },
            { value: '< 5 min', label: "Mise en route", icon: '🚀' },
          ].map(({ value, label, icon }) => (
            <div key={label}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{icon}</div>
              <div
                style={{
                  fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
                  fontWeight: 800,
                  color: '#c9a96e',
                  fontFamily: 'var(--font-display)',
                  lineHeight: 1,
                  marginBottom: '8px',
                }}
              >
                {value}
              </div>
              <div
                style={{
                  fontSize: '.85rem',
                  color: 'rgba(255,255,255,.55)',
                  textTransform: 'uppercase',
                  letterSpacing: '.08em',
                  fontWeight: 500,
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          COMMENT CA MARCHE — 4 étapes
          ════════════════════════════════════════════════════════════════ */}
      <section className="section-pad" style={{ padding: '100px 5%', background: '#ffffff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
            <div
              style={{
                display: 'inline-block',
                padding: '5px 16px',
                background: 'rgba(201,169,110,.1)',
                border: '1px solid rgba(201,169,110,.3)',
                borderRadius: '100px',
                fontSize: '.78rem',
                fontWeight: 700,
                color: '#a67749',
                textTransform: 'uppercase',
                letterSpacing: '.12em',
                marginBottom: '1.25rem',
              }}
            >
              Processus
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
                fontWeight: 700,
                color: '#1e2b22',
                marginBottom: '1rem',
              }}
            >
              Opérationnel en{' '}
              <span style={{ color: '#c9a96e' }}>4 étapes</span>
            </h2>
            <p
              style={{
                fontSize: '1rem',
                color: '#6b7c70',
                maxWidth: 520,
                margin: '0 auto',
              }}
            >
              Mettre en place AVRA prend quelques minutes seulement.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '32px',
            }}
          >
            {[
              {
                n: '1',
                title: 'Créez votre compte',
                desc: 'Inscription gratuite, configuration en 5 minutes sans carte bancaire.',
                icon: '📝',
              },
              {
                n: '2',
                title: 'Importez vos clients',
                desc: 'Synchronisez vos contacts ou importez-les en masse via CSV.',
                icon: '👥',
              },
              {
                n: '3',
                title: 'Lancez vos projets',
                desc: 'Créez des dossiers, générez des devis et commencez à facturer.',
                icon: '🚀',
              },
              {
                n: '4',
                title: 'Évoluez sans limite',
                desc: 'Ajoutez des utilisateurs, des modules et des intégrations.',
                icon: '📈',
              },
            ].map((step, idx) => (
              <div
                key={step.n}
                style={{
                  textAlign: 'center',
                  padding: '2.5rem 1.5rem',
                  background: '#ffffff',
                  borderRadius: '20px',
                  border: '1px solid rgba(48,64,53,.08)',
                  boxShadow: '0 4px 20px rgba(30,43,34,.06)',
                  position: 'relative',
                }}
              >
                {/* Ligne de connexion (sauf dernier) */}
                {idx < 3 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50px',
                      right: '-16px',
                      width: '32px',
                      height: '2px',
                      background: 'linear-gradient(90deg, #c9a96e, rgba(201,169,110,.2))',
                      zIndex: 2,
                    }}
                  />
                )}
                {/* Numéro */}
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #c9a96e, #a67749)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.6rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    margin: '0 auto 1.5rem',
                    fontFamily: 'var(--font-display)',
                    boxShadow: '0 6px 24px rgba(201,169,110,.35)',
                  }}
                >
                  {step.n}
                </div>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{step.icon}</div>
                <h3
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: '#1e2b22',
                    marginBottom: '.75rem',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {step.title}
                </h3>
                <p style={{ fontSize: '.9rem', color: '#6b7c70', lineHeight: 1.6 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials section removed */}
      {false && <section>
        <div
          style={{
            maxWidth: 900,
            margin: '0 auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Étoiles */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              justifyContent: 'center',
              marginBottom: '1.5rem',
            }}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={22}
                fill="#c9a96e"
                style={{ color: '#c9a96e' }}
              />
            ))}
          </div>

          {/* Quote */}
          <div
            style={{
              fontSize: '3rem',
              color: '#c9a96e',
              textAlign: 'center',
              lineHeight: 1,
              fontFamily: 'var(--font-display)',
              marginBottom: '1rem',
            }}
          >
            &ldquo;
          </div>

          <blockquote
            style={{
              fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              color: '#1e2b22',
              textAlign: 'center',
              marginBottom: '2.5rem',
              lineHeight: 1.6,
              fontStyle: 'italic',
            }}
          >
            AVRA a transformé notre façon de travailler. On a gagné 8 heures par semaine sur
            l&apos;administratif, et nos clients adorent les rendus IA — ça fait vraiment la
            différence pour décrocher les chantiers.
          </blockquote>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3d5244, #4a6350)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '1.1rem',
                flexShrink: 0,
                boxShadow: '0 4px 16px rgba(30,43,34,.2)',
              }}
            >
              SL
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, color: '#1e2b22', marginBottom: 3 }}>Sophie L.</div>
              <div style={{ fontSize: '.85rem', color: '#6b7c70' }}>
                Cuisiniste — Lyon &bull; 12 ans d&apos;expérience
              </div>
            </div>
          </div>

          {/* Petits témoignages secondaires */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '20px',
              marginTop: '4rem',
            }}
          >
            {[
              {
                text: 'La facturation e-facture 2026 est parfaite, on est conformes sans effort.',
                author: 'Marc D.',
                role: 'Menuisier — Bordeaux',
              },
              {
                text: "L'IA photo-réalisme nous a permis de signer 3 chantiers supplémentaires ce mois-ci.",
                author: 'Isabelle R.',
                role: "Architecte d'intérieur — Paris",
              },
              {
                text: 'Support réactif, prise en main immédiate. Exactement ce dont on avait besoin.',
                author: 'Thomas B.',
                role: 'Agenceur — Nantes',
              },
            ].map(({ text, author, role }) => (
              <div
                key={author}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  border: '1px solid rgba(48,64,53,.1)',
                  boxShadow: '0 4px 20px rgba(30,43,34,.06)',
                }}
              >
                <div style={{ display: 'flex', gap: '3px', marginBottom: '1rem' }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={14} fill="#c9a96e" style={{ color: '#c9a96e' }} />
                  ))}
                </div>
                <p
                  style={{
                    fontSize: '.9rem',
                    color: '#1e2b22',
                    lineHeight: 1.65,
                    marginBottom: '1rem',
                    fontStyle: 'italic',
                  }}
                >
                  &ldquo;{text}&rdquo;
                </p>
                <div style={{ fontWeight: 700, fontSize: '.85rem', color: '#1e2b22' }}>{author}</div>
                <div style={{ fontSize: '.78rem', color: '#6b7c70' }}>{role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>}

      {/* ════════════════════════════════════════════════════════════════
          FAQ ACCORDION
          ════════════════════════════════════════════════════════════════ */}
      <section className="section-pad" style={{ padding: '100px 5%', background: '#ffffff' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div
              style={{
                display: 'inline-block',
                padding: '5px 16px',
                background: 'rgba(201,169,110,.1)',
                border: '1px solid rgba(201,169,110,.3)',
                borderRadius: '100px',
                fontSize: '.78rem',
                fontWeight: 700,
                color: '#a67749',
                textTransform: 'uppercase',
                letterSpacing: '.12em',
                marginBottom: '1.25rem',
              }}
            >
              Questions fréquentes
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
                fontWeight: 700,
                color: '#1e2b22',
              }}
            >
              FAQ
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {faqItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  border: `1px solid ${openFaqIndex === idx ? 'rgba(201,169,110,.4)' : 'rgba(48,64,53,.1)'}`,
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: openFaqIndex === idx ? 'rgba(201,169,110,.03)' : '#ffffff',
                  transition: 'all 0.3s ease',
                }}
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '20px 24px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    fontSize: '.98rem',
                    fontWeight: 600,
                    color: '#1e2b22',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    size={18}
                    style={{
                      color: openFaqIndex === idx ? '#c9a96e' : '#6b7c70',
                      transform: openFaqIndex === idx ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'all 0.3s ease',
                      flexShrink: 0,
                    }}
                  />
                </button>

                {openFaqIndex === idx && (
                  <div
                    style={{
                      padding: '0 24px 20px',
                      color: '#6b7c70',
                      lineHeight: 1.75,
                      fontSize: '.95rem',
                      borderTop: '1px solid rgba(201,169,110,.12)',
                      paddingTop: '16px',
                    }}
                  >
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          CTA FINAL — avec image de fond
          ════════════════════════════════════════════════════════════════ */}
      <section className="section-pad" style={{
          padding: '100px 5%',
          background: '#1e2b22',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Image
          src="/images/kitchen-2.webp"
          alt="Cuisine agencement premium logiciel AVRA"
          fill
          style={{ objectFit: 'cover', opacity: 0.22 }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(14,24,16,.9) 0%, rgba(30,43,34,.8) 100%)',
          }}
        />

        <div
          style={{
            maxWidth: 700,
            margin: '0 auto',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 18px',
              background: 'rgba(201,169,110,.15)',
              border: '1px solid rgba(201,169,110,.35)',
              borderRadius: '100px',
              fontSize: '.78rem',
              fontWeight: 700,
              color: '#c9a96e',
              textTransform: 'uppercase',
              letterSpacing: '.12em',
              marginBottom: '2rem',
            }}
          >
            <Zap size={12} />
            Prêt à transformer votre activité ?
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '1.5rem',
              lineHeight: 1.15,
            }}
          >
            Commencez gratuitement{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #c9a96e, #d4b882)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              dès aujourd&apos;hui
            </span>
          </h2>

          <p
            style={{
              color: 'rgba(255,255,255,.72)',
              fontSize: '1.05rem',
              lineHeight: 1.75,
              maxWidth: 560,
              margin: '0 auto 3rem',
            }}
          >
            14 jours d&apos;essai gratuit, sans carte bancaire. Configurez votre compte en 5
            minutes et rejoignez les 2 400+ professionnels qui font confiance à AVRA.
          </p>

          <div
            style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '2rem',
            }}
          >
            <Link href="/register">
              <button
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '16px 36px',
                  background: 'linear-gradient(135deg, #c9a96e, #a67749)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: '0 8px 32px rgba(201,169,110,.4)',
                }}
              >
                Commencer l&apos;essai gratuit
                <ArrowRight size={18} />
              </button>
            </Link>
            <Link href="/tarifs">
              <button
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '15px 28px',
                  background: 'rgba(255,255,255,.1)',
                  color: '#ffffff',
                  border: '1.5px solid rgba(255,255,255,.3)',
                  borderRadius: '14px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                  fontFamily: 'inherit',
                }}
              >
                Voir les tarifs
              </button>
            </Link>
          </div>

          <p
            style={{
              fontSize: '.82rem',
              color: 'rgba(255,255,255,.35)',
              display: 'flex',
              gap: '20px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <span>✓ Sans carte bancaire</span>
            <span>✓ Configuration en 5 min</span>
            <span>✓ Support 7j/7 inclus</span>
          </p>
        </div>
      </section>

      <Footer />

      {/* Animations CSS globales pour le logo et la chouette */}
      <style>{`
        @keyframes logoPulse {
          0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        }
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        @keyframes heroRing1 {
          from { transform: translate(-50%, -50%) rotate(0deg); opacity: 0.6; }
          to { transform: translate(-50%, -50%) rotate(360deg); opacity: 0.6; }
        }
        @keyframes heroRing2 {
          from { transform: translate(-50%, -50%) rotate(0deg); opacity: 0.3; }
          to { transform: translate(-50%, -50%) rotate(-360deg); opacity: 0.3; }
        }
      `}</style>
    </>
  );
}
