'use client';

/**
 * Module SAV (Service Apres Vente).
 *
 * Vue dediee aux demandes type=SAV avec :
 *  - KPIs : ouverts, en cours, termines ce mois, delai moyen
 *  - Liste filtrable par projet / statut / urgence
 *  - Bouton "Nouveau SAV" qui ouvre le drawer SendToIntervenant pre-rempli
 *  - Lien vers chaque demande detail (cote pro on reutilise /intervenants?demande=id)
 */
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Wrench, AlertCircle, Clock, CheckCircle2, FolderSearch, Send, ChevronRight, BarChart3, Filter } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useDemandesStore } from '@/store/useDemandesStore';
import { Demande, DEMANDE_STATUS_LABELS, DemandeStatus } from '@/lib/demandes-api';
import { SendToIntervenantButton } from '@/components/demandes/SendToIntervenantButton';
import { StatusBadge } from '@/app/intervenant/components/StatusBadge';

const STATUS_FILTERS: Array<{ value: DemandeStatus | 'OPEN' | 'ALL'; label: string; tone: string }> = [
  { value: 'ALL',      label: 'Tous',           tone: '#3D5449' },
  { value: 'OPEN',     label: 'Ouverts',        tone: '#c2410c' },
  { value: 'EN_COURS', label: 'En cours',       tone: '#1d4ed8' },
  { value: 'TERMINEE', label: 'Terminés',       tone: '#15803d' },
  { value: 'REFUSEE',  label: 'Refusés',        tone: '#b91c1c' },
];

export default function SAVPage() {
  const proDemandes = useDemandesStore(s => s.proDemandes);
  const setProFilters = useDemandesStore(s => s.setProFilters);
  const fetchProDemandes = useDemandesStore(s => s.fetchProDemandes);
  const loading = useDemandesStore(s => s.loadingProList);

  const [filter, setFilter] = useState<DemandeStatus | 'OPEN' | 'ALL'>('OPEN');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setProFilters({ type: 'SAV' });
    // setProFilters appelle deja fetchProDemandes
  }, [setProFilters]);

  // Demandes type=SAV uniquement (defensif, le filtre store doit deja le faire)
  const savs = useMemo(() => proDemandes.filter((d) => d.type === 'SAV'), [proDemandes]);

  // Filtre status + recherche
  const filtered = useMemo(() => {
    let list = savs;
    if (filter === 'OPEN') {
      list = list.filter((d) => ['ENVOYEE', 'VUE', 'ACCEPTEE'].includes(d.status));
    } else if (filter !== 'ALL') {
      list = list.filter((d) => d.status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((d) =>
        d.title.toLowerCase().includes(q)
        || (d.notes ?? '').toLowerCase().includes(q)
        || (d.intervenant?.companyName ?? '').toLowerCase().includes(q)
        || (d.project?.name ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [savs, filter, search]);

  // KPIs
  const kpis = useMemo(() => {
    const open = savs.filter((d) => ['ENVOYEE', 'VUE', 'ACCEPTEE'].includes(d.status)).length;
    const enCours = savs.filter((d) => d.status === 'EN_COURS').length;
    const now = Date.now();
    const monthAgo = now - 30 * 86400_000;
    const closedThisMonth = savs.filter((d) =>
      d.status === 'TERMINEE'
      && d.completedAt
      && new Date(d.completedAt).getTime() > monthAgo
    ).length;
    // Delai moyen creation -> termine
    const completed = savs.filter((d) => d.status === 'TERMINEE' && d.completedAt);
    const avgDays = completed.length > 0
      ? Math.round(
          completed.reduce((acc, d) =>
            acc + (new Date(d.completedAt!).getTime() - new Date(d.createdAt).getTime()), 0
          ) / completed.length / 86400_000
        )
      : null;
    return { open, enCours, closedThisMonth, avgDays };
  }, [savs]);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Wrench className="h-7 w-7" />}
        title="SAV"
        subtitle={`${savs.length} ticket${savs.length !== 1 ? 's' : ''} SAV — ${kpis.open} ouvert${kpis.open !== 1 ? 's' : ''}`}
        actions={
          <SendToIntervenantButton
            variant="primary"
            label="Nouveau SAV"
            prefill={{ type: 'SAV', title: 'SAV — ' }}
          />
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="SAV ouverts" value={kpis.open} icon={<AlertCircle className="h-4 w-4" />} tone="orange" />
        <Kpi label="En intervention" value={kpis.enCours} icon={<Clock className="h-4 w-4" />} tone="blue" />
        <Kpi label="Clos ce mois" value={kpis.closedThisMonth} icon={<CheckCircle2 className="h-4 w-4" />} tone="emerald" />
        <Kpi label="Délai moyen" value={kpis.avgDays !== null ? `${kpis.avgDays}j` : '—'} icon={<BarChart3 className="h-4 w-4" />} tone="neutral" />
      </div>

      {/* Filtres */}
      <div className="rounded-2xl bg-white border border-[#304035]/8 shadow-sm p-3 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((s) => {
            const active = filter === s.value;
            return (
              <button
                key={s.value}
                onClick={() => setFilter(s.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: active ? s.tone : 'transparent',
                  color: active ? '#fff' : '#3D5449',
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <div className="ml-auto relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="pl-9 pr-3 py-1.5 rounded-lg border border-[#304035]/12 text-xs focus:outline-none focus:ring-2 focus:ring-[#304035]/20 w-48"
          />
          <FolderSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#304035]/40" />
        </div>
      </div>

      {/* Liste */}
      {loading && filtered.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white border border-[#304035]/6 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-[#304035]/8 p-12 text-center">
          <Wrench className="h-10 w-10 text-[#a67749]/40 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#304035] mb-1">Aucun SAV</h3>
          <p className="text-xs text-[#304035]/55 mb-4">
            {filter === 'OPEN' ? 'Aucun ticket SAV ouvert.' : 'Aucun ticket dans cette categorie.'}
          </p>
          {filter !== 'ALL' && (
            <button onClick={() => setFilter('ALL')} className="text-xs font-bold text-[#a67749] hover:underline">
              Voir tous les tickets
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => <SAVRow key={d.id} demande={d} />)}
        </div>
      )}
    </div>
  );
}

// ─── Components ─────────────────────────────────────────────────────────────

function Kpi({ label, value, icon, tone }: {
  label: string; value: number | string; icon: React.ReactNode;
  tone: 'orange' | 'blue' | 'emerald' | 'neutral';
}) {
  const colors = {
    orange:  { bg: 'bg-orange-50',  ring: 'border-orange-100', icon: 'bg-orange-500',  text: 'text-orange-700' },
    blue:    { bg: 'bg-blue-50',    ring: 'border-blue-100',   icon: 'bg-blue-500',    text: 'text-blue-700' },
    emerald: { bg: 'bg-emerald-50', ring: 'border-emerald-100',icon: 'bg-emerald-500', text: 'text-emerald-700' },
    neutral: { bg: 'bg-white',      ring: 'border-[#304035]/8',icon: 'bg-[#304035]',   text: 'text-[#304035]' },
  }[tone];
  return (
    <div className={`rounded-2xl ${colors.bg} ${colors.ring} border p-4 shadow-sm`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`h-8 w-8 rounded-xl ${colors.icon} text-white flex items-center justify-center shrink-0`}>
          {icon}
        </div>
      </div>
      <div className={`text-2xl font-bold ${colors.text}`}>{value}</div>
      <div className={`text-xs font-semibold ${colors.text} opacity-60 mt-0.5`}>{label}</div>
    </div>
  );
}

function SAVRow({ demande: d }: { demande: Demande }) {
  const intervenantName = d.intervenant?.companyName
    ?? [d.intervenant?.firstName, d.intervenant?.lastName].filter(Boolean).join(' ')
    ?? '—';
  return (
    <Link
      href={`/intervenants?demande=${d.id}`}
      className="block rounded-xl bg-white border border-[#304035]/8 hover:border-[#a67749]/40 hover:shadow-md transition-all p-4 group"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
          <Wrench className="h-4 w-4 text-orange-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-bold text-[#304035] truncate group-hover:text-[#a67749] transition-colors">{d.title}</h3>
            <StatusBadge status={d.status} size="sm" />
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[#304035]/60 flex-wrap">
            {d.project?.name && <span>📂 {d.project.name}</span>}
            <span>👷 {intervenantName}</span>
            <span>· {new Date(d.createdAt).toLocaleDateString('fr-FR')}</span>
            {d.scheduledFor && (
              <span className="text-[#7c4f1d] font-bold">
                · 🗓 {new Date(d.scheduledFor).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
          {d.notes && (
            <p className="text-xs text-[#304035]/55 mt-1.5 line-clamp-2">{d.notes}</p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-[#a67749]/40 group-hover:text-[#a67749] transition-colors shrink-0 mt-1" />
      </div>
    </Link>
  );
}
