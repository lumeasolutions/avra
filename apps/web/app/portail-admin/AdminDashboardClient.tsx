'use client';

/**
 * Dashboard admin client — AVRA bêta privée
 *
 * Charge les données via /api/admin/waitlist et /api/admin/demo-requests.
 * Ces routes vérifient BETA_ADMIN_EMAILS côté serveur.
 */

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type WaitlistEntry = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  metier: string | null;
  source: string | null;
  createdAt: string;
};

type DemoRequestEntry = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  phone: string | null;
  metier: string | null;
  message: string | null;
  status: string;
  source: string | null;
  createdAt: string;
};

type Tab = 'waitlist' | 'demo';

const METIER_LABELS: Record<string, string> = {
  architecte: "Architecte d'intérieur",
  cuisiniste: 'Cuisiniste',
  menuisier: 'Menuisier',
  agenceur: 'Agenceur',
  decorateur: 'Décorateur',
  autre: 'Autre',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function toCsv(rows: Record<string, string | null>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(';'),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? '';
          return val.includes(';') || val.includes('"') || val.includes('\n')
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        })
        .join(';'),
    ),
  ];
  return lines.join('\n');
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AdminDashboardClient() {
  const [activeTab, setActiveTab] = useState<Tab>('waitlist');
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [demos, setDemos] = useState<DemoRequestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [wRes, dRes] = await Promise.all([
        fetch('/api/admin/waitlist'),
        fetch('/api/admin/demo-requests'),
      ]);

      if (wRes.status === 401 || dRes.status === 401) {
        setError('Accès non autorisé. Vous devez être dans la liste BETA_ADMIN_EMAILS.');
        return;
      }

      if (!wRes.ok || !dRes.ok) {
        setError('Erreur lors du chargement des données.');
        return;
      }

      const [wData, dData] = await Promise.all([wRes.json(), dRes.json()]);
      setWaitlist(wData.entries || []);
      setDemos(dData.entries || []);
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtre recherche
  const filteredWaitlist = waitlist.filter((e) =>
    [e.email, e.firstName, e.lastName, e.company, e.metier]
      .join(' ')
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  const filteredDemos = demos.filter((e) =>
    [e.email, e.firstName, e.lastName, e.company, e.metier, e.message]
      .join(' ')
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  function exportWaitlistCsv() {
    const rows = filteredWaitlist.map((e) => ({
      Email: e.email,
      Prénom: e.firstName ?? '',
      Nom: e.lastName ?? '',
      Entreprise: e.company ?? '',
      Métier: e.metier ? (METIER_LABELS[e.metier] ?? e.metier) : '',
      Source: e.source ?? '',
      Date: formatDate(e.createdAt),
    }));
    downloadCsv(toCsv(rows), `avra-waitlist-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  function exportDemosCsv() {
    const rows = filteredDemos.map((e) => ({
      Email: e.email,
      Prénom: e.firstName ?? '',
      Nom: e.lastName ?? '',
      Entreprise: e.company ?? '',
      Téléphone: e.phone ?? '',
      Métier: e.metier ? (METIER_LABELS[e.metier] ?? e.metier) : '',
      Message: e.message ?? '',
      Statut: e.status,
      Source: e.source ?? '',
      Date: formatDate(e.createdAt),
    }));
    downloadCsv(toCsv(rows), `avra-demos-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={errorBoxStyle}>
          <p style={{ color: '#fca5a5', fontWeight: 600, marginBottom: 8 }}>⛔ {error}</p>
          <button onClick={fetchData} style={btnSecondaryStyle}>Réessayer</button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* En-tête */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Administration AVRA</h1>
          <p style={subtitleStyle}>Bêta privée · Lancement juillet 2026</p>
        </div>
        <button onClick={fetchData} style={btnSecondaryStyle} title="Actualiser">
          ↺ Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div style={kpiRowStyle}>
        <KpiCard
          label="Inscrits waitlist"
          value={loading ? '…' : waitlist.length.toString()}
          icon="🌱"
        />
        <KpiCard
          label="Demandes de démo"
          value={loading ? '…' : demos.length.toString()}
          icon="📅"
        />
        <KpiCard
          label="Taux démo / waitlist"
          value={loading || !waitlist.length ? '—' : `${Math.round((demos.length / waitlist.length) * 100)} %`}
          icon="📊"
        />
      </div>

      {/* Onglets + recherche */}
      <div style={tabBarStyle}>
        <div style={tabsStyle}>
          <button
            style={activeTab === 'waitlist' ? activeTabStyle : tabStyle}
            onClick={() => setActiveTab('waitlist')}
          >
            Liste d'attente
            <span style={badgeStyle}>{loading ? '…' : filteredWaitlist.length}</span>
          </button>
          <button
            style={activeTab === 'demo' ? activeTabStyle : tabStyle}
            onClick={() => setActiveTab('demo')}
          >
            Demandes de démo
            <span style={badgeStyle}>{loading ? '…' : filteredDemos.length}</span>
          </button>
        </div>

        <div style={searchRowStyle}>
          <input
            type="search"
            placeholder="Rechercher…"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            style={searchStyle}
          />
          <button
            onClick={activeTab === 'waitlist' ? exportWaitlistCsv : exportDemosCsv}
            style={btnExportStyle}
            title="Exporter en CSV"
          >
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* Tableau waitlist */}
      {activeTab === 'waitlist' && (
        <div style={tableWrapStyle}>
          {loading ? (
            <div style={loadingStyle}>Chargement…</div>
          ) : filteredWaitlist.length === 0 ? (
            <div style={emptyStyle}>
              {searchQuery ? 'Aucun résultat pour cette recherche.' : 'Aucune inscription pour l\'instant.'}
            </div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  {['Email', 'Prénom', 'Nom', 'Entreprise', 'Métier', 'Source', 'Date inscription'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredWaitlist.map((e, i) => (
                  <tr key={e.id} style={i % 2 === 0 ? trEvenStyle : trOddStyle}>
                    <td style={tdStyle}>
                      <a href={`mailto:${e.email}`} style={emailLinkStyle}>{e.email}</a>
                    </td>
                    <td style={tdStyle}>{e.firstName ?? '—'}</td>
                    <td style={tdStyle}>{e.lastName ?? '—'}</td>
                    <td style={tdStyle}>{e.company ?? '—'}</td>
                    <td style={tdStyle}>
                      {e.metier ? (
                        <span style={metierBadgeStyle}>
                          {METIER_LABELS[e.metier] ?? e.metier}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, color: '#9ca3af' }}>{e.source ?? '—'}</td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontSize: 12 }}>{formatDate(e.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tableau démos */}
      {activeTab === 'demo' && (
        <div style={tableWrapStyle}>
          {loading ? (
            <div style={loadingStyle}>Chargement…</div>
          ) : filteredDemos.length === 0 ? (
            <div style={emptyStyle}>
              {searchQuery ? 'Aucun résultat pour cette recherche.' : 'Aucune demande de démo pour l\'instant.'}
            </div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  {['Email', 'Prénom / Nom', 'Entreprise', 'Tél.', 'Métier', 'Message', 'Statut', 'Date'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDemos.map((e, i) => (
                  <tr key={e.id} style={i % 2 === 0 ? trEvenStyle : trOddStyle}>
                    <td style={tdStyle}>
                      <a href={`mailto:${e.email}`} style={emailLinkStyle}>{e.email}</a>
                    </td>
                    <td style={tdStyle}>
                      {[e.firstName, e.lastName].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td style={tdStyle}>{e.company ?? '—'}</td>
                    <td style={tdStyle}>{e.phone ?? '—'}</td>
                    <td style={tdStyle}>
                      {e.metier ? (
                        <span style={metierBadgeStyle}>
                          {METIER_LABELS[e.metier] ?? e.metier}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ ...tdStyle, maxWidth: 200, fontSize: 12, color: '#6b7280' }}>
                      {e.message ? (
                        <span title={e.message}>
                          {e.message.length > 60 ? e.message.slice(0, 57) + '…' : e.message}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={tdStyle}>
                      <StatusBadge status={e.status} />
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontSize: 12 }}>{formatDate(e.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function KpiCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div style={kpiCardStyle}>
      <span style={kpiIconStyle}>{icon}</span>
      <div>
        <div style={kpiValueStyle}>{value}</div>
        <div style={kpiLabelStyle}>{label}</div>
      </div>
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  nouveau: { label: 'Nouveau', color: '#e8c97a', bg: 'rgba(232, 201, 122, 0.12)' },
  contacte: { label: 'Contacté', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.12)' },
  converti: { label: 'Converti', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.12)' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.12)' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 600,
      color: cfg.color,
      backgroundColor: cfg.bg,
      border: `1px solid ${cfg.color}40`,
    }}>
      {cfg.label}
    </span>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#0e1810',
  color: '#f9fafb',
  padding: '40px 5%',
  fontFamily: '"DM Sans", system-ui, sans-serif',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  marginBottom: '32px',
  flexWrap: 'wrap',
  gap: '16px',
};

const titleStyle: React.CSSProperties = {
  fontSize: 'clamp(1.5rem, 3vw, 2rem)',
  fontWeight: 700,
  color: '#ffffff',
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#C9A96E',
  margin: '4px 0 0',
  fontWeight: 600,
  letterSpacing: '0.05em',
};

const kpiRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '16px',
  marginBottom: '32px',
};

const kpiCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  padding: '20px 24px',
  borderRadius: '14px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
};

const kpiIconStyle: React.CSSProperties = {
  fontSize: '28px',
  lineHeight: 1,
};

const kpiValueStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  color: '#C9A96E',
  lineHeight: 1,
};

const kpiLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'rgba(255,255,255,0.55)',
  marginTop: '4px',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '12px',
  marginBottom: '16px',
};

const tabsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
};

const tabBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 16px',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'transparent',
  color: 'rgba(255,255,255,0.6)',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

const tabStyle: React.CSSProperties = { ...tabBase };

const activeTabStyle: React.CSSProperties = {
  ...tabBase,
  background: 'rgba(201, 169, 110, 0.1)',
  border: '1px solid rgba(201, 169, 110, 0.35)',
  color: '#C9A96E',
  fontWeight: 700,
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '20px',
  height: '20px',
  borderRadius: '999px',
  background: 'rgba(201, 169, 110, 0.2)',
  color: '#e8c97a',
  fontSize: '11px',
  fontWeight: 700,
  padding: '0 6px',
};

const searchRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

const searchStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  fontSize: '13px',
  outline: 'none',
  width: '200px',
};

const btnSecondaryStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'transparent',
  color: 'rgba(255,255,255,0.8)',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

const btnExportStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '10px',
  border: 'none',
  background: 'linear-gradient(135deg, #e8c97a, #C9A96E)',
  color: '#0e1810',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
};

const tableWrapStyle: React.CSSProperties = {
  overflowX: 'auto',
  borderRadius: '14px',
  border: '1px solid rgba(255,255,255,0.08)',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '13px',
};

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: '11px',
  color: 'rgba(255,255,255,0.45)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  background: 'rgba(255,255,255,0.02)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '11px 16px',
  color: 'rgba(255,255,255,0.85)',
  verticalAlign: 'top',
};

const trEvenStyle: React.CSSProperties = {
  background: 'transparent',
};

const trOddStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.015)',
};

const emailLinkStyle: React.CSSProperties = {
  color: '#C9A96E',
  textDecoration: 'none',
  fontWeight: 500,
};

const metierBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '999px',
  background: 'rgba(201, 169, 110, 0.1)',
  border: '1px solid rgba(201, 169, 110, 0.2)',
  color: '#e8c97a',
  fontSize: '11px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

const loadingStyle: React.CSSProperties = {
  padding: '48px',
  textAlign: 'center',
  color: 'rgba(255,255,255,0.4)',
  fontSize: '14px',
};

const emptyStyle: React.CSSProperties = {
  padding: '48px',
  textAlign: 'center',
  color: 'rgba(255,255,255,0.35)',
  fontSize: '14px',
};

const errorBoxStyle: React.CSSProperties = {
  maxWidth: '480px',
  margin: '80px auto',
  padding: '32px',
  borderRadius: '16px',
  background: 'rgba(239, 68, 68, 0.07)',
  border: '1px solid rgba(239, 68, 68, 0.2)',
  textAlign: 'center',
};
