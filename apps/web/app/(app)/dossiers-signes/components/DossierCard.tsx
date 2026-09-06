'use client';

/**
 * DossierCard (dossiers signés) — refonte 04/05/2026
 *
 * Design aligné sur les cards de dossiers en cours (apps/web/app/(app)/dossiers/page.tsx)
 * pour cohérence visuelle, en gardant les fonctionnalités spécifiques au signé :
 *  - Bouton "Marquer terminé" / "Rouvrir" (en haut à gauche)
 *  - Badge "TERMINÉ" si le dossier a été clôturé
 *  - Date de SIGNATURE au lieu de "Créé le"
 *  - Montant signé affiché
 *  - Bande couleur dorée pour différencier visuellement du dossier en cours (vert)
 *
 * Quand le dossier est terminé : la card prend une teinte vert émeraude,
 * sinon teinte dorée discrète.
 */

import React, { useState } from 'react';
import {
  Phone, Mail, MapPin, Calendar, Euro, ChevronRight,
  CheckCircle2, Check, RotateCcw, Loader2, FileCheck,
} from 'lucide-react';
import type { Dossier } from '@/store';
import { useProjectActions } from '@/hooks/useProjectActions';
import { clientDisplayName } from '@/lib/dossier-name';

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

/** Génère un couple de couleurs déterministe pour l'avatar du client. */
function avatarColor(name: string): [string, string] {
  const colors: [string, string][] = [
    ['#2d5a30', '#4aa350'],
    ['#7c3a1e', '#c08a5a'],
    ['#1e3a5f', '#4a7ec0'],
    ['#5a2d5a', '#c04aa3'],
    ['#3a4a1e', '#7ec04a'],
  ];
  const idx = (name.charCodeAt(0) || 0) % colors.length;
  return colors[idx];
}

export const DossierCard = React.memo(function DossierCard({ dossier, onSelect }: DossierCardProps) {
  const { terminateProject } = useProjectActions();
  const [busy, setBusy] = useState(false);

  const formatDate = (date: string | undefined) => {
    if (!date) return 'N/A';
    // Si déjà au format dd/MM/yyyy, on retourne tel quel (rétro-compat)
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return date;
    const d = new Date(date);
    return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString('fr-FR');
  };

  const formatAmount = (amount: number | undefined) => {
    if (!amount) return null;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleToggleTerminated = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await terminateProject(dossier.id, !dossier.terminated);
    } catch {
      /* le hook fait deja un rollback du store en cas d'echec API */
    } finally {
      setBusy(false);
    }
  };

  const [c1, c2] = avatarColor(dossier.name || 'X');
  const initials = `${(dossier.name || '?').charAt(0)}${dossier.firstName ? dossier.firstName.charAt(0) : ''}`.toUpperCase();
  const subfolderCount = dossier.subfolders?.length ?? 0;
  const formattedAmount = formatAmount(dossier.montantEstime);

  // ── Couleurs de la card selon l'état ───────────────────────────────────
  // Terminé   → gradient vert émeraude (chantier fini)
  // Signé     → gradient doré (signature acquise)
  const isTerminated = !!dossier.terminated;
  const cardBorder = isTerminated ? 'border-emerald-300' : 'border-[#a67749]/25';
  const cardBg = isTerminated
    ? 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40'
    : 'bg-white';
  const accentBar = isTerminated
    ? 'bg-gradient-to-r from-emerald-500 to-emerald-300'
    : 'bg-gradient-to-r from-[#a67749] to-[#d9b38a]';
  const glow = isTerminated
    ? '0 2px 8px rgba(34,197,94,0.10), 0 1px 2px rgba(0,0,0,0.04)'
    : '0 2px 8px rgba(166,119,73,0.10), 0 1px 2px rgba(0,0,0,0.04)';

  return (
    <div
      onClick={() => onSelect(dossier)}
      className={`dossier-card-signe group block cursor-pointer relative ${cardBg} rounded-2xl border ${cardBorder} shadow-sm overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5`}
      style={{ boxShadow: glow }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(dossier);
        }
      }}
    >
      {/* Bande couleur top */}
      <div className={`h-1.5 w-full ${accentBar}`} />

      <div className="p-5">
        {/* Row 1 : Avatar + Badge */}
        <div className="flex items-start justify-between mb-4">
          <div className="relative">
            <div
              className="h-12 w-12 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-md select-none"
              style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
            >
              {initials}
            </div>
            <div
              className="avatar-ring absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ boxShadow: `0 0 0 3px ${c2}55` }}
            />
          </div>

          {/* Badge statut + bouton terminer */}
          <div className="flex items-center gap-2">
            {isTerminated ? (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold bg-emerald-50 text-emerald-700 border-emerald-200"
                title={dossier.terminatedDate ? `Terminé le ${dossier.terminatedDate}` : 'Dossier entièrement terminé'}
              >
                <CheckCircle2 className="h-3 w-3" />
                Terminé
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold bg-[#a67749]/10 text-[#7c4f1d] border-[#a67749]/30">
                <FileCheck className="h-3 w-3" />
                Signé
              </span>
            )}
            <button
              type="button"
              onClick={handleToggleTerminated}
              disabled={busy}
              aria-label={isTerminated ? 'Rouvrir le dossier' : 'Marquer le dossier comme terminé'}
              title={isTerminated ? 'Rouvrir le dossier (annuler la clôture)' : 'Marquer comme terminé'}
              className={`flex items-center justify-center h-7 w-7 rounded-lg transition-all ${
                isTerminated
                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 ring-1 ring-emerald-200'
                  : 'bg-[#304035]/5 text-[#304035]/35 hover:bg-emerald-50 hover:text-emerald-600 hover:scale-105 opacity-0 group-hover:opacity-100'
              } ${busy ? 'cursor-wait opacity-100' : ''}`}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isTerminated ? (
                <RotateCcw className="h-3.5 w-3.5" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Nom client */}
        <div className="mb-1">
          <h3 className="font-bold text-[#304035] text-base leading-tight group-hover:text-[#a67749] transition-colors truncate">
            {clientDisplayName(dossier)}
          </h3>
          <p className="text-xs text-[#304035]/40 mt-0.5">
            Signé le {formatDate(dossier.dateSignature)}
            {isTerminated && dossier.terminatedDate && (
              <span className="text-emerald-600 font-medium">
                {' '}· Terminé le {dossier.terminatedDate}
              </span>
            )}
          </p>
        </div>

        {/* Infos contact */}
        <div className="space-y-1 mb-4 mt-3">
          {dossier.phone && (
            <div className="flex items-center gap-2 text-xs text-[#304035]/55">
              <Phone className="h-3 w-3 shrink-0 text-[#304035]/30" />
              <span className="truncate">{dossier.phone}</span>
            </div>
          )}
          {dossier.email && (
            <div className="flex items-center gap-2 text-xs text-[#304035]/55">
              <Mail className="h-3 w-3 shrink-0 text-[#304035]/30" />
              <span className="truncate">{dossier.email}</span>
            </div>
          )}
          {dossier.address && (
            <div className="flex items-center gap-2 text-xs text-[#304035]/55">
              <MapPin className="h-3 w-3 shrink-0 text-[#304035]/30" />
              <span className="truncate">{dossier.address}</span>
            </div>
          )}
        </div>

        {/* Bloc montant (mis en valeur) */}
        {formattedAmount && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-gradient-to-r from-[#fff8ef] to-[#fbf8f3] border border-[#a67749]/15 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-[#7c4f1d]/60 font-bold">
              Montant signé
            </span>
            <span className="text-sm font-extrabold text-[#7c4f1d]">
              {formattedAmount}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#304035]/5">
          <span className="text-xs text-[#304035]/40">
            {subfolderCount} élément{subfolderCount > 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1 text-xs font-semibold text-[#a67749] group-hover:gap-1.5 transition-all">
            <span>Voir le dossier</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
});
