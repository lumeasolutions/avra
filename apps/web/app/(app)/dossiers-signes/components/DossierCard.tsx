'use client';

import React, { useState } from 'react';
import { Calendar, Euro, ChevronRight, CheckCircle2, Check, RotateCcw, Loader2 } from 'lucide-react';
import type { Dossier } from '@/store';
import { useProjectActions } from '@/hooks/useProjectActions';

interface DossierCardProps {
  dossier: Dossier & {
    montantEstime?: number;
    dateSignature?: string;
    /** Marqué comme entièrement terminé (chantier fini, livré, SAV à jour). */
    terminated?: boolean;
    terminatedDate?: string;
  };
  onSelect: (dossier: Dossier) => void;
}

export const DossierCard = React.memo(function DossierCard({ dossier, onSelect }: DossierCardProps) {
  const { terminateProject } = useProjectActions();
  const [busy, setBusy] = useState(false);

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

  const handleToggleTerminated = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      // Si dossier deja termine on rouvre (terminated:false), sinon on cloture.
      await terminateProject(dossier.id, !dossier.terminated);
    } catch {
      // Le hook fait deja un rollback du store en cas d'echec API.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`relative w-full rounded-xl border transition-all overflow-hidden ${
        dossier.terminated
          ? 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 border-emerald-300 hover:shadow-md hover:border-emerald-400'
          : 'bg-white border-[#304035]/8 hover:shadow-md hover:border-[#304035]/20'
      }`}
    >
      {/* Bouton terminer / rouvrir (en haut a gauche, ne declenche pas onSelect) */}
      <button
        type="button"
        onClick={handleToggleTerminated}
        disabled={busy}
        aria-label={dossier.terminated ? 'Rouvrir le dossier' : 'Marquer le dossier comme terminé'}
        title={dossier.terminated ? 'Rouvrir le dossier' : 'Marquer comme terminé'}
        className={`absolute top-2 left-2 z-10 inline-flex items-center justify-center w-8 h-8 rounded-full transition-all ${
          dossier.terminated
            ? 'bg-white text-emerald-600 hover:bg-emerald-50 ring-1 ring-emerald-300'
            : 'bg-white/90 text-[#304035]/40 hover:text-emerald-600 hover:bg-emerald-50 ring-1 ring-[#304035]/10 opacity-0 group-hover:opacity-100 focus:opacity-100'
        } ${busy ? 'cursor-wait' : 'cursor-pointer'}`}
        style={{ opacity: dossier.terminated || busy ? 1 : undefined }}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : dossier.terminated ? (
          <RotateCcw className="h-4 w-4" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </button>

      <button
        type="button"
        onClick={() => onSelect(dossier)}
        className="group relative w-full p-4 text-left"
      >
        {dossier.terminated && (
          <span
            className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm ring-1 ring-emerald-600/20"
            title={dossier.terminatedDate ? `Terminé le ${dossier.terminatedDate}` : 'Dossier entièrement terminé'}
          >
            <CheckCircle2 className="h-3 w-3" />
            Terminé
          </span>
        )}

        <div className="flex items-start justify-between mb-3 pl-10">
          <div className="flex-1 pr-16">
            <h3 className="font-semibold text-[#304035] mb-1">
              {dossier.name} {dossier.firstName}
            </h3>
            <p className="text-xs text-[#304035]/60">{dossier.email}</p>
          </div>
          {!dossier.terminated && (
            <ChevronRight className="h-4 w-4 text-[#304035]/40 mt-1" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs pl-10">
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
    </div>
  );
});
