import type { Metadata } from 'next'
import Nav from '../(marketing)/components/Nav'
import Footer from '../(marketing)/components/Footer'
import '../(marketing)/marketing.css'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — AVRA',
  description: 'Politique de confidentialité d\'AVRA. Comment nous collectons, traitons et protégeons vos données personnelles conformément au RGPD.',
  robots: {
    index: false,
    follow: true,
  },
}

export default function ConfidentialitePage() {
  return (
    <>
      <Nav />
      <div style={{ background: '#ffffff', color: '#1e2b22', minHeight: '100vh', fontFamily: 'var(--font-dm-sans, "DM Sans"), system-ui, sans-serif' }}>
        <div className="legal-wrap">
          {/* Header */}
          <div style={{ marginBottom: 60 }}>
            <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              Politique de confidentialité
            </h1>
            <p style={{ fontSize: 16, color: '#666', marginBottom: 0 }}>
              Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi française
            </p>
          </div>

          {/* Responsable du traitement */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              1. Responsable du traitement
            </h2>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              <strong>Luméa Solutions</strong> est responsable du traitement de vos données personnelles. Vous pouvez nous contacter à <strong>privacy@avra.fr</strong> ou par courrier à : 123 rue de l'Agencement, 75010 Paris, France.
            </p>
          </section>

          {/* Données collectées */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              2. Données personnelles collectées
            </h2>
            <p style={{ fontSize: 16, marginBottom: 16 }}>
              Nous collectons les catégories de données suivantes :
            </p>
            <ul style={{ fontSize: 16, marginBottom: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 12 }}>
                <strong>Données d'identification :</strong> Nom, prénom, adresse email, numéro de téléphone, entreprise
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong>Données de contact :</strong> Adresse postale, adresse IP, navigateur utilisé
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong>Données d'utilisation :</strong> Historique de navigation, durée de visite, pages consultées, interactions avec le service
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong>Données commerciales :</strong> Historique des achats, abonnements, factures
              </li>
              <li>
                <strong>Cookies :</strong> Identifiants de session, préférences utilisateur, données analytiques
              </li>
            </ul>
          </section>

          {/* Finalités du traitement */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              3. Finalités du traitement
            </h2>
            <p style={{ fontSize: 16, marginBottom: 16 }}>
              Nous traitons vos données pour les finalités suivantes :
            </p>
            <ul style={{ fontSize: 16, marginBottom: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 12 }}>Créer et gérer votre compte utilisateur</li>
              <li style={{ marginBottom: 12 }}>Fournir et améliorer nos services</li>
              <li style={{ marginBottom: 12 }}>Traiter les paiements et gérer les factures</li>
              <li style={{ marginBottom: 12 }}>Vous envoyer des communications marketing (si vous avez consenti)</li>
              <li style={{ marginBottom: 12 }}>Analyser l'utilisation de notre site pour optimiser l'expérience</li>
              <li style={{ marginBottom: 12 }}>Respecter nos obligations légales et réglementaires</li>
              <li>Prévenir et détecter les fraudes</li>
            </ul>
          </section>

          {/* Base légale */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              4. Base légale du traitement
            </h2>
            <p style={{ fontSize: 16, marginBottom: 16 }}>
              Nous traitons vos données sur les bases légales suivantes :
            </p>
            <ul style={{ fontSize: 16, marginBottom: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 12 }}>
                <strong>Exécution d'un contrat :</strong> Pour fournir les services auxquels vous avez souscrit
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong>Votre consentement :</strong> Pour l'envoi de newsletters marketing et l'utilisation de cookies non essentiels
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong>Intérêts légitimes :</strong> Pour améliorer nos services et prévenir la fraude
              </li>
              <li>
                <strong>Obligations légales :</strong> Pour respecter les lois fiscales et comptables
              </li>
            </ul>
          </section>

          {/* Durée de conservation */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              5. Durée de conservation des données
            </h2>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              Vos données personnelles sont conservées aussi longtemps que nécessaire pour atteindre les finalités pour lesquelles elles ont été collectées. En général :
            </p>
            <ul style={{ fontSize: 16, marginBottom: 0, paddingLeft: 20, marginTop: 16 }}>
              <li style={{ marginBottom: 12 }}>Données de compte : durée de votre abonnement + 3 ans</li>
              <li style={{ marginBottom: 12 }}>Données commerciales : 6 ans (obligations fiscales)</li>
              <li style={{ marginBottom: 12 }}>Données analytiques : 13 mois</li>
              <li>Données marketing : jusqu'à retrait de votre consentement</li>
            </ul>
          </section>

          {/* Vos droits */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              6. Vos droits relatifs à vos données
            </h2>
            <p style={{ fontSize: 16, marginBottom: 16 }}>
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul style={{ fontSize: 16, marginBottom: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 12 }}>
                <strong>Droit d'accès :</strong> Accéder à vos données personnelles
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong>Droit de rectification :</strong> Corriger vos données inexactes
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong>Droit à l'effacement :</strong> Demander la suppression de vos données (droit à l'oubli)
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong>Droit à la limitation :</strong> Demander la limitation du traitement
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong>Droit à la portabilité :</strong> Récupérer vos données dans un format structuré
              </li>
              <li style={{ marginBottom: 12 }}>
                <strong>Droit d'opposition :</strong> S'opposer au traitement de vos données
              </li>
              <li>
                <strong>Droit de ne pas être soumis à une décision automatisée :</strong> Demander un examen humain
              </li>
            </ul>
            <p style={{ fontSize: 16, marginTop: 20, marginBottom: 0 }}>
              Pour exercer ces droits, veuillez nous contacter à <strong>privacy@avra.fr</strong>.
            </p>
          </section>

          {/* Destinataires */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              7. Partage de vos données
            </h2>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              Vos données peuvent être partagées avec :
            </p>
            <ul style={{ fontSize: 16, marginBottom: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 12 }}>Nos sous-traitants et fournisseurs de services (paiement, hébergement, analytics)</li>
              <li style={{ marginBottom: 12 }}>Les autorités légales si requises par la loi</li>
              <li>Nos partenaires commerciaux (avec votre consentement)</li>
            </ul>
          </section>

          {/* Sécurité */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              8. Sécurité de vos données
            </h2>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos données contre l'accès non autorisé, la modification ou la destruction. Cela comprend le chiffrement SSL/TLS, des pare-feu, et des politiques d'accès strictes.
            </p>
          </section>

          {/* Contact et réclamation CNIL */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              9. Contact et réclamation auprès de la CNIL
            </h2>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              Pour toute question concernant cette politique, veuillez nous contacter à <strong>privacy@avra.fr</strong>.
            </p>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              Si vous estimez que vos droits ne sont pas respectés, vous avez le droit de déposer une plainte auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) : <strong>www.cnil.fr</strong>
            </p>
          </section>

          {/* Mise à jour */}
          <section>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              10. Mise à jour de cette politique
            </h2>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              Cette politique de confidentialité peut être mise à jour à tout moment. Les modifications prendront effet immédiatement après publication. Nous vous informerons de tout changement substantiel.
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
