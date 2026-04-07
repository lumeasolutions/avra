'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, FolderOpen, Receipt, Sparkles, Calendar, Package, PenLine, ArrowRight, Check } from 'lucide-react';
import './(marketing)/marketing.css';
import Nav from './(marketing)/components/Nav';
import Footer from './(marketing)/components/Footer';
import ScrollReveal from './(marketing)/components/ScrollReveal';

export default function HomePage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const faqItems = [
    {
      question: 'Comment démarrer avec AVRA ?',
      answer: 'Créez un compte gratuit, configurez votre profil en 5 minutes, et commencez à gérer vos projets immédiatement. Aucune carte bancaire requise pour les 14 jours d\'essai.'
    },
    {
      question: 'AVRA est-il adapté pour mon métier ?',
      answer: 'AVRA est conçu pour cuisinistes, menuisiers, architectes d\'intérieur et agenceurs. Chaque métier a sa propre interface et workflow. Découvrez les cas d\'usage spécifiques dans notre section Métiers.'
    },
    {
      question: 'Mes données sont-elles sécurisées ?',
      answer: 'Oui, nous utilisons le chiffrement de bout en bout et respectons la RGPD. Vos données sont sauvegardées automatiquement et disponibles 24/7. Nous réalisons des audits de sécurité trimestriels.'
    },
    {
      question: 'Puis-je exporter mes données ?',
      answer: 'Absolument. Vous pouvez exporter vos données à tout moment au format Excel, PDF ou JSON. Aucune limite, aucun frais supplémentaire.'
    },
    {
      question: 'Quel support client offrez-vous ?',
      answer: 'Support 7j/7 inclus : email, chat en ligne, et vidéoconférence. Temps de réponse moyen : 2 heures. Accès à notre base de connaissances complète et webinaires mensuels.'
    },
  ];

  const features = [
    {
      icon: FolderOpen,
      title: 'Dossiers clients centralisés',
      description: 'Toutes les infos, documents, photos et échanges d\'un dossier en un seul endroit. Fini les fichiers éparpillés.',
      badge: 'Essentiel',
      badgeClass: 'badge-gold'
    },
    {
      icon: Receipt,
      title: 'Facturation intelligente',
      description: 'Devis, acomptes, factures et avoirs générés en 2 clics. Conformes à la réglementation française.',
      badge: 'Populaire',
      badgeClass: 'badge-gold'
    },
    {
      icon: Sparkles,
      title: 'IA Photo-réalisme',
      description: 'Générez des rendus photo-réalistes de cuisines et d\'aménagements directement depuis vos plans.',
      badge: 'IA',
      badgeClass: 'badge-gold'
    },
    {
      icon: Calendar,
      title: 'Planning & chantiers',
      description: 'Planifiez poses, livraisons et interventions avec un calendrier visuel partagé avec votre équipe.',
      badge: 'Pro',
      badgeClass: 'badge-green'
    },
    {
      icon: Package,
      title: 'Gestion de stock',
      description: 'Suivez vos matériaux, composants et commandes fournisseurs. Alertes de rupture automatiques.',
      badge: 'Pro',
      badgeClass: 'badge-green'
    },
    {
      icon: PenLine,
      title: 'Signature électronique',
      description: 'Faites signer vos devis et contrats en ligne en quelques secondes. Juridiquement valable.',
      badge: 'Inclus',
      badgeClass: 'badge-green'
    },
  ];

  const steps = [
    {
      number: '1',
      title: 'Créez votre compte',
      description: 'Inscription gratuite, configuration en 5 minutes sans carte bancaire.'
    },
    {
      number: '2',
      title: 'Importez vos clients',
      description: 'Synchronisez vos contacts ou importez-les en masse via CSV.'
    },
    {
      number: '3',
      title: 'Lancez vos projets',
      description: 'Créez des dossiers, générez des devis et commencez à facturer.'
    },
    {
      number: '4',
      title: 'Évoluez sans limite',
      description: 'Ajoutez des utilisateurs, des modules et des intégrations selon vos besoins.'
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'AVRA',
            description: 'ERP + IA pour les professionnels de l\'agencement intérieur',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            offers: { '@type': 'Offer', priceCurrency: 'EUR', price: '49' },
            author: { '@type': 'Organization', name: 'Luméa', url: 'https://avra.fr' },
          })
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
              acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer
              }
            }))
          })
        }}
      />

      <Nav />
      <ScrollReveal />

      {/* ════════════════════════════════════════════════════════════════
          HERO SECTION
          ════════════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        paddingTop: '76px',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #1e2b22 0%, #304035 100%)',
      }}>
        {/* SVG Pattern Background */}
        <svg
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            top: 0,
            left: 0,
            opacity: 0.03,
          }}
          viewBox="0 0 1200 800"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="1" fill="#c9a96e" />
            </pattern>
            <pattern id="grid" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#c9a96e" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 5%', width: '100%', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>
            {/* Left: Text Content */}
            <div className="reveal">
              <div className="section-label" style={{ background: 'rgba(201, 169, 110, 0.15)' }}>
                Nouveau · Lancé en 2026
              </div>
              <h1 style={{ color: '#fff', marginBottom: '1.5rem', fontSize: 'clamp(2.2rem, 4vw, 3.6rem)', fontFamily: 'var(--font-display)', lineHeight: 1.15 }}>
                Le logiciel qui libère les pros de l&apos;agencement
              </h1>
              <p style={{ color: 'rgba(255,255,255,.85)', fontSize: '1.1rem', marginBottom: '2rem', maxWidth: 500, lineHeight: 1.7 }}>
                Dossiers clients, facturation, planning, stock et IA photo-réalisme — tout en une seule app pensée pour les cuisinistes, menuisiers et architectes d&apos;intérieur.
              </p>

              {/* CTA Buttons */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '3rem' }}>
                <Link href="/register">
                  <button className="btn-primary">
                    Essai gratuit 14 jours
                    <ArrowRight size={18} />
                  </button>
                </Link>
                <Link href="/comment-ca-marche">
                  <button className="btn-secondary">Voir comment ça marche</button>
                </Link>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px', maxWidth: 480 }}>
                {[
                  { value: '2 400+', label: 'Professionnels' },
                  { value: '98%', label: 'Satisfaction' },
                  { value: '14 j', label: 'Essai gratuit' },
                ].map(({ value, label }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#c9a96e', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
                      {value}
                    </div>
                    <div style={{ fontSize: '.85rem', color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 500 }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Dashboard Mockup */}
            <div className="reveal reveal-delay-1" style={{
              position: 'relative',
              background: 'linear-gradient(135deg, rgba(255,255,255,.08), rgba(201,169,110,.06))',
              borderRadius: '20px',
              padding: '1.5rem',
              border: '1px solid rgba(201,169,110,.15)',
              backdropFilter: 'blur(20px)',
            }}>
              {/* Browser Header */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', alignItems: 'center' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
                <div style={{ flex: 1, height: 28, background: 'rgba(255,255,255,.08)', borderRadius: 6, marginLeft: 8 }} />
              </div>

              {/* Dashboard Content */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Dossiers actifs', val: '47', delta: '+12%', color: '#4a6350' },
                  { label: 'CA du mois', val: '84 200 €', delta: '+18%', color: '#c9a96e' },
                  { label: 'Devis en attente', val: '12', delta: '-3', color: '#304035' },
                  { label: 'Rendus IA générés', val: '234', delta: 'cette semaine', color: '#3d5244' },
                ].map((card) => (
                  <div key={card.label} style={{
                    background: 'rgba(255,255,255,.07)',
                    borderRadius: 12,
                    padding: '16px',
                    border: '1px solid rgba(201,169,110,.12)',
                  }}>
                    <div style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.5)', marginBottom: 8 }}>
                      {card.label}
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)', marginBottom: 6 }}>
                      {card.val}
                    </div>
                    <div style={{ fontSize: '.75rem', color: '#c9a96e' }}>
                      {card.delta}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pipeline Progress */}
              <div style={{ marginTop: 16, background: 'rgba(255,255,255,.05)', borderRadius: 12, padding: '14px', border: '1px solid rgba(201,169,110,.1)' }}>
                <div style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.4)', marginBottom: 8 }}>
                  Pipeline clients
                </div>
                {[
                  { name: 'Cuisine Dubois', stage: 'Devis envoyé', pct: 60 },
                  { name: 'Dressing Martin', stage: 'En fabrication', pct: 80 },
                  { name: 'Salon Perret', stage: 'Pose planifiée', pct: 95 },
                ].map((p) => (
                  <div key={p.name} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.75)' }}>
                        {p.name}
                      </span>
                      <span style={{ fontSize: '.75rem', color: '#c9a96e' }}>
                        {p.stage}
                      </span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,.1)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${p.pct}%`, background: 'linear-gradient(90deg, #a67749, #c9a96e)', borderRadius: 2, transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, animation: 'float 3s ease-in-out infinite' }}>
            <span style={{ fontSize: '.85rem', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
              Découvrez
            </span>
            <ChevronDown size={20} style={{ color: '#c9a96e' }} />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SOCIAL PROOF BAND
          ════════════════════════════════════════════════════════════════ */}
      <section style={{
        padding: '40px 5%',
        background: '#f9f6f0',
        borderTop: '1px solid rgba(48,64,53,.08)',
        borderBottom: '1px solid rgba(48,64,53,.08)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{
            fontSize: '.9rem',
            fontWeight: 600,
            color: '#6b7c70',
            textTransform: 'uppercase',
            letterSpacing: '.08em',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}>
            Rejoignez les professionnels qui ont choisi AVRA
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
            {['Cuisinistes', 'Menuisiers', "Architectes d'intérieur", 'Agenceurs'].map((role) => (
              <div
                key={role}
                style={{
                  padding: '10px 20px',
                  background: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid rgba(48,64,53,.12)',
                  fontSize: '.95rem',
                  fontWeight: 500,
                  color: '#1e2b22',
                  boxShadow: '0 2px 8px rgba(30,43,34,.08)',
                }}
              >
                {role}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          FEATURES GRID
          ════════════════════════════════════════════════════════════════ */}
      <section className="section" style={{ background: '#ffffff' }}>
        <div className="container">
          <div className="section-centered" style={{ marginBottom: '4rem' }}>
            <div className="section-label">Fonctionnalités</div>
            <h2 className="section-title">Tout ce dont vous avez besoin, rien de plus</h2>
            <p className="section-subtitle">
              AVRA remplace 6 outils différents par une seule interface pensée pour votre métier.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '24px',
          }}>
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="card reveal">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'flex-start' }}>
                    <div style={{ padding: '12px', background: 'rgba(201, 169, 110, 0.08)', borderRadius: '12px', color: '#c9a96e' }}>
                      <Icon size={24} />
                    </div>
                    <span className={`badge ${feature.badgeClass}`}>{feature.badge}</span>
                  </div>
                  <h3 style={{ marginBottom: '0.75rem', fontSize: '1.15rem' }}>
                    {feature.title}
                  </h3>
                  <p style={{ fontSize: '.95rem' }}>
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          IA SECTION
          ════════════════════════════════════════════════════════════════ */}
      <section className="section" style={{ background: '#1e2b22' }}>
        <div className="container" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '60px',
          alignItems: 'center',
        }}>
          {/* Text Content */}
          <div className="reveal" style={{ color: '#ffffff' }}>
            <div className="section-label">Intelligence Artificielle</div>
            <h2 style={{ color: '#ffffff', marginBottom: '1.5rem' }}>
              L&apos;IA qui transforme vos projets
            </h2>
            <p style={{ color: 'rgba(255,255,255,.75)', marginBottom: '2rem' }}>
              Décrivez votre projet en quelques mots, et AVRA génère des rendus photo-réalistes en quelques secondes.
              Présentez des visuels bluffants à vos clients avant même de commencer.
            </p>

            {/* Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {[
                'Rendus FLUX Pro ultra-réalistes',
                'Chat IA contextuel sur chaque dossier',
                'Suggestions automatiques de matériaux',
                'Export HD pour présentations clients',
              ].map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
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
                    fontSize: '.8rem',
                    fontWeight: 700,
                  }}>
                    <Check size={16} />
                  </div>
                  <span style={{ color: 'rgba(255,255,255,.85)', fontSize: '.95rem' }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>

            <Link href="/fonctionnalites#ia">
              <button className="btn-primary">
                Découvrir l&apos;IA AVRA
                <ArrowRight size={18} />
              </button>
            </Link>
          </div>

          {/* Chat UI Mockup */}
          <div className="reveal reveal-delay-1" style={{
            background: 'linear-gradient(135deg, rgba(201,169,110,.12), rgba(48,64,53,.3))',
            borderRadius: '20px',
            padding: '2rem',
            border: '1px solid rgba(201,169,110,.15)',
          }}>
            {/* Chat Header */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(201,169,110,.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
              }}>
                🤖
              </div>
              <div>
                <div style={{ color: '#c9a96e', fontWeight: 600, fontSize: '.95rem' }}>
                  Assistant AVRA
                </div>
                <div style={{ color: 'rgba(255,255,255,.4)', fontSize: '.8rem' }}>
                  Basé sur Claude AI
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            {[
              {
                who: 'user',
                text: 'Génère un rendu d\'une cuisine moderne blanc et bois avec îlot central.',
              },
              {
                who: 'ai',
                text: 'Rendu en cours de génération... ✨ Image créée en 4 secondes. Souhaitez-vous une version avec éclairage tamisé ?',
              },
            ].map((msg, i) => (
              <div
                key={i}
                style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  marginBottom: '12px',
                  background: msg.who === 'user' ? 'rgba(255,255,255,.08)' : 'rgba(201,169,110,.12)',
                  border: `1px solid ${msg.who === 'user' ? 'rgba(255,255,255,.1)' : 'rgba(201,169,110,.2)'}`,
                  textAlign: msg.who === 'user' ? 'right' : 'left',
                }}
              >
                <p style={{ color: 'rgba(255,255,255,.9)', fontSize: '.88rem', margin: 0 }}>
                  {msg.text}
                </p>
              </div>
            ))}

            {/* Image Placeholder */}
            <div style={{
              height: 120,
              background: 'rgba(201,169,110,.08)',
              borderRadius: 12,
              border: '1px dashed rgba(201,169,110,.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <span style={{ fontSize: '1.5rem' }}>📸</span>
              <span style={{ color: 'rgba(201,169,110,.6)', fontSize: '.85rem' }}>
                Rendu généré
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          PIPELINE CRM
          ════════════════════════════════════════════════════════════════ */}
      <section className="section" style={{ background: '#f9f6f0' }}>
        <div className="container" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '60px',
          alignItems: 'center',
        }}>
          {/* Left: Pipeline Bars */}
          <div className="reveal" style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 2px 8px rgba(30,43,34,.08)',
            border: '1px solid rgba(48,64,53,.08)',
          }}>
            <div style={{ fontWeight: 600, marginBottom: '1.5rem', fontSize: '1rem', color: '#1e2b22' }}>
              Pipeline Projets
            </div>
            {[
              { stage: 'Prospect', count: 8, color: '#6b7c70' },
              { stage: 'Devis envoyé', count: 12, color: '#c9a96e' },
              { stage: 'Accepté', count: 6, color: '#4a6350' },
              { stage: 'En cours', count: 9, color: '#304035' },
              { stage: 'Livré', count: 47, color: '#1e2b22' },
            ].map((s) => (
              <div key={s.stage} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{ flex: '0 0 120px', fontSize: '.85rem', color: '#6b7c70', fontWeight: 500 }}>
                  {s.stage}
                </div>
                <div style={{ flex: 1, height: 24, background: '#ede5dd', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, s.count * 2)}%`,
                    background: s.color,
                    borderRadius: 6,
                    transition: 'width 0.8s ease',
                  }} />
                </div>
                <span style={{ fontSize: '.85rem', fontWeight: 700, color: '#1e2b22', width: 30, textAlign: 'right' }}>
                  {s.count}
                </span>
              </div>
            ))}
          </div>

          {/* Right: Text Content */}
          <div className="reveal reveal-delay-1">
            <div className="section-label">CRM intégré</div>
            <h2 className="section-title">Visualisez votre pipeline d&apos;un coup d&apos;œil</h2>
            <p style={{ marginBottom: '2rem' }}>
              De la première prise de contact à la livraison finale, suivez chaque projet en temps réel.
              Relances automatiques, rappels et historique complet de chaque client.
            </p>
            <Link href="/fonctionnalites#crm">
              <button className="btn-outline">
                En savoir plus sur le CRM
                <ArrowRight size={18} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          COMMENT CA MARCHE - 4 STEPS
          ════════════════════════════════════════════════════════════════ */}
      <section className="section" style={{ background: '#ffffff' }}>
        <div className="container">
          <div className="section-centered" style={{ marginBottom: '4rem' }}>
            <div className="section-label">Processus</div>
            <h2 className="section-title">Comment ça marche en 4 étapes</h2>
            <p className="section-subtitle">
              Mettre en place AVRA prend quelques minutes seulement.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '32px',
          }}>
            {steps.map((step, idx) => (
              <div key={step.number} className="reveal" style={{ textAlign: 'center' }}>
                {/* Numbered Circle */}
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #c9a96e, #a67749)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  margin: '0 auto 1.5rem',
                  boxShadow: '0 4px 20px rgba(201,169,110,.3)',
                }}>
                  {step.number}
                </div>
                <h3 style={{ marginBottom: '.75rem' }}>{step.title}</h3>
                <p style={{ fontSize: '.95rem' }}>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          TESTIMONIAL
          ════════════════════════════════════════════════════════════════ */}
      <section className="section section-centered" style={{ background: '#f9f6f0' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem', color: '#c9a96e', lineHeight: 1 }}>
            &ldquo;
          </div>
          <blockquote style={{
            fontSize: '1.4rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            color: '#1e2b22',
            marginBottom: '2rem',
            lineHeight: 1.6,
          }}>
            AVRA a transformé notre façon de travailler. On a gagné 8 heures par semaine sur l&apos;administratif,
            et nos clients adorent les rendus IA — ça fait vraiment la différence pour décrocher les chantiers.
          </blockquote>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3d5244, #4a6350)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '1.1rem',
            }}>
              SL
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, color: '#1e2b22', marginBottom: 4 }}>
                Sophie L.
              </div>
              <div style={{ fontSize: '.85rem', color: '#6b7c70' }}>
                Cuisiniste — Lyon • 12 ans d&apos;expérience
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          FAQ ACCORDION
          ════════════════════════════════════════════════════════════════ */}
      <section className="section" style={{ background: '#ffffff' }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <div className="section-centered" style={{ marginBottom: '3rem' }}>
            <div className="section-label">Questions fréquentes</div>
            <h2 className="section-title">FAQ</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqItems.map((item, idx) => (
              <div key={idx} className="reveal" style={{
                border: '1px solid rgba(48,64,53,.12)',
                borderRadius: '12px',
                overflow: 'hidden',
                background: '#ffffff',
              }}>
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '20px',
                    background: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#1e2b22',
                    textAlign: 'left',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(48,64,53,.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                  }}
                >
                  {item.question}
                  <ChevronDown
                    size={20}
                    style={{
                      color: '#6b7c70',
                      transform: openFaqIndex === idx ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease',
                    }}
                  />
                </button>

                {openFaqIndex === idx && (
                  <div style={{
                    padding: '0 20px 20px',
                    background: 'rgba(201,169,110,.03)',
                    borderTop: '1px solid rgba(48,64,53,.08)',
                    color: '#6b7c70',
                    lineHeight: '1.7',
                    animation: 'fadeDown 0.3s ease-out',
                  }}>
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          CTA FINAL
          ════════════════════════════════════════════════════════════════ */}
      <section className="section section-centered" style={{
        background: 'linear-gradient(135deg, #1e2b22 0%, #304035 100%)',
      }}>
        <div className="container">
          <div className="section-label" style={{ margin: '0 auto 1.5rem', background: 'rgba(201,169,110,.15)' }}>
            Prêt à transformer votre activité ?
          </div>
          <h2 style={{ color: '#ffffff', marginBottom: '1.5rem' }}>
            Commencez gratuitement dès aujourd&apos;hui
          </h2>
          <p style={{ color: 'rgba(255,255,255,.75)', maxWidth: 560, margin: '0 auto 2.5rem' }}>
            14 jours d&apos;essai gratuit, sans carte bancaire. Configurez votre compte en 5 minutes
            et rejoignez les 2 400+ professionnels qui font confiance à AVRA.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register">
              <button className="btn-primary">
                Commencer l&apos;essai gratuit
                <ArrowRight size={18} />
              </button>
            </Link>
            <Link href="/tarifs">
              <button className="btn-secondary">Voir les tarifs</button>
            </Link>
          </div>

          <p style={{ marginTop: '1.5rem', fontSize: '.85rem', color: 'rgba(255,255,255,.4)' }}>
            ✓ Sans carte bancaire &nbsp;&nbsp; ✓ Configuration en 5 min &nbsp;&nbsp; ✓ Support inclus
          </p>
        </div>
      </section>

      <Footer />

      <style>{`
        @keyframes fadeDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
