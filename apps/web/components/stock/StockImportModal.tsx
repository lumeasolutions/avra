'use client';
/**
 * Import du stock depuis Excel / CSV — fenêtre en 4 temps :
 * choix du fichier → lecture → APERÇU (rien n'est enregistré) → import.
 *
 * Retour cofondatrice (22/09/2026). Les articles sont envoyés par lots de 50
 * (route /stock/bulk), puis le stock est rechargé depuis le serveur : ce qui
 * s'affiche est exactement ce qui est enregistré.
 */
import { useRef, useState } from 'react';
import { X, Upload, FileSpreadsheet, Download, Check, AlertTriangle, Copy, Loader2 } from 'lucide-react';
import { useStockStore, type StockItem } from '@/store';
import { backdropClose } from '@/lib/backdropClose';
import { lireFichierStock, LIBELLES_CHAMPS, type ResultatImport } from '@/lib/stock-import';
import { bulkCreateStockItemsApi, listAllStockItems, stockItemFromApi } from '@/lib/stock-api';
import { exportStockToExcel } from '@/lib/stock-excel';

const LOT = 50;

interface Props {
  categories: Record<string, string>;
  categorieParDefaut: string;
  onClose: () => void;
}

export function StockImportModal({ categories, categorieParDefaut, onClose }: Props) {
  const stockItems = useStockStore((s) => s.stockItems);
  const inputRef = useRef<HTMLInputElement>(null);
  const [etape, setEtape] = useState<'choix' | 'lecture' | 'apercu' | 'import' | 'fini'>('choix');
  const [nomFichier, setNomFichier] = useState('');
  const [resultat, setResultat] = useState<ResultatImport | null>(null);
  const [inclureDoublons, setInclureDoublons] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [progres, setProgres] = useState({ fait: 0, total: 0 });
  const [survol, setSurvol] = useState(false);

  const labelCat = (c: string) => categories[c] ?? (c.charAt(0) + c.slice(1).toLowerCase());

  const lire = async (file: File) => {
    setErreur(null);
    setNomFichier(file.name);
    setEtape('lecture');
    try {
      const r = await lireFichierStock(file, { categories, categorieParDefaut, existants: stockItems });
      setResultat(r);
      setEtape('apercu');
    } catch (e: any) {
      setErreur(e?.message || 'Lecture du fichier impossible.');
      setEtape('choix');
    }
  };

  const aImporter = (resultat?.lignes ?? []).filter(
    (l) => l.statut === 'ok' || (inclureDoublons && l.statut === 'doublon'),
  );
  const nb = {
    ok: resultat?.lignes.filter((l) => l.statut === 'ok').length ?? 0,
    doublon: resultat?.lignes.filter((l) => l.statut === 'doublon').length ?? 0,
    ignoree: resultat?.lignes.filter((l) => l.statut === 'ignoree').length ?? 0,
  };

  const importer = async () => {
    const items = aImporter.map((l) => l.item as Partial<StockItem>);
    if (!items.length) return;
    setErreur(null);
    setEtape('import');
    setProgres({ fait: 0, total: items.length });
    let fait = 0;
    try {
      for (let i = 0; i < items.length; i += LOT) {
        const lot = items.slice(i, i + LOT);
        await bulkCreateStockItemsApi(lot);
        fait += lot.length;
        setProgres({ fait, total: items.length });
      }
    } catch (e: any) {
      setErreur(
        `L'import s'est arrêté après ${fait} article${fait > 1 ? 's' : ''} sur ${items.length}` +
          ` (${e?.message || 'erreur réseau'}). Les articles déjà importés sont enregistrés ;` +
          ` relancez l'import en laissant « doublons » décoché pour ajouter le reste.`,
      );
    }
    // Recharge le stock depuis le serveur : l'écran reflète l'enregistré.
    try {
      const data = await listAllStockItems();
      useStockStore.setState({ stockItems: data.map(stockItemFromApi) });
    } catch { /* la prochaine synchro rattrapera */ }
    setProgres({ fait, total: items.length });
    setEtape('fini');
  };

  const telechargerModele = () => exportStockToExcel([], labelCat, 'modele-import-stock-avra').catch(() => alert('Téléchargement du modèle impossible.'));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      {...backdropClose(() => { if (etape !== 'import') onClose(); })}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-[#304035]/10 flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-[#304035]/8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#10b981]/10 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-[#10b981]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#304035]">Importer depuis Excel</h3>
              <p className="text-xs text-[#304035]/50">
                {nomFichier ? nomFichier : 'Fichier .xlsx ou .csv — rien n’est enregistré avant votre validation'}
              </p>
            </div>
          </div>
          {etape !== 'import' && (
            <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-xl hover:bg-[#f5eee8] transition-colors">
              <X className="h-5 w-5 text-[#304035]/50" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {erreur && (
            <div className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{erreur}</span>
            </div>
          )}

          {/* 1. Choix du fichier */}
          {(etape === 'choix' || etape === 'lecture') && (
            <>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
                onDragLeave={() => setSurvol(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setSurvol(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) void lire(f);
                }}
                disabled={etape === 'lecture'}
                className="w-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 transition-colors"
                style={{ borderColor: survol ? '#10b981' : 'rgba(48,64,53,0.2)', background: survol ? 'rgba(16,185,129,0.06)' : 'rgba(245,238,232,0.4)' }}
              >
                {etape === 'lecture' ? (
                  <>
                    <Loader2 className="h-8 w-8 text-[#10b981] animate-spin" />
                    <span className="text-sm font-semibold text-[#304035]">Lecture du fichier…</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-[#10b981]" />
                    <span className="text-sm font-bold text-[#304035]">Choisir un fichier Excel ou CSV</span>
                    <span className="text-xs text-[#304035]/50">ou le glisser ici</span>
                  </>
                )}
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.currentTarget.value = '';
                  if (f) void lire(f);
                }}
              />
              <div className="mt-5 rounded-xl bg-[#f5eee8]/50 p-4 text-xs leading-relaxed text-[#304035]/70">
                <p className="font-bold text-[#304035] mb-1">Colonnes reconnues (première ligne du fichier)</p>
                <p>
                  Fournisseur · Modèle (ou Désignation) · Référence · Catégorie · Matière · Couleur ·
                  Quantité · Seuil d&apos;alerte · Prix achat HT · Prix vente HT · Disponibilité.
                  Seul le modèle (ou la référence) est obligatoire. Les photos intégrées au fichier Excel sont récupérées.
                </p>
                <p className="mt-2">
                  Un fichier exporté par AVRA se ré-importe tel quel. Ancien format Excel (.xls) : ouvrez-le puis
                  « Enregistrer sous » → Classeur Excel (.xlsx).
                </p>
                <button
                  type="button"
                  onClick={telechargerModele}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#10b981]/40 bg-white px-3 py-1.5 font-bold text-[#10b981] hover:bg-[#10b981]/5"
                >
                  <Download className="h-3.5 w-3.5" /> Télécharger un modèle vide
                </button>
              </div>
            </>
          )}

          {/* 2. Aperçu */}
          {etape === 'apercu' && resultat && (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10b981]/10 px-3 py-1 text-xs font-bold text-[#047857]">
                  <Check className="h-3.5 w-3.5" /> {nb.ok} à importer
                </span>
                {nb.doublon > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    <Copy className="h-3.5 w-3.5" /> {nb.doublon} doublon{nb.doublon > 1 ? 's' : ''}
                  </span>
                )}
                {nb.ignoree > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                    <AlertTriangle className="h-3.5 w-3.5" /> {nb.ignoree} ignorée{nb.ignoree > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <p className="text-xs text-[#304035]/55 mb-2">
                Colonnes utilisées :{' '}
                {resultat.colonnes.filter((c) => c.champ).map((c) => `${c.entete} → ${LIBELLES_CHAMPS[c.champ!]}`).join(' · ')}
                {resultat.colonnes.some((c) => c.entete && !c.champ) && (
                  <> · <span className="text-[#304035]/40">ignorées : {resultat.colonnes.filter((c) => c.entete && !c.champ).map((c) => c.entete).join(', ')}</span></>
                )}
              </p>

              {nb.doublon > 0 && (
                <label className="mb-3 flex items-center gap-2 text-xs text-[#304035]/70 cursor-pointer">
                  <input type="checkbox" checked={inclureDoublons} onChange={(e) => setInclureDoublons(e.target.checked)} />
                  Importer aussi les doublons (déconseillé : l&apos;article existera en double)
                </label>
              )}

              <div className="rounded-xl border border-[#304035]/10 overflow-hidden">
                <div className="max-h-[42vh] overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[#f5eee8] text-[#304035]/60">
                      <tr>
                        <th className="px-2 py-2 text-left font-bold">Ligne</th>
                        <th className="px-2 py-2 text-left font-bold">Photo</th>
                        <th className="px-2 py-2 text-left font-bold">Fournisseur</th>
                        <th className="px-2 py-2 text-left font-bold">Modèle</th>
                        <th className="px-2 py-2 text-left font-bold">Catégorie</th>
                        <th className="px-2 py-2 text-right font-bold">Qté</th>
                        <th className="px-2 py-2 text-right font-bold">Achat</th>
                        <th className="px-2 py-2 text-right font-bold">Vente</th>
                        <th className="px-2 py-2 text-left font-bold">État</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultat.lignes.map((l) => {
                        const inclus = l.statut === 'ok' || (inclureDoublons && l.statut === 'doublon');
                        return (
                          <tr key={l.ligne} className="border-t border-[#304035]/5" style={{ opacity: inclus ? 1 : 0.5 }}>
                            <td className="px-2 py-1.5 text-[#304035]/40">{l.ligne}</td>
                            <td className="px-2 py-1.5">
                              {l.item.image ? <img src={l.item.image} alt="" className="h-8 w-8 rounded object-cover" /> : <span className="text-[#304035]/25">—</span>}
                            </td>
                            <td className="px-2 py-1.5 font-semibold text-[#304035] break-words">{l.item.supplier || '—'}</td>
                            <td className="px-2 py-1.5 text-[#304035]/80 break-words">{l.item.model || l.item.reference || '—'}</td>
                            <td className="px-2 py-1.5 text-[#304035]/70">{labelCat(l.item.category)}</td>
                            <td className="px-2 py-1.5 text-right">{l.item.quantity ?? '—'}</td>
                            <td className="px-2 py-1.5 text-right whitespace-nowrap">{l.item.purchase ? `${l.item.purchase.toLocaleString('fr-FR')} €` : '—'}</td>
                            <td className="px-2 py-1.5 text-right whitespace-nowrap">{l.item.sale != null ? `${l.item.sale.toLocaleString('fr-FR')} €` : '—'}</td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              {l.statut === 'ok' && <span className="text-[#047857] font-bold">À importer</span>}
                              {l.statut === 'doublon' && <span className="text-amber-700 font-bold" title={l.raison}>{inclus ? 'Doublon (importé)' : l.raison}</span>}
                              {l.statut === 'ignoree' && <span className="text-red-600 font-bold">{l.raison}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* 3. Import en cours / terminé */}
          {(etape === 'import' || etape === 'fini') && (
            <div className="py-6 text-center">
              {etape === 'import' ? (
                <Loader2 className="h-10 w-10 mx-auto text-[#10b981] animate-spin" />
              ) : (
                <div className="h-12 w-12 mx-auto rounded-full bg-[#10b981]/10 flex items-center justify-center">
                  <Check className="h-6 w-6 text-[#10b981]" />
                </div>
              )}
              <p className="mt-3 text-base font-bold text-[#304035]">
                {etape === 'import'
                  ? `Import en cours… ${progres.fait} / ${progres.total}`
                  : `${progres.fait} article${progres.fait > 1 ? 's' : ''} importé${progres.fait > 1 ? 's' : ''}`}
              </p>
              <div className="mx-auto mt-3 h-2 max-w-sm rounded-full bg-[#304035]/10 overflow-hidden">
                <div
                  className="h-full bg-[#10b981] transition-all"
                  style={{ width: `${progres.total ? Math.round((progres.fait / progres.total) * 100) : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Pied */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-[#304035]/8 shrink-0">
          {etape === 'apercu' && (
            <button
              type="button"
              onClick={() => { setResultat(null); setNomFichier(''); setEtape('choix'); }}
              className="rounded-xl border border-[#304035]/15 px-4 py-2.5 text-sm font-semibold text-[#304035]/70 hover:bg-[#f5eee8]"
            >
              Choisir un autre fichier
            </button>
          )}
          {etape === 'apercu' && (
            <button
              type="button"
              onClick={importer}
              disabled={aImporter.length === 0}
              className="rounded-xl bg-[#10b981] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#10b981]/85 disabled:opacity-40"
            >
              Importer {aImporter.length} article{aImporter.length > 1 ? 's' : ''}
            </button>
          )}
          {(etape === 'choix' || etape === 'fini') && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[#304035] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#304035]/90"
            >
              {etape === 'fini' ? 'Terminer' : 'Annuler'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
