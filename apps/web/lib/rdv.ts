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

export function finRdv(ev: PlanningEvent): Date {
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
