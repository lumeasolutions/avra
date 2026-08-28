'use client';

/**
 * CompareDevisPdfModal — « Comparer 2 devis PDF » (v4, assisté IA).
 *
 * Pour deux devis qui existent en PDF (pas créés dans l'app) : on extrait le
 * TEXTE de chaque PDF côté navigateur (pdfjs), l'IA le structure en lignes
 * (route /api/ia/compare-devis-pdf), puis on réutilise la comparaison
 * DÉTERMINISTE de la v1 (buildDevisDiff) : ajoutée / retirée / modifiée + écarts.
 * L'extraction peut se tromper → lignes affichées + avertissement « vérifiez ».
 */
import { useState } from 'react';
import { GitCompare, X, FileUp, Loader2, Wand2, RefreshCw, ShieldAlert, AlertTriangle, Plus, Minus, Pencil, FileText } from 'lucide-react';
import { fmt } from '@/app/(app)/facturation/lib/utils';
import { buildDevisDiff, ligneHT, KIND_CFG, type DiffLine } from '@/app/(app)/facturation/lib/devisDiff';

interface PdfDevis {
  objet: string | null;
  client: string | null;
  date: string | null;
  totalHT: number | null;
  lignes: DiffLine[];
}
interface Result {
  devisA: PdfDevis;
  devisB: PdfDevis;
  confidence: number | null;
  notes: string;
}

/** Extrait le texte d'un PDF côté navigateur (même setup pdfjs que les aperçus). */
async function pdfFileToText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }
  const buf = await file.arrayBuffer();
  const task = pdfjsLib.getDocument({ data: new Uint8Array(buf), disableAutoFetch: true, disableStream: true });
  const pdf = await task.promise;
  const pages = Math.min(pdf.numPages, 15);
  let out = '';
  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    out += (tc.items as Array<{ str?: string }>).map((it) => it.str ?? '').join(' ') + '\n';
    page.cleanup();
  }
  return out.trim();
}

const sumHT = (lignes: DiffLine[]) => lignes.reduce((s, l) => s + ligneHT(l), 0);

/** Emplacement d'upload d'un PDF. */
function PdfSlot({ label, name, onPick, onClear }: { label: string; name: string | null; onPick: (f: File) => void; onClear: () => void }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(48,64,53,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{label}</div>
      {name ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(48,64,53,0.14)', background: '#f7f7f4' }}>
          <FileText size={20} color="#a67749" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, color: '#304035', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
          <button onClick={onClear} title="Retirer" style={{ width: 26, height: 26, borderRadius: 8, border: 'none', background: 'rgba(48,64,53,0.08)', color: '#304035', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>
      ) : (
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '22px 12px', borderRadius: 12, border: '1.5px dashed rgba(166,119,73,0.4)', background: 'rgba(166,119,73,0.04)', cursor: 'pointer', color: '#a67749', fontSize: 12, fontWeight: 700 }}>
          <FileUp size={22} />
          Importer un devis PDF
          <input type="file" accept=".pdf,application/pdf" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.currentTarget.value = ''; }} />
        </label>
      )}
    </div>
  );
}

function DevisHead({ tag, d }: { tag: string; d: PdfDevis }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, color: 'rgba(48,64,53,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{tag}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#304035', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.objet || 'Sans objet'}</div>
      <div style={{ fontSize: 11, color: 'rgba(48,64,53,0.5)' }}>{[d.client, d.date].filter(Boolean).join(' · ') || '—'}</div>
    </div>
  );
}

export function CompareDevisPdfModal({ onClose }: { onClose: () => void }) {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const both = !!fileA && !!fileB;

  const analyse = async () => {
    if (!fileA || !fileB) return;
    setLoading(true); setError(null); setResult(null);
    try {
      let textA: string, textB: string;
      try {
        [textA, textB] = await Promise.all([pdfFileToText(fileA), pdfFileToText(fileB)]);
      } catch {
        setError("Lecture des PDF impossible (fichier corrompu ou protégé).");
        return;
      }
      if (textA.length < 20 || textB.length < 20) {
        setError("Aucun texte extractible d'un des PDF (scanné/image ?). Utilisez « Comparer 2 photos » pour un devis scanné.");
        return;
      }
      const res = await fetch('/api/ia/compare-devis-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textA, textB }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data?.error || "L'extraction IA a échoué."); return; }
      if (!data?.devisA || !data?.devisB || !Array.isArray(data.devisA.lignes) || !Array.isArray(data.devisB.lignes)) {
        setError('Extraction incomplète — réessayez.'); return;
      }
      setResult(data as Result);
    } catch {
      setError("Erreur réseau pendant l'analyse.");
    } finally {
      setLoading(false);
    }
  };

  const diff = result ? buildDevisDiff(result.devisA.lignes, result.devisB.lignes) : [];
  const counts = {
    ajoute: diff.filter((r) => r.kind === 'ajoute').length,
    retire: diff.filter((r) => r.kind === 'retire').length,
    modifie: diff.filter((r) => r.kind === 'modifie').length,
  };
  const totA = result ? sumHT(result.devisA.lignes) : 0;
  const totB = result ? sumHT(result.devisB.lignes) : 0;
  const deltaTot = totB - totA;
  const lowConf = result?.confidence != null && result.confidence < 0.55;

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,20,17,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 62 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 860, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(48,64,53,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'linear-gradient(135deg, #2a3a30 0%, #3d5244 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(217,179,138,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <GitCompare size={18} color="#d9b38a" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>Comparer deux devis PDF</h2>
              <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'rgba(255,255,255,0.6)' }}>L'IA lit les 2 PDF, vous validez les écarts.</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ padding: 7, borderRadius: 9, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex' }}>
            <X size={17} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          {/* Upload */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <PdfSlot label="Devis A (référence)" name={fileA?.name ?? null} onPick={(f) => { setFileA(f); setResult(null); setError(null); }} onClear={() => { setFileA(null); setResult(null); setError(null); }} />
            <PdfSlot label="Devis B (comparé)" name={fileB?.name ?? null} onPick={(f) => { setFileB(f); setResult(null); setError(null); }} onClear={() => { setFileB(null); setResult(null); setError(null); }} />
          </div>

          {both && (
            <button
              onClick={analyse}
              disabled={loading}
              style={{ marginTop: 16, width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', borderRadius: 12, border: 'none', cursor: loading ? 'default' : 'pointer', background: loading ? 'rgba(48,64,53,0.15)' : 'linear-gradient(135deg, #a67749 0%, #c89665 100%)', color: '#fff', fontSize: 13.5, fontWeight: 800, boxShadow: loading ? 'none' : '0 4px 12px rgba(166,119,73,0.3)' }}
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Lecture des PDF & analyse…</> : result ? <><RefreshCw size={16} /> Relancer l'analyse</> : <><Wand2 size={16} /> Lire les 2 PDF et comparer</>}
            </button>
          )}

          {error && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
              <ShieldAlert size={15} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 12, color: '#b91c1c' }}>{error}</p>
            </div>
          )}

          {result && !error && (
            <div style={{ marginTop: 16 }}>
              {/* En-têtes devis extraits */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, background: 'rgba(48,64,53,0.04)', border: '1px solid rgba(48,64,53,0.08)' }}>
                <DevisHead tag="Devis A" d={result.devisA} />
                <ArrowSep />
                <DevisHead tag="Devis B" d={result.devisB} />
              </div>

              {/* Résumé compteurs */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, margin: '14px 2px 8px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 800, color: '#16a34a' }}><Plus size={13} />{counts.ajoute} ajoutée{counts.ajoute > 1 ? 's' : ''}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 800, color: '#dc2626' }}><Minus size={13} />{counts.retire} retirée{counts.retire > 1 ? 's' : ''}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 800, color: '#ea580c' }}><Pencil size={12} />{counts.modifie} modifiée{counts.modifie > 1 ? 's' : ''}</span>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: '#304035' }}>
                  Écart HT&nbsp;
                  <span style={{ color: Math.abs(deltaTot) < 0.005 ? 'rgba(48,64,53,0.4)' : deltaTot > 0 ? '#ea580c' : '#16a34a' }}>
                    {Math.abs(deltaTot) < 0.005 ? '—' : `${deltaTot > 0 ? '+' : '−'}${fmt(Math.abs(deltaTot))}`}
                  </span>
                </span>
              </div>

              {/* Table de diff */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {diff.map((r) => {
                  const cfg = KIND_CFG[r.kind];
                  return (
                    <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '84px 1fr 120px 120px', gap: 8, alignItems: 'center', padding: '9px 11px', borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                      <span style={{ fontSize: 9.5, fontWeight: 800, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 5, padding: '2px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>{cfg.label}</span>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#304035', minWidth: 0 }}>{r.description}</div>
                      <div style={{ textAlign: 'right' }}>
                        {r.a ? <><div style={{ fontSize: 12, fontWeight: 700, color: '#304035' }}>{fmt(ligneHT(r.a))}</div><div style={{ fontSize: 10, color: 'rgba(48,64,53,0.45)' }}>{r.a.quantite}×{fmt(r.a.prixUnitaireHT)}{r.a.remise ? ` −${r.a.remise}%` : ''}</div></> : <span style={{ color: 'rgba(48,64,53,0.3)' }}>—</span>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {r.b ? <><div style={{ fontSize: 12, fontWeight: 700, color: '#304035' }}>{fmt(ligneHT(r.b))}</div><div style={{ fontSize: 10, color: 'rgba(48,64,53,0.45)' }}>{r.b.quantite}×{fmt(r.b.prixUnitaireHT)}{r.b.remise ? ` −${r.b.remise}%` : ''}</div></> : <span style={{ color: 'rgba(48,64,53,0.3)' }}>—</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totaux */}
              <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr 120px 120px', gap: 8, marginTop: 8, padding: '10px 11px', borderRadius: 10, background: 'rgba(48,64,53,0.05)', fontWeight: 800, color: '#304035' }}>
                <span />
                <span style={{ fontSize: 12.5 }}>Total HT (calculé)</span>
                <span style={{ textAlign: 'right', fontSize: 12.5 }}>{fmt(totA)}</span>
                <span style={{ textAlign: 'right', fontSize: 12.5 }}>{fmt(totB)}</span>
              </div>

              {/* Confiance + notes */}
              {(result.confidence != null || result.notes) && (
                <p style={{ margin: '10px 2px 0', fontSize: 11.5, color: 'rgba(48,64,53,0.55)', fontStyle: 'italic' }}>
                  {result.confidence != null && <>Confiance extraction : <b>{Math.round(result.confidence * 100)}%</b>. </>}
                  {result.notes}
                </p>
              )}

              {/* Avertissement — toujours visible quand on a un résultat */}
              <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, background: lowConf ? 'rgba(220,38,38,0.06)' : 'rgba(249,115,22,0.06)', border: `1px solid ${lowConf ? 'rgba(220,38,38,0.22)' : 'rgba(249,115,22,0.18)'}` }}>
                <AlertTriangle size={15} color={lowConf ? '#dc2626' : '#ea580c'} style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 11.5, color: lowConf ? '#b91c1c' : '#9a4a12', lineHeight: 1.4 }}>
                  Ces lignes ont été <b>lues automatiquement</b> dans les PDF : l'IA peut mal lire un montant ou fusionner des lignes.
                  {lowConf ? ' Confiance faible ici — ' : ' '}<b>Vérifiez toujours</b> les chiffres sur les PDF d'origine avant de conclure.
                </p>
              </div>
            </div>
          )}

          {!both && !result && (
            <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12.5, color: 'rgba(48,64,53,0.5)' }}>
              Importez les <b>deux devis PDF</b> (A référence, B comparé). Les PDF <b>scannés</b> (image) ne contiennent pas de texte : préférez « Comparer 2 photos ».
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(48,64,53,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#fafaf8' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: '#304035', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

function ArrowSep() {
  return <span style={{ flexShrink: 0, color: 'rgba(48,64,53,0.35)', fontSize: 18, fontWeight: 800 }}>→</span>;
}
