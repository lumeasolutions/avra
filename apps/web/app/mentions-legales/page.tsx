import type { Metadata } from 'next'
import Nav from '../(marketing)/components/Nav'
import Footer from '../(marketing)/components/Footer'
import '../(marketing)/marketing.css'

export const metadata: Metadata = {
  title: 'Mentions légales — AVRA by Luméa Solutions',
  description: 'Mentions légales d\'AVRA. Éditeur, hébergeur, propriété intellectuelle et conditions d\'utilisation.',
  robots: {
    index: false,
    follow: true,
  },
}

export default function MentionsLegalesPage() {
  return (
    <>
      <Nav />
      <div style={{ background: '#ffffff', color: '#1e2b22', minHeight: '100vh', fontFamily: 'var(--font-dm-sans, "DM Sans"), system-ui, sans-serif' }}>
        <div className="legal-wrap">
          {/* Header */}
          <div style={{ marginBottom: 60 }}>
            <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              Mentions légales
            </h1>
            <p style={{ fontSize: 16, color: '#666', marginBottom: 0 }}>
              Conformément à la loi pour la confiance dans l'économie numérique (LCEN)
            </p>
          </div>

          {/* Éditeur */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              1. Éditeur du site
            </h2>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              <strong>Nom :</strong> Luméa Solutions
            </p>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              <strong>Forme juridique :</strong> SARL
            </p>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              <strong>Adresse :</strong> 123 rue de l'Agencement, 75010 Paris, France
            </p>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              <strong>Email :</strong> contact@avra.fr
            </p>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              <strong>Téléphone :</strong> +33 1 XX XX XX XX
            </p>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              <strong>SIRET :</strong> XX XXX XXX XXX XX
            </p>
          </section>

          {/* Hébergeur */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              2. Hébergeur du site
            </h2>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              <strong>Nom :</strong> Vercel Inc.
            </p>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              <strong>Adresse :</strong> 340 Pine Street Suite 701, San Francisco, CA 94104, États-Unis
            </p>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              <strong>Site web :</strong> https://vercel.com
            </p>
          </section>

          {/* Propriété intellectuelle */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              3. Propriété intellectuelle
            </h2>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              L'ensemble du contenu de ce site (textes, images, logos, graphismes, vidéos, animations, etc.) est la propriété exclusive de Luméa Solutions ou de ses partenaires. Toute reproduction, représentation, modification ou diffusion, intégrale ou partielle, est interdite sans autorisation préalable écrite.
            </p>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              Les marques, logos et noms commerciaux figurant sur ce site sont protégés par les lois applicables. Leur utilisation sans consentement écrit préalable est interdite.
            </p>
          </section>

          {/* Données personnelles */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              4. Données personnelles et RGPD
            </h2>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              Conformément au Règlement Général sur la Protection des Données (RGPD), nous traitons vos données personnelles dans le respect de votre vie privée.
            </p>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              Pour connaître nos pratiques en matière de traitement des données, veuillez consulter notre <a href="/confidentialite" style={{ color: '#1e2b22', textDecoration: 'underline' }}>politique de confidentialité</a>.
            </p>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              Contact DPO : privacy@avra.fr
            </p>
          </section>

          {/* Cookies */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              5. Cookies et technologies de suivi
            </h2>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              Ce site utilise des cookies et technologies similaires pour améliorer l'expérience utilisateur, analyser le trafic et personnaliser le contenu. Votre consentement peut être requis avant le dépôt de certains cookies.
            </p>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              Vous pouvez gérer vos préférences de cookies à tout moment via les paramètres de votre navigateur.
            </p>
          </section>

          {/* Limitation de responsabilité */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              6. Limitation de responsabilité
            </h2>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              Les informations figurant sur ce site sont fournies à titre informatif et à titre gratuit. Luméa Solutions décline toute responsabilité en cas d'inexactitude, d'omission ou de retard dans la mise à jour des informations.
            </p>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              Luméa Solutions ne peut être tenue responsable des dommages directs ou indirects résultant de l'accès ou de l'utilisation du site, notamment les pertes de données, les interruptions de service ou les préjudices commerciaux.
            </p>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              L'utilisateur accepte d'utiliser ce site à ses seuls risques et périls.
            </p>
          </section>

          {/* Loi applicable */}
          <section style={{ marginBottom: 50 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>
              7. Loi applicable et juridiction compétente
            </h2>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              Ces mentions légales sont régies par la loi française. Tout litige relatif à l'accès ou à l'utilisation du site relève de la compétence exclusive des tribunaux de Paris.
            </p>
            <p style={{ fontSize: 16, marginBottom: 0 }}>
              Date de dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </>
  )
}
