'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listDemandesPro, type Demande, type DemandeStatus } from '@/lib/demandes-api';

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  ENVOYEE:  { label: 'Envoyée',   bg: '#eef2ff', color: '#4338ca' },
  VUE:      { label: 'Vue',       bg: '#f1f5f9', color: '#475569' },
  ACCEPTEE: { label: 'Acceptée',  bg: '#dcfce7', color: '#15803d' },
  REFUSEE:  { label: 'Refusée',   bg: '#fee2e2', color: '#b91c1c' },
  EN_COURS: { label: 'En cours',  bg: '#fef9c3', color: '#a16207' },
  TERMINEE: { label: 'Terminée',  bg: '#dcfce7', color: '#166534' },
  ANNULEE:  { label: 'Annulée',   bg: '#f1f5f9', color: '#64748b' },
};

const FILTERS: Array<{ key: string; label: string }> = [
  { key: '', label: 'Toutes' },
  { key: 'ENVOYEE', label: 'En attente' },
  { key: 'ACCEPTEE', label: 'Acceptées' },
  { key: 'EN_COURS', label: 'En cours' },
  { key: 'TERMINEE', label: 'Terminées' },
  { key: 'REFUSEE', label: 'Refusées' },
];

function intervName(d: Demande): string {
  const iv = d.intervenant;
  if (!iv) return 'Intervenant';
  return iv.companyName || [iv.firstName, iv.lastName].filter(Boolean).join(' ') || 'Intervenant';
}
function fmt(s?: string | null): string {
  if (!s) return '';
  try { return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch { return ''; }
}

export default function MessagesIntervenantsPage() {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const page = await listDemandesPro({ pageSize: 200 });
        if (!cancelled) setDemandes(page.data ?? []);
      } catch { /* noop */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let list = [...demandes];
    if (statusF) list = list.filter(d => d.status === statusF);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(d =>
      intervName(d).toLowerCase().includes(q) ||
      (d.title || '').toLowerCase().includes(q) ||
      (d.project?.name || '').toLowerCase().includes(q),
    );
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [demandes, statusF, search]);

  return (
    <div className="w-full space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#304035]">Messages intervenants</h1>
        <p className="text-sm text-[#304035]/55">Toutes vos demandes aux intervenants, centralisées — qui, quoi, quand, statut.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher (intervenant, objet, dossier)…"
          className="flex-1 min-w-[220px] rounded-xl border border-[#304035]/15 bg-white px-4 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/15"
        />
        {FILTERS.map(f => (
          <button
            key={f.key || 'all'}
            onClick={() => setStatusF(f.key)}
            className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${statusF === f.key ? 'bg-[#304035] text-white border-[#304035]' : 'bg-white text-[#304035]/60 border-[#304035]/12 hover:border-[#304035]/30'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#304035]/10 bg-white px-6 py-16 text-center text-[#304035]/50 text-sm">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#304035]/10 bg-white px-6 py-16 text-center text-[#304035]/50 text-sm">Aucune demande pour le moment.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(d => {
            const st = STATUS[d.status] ?? { label: d.status, bg: '#f1f5f9', color: '#475569' };
            return (
              <Link
                key={d.id}
                href={`/intervenants?demande=${encodeURIComponent(d.id)}`}
                className="flex items-center gap-4 rounded-2xl border border-[#304035]/10 bg-white px-5 py-4 hover:border-[#a67749]/40 hover:shadow-sm transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#304035] truncate">{intervName(d)}</span>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[#a67749]/80">{d.type}</span>
                  </div>
                  <div className="text-sm text-[#304035]/70 truncate">{d.title}</div>
                  <div className="text-xs text-[#304035]/45 mt-0.5">
                    {d.project?.name ? `${d.project.name} · ` : ''}envoyée le {fmt(d.createdAt)}
                    {d.scheduledFor ? ` · prévue ${fmt(d.scheduledFor)}` : ''}
                  </div>
                </div>
                <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: st.bg, color: st.color }}>
                  {st.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
