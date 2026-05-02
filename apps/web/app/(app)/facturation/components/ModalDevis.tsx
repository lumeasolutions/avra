'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useFacturationStore, useDossierStore, type Devis, type LigneDocument } from '@/store';
import { calcLignes } from '../lib/utils';
import { LignesEditor } from './LignesEditor';

interface ModalDevisProps {
  onClose: () => void;
  devisToEdit?: Devis;
}

export const ModalDevis = React.memo(function ModalDevis({ onClose, devisToEdit }: ModalDevisProps) {
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

  const [submitError, setSubmitError] = useState('');

  const handleDossierChange = (id: string) => {
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
  };

  const handleSubmit = () => {
    setSubmitError('');
    if (!form.client.trim()) {
      setSubmitError('Le nom du client est requis.');
      return;
    }
    if (lignes.length === 0) {
      setSubmitError('Ajoutez au moins une ligne.');
      return;
    }
    const emptyLine = lignes.find(l => !l.description.trim());
    if (emptyLine) {
      setSubmitError('Chaque ligne doit avoir une description.');
      return;
    }
    const zeroLine = lignes.find(l => l.prixUnitaireHT <= 0 || l.quantite <= 0);
    if (zeroLine) {
      setSubmitError('Les lignes doivent avoir un prix et une quantité > 0.');
      return;
    }

    const { totalHT, totalTTC } = calcLignes(lignes);
    if (devisToEdit) {
      updateDevis(devisToEdit.id, {
        ...form,
        lignes,
        totalHT: Math.round(totalHT),
        totalTTC: Math.round(totalTTC),
      });
    } else {
      addDevis({
        ...form,
        lignes,
        statut: 'BROUILLON',
        dateCreation: new Date().toLocaleDateString('fr-FR'),
        totalHT: Math.round(totalHT),
        totalTTC: Math.round(totalTTC),
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#304035]/8 bg-[#304035]/2">
          <h2 className="font-bold text-[#304035] text-lg">
            {devisToEdit ? 'Modifier le devis' : 'Nouveau devis'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-[#304035]/10 transition-colors"
          >
            <X className="h-4 w-4 text-[#304035]/60" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Client */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">
                Dossier lié (optionnel)
              </label>
              <select
                className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm text-[#304035] bg-white focus:outline-none focus:border-[#304035]/30"
                value={form.dossierId}
                onChange={e => handleDossierChange(e.target.value)}
              >
                <option value="">— Aucun dossier —</option>
                {allDossiers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.firstName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">
                Client *
              </label>
              <input
                className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm text-[#304035] focus:outline-none focus:border-[#304035]/30"
                placeholder="Nom du client"
                value={form.client}
                onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">
                Email client
              </label>
              <input
                type="email"
                className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm text-[#304035] focus:outline-none focus:border-[#304035]/30"
                placeholder="email@client.fr"
                value={form.clientEmail}
                onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">
                Adresse client
              </label>
              <input
                className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm text-[#304035] focus:outline-none focus:border-[#304035]/30"
                placeholder="12 rue de la Paix, 75001 Paris"
                value={form.clientAddress}
                onChange={e => setForm(f => ({ ...f, clientAddress: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">
                Validité jusqu'au
              </label>
              <input
                className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm text-[#304035] focus:outline-none focus:border-[#304035]/30"
                placeholder="JJ/MM/AAAA"
                value={form.dateValidite}
                onChange={e => setForm(f => ({ ...f, dateValidite: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">
                Conditions de paiement
              </label>
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
            <label className="block text-xs font-semibold text-[#304035]/60 mb-3">
              Prestations / Articles
            </label>
            <LignesEditor lignes={lignes} onChange={setLignes} />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">
              Notes / Mentions
            </label>
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
          {submitError && (
            <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {submitError}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-[#304035]/60 hover:bg-[#304035]/8 transition-colors"
            >
              Annuler
            </button>
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
});
