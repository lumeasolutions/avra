'use client';

/**
 * TABLEAU 3 — Statistiques par VENDEUR (Cassandra, Sylvie, Christian, …)
 *
 * Pour chaque vendeur (snapshotté sur Dossier.vendeurName) :
 *   - Nb dossiers perdus
 *   - Nb dossiers en cours
 *   - Nb dossiers vendus
 *   - CA HT (somme des prixVenteHT des lignes des dossiers vendus)
 *   - Taux conversion = vendu / (vendu + en cours + perdu)
 *
 * + Camembert répartition CA par vendeur.
 *
 * Architecture : demande asso 19/05/2026.
 */

import { useMemo } from 'react';
import type { Dossier, DossierSigne, DossierPerdu } from '@/store/useDossierStore';

interface Props {
  dossiers: Dossier[];
  dossiersSignes: DossierSigne[];
  dossiersPerdus: DossierPerdu[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const PALETTE = ['#16a34a', '#7c3aed', '#2563eb', '#a67749', '#dc2626', '#0891b2', '#ea580c', '#0f766e'];
function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

const SANS_VENDEUR = 'Sans vendeur attribué';

export function StatsTableauVendeur({ dossiers, dossiersSignes, dossiersPerdus }: Props) {
  const rows = useMemo(() => {
    // Indexation par vendeur. Un dossier sans vendeur tombe dans SANS_VENDEUR.
    const map = new Map<string, { perdu: number; enCours: number; vendu: number; ca: number }>();
    const bump = (key: string) => {
      if (!map.has(key)) map.set(key, { perdu: 0, enCours: 0, vendu: 0, ca: 0 });
      return map.get(key)!;
    };
    for (const d of dossiers)        bump(d.vendeurName?.trim() || SANS_VENDEUR).enCours++;
    for (const d of dossiersPerdus)  bump(d.vendeurName?.trim() || SANS_VENDEUR).perdu++;
    for (const d of dossiersSignes) {
      const v = bump(d.vendeurName?.trim() || SANS_VENDEUR);
      v.vendu++;
      v.ca += (d.prixLignes ?? []).reduce((s, l) => s + l.prixVenteHT, 0);
    }
    return Array.from(map.entries())
      .map(([name, v]) => {
        const total = v.perdu + v.enCours + v.vendu;
        return {
          name,
          perdu: v.perdu,
          enCours: v.enCours,
          vendu: v.vendu,
          ca: v.ca,
          tauxConv: total > 0 ? Math.round((v.vendu / total) * 100) : 0,
          color: colorFor(name),
        };
      })
      .sort((a, b) => b.ca - a.ca);
  }, [dossiers, dossiersSignes, dossiersPerdus]);

  const totalCA = rows.reduce((s, r) => s + r.ca, 0);
  // Pie data : répartition CA (si pas de CA on tombe sur la répartition vendus)
  const pieValues = totalCA > 0 ? rows.map((r) => ({ name: r.name, value: r.ca, color: r.color, pct: Math.round((r.ca / totalCA) * 100) }))
    : rows.map((r) => ({ name: r.name, value: r.vendu, color: r.color, pct: 0 }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Tableau */}
      <div style={{ background: '#fff', border: '1px solid rgba(48,64,53,0.08)', borderRadius: 16, overflow: 'hidden' }}>
        {rows.length === 0 ? (
          <div style={{ padding: 28, textAlign: 'center', color: 'rgba(48,64,53,0.4)', fontSize: 13 }}>
            Aucun dossier pour calculer les statistiques par vendeur.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(48,64,53,0.04)' }}>
                <th style={thStyle}>Vendeur</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Perdu</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>En cours</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Vendu</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>CA HT</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Taux conv.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} style={{ borderTop: '1px solid rgba(48,64,53,0.06)' }}>
                  <td style={{ ...tdStyle, fontWeight: 700, color: r.color, textDecoration: 'underline', textUnderlineOffset: 3 }}>{r.name}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: '#dc2626' }}>{r.perdu}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: '#2563eb' }}>{r.enCours}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>{r.vendu}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: r.color, fontWeight: 700 }}>{fmt(r.ca)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: r.color, fontWeight: 700 }}>{r.tauxConv}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Camembert répartition CA par vendeur */}
      {rows.length > 0 && pieValues.some((p) => p.value > 0) && (
        <PieByVendeur data={pieValues} totalLabel={totalCA > 0 ? fmt(totalCA) : `${rows.reduce((s, r) => s + r.vendu, 0)} ventes`} subLabel={totalCA > 0 ? 'CA TOTAL' : 'VENTES'} />
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

function PieByVendeur({ data, totalLabel, subLabel }: { data: Array<{ name: string; value: number; color: string; pct: number }>; totalLabel: string; subLabel: string }) {
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
      return { path, color: d.color, label: d.name, pct: Math.round(pctF * 100) };
    });

  return (
    <div style={{ background: '#fff', border: '1px solid rgba(48,64,53,0.08)', borderRadius: 16, padding: 24 }}>
      <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 800, color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Répartition du CA par vendeur
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 30, justifyContent: 'center', flexWrap: 'wrap' }}>
        <svg viewBox="0 0 200 200" style={{ width: 180, height: 180 }}>
          {segments.map((s, i) => (
            <path key={i} d={s.path} fill={s.color} />
          ))}
          <circle cx="100" cy="100" r="38" fill="#fff" />
          <text x="100" y="98" textAnchor="middle" fontSize="13" fontWeight="800" fill="#304035">{totalLabel}</text>
          <text x="100" y="116" textAnchor="middle" fontSize="9" fill="rgba(48,64,53,0.55)" letterSpacing="0.08em">{subLabel}</text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.filter(d => d.value > 0).map((d) => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: d.color }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#304035', minWidth: 100 }}>{d.name}</span>
              <span style={{ fontSize: 13, color: 'rgba(48,64,53,0.6)' }}>{Math.round((d.value / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
