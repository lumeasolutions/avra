'use client';

/**
 * TABLEAU 2 — Statistiques par FOURNISSEUR (LEICHT, BORA, LAPALMA, FRANKE, MSA, …)
 *
 * Aggregation des lignes prix de tous les dossiers signés par fournisseur :
 *   - Nb dossiers distincts dans lesquels apparaît ce fournisseur
 *   - Somme achat HT
 *   - Somme vente HT
 *   - Marge HT
 *
 * + Barre de recherche pour filtrer par nom de fournisseur.
 * + Graphique barres comparatif.
 *
 * Architecture : demande asso 19/05/2026.
 */

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { DossierSigne } from '@/store/useDossierStore';

interface Props {
  dossiersSignes: DossierSigne[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

// Palette de couleurs cyclique pour les fournisseurs (assignée par hash du nom
// pour rester stable d'un render à l'autre).
const PALETTE = ['#16a34a', '#2563eb', '#dc2626', '#a67749', '#0891b2', '#7c3aed', '#ea580c', '#0f766e'];
function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export function StatsTableauFournisseur({ dossiersSignes }: Props) {
  const [search, setSearch] = useState('');

  const aggregated = useMemo(() => {
    // Clé = fournisseur uppercased pour dédoubler "Leicht" / "LEICHT" / "leicht"
    const map = new Map<string, { name: string; dossierIds: Set<string>; achat: number; vente: number }>();
    for (const d of dossiersSignes) {
      for (const l of d.prixLignes ?? []) {
        const key = l.fournisseur.trim().toUpperCase();
        if (!key) continue;
        const existing = map.get(key) ?? {
          name: l.fournisseur.trim().toUpperCase(),
          dossierIds: new Set(),
          achat: 0,
          vente: 0,
        };
        existing.dossierIds.add(d.id);
        existing.achat += l.prixAchatHT;
        existing.vente += l.prixVenteHT;
        map.set(key, existing);
      }
    }
    return Array.from(map.values())
      .map((e) => ({
        name: e.name,
        doss: e.dossierIds.size,
        achat: e.achat,
        vente: e.vente,
        marge: e.vente - e.achat,
        margePct: e.vente > 0 ? Math.round(((e.vente - e.achat) / e.vente) * 100) : 0,
        color: colorFor(e.name),
      }))
      .sort((a, b) => b.vente - a.vente);
  }, [dossiersSignes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return aggregated;
    return aggregated.filter((r) => r.name.toLowerCase().includes(q));
  }, [aggregated, search]);

  const maxVente = Math.max(1, ...filtered.map((r) => r.vente));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Barre de recherche */}
      <div style={{ position: 'relative' }}>
        <Search size={15} color="rgba(48,64,53,0.4)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un fournisseur (FRANKE, BORA, LAPALMA…)"
          style={{ width: '100%', padding: '11px 14px 11px 38px', border: '1px solid rgba(48,64,53,0.12)', borderRadius: 12, fontSize: 13, color: '#304035', background: '#fff', outline: 'none' }}
        />
      </div>

      {/* Tableau */}
      <div style={{ background: '#fff', border: '1px solid rgba(48,64,53,0.08)', borderRadius: 16, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 28, textAlign: 'center', color: 'rgba(48,64,53,0.4)', fontSize: 13 }}>
            {aggregated.length === 0
              ? 'Aucune ligne fournisseur saisie pour l\'instant.'
              : 'Aucun fournisseur ne correspond à votre recherche.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(48,64,53,0.04)' }}>
                <th style={thStyle}>Fournisseur</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Doss</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Achat HT</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Vente HT</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Marge HT</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.name} style={{ borderTop: '1px solid rgba(48,64,53,0.06)' }}>
                  <td style={{ ...tdStyle, fontWeight: 700, color: r.color, textDecoration: 'underline', textUnderlineOffset: 3 }}>{r.name}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: r.color }}>{r.doss}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: r.color }}>{fmt(r.achat)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: r.color }}>{fmt(r.vente)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: r.color, fontWeight: 700 }}>{fmt(r.marge)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Graphique barres comparatif vente HT */}
      {filtered.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid rgba(48,64,53,0.08)', borderRadius: 16, padding: 24 }}>
          <p style={{ margin: '0 0 18px', fontSize: 11, fontWeight: 800, color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Comparatif vente HT par fournisseur
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, height: 180, padding: '0 12px' }}>
            {filtered.map((r) => {
              const heightPct = (r.vente / maxVente) * 100;
              return (
                <div key={r.name} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 30 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#304035' }}>{fmt(r.vente)}</span>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 50,
                      height: `${heightPct}%`,
                      background: `linear-gradient(180deg, ${r.color}, ${r.color}cc)`,
                      borderRadius: '6px 6px 0 0',
                      minHeight: 2,
                      transition: 'height 0.4s ease',
                    }}
                    title={`${r.name} — ${fmt(r.vente)}`}
                  />
                  <span style={{ fontSize: 10, fontWeight: 700, color: r.color, writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>
                    {r.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
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
