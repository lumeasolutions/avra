/**
 * Email de notification interne envoyé à l'équipe AVRA.
 * Déclenché à chaque nouvelle inscription waitlist ou demande de démo.
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
} from '@react-email/components';

type WaitlistData = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  metier?: string | null;
};

type DemoRequestData = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  phone?: string | null;
  metier?: string | null;
  message?: string | null;
};

interface AdminNotificationProps {
  type: 'waitlist' | 'demo';
  data: WaitlistData | DemoRequestData;
}

const METIER_LABELS: Record<string, string> = {
  architecte: "Architecte d'intérieur",
  cuisiniste: 'Cuisiniste',
  menuisier: 'Menuisier',
  agenceur: 'Agenceur',
  decorateur: 'Décorateur',
  autre: 'Autre',
};

function isDemoData(data: WaitlistData | DemoRequestData): data is DemoRequestData {
  return 'phone' in data || 'message' in data;
}

export default function AdminNotification({ type, data }: AdminNotificationProps) {
  const isDemo = type === 'demo';
  const metierLabel = data.metier ? METIER_LABELS[data.metier] ?? data.metier : null;
  const nomComplet = [data.firstName, data.lastName].filter(Boolean).join(' ') || '—';
  const now = new Date().toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return (
    <Html lang="fr">
      <Head />
      <Preview>
        {isDemo
          ? `📅 Nouvelle démo demandée par ${data.email}`
          : `🌱 Nouvelle inscription waitlist : ${data.email}`}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Badge */}
          <Section style={badge}>
            <Text style={badgeText}>
              {isDemo ? '📅 NOUVELLE DEMANDE DE DÉMO' : '🌱 NOUVELLE INSCRIPTION WAITLIST'}
            </Text>
          </Section>

          <Section style={content}>
            <Heading style={h1}>{data.email}</Heading>
            <Text style={dateText}>Reçu le {now}</Text>

            <Hr style={divider} />

            {/* Infos */}
            <Section style={grid}>
              <Row label="Nom complet" value={nomComplet} />
              <Row label="Email" value={data.email} />
              {data.company && <Row label="Entreprise" value={data.company} />}
              {metierLabel && <Row label="Métier" value={metierLabel} />}
              {isDemoData(data) && data.phone && <Row label="Téléphone" value={data.phone} />}
              {isDemoData(data) && data.message && (
                <Row label="Message" value={data.message} isMultiline />
              )}
            </Section>

            <Hr style={divider} />

            {/* Actions rapides */}
            <Text style={actionsTitle}>Actions rapides</Text>
            <Text style={actionLinks}>
              <Link href={`mailto:${data.email}`} style={actionLink}>
                ✉️ Répondre par email
              </Link>
              {'   '}
              <Link href="https://avra.fr/portail-admin" style={actionLink}>
                📊 Voir le tableau de bord
              </Link>
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Notification automatique AVRA · Ne pas répondre à cet email
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ─── Composant helper ────────────────────────────────────────────────────────

function Row({
  label,
  value,
  isMultiline = false,
}: {
  label: string;
  value: string;
  isMultiline?: boolean;
}) {
  return (
    <Section style={rowContainer}>
      <Text style={rowLabel}>{label}</Text>
      <Text style={{ ...rowValue, ...(isMultiline ? { whiteSpace: 'pre-wrap' } : {}) }}>
        {value}
      </Text>
    </Section>
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
  borderRadius: '12px',
  maxWidth: '560px',
  margin: '0 auto',
  overflow: 'hidden',
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
};

const badge: React.CSSProperties = {
  backgroundColor: '#0e1810',
  padding: '16px 32px',
  textAlign: 'center',
};

const badgeText: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#C9A96E',
  letterSpacing: '0.12em',
  margin: 0,
};

const content: React.CSSProperties = {
  padding: '28px 32px 24px',
};

const h1: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#0e1810',
  margin: '0 0 4px',
};

const dateText: React.CSSProperties = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '0 0 20px',
};

const divider: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '16px 0',
};

const grid: React.CSSProperties = {
  padding: '4px 0',
};

const rowContainer: React.CSSProperties = {
  marginBottom: '10px',
};

const rowLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  margin: '0 0 2px',
};

const rowValue: React.CSSProperties = {
  fontSize: '14px',
  color: '#111827',
  margin: 0,
};

const actionsTitle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  margin: '0 0 8px',
};

const actionLinks: React.CSSProperties = {
  fontSize: '14px',
  margin: 0,
};

const actionLink: React.CSSProperties = {
  color: '#C9A96E',
  textDecoration: 'underline',
  fontWeight: 600,
};

const footer: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  padding: '12px 32px',
  textAlign: 'center',
  borderTop: '1px solid #e5e7eb',
};

const footerText: React.CSSProperties = {
  fontSize: '11px',
  color: '#9ca3af',
  margin: 0,
};
