/**
 * Email envoyé à l'utilisateur après une demande de démo AVRA.
 */

import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Link,
  Hr,
  Preview,
  Font,
} from '@react-email/components';

interface DemoRequestConfirmationProps {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  phone?: string | null;
  metier?: string | null;
  message?: string | null;
}

const METIER_LABELS: Record<string, string> = {
  architecte: "Architecte d'intérieur",
  cuisiniste: 'Cuisiniste',
  menuisier: 'Menuisier',
  agenceur: 'Agenceur',
  decorateur: 'Décorateur',
  autre: 'Autre',
};

export default function DemoRequestConfirmation({
  email,
  firstName,
  lastName,
  company,
  phone,
  metier,
  message,
}: DemoRequestConfirmationProps) {
  const prenom = firstName || '';
  const nom = lastName || '';
  const nomComplet = [prenom, nom].filter(Boolean).join(' ') || 'Bonjour';
  const metierLabel = metier ? METIER_LABELS[metier] ?? metier : null;

  return (
    <Html lang="fr">
      <Head>
        <Font
          fontFamily="DM Sans"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: 'https://fonts.gstatic.com/s/dmsans/v15/rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu6-K6z9mXgjU0.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>Votre demande de démo AVRA est confirmée 📅 Notre équipe vous contacte sous 48h</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* En-tête */}
          <Section style={headerStyle}>
            <Text style={logo}>AVRA</Text>
            <Text style={tagline}>Logiciel de gestion pour professionnels de l'agencement</Text>
          </Section>

          {/* Corps */}
          <Section style={content}>
            <Heading style={h1}>
              {prenom ? `${prenom}, votre demande est confirmée ! 📅` : 'Votre demande est confirmée ! 📅'}
            </Heading>

            <Text style={paragraph}>
              Merci {nomComplet !== 'Bonjour' ? nomComplet : ''} d'avoir demandé une démo d'AVRA.
              Notre équipe a bien reçu votre demande et vous contactera dans les <strong>48 heures ouvrées</strong>.
            </Text>

            {/* Récapitulatif */}
            <Section style={infoBox}>
              <Text style={infoBoxTitle}>📋 Récapitulatif de votre demande</Text>
              <Text style={infoText}>
                📧 <strong>Email :</strong> {email}
                {company ? `\n🏢 Entreprise : ${company}` : ''}
                {metierLabel ? `\n🔧 Métier : ${metierLabel}` : ''}
                {phone ? `\n📞 Téléphone : ${phone}` : ''}
                {message ? `\n💬 Message : ${message}` : ''}
              </Text>
            </Section>

            <Text style={paragraph}>
              Pendant que vous attendez notre retour, découvrez toutes les fonctionnalités d'AVRA :
              gestion de dossiers clients, facturation, planning, stock et IA photo-réalisme — tout
              en une seule application.
            </Text>

            <Section style={buttonContainer}>
              <Link href="https://avra.fr/fonctionnalites" style={button}>
                Découvrir les fonctionnalités →
              </Link>
            </Section>
          </Section>

          <Hr style={divider} />

          {/* Pied de page */}
          <Section style={footer}>
            <Text style={footerText}>
              Cet email vous a été envoyé suite à votre demande de démo sur avra.fr.
            </Text>
            <Text style={footerText}>
              <Link href="https://avra.fr/confidentialite" style={footerLink}>
                Politique de confidentialité
              </Link>
              {' · '}
              <Link href="https://avra.fr/mentions-legales" style={footerLink}>
                Mentions légales
              </Link>
            </Text>
            <Text style={footerText}>
              © {new Date().getFullYear()} AVRA · Bêta privée · Lancement juillet 2026
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: '#f4f4f5',
  fontFamily: '"DM Sans", Helvetica, Arial, sans-serif',
  margin: 0,
  padding: '40px 0',
};

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  maxWidth: '560px',
  margin: '0 auto',
  overflow: 'hidden',
  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
};

const headerStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #0e1810 0%, #162015 100%)',
  padding: '40px 40px 32px',
  textAlign: 'center',
};

const logo: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  color: '#C9A96E',
  letterSpacing: '0.12em',
  margin: 0,
  marginBottom: '6px',
};

const tagline: React.CSSProperties = {
  fontSize: '12px',
  color: 'rgba(255,255,255,0.55)',
  margin: 0,
  letterSpacing: '0.04em',
};

const content: React.CSSProperties = {
  padding: '40px 40px 32px',
};

const h1: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#0e1810',
  marginBottom: '16px',
  lineHeight: 1.3,
};

const paragraph: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: 1.65,
  color: '#374151',
  marginBottom: '16px',
};

const infoBox: React.CSSProperties = {
  backgroundColor: 'rgba(201, 169, 110, 0.08)',
  border: '1px solid rgba(201, 169, 110, 0.25)',
  borderRadius: '10px',
  padding: '16px 20px',
  marginBottom: '24px',
};

const infoBoxTitle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#0e1810',
  margin: '0 0 8px 0',
};

const infoText: React.CSSProperties = {
  fontSize: '14px',
  color: '#4b5563',
  margin: 0,
  whiteSpace: 'pre-line',
  lineHeight: 1.7,
};

const buttonContainer: React.CSSProperties = {
  textAlign: 'center',
  marginTop: '24px',
};

const button: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#C9A96E',
  color: '#0e1810',
  padding: '14px 28px',
  borderRadius: '10px',
  fontWeight: 700,
  fontSize: '14px',
  textDecoration: 'none',
  letterSpacing: '0.01em',
};

const divider: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '0 40px',
};

const footer: React.CSSProperties = {
  padding: '24px 40px 32px',
  textAlign: 'center',
};

const footerText: React.CSSProperties = {
  fontSize: '12px',
  color: '#9ca3af',
  lineHeight: 1.6,
  margin: '4px 0',
};

const footerLink: React.CSSProperties = {
  color: '#9ca3af',
  textDecoration: 'underline',
};
