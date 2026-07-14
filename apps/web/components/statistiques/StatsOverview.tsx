'use client';

/**
 * StatsOverview — refonte des statistiques (14/07/2026).
 *
 * Objectif : rendre les stats LUDIQUES, SIMPLES et bien DISTINGUÉES entre les
 * 3 natures de dossiers — Signés (vert), En cours (bleu), Perdus (rouge).
 *
 * Structure : Vue d'ensemble (3 cartes héros) → Performance (taux de
 * signature + marge + répartition) → Détail filtrable par rubrique.
 * La saisie manuelle des prix se fait via StatsManualEntryModal (plus d'IA).
 */

import { useMemo, useState, type ReactNode } from 'react';
import type { Dossier, DossierSigne, DossierPerdu, DossierPrixLigne } from '@/store/useDossierStore';
import { useDossierStore } from '@/store/useDossierStore';
import { StatsManualEntryModal } from './StatsManualEntryModal';

const GREEN = '#16a34a';
const BLUE = '#2563eb';
const RED = '#dc2626';

const eur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' €';
const sumLignes = (l: DossierPrixLigne[] | undefined, k: 'prixAchatHT' | 'prixVenteHT') =>
  (l ?? []).reduce((s, x) => s + (x[k] || 0), 0);

type Filter = 'tous' | 'VENDU' | 'EN_COURS' | 'PERDU';

interface Props {
  dossiers: Dossier[];
  dossiersSignes: DossierSigne[];
  dossiersPerdus: DossierPerdu[];
  /** Ouvre la modale de saisie « série » (rapide + auto-import) pour les signés. */
  onRenseignerSignes?: () => void;
}

export function StatsOverview({ dossiers, dossiersSignes, dossiersPerdus, onRenseignerSignes }: Props) {
  const addDossierPrixLigne = useDossierStore((s) => s.addDossierPrixLigne);
  const removeDossierPrixLigne = useDossierStore((s) => s.removeDossierPrixLigne);
  const updateDossierPrixLigne = useDossierStore((s) => s.updateDossierPrixLigne);

  const [filter, setFilter] = useState<Filter>('tous');
  const [editing, setEditing] = useState<'VENDU' | 'EN_COURS' | 'PERDU' | null>(null);

  const m = useMemo(() => {
    const vAchat = dossiersSignes.reduce((s, d) => s + sumLignes(d.prixLignes, 'prixAchatHT'), 0);
    const vVente = dossiersSignes.reduce((s, d) => s + sumLignes(d.prixLignes, 'prixVenteHT'), 0);

    const ecSaisi = dossiers.reduce((s, d) => s + sumLignes(d.prixLignes, 'prixVenteHT'), 0);
    const ecEstime = dossiers.reduce((s, d) => s + (((d as any).montantEstime as number) ?? 0), 0);
    const ecLignes = dossiers.reduce((s, d) => s + (d.prixLignes?.length ?? 0), 0);
    const ecVente = ecLignes > 0 ? ecSaisi : ecEstime;

    const pSaisi = dossiersPerdus.reduce((s, d) => s + sumLignes(d.prixLignes, 'prixVenteHT'), 0);
    const pEstime = dossiersPerdus.reduce((s, d) => s + (d.montantEstime ?? 0), 0);
    const pLignes = dossiersPerdus.reduce((s, d) => s + (d.prixLignes?.length ?? 0), 0);
    const pVente = pLignes > 0 ? pSaisi : pEstime;

    const nS = dossiersSignes.length, nE = dossiers.length, nP = dossiersPerdus.length;
    const conv = nS + nP > 0 ? Math.round((nS / (nS + nP)) * 100) : 0;
    const marge = vVente > 0 ? Math.round(((vVente - vAchat) / vVente) * 100) : 0;
    const panier = nS > 0 ? vVente / nS : 0;
    return {
      vAchat, vVente, vMarge: vVente - vAchat,
      ecVente, ecApprox: ecLignes === 0 && ecEstime > 0,
      pVente, pApprox: pLignes === 0 && pEstime > 0,
      nS, nE, nP, conv, marge, panier,
    };
  }, [dossiers, dossiersSignes, dossiersPerdus]);

  // Répartition « pourquoi on perd » (raisons normalisées).
  const reasons = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of dossiersPerdus) {
      const r = (d.reason || '').trim() || 'Non précisé';
      map.set(r, (map.get(r) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [dossiersPerdus]);

  // Détail « par fournisseur » sur les dossiers signés.
  const fournisseurRows = useMemo(() => {
    const map = new Map<string, { achat: number; vente: number }>();
    for (const d of dossiersSignes)
      for (const l of d.prixLignes ?? []) {
        const k = (l.fournisseur || 'Autre').trim() || 'Autre';
        const cur = map.get(k) ?? { achat: 0, vente: 0 };
        cur.achat += l.prixAchatHT || 0; cur.vente += l.prixVenteHT || 0;
        map.set(k, cur);
      }
    return Array.from(map.entries())
      .map(([f, v]) => ({ f, achat: v.achat, vente: v.vente, marge: v.vente - v.achat }))
      .sort((a, b) => b.vente - a.vente);
  }, [dossiersSignes]);

  const total = m.nS + m.nE + m.nP;
  const editingList: Array<Dossier | DossierPerdu> =
    editing === 'VENDU' ? dossiersSignes
    : editing === 'EN_COURS' ? dossiers
    : editing === 'PERDU' ? dossiersPerdus
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Cartes héros ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <HeroCard
          color={GREEN} label="Signés" icon="✓" count={m.nS}
          amount={eur(m.vVente)} sub={m.vVente > 0 ? `CA vendu · marge ${m.marge}%` : 'ce qu’on a gagné'}
          active={filter === 'VENDU'} onClick={() => setFilter(filter === 'VENDU' ? 'tous' : 'VENDU')}
        />
        <HeroCard
          color={BLUE} label="En cours" icon="◔" count={m.nE}
          amount={`${m.ecApprox ? '≈ ' : ''}${eur(m.ecVente)}`} sub="pipeline estimé"
          active={filter === 'EN_COURS'} onClick={() => setFilter(filter === 'EN_COURS' ? 'tous' : 'EN_COURS')}
        />
        <HeroCard
          color={RED} label="Perdus" icon="✕" count={m.nP}
          amount={`${m.pApprox ? '≈ ' : ''}${eur(m.pVente)}`} sub={m.nS + m.nP > 0 ? `CA perdu · taux ${100 - m.conv}%` : 'ce qu’on a raté'}
          active={filter === 'PERDU'} onClick={() => setFilter(filter === 'PERDU' ? 'tous' : 'PERDU')}
        />
      </div>

      {/* ── Performance ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <Panel>
          <div style={{ fontSize: 12, color: 'rgba(48,64,53,0.6)', marginBottom: 8 }}>Taux de signature</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 30, fontWeight: 800, color: GREEN }}>{m.conv}%</span>
            <span style={{ fontSize: 12, color: 'rgba(48,64,53,0.5)' }}>{m.nS} signés · {m.nP} perdus</span>
          </div>
          <div style={{ height: 10, borderRadius: 999, background: '#f1efe8', overflow: 'hidden', marginTop: 10, display: 'flex' }}>
            <div style={{ width: `${m.conv}%`, background: GREEN }} />
            <div style={{ width: `${100 - m.conv}%`, background: RED }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, gap: 8 }}>
            <Mini label="Marge moyenne" value={m.vVente > 0 ? `${m.marge}%` : '—'} />
            <Mini label="Panier moyen signé" value={m.nS > 0 ? eur(m.panier) : '—'} />
          </div>
        </Panel>

        <Panel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Donut sig={m.nS} enc={m.nE} perd={m.nP} />
            <div style={{ fontSize: 12, lineHeight: 1.9 }}>
              <div style={{ color: 'rgba(48,64,53,0.6)', marginBottom: 2 }}>Répartition · {total} dossiers</div>
              <Legend color={GREEN} text={`Signés · ${m.nS}`} />
              <Legend color={BLUE} text={`En cours · ${m.nE}`} />
              <Legend color={RED} text={`Perdus · ${m.nP}`} />
            </div>
          </div>
        </Panel>
      </div>

      {/* ── Filtre + détail ── */}
      <div>
        <div style={{ display: 'inline-flex', background: '#f1efe8', borderRadius: 10, padding: 3, gap: 2 }}>
          {([['tous', 'Tous'], ['VENDU', 'Signés'], ['EN_COURS', 'En cours'], ['PERDU', 'Perdus']] as [Filter, string][]).map(([k, l]) => {
            const on = filter === k;
            return (
              <button key={k} onClick={() => setFilter(k)}
                style={{ border: 'none', cursor: 'pointer', borderRadius: 8, padding: '6px 13px', fontSize: 12.5, fontWeight: 700, background: on ? '#304035' : 'transparent', color: on ? '#fff' : 'rgba(48,64,53,0.55)' }}>
                {l}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 12 }}>
          {filter === 'tous' && (
            <Card>
              <SimpleTable head={['Rubrique', 'Montant', 'Volume']} rows={[
                ['Signés', eur(m.vVente), `${m.nS} dossiers`],
                ['En cours', `${m.ecApprox ? '≈ ' : ''}${eur(m.ecVente)}`, `${m.nE} dossiers`],
                ['Perdus', `${m.pApprox ? '≈ ' : ''}${eur(m.pVente)}`, `${m.nP} dossiers`],
              ]} colors={[GREEN, BLUE, RED]} />
            </Card>
          )}

          {filter === 'VENDU' && (
            <Card>
              <EditBar color={GREEN} text="Prix des dossiers signés" onEdit={onRenseignerSignes ?? (() => setEditing('VENDU'))} />
              {fournisseurRows.length === 0
                ? <Empty text="Renseignez les prix des dossiers signés pour voir le détail par fournisseur." />
                : <SimpleTable head={['Fournisseur', 'CA vendu', 'Marge']} rows={fournisseurRows.map((r) => [r.f, eur(r.vente), r.vente > 0 ? `${Math.round((r.marge / r.vente) * 100)}%` : '—'])} />}
            </Card>
          )}

          {filter === 'EN_COURS' && (
            <Card>
              <EditBar color={BLUE} text="Renseigner les prix — dossiers en cours" onEdit={() => setEditing('EN_COURS')} />
              {dossiers.length === 0
                ? <Empty text="Aucun dossier en cours." />
                : <SimpleTable head={['Dossier', 'Montant estimé', '']} rows={dossiers.map((d) => {
                    const v = d.prixLignes?.length ? sumLignes(d.prixLignes, 'prixVenteHT') : (((d as any).montantEstime as number) ?? 0);
                    return [(d as any).name ?? 'Dossier', v > 0 ? `${d.prixLignes?.length ? '' : '≈ '}${eur(v)}` : '—', ''];
                  })} />}
            </Card>
          )}

          {filter === 'PERDU' && (
            <Card>
              <EditBar color={RED} text="Renseigner les prix — dossiers perdus" onEdit={() => setEditing('PERDU')} />
              {reasons.length > 0 && (
                <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(48,64,53,0.06)' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(48,64,53,0.5)', marginBottom: 7 }}>Pourquoi on perd</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {reasons.map(([r, n]) => (
                      <span key={r} style={{ fontSize: 12, fontWeight: 600, background: '#fbeceb', color: '#a3231f', borderRadius: 999, padding: '4px 11px' }}>{r} · {n}</span>
                    ))}
                  </div>
                </div>
              )}
              {dossiersPerdus.length === 0
                ? <Empty text="Aucun dossier perdu." />
                : <SimpleTable head={['Dossier', 'Montant', 'Raison']} rows={dossiersPerdus.map((d) => {
                    const v = d.prixLignes?.length ? sumLignes(d.prixLignes, 'prixVenteHT') : (d.montantEstime ?? 0);
                    return [d.name, v > 0 ? `${d.prixLignes?.length ? '' : '≈ '}${eur(v)}` : '—', (d.reason || '—').trim() || '—'];
                  })} />}
            </Card>
          )}
        </div>
      </div>

      {editing && (
        <StatsManualEntryModal
          title={editing === 'VENDU' ? 'Modifier les prix des dossiers signés' : editing === 'EN_COURS' ? 'Renseigner les dossiers en cours' : 'Renseigner les dossiers perdus'}
          accentColor={editing === 'VENDU' ? GREEN : editing === 'EN_COURS' ? BLUE : RED}
          dossiers={editingList}
          onAddLigne={addDossierPrixLigne}
          onRemoveLigne={removeDossierPrixLigne}
          onUpdateLigne={updateDossierPrixLigne}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function HeroCard({ color, label, icon, count, amount, sub, active, onClick }: {
  color: string; label: string; icon: string; count: number; amount: string; sub: string; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      style={{ textAlign: 'left', cursor: 'pointer', border: `1px solid ${active ? color : color + '33'}`, background: color + '12', borderRadius: 16, padding: 14, transition: 'all 0.12s', boxShadow: active ? `0 0 0 2px ${color}33` : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#1a2a1e', lineHeight: 1 }}>{count}</div>
      <div style={{ fontSize: 12, color: 'rgba(48,64,53,0.55)', marginTop: 2 }}>dossiers</div>
      <div style={{ fontSize: 15, fontWeight: 700, color, marginTop: 8 }}>{amount}</div>
      <div style={{ fontSize: 11, color: 'rgba(48,64,53,0.5)' }}>{sub}</div>
    </button>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <div style={{ background: '#fff', border: '1px solid rgba(48,64,53,0.08)', borderRadius: 14, padding: 14 }}>{children}</div>;
}
function Card({ children }: { children: ReactNode }) {
  return <div style={{ background: '#fff', border: '1px solid rgba(48,64,53,0.08)', borderRadius: 14, overflow: 'hidden' }}>{children}</div>;
}
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'rgba(48,64,53,0.5)' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#304035' }}>{value}</div>
    </div>
  );
}
function Legend({ color, text }: { color: string; text: string }) {
  return <div><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: color, marginRight: 6 }} />{text}</div>;
}
function Empty({ text }: { text: string }) {
  return <div style={{ padding: '22px 16px', textAlign: 'center', fontSize: 13, color: 'rgba(48,64,53,0.45)' }}>{text}</div>;
}
function EditBar({ color, text, onEdit }: { color: string; text: string; onEdit: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 14px', background: '#fff8ef', borderBottom: '1px solid #f0e7d8' }}>
      <span style={{ fontSize: 12, color: '#7a5327' }}>{text}</span>
      <button onClick={onEdit}
        style={{ border: `1px solid ${color}55`, background: color + '12', color, borderRadius: 8, padding: '5px 11px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
        + Renseigner
      </button>
    </div>
  );
}

function SimpleTable({ head, rows, colors }: { head: string[]; rows: string[][]; colors?: string[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: 'rgba(48,64,53,0.03)' }}>
          {head.map((h, i) => (
            <th key={i} style={{ textAlign: i ? 'right' : 'left', padding: '9px 14px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(48,64,53,0.5)' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri} style={{ borderTop: '1px solid rgba(48,64,53,0.06)' }}>
            {r.map((c, ci) => (
              <td key={ci} style={{ padding: '10px 14px', textAlign: ci ? 'right' : 'left', color: ci === 0 && colors ? colors[ri] : '#1a2a1e', fontWeight: ci === 0 ? 700 : 400 }}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Donut({ sig, enc, perd }: { sig: number; enc: number; perd: number }) {
  const total = sig + enc + perd || 1;
  const C = 100; // circonférence (r ≈ 15.915)
  const segs = [
    { v: sig, c: GREEN }, { v: enc, c: BLUE }, { v: perd, c: RED },
  ];
  let offset = 25; // départ en haut
  return (
    <svg viewBox="0 0 42 42" width="92" height="92" aria-hidden="true">
      <circle cx="21" cy="21" r="15.915" fill="none" stroke="#f1efe8" strokeWidth="6" />
      {segs.map((s, i) => {
        const len = (s.v / total) * C;
        const el = <circle key={i} cx="21" cy="21" r="15.915" fill="none" stroke={s.c} strokeWidth="6" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={offset} />;
        offset -= len;
        return el;
      })}
    </svg>
  );
}
