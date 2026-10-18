/**
 * Helpers de date pour les RDV du planning classique (stockés en
 * jour de semaine + décalage de semaine relatif à la semaine courante).
 */
import type { PlanningEvent } from '@/store/usePlanningStore';

function lundiCourant(): Date {
  const x = new Date(); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function debutRdv(ev: Pick<PlanningEvent, 'day' | 'startHour' | 'startMinute' | 'weekOffset'>): Date {
  const d = lundiCourant();
  d.setDate(d.getDate() + (ev.weekOffset ?? 0) * 7 + (Math.min(7, Math.max(1, ev.day || 1)) - 1));
  d.setHours(ev.startHour || 0, ev.startMinute || 0, 0, 0);
  return d;
}

export function dureeRdvMin(ev: Pick<PlanningEvent, 'duration' | 'durationMinutes'>): number {
  return Math.max(15, ev.durationMinutes ?? Math.round((ev.duration || 1) * 60));
}

export function finRdv(ev: Pick<PlanningEvent, 'day' | 'startHour' | 'startMinute' | 'weekOffset' | 'duration' | 'durationMinutes'>): Date {
  return new Date(debutRdv(ev).getTime() + dureeRdvMin(ev) * 60000);
}

/** « Mardi 30 septembre à 14h00 » */
export function quandRdv(ev: PlanningEvent): string {
  const d = debutRdv(ev);
  const jour = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return `${jour.charAt(0).toUpperCase()}${jour.slice(1)} à ${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`;
}

export function dureeLisible(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

/** Ce qui change pour le client entre deux versions d'un RDV (date, durée, lieu, visio). */
export function changementPourClient(a: PlanningEvent, b: PlanningEvent): boolean {
  return debutRdv(a).getTime() !== debutRdv(b).getTime()
    || dureeRdvMin(a) !== dureeRdvMin(b)
    || (a.location ?? '').trim() !== (b.location ?? '').trim()
    || (a.visioUrl ?? '').trim() !== (b.visioUrl ?? '').trim();
}

/** Objet proposé au client à partir du type de RDV. */
export function objetClientParDefaut(typeLabel?: string): string {
  if (!typeLabel || /^rdv client$/i.test(typeLabel)) return 'Rendez-vous';
  return typeLabel;
}

/**
 * Créneau proposé par défaut quand on planifie depuis une fiche dossier :
 * l'heure suivante (jamais avant `heureMatin`), ou le lendemain matin passé
 * 18 h. Renvoie la date (AAAA-MM-JJ), l'heure et le décalage de semaine.
 */
export function prochainCreneau(heureMatin: number, maintenant = new Date()): {
  date: string; heure: number; annee: number; mois: number; weekOffset: number;
} {
  const d = new Date(maintenant);
  let heure: number;
  if (d.getHours() >= 18) {
    d.setDate(d.getDate() + 1);
    heure = heureMatin;
  } else {
    heure = Math.max(heureMatin, d.getHours() + 1);
  }
  d.setHours(0, 0, 0, 0);
  const weekOffset = Math.round((lundiDe(d).getTime() - lundiDe(maintenant).getTime()) / (7 * 86400000));
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { date, heure, annee: d.getFullYear(), mois: d.getMonth(), weekOffset };
}

function lundiDe(x: Date): Date {
  const d = new Date(x); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
