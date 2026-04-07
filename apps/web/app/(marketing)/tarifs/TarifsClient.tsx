'use client';

import { useState } from 'react';
import {
  CheckCircle,
  Minus,
  ArrowRight,
  MessageSquare,
  BookOpen,
  Lock,
  Zap,
} from 'lucide-react';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import ScrollReveal from '../components/ScrollReveal';

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
    name: 'Solo',
    price: '49',
    period: '/mois',
    desc: 'Pour les indépendants qui démarrent.',
    badge: null,
    cta: "Commencer l'essai gratuit",
    features: [
      { label: 'Dossiers clients illimités', included: true },
      { label: 'Devis & Facturation', included: true },
      { label: 'Signature électronique', included: true },
      { label: 'Planning basique', included: true },
      { label: '1 utilisateur', included: true },
      { label: 'Support email', included: true },
      { label: 'IA Photo-réalisme (20 rendus/mois)', included: true },
      { label: 'Gestion de stock basique', included: true },
      { label: 'Pipeline CRM', included: false },
      { label: 'Statistiques avancées', included: false },
      { label: 'API & Intégrations', included: false },
      { label: 'Support prioritaire', included: false },
    ],
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '89',
    period: '/mois',
    desc: 'Pour les équipes en croissance.',
    badge: 'Le plus populaire',
    cta: 'Essayer Pro gratuitement',
    features: [
      { label: 'Dossiers clients illimités', included: true },
      { label: 'Devis & Facturation', included: true },
      { label: 'Signature électronique', included: true },
      { label: 'Planning avancé + équipe', included: true },
      { label: 'Utilisateurs illimités', included: true },
      { label: 'Support email + chat', included: true },
      { label: 'IA Photo-réalisme (100 rendus/mois)', included: true },
      { label: 'Gestion de stock avancée', included: true },
      { label: 'Pipeline CRM visuel', included: true },
      { label: 'Statistiques & Tableaux de bord', included: true },
      { label: 'API & Intégrations', included: false },
      { label: 'Support prioritaire', included: false },
    ],
    highlighted: true,
  },
  {
    name: 'Équipe',
    price: '149',
    period: '/mois',
    desc: 'Pour les entreprises avancées.',
    badge: null,
    cta: "Commencer l'essai gratuit",
    features: [
      { label: 'Tout du plan Pro', included: true },
      { label: 'IA Photo-réalisme illimitée', included: true },
      { label: 'Multi-agences / franchises', included: true },
      { label: 'SSO & SAML', included: true },
      { label: 'SLA garanti 99.9%', included: true },
      { label: 'Onboarding dédié', included: true },
      { label: 'API complète & Webhooks', included: true },
      { label: 'Support prioritaire 24/7', included: true },
      { label: 'Formation sur site', included: true },
      { label: 'Personnalisation sur mesure', included: true },
      { label: 'Conformité RGPD renforcée', included: true },
      { label: 'Compte Manager dédié', included: true },
    ],
    highlighted: false,
  },
];

const faqs = [
  { q: "Puis-je changer de plan à tout moment ?", a: "Oui, sans problème. Vous pouvez passer d'un plan à un autre à tout moment. Les changements sont appliqués immédiatement et votre facture sera ajustée au prorata." },
  { q: "Y a-t-il un engagement ou des frais cachés ?", a: "Aucun. Vous pouvez résilier votre abonnement en 1 clic à tout moment, sans justification. Aucun frais caché, aucun engagement minimum." },
  { q: "AVRA est-il conforme à la e-facture 2026 ?", a: "Oui, 100% conforme. Toutes les factures générées par AVRA respectent les normes UBL/XML obligatoires en 2026. Conformité garantie." },
  { q: "Comment fonctionne l'essai gratuit ?", a: "14 jours d'accès complet à toutes les fonctionnalités du plan Pro. Aucune carte bancaire requise. Aucun prélèvement automatique. À l'expiration, vous choisissez votre plan ou nous supprimons votre compte." },
];

export default function TarifsClient() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <ScrollReveal />

      {/* Hero */}
      <section
        style={{
          minHeight: '55vh',
          display: 'flex',
          alignItems: 'center',
          paddingTop: '76px',
          background: 'linear-gradient(135deg,var(--green-deep),var(--green))',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '60px 5%' }}>
          <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>Tarifs simples</div>
          <h1 style={{ color: 'var(--white)', marginBottom: '1.5rem' }}>
            À partir de 49€/mois, essai gratuit 14 jours sans CB
          </h1>
          <p style={{ color: 'rgba(255,255,255,.85)', fontSize: '1.15rem', maxWidth: 600, margin: '0 auto 2rem' }}>
            Tarifs transparents et sans engagement. Changez de plan à tout moment. Aucune surprise, aucun frais caché.
          </p>
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,.1)', borderRadius: 40, padding: '6px', gap: '4px' }}>
            <button
              onClick={() => setIsAnnual(false)}
              style={{ padding: '10px 24px', borderRadius: 36, background: !isAnnual ? 'var(--gold)' : 'transparent', color: !isAnnual ? 'var(--green-deep)' : 'rgba(255,255,255,.75)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '.88rem', transition: 'var(--transition)' }}
            >
              Mensuel
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              style={{ padding: '10px 24px', borderRadius: 36, background: isAnnual ? 'var(--gold)' : 'transparent', color: isAnnual ? 'var(--green-deep)' : 'rgba(255,255,255,.75)', border: 'none', cursor: 'pointer', fontSize: '.88rem', fontWeight: 600, transition: 'var(--transition)' }}
            >
              Annuel (−20%)
            </button>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="section">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '24px', alignItems: 'start' }}>
            {plans.map((plan) => {
              const displayPrice = isAnnual ? Math.round((parseInt(plan.price) * 12 * 0.8) / 12) : plan.price;
              return (
                <div
                  key={plan.name}
                  className="reveal"
                  style={{
                    background: plan.highlighted ? 'var(--green-deep)' : 'var(--white)',
                    borderRadius: 20,
                    padding: '2.5rem',
                    border: plan.highlighted ? '2px solid var(--gold)' : '1px solid var(--border)',
                    boxShadow: plan.highlighted ? 'var(--shadow-xl)' : 'var(--shadow-sm)',
                    transform: plan.highlighted ? 'scale(1.02)' : 'none',
                    position: 'relative',
                  }}
                >
                  {plan.badge && (
                    <div style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,var(--gold-light),var(--gold))', color: 'var(--green-deep)', padding: '6px 20px', borderRadius: 20, fontSize: '.8rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {plan.badge}
                    </div>
                  )}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ color: plan.highlighted ? 'var(--white)' : 'var(--text)', marginBottom: '.5rem' }}>{plan.name}</h3>
                    <p style={{ fontSize: '.9rem', color: plan.highlighted ? 'rgba(255,255,255,.6)' : 'var(--text-muted)', marginBottom: '1.5rem' }}>{plan.desc}</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 800, color: plan.highlighted ? 'var(--gold)' : 'var(--text)' }}>{displayPrice}€</span>
                      <span style={{ color: plan.highlighted ? 'rgba(255,255,255,.5)' : 'var(--text-muted)', fontSize: '1rem' }}>{plan.period}</span>
                    </div>
                  </div>
                  <a href="/register" style={{ display: 'block', marginBottom: '2rem' }}>
                    <button style={{ width: '100%', padding: '14px', borderRadius: 12, cursor: 'pointer', background: plan.highlighted ? 'linear-gradient(135deg,var(--gold-light),var(--gold))' : 'transparent', color: plan.highlighted ? 'var(--green-deep)' : 'var(--green)', border: plan.highlighted ? 'none' : '1.5px solid var(--border)', fontWeight: 600, fontSize: '.95rem', transition: 'var(--transition)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      {plan.cta}<ArrowRight size={16} />
                    </button>
                  </a>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {plan.features.map((f) => (
                      <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {f.included ? (
                          <CheckCircle size={18} style={{ color: plan.highlighted ? 'var(--gold)' : 'var(--green-light)', flexShrink: 0 }} />
                        ) : (
                          <Minus size={18} style={{ color: 'rgba(0,0,0,.15)', flexShrink: 0 }} />
                        )}
                        <span style={{ fontSize: '.88rem', color: f.included ? (plan.highlighted ? 'rgba(255,255,255,.9)' : 'var(--text)') : (plan.highlighted ? 'rgba(255,255,255,.25)' : 'var(--text-muted)'), opacity: f.included ? 1 : 0.5 }}>
                          {f.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Inclus dans tous les plans */}
      <section className="section section-centered" style={{ background: 'var(--cream-light)' }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <h2 style={{ marginBottom: '3rem' }}>Inclus dans tous les plans</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '24px' }}>
            {[
              { icon: MessageSquare, title: 'Support humain', desc: 'Email, chat ou phone. Réponse en moins de 2h.' },
              { icon: BookOpen, title: 'Onboarding', desc: 'Configuration, import données, formation gratuite.' },
              { icon: Lock, title: 'Sécurité RGPD', desc: 'Hébergement France, chiffrement, sauvegardes.' },
              { icon: Zap, title: 'Mises à jour', desc: 'Nouvelles fonctionnalités tous les mois.' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="card reveal" style={{ textAlign: 'center' }}>
                  <Icon size={32} style={{ color: 'var(--gold)', marginBottom: '1rem' }} />
                  <h4 style={{ marginBottom: '.5rem' }}>{item.title}</h4>
                  <p style={{ fontSize: '.9rem' }}>{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Garantie */}
      <section className="section section-centered">
        <div className="container" style={{ maxWidth: 700 }}>
          <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>Garantie</div>
          <h2 style={{ marginBottom: '1rem' }}>30 jours satisfait ou remboursé</h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Si AVRA ne vous convient pas dans les 30 jours, nous vous remboursons intégralement. Zéro question posée.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <div className="container" style={{ maxWidth: 780 }}>
          <div className="section-centered" style={{ marginBottom: '3rem' }}>
            <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>FAQ Tarifs</div>
            <h2 className="section-title">Questions fréquentes</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {faqs.map((faq, i) => (
              <div key={i} className="card reveal" style={{ padding: '1.5rem' }}>
                <h4 style={{ marginBottom: '.75rem', color: 'var(--text)' }}>{faq.q}</h4>
                <p style={{ margin: 0, fontSize: '.95rem' }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="section section-centered" style={{ background: 'linear-gradient(135deg,var(--green-deep),var(--green))' }}>
        <div className="container">
          <h2 style={{ color: 'var(--white)', marginBottom: '1.5rem' }}>Commencez gratuitement dès maintenant</h2>
          <p style={{ color: 'rgba(255,255,255,.75)', maxWidth: 500, margin: '0 auto 2.5rem' }}>
            14 jours d&apos;accès complet. Aucune carte bancaire. Aucun engagement. Commencez quand vous voulez, arrêtez quand vous voulez.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/register">
              <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Démarrer mon essai gratuit<ArrowRight size={18} />
              </button>
            </a>
            <a href="mailto:contact@avra.fr">
              <button className="btn-secondary">Questions ? Contactez-nous</button>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
