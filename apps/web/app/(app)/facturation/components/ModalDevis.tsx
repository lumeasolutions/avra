'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { X, Building2, AlertTriangle } from 'lucide-react';
import { useConfigStore, useFacturationStore, useVisibleDossiers, useVisibleDossiersSignes, type Devis, type LigneDocument } from '@/store';
import { calcLignes } from '../lib/utils';
import { LignesEditor } from './LignesEditor';
import { adresseDossier } from './DevisDownload';

const round2 = (n: number) => Math.round(n * 100) / 100;

interface ModalDevisProps {
  onClose: () => void;
  devisToEdit?: Devis;
  /** Pré-remplissage à la création (ex. ouverture depuis un dossier). Ignoré en édition. */
  prefill?: { client?: string; clientEmail?: string; clientAddress?: string; dossierId?: string };
}

export const ModalDevis = React.memo(function ModalDevis({ onClose, devisToEdit, prefill }: ModalDevisProps) {
  const addDevis = useFacturationStore(s => s.addDevis);
  const updateDevis = useFacturationStore(s => s.updateDevis);
  const dossiers = useVisibleDossiers();
  const dossiersSignes = useVisibleDossiersSignes();
  const allDossiers = [...dossiers, ...dossiersSignes];
  const societe = useConfigStore(s => s.societe);
  const manquants = [
    !societe.nom?.trim() && 'nom',
    !(societe.adresse?.trim() && societe.ville?.trim()) && 'adresse',
    !societe.siret?.trim() && 'SIRET',
  ].filter(Boolean) as string[];

  const [form, setForm] = useState({
    objet: devisToEdit?.objet ?? '',
    client: devisToEdit?.client ?? prefill?.client ?? '',
    clientEmail: devisToEdit?.clientEmail ?? prefill?.clientEmail ?? '',
    clientAddress: devisToEdit?.clientAddress ?? prefill?.clientAddress ?? '',
    dossierId: devisToEdit?.dossierId ?? prefill?.dossierId ?? '',
    dateValidite: devisToEdit?.dateValidite ?? new Date(Date.now() + 30 * 86400000).toLocaleDateString('fr-FR'),
    conditionsPaiement: devisToEdit?.conditionsPaiement ?? '30% acompte, 40% intermédiaire, 30% solde',
    notes: devisToEdit?.notes ?? '',
  });

  const [lignes, setLignes] = useState<LigneDocument[]>(devisToEdit?.lignes ?? [
    { id: 'l1', description: '', quantite: 1, unite: 'forfait', prixUnitaireHT: 0, tva: 20, remise: 0 },
  ]);

  const [submitError, setSubmitError] = useState('');
  const dossierLie = allDossiers.find(d => d.id === form.dossierId);

  const handleDossierChange = (id: string) => {
    const d = allDossiers.find(d => d.id === id);
    if (d) {
      setForm(f => ({
        ...f,
        dossierId: id,
        client: d.name + (d.firstName ? ' ' + d.firstName : ''),
        clientEmail: d.email ?? '',
        clientAddress: adresseDossier(d),
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
    const emptyIdx = lignes.findIndex(l => !l.description.trim());
    if (emptyIdx >= 0) {
      setSubmitError(`Ligne ${emptyIdx + 1} : la description est vide.`);
      return;
    }
    const zeroIdx = lignes.findIndex(l => l.prixUnitaireHT <= 0 || l.quantite <= 0);
    if (zeroIdx >= 0) {
      setSubmitError(`Ligne ${zeroIdx + 1} (« ${lignes[zeroIdx].description.slice(0, 40)} ») : le prix et la quantité doivent être supérieurs à 0.`);
      return;
    }

    const { totalHT, totalTTC } = calcLignes(lignes);
    if (devisToEdit) {
      updateDevis(devisToEdit.id, {
        ...form,
        lignes,
        totalHT: round2(totalHT),
        totalTTC: round2(totalTTC),
      });
    } else {
      addDevis({
        ...form,
        lignes,
        statut: 'BROUILLON',
        dateCreation: new Date().toLocaleDateString('fr-FR'),
        totalHT: round2(totalHT),
        totalTTC: round2(totalTTC),
      });
    }
    onClose();
  };

  return (
    // z-[250] : au-dessus du bouton flottant de l'assistant (z 50), qui masquait
    // « Enregistrer » sur mobile, et du bouton ☰ mobile (z 200).
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
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

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Émetteur : repris automatiquement de Paramètres › Coordonnées Société. */}
          {manquants.length === 0 ? (
            <div className="flex items-start gap-2.5 rounded-xl bg-[#304035]/4 px-3 py-2.5 text-xs text-[#304035]/70">
              <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-[#304035]/50" />
              <p>
                <span className="font-semibold text-[#304035]">{societe.nom}</span>
                {' · '}{[societe.adresse, [societe.codePostal, societe.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
                {' · '}SIRET {societe.siret}
                <span className="block text-[10px] text-[#304035]/45 mt-0.5">Vos coordonnées {societe.logo ? 'et votre logo ' : ''}sont ajoutées automatiquement au devis (PDF, Word, Excel).</span>
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Coordonnées société incomplètes ({manquants.join(', ')}) : elles apparaîtront vides sur le devis.{' '}
                <Link href="/parametres?section=societe" className="font-semibold underline">Compléter dans Paramètres</Link>
              </p>
            </div>
          )}

          {/* Objet — sert de titre / repère de version (ex "Cuisine v1", "Cuisine révisée"). */}
          <div>
            <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">
              Objet du devis <span className="font-normal text-[#304035]/35">(recommandé — ex « Cuisine v1 »)</span>
            </label>
            <input
              className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm text-[#304035] focus:outline-none focus:border-[#304035]/30"
              placeholder="Ex : Cuisine complète — version 1"
              value={form.objet}
              onChange={e => setForm(f => ({ ...f, objet: e.target.value }))}
              maxLength={80}
            />
          </div>

          {/* Client */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              {dossierLie?.phone && (
                <p className="mt-1 text-[10px] text-[#304035]/45">Tél. repris du dossier sur le devis : {dossierLie.phone}</p>
              )}
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
              type="button"
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
