'use client';

/**
 * StatsTableauDossier — vue « Par dossier » des prix : pour chaque dossier
 * signé, prix d'achat HT, prix de vente HT et marge (€ et %), avec le détail
 * ligne par ligne (fournisseur/produit) dépliable, et un bouton « Modifier »
 * qui rouvre la saisie (StatsGateModal) sur ce dossier pour corriger une
 * erreur. Restaure la possibilité perdue de consulter ET corriger les prix
 * dossier par dossier après la saisie initiale.
 */

import { useState } from 'react';
import { ChevronRight, Pencil, TrendingUp, AlertTriangle, FolderCheck } from 'lucide-react';
import type { DossierPrixLigne } from '@/store/useDossierStore';

interface DossierLike {
  id: string;
  name: string;
  firstName?: string;
  prixLignes?: DossierPrixLigne[];
  statsSkipped?: boolean;
}

const eur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

function margeColor(pct: number): string {
  if (pct >= 30) return '#15803d';
  if (pct >= 15) return '#c2760c';
  if (pct > 0) return '#b45309';
  return '#b91c1c';
}

export function StatsTableauDossier({
  dossiersSignes,
  onEditDossier,
  onEditAll,
}: {
  dossiersSignes: DossierLike[];
  onEditDossier: (id: string) => void;
  onEditAll: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = dossiersSignes.map((d) => {
    const lignes = d.prixLignes ?? [];
    const achat = lignes.reduce((s, l) => s + (l.prixAchatHT || 0), 0);
    const vente = lignes.reduce((s, l) => s + (l.prixVenteHT || 0), 0);
    const marge = vente - achat;
    const margePct = vente > 0 ? (marge / vente) * 100 : 0;
    return { d, lignes, achat, vente, marge, margePct, hasData: lignes.length > 0 };
  });

  const tot = rows.reduce(
    (a, r) => ({ achat: a.achat + r.achat, vente: a.vente + r.vente, marge: a.marge + r.marge }),
    { achat: 0, vente: 0, marge: 0 },
  );
  const totPct = tot.vente > 0 ? (tot.marge / tot.vente) * 100 : 0;

  if (dossiersSignes.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-sm p-12 text-center">
        <FolderCheck className="h-10 w-10 text-[#304035]/20 mx-auto mb-3" />
        <p className="text-[#304035]/55 font-semibold">Aucun dossier signé pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* En-tête + total + bouton modifier tout */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white border border-[#304035]/8 shadow-sm px-4 py-3">
        <div className="flex items-center gap-4 flex-wrap text-sm">
          <span className="inline-flex items-center gap-1.5 font-bold text-[#304035]">
            <TrendingUp className="h-4 w-4" /> Total
          </span>
          <span className="text-[#304035]/60">Achat <strong className="text-[#304035]">{eur(tot.achat)}</strong></span>
          <span className="text-[#304035]/60">Vente <strong className="text-[#304035]">{eur(tot.vente)}</strong></span>
          <span className="text-[#304035]/60">
            Marge <strong style={{ color: margeColor(totPct) }}>{eur(tot.marge)} · {totPct.toFixed(1)}%</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={onEditAll}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#304035] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#304035]/90 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" /> Modifier les prix
        </button>
      </div>

      {/* Tableau par dossier */}
      <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            {/* En-têtes */}
            <div className="grid grid-cols-[28px_1fr_120px_120px_150px_110px] gap-0 px-4 py-2.5 bg-[#304035]/5 border-b border-[#304035]/8 text-[10px] font-bold text-[#304035]/50 uppercase tracking-widest items-center">
              <div />
              <div>Dossier</div>
              <div className="text-right">Achat HT</div>
              <div className="text-right">Vente HT</div>
              <div className="text-right">Marge</div>
              <div className="text-right">Action</div>
            </div>

            {rows.map(({ d, lignes, achat, vente, marge, margePct, hasData }, i) => {
              const isOpen = expanded === d.id;
              return (
                <div key={d.id} className={i < rows.length - 1 ? 'border-b border-[#304035]/5' : ''}>
                  <div className="grid grid-cols-[28px_1fr_120px_120px_150px_110px] gap-0 items-center px-4 py-3 hover:bg-[#f5eee8]/40 transition-colors">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : d.id)}
                      className="flex items-center justify-center text-[#304035]/40 hover:text-[#304035]"
                      title={isOpen ? 'Réduire' : 'Voir le détail par ligne'}
                      aria-label="Détail"
                    >
                      <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </button>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-[#304035] truncate">
                        {d.name} {d.firstName ?? ''}
                      </p>
                      {!hasData && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5 mt-0.5">
                          <AlertTriangle className="h-2.5 w-2.5" /> Prix à renseigner
                        </span>
                      )}
                      {d.statsSkipped && (
                        <span className="ml-1 inline-flex items-center text-[10px] font-bold text-[#304035]/45 bg-[#304035]/5 rounded-full px-1.5 py-0.5 mt-0.5">
                          Reporté
                        </span>
                      )}
                    </div>
                    <div className="text-right text-sm text-[#304035]/70 tabular-nums">{hasData ? eur(achat) : '—'}</div>
                    <div className="text-right text-sm text-[#304035]/70 tabular-nums">{hasData ? eur(vente) : '—'}</div>
                    <div className="text-right text-sm font-bold tabular-nums" style={{ color: hasData ? margeColor(margePct) : 'rgba(48,64,53,0.3)' }}>
                      {hasData ? `${eur(marge)} · ${margePct.toFixed(1)}%` : '—'}
                    </div>
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => onEditDossier(d.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#304035]/15 px-2.5 py-1.5 text-xs font-bold text-[#304035] hover:bg-[#f5eee8] transition-colors"
                      >
                        <Pencil className="h-3 w-3" /> Modifier
                      </button>
                    </div>
                  </div>

                  {/* Détail ligne par ligne */}
                  {isOpen && (
                    <div className="px-4 pb-3 bg-[#f5eee8]/25">
                      {lignes.length === 0 ? (
                        <p className="text-xs text-[#304035]/45 py-2">Aucune ligne de prix. Cliquez « Modifier » pour renseigner.</p>
                      ) : (
                        <div className="rounded-xl border border-[#304035]/10 overflow-hidden bg-white mt-1">
                          <div className="grid grid-cols-[1fr_110px_110px_110px] gap-0 px-3 py-1.5 bg-[#304035]/4 text-[9px] font-bold text-[#304035]/45 uppercase tracking-wider">
                            <div>Fournisseur / Produit</div>
                            <div className="text-right">Achat</div>
                            <div className="text-right">Vente</div>
                            <div className="text-right">Marge</div>
                          </div>
                          {lignes.map((l) => {
                            const m = (l.prixVenteHT || 0) - (l.prixAchatHT || 0);
                            return (
                              <div key={l.id} className="grid grid-cols-[1fr_110px_110px_110px] gap-0 px-3 py-1.5 text-xs items-center border-t border-[#304035]/5">
                                <div className="min-w-0 truncate">
                                  <span className="font-semibold text-[#304035]">{l.fournisseur || '—'}</span>
                                  {l.produit && <span className="text-[#304035]/50"> · {l.produit}</span>}
                                </div>
                                <div className="text-right text-[#304035]/70 tabular-nums">{eur(l.prixAchatHT || 0)}</div>
                                <div className="text-right text-[#304035]/70 tabular-nums">{eur(l.prixVenteHT || 0)}</div>
                                <div className="text-right font-semibold tabular-nums" style={{ color: margeColor((l.prixVenteHT || 0) > 0 ? (m / (l.prixVenteHT || 1)) * 100 : 0) }}>{eur(m)}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-[#304035]/40 px-1">
        Cliquez la flèche pour voir le détail par produit, ou « Modifier » pour corriger les prix d'un dossier.
      </p>
    </div>
  );
}
