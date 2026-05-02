'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useFacturationStore, type Devis, type FactureDetailType } from '@/store';
import { cn } from '@/lib/utils';

interface ModalConvertirProps {
  devis: Devis;
  onClose: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export const ModalConvertir = React.memo(function ModalConvertir({ devis, onClose }: ModalConvertirProps) {
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
});
