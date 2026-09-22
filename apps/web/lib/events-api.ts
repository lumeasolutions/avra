/**
 * RDV du planning : invitation client (e-mail + .ics) et abonnement agenda.
 * Voir apps/api/src/modules/events (EventInviteService, flux /calendar/p/…).
 */
import { api } from '@/lib/api';
import type { PlanningInvite } from '@/store/usePlanningStore';

export type TypeEnvoi = 'invite' | 'update' | 'cancel';

export async function envoyerInvitationRdv(
  eventId: string,
  body: { kind: TypeEnvoi; to?: string; name?: string; titre?: string; message?: string },
): Promise<PlanningInvite> {
  const res = await api<{ ok: boolean; invite: PlanningInvite }>(`/events/${eventId}/invitation`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.invite;
}

/** URL https du flux d'abonnement (à coller dans Google Agenda / Outlook / iPhone). */
export async function lienAbonnementAgenda(regenerer = false): Promise<string> {
  const res = await api<{ path: string }>(
    regenerer ? '/events/abonnement-agenda/regenerer' : '/events/abonnement-agenda',
    { method: regenerer ? 'POST' : 'GET' },
  );
  return `${window.location.origin}${res.path}`;
}

/** Liens directs « ajouter l'agenda » par application. */
export function liensAjoutAgenda(httpsUrl: string) {
  const webcal = httpsUrl.replace(/^https?:\/\//, 'webcal://');
  return {
    webcal,
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
    outlook: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(httpsUrl)}&name=${encodeURIComponent('AVRA — Planning')}`,
    outlookPro: `https://outlook.office.com/calendar/0/addfromweb?url=${encodeURIComponent(httpsUrl)}&name=${encodeURIComponent('AVRA — Planning')}`,
  };
}
