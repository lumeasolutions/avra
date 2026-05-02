'use client';

import { useState, useCallback, useMemo } from 'react';
import { useDossierStore, useFacturationStore, type LigneDocument } from '@/store';

export function useFacturation() {
  const invoices = useFacturationStore(s => s.invoices);
  const devis = useFacturationStore(s => s.devis);
  const dossiers = useDossierStore(s => s.dossiers);
  const dossiersSignes = useDossierStore(s => s.dossiersSignes);

  const [activeTab, setActiveTab] = useState<'devis' | 'factures' | 'e-facturation'>('factures');
  const [copiedToken, setCopiedToken] = useState('');

  const allDossiers = useMemo(() => [...dossiers, ...dossiersSignes], [dossiers, dossiersSignes]);

  const copyLink = useCallback((token: string) => {
    const url = `${window.location.origin}/e-facturation/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(''), 2000);
  }, []);

  const tabCounts = useMemo(() => ({
    devis: devis.length,
    factures: invoices.length,
    'e-facturation': undefined,
  }), [devis.length, invoices.length]);

  return {
    invoices,
    devis,
    allDossiers,
    activeTab,
    setActiveTab,
    copiedToken,
    setCopiedToken,
    copyLink,
    tabCounts,
  };
}

export function useDevisForm(devisToEdit?: any) {
  const [form, setForm] = useState({
    client: devisToEdit?.client ?? '',
    clientEmail: devisToEdit?.clientEmail ?? '',
    clientAddress: devisToEdit?.clientAddress ?? '',
    dossierId: devisToEdit?.dossierId ?? '',
    dateValidite: devisToEdit?.dateValidite ?? new Date(Date.now() + 30 * 86400000).toLocaleDateString('fr-FR'),
    conditionsPaiement: devisToEdit?.conditionsPaiement ?? '30% acompte, 40% intermédiaire, 30% solde',
    notes: devisToEdit?.notes ?? '',
  });

  const [lignes, setLignes] = useState<LigneDocument[]>(devisToEdit?.lignes ?? [
    { id: 'l1', description: '', quantite: 1, unite: 'forfait', prixUnitaireHT: 0, tva: 20, remise: 0 },
  ]);

  const [submitError, setSubmitError] = useState('');

  const handleDossierChange = useCallback((id: string, allDossiers: any[]) => {
    const d = allDossiers.find(d => d.id === id);
    if (d) {
      setForm(f => ({
        ...f,
        dossierId: id,
        client: d.name + (d.firstName ? ' ' + d.firstName : ''),
        clientEmail: d.email ?? '',
      }));
    } else {
      setForm(f => ({ ...f, dossierId: id }));
    }
  }, []);

  return {
    form,
    setForm,
    lignes,
    setLignes,
    submitError,
    setSubmitError,
    handleDossierChange,
  };
}

export function useInvoiceForm(devisSource?: any) {
  const [form, setForm] = useState({
    client: devisSource?.client ?? '',
    clientEmail: devisSource?.clientEmail ?? '',
    clientAddress: devisSource?.clientAddress ?? '',
    dossierId: devisSource?.dossierId ?? '',
    type: 'Facture' as any,
    factureType: 'STANDARD' as any,
    date: new Date().toLocaleDateString('fr-FR'),
    dateEcheance: new Date(Date.now() + 30 * 86400000).toLocaleDateString('fr-FR'),
    conditionsPaiement: devisSource?.conditionsPaiement ?? 'Paiement à 30 jours',
    notes: '',
    tva: 20,
  });

  const [lignes, setLignes] = useState<LigneDocument[]>(devisSource?.lignes ? [...devisSource.lignes] : [
    { id: 'l1', description: '', quantite: 1, unite: 'forfait', prixUnitaireHT: 0, tva: 20, remise: 0 },
  ]);

  const [invSubmitError, setInvSubmitError] = useState('');

  return {
    form,
    setForm,
    lignes,
    setLignes,
    invSubmitError,
    setInvSubmitError,
  };
}
