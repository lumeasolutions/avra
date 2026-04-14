import type { Metadata } from 'next';
import Image from 'next/image';
import '../marketing.css';
import {
  FolderOpen,
  Receipt,
  Sparkles,
  Calendar,
  Package,
  PenLine,
  BarChart3,
  Users,
  CheckCircle,
  ArrowRight,
  Zap,
  Shield,
  Clock,
} from 'lucide-react';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

export const metadata: Metadata = {
  title: 'Fonctionnalités AVRA — ERP complet pour cuisinistes et menuisiers',
  description:
    'Découvrez les 8 modules AVRA : gestion dossiers, facturation conforme e-facture 2026, IA photo-réalisme IA AVRA, planning, stock, signature électronique, statistiques et portails partenaires.',
  alternates: { canonical: 'https://avra.fr/fonctionnalites' },
  openGraph: {
    title: 'Fonctionnalités AVRA — Gestion complète',
    description:
      'Gestion dossiers, facturation e-facture 2026, IA Studio, planning, stock, signature électronique, statistiques et portails partenaires.',
    url: 'https://avra.fr/fonctionnalites',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AVRA',
  applicationCategory: 'BusinessApplication',
  featureList: [
    'Gestion des dossiers clients',
    'Facturation et devis intelligents',
    'IA Studio photo-réalisme',
    'Planning et gestion de chantiers',
    'Gestion de stock',
    'Signature électronique',
    'Pipeline CRM visuel',
    'Tableau de bord et statistiques',
  ],
  offers: {
    '@type': 'Offer',
    price: '49',
    priceCurrency: 'EUR',
  },
};

const features = [
  {
    id: 'dossiers',
    icon: FolderOpen,
    title: 'Gestion des dossiers clients',
    subtitle: 'Une gestion des dossiers conçue pour votre réalité terrain',
    desc: "Tous vos dossiers clients sont centralisés, qu'ils soient en cours ou signés. Chaque étape est organisée avec une trame claire et logique, conçue pour suivre vos projets du premier échange jusqu'au SAV. L'assistant AVRA est connecté à l'ensemble de vos dossiers et de votre planning pour vous alerter à chaque étape clé et éviter les oublis.",
    features: [
      'Dossier unifié par client',
      'Historique complet des échanges',
      'Tags et filtres avancés',
      'Accès multi-appareils',
      'Partage sécurisé avec clients',
      'Archivage automatique',
    ],
    badge: 'Essentiel',
    image: '/images/kitchen-4.webp',
    imageAlt: 'Interface gestion dossiers cuisiniste',
  },
  {
    id: 'facturation',
    icon: Receipt,
    title: 'Facturation & Devis intelligents',
    subtitle: 'Une facturation électronique intégrée, sans changer vos habitudes',
    desc: "AVRA s'intègre aux modules de facturation électronique de votre choix. Plus besoin de naviguer entre plusieurs outils : tout est accessible directement depuis vos dossiers. Facturation, e-signature, e-paiement… tout est regroupé sur une seule interface pour une gestion plus fluide et sans perte d'information.",
    features: [
      'Devis en 2 clics',
      'Catalogues produits intégrés',
      'Acomptes et soldes',
      'Facturation récurrente',
      'Relances automatiques',
      'Conformité e-facture 2026',
    ],
    badge: 'Populaire',
    image: '/images/interior-apres-1.webp',
    imageAlt: 'Facturation et devis menuisier',
  },
  {
    id: 'ia',
    icon: Sparkles,
    title: 'IA Studio — Photo-réalisme',
    subtitle: 'Vendez avant de construire',
    desc: "Grâce à l'IA intégrée à AVRA, vos projets 3D deviennent en quelques secondes des rendus réalistes quasi photo. Elle permet aussi de changer instantanément les textures et coloris des façades sur un même projet, sans avoir à tout refaire, pour comparer plusieurs options avec le client et accélérer sa décision.",
    features: [
      'Rendus IA AVRA HD',
      'Génération en < 10 secondes',
      'Export en haute résolution',
      'Chat IA contextuel',
      'Suggestions de matériaux',
      'Historique des générations',
    ],
    badge: 'IA',
    image: '/images/kitchen-1.webp',
    imageAlt: 'IA Studio rendu photo-réaliste cuisine',
  },
  {
    id: 'planning',
    icon: Calendar,
    title: 'Planning & Gestion de chantiers',
    subtitle: 'Une coordination fluide entre magasin et chantier',
    desc: "Deux plannings distincts mais connectés : un pour vos rendez-vous et tâches, un pour vos chantiers et artisans. Chaque modification est synchronisée pour éviter les erreurs de planning et assurer un suivi précis de vos projets.",
    features: [
      'Calendrier visuel partagé',
      'Vue par technicien',
      'Détection de conflits',
      'Rappels automatiques',
      'Intégration Google Calendar',
      'Export planning PDF',
    ],
    badge: 'Pro',
    image: '/images/artisan-1.webp',
    imageAlt: 'Planning chantier artisan',
  },
  {
    id: 'stock',
    icon: Package,
    title: 'Gestion de stock & fournisseurs',
    subtitle: 'Une gestion de stock simple, visuelle et intelligente',
    desc: "AVRA identifie automatiquement les produits utilisés dans vos devis, déjà vendus ou encore en stock. Tout est connecté à vos dossiers pour une vision claire et immédiate. Un stock facile à suivre, sans complexité.",
    features: [
      'Stock en temps réel',
      'Alertes de rupture',
      'Commandes fournisseurs',
      'Codes-barres et QR codes',
      'Multi-dépôts',
      'Rapports de consommation',
    ],
    badge: 'Pro',
    image: '/images/artisan-2.webp',
    imageAlt: 'Gestion stock menuiserie',
  },
  {
    id: 'signature',
    icon: PenLine,
    title: 'Signature électronique',
    subtitle: 'Faites signer vos documents sans quitter AVRA',
    desc: "Depuis un dossier client, vous envoyez vos devis ou contrats en signature électronique via un module intégré. Tout est suivi au même endroit, sans multiplier les outils.",
    features: [
      'Signature juridiquement valable',
      'Envoi par email ou SMS',
      'Signature mobile',
      'Certificat horodaté',
      'Relances automatiques',
      'Archivage 10 ans',
    ],
    badge: 'Inclus',
    image: '/images/kitchen-2.webp',
    imageAlt: 'Signature électronique devis cuisine',
  },
  {
    id: 'epaiement',
    icon: Receipt,
    title: 'E-paiement',
    subtitle: 'Encaissez vos paiements sans quitter AVRA',
    desc: "Depuis un dossier client, vous déclenchez une demande de paiement en quelques clics via un module intégré. Plus besoin d'utiliser plusieurs outils : tout est lié à votre projet.",
    features: [
      'Paiement en ligne intégré',
      'Demande de paiement en 2 clics',
      'Lié directement au dossier',
      'Suivi des encaissements',
      'Relances automatiques',
      'Historique des transactions',
    ],
    badge: 'Inclus',
    image: '/images/interior-apres-2.webp',
    imageAlt: 'CRM pipeline agencement intérieur',
  },
  {
    id: 'stats',
    icon: BarChart3,
    title: 'Tableau de bord & Statistiques',
    subtitle: 'Vos intervenants autonomes, vos dossiers mieux suivis',
    desc: "Avec AVRA, vos artisans accèdent directement aux informations dont ils ont besoin : plans techniques, dossiers, organisation du planning et suivi des SAV. De votre côté, vous centralisez toutes vos demandes via l'espace intervenants : demande de devis, organisation de planning, transmission d'informations… Moins d'appels, moins de messages, plus de fluidité dans vos projets.",
    features: [
      'Dashboard temps réel',
      'CA et marges',
      'Taux de conversion',
      'Analyse par période',
      'Export Excel/PDF',
      'Rapports automatiques',
    ],
    badge: 'Pro',
    image: '/images/kitchen-3.webp',
    imageAlt: 'Statistiques tableau de bord cuisine',
  },
];

const badgeColors: Record<string, { bg: string; color: string }> = {
  Essentiel: { bg: 'rgba(201,169,110,0.15)', color: 'var(--color-gold)' },
  Populaire: { bg: 'rgba(201,169,110,0.9)', color: 'var(--color-green-deep)' },
  IA: { bg: 'rgba(139,92,246,0.15)', color: '#7c3aed' },
  Pro: { bg: 'rgba(30,43,34,0.08)', color: 'var(--color-green)' },
  Inclus: { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
  CRM: { bg: 'rgba(59,130,246,0.12)', color: '#2563eb' },
};

export default function FonctionnalitesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />

      {/* ─── HERO ─── */}
      <section
        style={{
          position: 'relative',
          minHeight: '75vh',
          display: 'flex',
          alignItems: 'center',
          paddingTop: 76,
          overflow: 'hidden',
          background: 'var(--color-green-deep)',
        }}
      >
        {/* Background image */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
          }}
        >
          <Image
            src="/images/kitchen-4.webp"
            alt="Cuisine premium AVRA"
            fill
            style={{ objectFit: 'cover', opacity: 0.35 }}
            priority
          />
          {/* Dark overlay for contrast */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(14,24,16,0.82), rgba(30,43,34,0.75))' }} />
        </div>

        {/* Gold accent line top */}
        <div
          style={{
            position: 'absolute',
            top: 76,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)',
            zIndex: 1,
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 2,
            maxWidth: 860,
            margin: '0 auto',
            padding: '80px 5%',
            textAlign: 'center',
          }}
        >
          {/* Module count badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(201,169,110,0.15)',
              border: '1px solid rgba(201,169,110,0.4)',
              borderRadius: 50,
              padding: '6px 20px',
              marginBottom: '1.8rem',
              fontSize: '.82rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase' as const,
              color: 'var(--color-gold)',
            }}
          >
            <Zap size={13} />
            8 modules complets
          </div>

          <h1
            style={{
              color: 'var(--color-white)',
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              lineHeight: 1.15,
              marginBottom: '1.5rem',
              fontFamily: 'var(--font-display)',
            }}
          >
            Tout ce dont vous avez besoin
            <br />
            <span style={{ color: 'var(--color-gold)' }}>pour gérer votre activité</span>
          </h1>

          <p
            style={{
              color: 'rgba(255,255,255,0.78)',
              fontSize: '1.15rem',
              maxWidth: 620,
              margin: '0 auto 2.5rem',
              lineHeight: 1.7,
            }}
          >
            Gestion dossiers, facturation e-facture 2026, IA photo-réalisme, planning,
            stock, signature électronique, CRM et statistiques — dans une seule application.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/comment-ca-marche">
              <button
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '1rem', padding: '14px 28px' }}
              >
                Demander une démo
                <ArrowRight size={18} />
              </button>
            </a>
            <a href="/tarifs">
              <button
                className="btn-secondary"
                style={{ fontSize: '1rem', padding: '14px 28px' }}
              >
                Voir les tarifs
              </button>
            </a>
          </div>

          {/* Trust indicators */}
          <div
            style={{
              display: 'flex',
              gap: 32,
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginTop: '3rem',
              paddingTop: '2rem',
              borderTop: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {[
              { icon: Shield, label: 'Données sécurisées RGPD' },
              { icon: Zap, label: 'Accès immédiat' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '.88rem',
                }}
              >
                <Icon size={15} style={{ color: 'var(--color-gold)' }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── NAV RAPIDE ─── */}
      <div
        style={{
          background: 'var(--color-white)',
          padding: '0 5%',
          borderBottom: '1px solid var(--border-default)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            gap: 4,
            overflowX: 'auto',
          }}
        >
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <a
                key={f.id}
                href={`#${f.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '16px 14px',
                  whiteSpace: 'nowrap' as const,
                  fontSize: '.82rem',
                  color: 'var(--color-text-muted)',
                  fontWeight: 500,
                  borderBottom: '2px solid transparent',
                  transition: '0.3s cubic-bezier(0.4,0,0.2,1)',
                  textDecoration: 'none',
                }}
              >
                <Icon size={15} />
                {f.title.split('—')[0].trim().split('&')[0].trim()}
              </a>
            );
          })}
        </div>
      </div>

      {/* ─── FEATURES DÉTAILLÉES ─── */}
      {features.map((f, i) => {
        const IconComponent = f.icon;
        const isEven = i % 2 === 0;
        const badge = badgeColors[f.badge] ?? { bg: 'rgba(201,169,110,0.15)', color: 'var(--color-gold)' };

        return (
          <section
            key={f.id}
            id={f.id}
            style={{
              background: isEven ? '#ffffff' : '#f9f6f0',
              padding: '100px 5%',
              scrollMarginTop: '80px',
            }}
          >
            <div
              className="grid-2col"
              style={{
                maxWidth: 1200,
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 80,
                alignItems: 'center',
              }}
            >
              {/* Text side */}
              <div
                style={{ order: isEven ? 1 : 2 }}
              >
                {/* Badge */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: badge.bg,
                    color: badge.color,
                    borderRadius: 50,
                    padding: '5px 16px',
                    fontSize: '.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase' as const,
                    marginBottom: '1.2rem',
                    border: `1px solid ${badge.color}33`,
                  }}
                >
                  <IconComponent size={12} />
                  {f.badge}
                </div>

                <h2
                  style={{
                    fontSize: 'clamp(1.6rem, 3vw, 2.3rem)',
                    fontFamily: 'var(--font-display)',
                    color: 'var(--color-text)',
                    marginBottom: '0.5rem',
                    lineHeight: 1.2,
                  }}
                >
                  {f.title}
                </h2>

                <p
                  style={{
                    fontSize: '1.05rem',
                    color: 'var(--color-gold)',
                    fontWeight: 600,
                    marginBottom: '1.2rem',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {f.subtitle}
                </p>

                <p
                  style={{
                    fontSize: '1rem',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.75,
                    marginBottom: '2rem',
                  }}
                >
                  {f.desc}
                </p>

                {/* Feature list */}
                <div
                  className="grid-2col"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px 16px',
                    marginBottom: '2.5rem',
                  }}
                >
                  {f.features.map((feat) => (
                    <div
                      key={feat}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <CheckCircle
                        size={16}
                        style={{ color: 'var(--color-gold)', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: '.88rem', color: 'var(--color-text)', fontWeight: 500 }}>
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>

              </div>

              {/* Image side */}
              <div
                style={{
                  order: isEven ? 2 : 1,
                }}
              >
                {/* Image frame */}
                <div
                  style={{
                    borderRadius: 20,
                    overflow: 'hidden',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.14)',
                    border: '3px solid rgba(201,169,110,0.2)',
                    position: 'relative',
                  }}
                >
                  <Image
                    src={f.image}
                    alt={f.imageAlt}
                    width={700}
                    height={525}
                    style={{ objectFit: 'cover', width: '100%', height: 'auto', display: 'block' }}
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />

                  {/* Overlay gradient */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(30,43,34,0.55) 0%, transparent 55%)',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Caption on image */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 20,
                      left: 20,
                      right: 20,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        background: 'var(--color-gold)',
                        borderRadius: 10,
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <IconComponent size={18} style={{ color: 'var(--color-green-deep)' }} />
                    </div>
                    <div>
                      <div
                        style={{
                          color: 'var(--color-white)',
                          fontWeight: 700,
                          fontSize: '.9rem',
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        {f.subtitle}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '.76rem' }}>
                        {f.title.split('—')[0].trim()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* ─── STATS BANNER ─── */}
      <section
        style={{
          background: 'var(--color-green-deep)',
          padding: '70px 5%',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(201,169,110,0.08) 0%, transparent 60%), radial-gradient(circle at 80% 50%, rgba(201,169,110,0.06) 0%, transparent 60%)',
          }}
        />

        <div
          className="stats-band-grid"
          style={{
            position: 'relative',
            maxWidth: 1100,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 40,
            textAlign: 'center',
          }}
        >
          {[
            { value: '< 2 min', label: 'Pour créer un devis', sub: 'vs 30 min avant' },
            { value: '< 10 sec', label: 'Pour un rendu IA', sub: 'vs 2-3 jours' },
            { value: '100%', label: 'Conforme e-facture 2026', sub: 'Dès maintenant' },
            { value: '+40%', label: 'Taux de conversion', sub: 'Clients AVRA' },
          ].map(({ value, label, sub }) => (
            <div key={label}>
              <div
                style={{
                  fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  color: 'var(--color-gold)',
                  marginBottom: '0.4rem',
                }}
              >
                {value}
              </div>
              <div
                style={{
                  color: 'var(--color-white)',
                  fontWeight: 600,
                  fontSize: '.92rem',
                  marginBottom: '0.2rem',
                }}
              >
                {label}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '.78rem' }}>
                {sub}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── AVANT / APRÈS ─── */}
      <section className="section-pad" style={{ background: 'var(--color-white)', padding: '100px 5%' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div
              style={{
                display: 'inline-block',
                background: 'rgba(201,169,110,0.12)',
                color: 'var(--color-gold)',
                borderRadius: 50,
                padding: '5px 18px',
                fontSize: '.76rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                marginBottom: '1rem',
                border: '1px solid rgba(201,169,110,0.3)',
              }}
            >
              Transformation
            </div>
            <h2
              style={{
                fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
                fontFamily: 'var(--font-display)',
                color: 'var(--color-text)',
              }}
            >
              Avant et après AVRA
            </h2>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                minWidth: 600,
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '18px 24px',
                      background: 'var(--color-green-deep)',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '.78rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase' as const,
                    }}
                  >
                    Tâche
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '18px 24px',
                      background: 'var(--color-green-deep)',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '.78rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase' as const,
                    }}
                  >
                    ❌ Avant AVRA
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '18px 24px',
                      background: 'var(--color-gold)',
                      color: 'var(--color-green-deep)',
                      fontSize: '.78rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase' as const,
                    }}
                  >
                    ✅ Avec AVRA
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { task: 'Créer un devis', before: '30 min (Excel + mise en page)', after: '2 min (templates automatiques)' },
                  { task: 'Générer une facture', before: '15 min (saisie manuelle)', after: '30 sec depuis le module intégré' },
                  { task: 'Planifier une pose', before: '10 min (appels / emails)', after: '2 min (calendrier partagé)' },
                  { task: 'Retrouver un dossier', before: 'Emails + dossiers locaux', after: 'Un clic dans AVRA' },
                  { task: 'Rendu 3D pour le client', before: '1 heure avec le client', after: '10 secondes par projet' },
                  { task: 'Signature client', before: 'Rendez-vous physique', after: '30 sec avec signature électronique' },
                ].map((row, i) => (
                  <tr
                    key={row.task}
                    style={{
                      background: i % 2 === 0 ? 'var(--color-white)' : 'var(--color-cream)',
                    }}
                  >
                    <td
                      style={{
                        padding: '16px 24px',
                        fontSize: '.9rem',
                        color: 'var(--color-text)',
                        fontWeight: 600,
                        borderBottom: '1px solid var(--border-default)',
                      }}
                    >
                      {row.task}
                    </td>
                    <td
                      style={{
                        padding: '16px 24px',
                        fontSize: '.88rem',
                        color: 'var(--color-text-muted)',
                        borderBottom: '1px solid var(--border-default)',
                      }}
                    >
                      {row.before}
                    </td>
                    <td
                      style={{
                        padding: '16px 24px',
                        fontSize: '.88rem',
                        color: 'var(--color-green)',
                        fontWeight: 700,
                        borderBottom: '1px solid var(--border-default)',
                      }}
                    >
                      {row.after}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section className="section-pad" style={{
          padding: '100px 5%',
          background: 'var(--color-cream)',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          {/* Decorative line */}
          <div
            style={{
              width: 60,
              height: 3,
              background: 'var(--color-gold)',
              borderRadius: 2,
              margin: '0 auto 1.5rem',
            }}
          />

          <h2
            style={{
              fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text)',
              marginBottom: '1.2rem',
            }}
          >
            Prêt à transformer votre activité ?
          </h2>

          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '1.05rem',
              maxWidth: 480,
              margin: '0 auto 2.5rem',
              lineHeight: 1.7,
            }}
          >
            Découvrez comment AVRA peut transformer votre activité, sans engagement.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/comment-ca-marche" style={{ textDecoration: 'none' }}>
              <button
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '15px 32px',
                  fontSize: '1rem',
                }}
              >
                Demander une démo
                <ArrowRight size={18} />
              </button>
            </a>
            <a href="/tarifs" style={{ textDecoration: 'none' }}>
              <button
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '15px 32px',
                  fontSize: '1rem',
                  background: '#1e2b22',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Comparer les plans
              </button>
            </a>
          </div>

          {/* Reassurance */}
          <div
            style={{
              display: 'flex',
              gap: 28,
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginTop: '2rem',
            }}
          >
            {['✓ Annulation à tout moment', '✓ Support inclus'].map((item) => (
              <span
                key={item}
                style={{
                  fontSize: '.82rem',
                  color: 'var(--color-text-muted)',
                  fontWeight: 500,
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
