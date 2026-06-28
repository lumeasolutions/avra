'use client';

import React, { useState, useCallback, useEffect } from 'react';

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

interface SentryIssue {
  id: string; title: string; culprit: string | null; level: string | null;
  count: number; userCount: number; lastSeen: string | null; firstSeen: string | null;
  status: string | null; permalink: string | null;
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

/**
 * fetch avec rejeu sur 401 : l'access_token JWT expire au bout de 15 min et la
 * page /support (hors layout app) n'a pas de refresh proactif. Sur 401, on tente
 * un refresh (POST /api/v1/auth/refresh, sans CSRF) puis on rejoue UNE fois.
 * Un compte non autorisé restera en 401 même après refresh → « accès refusé ».
 */
async function supportFetch(url: string, init?: RequestInit): Promise<Response> {
  let res = await fetch(url, { credentials: 'include', ...init });
  if (res.status === 401) {
    try {
      const r = await fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' });
      if (r.ok) res = await fetch(url, { credentials: 'include', ...init });
    } catch { /* refresh impossible : on garde le 401 */ }
  }
  return res;
}

/** Télécharge un objet en fichier JSON côté navigateur. */
function downloadJson(filename: string, obj: unknown) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Section d'une fiche dossier : un titre + une liste de lignes (lecture seule). */
function DetailSection({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#9A9590', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title} ({lines.length})</div>
      {lines.length === 0 ? (
        <div style={{ fontSize: 12, color: '#c0bab2', marginTop: 2 }}>—</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
          {lines.map((l, i) => <div key={i} style={{ fontSize: 12, color: '#4a4a4a' }}>{l}</div>)}
        </div>
      )}
    </div>
  );
}

export default function SupportClient() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  // V2 — actions
  const [busy, setBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [backupReady, setBackupReady] = useState(false);
  // V3 — erreurs Sentry + inspection dossier
  const [errors, setErrors] = useState<SentryIssue[]>([]);
  const [errorsConfigured, setErrorsConfigured] = useState<boolean | null>(null);
  const [dossier, setDossier] = useState<Record<string, any> | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    setSearching(true); setError(null);
    try {
      const res = await supportFetch(`/api/support/search?q=${encodeURIComponent(q)}`);
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
      const res = await supportFetch(`/api/support/account?workspaceId=${encodeURIComponent(workspaceId)}`);
      if (res.status === 401) { setDenied(true); return; }
      if (!res.ok) { setError('Compte introuvable.'); return; }
      setAccount(await res.json());
    } catch {
      setError('Erreur de chargement de la fiche.');
    } finally {
      setLoadingAccount(false);
    }
  }, []);

  /** Export RGPD : télécharge un JSON complet du compte. Retourne true si OK. */
  const exportAccount = useCallback(async (): Promise<boolean> => {
    if (!account) return false;
    setBusy(true); setActionMsg(null);
    try {
      const res = await supportFetch(`/api/support/export?workspaceId=${encodeURIComponent(account.workspace.id)}`);
      if (res.status === 401) { setDenied(true); return false; }
      if (!res.ok) { setActionMsg("Échec de l'export."); return false; }
      const data = await res.json();
      downloadJson(`avra-export-${account.workspace.name}-${new Date().toISOString().slice(0, 10)}.json`, data);
      setActionMsg('Export téléchargé.');
      return true;
    } catch {
      setActionMsg("Erreur réseau pendant l'export.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [account]);

  /** Réinitialisation : télécharge la sauvegarde puis vide le compte. */
  const doReset = useCallback(async () => {
    if (!account) return;
    setBusy(true); setActionMsg(null);
    try {
      const res = await supportFetch('/api/support/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: account.workspace.id, confirmName }),
      });
      if (res.status === 401) { setDenied(true); return; }
      const data = await res.json().catch(() => null);
      if (!res.ok) { setActionMsg(data?.error ?? 'Échec de la réinitialisation.'); return; }
      if (data?.snapshot) {
        downloadJson(`avra-SAUVEGARDE-avant-reset-${account.workspace.name}-${new Date().toISOString().slice(0, 10)}.json`, data.snapshot);
      }
      setResetOpen(false); setConfirmName(''); setBackupReady(false);
      setActionMsg('Compte réinitialisé. Sauvegarde téléchargée.');
      openAccount(account.workspace.id);
    } catch {
      setActionMsg('Erreur réseau pendant la réinitialisation.');
    } finally {
      setBusy(false);
    }
  }, [account, confirmName, openAccount]);

  /** Charge les erreurs Sentry du client dès qu'une fiche est ouverte. */
  useEffect(() => {
    if (!account) { setErrors([]); setErrorsConfigured(null); return; }
    const email = account.members?.[0]?.email;
    if (!email) { setErrorsConfigured(false); setErrors([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await supportFetch(`/api/support/errors?email=${encodeURIComponent(email)}`);
        if (cancelled) return;
        if (!res.ok) { setErrorsConfigured(false); setErrors([]); return; }
        const data = await res.json();
        setErrorsConfigured(Boolean(data.configured));
        setErrors(Array.isArray(data.issues) ? data.issues : []);
      } catch {
        if (!cancelled) { setErrorsConfigured(false); setErrors([]); }
      }
    })();
    return () => { cancelled = true; };
  }, [account]);

  /** Ouvre le détail d'un dossier en lecture seule. */
  const openDossier = useCallback(async (dossierId: string) => {
    setDossierLoading(true); setDossier(null);
    try {
      const res = await supportFetch(`/api/support/dossier?dossierId=${encodeURIComponent(dossierId)}`);
      if (res.status === 401) { setDenied(true); return; }
      if (!res.ok) { setActionMsg('Dossier introuvable.'); return; }
      setDossier(await res.json());
    } catch {
      setActionMsg('Erreur de chargement du dossier.');
    } finally {
      setDossierLoading(false);
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
              <div style={{ fontSize: 13, fontWeight: 800, color: '#2C3529', marginBottom: 8 }}>Dossiers ({account.dossiers.length}) — cliquer pour le détail</div>
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
                        <tr key={d.id} onClick={() => openDossier(d.id)} title="Voir le détail (lecture seule)"
                          style={{ borderBottom: '1px solid #f3efe9', cursor: 'pointer' }}>
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

            {/* Erreurs techniques Sentry (V3) */}
            <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', marginBottom: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#2C3529', marginBottom: 8 }}>Erreurs techniques (Sentry) — 90 derniers jours</div>
              {errorsConfigured === null ? (
                <div style={{ fontSize: 12, color: '#9A9590' }}>Chargement…</div>
              ) : errorsConfigured === false ? (
                <div style={{ fontSize: 11.5, color: '#9A9590', lineHeight: 1.5 }}>
                  Filtrage Sentry par client non configuré. Pour l'activer : poser <code style={{ background: '#f3efe9', padding: '1px 5px', borderRadius: 4 }}>SENTRY_AUTH_TOKEN</code>, <code style={{ background: '#f3efe9', padding: '1px 5px', borderRadius: 4 }}>SENTRY_ORG</code> et <code style={{ background: '#f3efe9', padding: '1px 5px', borderRadius: 4 }}>SENTRY_PROJECT</code> sur Vercel. L'attribution des erreurs aux clients est déjà en place.
                </div>
              ) : errors.length === 0 ? (
                <div style={{ fontSize: 13, color: '#388E3C', fontWeight: 600 }}>Aucune erreur remontée sur 90 jours 🎉</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {errors.map((e) => (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#fbf7f4', borderRadius: 8 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: (e.level === 'error' || e.level === 'fatal') ? '#C0392B' : '#E07B00', textTransform: 'uppercase', flexShrink: 0, width: 34 }}>{e.level ?? 'err'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#2C3529', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</div>
                        <div style={{ fontSize: 10.5, color: '#9A9590' }}>{e.count} occurrence(s) · vue {fmtDateTime(e.lastSeen)}</div>
                      </div>
                      {e.permalink && <a href={e.permalink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#4A6358', fontWeight: 700, flexShrink: 0 }}>ouvrir →</a>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions (V2) */}
            <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', marginBottom: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#2C3529', marginBottom: 10 }}>Actions</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={exportAccount} disabled={busy}
                  style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid #cfe0d6', background: '#eef7ef', color: '#2f6b4f', fontWeight: 700, fontSize: 13, cursor: busy ? 'wait' : 'pointer' }}>
                  ⬇ Exporter les données (RGPD)
                </button>
                <button onClick={() => { setConfirmName(''); setActionMsg(null); setBackupReady(false); setResetOpen(true); }} disabled={busy}
                  style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid #e6c3bd', background: '#fdeeec', color: '#C0392B', fontWeight: 700, fontSize: 13, cursor: busy ? 'wait' : 'pointer' }}>
                  Réinitialiser le compte…
                </button>
                {actionMsg && <span style={{ fontSize: 12, color: '#4A6358', fontWeight: 600 }}>{actionMsg}</span>}
              </div>
              <p style={{ fontSize: 11, color: '#9A9590', marginTop: 8 }}>
                L'export génère un fichier JSON complet. La réinitialisation télécharge d'abord une sauvegarde, puis vide dossiers/clients/devis/factures/documents/rendus… — le compte et la connexion sont conservés.
              </p>
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

        {/* Modale de confirmation de réinitialisation */}
        {resetOpen && account && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <div style={{ background: 'white', borderRadius: 18, padding: '22px 24px', maxWidth: 480, width: '100%', boxShadow: '0 12px 44px rgba(0,0,0,0.28)' }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#C0392B' }}>⚠️ Réinitialiser ce compte</div>
              <p style={{ fontSize: 13, color: '#6b6158', marginTop: 8, lineHeight: 1.5 }}>
                Cette action vide toutes les données métier de <strong>{account.workspace.name}</strong> (dossiers, clients, devis, factures, documents, rendus…). Le compte et la connexion sont <strong>conservés</strong>. Une sauvegarde JSON est téléchargée automatiquement avant suppression.
              </p>
              {/* Étape 1 : sauvegarde obligatoire avant toute suppression */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, padding: '10px 12px', background: backupReady ? '#eef7ef' : '#faf7f2', borderRadius: 10, border: `1px solid ${backupReady ? '#cfe0d6' : '#ece7df'}` }}>
                <button onClick={async () => { const ok = await exportAccount(); if (ok) setBackupReady(true); }} disabled={busy || backupReady}
                  style={{ padding: '8px 14px', borderRadius: 9, border: 'none', background: backupReady ? '#cfe0d6' : 'linear-gradient(135deg,#4A6358,#334840)', color: backupReady ? '#2f6b4f' : 'white', fontWeight: 700, fontSize: 12.5, cursor: busy || backupReady ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
                  {backupReady ? '✓ Sauvegarde téléchargée' : '1. Télécharger la sauvegarde'}
                </button>
                <span style={{ fontSize: 11.5, color: '#8a8178' }}>{backupReady ? 'Vous pouvez réinitialiser.' : 'Obligatoire avant la réinitialisation.'}</span>
              </div>

              <p style={{ fontSize: 12, color: '#8a8178', marginTop: 14, marginBottom: 6 }}>
                2. Pour confirmer, tapez le nom exact du workspace : <code style={{ fontSize: 12, background: '#f3efe9', padding: '2px 6px', borderRadius: 5 }}>{account.workspace.name}</code>
              </p>
              <input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder="Nom du workspace" disabled={!backupReady}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd6cc', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: backupReady ? 'white' : '#f5f2ed' }} />
              {actionMsg && <div style={{ fontSize: 12, color: '#C0392B', marginTop: 8 }}>{actionMsg}</div>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button onClick={() => { setResetOpen(false); setConfirmName(''); }} disabled={busy}
                  style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid #ddd6cc', background: 'white', color: '#6b6158', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button onClick={doReset} disabled={busy || !backupReady || confirmName.trim() !== account.workspace.name}
                  style={{ padding: '9px 16px', borderRadius: 10, border: 'none', color: 'white', fontWeight: 700, fontSize: 13,
                    background: (backupReady && confirmName.trim() === account.workspace.name && !busy) ? '#C0392B' : '#e0b4ad',
                    cursor: (backupReady && confirmName.trim() === account.workspace.name && !busy) ? 'pointer' : 'not-allowed' }}>
                  {busy ? 'Réinitialisation…' : 'Réinitialiser définitivement'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modale détail dossier (lecture seule) */}
        {(dossier || dossierLoading) && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <div style={{ background: 'white', borderRadius: 18, padding: '20px 22px', maxWidth: 640, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 12px 44px rgba(0,0,0,0.28)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#2C3529' }}>{dossierLoading ? 'Chargement…' : (dossier?.project?.name ?? 'Dossier')}</div>
                <button onClick={() => setDossier(null)} style={{ border: 'none', background: 'transparent', fontSize: 18, color: '#9A9590', cursor: 'pointer', lineHeight: 1 }}>✕</button>
              </div>
              {dossier && (
                <div>
                  <div style={{ fontSize: 12, color: '#8a8178', marginTop: 4 }}>
                    Réf {dossier.project?.reference ?? '—'} · {dossier.project?.lifecycleStatus ?? dossier.project?.pipelineStatus ?? '—'} · vente {fmtEUR(dossier.project?.saleAmount != null ? Number(dossier.project.saleAmount) : null)}
                  </div>
                  {dossier.client && (
                    <div style={{ fontSize: 12, color: '#6b6158', marginTop: 4 }}>
                      Client : <strong>{[dossier.client.firstName, dossier.client.lastName].filter(Boolean).join(' ') || dossier.client.name || dossier.client.companyName || '—'}</strong>
                    </div>
                  )}
                  <DetailSection title="Devis" lines={(dossier.devis ?? []).map((q: any) => `${q.status ?? '—'} · ${fmtEUR(q.totalTTC)} · ${fmtDate(q.createdAt)}`)} />
                  <DetailSection title="Factures" lines={(dossier.factures ?? []).map((f: any) => `${f.type ?? ''} ${f.status ?? ''} · ${fmtEUR(f.totalTTC)} · ${fmtDate(f.createdAt)}`)} />
                  <DetailSection title="Demandes" lines={(dossier.demandes ?? []).map((d: any) => `${d.type ?? ''} · ${d.status ?? ''} · ${d.title ?? ''} · ${fmtDate(d.createdAt)}`)} />
                  <DetailSection title="Documents" lines={(dossier.documents ?? []).map((doc: any) => `${doc.name ?? doc.filename ?? doc.fileName ?? doc.originalName ?? '(document)'} · ${fmtDate(doc.createdAt)}`)} />
                  <DetailSection title="Rendus IA" lines={(dossier.rendus ?? []).map((r: any) => `${r.type ?? ''} · ${r.status ?? ''} · ${(r.prompt ?? '').slice(0, 40)} · ${fmtDate(r.createdAt)}`)} />
                  <DetailSection title="Agenda" lines={(dossier.events ?? []).map((ev: any) => `${ev.type ?? ''} · ${ev.title ?? ''} · ${fmtDate(ev.createdAt)}`)} />
                  <DetailSection title="Intervenants" lines={(dossier.intervenants ?? []).map((i: any) => `${i.type ?? ''} · ${i.name ?? ''} · ${i.email ?? ''}`)} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
