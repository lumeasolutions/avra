/**
 * Classification URGENT / RETARD — SOURCE DE VÉRITÉ UNIQUE.
 *
 * Partagée entre l'onglet « Alertes » de l'assistant AVRA (AssistantPanel) et les
 * badges « ! » posés sur les dossiers. Ce que dit l'assistant = ce que montre le
 * dossier, par construction.
 *
 * URGENT et RETARD sont MUTUELLEMENT EXCLUSIFS (un retard est aussi severity:'error').
 *   • RETARD  = déjà en retard (facture échéance/retard, livraison, butoir dépassé)
 *   • URGENT  = à traiter en priorité mais PAS encore en retard
 *               (dossier marqué urgent, rupture de stock, butoir imminent)
 */
import type { AlertItem } from '@/store/useUIStore';

type WithKey = Pick<AlertItem, 'sourceKey'>;

/**
 * Ancre DOM d'une échéance (date butoir) — partagée par le moteur d'alertes
 * (pour poser l'ancre sur l'alerte) et la bande « Échéances » du dossier (pour
 * poser le même id sur la ligne). Garantit que le clic atterrit au bon endroit.
 * Ex : "Plan technique" → "ech-plan-technique".
 */
export function echeanceAnchor(label: string): string {
  return (
    'ech-' +
    label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}

export function isRetardAlert(a: WithKey): boolean {
  const k = a.sourceKey ?? '';
  return (
    k.startsWith('facture-') ||
    k.startsWith('cmd-livraison-') ||
    k.startsWith('devis-attente-') ||
    (k.startsWith('cmdligne-') && !k.startsWith('cmdligne-soon-')) ||
    (k.startsWith('butoir-') && !k.startsWith('butoir-soon-'))
  );
}

export function isUrgentAlert(a: WithKey): boolean {
  const k = a.sourceKey ?? '';
  return (
    k.startsWith('urgent-') ||
    k.startsWith('stock-rupture-') ||
    k.startsWith('butoir-soon-') ||
    k.startsWith('cmdligne-soon-')
  );
}

export type DossierAlertLevel = 'retard' | 'urgent' | null;

export interface DossierAlertSummary {
  /** RETARD est prioritaire sur URGENT. null = aucun signal urgent/retard. */
  level: DossierAlertLevel;
  /** Nombre total d'alertes urgent + retard du dossier. */
  count: number;
  retard: AlertItem[];
  urgent: AlertItem[];
}

/**
 * Résume les alertes urgent/retard d'un dossier donné (non masquées).
 */
export function summarizeDossierAlerts(alerts: AlertItem[], dossierId: string): DossierAlertSummary {
  const mine = alerts.filter((a) => !a.dismissed && a.dossierId === dossierId);
  const retard = mine.filter(isRetardAlert);
  const urgent = mine.filter(isUrgentAlert);
  const level: DossierAlertLevel = retard.length ? 'retard' : urgent.length ? 'urgent' : null;
  return { level, count: retard.length + urgent.length, retard, urgent };
}
