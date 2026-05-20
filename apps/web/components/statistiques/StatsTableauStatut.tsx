'use client';

/**
 * TABLEAU 1 — Statistiques par STATUT (vendu / en cours / perdu)
 * Architecture : demande asso 19/05/2026.
 */

import { useMemo } from 'react';
import type { Dossier, DossierSigne, DossierPerdu } from '@/store/useDossierStore';

interface Props {
  dossiers: Dossier[];           // en cours
  dossiersSignes: DossierSigne[]; // vendus
  dossiersPerdus: DossierPerdu[]; // perdus
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export function StatsTableauStatut({ dossiers, dossiersSignes, dossiersPerdus }: Props) {
  const rows = useMemo(() => {
    // VENDU = dossiers signés avec leurs prixLignes
    const venduAchat = dossiersSignes.reduce(
      (s, d) => s + (d.prixLignes ?? []).reduce((a, l) => a + l.prixAchatHT, 0),
      0,
    );
    const venduVente = dossiersSignes.reduce(
      (s, d) => s + (d.prixLignes ?? []).reduce((a, l) => a + l.prixVenteHT, 0),
      0,
    );

    // EN COURS = devis estimés. On utilise montantEstime sur Dossier si présent,
    // sinon 0. Pas de marge connue tant que pas signé.
    const enCoursVente = dossiers.reduce((s, d) => s + ((d as any).montantEstime ?? 0), 0);

    // PERDU = montantEstime des dossiers perdus
    const perduVente = dossiersPerdus.reduce((s, d) => s + (d.montantEstime ?? 0), 0);

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
      },
      {
        key: 'EN_COURS',
        label: 'EN COURS',
        color: '#2563eb',
        doss: dossiers.length,
        achat: 0,
        vente: enCoursVente,
        marge: 0,
        margePct: 0,
        isProjection: true,
      },
      {
        key: 'PERDU',
        label: 'PERDU',
        color: '#dc2626',
        doss: dossiersPerdus.length,
        achat: 0,
        vente: perduVente,
        marge: 0,
        margePct: 0,
        isProjection: true,
      },
    ];
  }, [dossiers, dossiersSignes, dossiersPerdus]);

  // Données du camembert : répartition par nombre de dossiers
  const totalDoss = rows.reduce((s, r) => s + r.doss, 0);
  const pieData = rows.map((r) => ({
    label: r.label,
    value: r.doss,
    color: r.color,
    pct: totalDoss > 0 ? Math.round((r.doss / totalDoss) * 100) : 0,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Tableau */}
      <div style={{ background: '#fff', border: '1px solid rgba(48,64,53,0.08)', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(48,64,53,0.04)' }}>
              <th style={thStyle}>Statut</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Doss</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Achat HT</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Vente HT</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Marge HT</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Marge %</th>
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
                  {r.vente > 0 ? fmt(r.vente) : '—'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: r.color, fontWeight: 700 }}>
                  {r.achat > 0 && r.vente > 0 ? fmt(r.marge) : '—'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: r.color, fontWeight: 700 }}>
                  {r.achat > 0 && r.vente > 0 ? `${r.margePct}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Camembert répartition des statuts */}
      {totalDoss > 0 && <PieChart data={pieData} />}
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
    <div style={{ background: '#fff', border: '1px solid rgba(48,64,53,0.08)', borderRadius: 16, padding: 24 }}>
      <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 800, color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Répartition des dossiers
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 30, justifyContent: 'center', flexWrap: 'wrap' }}>
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
