'use client';
/**
 * « + Depuis le stock » — ajoute un article du stock comme ligne de devis.
 *
 * Retour cofondatrice (22/09/2026) : pouvoir « rajouter des éléments du stock »
 * dans un devis au lieu de tout ressaisir. La ligne créée reprend la
 * désignation complète (fournisseur, modèle, matière, couleur, référence) et
 * le PRIX DE VENTE HT ; quantité et prix restent modifiables ensuite.
 */
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Package, Search, Plus } from 'lucide-react';
import { useStockStore, type StockItem, type LigneDocument } from '@/store';

/** Désignation d'une ligne de devis à partir d'un article du stock. */
export function designationStock(it: StockItem): string {
  const base = [it.supplier, it.model].filter(Boolean).join(' ');
  const details = [it.material, it.couleur].filter((x) => x && x.trim()).join(', ');
  return `${base}${details ? ` — ${details}` : ''}${it.reference ? ` (réf. ${it.reference})` : ''}`.trim();
}

export function ligneDepuisStock(it: StockItem): LigneDocument {
  return {
    id: 'l' + crypto.randomUUID().replace(/-/g, '').slice(0, 8),
    description: designationStock(it),
    quantite: 1,
    unite: 'u',
    prixUnitaireHT: it.sale ?? 0,
    tva: 20,
    remise: 0,
  };
}

const DISPO: Record<StockItem['dot'], { label: string; color: string }> = {
  green: { label: 'Disponible', color: '#10b981' },
  orange: { label: 'Sur commande', color: '#f59e0b' },
  red: { label: 'Rupture', color: '#ef4444' },
};

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function StockPicker({ onPick }: { onPick: (ligne: LigneDocument) => void }) {
  const stockItems = useStockStore((s) => s.stockItems);
  // Position fixe + portail dans <body> : le corps de la modale défile
  // (overflow-y-auto) et un parent avec `transform` décalerait un panneau fixe.
  const [open, setOpen] = useState<null | { left: number; top?: number; bottom?: number; maxH: number }>(null);
  const [q, setQ] = useState('');
  const [ajoutes, setAjoutes] = useState<Record<string, number>>({});
  const boxRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fermeture au clic extérieur / Échap.
  useEffect(() => {
    if (!open) return;
    const dedans = (t: EventTarget | null) => t instanceof Node
      && !!(boxRef.current?.contains(t) || panelRef.current?.contains(t));
    const onDown = (e: MouseEvent) => { if (!dedans(e.target)) setOpen(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(null); } };
    const onScroll = (e: Event) => { if (!dedans(e.target)) setOpen(null); };
    const onResize = () => setOpen(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const resultats = useMemo(() => {
    const mots = norm(q).split(/\s+/).filter(Boolean);
    const liste = stockItems.filter((it) => {
      if (!mots.length) return true;
      const t = norm([it.supplier, it.model, it.reference, it.material, it.couleur, it.category].filter(Boolean).join(' '));
      return mots.every((m) => t.includes(m));
    });
    return liste.sort((a, b) => (a.supplier + a.model).localeCompare(b.supplier + b.model)).slice(0, 80);
  }, [stockItems, q]);

  const eur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={(e) => {
          if (open) { setOpen(null); return; }
          const r = e.currentTarget.getBoundingClientRect();
          const w = Math.min(560, window.innerWidth * 0.85);
          const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
          const dessus = r.top - 16, dessous = window.innerHeight - r.bottom - 16;
          setQ('');
          setOpen(dessus >= dessous
            ? { left, bottom: window.innerHeight - r.top + 6, maxH: Math.min(420, dessus) }
            : { left, top: r.bottom + 6, maxH: Math.min(420, dessous) });
        }}
        className="flex items-center gap-1.5 text-xs font-semibold text-[#a67749] hover:text-[#8a6035] px-2 py-1.5 rounded-lg hover:bg-[#a67749]/10 transition-colors"
      >
        <Package className="h-3.5 w-3.5" /> Depuis le stock
      </button>
      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', left: open.left, top: open.top, bottom: open.bottom, maxHeight: open.maxH }}
          className="z-[60] w-[min(560px,85vw)] flex flex-col rounded-2xl border border-[#304035]/12 bg-white shadow-2xl overflow-hidden"
        >
          <div className="p-3 border-b border-[#304035]/8">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#304035]/40" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher : fournisseur, modèle, référence, matière…"
                className="w-full rounded-lg border border-[#304035]/12 pl-8 pr-3 py-2 text-xs text-[#304035] focus:outline-none focus:border-[#304035]/30"
              />
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {stockItems.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-[#304035]/50">Votre stock est vide. Ajoutez des articles dans le menu Stock.</p>
            ) : resultats.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-[#304035]/50">Aucun article ne correspond à « {q} ».</p>
            ) : resultats.map((it) => {
              const dispo = DISPO[it.dot] ?? DISPO.green;
              const n = ajoutes[it.id] ?? 0;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => { onPick(ligneDepuisStock(it)); setAjoutes((a) => ({ ...a, [it.id]: (a[it.id] ?? 0) + 1 })); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#f5eee8]/60 border-b border-[#304035]/5 last:border-0"
                  title="Ajouter au devis"
                >
                  {it.image ? (
                    <img src={it.image} alt="" className="h-9 w-9 rounded-md object-cover border border-[#304035]/8 shrink-0" />
                  ) : (
                    <span className="h-9 w-9 rounded-md bg-[#304035]/5 flex items-center justify-center shrink-0"><Package className="h-4 w-4 text-[#304035]/25" /></span>
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-semibold text-[#304035] break-words">{it.supplier} {it.model}</span>
                    <span className="block text-[11px] text-[#304035]/50 break-words">
                      {[it.reference && `Réf. ${it.reference}`, it.material, it.couleur].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block text-xs font-bold text-[#304035]">{it.sale != null ? eur(it.sale) : <span className="text-red-500">Prix vente ?</span>}</span>
                    <span className="flex items-center justify-end gap-1 text-[10px] text-[#304035]/50">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dispo.color }} />
                      {dispo.label}{typeof it.quantity === 'number' ? ` · ${it.quantity} en stock` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-[#a67749]/10 px-2 py-1 text-[10px] font-bold text-[#a67749]">
                    <Plus className="h-3 w-3" />{n > 0 ? `Ajouté ×${n}` : 'Ajouter'}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="px-3 py-2 text-[10px] text-[#304035]/45 border-t border-[#304035]/8">
            Prix de vente HT du stock, TVA 20 % par défaut — quantité, prix et TVA restent modifiables dans le devis.
          </p>
        </div>,
        document.body,
      )}
    </div>
  );
}
