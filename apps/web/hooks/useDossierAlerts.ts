'use client';

import { useMemo } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { summarizeDossierAlerts, type DossierAlertSummary } from '@/lib/alertClassify';

const EMPTY: DossierAlertSummary = { level: null, count: 0, retard: [], urgent: [] };

/**
 * Alertes urgent/retard d'un dossier — dérivées du même store que l'onglet
 * Alertes de l'assistant. Se met à jour automatiquement (moteur d'alertes).
 */
export function useDossierAlerts(dossierId: string | undefined | null): DossierAlertSummary {
  const alerts = useUIStore((s) => s.alerts);
  return useMemo(
    () => (dossierId ? summarizeDossierAlerts(alerts, dossierId) : EMPTY),
    [alerts, dossierId],
  );
}
