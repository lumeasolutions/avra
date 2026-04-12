'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText, Plus, Trash2, Check, ChevronRight, ChevronDown,
  Download, Send, Eye, Copy, ExternalLink, AlertTriangle,
  Euro, Clock, CheckCircle2, XCircle, FileCheck, Zap,
  Building2, CreditCard, Mail, Globe, MoreVertical,
  ArrowRight, Percent, X, PlusCircle, Edit2,
} from 'lucide-react';
import { useFacturationStore, useDossierStore, useConfigStore, useUIStore, type Invoice, type InvoiceStatus, type Devis, type DevisStatus, type LigneDocument, type InvoiceDetail, type FactureDetailType } from '@/store';
import { Pen, Paperclip, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { api } from '@/lib/api';

// ─── Formatters ──────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtPrecise = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

// ─── Status configs ──────────────────────────────────────────────────────────

const INVOICE_STATUS_CFG: Record<InvoiceStatus, { label: string; color: string; bg: string; dot: string }> = {
  'PAYÉE':       { label: 'Payée',       color: 'text-emerald-700', bg: 'bg-emerald-100', dot: 'bg-emerald-500' },
  'EN ATTENTE':  { label: 'En attente',  color: 'text-blue-700',    bg: 'bg-blue-100',    dot: 'bg-blue-500' },
  'ACOMPTE':     { label: 'Acompte',     color: 'text-amber-700',   bg: 'bg-amber-100',   dot: 'bg-amber-500' },
  'AVOIR':       { label: 'Avoir',       color: 'text-purple-700',  bg: 'bg-purple-100',  dot: 'bg-purple-500' },
  'RETARD':      { label: 'Retard',      color: 'text-red-700',     bg: 'bg-red-100',     dot: 'bg-red-500' },
};

const DEVIS_STATUS_CFG: Record<DevisStatus, { label: string; color: string; bg: string }> = {
  'BROUILLON': { label: 'Brouillon', color: 'text-slate-600',   bg: 'bg-slate-100' },
  'ENVOYÉ':    { label: 'Envoyé',    color: 'text-blue-700',    bg: 'bg-blue-100' },
  'ACCEPTÉ':   { label: 'Accepté',  color: 'text-emerald-700', bg: 'bg-emerald-100' },
  'REFUSÉ':    { label: 'Refusé',   color: 'text-red-700',     bg: 'bg-red-100' },
  'EXPIRÉ':    { label: 'Expiré',   color: 'text-orange-700',  bg: 'bg-orange-100' },
};

// ─── Calculs lignes ──────────────────────────────────────────────────────────

function calcLignes(lignes: LigneDocument[]) {
  const totalHT = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaireHT * (1 - l.remise / 100), 0);
  const totalTVA = lignes.reduce((s, l) => {
    const ht = l.quantite * l.prixUnitaireHT * (1 - l.remise / 100);
    return s + ht * (l.tva / 100);
  }, 0);
  return { totalHT, totalTVA, totalTTC: totalHT + totalTVA };
}

// ─── LignesEditor ────────────────────────────────────────────────────────────

function LignesEditor({ lignes, onChange }: { lignes: LigneDocument[]; onChange: (l: LigneDocument[]) => void }) {
  const addLigne = () => onChange([...lignes, {
    id: 'l' + crypto.randomUUID().replace(/-/g, '').slice(0, 8),
    description: '', quantite: 1, unite: 'u', prixUnitaireHT: 0, tva: 20, remise: 0,
  }]);
  const updateLigne = (id: string, key: keyof LigneDocument, val: string | number) =>
    onChange(lignes.map(l => l.id === id ? { ...l, [key]: val } : l));
  const removeLigne = (id: string) => onChange(lignes.filter(l => l.id !== id));

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-[2fr_60px_80px_90px_60px_60px_32px] gap-1 px-2 text-[10px] font-semibold text-[#304035]/50 uppercase tracking-wider">
        <span>Description</span><span>Qté</span><span>Unité</span><span>PU HT</span><span>TVA</span><span>Remise</span><span></span>
      </div>
      {lignes.map(l => {
        const totalLigneHT = l.quantite * l.prixUnitaireHT * (1 - l.remise / 100);
        return (
          <div key={l.id} className="grid grid-cols-[2fr_60px_80px_90px_60px_60px_32px] gap-1 items-center">
            <input
              className="rounded-lg border border-[#304035]/10 px-2 py-1.5 text-xs text-[#304035] bg-[#304035]/2 focus:outline-none focus:border-[#304035]/30 w-full"
              placeholder="Description de la prestation..."
              value={l.description}
              onChange={e => updateLigne(l.id, 'description', e.target.value)}
            />
            <input
              type="number" min="0.01" step="0.01"
              className="rounded-lg border border-[#304035]/10 px-2 py-1.5 text-xs text-[#304035] text-right bg-[#304035]/2 focus:outline-none focus:border-[#304035]/30 w-full"
              value={l.quantite}
              onChange={e => updateLigne(l.id, 'quantite', parseFloat(e.target.value) || 0)}
            />
            <select
              className="rounded-lg border border-[#304035]/10 px-1 py-1.5 text-xs text-[#304035] bg-white focus:outline-none w-full"
              value={l.unite}
              onChange={e => updateLigne(l.id, 'unite', e.target.value)}
            >
              {['u', 'forfait', 'm²', 'ml', 'h', 'jour', 'lot'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <input
              type="number" min="0" step="0.01"
              className="rounded-lg border border-[#304035]/10 px-2 py-1.5 text-xs text-[#304035] text-right bg-[#304035]/2 focus:outline-none focus:border-[#304035]/30 w-full"
              value={l.prixUnitaireHT}
              onChange={e => updateLigne(l.id, 'prixUnitaireHT', parseFloat(e.target.value) || 0)}
            />
            <select
              className="rounded-lg border border-[#304035]/10 px-1 py-1.5 text-xs text-[#304035] bg-white focus:outline-none w-full"
              value={l.tva}
              onChange={e => updateLigne(l.id, 'tva', parseInt(e.target.value))}
            >
              {[0, 5.5, 10, 20].map(t => <option key={t} value={t}>{t}%</option>)}
            </select>
            <div className="relative">
              <input
                type="number" min="0" max="100"
                className="rounded-lg border border-[#304035]/10 px-2 py-1.5 text-xs text-[#304035] text-right bg-[#304035]/2 focus:outline-none focus:border-[#304035]/30 w-full pr-4"
                value={l.remise}
                onChange={e => updateLigne(l.id, 'remise', parseFloat(e.target.value) || 0)}
              />
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[#304035]/40">%</span>
            </div>
            <button onClick={() => removeLigne(l.id)} className="rounded-lg p-1 hover:bg-red-50 text-[#304035]/30 hover:text-red-500 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
      <button
        onClick={addLigne}
        className="flex items-center gap-1.5 text-xs text-[#304035]/60 hover:text-[#304035] px-2 py-1.5 rounded-lg hover:bg-[#304035]/5 transition-colors"
      >
        <PlusCircle className="h-3.5 w-3.5" /> Ajouter une ligne
      </button>
      {/* Totaux */}
      {lignes.length > 0 && (() => {
        const { totalHT, totalTVA, totalTTC } = calcLignes(lignes);
        return (
          <div className="mt-3 rounded-xl bg-[#304035]/4 p-3 space-y-1 text-xs">
            <div className="flex justify-between text-[#304035]/60">
              <span>Total HT</span><span className="font-medium">{fmtPrecise(totalHT)}</span>
            </div>
            <div className="flex justify-between text-[#304035]/60">
              <span>TVA</span><span className="font-medium">{fmtPrecise(totalTVA)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-[#304035] border-t border-[#304035]/10 pt-1 mt-1">
              <span>Total TTC</span><span>{fmtPrecise(totalTTC)}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Modal Devis ─────────────────────────────────────────────────────────────

function ModalDevis({ onClose, devisToEdit }: { onClose: () => void; devisToEdit?: Devis }) {
  const addDevis = useFacturationStore(s => s.addDevis);
  const updateDevis = useFacturationStore(s => s.updateDevis);
  const dossiers = useDossierStore(s => s.dossiers);
  const dossiersSignes = useDossierStore(s => s.dossiersSignes);
  const allDossiers = [...dossiers, ...dossiersSignes];

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

  const handleDossierChange = (id: string) => {
    const d = allDossiers.find(d => d.id === id);
    if (d) setForm(f => ({ ...f, dossierId: id, client: d.name + (d.firstName ? ' ' + d.firstName : ''), clientEmail: d.email ?? '' }));
    else setForm(f => ({ ...f, dossierId: id }));
  };

  const [submitError, setSubmitError] = React.useState('');

  const handleSubmit = () => {
    setSubmitError('');
    if (!form.client.trim()) { setSubmitError('Le nom du client est requis.'); return; }
    if (lignes.length === 0) { setSubmitError('Ajoutez au moins une ligne.'); return; }
    const emptyLine = lignes.find(l => !l.description.trim());
    if (emptyLine) { setSubmitError('Chaque ligne doit avoir une description.'); return; }
    const zeroLine = lignes.find(l => l.prixUnitaireHT <= 0 || l.quantite <= 0);
    if (zeroLine) { setSubmitError('Les lignes doivent avoir un prix et une quantité > 0.'); return; }
    const { totalHT, totalTTC } = calcLignes(lignes);
    if (devisToEdit) {
      updateDevis(devisToEdit.id, { ...form, lignes, totalHT: Math.round(totalHT), totalTTC: Math.round(totalTTC) });
    } else {
      addDevis({ ...form, lignes, statut: 'BROUILLON', dateCreation: new Date().toLocaleDateString('fr-FR'), totalHT: Math.round(totalHT), totalTTC: Math.round(totalTTC) });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#304035]/8 bg-[#304035]/2">
          <h2 className="font-bold text-[#304035] text-lg">{devisToEdit ? 'Modifier le devis' : 'Nouveau devis'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-[#304035]/10 transition-colors"><X className="h-4 w-4 text-[#304035]/60" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Client */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">Dossier lié (optionnel)</label>
              <select
                className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm text-[#304035] bg-white focus:outline-none focus:border-[#304035]/30"
                value={form.dossierId}
                onChange={e => handleDossierChange(e.target.value)}
              >
                <option value="">— Aucun dossier —</option>
                {allDossiers.map(d => <option key={d.id} value={d.id}>{d.name} {d.firstName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">Client *</label>
              <input
                className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm text-[#304035] focus:outline-none focus:border-[#304035]/30"
                placeholder="Nom du client"
                value={form.client}
                onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">Email client</label>
              <input
                type="email"
                className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm text-[#304035] focus:outline-none focus:border-[#304035]/30"
                placeholder="email@client.fr"
                value={form.clientEmail}
                onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">Adresse client</label>
              <input
                className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm text-[#304035] focus:outline-none focus:border-[#304035]/30"
                placeholder="12 rue de la Paix, 75001 Paris"
                value={form.clientAddress}
                onChange={e => setForm(f => ({ ...f, clientAddress: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">Validité jusqu'au</label>
              <input
                className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm text-[#304035] focus:outline-none focus:border-[#304035]/30"
                placeholder="JJ/MM/AAAA"
                value={form.dateValidite}
                onChange={e => setForm(f => ({ ...f, dateValidite: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">Conditions de paiement</label>
              <select
                className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm text-[#304035] bg-white focus:outline-none focus:border-[#304035]/30"
                value={form.conditionsPaiement}
                onChange={e => setForm(f => ({ ...f, conditionsPaiement: e.target.value }))}
              >
                <option>30% acompte, 70% solde</option>
                <option>30% acompte, 40% intermédiaire, 30% solde</option>
                <option>50% acompte, 50% solde</option>
                <option>40% acompte, 60% solde</option>
                <option>100% à la commande</option>
                <option>Paiement à 30 jours</option>
              </select>
            </div>
          </div>
          {/* Lignes */}
          <div>
            <label className="block text-xs font-semibold text-[#304035]/60 mb-3">Prestations / Articles</label>
            <LignesEditor lignes={lignes} onChange={setLignes} />
          </div>
          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">Notes / Mentions</label>
            <textarea
              rows={2}
              className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm text-[#304035] focus:outline-none focus:border-[#304035]/30 resize-none"
              placeholder="Conditions particulières, mentions légales..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 px-6 py-4 border-t border-[#304035]/8 bg-[#304035]/2">
          {submitError && <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{submitError}</p>}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-[#304035]/60 hover:bg-[#304035]/8 transition-colors">Annuler</button>
            <button
              onClick={handleSubmit}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-[#304035] text-white hover:bg-[#304035]/90 transition-colors"
            >
              {devisToEdit ? 'Enregistrer' : 'Créer le devis'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Facture ────────────────────────────────────────────────────────────

function ModalFacture({ onClose, devisSource }: { onClose: () => void; devisSource?: Devis }) {
  const addInvoiceDetail = useFacturationStore(s => s.addInvoiceDetail);
  const dossiers = useDossierStore(s => s.dossiers);
  const dossiersSignes = useDossierStore(s => s.dossiersSignes);
  const allDossiers = [...dossiers, ...dossiersSignes];

  const [form, setForm] = useState({
    client: devisSource?.client ?? '',
    clientEmail: devisSource?.clientEmail ?? '',
    clientAddress: devisSource?.clientAddress ?? '',
    dossierId: devisSource?.dossierId ?? '',
    type: 'Facture' as Invoice['type'],
    factureType: 'STANDARD' as FactureDetailType,
    date: new Date().toLocaleDateString('fr-FR'),
    dateEcheance: new Date(Date.now() + 30 * 86400000).toLocaleDateString('fr-FR'),
    conditionsPaiement: devisSource?.conditionsPaiement ?? 'Paiement à 30 jours',
    notes: '',
    tva: 20,
  });
  const [lignes, setLignes] = useState<LigneDocument[]>(devisSource?.lignes ? [...devisSource.lignes] : [
    { id: 'l1', description: '', quantite: 1, unite: 'forfait', prixUnitaireHT: 0, tva: 20, remise: 0 },
  ]);

  const FACTURE_TYPES: { value: Invoice['type']; label: string; desc: string }[] = [
    { value: 'Facture', label: 'Facture standard', desc: 'Facture solde complète' },
    { value: "Facture d'acompte", label: "Facture d'acompte", desc: '% perçu à la commande' },
    { value: 'Avoir', label: 'Avoir', desc: 'Annulation / remboursement' },
  ];

  const FACTURE_DETAIL_TYPES: { value: FactureDetailType; label: string }[] = [
    { value: 'STANDARD', label: 'Facture standard' },
    { value: 'ACOMPTE', label: 'Acompte (1ère échéance)' },
    { value: 'INTERMEDIAIRE', label: 'Intermédiaire (2ème échéance)' },
    { value: 'SOLDE', label: 'Solde (dernière échéance)' },
    { value: 'AVOIR', label: 'Avoir (remboursement)' },
  ];

  const [invSubmitError, setInvSubmitError] = React.useState('');

  const handleSubmit = () => {
    setInvSubmitError('');
    if (!form.client.trim()) { setInvSubmitError('Le nom du client est requis.'); return; }
    if (lignes.length === 0) { setInvSubmitError('Ajoutez au moins une ligne.'); return; }
    const emptyLine = lignes.find(l => !l.description.trim());
    if (emptyLine) { setInvSubmitError('Chaque ligne doit avoir une description.'); return; }
    const zeroLine = lignes.find(l => l.prixUnitaireHT <= 0 || l.quantite <= 0);
    if (zeroLine) { setInvSubmitError('Les lignes doivent avoir un prix et une quantité > 0.'); return; }
    addInvoiceDetail({
      ...form,
      statut: 'EN ATTENTE',
      lignes,
      devisId: devisSource?.id,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#304035]/8 bg-[#304035]/2">
          <h2 className="font-bold text-[#304035] text-lg">Nouvelle facture</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-[#304035]/10 transition-colors"><X className="h-4 w-4 text-[#304035]/60" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Type de facture */}
          <div>
            <label className="block text-xs font-semibold text-[#304035]/60 mb-2">Type de facture</label>
            <div className="flex gap-2 flex-wrap">
              {FACTURE_DETAIL_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setForm(f => ({ ...f, factureType: t.value, type: t.value === 'AVOIR' ? 'Avoir' : t.value === 'ACOMPTE' || t.value === 'INTERMEDIAIRE' ? "Facture d'acompte" : 'Facture' }))}
                  className={cn('px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                    form.factureType === t.value ? 'bg-[#304035] text-white border-[#304035]' : 'bg-white text-[#304035]/60 border-[#304035]/12 hover:border-[#304035]/30'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {/* Client */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">Dossier lié</label>
              <select
                className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#304035]/30"
                value={form.dossierId}
                onChange={e => {
                  const d = allDossiers.find(d => d.id === e.target.value);
                  setForm(f => ({ ...f, dossierId: e.target.value, client: d ? `${d.name}${d.firstName ? ' ' + d.firstName : ''}` : f.client }));
                }}
              >
                <option value="">— Aucun —</option>
                {allDossiers.map(d => <option key={d.id} value={d.id}>{d.name} {d.firstName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">Client *</label>
              <input className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm focus:outline-none focus:border-[#304035]/30" value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} placeholder="Nom du client" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">Date de facture</label>
              <input className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm focus:outline-none focus:border-[#304035]/30" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} placeholder="JJ/MM/AAAA" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">Date d'échéance</label>
              <input className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm focus:outline-none focus:border-[#304035]/30" value={form.dateEcheance} onChange={e => setForm(f => ({ ...f, dateEcheance: e.target.value }))} placeholder="JJ/MM/AAAA" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">Email client</label>
              <input type="email" className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm focus:outline-none focus:border-[#304035]/30" value={form.clientEmail} onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))} placeholder="email@client.fr" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">Conditions de paiement</label>
              <select className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm bg-white focus:outline-none" value={form.conditionsPaiement} onChange={e => setForm(f => ({ ...f, conditionsPaiement: e.target.value }))}>
                <option>Paiement à réception</option>
                <option>Paiement à 30 jours</option>
                <option>Paiement à 45 jours</option>
                <option>Paiement à 60 jours</option>
                <option>30% acompte, 70% solde</option>
                <option>50% acompte, 50% solde</option>
              </select>
            </div>
          </div>
          {/* Lignes */}
          <div>
            <label className="block text-xs font-semibold text-[#304035]/60 mb-3">Prestations / Articles</label>
            <LignesEditor lignes={lignes} onChange={setLignes} />
          </div>
          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">Notes internes</label>
            <textarea rows={2} className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm focus:outline-none resize-none" placeholder="Notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <div className="flex flex-col gap-2 px-6 py-4 border-t border-[#304035]/8 bg-[#304035]/2">
          {invSubmitError && <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{invSubmitError}</p>}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-[#304035]/60 hover:bg-[#304035]/8 transition-colors">Annuler</button>
            <button onClick={handleSubmit} className="px-5 py-2 rounded-xl text-sm font-bold bg-[#304035] text-white hover:bg-[#304035]/90 transition-colors">
              Créer la facture
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Convertir Devis ────────────────────────────────────────────────────

function ModalConvertir({ devis, onClose }: { devis: Devis; onClose: () => void }) {
  const convertDevisToFacture = useFacturationStore(s => s.convertDevisToFacture);
  const updateDevisStatut = useFacturationStore(s => s.updateDevisStatut);
  const [factureType, setFactureType] = useState<FactureDetailType>('ACOMPTE');
  const [pourcentage, setPourcentage] = useState(30);

  const montant = Math.round(devis.totalHT * pourcentage / 100);
  const ttc = Math.round(devis.totalTTC * pourcentage / 100);

  const handleConvert = () => {
    convertDevisToFacture(devis.id, factureType, pourcentage);
    if (factureType === 'ACOMPTE') updateDevisStatut(devis.id, 'ACCEPTÉ');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#304035]/8">
          <h2 className="font-bold text-[#304035]">Convertir en facture</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-[#304035]/10"><X className="h-4 w-4 text-[#304035]/60" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-xl bg-[#304035]/4 p-3 text-sm">
            <p className="font-semibold text-[#304035]">{devis.ref} — {devis.client}</p>
            <p className="text-xs text-[#304035]/60 mt-0.5">Total devis : {fmt(devis.totalTTC)} TTC ({fmt(devis.totalHT)} HT)</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#304035]/60 mb-2">Type de facture à créer</label>
            <div className="grid grid-cols-2 gap-2">
              {([['ACOMPTE', 'Acompte'], ['INTERMEDIAIRE', 'Intermédiaire'], ['SOLDE', 'Solde'], ['STANDARD', 'Facture complète']] as [FactureDetailType, string][]).map(([v, l]) => (
                <button key={v} onClick={() => { setFactureType(v); if (v === 'SOLDE') setPourcentage(30); if (v === 'ACOMPTE') setPourcentage(30); if (v === 'INTERMEDIAIRE') setPourcentage(40); if (v === 'STANDARD') setPourcentage(100); }}
                  className={cn('px-3 py-2 rounded-xl text-xs font-medium border transition-all', factureType === v ? 'bg-[#304035] text-white border-[#304035]' : 'bg-white text-[#304035]/60 border-[#304035]/12 hover:border-[#304035]/30')}
                >{l}</button>
              ))}
            </div>
          </div>
          {factureType !== 'STANDARD' && (
            <div>
              <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">Pourcentage à facturer : {pourcentage}%</label>
              <input type="range" min="5" max="100" step="5" value={pourcentage} onChange={e => setPourcentage(parseInt(e.target.value))} className="w-full" />
              <div className="flex justify-between text-xs text-[#304035]/40 mt-1">
                <span>5%</span><span>100%</span>
              </div>
            </div>
          )}
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
            <p className="text-xs text-emerald-700 font-semibold">Facture à créer</p>
            <p className="text-lg font-bold text-emerald-800 mt-0.5">{fmt(ttc)} TTC</p>
            <p className="text-xs text-emerald-600">{fmt(montant)} HT · {pourcentage}% du devis</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#304035]/8">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-[#304035]/60 hover:bg-[#304035]/8 transition-colors">Annuler</button>
          <button onClick={handleConvert} className="px-5 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
            Créer la facture
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Génération PDF HTML ─────────────────────────────────────────────────────

function generateInvoiceHTML(inv: InvoiceDetail, societe: ReturnType<typeof useConfigStore.getState>['societe']): string {
  const lignes = inv.lignes ?? [];
  const { totalHT, totalTVA, totalTTC } = calcLignes(lignes);
  const isAvoir = inv.type === 'Avoir';

  const lignesHTML = lignes.map(l => {
    const ht = l.quantite * l.prixUnitaireHT * (1 - l.remise / 100);
    return `<tr>
      <td style="padding:8px 12px;font-size:12px;color:#304035;border-bottom:1px solid #f0ebe6">${l.description}</td>
      <td style="padding:8px 12px;font-size:12px;text-align:center;color:#304035;border-bottom:1px solid #f0ebe6">${l.quantite} ${l.unite}</td>
      <td style="padding:8px 12px;font-size:12px;text-align:right;color:#304035;border-bottom:1px solid #f0ebe6">${fmtPrecise(l.prixUnitaireHT)}</td>
      <td style="padding:8px 12px;font-size:12px;text-align:center;color:#304035;border-bottom:1px solid #f0ebe6">${l.tva}%</td>
      ${l.remise > 0 ? `<td style="padding:8px 12px;font-size:12px;text-align:center;color:#e67e22;border-bottom:1px solid #f0ebe6">-${l.remise}%</td>` : '<td style="padding:8px 12px;font-size:12px;text-align:center;color:#304035;border-bottom:1px solid #f0ebe6">—</td>'}
      <td style="padding:8px 12px;font-size:12px;text-align:right;font-weight:600;color:#304035;border-bottom:1px solid #f0ebe6">${fmtPrecise(ht)}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>${inv.ref}</title>
</head>
<body>
<div style="max-width:800px;margin:0 auto">
  <!-- HEADER -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:24px;border-bottom:3px solid #304035">
    <div>
      <div style="font-size:28px;font-weight:900;color:#304035;letter-spacing:-1px">AVRA</div>
      <div style="font-size:11px;color:#304035;opacity:0.5;margin-top:2px">Design & Agencement</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:22px;font-weight:800;color:${isAvoir ? '#9b59b6' : '#304035'}">${inv.type.toUpperCase()}</div>
      <div style="font-size:16px;font-weight:700;color:#304035;margin-top:4px">${inv.ref}</div>
      <div style="font-size:11px;color:#304035;opacity:0.5;margin-top:2px">Date : ${inv.date}</div>
      ${inv.dateEcheance ? `<div style="font-size:11px;color:#e67e22;margin-top:1px">Échéance : ${inv.dateEcheance}</div>` : ''}
    </div>
  </div>

  <!-- EMETTEUR / CLIENT -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:36px">
    <div style="background:#f8f5f0;border-radius:12px;padding:16px">
      <div style="font-size:10px;font-weight:700;color:#304035;opacity:0.4;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Émetteur</div>
      <div style="font-size:13px;font-weight:700;color:#304035">${societe.nom}</div>
      <div style="font-size:11px;color:#304035;opacity:0.7;margin-top:4px;line-height:1.6">
        ${societe.adresse}<br/>
        ${societe.codePostal} ${societe.ville}<br/>
        SIRET : ${societe.siret}<br/>
        TVA : ${societe.tva}<br/>
        ${societe.phone} · ${societe.email}
      </div>
    </div>
    <div style="background:#f8f5f0;border-radius:12px;padding:16px">
      <div style="font-size:10px;font-weight:700;color:#304035;opacity:0.4;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Client</div>
      <div style="font-size:13px;font-weight:700;color:#304035">${inv.client}</div>
      <div style="font-size:11px;color:#304035;opacity:0.7;margin-top:4px;line-height:1.6">
        ${inv.clientAddress ? inv.clientAddress + '<br/>' : ''}
        ${inv.clientEmail ? inv.clientEmail : ''}
      </div>
    </div>
  </div>

  <!-- TABLEAU LIGNES -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    <thead>
      <tr style="background:#304035">
        <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:white;text-transform:uppercase;letter-spacing:0.5px">Description</th>
        <th style="padding:10px 12px;text-align:center;font-size:10px;font-weight:700;color:white;text-transform:uppercase">Qté</th>
        <th style="padding:10px 12px;text-align:right;font-size:10px;font-weight:700;color:white;text-transform:uppercase">PU HT</th>
        <th style="padding:10px 12px;text-align:center;font-size:10px;font-weight:700;color:white;text-transform:uppercase">TVA</th>
        <th style="padding:10px 12px;text-align:center;font-size:10px;font-weight:700;color:white;text-transform:uppercase">Remise</th>
        <th style="padding:10px 12px;text-align:right;font-size:10px;font-weight:700;color:white;text-transform:uppercase">Total HT</th>
      </tr>
    </thead>
    <tbody>${lignesHTML}</tbody>
  </table>

  <!-- TOTAUX -->
  <div style="display:flex;justify-content:flex-end;margin-bottom:32px">
    <div style="width:280px">
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;color:#304035;opacity:0.7">
        <span>Total HT</span><span>${fmtPrecise(totalHT)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;color:#304035;opacity:0.7">
        <span>TVA</span><span>${fmtPrecise(totalTVA)}</span>
      </div>
      ${inv.montantDeja ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;color:#e67e22">
        <span>Acomptes versés</span><span>- ${fmtPrecise(inv.montantDeja)}</span>
      </div>` : ''}
      <div style="display:flex;justify-content:space-between;padding:10px 12px;font-size:15px;font-weight:800;color:white;background:#304035;border-radius:8px;margin-top:8px">
        <span>NET À PAYER TTC</span><span>${fmtPrecise(isAvoir ? -totalTTC : totalTTC - (inv.montantDeja ?? 0))}</span>
      </div>
    </div>
  </div>

  <!-- MENTIONS -->
  <div style="border-top:1px solid #e8e0d6;padding-top:16px">
    ${inv.conditionsPaiement ? `<p style="font-size:10px;color:#304035;opacity:0.6;margin-bottom:4px">Conditions : ${inv.conditionsPaiement}</p>` : ''}
    <p style="font-size:9px;color:#304035;opacity:0.5;line-height:1.5">
      En cas de retard de paiement, des pénalités de retard seront appliquées au taux de 3 fois le taux d'intérêt légal.
      Une indemnité forfaitaire de recouvrement de 40 € sera due (art. L441-6 C.com).
      ${inv.notes ? `<br/>${inv.notes}` : ''}
    </p>
  </div>
</div>
<script class="no-print">
  window.onload = () => window.print();
</script>
</body>
</html>`;
}

function generateDevisHTML(devis: Devis, societe: ReturnType<typeof useConfigStore.getState>['societe']): string {
  const { totalHT, totalTVA, totalTTC } = calcLignes(devis.lignes);
  const lignesHTML = devis.lignes.map(l => {
    const ht = l.quantite * l.prixUnitaireHT * (1 - l.remise / 100);
    return `<tr>
      <td style="padding:8px 12px;font-size:12px;color:#304035;border-bottom:1px solid #f0ebe6">${l.description}</td>
      <td style="padding:8px 12px;font-size:12px;text-align:center;color:#304035;border-bottom:1px solid #f0ebe6">${l.quantite} ${l.unite}</td>
      <td style="padding:8px 12px;font-size:12px;text-align:right;color:#304035;border-bottom:1px solid #f0ebe6">${fmtPrecise(l.prixUnitaireHT)}</td>
      <td style="padding:8px 12px;font-size:12px;text-align:center;color:#304035;border-bottom:1px solid #f0ebe6">${l.tva}%</td>
      <td style="padding:8px 12px;font-size:12px;text-align:right;font-weight:600;color:#304035;border-bottom:1px solid #f0ebe6">${fmtPrecise(ht)}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/><title>${devis.ref}</title>
</head><body>
<div style="max-width:800px;margin:0 auto">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:24px;border-bottom:3px solid #a67749">
    <div><div style="font-size:28px;font-weight:900;color:#304035;letter-spacing:-1px">AVRA</div><div style="font-size:11px;color:#304035;opacity:0.5">Design & Agencement</div></div>
    <div style="text-align:right">
      <div style="font-size:22px;font-weight:800;color:#a67749">DEVIS</div>
      <div style="font-size:16px;font-weight:700;color:#304035;margin-top:4px">${devis.ref}</div>
      <div style="font-size:11px;color:#304035;opacity:0.5">Créé le ${devis.dateCreation} · Valable jusqu'au ${devis.dateValidite}</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:36px">
    <div style="background:#f8f5f0;border-radius:12px;padding:16px">
      <div style="font-size:10px;font-weight:700;color:#304035;opacity:0.4;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Émetteur</div>
      <div style="font-size:13px;font-weight:700">${societe.nom}</div>
      <div style="font-size:11px;color:#304035;opacity:0.7;margin-top:4px;line-height:1.6">${societe.adresse}<br/>${societe.codePostal} ${societe.ville}<br/>SIRET : ${societe.siret}</div>
    </div>
    <div style="background:#f8f5f0;border-radius:12px;padding:16px">
      <div style="font-size:10px;font-weight:700;color:#304035;opacity:0.4;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Client</div>
      <div style="font-size:13px;font-weight:700">${devis.client}</div>
      <div style="font-size:11px;color:#304035;opacity:0.7;margin-top:4px;line-height:1.6">${devis.clientAddress ?? ''}<br/>${devis.clientEmail ?? ''}</div>
    </div>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    <thead><tr style="background:#a67749">
      <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:white;text-transform:uppercase">Description</th>
      <th style="padding:10px 12px;text-align:center;font-size:10px;font-weight:700;color:white;text-transform:uppercase">Qté</th>
      <th style="padding:10px 12px;text-align:right;font-size:10px;font-weight:700;color:white;text-transform:uppercase">PU HT</th>
      <th style="padding:10px 12px;text-align:center;font-size:10px;font-weight:700;color:white;text-transform:uppercase">TVA</th>
      <th style="padding:10px 12px;text-align:right;font-size:10px;font-weight:700;color:white;text-transform:uppercase">Total HT</th>
    </tr></thead>
    <tbody>${lignesHTML}</tbody>
  </table>
  <div style="display:flex;justify-content:flex-end;margin-bottom:32px">
    <div style="width:280px">
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;opacity:0.7"><span>Total HT</span><span>${fmtPrecise(totalHT)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;opacity:0.7"><span>TVA</span><span>${fmtPrecise(totalTVA)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:10px 12px;font-size:15px;font-weight:800;color:white;background:#a67749;border-radius:8px;margin-top:8px"><span>TOTAL TTC</span><span>${fmtPrecise(totalTTC)}</span></div>
    </div>
  </div>
  <div style="border-top:1px solid #e8e0d6;padding-top:16px">
    ${devis.conditionsPaiement ? `<p style="font-size:11px;margin-bottom:8px;font-weight:600">Conditions : ${devis.conditionsPaiement}</p>` : ''}
    <p style="font-size:9px;opacity:0.5;line-height:1.5">Ce devis est valable jusqu'au ${devis.dateValidite}. Pour l'accepter, veuillez le signer et nous le retourner. ${devis.notes ?? ''}</p>
  </div>
</div>
<script class="no-print">window.onload=()=>window.print();</script>
</body></html>`;
}

function openPDF(html: string, filename: string) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

// ─── Modal Signature Électronique ────────────────────────────────────────────

function ModalSignature({ devis, onClose }: { devis: Devis; onClose: () => void }) {
  const sendDevisForSignature = useFacturationStore(s => s.sendDevisForSignature);
  const markDevisSigned = useFacturationStore(s => s.markDevisSigned);
  const [email, setEmail] = useState(devis.clientEmail ?? '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState(devis.client ?? '');
  const [message, setMessage] = useState(`Bonjour,\n\nVeuillez trouver ci-joint votre devis ${devis.ref} d'un montant de ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(devis.totalTTC)} TTC.\n\nMerci de bien vouloir nous retourner votre accord pour validation.\n\nCordialement,\nL'équipe AVRA`);
  const [piecesJointes, setPiecesJointes] = useState<string[]>([]);
  const [newPiece, setNewPiece] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alreadySentForSign = devis.signatureStatus === 'EN_ATTENTE_SIGNATURE';

  const handleSend = async () => {
    if (!email.trim()) return;
    if (!firstName.trim() || !lastName.trim()) {
      setError('Veuillez saisir le prénom et le nom du client');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api('/signature', {
        method: 'POST',
        body: JSON.stringify({
          projectId: devis.dossierId || devis.id,
          documentTitle: devis.objet || `Devis ${devis.ref}`,
          signerEmail: email,
          signerFirstName: firstName,
          signerLastName: lastName,
          message,
        }),
      });
      sendDevisForSignature(devis.id, email, piecesJointes);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkSigned = () => {
    markDevisSigned(devis.id);
    onClose();
  };

  const addPiece = () => {
    if (newPiece.trim()) {
      setPiecesJointes(p => [...p, newPiece.trim()]);
      setNewPiece('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#304035]/8 bg-gradient-to-r from-[#304035]/5 to-violet-50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-violet-100 flex items-center justify-center">
              <Pen className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <h2 className="font-bold text-[#304035] text-base">Signature électronique</h2>
              <p className="text-xs text-[#304035]/50">{devis.ref} · {devis.client}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-[#304035]/10 transition-colors">
            <X className="h-4 w-4 text-[#304035]/60" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Statut si déjà envoyé */}
          {alreadySentForSign && !sent && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-3">
              <Clock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-700">En attente de signature</p>
                <p className="text-xs text-amber-600 mt-0.5">Envoyé à {devis.signatureEmail} — Vous pouvez renvoyer ou marquer comme signé.</p>
              </div>
            </div>
          )}

          {sent && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-700">Demande envoyée via YouSign !</p>
                <p className="text-xs text-emerald-600 mt-0.5">Le client recevra un email pour signer. Vous serez notifié dès qu'il signera.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Résumé devis */}
          <div className="rounded-xl bg-[#304035]/3 border border-[#304035]/8 px-4 py-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-[#304035]/60">Montant TTC</p>
                <p className="text-xl font-bold text-[#304035]">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(devis.totalTTC)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-[#304035]/60">Valide jusqu'au</p>
                <p className="text-sm font-bold text-[#304035]">{devis.dateValidite}</p>
              </div>
            </div>
          </div>

          {/* Prénom et Nom du client */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">Prénom du client *</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Jean"
                className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm text-[#304035] focus:outline-none focus:border-violet-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">Nom du client *</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Dupont"
                className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm text-[#304035] focus:outline-none focus:border-violet-400"
              />
            </div>
          </div>

          {/* Email client */}
          <div>
            <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">Email du client *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="client@email.fr"
              className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm text-[#304035] focus:outline-none focus:border-violet-400"
            />
          </div>

          {/* Pièces jointes */}
          <div>
            <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">
              <Paperclip className="h-3 w-3 inline mr-1" />
              Pièces jointes (plans, perspectives…)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPiece}
                onChange={e => setNewPiece(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPiece()}
                placeholder="Ex : Plan_Salon_V2.pdf, Vue3D_cuisine.jpg…"
                className="flex-1 rounded-xl border border-[#304035]/12 px-3 py-2 text-sm text-[#304035] focus:outline-none focus:border-violet-400"
              />
              <button onClick={addPiece}
                className="px-3 py-2 rounded-xl bg-violet-100 hover:bg-violet-200 text-violet-700 text-xs font-bold transition-colors">
                + Ajouter
              </button>
            </div>
            {piecesJointes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {piecesJointes.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs bg-violet-50 border border-violet-200 rounded-lg px-2 py-1 text-violet-700">
                    <Paperclip className="h-3 w-3" /> {p}
                    <button onClick={() => setPiecesJointes(prev => prev.filter((_, j) => j !== i))} className="hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">Message d'accompagnement</label>
            <textarea
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm text-[#304035] focus:outline-none focus:border-violet-400 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#304035]/8 bg-[#304035]/2 gap-3">
          <button
            onClick={handleMarkSigned}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            <Check className="h-4 w-4" /> Marquer comme signé
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-[#304035]/60 hover:bg-[#304035]/8 transition-colors">
              Fermer
            </button>
            <button
              onClick={handleSend}
              disabled={!email.trim() || !firstName.trim() || !lastName.trim() || loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-40"
            >
              <Send className="h-4 w-4" /> {loading ? 'Envoi...' : 'Envoyer pour signature'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Onglet DEVIS ────────────────────────────────────────────────────────────

function OngletDevis() {
  const devis = useFacturationStore(s => s.devis);
  const societe = useConfigStore(s => s.societe);
  const updateDevisStatut = useFacturationStore(s => s.updateDevisStatut);
  const deleteDevis = useFacturationStore(s => s.deleteDevis);
  const [modalOpen, setModalOpen] = useState(false);
  const [editDevis, setEditDevis] = useState<Devis | undefined>();
  const [convertDevis, setConvertDevis] = useState<Devis | undefined>();
  const [signatureDevis, setSignatureDevis] = useState<Devis | undefined>();
  const [filterStatut, setFilterStatut] = useState<DevisStatus | 'TOUS'>('TOUS');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = filterStatut === 'TOUS' ? devis : devis.filter(d => d.statut === filterStatut);
  const totalDevisEnCours = devis.filter(d => d.statut === 'ENVOYÉ').reduce((s, d) => s + d.totalTTC, 0);
  const totalAcceptes = devis.filter(d => d.statut === 'ACCEPTÉ').reduce((s, d) => s + d.totalTTC, 0);
  const tauxTransfo = devis.length > 0 ? Math.round(devis.filter(d => d.statut === 'ACCEPTÉ').length / devis.length * 100) : 0;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-[#304035]/8 p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-[#304035]/50 uppercase tracking-wider">En cours (envoyés)</p>
          <p className="text-2xl font-bold text-[#304035] mt-1">{fmt(totalDevisEnCours)}</p>
          <p className="text-xs text-[#304035]/40 mt-1">{devis.filter(d => d.statut === 'ENVOYÉ').length} devis en attente</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
          <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Signés (acceptés)</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{fmt(totalAcceptes)}</p>
          <p className="text-xs text-emerald-600/70 mt-1">{devis.filter(d => d.statut === 'ACCEPTÉ').length} devis acceptés</p>
        </div>
        <div className="rounded-2xl bg-violet-50 border border-violet-200 p-4">
          <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider">Taux de transformation</p>
          <p className="text-2xl font-bold text-violet-700 mt-1">{tauxTransfo}%</p>
          <p className="text-xs text-violet-600/70 mt-1">{devis.length} devis total</p>
        </div>
      </div>

      {/* Filtres + bouton */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {(['TOUS', 'BROUILLON', 'ENVOYÉ', 'ACCEPTÉ', 'REFUSÉ', 'EXPIRÉ'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatut(s)}
              className={cn('rounded-full px-3 py-1 text-xs font-semibold transition-all',
                filterStatut === s ? 'bg-[#304035] text-white' : 'bg-white border border-[#304035]/15 text-[#304035]/60 hover:border-[#304035]/30'
              )}>
              {s === 'TOUS' ? `Tous (${devis.length})` : `${s} (${devis.filter(d => d.statut === s).length})`}
            </button>
          ))}
        </div>
        <button onClick={() => { setEditDevis(undefined); setModalOpen(true); }}
          className="flex items-center gap-2 rounded-xl px-4 py-2 bg-[#a67749] text-white text-sm font-bold hover:bg-[#a67749]/90 transition-colors shadow-sm">
          <Plus className="h-4 w-4" /> Nouveau devis
        </button>
      </div>

      {/* Liste */}
      <div className="rounded-2xl bg-white shadow-sm border border-[#304035]/8 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center"><FileText className="h-12 w-12 text-[#304035]/10 mx-auto mb-3" /><p className="text-sm text-[#304035]/40">Aucun devis</p></div>
        ) : (
          <div className="divide-y divide-[#304035]/5">
            {filtered.map(d => {
              const cfg = DEVIS_STATUS_CFG[d.statut];
              return (
                <div key={d.id} className="flex items-center justify-between px-5 py-4 hover:bg-[#f5eee8]/30 transition-all group"
                  onMouseEnter={() => setHoveredId(d.id)} onMouseLeave={() => setHoveredId(null)}>
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-[#a67749]/10 flex items-center justify-center shrink-0">
                      <FileCheck className="h-5 w-5 text-[#a67749]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-[#304035] text-sm">{d.ref}</p>
                        <span className={cn('inline-block px-2 py-0.5 text-[10px] font-bold rounded-full', cfg.bg, cfg.color)}>{cfg.label}</span>
                      </div>
                      <p className="text-xs text-[#304035]/50 mt-0.5">{d.client} · Créé le {d.dateCreation} · Valide jusqu'au {d.dateValidite}</p>
                      {d.conditionsPaiement && <p className="text-[10px] text-[#304035]/35 mt-0.5">{d.conditionsPaiement}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-[#304035]">{fmt(d.totalTTC)}</p>
                      <p className="text-[10px] text-[#304035]/40">{fmt(d.totalHT)} HT</p>
                    </div>
                    {/* Bouton Envoyer pour signature (BROUILLON ou ENVOYÉ non signé) */}
                    {(d.statut === 'BROUILLON' || (d.statut === 'ENVOYÉ' && !d.signatureStatus)) && (
                      <button onClick={() => setSignatureDevis(d)}
                        className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors shadow-sm whitespace-nowrap">
                        <Pen className="h-3.5 w-3.5" />
                        Signature
                      </button>
                    )}
                    {/* Badge signature en attente */}
                    {d.signatureStatus === 'EN_ATTENTE_SIGNATURE' && (
                      <button onClick={() => setSignatureDevis(d)}
                        className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-semibold transition-colors shadow-sm whitespace-nowrap border border-amber-300">
                        <Clock className="h-3.5 w-3.5" />
                        En attente signature
                      </button>
                    )}
                    {/* Badge signé */}
                    {d.signatureStatus === 'SIGNÉ' && (
                      <span className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 whitespace-nowrap">
                        <Check className="h-3.5 w-3.5" />
                        Signé le {d.signatureDate}
                      </span>
                    )}
                    {/* Bouton Accepter manuel visible pour ENVOYÉ (sans signature élec.) */}
                    {d.statut === 'ENVOYÉ' && !d.signatureStatus && (
                      <button onClick={() => updateDevisStatut(d.id, 'ACCEPTÉ')}
                        className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-sm whitespace-nowrap">
                        <Check className="h-3.5 w-3.5" />
                        Accepter
                      </button>
                    )}
                    {/* Bouton convertir toujours visible pour tous les devis sauf REFUSÉ/EXPIRÉ */}
                    {d.statut !== 'REFUSÉ' && d.statut !== 'EXPIRÉ' && (
                      <button onClick={() => setConvertDevis(d)}
                        className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-sm whitespace-nowrap">
                        <ArrowRight className="h-3.5 w-3.5" />
                        Créer facture
                      </button>
                    )}
                    {/* Actions secondaires au hover */}
                    <div className={cn('flex items-center gap-1 transition-all duration-150', hoveredId === d.id ? 'opacity-100' : 'opacity-0')}>
                      <button onClick={() => openPDF(generateDevisHTML(d, societe), d.ref)} title="Télécharger PDF"
                        className="rounded-lg p-1.5 bg-[#304035]/5 hover:bg-[#304035]/10 text-[#304035]/60 hover:text-[#304035] transition-colors">
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      {(d.statut === 'BROUILLON' || d.statut === 'ENVOYÉ') && (
                        <button onClick={() => { setEditDevis(d); setModalOpen(true); }} title="Modifier"
                          className="rounded-lg p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 transition-colors">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => deleteDevis(d.id)} title="Supprimer"
                        className="rounded-lg p-1.5 bg-red-50 hover:bg-red-100 text-red-400 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && <ModalDevis onClose={() => { setModalOpen(false); setEditDevis(undefined); }} devisToEdit={editDevis} />}
      {convertDevis && <ModalConvertir devis={convertDevis} onClose={() => setConvertDevis(undefined)} />}
      {signatureDevis && <ModalSignature devis={signatureDevis} onClose={() => setSignatureDevis(undefined)} />}
    </div>
  );
}

// ─── Onglet FACTURES ──────────────────────────────────────────────────────────

function OngletFactures() {
  const invoices = useFacturationStore(s => s.invoices);
  const invoiceDetails = useFacturationStore(s => s.invoiceDetails);
  const societe = useConfigStore(s => s.societe);
  const updateInvoiceStatus = useFacturationStore(s => s.updateInvoiceStatus);
  const deleteInvoice = useFacturationStore(s => s.deleteInvoice);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterStatut, setFilterStatut] = useState<InvoiceStatus | 'TOUTES'>('TOUTES');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = filterStatut === 'TOUTES' ? invoices : invoices.filter(i => i.statut === filterStatut);

  const totalHT = invoices.reduce((s, i) => s + (i.montantHT > 0 ? i.montantHT : 0), 0);
  const totalTTC = invoices.reduce((s, i) => s + (i.montantHT > 0 ? i.montantHT * (1 + i.tva / 100) : 0), 0);
  const totalPaye = invoices.filter(i => i.statut === 'PAYÉE').reduce((s, i) => s + i.montantHT * (1 + i.tva / 100), 0);
  const totalRetard = invoices.filter(i => i.statut === 'RETARD').reduce((s, i) => s + Math.abs(i.montantHT * (1 + i.tva / 100)), 0);
  const totalAttente = invoices.filter(i => i.statut === 'EN ATTENTE').reduce((s, i) => s + i.montantHT * (1 + i.tva / 100), 0);

  const NEXT_STATUS: Record<InvoiceStatus, InvoiceStatus | null> = {
    'EN ATTENTE': 'PAYÉE', 'ACOMPTE': 'PAYÉE', 'RETARD': 'PAYÉE', 'PAYÉE': null, 'AVOIR': null,
  };

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-[#304035]/8 p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-[#304035]/50 uppercase tracking-wider mb-1">CA HT</p>
          <p className="text-xl font-bold text-[#304035]">{fmt(totalHT)}</p>
        </div>
        <div className="rounded-2xl bg-white border border-[#304035]/8 p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-[#304035]/50 uppercase tracking-wider mb-1">CA TTC</p>
          <p className="text-xl font-bold text-[#304035]">{fmt(totalTTC)}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
          <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">Encaissé</p>
          <p className="text-xl font-bold text-emerald-700">{fmt(totalPaye)}</p>
        </div>
        <div className={cn('rounded-2xl border p-4', totalRetard > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-[#304035]/8')}>
          <p className={cn('text-[10px] font-semibold uppercase tracking-wider mb-1', totalRetard > 0 ? 'text-red-600' : 'text-[#304035]/50')}>En retard</p>
          <p className={cn('text-xl font-bold', totalRetard > 0 ? 'text-red-700' : 'text-[#304035]')}>{fmt(totalRetard)}</p>
        </div>
      </div>

      {/* Filtres + bouton */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {(['TOUTES', 'PAYÉE', 'EN ATTENTE', 'ACOMPTE', 'RETARD', 'AVOIR'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatut(s)}
              className={cn('rounded-full px-3 py-1 text-xs font-semibold transition-all',
                filterStatut === s ? 'bg-[#304035] text-white' : 'bg-white border border-[#304035]/15 text-[#304035]/60 hover:border-[#304035]/30'
              )}>
              {s === 'TOUTES' ? `Toutes (${invoices.length})` : `${s} (${invoices.filter(i => i.statut === s).length})`}
            </button>
          ))}
        </div>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2 bg-[#304035] text-white text-sm font-bold hover:bg-[#304035]/90 transition-colors shadow-sm">
          <Plus className="h-4 w-4" /> Nouvelle facture
        </button>
      </div>

      {/* Liste */}
      <div className="rounded-2xl bg-white shadow-sm border border-[#304035]/8 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center"><FileText className="h-12 w-12 text-[#304035]/10 mx-auto mb-3" /><p className="text-sm text-[#304035]/40">Aucune facture</p></div>
        ) : (
          <div className="divide-y divide-[#304035]/5">
            {filtered.map(inv => {
              const ttc = inv.montantHT * (1 + inv.tva / 100);
              const cfg = INVOICE_STATUS_CFG[inv.statut];
              const next = NEXT_STATUS[inv.statut];
              const detail = invoiceDetails[inv.id];
              const hasDetail = !!detail?.lignes?.length;
              return (
                <div key={inv.id} className="flex items-center justify-between px-5 py-4 hover:bg-[#f5eee8]/30 transition-all group"
                  onMouseEnter={() => setHoveredId(inv.id)} onMouseLeave={() => setHoveredId(null)}>
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', cfg.bg)}>
                      <FileText className={cn('h-5 w-5', cfg.color)} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-[#304035] text-sm">{inv.ref}</p>
                        <span className={cn('inline-block px-2 py-0.5 text-[10px] font-bold rounded-full', cfg.bg, cfg.color)}>{cfg.label}</span>
                        {detail?.factureType && detail.factureType !== 'STANDARD' && (
                          <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600">{detail.factureType}</span>
                        )}
                      </div>
                      <p className="text-xs text-[#304035]/50 mt-0.5">{inv.client} · {inv.type} · {inv.date}</p>
                      {detail?.dateEcheance && (() => {
                        const raw = detail.dateEcheance;
                        // Accepte formats ISO (2026-04-26) et FR (26/04/2026)
                        const echeance = raw.includes('/')
                          ? new Date(raw.split('/').reverse().join('-'))
                          : new Date(raw);
                        if (isNaN(echeance.getTime())) return null;
                        const today = new Date(); today.setHours(0,0,0,0);
                        const isLate = echeance < today && inv.statut !== 'PAYÉE';
                        return <p className={cn('text-[10px] mt-0.5', isLate ? 'text-red-500 font-semibold' : 'text-[#304035]/40')}>
                          {isLate ? '⚠ Échéance dépassée : ' : 'Échéance : '}{echeance.toLocaleDateString('fr-FR')}
                        </p>;
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-[#304035]">{fmt(ttc)}</p>
                      <p className="text-[10px] text-[#304035]/40">TVA {inv.tva}%</p>
                    </div>
                    {/* Bouton Marquer payée toujours visible */}
                    {next === 'PAYÉE' && (
                      <button onClick={() => updateInvoiceStatus(inv.id, 'PAYÉE')}
                        className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-sm whitespace-nowrap">
                        <Check className="h-3.5 w-3.5" />
                        Payée
                      </button>
                    )}
                    {/* Actions secondaires au hover */}
                    <div className={cn('flex items-center gap-1 transition-all duration-150', hoveredId === inv.id ? 'opacity-100' : 'opacity-0')}>
                      {(hasDetail || inv.montantHT > 0) && (
                        <button
                          onClick={() => {
                            const d = detail ?? { ...inv, lignes: [{ id: 'l1', description: inv.type, quantite: 1, unite: 'forfait', prixUnitaireHT: inv.montantHT, tva: inv.tva, remise: 0 }] };
                            openPDF(generateInvoiceHTML(d as InvoiceDetail, societe), inv.ref);
                          }}
                          title="Télécharger PDF"
                          className="rounded-lg p-1.5 bg-[#304035]/5 hover:bg-[#304035]/10 text-[#304035]/60 hover:text-[#304035] transition-colors">
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => deleteInvoice(inv.id)} title="Supprimer"
                        className="rounded-lg p-1.5 bg-red-50 hover:bg-red-100 text-red-400 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && <ModalFacture onClose={() => setModalOpen(false)} />}
    </div>
  );
}

// ─── Onglet E-FACTURATION ─────────────────────────────────────────────────────

function OngletEFacturation() {
  const invoices = useFacturationStore(s => s.invoices);
  const invoiceDetails = useFacturationStore(s => s.invoiceDetails);
  const devis = useFacturationStore(s => s.devis);
  const societe = useConfigStore(s => s.societe);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const docsAvecToken = [
    ...devis.filter(d => d.token).map(d => ({ id: d.id, ref: d.ref, client: d.client, type: 'Devis', token: d.token!, montant: d.totalTTC, statut: d.statut })),
    ...Object.values(invoiceDetails).filter(d => d.token).map(d => ({ id: d.id, ref: d.ref, client: d.client, type: d.type, token: d.token!, montant: d.montantHT * (1 + d.tva / 100), statut: d.statut })),
  ];

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/e-facturation/${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  };

  return (
    <div className="space-y-6">
      {/* Explainer */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-200 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-violet-100 p-3 shrink-0">
            <Globe className="h-6 w-6 text-violet-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-[#304035] text-base">E-Facturation AVRA</h3>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">Gratuit</span>
            </div>
            <p className="text-sm text-[#304035]/60 mt-1 leading-relaxed">
              Chaque devis et facture dispose d'un <strong>lien unique sécurisé</strong> à partager directement à votre client.
              Le client peut consulter et accepter en ligne — sans créer de compte. <strong>100% inclus, sans surcoût.</strong>
            </p>
            <div className="flex gap-2 mt-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> Lien unique par document
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> Consultation mobile
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> PDF brandé téléchargeable
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> Signature électronique devis
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Documents avec lien */}
      <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#304035]/8 flex items-center justify-between">
          <h3 className="font-bold text-[#304035]">Documents avec lien e-facturation</h3>
          <span className="text-xs text-[#304035]/40">{docsAvecToken.length} document(s)</span>
        </div>
        {docsAvecToken.length === 0 ? (
          <div className="py-12 text-center"><Globe className="h-10 w-10 text-[#304035]/10 mx-auto mb-2" /><p className="text-sm text-[#304035]/40">Créez des devis ou factures pour générer des liens</p></div>
        ) : (
          <div className="divide-y divide-[#304035]/5">
            {docsAvecToken.map(doc => (
              <div key={doc.id} className="flex items-center justify-between px-5 py-4 hover:bg-[#f5eee8]/20 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                    {doc.type === 'Devis' ? <FileCheck className="h-4 w-4 text-violet-600" /> : <FileText className="h-4 w-4 text-violet-600" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#304035] text-sm">{doc.ref}</p>
                      <span className="text-[10px] text-[#304035]/40">{doc.type}</span>
                    </div>
                    <p className="text-xs text-[#304035]/50">{doc.client} · {fmt(doc.montant)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <code className="text-[10px] text-[#304035]/40 bg-[#304035]/5 px-2 py-1 rounded-lg hidden md:block font-mono">
                    /e-facturation/{doc.token.slice(0, 16)}...
                  </code>
                  <button
                    onClick={() => copyLink(doc.token)}
                    className={cn('flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all',
                      copiedToken === doc.token ? 'bg-emerald-100 text-emerald-700' : 'bg-[#304035]/8 text-[#304035]/60 hover:bg-[#304035]/12 hover:text-[#304035]'
                    )}
                  >
                    {copiedToken === doc.token ? <><Check className="h-3.5 w-3.5" /> Copié !</> : <><Copy className="h-3.5 w-3.5" /> Copier le lien</>}
                  </button>
                  <a href={`/e-facturation/${doc.token}`} target="_blank"
                    className="rounded-xl p-1.5 bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Onglet E Paiement ────────────────────────────────────────────────────────

function OngletEPaiement() {
  return (
    <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-sm overflow-hidden">
      <iframe
        src="/epaiement"
        style={{ width: '100%', height: 'calc(100vh - 260px)', border: 'none', display: 'block' }}
        title="E Paiement"
      />
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

type TabKey = 'devis' | 'factures' | 'e-facturation' | 'epaiement';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'devis',         label: 'Devis',          icon: <FileCheck className="h-4 w-4" /> },
  { key: 'factures',      label: 'Factures',        icon: <FileText className="h-4 w-4" /> },
  { key: 'e-facturation', label: 'E-Facturation',   icon: <Globe className="h-4 w-4" /> },
  { key: 'epaiement',     label: 'E Paiement',      icon: <CreditCard className="h-4 w-4" /> },
];

export default function FacturationPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('factures');
  const invoices = useFacturationStore(s => s.invoices);
  const devis = useFacturationStore(s => s.devis);

  const tabCounts: Record<TabKey, number | undefined> = {
    devis: devis.length,
    factures: invoices.length,
    'e-facturation': undefined,
    epaiement: undefined,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={<FileText className="h-7 w-7" />}
        title="Facturation"
        subtitle={`${invoices.length} facture(s) · ${devis.length} devis`}
        actions={
          <div className="flex gap-1 bg-white/15 border border-white/20 rounded-2xl p-1.5 shadow-sm w-fit">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                  activeTab === tab.key
                    ? 'bg-white/25 text-white shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tabCounts[tab.key] !== undefined && (
                  <span className={cn('text-[10px] font-bold rounded-full px-1.5 py-0.5',
                    activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70'
                  )}>
                    {tabCounts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        }
      />

      {/* Contenu */}
      {activeTab === 'devis'         && <OngletDevis />}
      {activeTab === 'factures'      && <OngletFactures />}
      {activeTab === 'e-facturation' && <OngletEFacturation />}
      {activeTab === 'epaiement'     && <OngletEPaiement />}
    </div>
  );
}
