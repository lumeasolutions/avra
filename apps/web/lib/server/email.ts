/**
 * Wrapper Resend pour AVRA.
 *
 * En sandbox (sans domaine vérifié) : utilise onboarding@resend.dev comme expéditeur.
 * En production avec avra.fr vérifié : mettre EMAIL_FROM=noreply@avra.fr dans les env vars.
 *
 * Variables d'environnement requises :
 *   RESEND_API_KEY          — clé API Resend (obligatoire)
 *   EMAIL_FROM              — expéditeur (défaut : onboarding@resend.dev)
 *   ADMIN_NOTIFICATION_EMAIL — destinataire des alertes internes (défaut : EMAIL_FROM)
 */

import { Resend } from 'resend';
import { render } from '@react-email/render';
import WaitlistConfirmation from '../../emails/WaitlistConfirmation';
import DemoRequestConfirmation from '../../emails/DemoRequestConfirmation';
import AdminNotification from '../../emails/AdminNotification';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DemoRequestData = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  phone?: string | null;
  metier?: string | null;
  message?: string | null;
};

export type WaitlistData = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  metier?: string | null;
};

// ─── Client ──────────────────────────────────────────────────────────────────

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[email] RESEND_API_KEY manquante — les emails sont désactivés.');
    return null;
  }
  return new Resend(key);
}

function getFrom(): string {
  return process.env.EMAIL_FROM || 'AVRA <onboarding@resend.dev>';
}

function getAdminEmail(): string {
  return process.env.ADMIN_NOTIFICATION_EMAIL || process.env.EMAIL_FROM || 'onboarding@resend.dev';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Envoie un email de confirmation à l'utilisateur qui vient de rejoindre la waitlist.
 */
export async function sendWaitlistConfirmation(data: WaitlistData): Promise<void> {
  const resend = getResendClient();
  if (!resend) return;

  try {
    const html = await render(
      WaitlistConfirmation({ ...data }) as React.ReactElement,
    );
    await resend.emails.send({
      from: getFrom(),
      to: data.email,
      subject: "🌱 Vous êtes sur la liste d'attente AVRA",
      html,
    });
  } catch (err) {
    // Ne jamais faire échouer la route API à cause d'un email
    console.error('[email] sendWaitlistConfirmation error:', err);
  }
}

/**
 * Envoie un email de confirmation à l'utilisateur qui vient de demander une démo.
 */
export async function sendDemoRequestConfirmation(data: DemoRequestData): Promise<void> {
  const resend = getResendClient();
  if (!resend) return;

  try {
    const html = await render(
      DemoRequestConfirmation({ ...data }) as React.ReactElement,
    );
    await resend.emails.send({
      from: getFrom(),
      to: data.email,
      subject: '📅 Votre demande de démo AVRA est bien reçue',
      html,
    });
  } catch (err) {
    console.error('[email] sendDemoRequestConfirmation error:', err);
  }
}

/**
 * Envoie une notification interne à l'équipe AVRA.
 * @param type   'waitlist' | 'demo'
 * @param data   données du formulaire
 */
export async function sendAdminNotification(
  type: 'waitlist' | 'demo',
  data: WaitlistData | DemoRequestData,
): Promise<void> {
  const resend = getResendClient();
  if (!resend) return;

  try {
    const html = await render(
      AdminNotification({ type, data }) as React.ReactElement,
    );
    const subject =
      type === 'waitlist'
        ? `🌱 Nouvelle inscription waitlist — ${data.email}`
        : `📅 Nouvelle demande de démo — ${data.email}`;

    await resend.emails.send({
      from: getFrom(),
      to: getAdminEmail(),
      subject,
      html,
    });
  } catch (err) {
    console.error('[email] sendAdminNotification error:', err);
  }
}
