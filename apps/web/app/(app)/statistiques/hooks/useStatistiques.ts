'use client';

import { useState, useMemo } from 'react';
import { useDossierStore, useFacturationStore } from '@/store';

export function useStatistiques() {
  const invoices = useFacturationStore(s => s.invoices);
  const devis = useFacturationStore(s => s.devis);
  const dossiers = useDossierStore(s => s.dossiers);
  const dossiersSignes = useDossierStore(s => s.dossiersSignes);

  const [period, setPeriod] = useState('month'); // 'month' | 'quarter' | 'year'
  const [selectedDossier, setSelectedDossier] = useState<string | null>(null);

  const stats = useMemo(() => {
    const totalCA = invoices.reduce((sum, inv) => sum + (inv.montant || 0), 0);
    const paidCount = invoices.filter(inv => inv.statut === 'PAYÉE').length;
    const totalDevis = devis.length;
    const acceptedDevis = devis.filter(d => d.statut === 'ACCEPTÉ').length;
    const signedDossiers = dossiersSignes.length;

    return {
      totalCA,
      paidCount,
      pendingCount: invoices.length - paidCount,
      totalDevis,
      acceptedDevis,
      rejectedDevis: devis.filter(d => d.statut === 'REFUSÉ').length,
      signedDossiers,
      totalDossiers: dossiers.length + dossiersSignes.length,
      signatureRate:
        dossiers.length + dossiersSignes.length > 0
          ? Math.round((signedDossiers / (dossiers.length + dossiersSignes.length)) * 100)
          : 0,
    };
  }, [invoices, devis, dossiers, dossiersSignes]);

  return {
    stats,
    period,
    setPeriod,
    selectedDossier,
    setSelectedDossier,
    invoices,
    devis,
    dossiers,
    dossiersSignes,
  };
}
