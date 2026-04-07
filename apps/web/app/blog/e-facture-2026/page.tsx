'use client';

import Nav from '../../(marketing)/components/Nav';
import Footer from '../../(marketing)/components/Footer';
import ScrollReveal from '../../(marketing)/components/ScrollReveal';
import '../../(marketing)/marketing.css';
import Link from 'next/link';
import { Calendar, Clock, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';

export default function EFacture2026() {
  return (
    <>
      <Nav />
      <ScrollReveal />

      <div className="blog-article-wrap" style={{ background: '#f9f6f0' }}>
        <div style={{ maxWidth: '800px', marginLeft: 'auto', marginRight: 'auto' }}>
          <Link href="/blog" style={{ color: '#c9a96e', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
            <ArrowLeft size={20} /> Retour au blog
          </Link>

          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', marginBottom: '16px', color: '#1e2b22', fontWeight: 800 }}>
            E-facture obligatoire 2026 : tout ce que les artisans doivent savoir
          </h1>

          <div style={{ display: 'flex', gap: '24px', color: '#6b7c70', marginBottom: '40px', fontSize: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={20} /> 12 avril 2026
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} /> 10 min de lecture
            </div>
          </div>

          <div style={{ lineHeight: 1.8, fontSize: '1.05rem', color: '#1e2b22' }}>
            <h2 style={{ fontSize: '1.5rem', marginTop: '40px', marginBottom: '16px', color: '#1e2b22' }}>Introduction : la réforme qui change tout</h2>
            <p style={{ marginBottom: '16px' }}>
              À partir du 1er janvier 2026, la facturation électronique devient obligatoire pour toutes les entreprises en France (sauf micro-entrepreneurs en régime micro-fiscal). Cette réforme, portée par la Commission européenne et Chorus Pro, vise à moderniser la facturation et réduire la fraude fiscale.
            </p>
            <p style={{ marginBottom: '40px' }}>
              Pour les cuisinistes, menuisiers et architectes d'intérieur, cela signifie : à partir de 2026, vos factures doivent être au format électronique reconnu par les autorités.
            </p>

            <h2 style={{ fontSize: '1.5rem', marginTop: '40px', marginBottom: '16px', color: '#1e2b22' }}>Calendrier et dates clés</h2>
            <div style={{ background: '#ffffff', border: '2px solid rgba(201,169,110,0.25)', borderRadius: '12px', padding: '24px', marginBottom: '40px' }}>
              <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #ede5dd' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '4px' }}>1er janvier 2026</div>
                <p style={{ color: '#6b7c70', margin: 0 }}>E-facture devient obligatoire pour : grandes entreprises (CA 500M€+), ETI (250-500M€).</p>
              </div>
              <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #ede5dd' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '4px' }}>1er juillet 2026</div>
                <p style={{ color: '#6b7c70', margin: 0 }}>E-facture devient obligatoire pour : PME (10-249 salariés), TPE (moins de 10 salariés sauf auto-entrepreneurs).</p>
              </div>
              <div style={{ marginBottom: '0' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '4px' }}>Micro-entrepreneurs</div>
                <p style={{ color: '#6b7c70', margin: 0 }}>Restent exemptés s'ils sont en régime micro-fiscal (CA inférieur aux seuils).</p>
              </div>
            </div>

            <h2 style={{ fontSize: '1.5rem', marginTop: '40px', marginBottom: '16px', color: '#1e2b22' }}>Obligations concrètes pour les artisans</h2>
            <p style={{ marginBottom: '16px' }}>
              À partir de votre date applicable, vous devez :
            </p>
            <ul style={{ marginBottom: '40px', paddingLeft: '24px' }}>
              <li style={{ marginBottom: '12px', display: 'flex', gap: '12px' }}>
                <CheckCircle size={20} style={{ flexShrink: 0, color: '#c9a96e', marginTop: '2px' }} />
                <span><strong>Émettre en format électronique :</strong> Vos factures doivent être au format Factur-X (ou UBL XML), pas en PDF simple.</span>
              </li>
              <li style={{ marginBottom: '12px', display: 'flex', gap: '12px' }}>
                <CheckCircle size={20} style={{ flexShrink: 0, color: '#c9a96e', marginTop: '2px' }} />
                <span><strong>Transmettre via Chorus Pro :</strong> Les factures destinées aux administrations publiques doivent passer par Chorus Pro.</span>
              </li>
              <li style={{ marginBottom: '12px', display: 'flex', gap: '12px' }}>
                <CheckCircle size={20} style={{ flexShrink: 0, color: '#c9a96e', marginTop: '2px' }} />
                <span><strong>Archiver légalement :</strong> Conserver les factures électroniques avec traçabilité complète.</span>
              </li>
              <li style={{ marginBottom: '12px', display: 'flex', gap: '12px' }}>
                <CheckCircle size={20} style={{ flexShrink: 0, color: '#c9a96e', marginTop: '2px' }} />
                <span><strong>Recevoir en format électronique :</strong> Vous devez aussi accepter les factures électroniques de vos fournisseurs.</span>
              </li>
            </ul>

            <div style={{ background: '#fff3cd', border: '2px solid #ffc107', borderRadius: '8px', padding: '16px', marginBottom: '40px', display: 'flex', gap: '12px' }}>
              <AlertCircle size={24} style={{ color: '#856404', flexShrink: 0 }} />
              <p style={{ color: '#856404', margin: 0 }}>
                <strong>Important :</strong> Non-conformité peut vous exposer à des pénalités administratives. Mieux vaut anticiper dès maintenant.
              </p>
            </div>

            <h2 style={{ fontSize: '1.5rem', marginTop: '40px', marginBottom: '16px', color: '#1e2b22' }}>Comment se mettre en conformité</h2>

            <h3 style={{ fontSize: '1.2rem', marginTop: '32px', marginBottom: '12px', color: '#1e2b22' }}>Option 1 : Utiliser un logiciel conforme e-facture</h3>
            <p style={{ marginBottom: '16px' }}>
              C'est la solution la plus simple. Votre logiciel de gestion génère automatiquement des factures au format Factur-X. AVRA, par exemple, gère déjà cette conformité nativement.
            </p>
            <p style={{ marginBottom: '32px', color: '#6b7c70' }}>
              Avantages : Automatisation complète, aucun travail manuel, intégration Chorus Pro, archivage légal.
            </p>

            <h3 style={{ fontSize: '1.2rem', marginTop: '32px', marginBottom: '12px', color: '#1e2b22' }}>Option 2 : Utiliser un service de conversion</h3>
            <p style={{ marginBottom: '16px' }}>
              Si vous gardez votre logiciel actuel, des services tiers convertissent vos PDF en Factur-X et transmettent à Chorus Pro.
            </p>
            <p style={{ marginBottom: '32px', color: '#6b7c70' }}>
              Inconvénients : Coûts additionnels, processus semi-automatisé, risques d'erreurs.
            </p>

            <h3 style={{ fontSize: '1.2rem', marginTop: '32px', marginBottom: '12px', color: '#1e2b22' }}>Option 3 : Développer en interne</h3>
            <p style={{ marginBottom: '16px' }}>
              Seule pour les grandes structures avec équipes IT. Coûteux et risqué.
            </p>

            <h2 style={{ fontSize: '1.5rem', marginTop: '40px', marginBottom: '16px', color: '#1e2b22' }}>AVRA et la conformité e-facture 2026</h2>
            <p style={{ marginBottom: '16px' }}>
              AVRA a intégré la conformité e-facture dès sa conception. Avec AVRA, vous êtes 100% conforme sans action supplémentaire :
            </p>
            <ul style={{ marginBottom: '40px', paddingLeft: '24px' }}>
              <li style={{ marginBottom: '8px' }}>Factures générées automatiquement en format Factur-X</li>
              <li style={{ marginBottom: '8px' }}>Transmission intégrée à Chorus Pro pour les clients publics</li>
              <li style={{ marginBottom: '8px' }}>Archivage légal automatisé avec horodatage</li>
              <li style={{ marginBottom: '8px' }}>Zéro migration à prévoir en 2026</li>
            </ul>

            <h2 style={{ fontSize: '1.5rem', marginTop: '40px', marginBottom: '16px', color: '#1e2b22' }}>FAQ : E-facture 2026</h2>

            <h3 style={{ fontSize: '1.1rem', marginTop: '24px', marginBottom: '8px', color: '#1e2b22' }}>Suis-je concerné si je suis auto-entrepreneur ?</h3>
            <p style={{ marginBottom: '24px' }}>
              Si vous êtes en régime micro-fiscal, non (exemption). Sinon, oui. Vérifiez votre statut auprès de l'URSSAF.
            </p>

            <h3 style={{ fontSize: '1.1rem', marginTop: '24px', marginBottom: '8px', color: '#1e2b22' }}>Quelles sont les pénalités en cas de non-conformité ?</h3>
            <p style={{ marginBottom: '24px' }}>
              De 100 à 500€ par facture non-conforme. Mieux vaut ne pas prendre le risque. Mettez-vous en conformité maintenant.
            </p>

            <h3 style={{ fontSize: '1.1rem', marginTop: '24px', marginBottom: '8px', color: '#1e2b22' }}>Est-ce que ça complique ma compta avec mon expert-comptable ?</h3>
            <p style={{ marginBottom: '24px' }}>
              Non. AVRA génère des exports compatibles avec les logiciels comptables. Aucune surcharge pour votre expert.
            </p>

            <h3 style={{ fontSize: '1.1rem', marginTop: '24px', marginBottom: '8px', color: '#1e2b22' }}>Dois-je relancer mes clients pour que les paiements soient conformes ?</h3>
            <p style={{ marginBottom: '40px' }}>
              Non. La conformité porte sur l'émission et la transmission des factures, pas sur le paiement. Vos clients restent libres.
            </p>

            <h2 style={{ fontSize: '1.5rem', marginTop: '40px', marginBottom: '16px', color: '#1e2b22' }}>Conclusion</h2>
            <p style={{ marginBottom: '16px' }}>
              L'e-facture 2026 est une réforme importante mais que vous pouvez anticiper dès maintenant. Le meilleur moment pour vous y préparer, c'est aujourd'hui.
            </p>
            <p>
              En choisissant une solution comme AVRA qui gère déjà cette conformité, vous gagnez la tranquillité d'esprit. Zéro surprise en 2026.
            </p>
          </div>

          <div style={{ padding: '32px', background: '#f9f6f0', borderRadius: '12px', marginTop: '60px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '12px', color: '#1e2b22' }}>Soyez conforme dès maintenant avec AVRA</h3>
            <p style={{ color: '#6b7c70', marginBottom: '16px' }}>
              E-facture 2026 déjà intégrée. Essai gratuit 14 jours.
            </p>
            <a href="/register"><button style={{ padding: '12px 32px', background: '#1e2b22', color: '#f9f6f0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }} onMouseEnter={(e) => e.currentTarget.style.background = '#253029'} onMouseLeave={(e) => e.currentTarget.style.background = '#1e2b22'}>Démarrer l'essai gratuit</button></a>
          </div>
        </div>
      </div>

      <Footer />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON.stringify({ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: 'E-facture obligatoire 2026 : tout ce que les artisans doivent savoir', description: 'La facturation électronique devient obligatoire en 2026. Calendrier, obligations, solutions de conformité.', author: { '@type': 'Organization', name: 'AVRA' }, datePublished: '2026-04-12', dateModified: '2026-04-12' })) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'Suis-je concerné si je suis auto-entrepreneur ?', acceptedAnswer: { '@type': 'Answer', text: 'Si vous êtes en régime micro-fiscal, non (exemption). Sinon, oui. Vérifiez votre statut auprès de l\'URSSAF.' } }, { '@type': 'Question', name: 'Quelles sont les pénalités en cas de non-conformité ?', acceptedAnswer: { '@type': 'Answer', text: 'De 100 à 500€ par facture non-conforme. Mieux vaut ne pas prendre le risque. Mettez-vous en conformité maintenant.' } }] })) }} />
    </>
  );
}
