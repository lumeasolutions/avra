'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Mail, Phone, Plus, Trash2, Search, Wrench, Users,
  X, Edit3, Check, FileText, ArrowUpDown,
  MessageSquare, ExternalLink, HardHat, Send, Link2, ShieldCheck, Clock,
} from 'lucide-react';
import { useDossierStore, useIntervenantStore, type Intervenant } from '@/store';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { SendToIntervenantButton } from '@/components/demandes/SendToIntervenantButton';
import { InviteIntervenantModal } from '@/components/demandes/InviteIntervenantModal';
import { listInvitations, createInvitation, type IntervenantInvitation } from '@/lib/demandes-api';
import { api } from '@/lib/api';

// ─── Config types ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { color: string; bg: string; avatar: string; ring: string }> = {
  POSEUR:      { color: 'text-white', bg: 'bg-[#304035]',   avatar: 'bg-[#304035]/12 text-[#304035]',    ring: 'ring-[#304035]/20' },
  ELECTRICIEN: { color: 'text-white', bg: 'bg-amber-500',   avatar: 'bg-amber-50 text-amber-600',        ring: 'ring-amber-200' },
  MACON:       { color: 'text-white', bg: 'bg-stone-500',   avatar: 'bg-stone-100 text-stone-600',       ring: 'ring-stone-200' },
  MARBRIER:    { color: 'text-white', bg: 'bg-slate-500',   avatar: 'bg-slate-100 text-slate-600',       ring: 'ring-slate-200' },
  PLOMBIER:    { color: 'text-white', bg: 'bg-blue-500',    avatar: 'bg-blue-50 text-blue-600',          ring: 'ring-blue-200' },
  CARRELEUR:   { color: 'text-white', bg: 'bg-orange-500',  avatar: 'bg-orange-50 text-orange-600',      ring: 'ring-orange-200' },
  PEINTRE:     { color: 'text-white', bg: 'bg-rose-500',    avatar: 'bg-rose-50 text-rose-600',          ring: 'ring-rose-200' },
  MENUISIER:   { color: 'text-white', bg: 'bg-lime-700',    avatar: 'bg-lime-50 text-lime-700',          ring: 'ring-lime-200' },
  AUTRE:       { color: 'text-[#304035]/70', bg: 'bg-[#304035]/10', avatar: 'bg-[#304035]/6 text-[#304035]/50', ring: 'ring-[#304035]/10' },
};

const TYPES = ['POSEUR', 'ELECTRICIEN', 'MACON', 'MARBRIER', 'PLOMBIER', 'CARRELEUR', 'PEINTRE', 'MENUISIER', 'AUTRE'];

function cfg(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG['AUTRE'];
}

// ─── Badge type ───────────────────────────────────────────────────────────────

function TypeBadge({ type, size = 'sm' }: { type: string; size?: 'xs' | 'sm' }) {
  const c = cfg(type);
  return (
    <span className={cn(
      'rounded-full font-bold tracking-wide shrink-0 uppercase',
      c.bg, c.color,
      size === 'xs' ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-0.5 text-[10px]'
    )}>
      {type}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, type, size = 'md' }: { name: string; type: string; size?: 'sm' | 'md' | 'lg' }) {
  const c = cfg(type);
  return (
    <div className={cn(
      'flex items-center justify-center rounded-2xl font-bold shrink-0 ring-2 transition-transform',
      c.avatar, c.ring,
      size === 'sm'  && 'h-9 w-9 text-sm',
      size === 'md'  && 'h-11 w-11 text-base',
      size === 'lg'  && 'h-16 w-16 text-2xl rounded-3xl',
    )}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// Format duration (minutes) → human "2h", "30min", "3j"
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 60 / 24)}j`;
}

// ─── Fiche slide-over ─────────────────────────────────────────────────────────

function FicheIntervenant({
  intervenant,
  onClose,
  onDelete,
}: {
  intervenant: Intervenant;
  onClose: () => void;
  onDelete: () => void;
}) {
  const updateIntervenant = useIntervenantStore(s => s.updateIntervenant);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    type: intervenant.type,
    name: intervenant.name,
    phone: intervenant.phone ?? '',
    email: intervenant.email ?? '',
    notes: intervenant.notes ?? '',
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const c = cfg(intervenant.type);

  // Phase E : charge stats + historique a l'ouverture
  const [stats, setStats] = useState<import('@/lib/demandes-api').IntervenantStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoadingStats(true);
    import('@/lib/demandes-api').then(({ getIntervenantStats }) =>
      getIntervenantStats(intervenant.id)
    )
      .then((s) => { if (!cancelled) setStats(s); })
      .catch(() => { if (!cancelled) setStats(null); })
      .finally(() => { if (!cancelled) setLoadingStats(false); });
    return () => { cancelled = true; };
  }, [intervenant.id]);

  const saveEdit = () => {
    if (!form.name.trim()) return;
    updateIntervenant(intervenant.id, form);
    setEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative ml-auto h-full w-full max-w-[420px] bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* ── Header coloré selon le type ── */}
        <div className={cn('relative px-6 pt-7 pb-6 overflow-hidden', c.bg)}>
          {/* Cercle déco en fond */}
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -right-2 top-16 h-20 w-20 rounded-full bg-white/8" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white/20 ring-2 ring-white/30 flex items-center justify-center text-2xl font-bold text-white shrink-0">
                {intervenant.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-white text-xl leading-tight">{intervenant.name}</p>
                <p className="text-white/60 text-sm mt-0.5">{intervenant.type}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditing(!editing)}
                className="rounded-xl p-2 hover:bg-white/15 text-white/70 hover:text-white transition-colors"
                title="Modifier"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <button
                onClick={onClose}
                className="rounded-xl p-2 hover:bg-white/15 text-white/70 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="relative flex gap-3 mt-5">
            {[
              { val: intervenant.dossiers.length, label: 'dossier(s)' },
              { val: intervenant.dossiers.filter(d => d.statut === 'CLASSE').length, label: 'classé(s)' },
              { val: intervenant.dossiers.filter(d => d.statut === 'A CLASSER').length, label: 'à classer' },
            ].map((s, i) => (
              <div key={i} className="flex-1 rounded-xl bg-white/15 backdrop-blur-sm px-3 py-2.5 text-center">
                <p className="text-xl font-bold text-white">{s.val}</p>
                <p className="text-[10px] text-white/60 font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Corps ── */}
        <div className="flex-1 overflow-y-auto">
          {editing ? (
            /* Mode édition */
            <div className="p-5 space-y-4">
              <p className="text-xs font-bold text-[#304035]/40 uppercase tracking-widest">Modifier</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#304035]/50 mb-1.5 block">Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full rounded-xl border border-[#304035]/12 bg-[#304035]/3 px-3.5 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20 appearance-none"
                  >
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#304035]/50 mb-1.5 block">Nom *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-xl border border-[#304035]/12 bg-[#304035]/3 px-3.5 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#304035]/50 mb-1.5 block">Téléphone</label>
                    <input
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full rounded-xl border border-[#304035]/12 bg-[#304035]/3 px-3.5 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#304035]/50 mb-1.5 block">Email</label>
                    <input
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-xl border border-[#304035]/12 bg-[#304035]/3 px-3.5 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#304035]/50 mb-1.5 block">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    placeholder="Infos complémentaires…"
                    className="w-full rounded-xl border border-[#304035]/12 bg-[#304035]/3 px-3.5 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/25 focus:outline-none focus:ring-2 focus:ring-[#304035]/20 resize-none"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={saveEdit}
                    disabled={!form.name.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-[#304035] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#304035]/85 disabled:opacity-40 transition-all"
                  >
                    <Check className="h-3.5 w-3.5" /> Enregistrer
                  </button>
                  <button
                    onClick={() => { setEditing(false); setForm({ type: intervenant.type, name: intervenant.name, phone: intervenant.phone ?? '', email: intervenant.email ?? '', notes: intervenant.notes ?? '' }); }}
                    className="rounded-xl border border-[#304035]/12 px-5 py-2.5 text-xs font-semibold text-[#304035]/60 hover:bg-[#304035]/5 transition-all"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {/* Contact */}
              <div>
                <p className="text-[10px] font-bold text-[#304035]/35 uppercase tracking-widest mb-3">Contact</p>
                <div className="space-y-2">
                  {intervenant.phone ? (
                    <a href={`tel:${intervenant.phone.replace(/\s/g, '')}`}
                      className="flex items-center gap-3.5 rounded-2xl px-4 py-3.5 bg-[#304035]/4 hover:bg-[#304035]/8 transition-colors group border border-[#304035]/6">
                      <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                        <Phone className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-[#304035]/40 font-medium">Téléphone</p>
                        <p className="text-sm text-[#304035] font-semibold">{intervenant.phone}</p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-[#304035]/20 group-hover:text-emerald-500 transition-colors shrink-0" />
                    </a>
                  ) : (
                    <div className="flex items-center gap-3.5 rounded-2xl px-4 py-3.5 bg-[#304035]/3 border border-[#304035]/5 border-dashed">
                      <div className="h-9 w-9 rounded-xl bg-[#304035]/8 flex items-center justify-center shrink-0">
                        <Phone className="h-4 w-4 text-[#304035]/25" />
                      </div>
                      <p className="text-sm text-[#304035]/30 italic">Pas de téléphone</p>
                    </div>
                  )}
                  {intervenant.email ? (
                    <a href={`mailto:${intervenant.email}`}
                      className="flex items-center gap-3.5 rounded-2xl px-4 py-3.5 bg-[#304035]/4 hover:bg-[#304035]/8 transition-colors group border border-[#304035]/6">
                      <div className="h-9 w-9 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                        <Mail className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-[#304035]/40 font-medium">Email</p>
                        <p className="text-sm text-[#304035] font-semibold truncate">{intervenant.email}</p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-[#304035]/20 group-hover:text-blue-500 transition-colors shrink-0" />
                    </a>
                  ) : (
                    <div className="flex items-center gap-3.5 rounded-2xl px-4 py-3.5 bg-[#304035]/3 border border-[#304035]/5 border-dashed">
                      <div className="h-9 w-9 rounded-xl bg-[#304035]/8 flex items-center justify-center shrink-0">
                        <Mail className="h-4 w-4 text-[#304035]/25" />
                      </div>
                      <p className="text-sm text-[#304035]/30 italic">Pas d'email</p>
                    </div>
                  )}
                  {intervenant.notes && (
                    <div className="flex items-start gap-3.5 rounded-2xl px-4 py-3.5 bg-violet-50 border border-violet-100">
                      <div className="h-9 w-9 rounded-xl bg-violet-500 flex items-center justify-center shrink-0 mt-0.5">
                        <MessageSquare className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-violet-400 font-medium">Notes</p>
                        <p className="text-sm text-violet-800 leading-relaxed">{intervenant.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action principale : envoyer une demande */}
              <div className="mb-2">
                <SendToIntervenantButton
                  variant="primary"
                  label={`Envoyer une demande à ${intervenant.name.split(' ')[0]}`}
                  prefill={{ intervenantId: intervenant.id }}
                  style={{ width: '100%', justifyContent: 'center' }}
                />
              </div>

              {/* Phase E : Stats + Historique */}
              {loadingStats ? (
                <div className="rounded-xl bg-[#304035]/4 p-4 animate-pulse">
                  <div className="h-3 w-24 bg-[#304035]/12 rounded mb-3" />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-12 bg-[#304035]/8 rounded-lg" />
                    <div className="h-12 bg-[#304035]/8 rounded-lg" />
                    <div className="h-12 bg-[#304035]/8 rounded-lg" />
                  </div>
                </div>
              ) : stats && stats.total > 0 ? (
                <div>
                  <p className="text-[10px] font-bold text-[#304035]/35 uppercase tracking-widest mb-3">
                    Statistiques de collaboration
                  </p>

                  {/* Réputation score */}
                  {stats.reputationScore !== null && (
                    <div className="rounded-xl bg-gradient-to-r from-[#a67749]/8 to-emerald-50 border border-[#a67749]/20 p-4 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-[#304035]/55 uppercase tracking-widest">Score de fiabilité</span>
                        <span className="text-2xl font-black text-[#a67749]">{stats.reputationScore}<span className="text-sm text-[#a67749]/60">/100</span></span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#304035]/8 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#a67749] to-emerald-500 transition-all"
                          style={{ width: `${stats.reputationScore}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-[#304035]/45 mt-2 leading-snug">
                        Calculé sur le taux d'acceptation et de complétion des demandes envoyées.
                      </p>
                    </div>
                  )}

                  {/* KPIs */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="rounded-xl bg-white border border-[#304035]/8 p-3 text-center">
                      <p className="text-xl font-bold text-[#304035]">{stats.total}</p>
                      <p className="text-[9px] font-semibold text-[#304035]/45 uppercase tracking-wider mt-0.5">Demandes</p>
                    </div>
                    <div className="rounded-xl bg-white border border-emerald-100 p-3 text-center">
                      <p className="text-xl font-bold text-emerald-600">{stats.acceptanceRate ?? '—'}{stats.acceptanceRate !== null ? '%' : ''}</p>
                      <p className="text-[9px] font-semibold text-emerald-700/60 uppercase tracking-wider mt-0.5">Acceptation</p>
                    </div>
                    <div className="rounded-xl bg-white border border-blue-100 p-3 text-center">
                      <p className="text-xl font-bold text-blue-600">{stats.avgResponseMinutes !== null ? formatDuration(stats.avgResponseMinutes) : '—'}</p>
                      <p className="text-[9px] font-semibold text-blue-700/60 uppercase tracking-wider mt-0.5">Délai réponse</p>
                    </div>
                  </div>

                  {/* Historique compact */}
                  {stats.history.length > 0 && (
                    <details className="group rounded-xl bg-[#304035]/3 border border-[#304035]/6 overflow-hidden">
                      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#304035]/5 transition-colors">
                        <span className="text-xs font-bold text-[#304035]/70">Historique ({stats.history.length})</span>
                        <ArrowUpDown className="h-3.5 w-3.5 text-[#304035]/40 group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="max-h-64 overflow-y-auto divide-y divide-[#304035]/6">
                        {stats.history.slice(0, 10).map((h) => {
                          const statusColor = h.status === 'TERMINEE' ? 'bg-emerald-100 text-emerald-700' :
                                              h.status === 'EN_COURS' ? 'bg-orange-100 text-orange-700' :
                                              h.status === 'ACCEPTEE' ? 'bg-blue-100 text-blue-700' :
                                              h.status === 'REFUSEE' ? 'bg-red-100 text-red-700' :
                                              'bg-[#304035]/10 text-[#304035]/60';
                          return (
                            <div key={h.id} className="px-4 py-2.5 hover:bg-white/50 transition-colors">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[10px] font-bold text-[#304035]/40 uppercase">{h.type}</span>
                                <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold', statusColor)}>{h.status}</span>
                              </div>
                              <p className="text-xs font-semibold text-[#304035] truncate">{h.title}</p>
                              <p className="text-[10px] text-[#304035]/45 mt-0.5">
                                {new Date(h.createdAt).toLocaleDateString('fr-FR')}
                                {h.project?.name ? ` · ${h.project.name}` : ''}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}
                </div>
              ) : null}

              {/* Dossiers */}
              {intervenant.dossiers.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-[#304035]/35 uppercase tracking-widest mb-3">Dossiers associés</p>
                  <div className="space-y-1.5">
                    {intervenant.dossiers.map((d, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl px-4 py-3 bg-[#304035]/4 border border-[#304035]/6">
                        <div className="flex items-center gap-2.5">
                          <FileText className="h-4 w-4 text-[#304035]/35 shrink-0" />
                          <span className="text-sm font-semibold text-[#304035]">{d.name}</span>
                        </div>
                        <span className={cn('rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide',
                          d.statut === 'CLASSE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        )}>
                          {d.statut}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer suppression ── */}
        <div className="px-5 py-4 border-t border-[#304035]/8 bg-white">
          {confirmDelete ? (
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4">
              <p className="text-sm font-bold text-red-700 mb-1">Supprimer {intervenant.name} ?</p>
              <p className="text-xs text-red-400 mb-3">Cette action est irréversible.</p>
              <div className="flex gap-2">
                <button onClick={onDelete}
                  className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors">
                  Confirmer
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors">
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 text-xs text-[#304035]/35 hover:text-red-500 font-semibold transition-colors group">
              <Trash2 className="h-3.5 w-3.5 group-hover:text-red-500 transition-colors" />
              Supprimer cet intervenant
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

type SortKey = 'name' | 'dossiers';

export default function IntervenantsPage() {
  const intervenants = useIntervenantStore(s => s.intervenants);
  const addIntervenant = useIntervenantStore(s => s.addIntervenant);
  const removeIntervenant = useIntervenantStore(s => s.removeIntervenant);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'POSEUR', name: '', phone: '', email: '', notes: '' });
  const [selected, setSelected] = useState<string | null>(null);

  // Invitations PENDING par intervenantId — affichees comme badges "Invite"
  const [invitations, setInvitations] = useState<Record<string, IntervenantInvitation>>({});
  // Modal d'invitation : { intervenantId, name, email }
  const [invitingFor, setInvitingFor] = useState<{ id: string; name: string; email?: string } | null>(null);

  // Charge les invitations (toutes, on ne filtre pas par PENDING ici pour
  // permettre l'affichage du statut "Expire/Revoque" + bouton "Renouveler").
  useEffect(() => {
    let cancelled = false;
    listInvitations()
      .then((rawList) => {
        if (cancelled) return;
        const arr = Array.isArray(rawList) ? rawList : (Array.isArray((rawList as any)?.data) ? (rawList as any).data : []);
        // Pour chaque intervenant : on garde la plus recente (createdAt desc)
        const byIntervenantId: Record<string, IntervenantInvitation> = {};
        const sorted = [...(arr as IntervenantInvitation[])].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        for (const inv of sorted) {
          if (!byIntervenantId[inv.intervenantId]) {
            byIntervenantId[inv.intervenantId] = inv;
          }
        }
        setInvitations(byIntervenantId);
      })
      .catch(() => {/* noop : auth/network — on affiche juste sans badge */});
    return () => { cancelled = true; };
  }, []);

  const selectedIntervenant = intervenants.find(i => i.id === selected) ?? null;

  const typesPresents = useMemo(() => {
    const s = new Set(intervenants.map(i => i.type));
    return TYPES.filter(t => s.has(t));
  }, [intervenants]);

  // Phase G : filtre par statut compte
  const [filterAccount, setFilterAccount] = useState<'all' | 'active' | 'invited' | 'none'>('all');

  const filtered = useMemo(() => {
    let list = intervenants.filter(i => {
      const q = search.toLowerCase();
      const matchSearch = !q || i.name.toLowerCase().includes(q) || i.email?.toLowerCase().includes(q) || i.phone?.includes(q) || i.type.toLowerCase().includes(q);
      const matchType = !filterType || i.type === filterType;
      // Filter par compte. Note: on n'a pas userId dans le store local,
      // donc 'active' n'est pas distinct de 'none' sans donnees backend.
      // Pour distinguer, on regarde les invitations PENDING.
      const inv = invitations[i.id];
      let matchAccount = true;
      if (filterAccount === 'invited') matchAccount = !!inv;
      else if (filterAccount === 'none') matchAccount = !inv;
      // 'active' : pas implementable cote local — fallback all
      return matchSearch && matchType && matchAccount;
    });
    return [...list].sort((a, b) => {
      const cmp = sortKey === 'name' ? a.name.localeCompare(b.name) : a.dossiers.length - b.dossiers.length;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [intervenants, search, filterType, sortKey, sortDir, filterAccount, invitations]);

  // Phase B : checkbox "Envoyer une invitation tout de suite"
  const [sendInviteOnCreate, setSendInviteOnCreate] = useState(false);
  const [creatingError, setCreatingError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setCreatingError(null);
    setCreating(true);
    try {
      // 1. Cree l'intervenant en backend (besoin d'un ID stable pour l'invitation)
      const parts = form.name.trim().split(/\s+/);
      const created = await api<any>('/intervenants', {
        method: 'POST',
        body: JSON.stringify({
          type: form.type,
          companyName: parts.length > 1 ? form.name.trim() : undefined,
          firstName: parts.length === 1 ? parts[0] : undefined,
          lastName: undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          notes: form.notes || undefined,
        }),
      });

      // 2. Mise a jour optimiste du store local avec l'ID backend
      addIntervenant(form);
      // Sync best-effort : le useDataSync recharge la liste backend dans la foulee
      // (sinon le badge "INVITE" ne saura pas que cet intervenant est lie a une invite).

      // 3. Si checkbox cochee + email present : creer l'invitation
      if (sendInviteOnCreate && form.email && created?.id) {
        try {
          const inv = await createInvitation({
            intervenantId: created.id,
            email: form.email.trim().toLowerCase(),
            expiresInDays: 14,
          });
          if (inv) {
            setInvitations(prev => ({ ...prev, [inv.intervenantId]: inv }));
          }
        } catch (e: any) {
          console.warn('[create+invite] invitation failed', e);
        }
      }

      // 4. Reset form
      setForm({ type: 'POSEUR', name: '', phone: '', email: '', notes: '' });
      setSendInviteOnCreate(false);
      setShowForm(false);
    } catch (e: any) {
      setCreatingError(e?.message ?? "Erreur lors de la creation");
    } finally {
      setCreating(false);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <PageHeader
        icon={<Users className="h-7 w-7" />}
        title="Intervenants"
        subtitle={filtered.length !== intervenants.length
          ? `${filtered.length} sur ${intervenants.length} · filtrés`
          : `${intervenants.length} intervenant${intervenants.length > 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <SendToIntervenantButton variant="primary" label="Envoyer une demande" />
            <button
              onClick={() => setShowForm(!showForm)}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all shadow-sm',
                showForm
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'bg-[#a67749] text-white hover:bg-[#a67749]/85 shadow-md hover:shadow-lg hover:-translate-y-px'
              )}
            >
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? 'Fermer' : 'Ajouter'}
            </button>
          </div>
        }
      />

      {/* ── Formulaire ajout ── */}
      {showForm && (
        <div className="rounded-2xl bg-white border border-[#304035]/10 shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-[#304035]/5 to-transparent border-b border-[#304035]/8 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-[#304035] flex items-center justify-center">
                <Plus className="h-3.5 w-3.5 text-white" />
              </div>
              <h2 className="font-bold text-[#304035]">Nouvel intervenant</h2>
            </div>
            <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 hover:bg-[#304035]/8 text-[#304035]/40 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-[#304035]/50 mb-1.5 block">Type *</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full rounded-xl border border-[#304035]/12 bg-[#304035]/3 px-4 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/25 appearance-none cursor-pointer"
                >
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#304035]/50 mb-1.5 block">Nom *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nom complet ou entreprise"
                  className="w-full rounded-xl border border-[#304035]/12 bg-[#304035]/3 px-4 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/25 focus:outline-none focus:ring-2 focus:ring-[#304035]/25"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#304035]/50 mb-1.5 block">Téléphone</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="06 xx xx xx xx"
                  className="w-full rounded-xl border border-[#304035]/12 bg-[#304035]/3 px-4 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/25 focus:outline-none focus:ring-2 focus:ring-[#304035]/25"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#304035]/50 mb-1.5 block">Email</label>
                <input
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="contact@exemple.fr"
                  className="w-full rounded-xl border border-[#304035]/12 bg-[#304035]/3 px-4 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/25 focus:outline-none focus:ring-2 focus:ring-[#304035]/25"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-[#304035]/50 mb-1.5 block">Notes / Spécialité</label>
                <input
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Ex : spécialiste parquet, zone Île-de-France…"
                  className="w-full rounded-xl border border-[#304035]/12 bg-[#304035]/3 px-4 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/25 focus:outline-none focus:ring-2 focus:ring-[#304035]/25"
                />
              </div>
            </div>
            {/* Checkbox "Envoyer invitation tout de suite" */}
            <label
              className={cn(
                'flex items-start gap-3 rounded-xl border p-4 transition-all cursor-pointer',
                sendInviteOnCreate
                  ? 'border-[#a67749] bg-[#fff8ef]'
                  : 'border-[#304035]/12 bg-[#304035]/2 hover:border-[#a67749]/40',
                !form.email.trim() && 'opacity-50 cursor-not-allowed'
              )}
            >
              <input
                type="checkbox"
                checked={sendInviteOnCreate}
                onChange={(e) => setSendInviteOnCreate(e.target.checked)}
                disabled={!form.email.trim()}
                className="mt-1 h-4 w-4 rounded border-[#a67749] text-[#a67749] cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Send className="h-3.5 w-3.5 text-[#a67749]" />
                  <span className="text-sm font-bold text-[#304035]">Envoyer un lien d'accès AVRA tout de suite</span>
                </div>
                <p className="text-xs text-[#304035]/55 leading-relaxed">
                  {form.email.trim()
                    ? `Un email avec un lien sécurisé sera envoyé à ${form.email}. À l'acceptation, son compte sera lié au vôtre et il recevra vos demandes (pose, livraison, SAV…).`
                    : 'Renseignez un email pour activer cette option.'}
                </p>
              </div>
            </label>

            {creatingError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {creatingError}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleAdd}
                disabled={!form.name.trim() || creating}
                className="rounded-xl bg-[#304035] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#304035]/85 transition-all disabled:opacity-35 shadow-sm flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Création…
                  </>
                ) : sendInviteOnCreate ? (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Enregistrer + Inviter
                  </>
                ) : (
                  'Enregistrer'
                )}
              </button>
              <button
                onClick={() => setShowForm(false)}
                disabled={creating}
                className="rounded-xl border border-[#304035]/12 px-6 py-2.5 text-sm font-semibold text-[#304035]/60 hover:bg-[#304035]/5 transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Recherche ── */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#304035]/35 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom, email, téléphone, type…"
          className="w-full rounded-2xl border border-[#304035]/12 bg-white pl-11 pr-10 py-3.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#304035]/20 shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 hover:bg-[#304035]/8 text-[#304035]/35 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── Filtres par statut compte ── */}
      <div className="flex gap-2 flex-wrap">
        {([
          { id: 'all', label: 'Tous comptes', count: intervenants.length },
          { id: 'invited', label: 'Invités', count: Object.keys(invitations).length },
          { id: 'none', label: 'Sans invitation', count: intervenants.filter(i => !invitations[i.id]).length },
        ] as const).map(opt => {
          const active = filterAccount === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setFilterAccount(opt.id)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all border',
                active
                  ? 'bg-[#a67749] text-white border-[#a67749] shadow-sm'
                  : 'bg-white text-[#304035]/55 border-[#304035]/12 hover:border-[#304035]/25 hover:text-[#304035]'
              )}
            >
              {opt.label} ({opt.count})
            </button>
          );
        })}
      </div>

      {/* ── Chips filtres type ── */}
      {typesPresents.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterType(null)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all border',
              !filterType
                ? 'bg-[#304035] text-white border-[#304035] shadow-sm'
                : 'bg-white text-[#304035]/55 border-[#304035]/12 hover:border-[#304035]/25 hover:text-[#304035]'
            )}
          >
            Tous ({intervenants.length})
          </button>
          {typesPresents.map(t => {
            const count = intervenants.filter(i => i.type === t).length;
            const c = cfg(t);
            const active = filterType === t;
            return (
              <button
                key={t}
                onClick={() => setFilterType(active ? null : t)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all border',
                  active
                    ? cn(c.bg, c.color, 'border-transparent shadow-sm')
                    : 'bg-white text-[#304035]/55 border-[#304035]/12 hover:border-[#304035]/25 hover:text-[#304035]'
                )}
              >
                {t} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* ── Liste ── */}
      <div className="rounded-2xl bg-white border border-[#304035]/10 shadow-sm overflow-hidden">
        {/* En-tête tri */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#304035]/6 bg-[#304035]/[0.02]">
          <div className="flex items-center gap-1">
            <button
              onClick={() => toggleSort('name')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all',
                sortKey === 'name'
                  ? 'bg-[#304035]/8 text-[#304035]'
                  : 'text-[#304035]/40 hover:text-[#304035]/70 hover:bg-[#304035]/5'
              )}
            >
              <ArrowUpDown className="h-3 w-3" />
              Nom {sortKey === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('dossiers')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all',
                sortKey === 'dossiers'
                  ? 'bg-[#304035]/8 text-[#304035]'
                  : 'text-[#304035]/40 hover:text-[#304035]/70 hover:bg-[#304035]/5'
              )}
            >
              <Wrench className="h-3 w-3" />
              Dossiers {sortKey === 'dossiers' && (sortDir === 'asc' ? '↑' : '↓')}
            </button>
          </div>
          <span className="text-[11px] text-[#304035]/35 font-medium">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-[#304035]/5 flex items-center justify-center mx-auto mb-4">
              <HardHat className="h-7 w-7 text-[#304035]/20" />
            </div>
            <p className="text-[#304035]/40 text-sm font-medium">
              {search || filterType ? 'Aucun résultat' : 'Aucun intervenant'}
            </p>
            {(search || filterType) && (
              <button onClick={() => { setSearch(''); setFilterType(null); }}
                className="mt-3 text-xs text-[#a67749] font-bold hover:underline">
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#304035]/5">
            {filtered.map(i => {
              const c = cfg(i.type);
              const inv = invitations[i.id];
              // Statut de liaison :
              // - invited (PENDING) → bouton "Lien" pour voir/copier
              // - expired/revoked → bouton "Renouveler" pour recreer
              // - no-account → bouton "Inviter" pour envoyer un nouveau lien
              const status: 'invited' | 'expired' | 'no-account' =
                inv?.status === 'PENDING' ? 'invited'
                : (inv && (inv.status === 'EXPIRED' || inv.status === 'REVOKED')) ? 'expired'
                : 'no-account';
              return (
                <div
                  key={i.id}
                  onClick={() => setSelected(i.id)}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-[#f5eee8]/40 transition-colors group cursor-pointer"
                >
                  {/* Avatar */}
                  <div className={cn(
                    'h-11 w-11 rounded-2xl flex items-center justify-center text-base font-bold shrink-0 ring-2 transition-transform group-hover:scale-105',
                    c.avatar, c.ring
                  )}>
                    {i.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[#304035] group-hover:text-[#a67749] transition-colors text-[15px]">{i.name}</p>
                      <TypeBadge type={i.type} size="xs" />
                      {/* Badge statut compte */}
                      {status === 'invited' ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Clock className="h-2.5 w-2.5" /> INVITÉ
                        </span>
                      ) : status === 'expired' ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          {inv?.status === 'EXPIRED' ? 'EXPIRÉ' : 'RÉVOQUÉ'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          PAS DE COMPTE
                        </span>
                      )}
                      {i.notes && (
                        <span className="text-[10px] text-[#304035]/35 italic truncate max-w-[130px] hidden sm:block">{i.notes}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-1">
                      {i.phone && (
                        <span className="flex items-center gap-1 text-xs text-[#304035]/45">
                          <Phone className="h-3 w-3" /> {i.phone}
                        </span>
                      )}
                      {i.email && (
                        <span className="flex items-center gap-1 text-xs text-[#304035]/45">
                          <Mail className="h-3 w-3" /> {i.email}
                        </span>
                      )}
                      {i.dossiers.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-[#304035]/45">
                          <Wrench className="h-3 w-3" />
                          {i.dossiers.length} dossier{i.dossiers.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions rapides — toujours visibles pour l'invitation/demande */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Bouton INVITER / RENOUVELER / VOIR LIEN */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setInvitingFor({ id: i.id, name: i.name, email: i.email || undefined });
                      }}
                      className={cn(
                        'flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-all shadow-sm',
                        status === 'invited'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                          : status === 'expired'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          : 'bg-[#a67749] text-white hover:bg-[#a67749]/85 hover:shadow-md'
                      )}
                      title={
                        status === 'invited' ? 'Voir / gérer l\'invitation'
                        : status === 'expired' ? 'Renouveler l\'invitation'
                        : 'Envoyer un lien d\'accès'
                      }
                    >
                      {status === 'invited' ? <Link2 className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">
                        {status === 'invited' ? 'Lien' : status === 'expired' ? 'Renouveler' : 'Inviter'}
                      </span>
                    </button>

                    {/* Actions rapides hover */}
                    <div className="hidden md:flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {i.phone && (
                        <a href={`tel:${i.phone.replace(/\s/g, '')}`} onClick={e => e.stopPropagation()}
                          className="h-8 w-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white transition-colors shadow-sm"
                          title="Appeler">
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {i.email && (
                        <a href={`mailto:${i.email}`} onClick={e => e.stopPropagation()}
                          className="h-8 w-8 rounded-xl bg-blue-500 hover:bg-blue-600 flex items-center justify-center text-white transition-colors shadow-sm"
                          title="Envoyer un email">
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button onClick={e => { e.stopPropagation(); setSelected(i.id); }}
                        className="h-8 w-8 rounded-xl bg-[#304035]/8 hover:bg-[#304035]/15 flex items-center justify-center text-[#304035]/60 transition-colors"
                        title="Voir la fiche">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Slide-over fiche ── */}
      {selectedIntervenant && (
        <FicheIntervenant
          intervenant={selectedIntervenant}
          onClose={() => setSelected(null)}
          onDelete={() => { removeIntervenant(selectedIntervenant.id); setSelected(null); }}
        />
      )}

      {/* ── Modal invitation ── */}
      {invitingFor && (
        <InviteIntervenantModal
          open={!!invitingFor}
          onClose={() => setInvitingFor(null)}
          intervenantId={invitingFor.id}
          intervenantName={invitingFor.name}
          defaultEmail={invitingFor.email}
          existingInvitation={invitations[invitingFor.id] ?? null}
          onChange={(inv) => {
            setInvitations(prev => {
              const next = { ...prev };
              if (inv && inv.status === 'PENDING') next[invitingFor.id] = inv;
              else delete next[invitingFor.id];
              return next;
            });
          }}
        />
      )}
    </div>
  );
}
