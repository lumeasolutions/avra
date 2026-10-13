'use client';

import { useMemo } from 'react';
import { useFacturationStore, useUIStore, useVisibleDossiers, useVisibleDossiersSignes } from '@/store';
import { useDemandesStore } from '@/store/useDemandesStore';

/**
 * Pastilles de la navigation (menu latéral sur ordinateur, barre du bas et
 * menu « Plus » sur téléphone) : un seul calcul, pour que les deux
 * navigations affichent toujours les mêmes chiffres.
 *
 * Lecture seule : le rafraîchissement périodique des demandes reste dans le
 * menu latéral, monté sur tous les écrans, pour ne pas lancer deux minuteries.
 */
export function useNavBadges() {
  const dossiers = useVisibleDossiers();
  const dossiersSignes = useVisibleDossiersSignes();
  const invoices = useFacturationStore((s) => s.invoices);
  const devis = useFacturationStore((s) => s.devis);
  const alerts = useUIStore((s) => s.alerts);
  const proStats = useDemandesStore((s) => s.proStats);

  return useMemo(() => {
    const urgentCount = dossiers.filter((d) => d.status === 'URGENT').length;
    // Ne compter que les dossiers signés ACTIFS (non archivés) — les archivés ont
    // leur propre compteur ("X archivés") et ne doivent pas gonfler ce badge.
    const signedCount = dossiersSignes.filter((d) => !(d as { archivedAt?: string | null }).archivedAt).length;
    const retardCount = invoices.filter((e) => e.statut === 'RETARD').length;
    const alertCount = alerts.filter((a) => !a.dismissed).length;
    const devisSignatureCount = devis.filter((d) => d.signatureStatus === 'EN_ATTENTE_SIGNATURE').length;
    const devisEnvoyeCount = devis.filter((d) => d.statut === 'ENVOYÉ').length;
    const factuBadge = retardCount + devisSignatureCount + devisEnvoyeCount;
    const confirmationsPendingCount = dossiersSignes.reduce(
      (s, d) => s + (d.confirmations ?? []).filter((c) => !c.validee).length,
      0,
    );
    const demandesActionCount = proStats?.actionRequiredCount ?? 0;
    return {
      urgentCount,
      signedCount,
      retardCount,
      alertCount,
      factuBadge,
      confirmationsPendingCount,
      demandesActionCount,
    };
  }, [dossiers, dossiersSignes, invoices, devis, alerts, proStats]);
}
