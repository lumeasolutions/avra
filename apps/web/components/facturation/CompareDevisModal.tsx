'use client';

/**
 * CompareDevisModal — Outil « Comparer 2 devis » (v1).
 *
 * Comparaison DÉTERMINISTE de deux devis (aucune IA) : on aligne les lignes par
 * description et on met en évidence ce qui a été AJOUTÉ / RETIRÉ / MODIFIÉ, plus
 * l'écart sur les totaux (HT / TVA / TTC). Pensé comme un ASSISTANT : il montre
 * les différences, l'humain valide.
 *
 * Ouvert depuis le bouton « Comparer » du détail d'un dossier. Les 2 sélecteurs
 * listent tous les devis (ceux du dossier en tête), et se pré-remplissent avec
 * les 2 devis les plus récents du dossier.
 */
import { useEffect, useMemo, useState } from 'react';
import { GitCompare, X, ArrowLeftRight, Plus, Minus, Pencil, AlertTriangle, FileText, ArrowRight } from 'lucide-react';
import { useFacturationStore, type Devis } from '@/store';
import { calcLignes, fmt, DEVIS_STATUS_CFG } from '@/app/(app)/facturation/lib/utils';
import { buildDevisDiff, ligneHT, KIND_CFG } from '@/app/(app)/facturation/lib/devisDiff';

const devisLabel = (d: Devis) => `${d.ref}${d.objet ? ' · ' + d.objet : ''} · ${d.client}`;

/** Petite pastille statut devis. */
function StatutBadge({ statut }: { statut: Devis['statut'] }) {
  const cfg = DEVIS_STATUS_CFG[statut];
  return (
    <span className={`inline-flex items-center text-[10px] font-bold rounded-full px-2 py-0.5 ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

/** Valeur + variation entre 2 montants (pour la ligne des totaux). */
function DeltaValue({ a, b }: { a: number; b: number }) {
  const d = b - a;
  const nul = Math.abs(d) < 0.005;
  // Hausse = orange (coûte plus cher), baisse = vert.
  const color = nul ? 'rgba(48,64,53,0.4)' : d > 0 ? '#ea580c' : '#16a34a';
  return (
    <span style={{ fontSize: 11, fontWeight: 800, color }}>
      {nul ? '—' : `${d > 0 ? '+' : '−'}${fmt(Math.abs(d))}`}
    </span>
  );
}

export function CompareDevisModal({ dossierId, onClose }: { dossierId?: string; onClose: () => void }) {
  const allDevis = useFacturationStore((s) => s.devis);

  // Devis triés : ceux du dossier d'abord (plus récents en tête), puis les autres.
  // dateCreation est au format FR "JJ/MM/AAAA" -> on la convertit en timestamp
  // pour un tri réellement chronologique (un localeCompare trierait par jour).
  const frToTs = (s?: string) => {
    const [d, m, y] = (s ?? '').split('/');
    return y ? new Date(+y, +m - 1, +d).getTime() : 0;
  };
  const sorted = useMemo(() => {
    const withDate = [...allDevis].sort((x, y) => frToTs(y.dateCreation) - frToTs(x.dateCreation));
    const mine = withDate.filter((d) => dossierId && d.dossierId === dossierId);
    const others = withDate.filter((d) => !(dossierId && d.dossierId === dossierId));
    return { mine, others, all: [...mine, ...others] };
  }, [allDevis, dossierId]);

  // Défauts : on lit du plus ANCIEN vers le plus RÉCENT (v1 -> v2), sens naturel
  // de vérification. `defaults` est trié du plus récent au plus ancien, donc
  // A (référence, ancien) = 2e le plus récent, B (comparé, récent) = le plus récent.
  const defaults = sorted.mine.length >= 2 ? sorted.mine : sorted.all;
  const defB = defaults[0]?.id ?? '';                 // le plus récent
  const defA = defaults[1]?.id ?? defaults[0]?.id ?? ''; // l'antérieur (ou le seul)
  const [idA, setIdA] = useState<string>(defA);
  const [idB, setIdB] = useState<string>(defB);

  // Réconcilie la sélection quand la liste des devis change (hydratation
  // asynchrone au montage, ou suppression d'un devis) : on conserve un choix
  // encore valide, sinon on reprend les défauts (ancien -> récent).
  useEffect(() => {
    const ids = new Set(sorted.all.map((d) => d.id));
    setIdA((prev) => (prev && ids.has(prev) ? prev : defA));
    setIdB((prev) => (prev && ids.has(prev) ? prev : defB));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted]);

  const devisA = sorted.all.find((d) => d.id === idA) ?? null;
  const devisB = sorted.all.find((d) => d.id === idB) ?? null;

  const diff = useMemo(() => (devisA && devisB ? buildDevisDiff(devisA.lignes, devisB.lignes) : []), [devisA, devisB]);
  const counts = useMemo(() => ({
    ajoute: diff.filter((r) => r.kind === 'ajoute').length,
    retire: diff.filter((r) => r.kind === 'retire').length,
    modifie: diff.filter((r) => r.kind === 'modifie').length,
  }), [diff]);

  const totA = devisA ? calcLignes(devisA.lignes) : null;
  const totB = devisB ? calcLignes(devisB.lignes) : null;

  const swap = () => { setIdA(idB); setIdB(idA); };

  const canCompare = sorted.all.length >= 2;
  const sameSelected = devisA && devisB && devisA.id === devisB.id;

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 10,
    border: '1px solid rgba(48,64,53,0.18)', background: '#fff',
    fontSize: 13, fontWeight: 600, color: '#304035', cursor: 'pointer', outline: 'none',
  };

  const renderOptions = () => (
    <>
      {sorted.mine.length > 0 && (
        <optgroup label="Ce dossier">
          {sorted.mine.map((d) => <option key={d.id} value={d.id}>{devisLabel(d)}</option>)}
        </optgroup>
      )}
      {sorted.others.length > 0 && (
        <optgroup label="Autres devis">
          {sorted.others.map((d) => <option key={d.id} value={d.id}>{devisLabel(d)}</option>)}
        </optgroup>
      )}
    </>
  );

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,20,17,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 60 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 960, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}
      >
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(48,64,53,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'linear-gradient(135deg, #2a3a30 0%, #3d5244 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(217,179,138,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <GitCompare size={18} color="#d9b38a" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '0.01em' }}>Comparer deux devis</h2>
              <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'rgba(255,255,255,0.6)' }}>AVRA repère les différences — à vous de valider.</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ padding: 7, borderRadius: 9, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex' }}>
            <X size={17} />
          </button>
        </div>

        {!canCompare ? (
          /* ── Pas assez de devis ── */
          <div style={{ padding: '48px 28px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(48,64,53,0.05)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <FileText size={26} color="rgba(48,64,53,0.35)" />
            </div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#304035' }}>Il faut au moins 2 devis pour comparer</p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(48,64,53,0.55)', maxWidth: 380, marginInline: 'auto' }}>
              Créez un second devis (ex. une version révisée) depuis ce dossier ou la Facturation, puis revenez ici pour voir les différences ligne par ligne.
            </p>
            <button onClick={onClose} style={{ marginTop: 20, padding: '9px 18px', borderRadius: 10, border: 'none', background: '#304035', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Fermer</button>
          </div>
        ) : (
          <>
            {/* Sélecteurs A ⇄ B */}
            <div style={{ padding: '16px 22px 8px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'rgba(48,64,53,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Devis A (référence)</label>
                <select value={idA} onChange={(e) => setIdA(e.target.value)} style={selectStyle}>{renderOptions()}</select>
              </div>
              <button type="button" onClick={swap} aria-label="Inverser A et B" title="Inverser A et B" style={{ marginBottom: 2, width: 38, height: 38, borderRadius: 10, border: '1px solid rgba(48,64,53,0.15)', background: '#fff', color: '#a67749', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ArrowLeftRight size={16} />
              </button>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'rgba(48,64,53,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Devis B (comparé)</label>
                <select value={idB} onChange={(e) => setIdB(e.target.value)} style={selectStyle}>{renderOptions()}</select>
              </div>
            </div>

            {sameSelected ? (
              <div style={{ padding: '28px', textAlign: 'center', color: 'rgba(48,64,53,0.55)', fontSize: 13 }}>
                Sélectionnez <b>deux devis différents</b> pour voir la comparaison.
              </div>
            ) : devisA && devisB && totA && totB ? (
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 22px 22px' }}>
                {/* Bandeau résumé */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: '10px 14px', borderRadius: 12, background: 'rgba(48,64,53,0.03)', border: '1px solid rgba(48,64,53,0.07)', marginBottom: 14 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 800, color: '#16a34a' }}><Plus size={13} />{counts.ajoute} ajoutée{counts.ajoute > 1 ? 's' : ''}</span>
                  <span style={{ color: 'rgba(48,64,53,0.2)' }}>·</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 800, color: '#dc2626' }}><Minus size={13} />{counts.retire} retirée{counts.retire > 1 ? 's' : ''}</span>
                  <span style={{ color: 'rgba(48,64,53,0.2)' }}>·</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 800, color: '#ea580c' }}><Pencil size={12} />{counts.modifie} modifiée{counts.modifie > 1 ? 's' : ''}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(48,64,53,0.5)' }}>Écart TTC&nbsp;:</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: (totB.totalTTC - totA.totalTTC) > 0.005 ? '#ea580c' : (totA.totalTTC - totB.totalTTC) > 0.005 ? '#16a34a' : 'rgba(48,64,53,0.5)' }}>
                    {Math.abs(totB.totalTTC - totA.totalTTC) < 0.005 ? '—' : `${totB.totalTTC - totA.totalTTC > 0 ? '+' : '−'}${fmt(Math.abs(totB.totalTTC - totA.totalTTC))}`}
                  </span>
                </div>

                {/* En-têtes des 2 devis */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  {[{ d: devisA, t: totA, tag: 'A', accent: '#304035' }, { d: devisB, t: totB, tag: 'B', accent: '#a67749' }].map(({ d, t, tag, accent }) => (
                    <div key={tag} style={{ padding: '12px 14px', borderRadius: 12, border: `1px solid ${accent}22`, background: `${accent}06` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ width: 20, height: 20, borderRadius: 6, background: accent, color: '#fff', fontSize: 11, fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{tag}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#304035' }}>{d.ref}</span>
                        <StatutBadge statut={d.statut} />
                      </div>
                      <div style={{ fontSize: 11.5, color: 'rgba(48,64,53,0.55)' }}>{d.objet || 'Sans objet'} · créé le {d.dateCreation}</div>
                      <div style={{ marginTop: 6, fontSize: 16, fontWeight: 900, color: accent }}>{fmt(t.totalTTC)} <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(48,64,53,0.45)' }}>TTC</span></div>
                    </div>
                  ))}
                </div>

                {/* Tableau différences ligne par ligne */}
                <div style={{ borderRadius: 12, border: '1px solid rgba(48,64,53,0.1)', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 90px', gap: 0, padding: '8px 12px', background: 'rgba(48,64,53,0.04)', fontSize: 10, fontWeight: 800, color: 'rgba(48,64,53,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <span>Ligne</span><span style={{ textAlign: 'right' }}>Devis A</span><span style={{ textAlign: 'right' }}>Devis B</span><span style={{ textAlign: 'right' }}>Écart</span>
                  </div>
                  {diff.map((r) => {
                    const cfg = KIND_CFG[r.kind];
                    return (
                      <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 90px', gap: 0, padding: '9px 12px', alignItems: 'center', background: cfg.bg, borderTop: '1px solid rgba(48,64,53,0.06)' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 800, color: cfg.color, background: r.kind === 'identique' ? 'transparent' : cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 5, padding: '1px 5px', flexShrink: 0 }}>
                              <cfg.Icon size={10} />{cfg.label}
                            </span>
                          </div>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#304035', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.description}>{r.description}</div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: 12 }}>
                          {r.a ? <><div style={{ fontWeight: 700, color: '#304035' }}>{fmt(ligneHT(r.a))}</div><div style={{ fontSize: 10, color: 'rgba(48,64,53,0.45)' }}>{r.a.quantite}×{fmt(r.a.prixUnitaireHT)}{r.a.remise ? ` −${r.a.remise}%` : ''} · {r.a.tva}%</div></> : <span style={{ color: 'rgba(48,64,53,0.3)' }}>—</span>}
                        </div>
                        <div style={{ textAlign: 'right', fontSize: 12 }}>
                          {r.b ? <><div style={{ fontWeight: 700, color: '#304035' }}>{fmt(ligneHT(r.b))}</div><div style={{ fontSize: 10, color: 'rgba(48,64,53,0.45)' }}>{r.b.quantite}×{fmt(r.b.prixUnitaireHT)}{r.b.remise ? ` −${r.b.remise}%` : ''} · {r.b.tva}%</div></> : <span style={{ color: 'rgba(48,64,53,0.3)' }}>—</span>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {Math.abs(r.deltaHT) < 0.005 ? <span style={{ fontSize: 11, color: 'rgba(48,64,53,0.35)' }}>—</span> : <span style={{ fontSize: 11.5, fontWeight: 800, color: r.deltaHT > 0 ? '#ea580c' : '#16a34a' }}>{r.deltaHT > 0 ? '+' : '−'}{fmt(Math.abs(r.deltaHT))}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Totaux comparés */}
                <div style={{ marginTop: 12, borderRadius: 12, border: '1px solid rgba(48,64,53,0.1)', overflow: 'hidden' }}>
                  {([['Total HT', totA.totalHT, totB.totalHT], ['TVA', totA.totalTVA, totB.totalTVA], ['Total TTC', totA.totalTTC, totB.totalTTC]] as [string, number, number][]).map(([label, va, vb], i) => (
                    <div key={label} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 90px', gap: 0, padding: '9px 12px', alignItems: 'center', borderTop: i ? '1px solid rgba(48,64,53,0.06)' : 'none', background: label === 'Total TTC' ? 'rgba(166,119,73,0.06)' : '#fff' }}>
                      <span style={{ fontSize: 12.5, fontWeight: label === 'Total TTC' ? 900 : 700, color: '#304035' }}>{label}</span>
                      <span style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: '#304035' }}>{fmt(va)}</span>
                      <span style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: '#304035' }}>{fmt(vb)}</span>
                      <span style={{ textAlign: 'right' }}><DeltaValue a={va} b={vb} /></span>
                    </div>
                  ))}
                </div>

                {/* Avertissement humain */}
                <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.18)' }}>
                  <AlertTriangle size={15} color="#ea580c" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ margin: 0, fontSize: 11.5, color: '#9a4a12', lineHeight: 1.4 }}>
                    Comparaison automatique basée sur la <b>description</b> des lignes. Deux lignes libellées différemment ne seront pas rapprochées — <b>vérifiez toujours</b> avant toute décision.
                  </p>
                </div>
              </div>
            ) : null}

            {/* Footer */}
            <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(48,64,53,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#fafaf8' }}>
              <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: '#304035', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Fermer <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
