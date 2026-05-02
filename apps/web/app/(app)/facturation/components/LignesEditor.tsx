'use client';

import React from 'react';
import { X, PlusCircle } from 'lucide-react';
import type { LigneDocument } from '@/store';
import { calcLignes, fmtPrecise } from '../lib/utils';

interface LignesEditorProps {
  lignes: LigneDocument[];
  onChange: (l: LigneDocument[]) => void;
}

export const LignesEditor = React.memo(function LignesEditor({ lignes, onChange }: LignesEditorProps) {
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
});
