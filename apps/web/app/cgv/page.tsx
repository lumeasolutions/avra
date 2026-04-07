import type { Metadata } from 'next'
import Nav from '../(marketing)/components/Nav'
import Footer from '../(marketing)/components/Footer'
import '../(marketing)/marketing.css'

export const metadata: Metadata = {
  title: 'Conditions Générales de Vente — AVRA',
  description: 'CGV d\'AVRA. Conditions de vente, tarifs, droit de rétractation et modalités de résiliation de l\'abonnement.',
  robots: {
    index: false,
    follow: true,
  },
}

export default function CGVPage() {
  return (
    <>
      <Nav />
      <div style={{ background: '#ffffff', color: '#1e2b22', minHeight: '100vh', fontFamily: 'var(--font-dm-sans, "DM Sans"), system-ui, sans-serif' }}>
        <div className="legal-wrap">
          {/* Header */}
          <div style={{ marginBottom: 60 }}>
            <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              Conditions Générales de Vente
            </h1>
            <p style={{ fontSize: 16, color: '#666', marginBottom: 0 }}>
              En vigueur depuis le {new Date().toLocaleDateString('fr-FR')}
            </p>
          </div>

          {/* Article 1 */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              1. Objet et champ d'application
            </h2>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              Les présentes conditions générales de vente (CGV) régissent les relations commerciales entre Luméa Solutions (ci-après "le Prestataire") et tout professionnel de l'agencement intérieur (ci-après "le Client") souhaitant accéder aux services proposés par AVRA.
            </p>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              Elles s'appliquent sans réserve à toute vente de services AVRA. L'absence de réclamation écrite du Client ne vaut pas acceptation des conditions modifiées.
            </p>
          </section>

          {/* Article 2 */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              2. Description des services et plans tarifaires
            </h2>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              AVRA est un logiciel SaaS (Software as a Service) proposant les fonctionnalités suivantes :
            </p>
            <ul style={{ fontSize: 16, marginBottom: 16, paddingLeft: 20 }}>
              <li style={{ marginBottom: 8 }}>Gestion des dossiers clients et devis</li>
              <li style={{ marginBottom: 8 }}>Facturation et suivi des paiements</li>
              <li style={{ marginBottom: 8 }}>Planning et calendrier de chantier</li>
              <li style={{ marginBottom: 8 }}>Gestion du stock et des commandes</li>
              <li style={{ marginBottom: 8 }}>Assistance IA pour rendus photo-réalistes</li>
              <li>Signature électronique de documents</li>
            </ul>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              Les tarifs et plans disponibles sont présentés sur le site https://avra-kappa.vercel.app. Ils peuvent être modifiés à tout moment par le Prestataire après notification préalable.
            </p>
          </section>

          {/* Article 3 */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              3. Conditions de souscription
            </h2>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              Pour accéder aux services AVRA, le Client doit :
            </p>
            <ul style={{ fontSize: 16, marginBottom: 12, paddingLeft: 20 }}>
              <li style={{ marginBottom: 8 }}>Être un professionnel exerçant en France</li>
              <li style={{ marginBottom: 8 }}>Être majeur et juridiquement capable de conclure un contrat</li>
              <li style={{ marginBottom: 8 }}>Créer un compte avec des informations exactes et à jour</li>
              <li>Accepter les présentes CGV</li>
            </ul>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              Le Client reconnaît que les informations fournies lors de l'inscription sont exactes et complètes.
            </p>
          </section>

          {/* Article 4 */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              4. Tarifs et facturation
            </h2>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              <strong>4.1 Tarification</strong>
            </p>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              Les tarifs sont exprimés en euros TTC (toutes taxes comprises). Le Client a la possibilité de choisir un plan mensuel ou annuel. Les prix peuvent être modifiés avec un préavis de 30 jours.
            </p>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              <strong>4.2 Essai gratuit</strong>
            </p>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              Un essai gratuit de 14 jours est proposé au Client sans obligation d'engagement. L'essai expire automatiquement après 14 jours. Pour continuer l'accès, le Client doit souscrire à un plan payant.
            </p>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              <strong>4.3 Facturation</strong>
            </p>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              Les factures sont émises à la fin de chaque période d'abonnement (mensuel ou annuel). Elles sont accessibles dans l'espace client. Le Client peut recevoir les factures par email.
            </p>
          </section>

          {/* Article 5 */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              5. Paiement
            </h2>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              Le paiement doit être effectué avant chaque nouvelle période d'abonnement. Les moyens de paiement acceptés sont :
            </p>
            <ul style={{ fontSize: 16, marginBottom: 12, paddingLeft: 20 }}>
              <li style={{ marginBottom: 8 }}>Carte bancaire (Visa, Mastercard, American Express)</li>
              <li>Virement bancaire (sur demande)</li>
            </ul>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              En cas de non-paiement, l'accès aux services peut être suspendu sans préavis après 7 jours d'impayé.
            </p>
          </section>

          {/* Article 6 */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              6. Droit de rétractation
            </h2>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              Conformément à la loi française, le Client a le droit de se rétracter dans un délai de 14 jours calendaires à compter de la date de souscription, sans justification ni frais.
            </p>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              Pour exercer ce droit, le Client doit envoyer une demande écrite à contact@avra.fr avec la mention "droit de rétractation".
            </p>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              En cas de rétractation, le Client sera remboursé des sommes versées dans un délai de 14 jours, déduction faite des services réellement utilisés le cas échéant.
            </p>
          </section>

          {/* Article 7 */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              7. Garantie satisfait ou remboursé
            </h2>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              Nous offrons une garantie satisfait ou remboursé de 30 jours à compter de la date de souscription à un plan payant.
            </p>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              Si le Client n'est pas satisfait du service, il peut demander un remboursement complet en contactant contact@avra.fr avant l'expiration des 30 jours.
            </p>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              Cette garantie ne s'applique qu'une seule fois par Client.
            </p>
          </section>

          {/* Article 8 */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              8. Résiliation
            </h2>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              <strong>8.1 Résiliation par le Client</strong>
            </p>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              Le Client peut résilier son abonnement à tout moment, sans pénalité, en se connectant à son compte ou en contactant contact@avra.fr.
            </p>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              La résiliation prend effet à la fin de la période de facturation en cours. Aucun remboursement au prorata n'est accordé pour les mois non utilisés.
            </p>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              <strong>8.2 Résiliation par le Prestataire</strong>
            </p>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              Le Prestataire se réserve le droit de suspendre ou de résilier l'accès aux services en cas de non-respect des CGV, de fraude détectée, ou d'usage abusif, après notification écrite au Client.
            </p>
          </section>

          {/* Article 9 */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              9. Responsabilité
            </h2>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              Luméa Solutions s'engage à fournir les services avec soin et attention. Cependant, le Prestataire ne peut être tenu responsable :
            </p>
            <ul style={{ fontSize: 16, marginBottom: 12, paddingLeft: 20 }}>
              <li style={{ marginBottom: 8 }}>Des interruptions de service dues à des causes externes (pannes réseau, forcemajeure)</li>
              <li style={{ marginBottom: 8 }}>Des dommages indirects ou pertes commerciales</li>
              <li style={{ marginBottom: 8 }}>De la perte ou la corruption de données dues à une mauvaise utilisation</li>
              <li>De tout manquement aux obligations du Client</li>
            </ul>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              La responsabilité du Prestataire est limitée au montant payé par le Client au cours des 12 derniers mois.
            </p>
          </section>

          {/* Article 10 */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              10. Données personnelles et RGPD
            </h2>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              Le traitement des données personnelles est régi par notre politique de confidentialité accessible à https://avra-kappa.vercel.app/confidentialite. Le Client accepte nos pratiques en matière de traitement des données en acceptant ces CGV.
            </p>
          </section>

          {/* Article 11 */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              11. Propriété intellectuelle
            </h2>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              Tous les éléments d'AVRA (logiciel, design, contenu, documentation) restent la propriété exclusive de Luméa Solutions. Le Client reçoit une licence d'utilisation limitée, non-transférable et non-exclusive pour accéder aux services.
            </p>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              Le Client ne peut en aucun cas reproduire, modifier, distribuer ou revendre les services AVRA.
            </p>
          </section>

          {/* Article 12 */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              12. Loi applicable et juridiction compétente
            </h2>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              Les présentes CGV sont régies par la loi française. Tout litige relatif à l'exécution ou l'interprétation de ces CGV relève de la compétence exclusive des tribunaux de Paris.
            </p>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              Avant toute action judiciaire, les parties s'engagent à résoudre leurs litiges par voie amiable.
            </p>
          </section>

          {/* Article 13 */}
          <section>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              13. Modification des CGV
            </h2>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              Luméa Solutions se réserve le droit de modifier les présentes CGV à tout moment. Les modifications prendront effet 30 jours après notification au Client. La continuation de l'utilisation du service vaut acceptation des nouvelles conditions.
            </p>
            <p style={{ fontSize: 14, color: '#999', marginTop: 20, marginBottom: 0 }}>
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </>
  )
}
