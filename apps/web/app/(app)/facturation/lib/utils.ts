import type { InvoiceStatus, DevisStatus, LigneDocument } from '@/store';

export const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export const fmtPrecise = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export const INVOICE_STATUS_CFG: Record<InvoiceStatus, { label: string; color: string; bg: string; dot: string }> = {
  'PAYÉE':       { label: 'Payée',       color: 'text-emerald-700', bg: 'bg-emerald-100', dot: 'bg-emerald-500' },
  'EN ATTENTE':  { label: 'En attente',  color: 'text-blue-700',    bg: 'bg-blue-100',    dot: 'bg-blue-500' },
  'ACOMPTE':     { label: 'Acompte',     color: 'text-amber-700',   bg: 'bg-amber-100',   dot: 'bg-amber-500' },
  'AVOIR':       { label: 'Avoir',       color: 'text-purple-700',  bg: 'bg-purple-100',  dot: 'bg-purple-500' },
  'RETARD':      { label: 'Retard',      color: 'text-red-700',     bg: 'bg-red-100',     dot: 'bg-red-500' },
};

export const DEVIS_STATUS_CFG: Record<DevisStatus, { label: string; color: string; bg: string }> = {
  'BROUILLON': { label: 'Brouillon', color: 'text-slate-600',   bg: 'bg-slate-100' },
  'ENVOYÉ':    { label: 'Envoyé',    color: 'text-blue-700',    bg: 'bg-blue-100' },
  'ACCEPTÉ':   { label: 'Accepté',  color: 'text-emerald-700', bg: 'bg-emerald-100' },
  'REFUSÉ':    { label: 'Refusé',   color: 'text-red-700',     bg: 'bg-red-100' },
  'EXPIRÉ':    { label: 'Expiré',   color: 'text-orange-700',  bg: 'bg-orange-100' },
};

export function calcLignes(lignes: LigneDocument[]) {
  const totalHT = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaireHT * (1 - l.remise / 100), 0);
  const totalTVA = lignes.reduce((s, l) => {
    const ht = l.quantite * l.prixUnitaireHT * (1 - l.remise / 100);
    return s + ht * (l.tva / 100);
  }, 0);
  return { totalHT, totalTVA, totalTTC: totalHT + totalTVA };
}
