'use client';

import React from 'react';
import { FileText, Calendar, Euro, ChevronRight } from 'lucide-react';
import type { Dossier } from '@/store';

interface DossierCardProps {
  dossier: Dossier & { montantEstime?: number; dateSignature?: string };
  onSelect: (dossier: Dossier) => void;
}

export const DossierCard = React.memo(function DossierCard({ dossier, onSelect }: DossierCardProps) {
  const formatDate = (date: string | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const formatAmount = (amount: number | undefined) => {
    if (!amount) return '0 €';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <button
      onClick={() => onSelect(dossier)}
      className="w-full bg-white rounded-xl p-4 border border-[#304035]/8 hover:shadow-md hover:border-[#304035]/20 transition-all text-left"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-[#304035] mb-1">
            {dossier.name} {dossier.firstName}
          </h3>
          <p className="text-xs text-[#304035]/60">{dossier.email}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-[#304035]/40 mt-1" />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-[#304035]/40" />
          <span className="text-[#304035]/60">{formatDate(dossier.dateSignature)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Euro className="h-3.5 w-3.5 text-[#304035]/40" />
          <span className="text-[#304035]/60">{formatAmount(dossier.montantEstime)}</span>
        </div>
      </div>
    </button>
  );
});
