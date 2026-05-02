'use client';

import { useState, useMemo } from 'react';
import {
  Clock, Search, X, Filter,
  FolderOpen, FileText, CreditCard, Package,
  HardHat, CalendarDays, CheckCircle2, AlertTriangle,
  TrendingUp, Activity,
} from 'lucide-react';
import { useFacturationStore, useHistoryStore } from '@/store';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';

// ─── Catégories d'actions ─────────────────────────────────────────────────────

type Category = 'tout' | 'dossier' | 'facture' | 'devis' | 'paiement' | 'intervenant' | 'autre';

function getCategory(action: string): Category {
  const a = action.toLowerCase();
  if (a.includes('dossier') || a.includes('signé') || a.includes('perdu') || a.includes('statut')) return 'dossier';
  if (a.includes('facture')) return 'facture';
  if (a.includes('devis')) return 'devis';
  if (a.includes('paiement') || a.includes('payée') || a.includes('encaissé')) return 'paiement';
  if (a.includes('intervenant')) return 'intervenant';
  return 'autre';
}

const CATEGORY_CFG: Record<Category, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  tout:         { label: 'Tout',         icon: Activity,      color: 'text-[#304035]',   bg: 'bg-[#304035]/8' },
  dossier:      { label: 'Dossiers',     icon: FolderOpen,    color: 'text-amber-700',   bg: 'bg-amber-50' },
  facture:      { label: 'Factures',     icon: FileText,      color: 'text-violet-700',  bg: 'bg-violet-50' },
  devis:        { label: 'Devis',        icon: FileText,      color: 'text-blue-700',    bg: 'bg-blue-50' },
  paiement:     { label: 'Paiements',    icon: CreditCard,    color: 'text-emerald-700', bg: 'bg-emerald-50' },
  intervenant:  { label: 'Intervenants', icon: HardHat,       color: 'text-stone-700',   bg: 'bg-stone-50' },
  autre:        { label: 'Autre',        icon: Package,       color: 'text-[#304035]/60', bg: 'bg-[#304035]/5' },
};

// ─── Icône par catégorie ──────────────────────────────────────────────────────

function ActionIcon({ action }: { action: string }) {
  const cat = getCategory(action);
  const cfg = CATEGORY_CFG[cat];
  const Icon = cfg.icon;
  return (
    <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', cfg.bg)}>
      <Icon className={cn('h-4 w-4', cfg.color)} />
    </div>
  );
}

// ─── Temps relatif ────────────────────────────────────────────────────────────

function relativeTime(timeStr: string): { relative: string; full: string } {
  // Format attendu : "27/03/2026 19:47"
  const parts = timeStr.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);
  if (!parts) return { relative: timeStr, full: timeStr };
  const [, dd, mm, yyyy, hh, min] = parts;
  const date = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00`);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  let relative: string;
  if (diffMin < 1)        relative = "à l'instant";
  else if (diffMin < 60)  relative = `il y a ${diffMin} min`;
  else if (diffH < 24)    relative = `il y a ${diffH}h`;
  else if (diffD === 1)   relative = 'hier';
  else if (diffD < 7)     relative = `il y a ${diffD} jours`;
  else                    relative = `${dd}/${mm}/${yyyy}`;

  return { relative, full: timeStr };
}

// ─── Séparateur de date ───────────────────────────────────────────────────────

function parseDateOnly(timeStr: string): string {
  const parts = timeStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!parts) return timeStr;
  const [, dd, mm, yyyy] = parts;
  const date = new Date(`${yyyy}-${mm}-${dd}`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const dateMidnight = new Date(`${yyyy}-${mm}-${dd}`);
  if (dateMidnight.getTime() === now.getTime()) return "Aujourd'hui";
  if (dateMidnight.getTime() === yesterday.getTime()) return 'Hier';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function HistoriquePage() {
  const historyLogs = useHistoryStore(s => s.historyLogs);

  const [search, setSearch] = useState('');
  const [filterUser, setFilterUser] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<Category>('tout');

  const users = useMemo(() => {
    const set = new Set(historyLogs.map(l => l.user));
    return Array.from(set);
  }, [historyLogs]);

  // Logs filtrés
  const filtered = useMemo(() => {
    return historyLogs.filter(log => {
      const q = search.toLowerCase();
      const matchSearch = !q || log.action.toLowerCase().includes(q) || log.target.toLowerCase().includes(q) || log.user.toLowerCase().includes(q);
      const matchUser = !filterUser || log.user === filterUser;
      const matchCat = filterCat === 'tout' || getCategory(log.action) === filterCat;
      return matchSearch && matchUser && matchCat;
    });
  }, [historyLogs, search, filterUser, filterCat]);

  // Groupement par date
  const grouped = useMemo(() => {
    const groups: { date: string; logs: typeof historyLogs }[] = [];
    let currentDate = '';
    filtered.forEach(log => {
      const dateKey = log.time.slice(0, 10); // dd/mm/yyyy
      if (dateKey !== currentDate) {
        currentDate = dateKey;
        groups.push({ date: parseDateOnly(log.time), logs: [log] });
      } else {
        groups[groups.length - 1].logs.push(log);
      }
    });
    return groups;
  }, [filtered]);

  // Stats par utilisateur
  const userStats = useMemo(() => {
    const stats: Record<string, number> = {};
    historyLogs.forEach(l => { stats[l.user] = (stats[l.user] || 0) + 1; });
    return stats;
  }, [historyLogs]);

  const CATEGORIES: Category[] = ['tout', 'dossier', 'facture', 'devis', 'paiement', 'intervenant'];

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <PageHeader
        icon={<Clock className="h-7 w-7" />}
        title="Historique"
        subtitle={filtered.length !== historyLogs.length
          ? `${filtered.length} sur ${historyLogs.length} action${historyLogs.length > 1 ? 's' : ''}`
          : `${historyLogs.length} action${historyLogs.length > 1 ? 's' : ''} enregistrée${historyLogs.length > 1 ? 's' : ''}`}
      />

      {/* ── Recherche + filtres catégorie ── */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#304035]/35 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une action, un client, un utilisateur…"
            className="w-full rounded-2xl border border-[#304035]/12 bg-white pl-11 pr-10 py-3 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#304035]/20 shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 hover:bg-[#304035]/8 text-[#304035]/35 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Chips catégories */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => {
          const cfg = CATEGORY_CFG[cat];
          const Icon = cfg.icon;
          const active = filterCat === cat;
          const count = cat === 'tout' ? historyLogs.length : historyLogs.filter(l => getCategory(l.action) === cat).length;
          if (cat !== 'tout' && count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all border',
                active
                  ? cn(cfg.bg, cfg.color, 'border-transparent shadow-sm')
                  : 'bg-white text-[#304035]/50 border-[#304035]/12 hover:border-[#304035]/25 hover:text-[#304035]'
              )}
            >
              <Icon className="h-3 w-3" />
              {cfg.label}
              <span className={cn('text-[9px] font-bold', active ? 'opacity-70' : 'text-[#304035]/40')}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* ── Liste groupée ── */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-[#304035]/10 py-16 text-center shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-[#304035]/5 flex items-center justify-center mx-auto mb-4">
            <Activity className="h-7 w-7 text-[#304035]/20" />
          </div>
          <p className="text-[#304035]/40 text-sm font-medium">Aucune action trouvée</p>
          {(search || filterUser || filterCat !== 'tout') && (
            <button onClick={() => { setSearch(''); setFilterUser(null); setFilterCat('tout'); }}
              className="mt-3 text-xs text-[#a67749] font-bold hover:underline">
              Effacer les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group, gi) => (
            <div key={gi}>
              {/* Séparateur de date */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-bold text-[#304035]/40 uppercase tracking-widest whitespace-nowrap">{group.date}</span>
                <div className="flex-1 h-px bg-[#304035]/8" />
                <span className="text-[10px] text-[#304035]/30 font-medium">{group.logs.length} action{group.logs.length > 1 ? 's' : ''}</span>
              </div>

              {/* Entrées du groupe */}
              <div className="rounded-2xl bg-white border border-[#304035]/10 shadow-sm overflow-hidden">
                <div className="divide-y divide-[#304035]/5">
                  {group.logs.map((log, li) => {
                    const { relative, full } = relativeTime(log.time);
                    const cat = getCategory(log.action);
                    const catCfg = CATEGORY_CFG[cat];

                    return (
                      <div key={log.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#f5eee8]/30 transition-colors group">
                        {/* Icône catégorie */}
                        <ActionIcon action={log.action} />

                        {/* Contenu */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Action */}
                            <span className="text-sm font-semibold text-[#304035]">{log.action}</span>
                          </div>
                          {/* Cible */}
                          <p className="text-xs text-[#304035]/50 mt-0.5 truncate">{log.target}</p>
                        </div>

                        {/* Heure relative */}
                        <div className="flex flex-col items-end shrink-0 gap-0.5" title={full}>
                          <span className="text-xs text-[#304035]/40 font-medium">{log.time.slice(11)}</span>
                          <span className="text-[10px] text-[#304035]/30">{relative}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
