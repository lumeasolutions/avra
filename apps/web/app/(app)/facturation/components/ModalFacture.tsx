'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useFacturationStore, useDossierStore, type Invoice, type Devis, type LigneDocument, type InvoiceDetail, type FactureDetailType } from '@/store';
import { cn } from '@/lib/utils';
import { LignesEditor } from './LignesEditor';

interface ModalFactureProps {
  onClose: () => void;
  devisSource?: Devis;
}

export const ModalFacture = React.memo(function ModalFacture({ onClose, devisSource }: ModalFactureProps) {
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
});
