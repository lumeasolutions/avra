/**
 * Liens de visio des RDV du planning (Google Meet, Zoom, Teams, WhatsApp…).
 *
 * Retour cofondatrice 22/09/2026 : « intégrer des liens Google Meet dans le
 * planning, sinon personne n'utilisera le planning d'AVRA ». On ne crée pas de
 * module visio : l'utilisateur colle le lien de l'outil qu'il utilise déjà, le
 * RDV l'affiche (« Rejoindre ») et l'envoie au client.
 */

export interface VisioInfo {
  /** URL normalisée (https://…). */
  url: string;
  /** Nom du service (« Google Meet », « Zoom »…) ou « Visio ». */
  provider: string;
}

/** Ajoute https:// si l'utilisateur a collé « meet.google.com/abc-defg-hij ». */
export function normaliserLienVisio(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(s)) return `https://${s}`;
  return s;
}

export function lienVisioValide(raw: string): boolean {
  const s = normaliserLienVisio(raw);
  if (!s) return false;
  try {
    const u = new URL(s);
    return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.includes('.');
  } catch {
    return false;
  }
}

export function fournisseurVisio(url: string): string {
  let h = '';
  try { h = new URL(normaliserLienVisio(url)).hostname.toLowerCase(); } catch { /* lien invalide */ }
  if (h.endsWith('meet.google.com')) return 'Google Meet';
  if (h.includes('zoom.')) return 'Zoom';
  if (h.includes('teams.microsoft') || h.includes('teams.live')) return 'Teams';
  if (h.includes('whatsapp')) return 'WhatsApp';
  if (h.includes('jit.si') || h.includes('jitsi')) return 'Jitsi';
  if (h.includes('whereby')) return 'Whereby';
  if (h.includes('webex')) return 'Webex';
  if (h.includes('facetime')) return 'FaceTime';
  return 'Visio';
}

export function infoVisio(raw?: string | null): VisioInfo | null {
  if (!raw || !lienVisioValide(raw)) return null;
  const url = normaliserLienVisio(raw);
  return { url, provider: fournisseurVisio(url) };
}

/** Nouvelle réunion Google Meet instantanée (compte Google connecté dans le navigateur). */
export const NOUVEAU_MEET_URL = 'https://meet.google.com/new';

/** RDV à rejoindre : « bientot » dans les 15 min avant le début, « en-cours » jusqu'à la fin. */
export function visioImminente(start: Date, end: Date, now = new Date()): 'bientot' | 'en-cours' | null {
  const t = now.getTime();
  if (t >= start.getTime() && t < end.getTime()) return 'en-cours';
  if (t >= start.getTime() - 15 * 60000 && t < start.getTime()) return 'bientot';
  return null;
}
