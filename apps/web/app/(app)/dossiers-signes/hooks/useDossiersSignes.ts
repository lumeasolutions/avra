'use client';

import { useState, useMemo } from 'react';
import { useDossierStore } from '@/store';

export function useDossiersSignes() {
  const dossiersSignes = useDossierStore(s => s.dossiersSignes);
  const [selectedDossier, setSelectedDossier] = useState<string | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'montant' | 'nom'>('date');

  const sortedDossiers = useMemo(() => {
    const sorted = [...dossiersSignes];
    if (sortBy === 'montant') {
      sorted.sort((a, b) => (b.montantEstime || 0) - (a.montantEstime || 0));
    } else if (sortBy === 'nom') {
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else {
      sorted.sort((a, b) => new Date(b.dateSignature || 0).getTime() - new Date(a.dateSignature || 0).getTime());
    }
    return sorted;
  }, [dossiersSignes, sortBy]);

  return {
    dossiersSignes: sortedDossiers,
    selectedDossier,
    setSelectedDossier,
    showDateModal,
    setShowDateModal,
    showBoardModal,
    setShowBoardModal,
    sortBy,
    setSortBy,
  };
}
