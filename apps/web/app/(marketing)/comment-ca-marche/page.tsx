import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Comment fonctionne AVRA — En 4 étapes, gérez toute votre activité',
  description:
    'Découvrez comment AVRA simplifie votre quotidien en 4 étapes : créez vos dossiers, faites vos devis, planifiez et facturez. Configuration en 5 minutes.',
  alternates: { canonical: 'https://avra.fr/comment-ca-marche' },
  openGraph: {
    title: 'Comment ça marche — AVRA',
    description: 'Opérationnel en 5 minutes. Découvrez comment AVRA s\'adapte à votre métier d\'agencement.',
    url: 'https://avra.fr/comment-ca-marche',
  },
};


import {
  ArrowRight,
  CheckCircle,
  Clock,
  FileText,
  Users,
  Zap,
} from 'lucide-react';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import ScrollReveal from '../components/ScrollReveal';

const steps = [
  {
    num: '01',
    icon: Zap,
    title: 'Créez votre compte en 30 secondes',
    desc: 'Renseignez votre email et choisissez votre mot de passe. Pas de carte bancaire, pas d\'engagement. Vous êtes directement dans l\'app.',
    detail:
      'Email + mot de passe, c\'est tout. Aucune information de paiement demandée pour démarrer l\'essai.',
    time: '30 secondes',
  },
  {
    num: '02',
    icon: FileText,
    title: 'Configurez votre profil métier',
    desc: 'Indiquez votre métier (cuisiniste, menuisier, architecte...), personnalisez vos modèles de devis et factures avec votre logo et vos coordonnées.',
    detail:
      'L\'assistant de configuration vous guide étape par étape. 5 minutes suffisent pour avoir une app aux couleurs de votre entreprise.',
    time: '5 minutes',
  },
  {
    num: '03',
    icon: Users,
    title: 'Importez vos données existantes',
    desc: 'Importez vos clients, vos produits et vos catalogues depuis Excel, CSV ou depuis votre ancien logiciel. AVRA s\'adapte à votre historique.',
    detail:
      'Imports guidés avec vérification et correction automatique des erreurs. Votre équipe retrouve ses repères immédiatement.',
    time: '10 minutes',
  },
  {
    num: '04',
    icon: CheckCircle,
    title: 'Créez votre premier dossier',
    desc: 'Ajoutez un nouveau projet client, renseignez les informations et commencez à travailler. Générez un devis, planifiez une visite, utilisez l\'IA.',
    detail:
      'Tout est intuitif. Pas besoin de formation. La plupart des utilisateurs créent leur premier devis en moins de 10 minutes.',
    time: '< 10 min',
  },
  {
    num: '05',
    icon: Zap,
    title: 'Développez votre activité',
    desc: 'Suivez vos performances, automatisez vos relances, utilisez l\'IA pour impressionner vos clients. AVRA évolue avec vous.',
    detail:
      'Accédez aux statistiques, paramétrez les automatisations et invitez vos collaborateurs. AVRA grandit avec votre entreprise.',
    time: 'Continu',
  },
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
];

export default function CommentCaMarchePage() {
  return (
    <>
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
          <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>
            Démarrage rapide
          </div>
          <h1
            style={{
              color: 'var(--white)',
              marginBottom: '1.5rem',
            }}
          >
            De zéro à opérationnel en 5 minutes
          </h1>
          <p
            style={{
              color: 'rgba(255,255,255,.85)',
              fontSize: '1.15rem',
              maxWidth: 560,
              margin: '0 auto 2rem',
            }}
          >
            Pas de formation longue, pas de technicien requis. Suivez ces étapes simples et
            commencez à gagner du temps dès aujourd&apos;hui.
          </p>
          <a href="/register">
            <button
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              Démarrer maintenant — C&apos;est gratuit
              <ArrowRight size={18} />
            </button>
          </a>
        </div>
      </section>

      {/* Steps */}
      <section className="section">
        <div className="container">
          <div style={{ position: 'relative' }}>
            {/* Timeline line */}
            <div
              style={{
                position: 'absolute',
                left: '60px',
                top: 0,
                bottom: 0,
                width: 2,
                background:
                  'linear-gradient(180deg,var(--gold),var(--green-light))',
                display: 'block',
              }}
            />

            {steps.map((step, i) => {
              const IconComponent = step.icon;
              return (
                <div
                  key={step.num}
                  className="reveal"
                  style={{
                    display: 'flex',
                    gap: '40px',
                    alignItems: 'flex-start',
                    marginBottom:
                      i < steps.length - 1 ? '60px' : 0,
                    position: 'relative',
                  }}
                >
                  {/* Number bubble */}
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background:
                        'linear-gradient(135deg,var(--gold-light),var(--gold))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      color: 'var(--green-deep)',
                      boxShadow:
                        '0 4px 16px rgba(201,169,110,.4)',
                      zIndex: 1,
                    }}
                  >
                    {step.num}
                  </div>

                  <div className="card" style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '1rem',
                      }}
                    >
                      <IconComponent
                        size={24}
                        style={{
                          color: 'var(--gold)',
                        }}
                      />
                      <h3 style={{ fontSize: '1.2rem' }}>
                        {step.title}
                      </h3>
                    </div>
                    <p style={{ marginBottom: '1rem' }}>
                      {step.desc}
                    </p>
                    <div
                      style={{
                        padding: '12px 16px',
                        background: 'var(--cream-light)',
                        borderRadius: 8,
                        borderLeft: '3px solid var(--gold)',
                        fontSize: '.9rem',
                        color: 'var(--text-muted)',
                        marginBottom: '1rem',
                      }}
                    >
                      <span style={{ marginRight: '8px' }}>
                        ℹ️
                      </span>
                      {step.detail}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '.85rem',
                        color: 'var(--gold)',
                        fontWeight: 600,
                      }}
                    >
                      <Clock size={14} />
                      {step.time}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Garanties */}
      <section
        className="section section-centered"
        style={{
          background: 'var(--cream-dark)',
        }}
      >
        <div className="container">
          <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>
            Nos garanties
          </div>
          <h2 className="section-title">
            Zéro risque, zéro surprise
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit,minmax(220px,1fr))',
              gap: '24px',
              marginTop: '3rem',
            }}
          >
            {[
              {
                icon: '14j',
                title: '14 jours gratuits',
                desc: 'Accès complet à toutes les fonctionnalités Pro. Sans carte bancaire.',
              },
              {
                icon: '✕',
                title: 'Sans engagement',
                desc: 'Résiliez quand vous voulez, en 1 clic. Pas de frais cachés.',
              },
              {
                icon: '↓',
                title: 'Export de données',
                desc: 'Vos données vous appartiennent. Exportez tout en CSV ou Excel à tout moment.',
              },
              {
                icon: '🔒',
                title: 'Données sécurisées',
                desc: 'Hébergement en France, chiffrement TLS, sauvegardes quotidiennes.',
              },
            ].map((g) => (
              <div
                key={g.title}
                className="card reveal"
                style={{
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '2.5rem',
                    marginBottom: '1rem',
                  }}
                >
                  {g.icon}
                </div>
                <h4 style={{ marginBottom: '.5rem' }}>
                  {g.title}
                </h4>
                <p style={{ fontSize: '.9rem' }}>
                  {g.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <div
          className="container"
          style={{ maxWidth: 780 }}
        >
          <div
            className="section-centered"
            style={{ marginBottom: '3rem' }}
          >
            <div
              className="section-label"
              style={{ margin: '0 auto 1.5rem' }}
            >
              FAQ
            </div>
            <h2 className="section-title">
              Questions fréquentes sur la prise en main
            </h2>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="card reveal"
                style={{
                  padding: '1.5rem',
                }}
              >
                <h4
                  style={{
                    marginBottom: '.75rem',
                    color: 'var(--text)',
                  }}
                >
                  {faq.q}
                </h4>
                <p
                  style={{
                    margin: 0,
                    fontSize: '.95rem',
                  }}
                >
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Support inclus */}
      <section
        className="section section-centered"
        style={{
          background: 'var(--cream-light)',
        }}
      >
        <div className="container">
          <div className="section-label" style={{ margin: '0 auto 1.5rem' }}>
            Support inclus
          </div>
          <h2 className="section-title">
            Nous sommes là pour vous
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit,minmax(200px,1fr))',
              gap: '24px',
              marginTop: '3rem',
            }}
          >
            {[
              {
                title: 'Chat en direct',
                desc: 'Posez vos questions en temps réel, du lundi au vendredi.',
              },
              {
                title: 'Email',
                desc: 'Support par email disponible 24/7. Réponse en moins de 2h.',
              },
              {
                title: 'Documentation',
                desc: 'Base de connaissance complète avec articles et guides détaillés.',
              },
              {
                title: 'Vidéos tutoriels',
                desc: 'Suivez pas à pas comment utiliser chaque fonctionnalité d\'AVRA.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="card reveal"
                style={{
                  textAlign: 'center',
                }}
              >
                <h4
                  style={{
                    marginBottom: '.5rem',
                  }}
                >
                  {item.title}
                </h4>
                <p
                  style={{
                    fontSize: '.9rem',
                  }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="section section-centered"
        style={{
          background:
            'linear-gradient(135deg,var(--green-deep),var(--green))',
        }}
      >
        <div className="container">
          <h2
            style={{
              color: 'var(--white)',
              marginBottom: '1.5rem',
            }}
          >
            Vous avez encore des questions ?
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,.75)',
              maxWidth: 500,
              margin: '0 auto 2.5rem',
            }}
          >
            Notre équipe est disponible par chat ou email pour vous accompagner dans vos
            premiers pas sur AVRA.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 16,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <a href="/register">
              <button
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                Essayer gratuitement
                <ArrowRight size={18} />
              </button>
            </a>
            <a href="mailto:contact@avra.fr">
              <button className="btn-secondary">
                Contacter l&apos;équipe
              </button>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
