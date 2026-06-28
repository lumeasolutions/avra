'use client';

import React, { useState, useCallback } from 'react';

/* ---------- Types ---------- */
interface SearchRow {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean | null;
  lastLoginAt: string | null;
  workspaceId: string | null;
  workspaceName: string | null;
  plan: string | null;
  dossiers: number | null;
}
interface AccountData {
  workspace: { id: string; name: string; slug: string | null; plan: string | null; isActive: boolean | null; trialEndsAt: string | null; createdAt: string | null };
  members: Array<{ email: string; firstName: string | null; lastName: string | null; isActive: boolean | null; lastLoginAt: string | null; createdAt: string | null; role: string | null }>;
  counts: Record<string, number>;
  dossiers: Array<{ id: string; name: string | null; reference: string | null; tradeType: string | null; lifecycleStatus: string | null; pipelineStatus: string | null; priority: string | null; saleAmount: number | null; createdAt: string | null; updatedAt: string | null }>;
  auditLog: Array<{ adminEmail: string; action: string; targetEmail: string | null; detail: unknown; createdAt: string }>;
}

/* ---------- Helpers ---------- */
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d: string | null) => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtEUR = (n: number | null) => n == null ? '—' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fullName = (f: string | null, l: string | null) => [f, l].filter(Boolean).join(' ') || '—';

const COUNT_LABELS: Array<[string, string]> = [
  ['dossiers', 'Dossiers'], ['clients', 'Clients'], ['devis', 'Devis'], ['factures', 'Factures'],
  ['demandes', 'Demandes'], ['intervenants', 'Intervenants'], ['agenda', 'Agenda'], ['documents', 'Documents'], ['rendus', 'Rendus IA'],
];

export default function SupportClient() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    setSearching(true); setError(null);
    try {
      const res = await fetch(`/api/support/search?q=${encodeURIComponent(q)}`, { credentials: 'include' });
      if (res.status === 401) { setDenied(true); return; }
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setError('Erreur de recherche.');
    } finally {
      setSearching(false);
    }
  }, [query]);

  const openAccount = useCallback(async (workspaceId: string | null) => {
    if (!workspaceId) return;
    setLoadingAccount(true); setError(null); setAccount(null);
    try {
      const res = await fetch(`/api/support/account?workspaceId=${encodeURIComponent(workspaceId)}`, { credentials: 'include' });
      if (res.status === 401) { setDenied(true); return; }
      if (!res.ok) { setError('Compte introuvable.'); return; }
      setAccount(await res.json());
    } catch {
      setError('Erreur de chargement de la fiche.');
    } finally {
      setLoadingAccount(false);
    }
  }, []);

  if (denied) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f4f0', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#6b6158' }}>
          <div style={{ fontSize: 40 }}>🔒</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>Accès refusé</h1>
          <p style={{ fontSize: 13, marginTop: 4 }}>Ce portail est réservé à l'équipe support. Connectez-vous avec un compte autorisé.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f6f4f0', fontFamily: 'system-ui, sans-serif', padding: '28px 20px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 24 }}>🛟</span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#2C3529', margin: 0 }}>Support AVRA</h1>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#8a6cc2', background: '#efeafa', padding: '3px 8px', borderRadius: 8, letterSpacing: '0.04em' }}>BACK-OFFICE</span>
        </div>
        <p style={{ fontSize: 13, color: '#8a8178', marginTop: 0, marginBottom: 18 }}>
          Recherchez un client, consultez son compte en lecture seule. Chaque consultation est journalisée.
        </p>

        {/* Barre de recherche */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
            placeholder="Email, nom du client, ou nom d'entreprise…"
            style={{ flex: 1, padding: '11px 14px', borderRadius: 12, border: '1px solid #ddd6cc', fontSize: 14, background: 'white', outline: 'none' }}
          />
          <button onClick={runSearch} disabled={searching}
            style={{ padding: '11px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#4A6358,#334840)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: searching ? 0.6 : 1 }}>
            {searching ? 'Recherche…' : 'Rechercher'}
          </button>
        </div>

        {error && <div style={{ background: '#fff0f0', color: '#D32F2F', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{error}</div>}

        {/* Résultats de recherche */}
        {results.length > 0 && !account && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {results.map((r) => (
              <button key={r.userId} onClick={() => openAccount(r.workspaceId)}
                style={{ textAlign: 'left', background: 'white', border: '1px solid #ece7df', borderRadius: 14, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#2C3529' }}>{fullName(r.firstName, r.lastName)}</div>
                  <div style={{ fontSize: 12, color: '#8a8178' }}>{r.email} · {r.workspaceName ?? 'sans workspace'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, color: '#6b6158' }}>{r.dossiers ?? 0} dossiers</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: r.isActive ? '#388E3C' : '#B0AB9F' }}>{r.isActive ? 'ACTIF' : 'INACTIF'}</span>
                  <span style={{ fontSize: 11, color: '#9A9590' }}>conn. {fmtDate(r.lastLoginAt)}</span>
                  <span style={{ color: '#8a6cc2', fontWeight: 700 }}>→</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {loadingAccount && <div style={{ color: '#8a8178', fontSize: 13 }}>Chargement de la fiche…</div>}

        {/* Fiche 360° */}
        {account && (
          <div>
            <button onClick={() => setAccount(null)} style={{ background: 'none', border: 'none', color: '#4A6358', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12 }}>← Retour aux résultats</button>

            {/* Bandeau workspace */}
            <div style={{ background: 'white', borderRadius: 16, padding: '16px 18px', marginBottom: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#2C3529' }}>{account.workspace.name}</div>
                  <div style={{ fontSize: 12, color: '#8a8178', marginTop: 2 }}>
                    Workspace <code style={{ background: '#f3efe9', padding: '1px 6px', borderRadius: 5 }}>{account.workspace.id}</code> · créé le {fmtDate(account.workspace.createdAt)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#8a6cc2', background: '#efeafa', padding: '4px 10px', borderRadius: 8 }}>{account.workspace.plan ?? 'PLAN —'}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: account.workspace.isActive ? '#388E3C' : '#B0AB9F', background: account.workspace.isActive ? '#eef7ef' : '#f0ece6', padding: '4px 10px', borderRadius: 8 }}>{account.workspace.isActive ? 'ACTIF' : 'INACTIF'}</span>
                </div>
              </div>

              {/* Membres */}
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {account.members.map((m) => (
                  <div key={m.email} style={{ background: '#f8f6f2', borderRadius: 10, padding: '8px 12px', fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: '#2C3529' }}>{fullName(m.firstName, m.lastName)} <span style={{ fontWeight: 500, color: '#9A9590' }}>· {m.role ?? 'membre'}</span></div>
                    <div style={{ color: '#8a8178' }}>{m.email} · dernière connexion {fmtDateTime(m.lastLoginAt)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compteurs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 8, marginBottom: 14 }}>
              {COUNT_LABELS.map(([key, label]) => (
                <div key={key} style={{ background: 'white', borderRadius: 12, padding: '10px 6px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#4A6358' }}>{account.counts[key] ?? 0}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#9A9590', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Dossiers (lecture seule) */}
            <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', marginBottom: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#2C3529', marginBottom: 8 }}>Dossiers ({account.dossiers.length}) — lecture seule</div>
              {account.dossiers.length === 0 ? (
                <div style={{ fontSize: 13, color: '#9A9590', padding: '8px 0' }}>Aucun dossier.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: '#9A9590', borderBottom: '1px solid #ece7df' }}>
                        <th style={{ padding: '6px 8px' }}>Nom</th><th style={{ padding: '6px 8px' }}>Réf.</th>
                        <th style={{ padding: '6px 8px' }}>Métier</th><th style={{ padding: '6px 8px' }}>Statut</th>
                        <th style={{ padding: '6px 8px' }}>Montant</th><th style={{ padding: '6px 8px' }}>Maj</th>
                      </tr>
                    </thead>
                    <tbody>
                      {account.dossiers.map((d) => (
                        <tr key={d.id} style={{ borderBottom: '1px solid #f3efe9' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 600, color: '#2C3529' }}>{d.name ?? '—'}</td>
                          <td style={{ padding: '6px 8px', color: '#8a8178' }}>{d.reference ?? '—'}</td>
                          <td style={{ padding: '6px 8px', color: '#8a8178' }}>{d.tradeType ?? '—'}</td>
                          <td style={{ padding: '6px 8px', color: '#8a8178' }}>{d.lifecycleStatus ?? d.pipelineStatus ?? '—'}</td>
                          <td style={{ padding: '6px 8px', color: '#8a8178' }}>{fmtEUR(d.saleAmount)}</td>
                          <td style={{ padding: '6px 8px', color: '#9A9590' }}>{fmtDate(d.updatedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Journal d'audit support */}
            <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#2C3529', marginBottom: 8 }}>Journal des actions support sur ce compte</div>
              {account.auditLog.length === 0 ? (
                <div style={{ fontSize: 13, color: '#9A9590' }}>Aucune action enregistrée.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {account.auditLog.map((a, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#6b6158', display: 'flex', gap: 8 }}>
                      <span style={{ color: '#9A9590', flexShrink: 0 }}>{fmtDateTime(a.createdAt)}</span>
                      <span style={{ fontWeight: 700 }}>{a.action}</span>
                      <span style={{ color: '#8a8178' }}>par {a.adminEmail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
