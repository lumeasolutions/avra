'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import {
  FolderOpen, FolderCheck, AlertTriangle, TrendingUp,
  ShoppingCart, CalendarCog, Users, Bell, BarChart3, ChevronRight,
  Clock, CheckSquare, FileWarning, Package, BadgeCheck, Target,
  Circle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useDossierStore, useFacturationStore, useHistoryStore, useIntervenantStore, usePlanningStore } from '@/store';
import { PageHeader } from '@/components/layout/PageHeader';

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Store data for local features
  const storeDevis         = useFacturationStore(s => s.devis);
  const storeInvoices      = useFacturationStore(s => s.invoices);
  const storeSignes        = useDossierStore(s => s.dossiersSignes);
  const storeDossiers      = useDossierStore(s => s.dossiers);
  const storeDatesButoiresSignes = useDossierStore(s => s.datesButoiresSignes);
  const storeLogs          = useHistoryStore(s => s.historyLogs);
  const storePlanningEvents = usePlanningStore(s => s.planningEvents);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    Promise.all([
      api<any>('/stats/global').catch(() => null),
      api<any>('/projects?page=1&pageSize=100').catch(() => null),
    ])
      .then(([statsData, projectsData]) => {
        if (cancelled) return;
        setStats(statsData);
        setProjects(projectsData?.data ?? []);
      })
      .catch(e => { if (!cancelled) console.error(e); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const today = new Date();
  const todayDayIndex = (today.getDay() + 6) % 7; // Mon=0 … Sun=6

  // ── Actions à faire (Point 11) ─────────────────────────────────────────
  const actionsAFaire = useMemo(() => {
    const actions: { id: string; type: 'devis' | 'facture' | 'confirmation' | 'dossier'; label: string; detail: string; href: string; priority: 'high' | 'medium' | 'low' }[] = [];

    // Devis en attente de réponse depuis > 7 jours
    storeDevis.filter(d => d.statut === 'ENVOYÉ').forEach(d => {
      actions.push({ id: 'dv-' + d.id, type: 'devis', label: `Devis ${d.ref} en attente`, detail: `${d.client} · Envoyé le ${d.dateCreation}`, href: '/facturation', priority: 'medium' });
    });

    // Devis en attente de signature
    storeDevis.filter(d => d.signatureStatus === 'EN_ATTENTE_SIGNATURE').forEach(d => {
      actions.push({ id: 'sg-' + d.id, type: 'devis', label: `Signature en attente — ${d.ref}`, detail: `${d.client} · En cours de signature`, href: '/facturation', priority: 'high' });
    });

    // Factures en retard
    storeInvoices.filter(i => i.statut === 'RETARD').forEach(inv => {
      actions.push({ id: 'fr-' + inv.id, type: 'facture', label: `Facture en retard — ${inv.ref}`, detail: `${inv.client} · ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(inv.montantHT)}`, href: '/facturation', priority: 'high' });
    });

    // Factures EN ATTENTE
    storeInvoices.filter(i => i.statut === 'EN ATTENTE').slice(0, 3).forEach(inv => {
      actions.push({ id: 'fa-' + inv.id, type: 'facture', label: `Facture à encaisser — ${inv.ref}`, detail: `${inv.client}`, href: '/facturation', priority: 'low' });
    });

    // Confirmations fournisseurs en attente
    storeSignes.forEach(d => {
      const pending = (d.confirmations ?? []).filter(c => !c.validee);
      if (pending.length > 0) {
        actions.push({ id: 'cf-' + d.id, type: 'confirmation', label: `${pending.length} confirmation(s) en attente`, detail: d.name, href: '/dossiers-signes', priority: 'medium' });
      }
    });

    // Sort: high first
    return actions.sort((a, b) => (a.priority === 'high' ? -1 : b.priority === 'high' ? 1 : 0));
  }, [storeDevis, storeInvoices, storeSignes]);

  if (loading) {
    return <div className="text-center py-12 text-[#304035]/50">Chargement...</div>;
  }

  const dossiers       = projects;
  const dossiersSignes = projects.filter(p => p.lifecycleStatus === 'SIGNE');
  const urgents  = dossiers.filter(d => d.lifecycleStatus === 'VENTE');
  const finition = dossiers.filter(d => d.lifecycleStatus === 'RECEPTION');

  const caEncaisse = stats?.caTotal ?? 0;

  // Planning du jour : events whose day index matches today (weekOffset=0 = current week)
  const todayEvents = storePlanningEvents.filter(ev => ev.day === todayDayIndex && (ev.weekOffset ?? 0) === 0);

  // Activité récente : 8 derniers logs
  const recentLogs = storeLogs.slice(0, 8);

  const KPIs = [
    { label: 'Dossiers actifs',   value: stats?.projectsInVente ?? 0,      icon: <FolderOpen className="h-6 w-6" />,   color: 'bg-[#304035]',    href: '/dossiers' },
    { label: 'Dossiers signés',   value: stats?.projectsSignes ?? 0,       icon: <FolderCheck className="h-6 w-6" />,  color: 'bg-emerald-600',  href: '/dossiers-signes' },
    { label: 'Perdus',            value: stats?.projectsPerdus ?? 0,        icon: <AlertTriangle className="h-6 w-6" />,color: 'bg-red-500',      href: '/dossiers' },
    { label: 'CA Total',          value: fmt(caEncaisse),                  icon: <TrendingUp className="h-6 w-6" />,   color: 'bg-[#a67749]',   href: '/dossiers' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={<BarChart3 className="h-7 w-7" />}
        title="Tableau de bord"
        subtitle={today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {KPIs.map((k, i) => (
          <Link key={i} href={k.href}
            className={`${k.color} group rounded-2xl p-5 text-white shadow-md hover:opacity-90 transition-opacity`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-2xl font-bold">{k.value}</div>
                <div className="text-xs font-medium opacity-80 mt-1">{k.label}</div>
              </div>
              <div className="opacity-80 group-hover:opacity-100 transition-opacity">{k.icon}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Secondary row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white border border-[#304035]/10 shadow-md p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-[#304035]/70">Marge totale</span>
            <TrendingUp className="h-4 w-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-orange-500">{fmt(stats?.margeTotal ?? 0)}</div>
          <div className="text-xs text-[#304035]/40 mt-1">CA - Achats</div>
        </div>
        <div className="rounded-2xl bg-white border border-[#304035]/10 shadow-md p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-[#304035]/70">Taux de conversion</span>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{stats?.tauxConversion ?? 0}%</div>
          <div className="text-xs text-[#304035]/40 mt-1">Signés / (Signés + Perdus)</div>
        </div>
        <div className="rounded-2xl bg-white border border-[#304035]/10 shadow-md p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-[#304035]/70">En finition</span>
            <FolderCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{finition.length}</div>
          <div className="text-xs text-[#304035]/40 mt-1">Projets en RECEPTION</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Planning du jour */}
        <div className="rounded-2xl bg-white border border-[#304035]/10 shadow-md overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#304035]/5">
            <div className="flex items-center gap-2">
              <CalendarCog className="h-5 w-5 text-[#304035]" />
              <span className="font-bold text-[#304035]">Planning du jour</span>
            </div>
            <Link href="/planning-gestion" className="text-xs font-semibold text-[#a67749] hover:underline">
              Voir tout →
            </Link>
          </div>
          {todayEvents.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <CalendarCog className="h-8 w-8 text-[#304035]/10 mx-auto mb-2" />
              <p className="text-sm text-[#304035]/40">Aucune intervention aujourd'hui</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#304035]/5">
              {todayEvents.map(ev => (
                <li key={ev.id} className="flex items-center gap-4 px-6 py-3">
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: ev.color || '#a67749' }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#304035] text-sm">{ev.title}</p>
                    <p className="text-xs text-[#304035]/50">{ev.type ?? ''}{ev.type ? ' · ' : ''}{ev.startHour}h — {ev.startHour + ev.duration}h</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Dossiers urgents */}
        <div className="rounded-2xl bg-white border border-[#304035]/10 shadow-md overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#304035]/5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="font-bold text-[#304035]">Urgents & Alertes</span>
            </div>
            <Link href="/dossiers" className="text-xs font-semibold text-[#a67749] hover:underline">
              Voir tout →
            </Link>
          </div>
          {urgents.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <AlertTriangle className="h-8 w-8 text-[#304035]/10 mx-auto mb-2" />
              <p className="text-sm text-[#304035]/40">Aucun dossier urgent</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#304035]/5">
              {urgents.slice(0, 5).map(d => (
                <li key={d.id}>
                  <Link href={`/dossiers/${d.id}`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-[#f5eee8]/40 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
                      <span className="font-semibold text-[#304035] text-sm group-hover:text-[#a67749] transition-colors">{d.name}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#304035]/30 group-hover:text-[#304035]/70" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Vue d'ensemble — Dossiers en cours + Signés */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Dossiers en cours */}
        <div className="rounded-2xl bg-white border border-[#304035]/10 shadow-md overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#304035]/5">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-[#304035]" />
              <span className="font-bold text-[#304035]">Dossiers en cours</span>
              <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-[#304035] text-white text-[10px] font-bold px-1.5">
                {storeDossiers.length}
              </span>
            </div>
            <Link href="/dossiers" className="text-xs font-semibold text-[#a67749] hover:underline">Voir tout →</Link>
          </div>
          {storeDossiers.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-[#304035]/40">Aucun dossier en cours</div>
          ) : (
            <div className="divide-y divide-[#304035]/5">
              {/* Stats par statut */}
              <div className="grid grid-cols-4 divide-x divide-[#304035]/5 border-b border-[#304035]/5">
                {[
                  { label: 'Urgent', color: '#ef4444', count: storeDossiers.filter(d => d.status === 'URGENT').length },
                  { label: 'En cours', color: '#f97316', count: storeDossiers.filter(d => d.status === 'EN COURS').length },
                  { label: 'Finition', color: '#10b981', count: storeDossiers.filter(d => d.status === 'FINITION').length },
                  { label: 'À valider', color: '#4ade80', count: storeDossiers.filter(d => d.status === 'A VALIDER').length },
                ].map(s => (
                  <div key={s.label} className="px-3 py-2 text-center">
                    <div className="text-base font-bold" style={{ color: s.color }}>{s.count}</div>
                    <div className="text-[10px] text-[#304035]/40 font-medium">{s.label}</div>
                  </div>
                ))}
              </div>
              {/* Liste compacte */}
              {storeDossiers.slice(0, 6).map(d => {
                const statusColor: Record<string, string> = {
                  'URGENT': '#ef4444', 'EN COURS': '#f97316', 'FINITION': '#10b981', 'A VALIDER': '#4ade80',
                };
                return (
                  <Link key={d.id} href={`/dossiers/${d.id}`}
                    className="flex items-center gap-3 px-6 py-2.5 hover:bg-[#f5eee8]/40 transition-colors group">
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: statusColor[d.status] ?? '#304035' }} />
                    <span className="font-semibold text-[#304035] text-sm flex-1 group-hover:text-[#a67749] transition-colors truncate">
                      {d.name} {d.firstName ?? ''}
                    </span>
                    <span className="text-[10px] text-[#304035]/40 shrink-0">{d.createdAt}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-[#304035]/20 shrink-0 group-hover:text-[#304035]/60" />
                  </Link>
                );
              })}
              {storeDossiers.length > 6 && (
                <div className="px-6 py-2 text-center">
                  <Link href="/dossiers" className="text-xs text-[#a67749] font-semibold hover:underline">
                    +{storeDossiers.length - 6} autres dossiers
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dossiers signés */}
        <div className="rounded-2xl bg-white border border-emerald-100 shadow-md overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-50">
            <div className="flex items-center gap-2">
              <FolderCheck className="h-5 w-5 text-emerald-600" />
              <span className="font-bold text-[#304035]">Dossiers signés</span>
              <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold px-1.5">
                {storeSignes.length}
              </span>
            </div>
            <Link href="/dossiers-signes" className="text-xs font-semibold text-[#a67749] hover:underline">Voir tout →</Link>
          </div>
          {storeSignes.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-[#304035]/40">Aucun dossier signé</div>
          ) : (
            <div className="divide-y divide-[#304035]/5">
              {storeSignes.slice(0, 7).map(d => {
                const saved = storeDatesButoiresSignes[d.id] ?? {};
                const datesCount = Object.keys(saved).length;
                const confsPending = (d.confirmations ?? []).filter(c => !c.validee).length;
                return (
                  <Link key={d.id} href={`/dossiers-signes`}
                    className="flex items-center gap-3 px-6 py-2.5 hover:bg-emerald-50/40 transition-colors group">
                    <BadgeCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-[#304035] text-sm flex-1 group-hover:text-[#a67749] transition-colors truncate">
                      {d.name} {d.firstName ?? ''}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {datesCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">
                          <Target className="h-2.5 w-2.5" /> {datesCount}
                        </span>
                      )}
                      {confsPending > 0 && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
                          <Package className="h-2.5 w-2.5" /> {confsPending}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-[#304035]/20 shrink-0 group-hover:text-[#304035]/60" />
                  </Link>
                );
              })}
              {storeSignes.length > 7 && (
                <div className="px-6 py-2 text-center">
                  <Link href="/dossiers-signes" className="text-xs text-[#a67749] font-semibold hover:underline">
                    +{storeSignes.length - 7} autres
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions à faire — Point 11 */}
      <div className="rounded-2xl bg-white border border-[#304035]/10 shadow-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#304035]/5">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-amber-500" />
            <span className="font-bold text-[#304035]">Actions à faire</span>
            {actionsAFaire.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5">
                {actionsAFaire.length}
              </span>
            )}
          </div>
        </div>
        {actionsAFaire.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <CheckSquare className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-emerald-600">Aucune action en attente</p>
            <p className="text-xs text-[#304035]/40 mt-1">Tout est à jour !</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#304035]/5">
            {actionsAFaire.slice(0, 8).map(action => {
              const iconMap = {
                devis: <FileWarning className="h-4 w-4" />,
                facture: <Clock className="h-4 w-4" />,
                confirmation: <Package className="h-4 w-4" />,
                dossier: <FolderOpen className="h-4 w-4" />,
              };
              const colorMap = {
                high:   'bg-red-100 text-red-600',
                medium: 'bg-amber-100 text-amber-600',
                low:    'bg-blue-100 text-blue-600',
              };
              const dotMap = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-blue-400' };
              return (
                <li key={action.id}>
                  <Link href={action.href}
                    className="flex items-center gap-4 px-6 py-3 hover:bg-[#f5eee8]/40 transition-colors group">
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${colorMap[action.priority]}`}>
                      {iconMap[action.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#304035] group-hover:text-[#a67749] transition-colors">{action.label}</p>
                      <p className="text-xs text-[#304035]/50 truncate">{action.detail}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`h-2 w-2 rounded-full ${dotMap[action.priority]}`} />
                      <ChevronRight className="h-4 w-4 text-[#304035]/20 group-hover:text-[#304035]/60" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Activité récente */}
      <div className="rounded-2xl bg-white border border-[#304035]/10 shadow-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#304035]/5">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#304035]" />
            <span className="font-bold text-[#304035]">Activité récente</span>
          </div>
          <Link href="/notifications" className="text-xs font-semibold text-[#a67749] hover:underline">
            Tout voir →
          </Link>
        </div>
        {recentLogs.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-[#304035]/40">Aucune activité</div>
        ) : (
          <ul className="divide-y divide-[#304035]/5">
            {recentLogs.map((log, i) => (
              <li key={i} className="flex items-center gap-4 px-6 py-3">
                <span className="text-lg shrink-0">{log.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#304035]">{log.action}</p>
                  <p className="text-xs text-[#304035]/50 truncate">{log.target} · {log.user}</p>
                </div>
                <span className="text-xs text-[#304035]/30 shrink-0">{log.time}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: '/dossiers',         label: 'Dossiers',    icon: <FolderOpen className="h-5 w-5" /> },
          { href: '/statistiques',     label: 'Stats',       icon: <BarChart3 className="h-5 w-5" /> },
          { href: '/intervenants',     label: 'Intervenants',icon: <Users className="h-5 w-5" /> },
          { href: '/planning-gestion', label: 'Planning',    icon: <CalendarCog className="h-5 w-5" /> },
        ].map((l, i) => (
          <Link key={i} href={l.href}
            className="flex items-center gap-3 rounded-xl bg-white border border-[#304035]/10 px-4 py-3 text-sm font-semibold text-[#304035] hover:bg-[#f5eee8] hover:border-[#304035]/20 transition-colors shadow-sm">
            <span className="text-[#a67749]">{l.icon}</span>
            {l.label}
            <ChevronRight className="h-4 w-4 ml-auto text-[#304035]/30" />
          </Link>
        ))}
      </div>
    </div>
  );
}
