'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilePlus, Search, X, ChevronRight, AlertTriangle, Clock, CheckCircle2, Circle, Phone, Mail, MapPin, FolderOpen, LayoutGrid, List, Trash2 } from 'lucide-react';
import { useDossierStore } from '@/store';
import { ValidationDashboard } from '@/components/dossiers/ValidationDashboard';
import { DeleteDossierModal } from '@/components/dossiers/DeleteDossierModal';
import { useProjectActions } from '@/hooks/useProjectActions';

const STATUS_CONFIG: Record<string, {
  label: string;
  badgeBg: string;
  badgeText: string;
  cardBorder: string;
  cardAccent: string;
  dotColor: string;
  iconColor: string;
  glowColor: string;
  tagBg: string;
  Icon: React.ElementType;
}> = {
  'URGENT': {
    label: 'URGENT',
    badgeBg: 'bg-red-500',
    badgeText: 'text-white',
    cardBorder: 'border-red-200',
    cardAccent: 'from-red-500',
    dotColor: 'bg-red-500',
    iconColor: 'text-red-500',
    glowColor: 'rgba(239,68,68,0.12)',
    tagBg: 'bg-red-50 text-red-600 border-red-200',
    Icon: AlertTriangle,
  },
  'EN COURS': {
    label: 'EN COURS',
    badgeBg: 'bg-orange-400',
    badgeText: 'text-white',
    cardBorder: 'border-orange-200',
    cardAccent: 'from-orange-400',
    dotColor: 'bg-orange-400',
    iconColor: 'text-orange-500',
    glowColor: 'rgba(251,146,60,0.12)',
    tagBg: 'bg-orange-50 text-orange-600 border-orange-200',
    Icon: Clock,
  },
  'FINITION': {
    label: 'FINITION',
    badgeBg: 'bg-emerald-500',
    badgeText: 'text-white',
    cardBorder: 'border-emerald-200',
    cardAccent: 'from-emerald-500',
    dotColor: 'bg-emerald-500',
    iconColor: 'text-emerald-600',
    glowColor: 'rgba(16,185,129,0.12)',
    tagBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Icon: CheckCircle2,
  },
  'A VALIDER': {
    label: 'À VALIDER',
    badgeBg: 'bg-green-400',
    badgeText: 'text-white',
    cardBorder: 'border-green-200',
    cardAccent: 'from-green-400',
    dotColor: 'bg-green-400',
    iconColor: 'text-green-600',
    glowColor: 'rgba(74,222,128,0.12)',
    tagBg: 'bg-green-50 text-green-700 border-green-200',
    Icon: Circle,
  },
};

const STATUS_ORDER = ['URGENT', 'EN COURS', 'FINITION', 'A VALIDER'];

// Génère une couleur d'avatar déterministe basée sur le nom
function avatarColor(name: string) {
  const colors = [
    ['#2d5a30', '#4aa350'],
    ['#7c3a1e', '#c08a5a'],
    ['#1e3a5f', '#4a7ec0'],
    ['#5a2d5a', '#c04aa3'],
    ['#3a4a1e', '#7ec04a'],
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

export default function DossiersPage() {
  const dossiers = useDossierStore(s => s.dossiers);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('status');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // ── Suppression ─────────────────────────────────────────────────────────
  const { deleteProject } = useProjectActions();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; firstName?: string; itemsCount: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const askDelete = (e: React.MouseEvent, d: { id: string; name: string; firstName?: string; subfolders: { length: number }[] | { length: number } }) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteError(null);
    setDeleteTarget({
      id: d.id,
      name: d.name,
      firstName: d.firstName,
      itemsCount: Array.isArray(d.subfolders) ? d.subfolders.length : 0,
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteProject(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err?.message ?? 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    let list = [...dossiers];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.firstName?.toLowerCase() ?? '').includes(q) ||
        (d.email?.toLowerCase() ?? '').includes(q) ||
        (d.phone ?? '').includes(q)
      );
    }
    if (filterStatus) list = list.filter(d => d.status === filterStatus);
    list.sort((a, b) => {
      if (sortBy === 'status') return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'date') return b.createdAt.localeCompare(a.createdAt);
      return 0;
    });
    return list;
  }, [dossiers, search, filterStatus, sortBy]);

  const counts = {
    URGENT: dossiers.filter(d => d.status === 'URGENT').length,
    'EN COURS': dossiers.filter(d => d.status === 'EN COURS').length,
    FINITION: dossiers.filter(d => d.status === 'FINITION').length,
    'A VALIDER': dossiers.filter(d => d.status === 'A VALIDER').length,
  };

  // Progression simulée selon le statut
  const progressMap: Record<string, number> = {
    'URGENT': 15,
    'EN COURS': 50,
    'FINITION': 80,
    'A VALIDER': 95,
  };

  return (
    <div className="space-y-6 w-full">
      <style>{`
        @media (max-width: 768px) {
          .dos-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .dos-search-bar { flex-direction: column !important; }
          .dos-search-bar > * { width: 100% !important; }
          .dos-top-row { grid-template-columns: 1fr !important; }
        }
      `}</style>


      {/* ── HEADER ── */}
      <PageHeader
        icon={<FolderOpen className="h-7 w-7" />}
        title="Dossiers en cours"
        subtitle={`${dossiers.length} dossier${dossiers.length > 1 ? 's' : ''} en gestion active`}
        actions={
          <>
            <div className="flex items-center bg-white/15 rounded-xl border border-white/20 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-[#304035] shadow-sm' : 'text-white/60 hover:text-white'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-[#304035] shadow-sm' : 'text-white/60 hover:text-white'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Link
              href="/dossiers/nouveau"
              className="flex items-center gap-2 rounded-xl bg-[#a67749] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#c08a5a] shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <FilePlus className="h-4 w-4" />
              Nouveau dossier
            </Link>
          </>
        }
      />

      {/* ── TOP ROW : KPI STRIP (2/3) + VALIDATION DASHBOARD (1/3) ── */}
      <div className="dos-top-row grid gap-4" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
        <div className="dos-kpi-grid grid grid-cols-4 gap-3 content-start">
          {Object.entries(counts).map(([status, count]) => {
          const cfg = STATUS_CONFIG[status];
          const Icon = cfg.Icon;
          const isActive = filterStatus === status;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(isActive ? '' : status)}
              className={`relative rounded-2xl p-4 text-left transition-all duration-200 border ${
                isActive
                  ? 'bg-[#304035] border-[#304035] shadow-md'
                  : count === 0
                  ? 'bg-white border-[#304035]/5 opacity-50'
                  : 'bg-white border-[#304035]/8 hover:border-[#304035]/20'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-xl ${isActive ? 'bg-white/10' : 'bg-[#304035]/5'}`}>
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : cfg.iconColor}`} />
                </div>
                <div className={`h-2 w-2 rounded-full ${count > 0 ? cfg.dotColor : 'bg-[#304035]/15'} ${isActive ? 'ring-2 ring-white/40' : ''}`} />
              </div>
              <div className={`text-2xl font-bold ${isActive ? 'text-white' : count === 0 ? 'text-[#304035]/30' : 'text-[#304035]'}`}>{count}</div>
              <div className={`text-xs font-semibold mt-0.5 ${isActive ? 'text-white/70' : 'text-[#304035]/50'}`}>{cfg.label}</div>
            </button>
          );
        })}
        </div>

        {/* ── VALIDATION DASHBOARD (top-right) ── */}
        <ValidationDashboard />
      </div>

      {/* ── SEARCH + SORT BAR ── */}
      <div className="dos-search-bar flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#304035]/35" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, email, téléphone…"
            className="w-full rounded-xl border border-[#304035]/12 bg-white pl-11 pr-10 py-3 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#304035]/20 shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#304035]/40 hover:text-[#304035]">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 bg-white rounded-xl border border-[#304035]/10 p-1 shadow-sm">
          {[
            { key: 'status', label: 'Priorité' },
            { key: 'date', label: 'Date' },
            { key: 'name', label: 'Nom' },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key as typeof sortBy)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                sortBy === opt.key
                  ? 'bg-[#304035] text-white shadow-sm'
                  : 'text-[#304035]/50 hover:text-[#304035]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {/* Tous */}
        <button
          onClick={() => setFilterStatus('')}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
            !filterStatus
              ? 'bg-[#304035] text-white border-[#304035] shadow-md'
              : 'bg-white text-[#304035]/60 border-[#304035]/12 hover:border-[#304035]/30'
          }`}
        >
          Tous ({dossiers.length})
        </button>
      </div>

      {/* ── Résultats info ── */}
      {(search || filterStatus) && (
        <p className="text-xs text-[#304035]/45 -mt-2">
          {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
          {search && <span> pour <strong className="text-[#304035]">« {search} »</strong></span>}
          {filterStatus && <span> · {filterStatus}</span>}
        </p>
      )}

      {/* ── GRILLE / LISTE ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#304035]/8 shadow-sm overflow-hidden" style={{ minHeight: 420, width: '100%' }}>
          {filterStatus && STATUS_CONFIG[filterStatus] && (() => {
            const cfg = STATUS_CONFIG[filterStatus];
            return (
              <div className={`h-1.5 w-full bg-gradient-to-r ${cfg.cardAccent} to-transparent`} />
            );
          })()}
          <div className="px-8 py-20 text-center">
            <div className="relative inline-flex mb-4">
              <div className="absolute inset-0 rounded-2xl blur-xl" style={{ background: 'rgba(48,64,53,0.08)' }} />
              <div className="relative bg-[#304035]/5 rounded-2xl p-4">
                <FolderOpen className="h-10 w-10 text-[#304035]/20" />
              </div>
            </div>
            <p className="text-[#304035]/60 text-sm font-medium mb-1">
              {search ? `Aucun résultat pour « ${search} »` : filterStatus ? `Aucun dossier ${STATUS_CONFIG[filterStatus]?.label ?? filterStatus}` : 'Aucun dossier'}
            </p>
            <p className="text-[#304035]/30 text-xs mb-5">
              {filterStatus && !search ? 'Aucun dossier ne correspond à ce statut pour le moment.' : 'Essayez de modifier votre recherche.'}
            </p>
            <div className="flex items-center justify-center gap-2">
              {search && (
                <button onClick={() => setSearch('')} className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#304035]/5 text-[#304035]/60 hover:bg-[#304035]/10 transition-all">
                  Effacer la recherche
                </button>
              )}
              {filterStatus && (
                <button onClick={() => setFilterStatus('')} className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#304035] text-white hover:bg-[#304035]/80 transition-all">
                  Voir tous les dossiers
                </button>
              )}
            </div>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── GRID MODE ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((d, i) => {
            const cfg = STATUS_CONFIG[d.status] ?? STATUS_CONFIG['EN COURS'];
            const Icon = cfg.Icon;
            // Progression reelle : ratio de sous-dossiers valides.
            // Fallback sur progressMap si le dossier n'a pas encore de sous-dossiers.
            const totalSubs = d.subfolders.length;
            const validatedSubs = d.subfolders.filter(sf => sf.validated).length;
            const progress = totalSubs === 0
              ? (progressMap[d.status] ?? 0)
              : Math.round((validatedSubs / totalSubs) * 100);
            const [c1, c2] = avatarColor(d.name);
            const initials = `${d.name.charAt(0)}${d.firstName ? d.firstName.charAt(0) : ''}`.toUpperCase();

            return (
              <Link
                key={d.id}
                href={`/dossiers/${d.id}`}
                className="dossier-card group block"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div
                  className={`relative bg-white rounded-2xl border ${cfg.cardBorder} shadow-sm overflow-hidden`}
                  style={{ boxShadow: `0 2px 8px ${cfg.glowColor}, 0 1px 2px rgba(0,0,0,0.04)` }}
                >
                  {/* Bande couleur top */}
                  <div className={`h-1.5 w-full bg-gradient-to-r ${cfg.cardAccent} to-transparent`} />

                  <div className="p-5">
                    {/* Row 1 : Avatar + Badge statut */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="relative">
                        {/* Avatar cercle */}
                        <div
                          className="h-12 w-12 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-md select-none"
                          style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                        >
                          {initials}
                        </div>
                        {/* Ring hover */}
                        <div
                          className="avatar-ring absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-200"
                          style={{ boxShadow: `0 0 0 3px ${c2}55` }}
                        />
                      </div>

                      {/* Badge statut + bouton corbeille */}
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${cfg.tagBg}`}>
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => askDelete(e, d)}
                          className="dossier-delete-btn flex items-center justify-center h-7 w-7 rounded-lg bg-[#304035]/5 text-[#304035]/35 hover:bg-red-50 hover:text-red-600 hover:scale-105 transition-all opacity-0 group-hover:opacity-100"
                          title="Supprimer ce dossier"
                          aria-label={`Supprimer ${d.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Nom */}
                    <div className="mb-1">
                      <h3 className="font-bold text-[#304035] text-base leading-tight group-hover:text-[#a67749] transition-colors">
                        {d.name}{d.firstName ? ` ${d.firstName}` : ''}
                      </h3>
                      <p className="text-xs text-[#304035]/40 mt-0.5">Créé le {d.createdAt}</p>
                    </div>

                    {/* Infos contact */}
                    <div className="space-y-1 mb-4 mt-3">
                      {d.phone && (
                        <div className="flex items-center gap-2 text-xs text-[#304035]/55">
                          <Phone className="h-3 w-3 shrink-0 text-[#304035]/30" />
                          <span>{d.phone}</span>
                        </div>
                      )}
                      {d.email && (
                        <div className="flex items-center gap-2 text-xs text-[#304035]/55">
                          <Mail className="h-3 w-3 shrink-0 text-[#304035]/30" />
                          <span className="truncate">{d.email}</span>
                        </div>
                      )}
                      {d.address && (
                        <div className="flex items-center gap-2 text-xs text-[#304035]/55">
                          <MapPin className="h-3 w-3 shrink-0 text-[#304035]/30" />
                          <span className="truncate">{d.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Barre progression */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-[#304035]/40 font-medium">Progression</span>
                        <span className="text-xs font-bold text-[#304035]/60">{progress}%</span>
                      </div>
                      <div className="h-1.5 bg-[#304035]/8 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full progress-bar bg-gradient-to-r ${cfg.cardAccent} to-transparent`}
                          style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${c1}, ${c2})` }}
                        />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#304035]/5">
                      <span className="text-xs text-[#304035]/40">
                        {d.subfolders.length} élément{d.subfolders.length > 1 ? 's' : ''}
                      </span>
                      <div className="flex items-center gap-1 text-xs font-semibold text-[#a67749]">
                        <span>Voir le dossier</span>
                        <ChevronRight className="card-arrow h-3.5 w-3.5 transition-transform duration-150" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* ── LIST MODE ── */
        <div className="bg-white rounded-2xl border border-[#304035]/8 shadow-sm overflow-hidden">
          <div className="divide-y divide-[#304035]/5">
            {filtered.map((d, i) => {
              const cfg = STATUS_CONFIG[d.status] ?? STATUS_CONFIG['EN COURS'];
              const Icon = cfg.Icon;
              const [c1, c2] = avatarColor(d.name);
              const initials = `${d.name.charAt(0)}${d.firstName ? d.firstName.charAt(0) : ''}`.toUpperCase();

              return (
                <Link
                  key={d.id}
                  href={`/dossiers/${d.id}`}
                  className="dossier-card flex items-center gap-4 px-5 py-4 hover:bg-[#f5eee8]/40 transition-all group"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  {/* Barre couleur gauche */}
                  <div className={`w-1 h-10 rounded-full bg-gradient-to-b ${cfg.cardAccent} to-transparent shrink-0`} style={{ background: `linear-gradient(180deg, ${c1}, ${c2})` }} />

                  {/* Avatar */}
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0"
                    style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                  >
                    {initials}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#304035] group-hover:text-[#a67749] transition-colors text-sm">
                      {d.name}{d.firstName ? ` ${d.firstName}` : ''}
                    </p>
                    <p className="text-xs text-[#304035]/40 mt-0.5">
                      {d.createdAt}{d.phone ? ` · ${d.phone}` : ''}
                    </p>
                  </div>

                  {/* Éléments */}
                  <span className="text-xs text-[#304035]/35 shrink-0">{d.subfolders.length} élém.</span>

                  {/* Badge */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold shrink-0 ${cfg.tagBg}`}>
                    <Icon className="h-3 w-3" />
                    {cfg.label}
                  </div>

                  {/* Bouton corbeille (apparait au hover) */}
                  <button
                    type="button"
                    onClick={(e) => askDelete(e, d)}
                    className="flex items-center justify-center h-8 w-8 rounded-lg bg-transparent text-[#304035]/35 hover:bg-red-50 hover:text-red-600 hover:scale-105 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                    title="Supprimer ce dossier"
                    aria-label={`Supprimer ${d.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <ChevronRight className="card-arrow h-4 w-4 text-[#304035]/25 group-hover:text-[#a67749] transition-all shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression — disponible pour les 3 portails */}
      <DeleteDossierModal
        open={!!deleteTarget}
        dossierName={deleteTarget?.name ?? ''}
        dossierFirstName={deleteTarget?.firstName}
        itemsCount={deleteTarget?.itemsCount ?? 0}
        loading={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => { if (!deleting) { setDeleteTarget(null); setDeleteError(null); } }}
      />
    </div>
  );
}
