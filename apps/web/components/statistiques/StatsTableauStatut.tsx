'use client';

/**
 * TABLEAU 1 — Statistiques par STATUT (vendu / en cours / perdu).
 *
 * - VENDU : alimenté par les prixLignes des dossiers signés (gate obligatoire).
 * - EN COURS : prixLignes facultatifs via le bouton "+ Renseigner" (26/05/2026).
 * - PERDU   : idem facultatif via le bouton "+ Renseigner".
 *
 * Quand aucune prixLigne n'est renseignée sur une catégorie, on retombe sur le
 * montantEstime (vente prévisionnelle) avec un drapeau "≈" indiquant que c'est
 * une estimation, pas une donnée saisie.
 */

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { Dossier, DossierSigne, DossierPerdu, DossierPrixLigne } from '@/store/useDossierStore';
import { useDossierStore } from '@/store/useDossierStore';
import { StatsManualEntryModal } from './StatsManualEntryModal';

interface Props {
  dossiers: Dossier[];           // en cours
  dossiersSignes: DossierSigne[]; // vendus
  dossiersPerdus: DossierPerdu[]; // perdus
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const sumLignes = (lignes: DossierPrixLigne[] | undefined, field: 'prixAchatHT' | 'prixVenteHT'): number =>
  (lignes ?? []).reduce((s, l) => s + l[field], 0);

export function StatsTableauStatut({ dossiers, dossiersSignes, dossiersPerdus }: Props) {
  // [26/05/2026] Modale de saisie manuelle (en cours / perdus).
  const [editingCategory, setEditingCategory] = useState<'VENDU' | 'EN_COURS' | 'PERDU' | null>(null);
  const addDossierPrixLigne = useDossierStore((s) => s.addDossierPrixLigne);
  const removeDossierPrixLigne = useDossierStore((s) => s.removeDossierPrixLigne);
  const updateDossierPrixLigne = useDossierStore((s) => s.updateDossierPrixLigne);

  const rows = useMemo(() => {
    // VENDU = totaux des prixLignes signés
    const venduAchat = dossiersSignes.reduce((s, d) => s + sumLignes(d.prixLignes, 'prixAchatHT'), 0);
    const venduVente = dossiersSignes.reduce((s, d) => s + sumLignes(d.prixLignes, 'prixVenteHT'), 0);

    // EN COURS = totaux des prixLignes si saisis, sinon montantEstime en vente
    const enCoursAchatSaisi = dossiers.reduce((s, d) => s + sumLignes(d.prixLignes, 'prixAchatHT'), 0);
    const enCoursVenteSaisi = dossiers.reduce((s, d) => s + sumLignes(d.prixLignes, 'prixVenteHT'), 0);
    const enCoursVenteEstime = dossiers.reduce((s, d) => s + ((d as any).montantEstime ?? 0), 0);
    const enCoursLignesCount = dossiers.reduce((s, d) => s + (d.prixLignes?.length ?? 0), 0);
    const enCoursHasInputs = enCoursLignesCount > 0;

    // PERDU = idem
    const perduAchatSaisi = dossiersPerdus.reduce((s, d) => s + sumLignes(d.prixLignes, 'prixAchatHT'), 0);
    const perduVenteSaisi = dossiersPerdus.reduce((s, d) => s + sumLignes(d.prixLignes, 'prixVenteHT'), 0);
    const perduVenteEstime = dossiersPerdus.reduce((s, d) => s + (d.montantEstime ?? 0), 0);
    const perduLignesCount = dossiersPerdus.reduce((s, d) => s + (d.prixLignes?.length ?? 0), 0);
    const perduHasInputs = perduLignesCount > 0;

    return [
      {
        key: 'VENDU',
        label: 'VENDU',
        color: '#16a34a',
        doss: dossiersSignes.length,
        achat: venduAchat,
        vente: venduVente,
        marge: venduVente - venduAchat,
        margePct: venduVente > 0 ? Math.round(((venduVente - venduAchat) / venduVente) * 100) : 0,
        hasInputs: venduAchat > 0 || venduVente > 0,
        // 26/05/2026 — VENDU est désormais éditable : permet de revenir sur
        // les prix d'un dossier déjà complété sans avoir à supprimer toutes
        // ses lignes pour ré-ouvrir le gate. Tout le monde peut éditer.
        editable: dossiersSignes.length > 0,
        approx: false,
      },
      {
        key: 'EN_COURS',
        label: 'EN COURS',
        color: '#2563eb',
        doss: dossiers.length,
        achat: enCoursHasInputs ? enCoursAchatSaisi : 0,
        vente: enCoursHasInputs ? enCoursVenteSaisi : enCoursVenteEstime,
        marge: enCoursHasInputs ? enCoursVenteSaisi - enCoursAchatSaisi : 0,
        margePct: enCoursHasInputs && enCoursVenteSaisi > 0
          ? Math.round(((enCoursVenteSaisi - enCoursAchatSaisi) / enCoursVenteSaisi) * 100)
          : 0,
        hasInputs: enCoursHasInputs,
        editable: dossiers.length > 0,
        approx: !enCoursHasInputs && enCoursVenteEstime > 0,
      },
      {
        key: 'PERDU',
        label: 'PERDU',
        color: '#dc2626',
        doss: dossiersPerdus.length,
        achat: perduHasInputs ? perduAchatSaisi : 0,
        vente: perduHasInputs ? perduVenteSaisi : perduVenteEstime,
        marge: perduHasInputs ? perduVenteSaisi - perduAchatSaisi : 0,
        margePct: perduHasInputs && perduVenteSaisi > 0
          ? Math.round(((perduVenteSaisi - perduAchatSaisi) / perduVenteSaisi) * 100)
          : 0,
        hasInputs: perduHasInputs,
        editable: dossiersPerdus.length > 0,
        approx: !perduHasInputs && perduVenteEstime > 0,
      },
    ];
  }, [dossiers, dossiersSignes, dossiersPerdus]);

  // Camembert
  const totalDoss = rows.reduce((s, r) => s + r.doss, 0);
  const pieData = rows.map((r) => ({
    label: r.label,
    value: r.doss,
    color: r.color,
    pct: totalDoss > 0 ? Math.round((r.doss / totalDoss) * 100) : 0,
  }));

  // Dossiers édités selon la catégorie ouverte
  const editingDossiers =
    editingCategory === 'VENDU' ? dossiersSignes
    : editingCategory === 'EN_COURS' ? dossiers
    : editingCategory === 'PERDU' ? dossiersPerdus
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Tableau */}
      <div style={{
        background: '#fff', border: '1px solid rgba(48,64,53,0.08)',
        borderRadius: 16, overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(48,64,53,0.04)' }}>
              <th style={thStyle}>Statut</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Doss</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Achat HT</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Vente HT</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Marge HT</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Marge %</th>
              <th style={thStyle} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} style={{ borderTop: '1px solid rgba(48,64,53,0.06)' }}>
                <td style={{ ...tdStyle, fontWeight: 800, color: r.color }}>{r.label}</td>
                <td style={{ ...tdStyle, textAlign: 'right', color: r.color }}>{r.doss}</td>
                <td style={{ ...tdStyle, textAlign: 'right', color: r.color }}>
                  {r.achat > 0 ? fmt(r.achat) : '—'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: r.color }}>
                  {r.vente > 0 ? (
                    <>
                      {r.approx && <span style={{ opacity: 0.55, marginRight: 3 }}>≈</span>}
                      {fmt(r.vente)}
                    </>
                  ) : '—'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: r.color, fontWeight: 700 }}>
                  {r.hasInputs && r.achat > 0 && r.vente > 0 ? fmt(r.marge) : '—'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: r.color, fontWeight: 700 }}>
                  {r.hasInputs && r.achat > 0 && r.vente > 0 ? `${r.margePct}%` : '—'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', padding: '10px 14px' }}>
                  {r.editable && (
                    <button
                      onClick={() => setEditingCategory(r.key as 'VENDU' | 'EN_COURS' | 'PERDU')}
                      style={{
                        padding: '5px 10px', borderRadius: 7,
                        border: `1px solid ${r.color}40`,
                        background: `${r.color}10`,
                        color: r.color, fontSize: 11, fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        whiteSpace: 'nowrap',
                      }}
                      title={`Renseigner les prix sur les dossiers ${r.label.toLowerCase()}`}
                    >
                      <Plus size={11} />
                      {r.hasInputs ? 'Modifier' : 'Renseigner'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Légende symboles */}
        {rows.some((r) => r.approx) && (
          <div style={{
            padding: '8px 18px', fontSize: 11, color: 'rgba(48,64,53,0.55)',
            borderTop: '1px solid rgba(48,64,53,0.06)', background: '#fafaf8',
            fontStyle: 'italic',
          }}>
            <span style={{ opacity: 0.7 }}>≈</span> = montant estimé (devis prévisionnel). Cliquez sur
            "Renseigner" pour entrer les prix réels.
          </div>
        )}
      </div>

      {/* Camembert répartition des statuts */}
      {totalDoss > 0 && <PieChart data={pieData} />}

      {/* Modale de saisie manuelle */}
      {editingCategory && (
        <StatsManualEntryModal
          title={
            editingCategory === 'VENDU'
              ? 'Modifier les prix des dossiers VENDUS'
              : editingCategory === 'EN_COURS'
              ? 'Renseigner les dossiers EN COURS'
              : 'Renseigner les dossiers PERDUS'
          }
          accentColor={
            editingCategory === 'VENDU' ? '#16a34a'
            : editingCategory === 'EN_COURS' ? '#2563eb'
            : '#dc2626'
          }
          dossiers={editingDossiers}
          onAddLigne={addDossierPrixLigne}
          onRemoveLigne={removeDossierPrixLigne}
          onUpdateLigne={updateDossierPrixLigne}
          onClose={() => setEditingCategory(null)}
        />
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '14px 18px',
  fontSize: 11,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'rgba(48,64,53,0.55)',
  textAlign: 'left',
};
const tdStyle: React.CSSProperties = {
  padding: '14px 18px',
  fontSize: 14,
  color: '#304035',
};

function PieChart({ data }: { data: Array<{ label: string; value: number; color: string; pct: number }> }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  let cumul = 0;
  const segments = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const pctF = d.value / total;
      const angle = pctF * 360;
      const start = cumul;
      const end = cumul + angle;
      cumul = end;
      const largeArc = angle > 180 ? 1 : 0;
      const startRad = ((start - 90) * Math.PI) / 180;
      const endRad = ((end - 90) * Math.PI) / 180;
      const r = 80;
      const cx = 100, cy = 100;
      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);
      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      return { path, color: d.color, label: d.label, pct: d.pct };
    });

  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(48,64,53,0.08)',
      borderRadius: 16, padding: 24,
    }}>
      <p style={{
        margin: '0 0 16px', fontSize: 11, fontWeight: 800,
        color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        Répartition des dossiers
      </p>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 30,
        justifyContent: 'center', flexWrap: 'wrap',
      }}>
        <svg viewBox="0 0 200 200" style={{ width: 180, height: 180 }}>
          {segments.map((s, i) => (
            <path key={i} d={s.path} fill={s.color} />
          ))}
          <circle cx="100" cy="100" r="38" fill="#fff" />
          <text x="100" y="98" textAnchor="middle" fontSize="22" fontWeight="800" fill="#304035">{total}</text>
          <text x="100" y="116" textAnchor="middle" fontSize="9" fill="rgba(48,64,53,0.55)" letterSpacing="0.08em">DOSSIERS</text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.map((d) => (
            <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: d.color }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#304035', minWidth: 80 }}>{d.label}</span>
              <span style={{ fontSize: 13, color: 'rgba(48,64,53,0.6)' }}>{d.value} · {d.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
