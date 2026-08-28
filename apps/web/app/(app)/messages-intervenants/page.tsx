'use client';

/**
 * Messagerie intervenants — style « Messenger ».
 *
 * 2 colonnes : liste des conversations (à gauche) + fil de discussion (à droite).
 * Les messages ET les documents reçus apparaissent dans le fil. Depuis le fil,
 * on peut télécharger un document et le « classer » dans un sous-dossier du
 * dossier client. Pastilles « non lu » (localStorage + updatedAt).
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  listDemandesPro, getDemandePro, postMessagePro, relanceDemandePro,
  classifyAttachmentPro, DEMANDE_TYPE_LABELS,
  type Demande, type DemandeAttachment,
} from '@/lib/demandes-api';
import { useVisibleDossiers, useVisibleDossiersSignes } from '@/store';

// ─── Palette ──────────────────────────────────────────────────────────────
const GREEN = '#304035';
const DARK = '#1a2a1e';
const GOLD = '#a67749';

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  ENVOYEE:  { label: 'En attente', bg: '#eef2ff', color: '#4338ca' },
  REPONDU:  { label: 'Répondu',    bg: '#dcfce7', color: '#15803d' },
  VUE:      { label: 'Vue',        bg: '#f1f5f9', color: '#475569' },
  ACCEPTEE: { label: 'Acceptée',   bg: '#dcfce7', color: '#15803d' },
  REFUSEE:  { label: 'Refusée',    bg: '#fee2e2', color: '#b91c1c' },
  EN_COURS: { label: 'En cours',   bg: '#fef9c3', color: '#a16207' },
  TERMINEE: { label: 'Terminée',   bg: '#dcfce7', color: '#166534' },
  ANNULEE:  { label: 'Annulée',    bg: '#f1f5f9', color: '#64748b' },
};

const AVATAR_COLORS = ['#304035', '#a67749', '#3D5449', '#7c4f1d', '#4338ca', '#0f766e', '#9333ea', '#b45309'];

// ─── Helpers ────────────────────────────────────────────────────────────────
function intervName(d: Demande): string {
  const iv = d.intervenant;
  if (!iv) return 'Intervenant';
  return iv.companyName || [iv.firstName, iv.lastName].filter(Boolean).join(' ') || 'Intervenant';
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase();
}
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function cleanBody(s: string): string {
  return (s || '').replace(/^\[IMG:[^\]]*\]\s*/, '📎 ');
}
function fmtTime(s: string): string {
  try { return new Date(s).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
}
function fmtRel(s?: string | null): string {
  if (!s) return '';
  const d = new Date(s).getTime();
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const day = Math.floor(h / 24);
  if (day === 1) return 'hier';
  if (day < 7) return `il y a ${day} j`;
  try { return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); } catch { return ''; }
}
function dayLabel(s: string): string {
  const d = new Date(s);
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Aujourd'hui";
  if (same(d, yest)) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}
function fileIcon(mime: string | null): string {
  if (!mime) return '📄';
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.includes('pdf')) return '📕';
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z')) return '🗜️';
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return '📊';
  if (mime.includes('word') || mime.includes('document')) return '📘';
  return '📄';
}

// ─── localStorage "vu" ────────────────────────────────────────────────────────
const SEEN_KEY = 'avra-msg-seen';
function loadSeen(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); } catch { return {}; }
}
function saveSeen(v: Record<string, string>) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(v)); } catch { /* noop */ }
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
type TLItem =
  | { kind: 'message'; id: string; at: string; role: string; name: string; body: string }
  | { kind: 'doc'; id: string; at: string; role: string; name: string; att: DemandeAttachment }
  | { kind: 'status'; id: string; at: string; label: string; tone: 'ok' | 'bad' | 'info' }
  | { kind: 'marker'; id: string; at: string; label: string; notes?: string | null; scheduledFor?: string | null };

function buildTimeline(d: Demande | null): TLItem[] {
  if (!d) return [];
  const items: TLItem[] = [];
  for (const m of d.messages ?? []) {
    items.push({ kind: 'message', id: m.id, at: m.createdAt, role: m.authorRole, name: m.authorName, body: cleanBody(m.body) });
  }
  for (const a of d.attachments ?? []) {
    items.push({ kind: 'doc', id: a.id, at: a.createdAt, role: a.uploadedByRole, name: a.displayName, att: a });
  }
  // Repères de statut dans le fil : l'intervenant a accepté / refusé / terminé.
  const st = (at: string | null, label: string, tone: 'ok' | 'bad' | 'info') => {
    if (at) items.push({ kind: 'status', id: `st-${label}`, at, label, tone });
  };
  st(d.acceptedAt, 'Demande acceptée par l’intervenant', 'ok');
  st(d.refusedAt, 'Demande refusée par l’intervenant', 'bad');
  st(d.startedAt, 'Intervention démarrée', 'info');
  st(d.completedAt, 'Marquée comme terminée', 'ok');
  st(d.cancelledAt, 'Demande annulée', 'bad');
  items.sort((x, y) => new Date(x.at).getTime() - new Date(y.at).getTime());
  return items;
}

// Fusionne plusieurs demandes (une conversation intervenant × dossier) en un
// seul fil : chaque demande devient un repère, suivi de ses messages/docs/statuts.
function buildMergedTimeline(threads: Demande[]): TLItem[] {
  const items: TLItem[] = [];
  for (const d of threads) {
    items.push({
      kind: 'marker',
      id: `mk-${d.id}`,
      at: d.createdAt,
      label: `Demande « ${DEMANDE_TYPE_LABELS[d.type] ?? d.type} » envoyée`,
      notes: d.notes,
      scheduledFor: d.scheduledFor,
    });
    for (const it of buildTimeline(d)) items.push(it);
  }
  items.sort((x, y) => new Date(x.at).getTime() - new Date(y.at).getTime());
  return items;
}

// ─── Conversation = intervenant × dossier (fusion des demandes) ──────────────
interface Conversation {
  key: string;
  intervenantId: string | null;
  projectId: string | null;
  projectName: string | null;
  name: string;
  role: string;
  demandes: Demande[];   // triées, plus récente en tête
  lastAt: string;
  status: string;
  preview: string;
}
function buildConversations(convos: Demande[]): Conversation[] {
  const map = new Map<string, Demande[]>();
  for (const d of convos) {
    const key = `${d.intervenantId ?? 'x'}::${d.projectId ?? 'x'}`;
    const arr = map.get(key);
    if (arr) arr.push(d); else map.set(key, [d]);
  }
  const list: Conversation[] = [];
  for (const [key, ds] of map) {
    ds.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const top = ds[0];
    list.push({
      key,
      intervenantId: top.intervenantId ?? null,
      projectId: top.projectId ?? null,
      projectName: top.project?.name ?? null,
      name: intervName(top),
      role: (top.intervenant as any)?.type ?? '',
      demandes: ds,
      lastAt: top.updatedAt,
      status: top.status,
      preview: top.title,
    });
  }
  return list.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
}

// Catégorie de statut pour le filtre.
function statusBucket(status: string): 'attente' | 'repondu' | 'termine' {
  if (status === 'ACCEPTEE' || status === 'EN_COURS' || status === 'REPONDU') return 'repondu';
  if (status === 'TERMINEE' || status === 'REFUSEE' || status === 'ANNULEE') return 'termine';
  return 'attente';
}

// L'intervenant a-t-il répondu ? (message écrit, pièce jointe, ou message de
// réponse d'acceptation). Utilise les compteurs de la liste (_count) + les
// données du fil quand elles sont chargées.
function convHasIntervenantReply(conv: Conversation): boolean {
  return conv.demandes.some((d) =>
    (d.responseMessage != null && d.responseMessage.trim() !== '') ||
    (d._count?.messages ?? 0) > 0 ||
    (d._count?.attachments ?? 0) > 0 ||
    (d.messages ?? []).some((m) => m.authorRole === 'intervenant') ||
    (d.attachments ?? []).some((a) => a.uploadedByRole === 'intervenant'),
  );
}

// Statut AFFICHÉ : si la demande est encore « ENVOYEE / VUE » mais que
// l'intervenant a déjà répondu, on montre « Répondu » (avant : bloqué sur
// « En attente » tant qu'il n'avait pas formellement accepté).
function effectiveConvStatus(conv: Conversation): string {
  if (['ACCEPTEE', 'EN_COURS', 'TERMINEE', 'REFUSEE', 'ANNULEE'].includes(conv.status)) return conv.status;
  return convHasIntervenantReply(conv) ? 'REPONDU' : conv.status;
}

// ═══════════════════════════════════════════════════════════════════════════
export default function MessagesIntervenantsPage() {
  const [convos, setConvos] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dossierFilter, setDossierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'tous' | 'attente' | 'repondu' | 'termine'>('tous');
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [threads, setThreads] = useState<Demande[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [relancing, setRelancing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [seen, setSeen] = useState<Record<string, string>>({});
  const [classifyAtt, setClassifyAtt] = useState<DemandeAttachment | null>(null);
  const [classifiedIds, setClassifiedIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastScrollKey = useRef<string | null>(null);
  const seenInitRef = useRef(false);

  useEffect(() => { setSeen(loadSeen()); }, []);

  const conversations = useMemo(() => buildConversations(convos), [convos]);

  // Premier passage (localStorage vide) : tout déjà lu.
  useEffect(() => {
    if (seenInitRef.current || convos.length === 0) return;
    if (Object.keys(loadSeen()).length === 0) {
      const init: Record<string, string> = {};
      for (const d of convos) init[d.id] = d.updatedAt;
      saveSeen(init); setSeen(init);
    }
    seenInitRef.current = true;
  }, [convos]);

  const refreshConvos = useCallback(async () => {
    try { const page = await listDemandesPro({ pageSize: 200 }); setConvos(page.data ?? []); }
    catch { /* noop */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { refreshConvos(); }, [refreshConvos]);

  const showToast = useCallback((m: string) => {
    setToast(m); window.setTimeout(() => setToast(t => (t === m ? null : t)), 3000);
  }, []);

  const activeConv = useMemo(() => conversations.find(c => c.key === activeKey) ?? null, [conversations, activeKey]);

  const markConvSeen = useCallback((conv: Conversation) => {
    setSeen(prev => { const n = { ...prev }; for (const d of conv.demandes) n[d.id] = d.updatedAt; saveSeen(n); return n; });
  }, []);

  // Ouvre une conversation : charge et FUSIONNE le fil de toutes ses demandes.
  const openConvo = useCallback(async (conv: Conversation) => {
    setActiveKey(conv.key);
    setThreads([]);
    setThreadLoading(true);
    try {
      const full = await Promise.all(conv.demandes.map(d => getDemandePro(d.id).catch(() => null)));
      setThreads(full.filter(Boolean) as Demande[]);
    } catch { /* noop */ }
    finally { setThreadLoading(false); }
    markConvSeen(conv);
  }, [markConvSeen]);

  useEffect(() => {
    if (threads.length === 0) return;
    if (lastScrollKey.current !== activeKey) {
      lastScrollKey.current = activeKey;
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [threads, activeKey]);

  const reloadActiveThread = useCallback(async () => {
    const conv = conversations.find(c => c.key === activeKey);
    if (!conv) return;
    try {
      const full = await Promise.all(conv.demandes.map(d => getDemandePro(d.id).catch(() => null)));
      setThreads(full.filter(Boolean) as Demande[]);
      setSeen(prev => { const n = { ...prev }; for (const d of conv.demandes) n[d.id] = d.updatedAt; saveSeen(n); return n; });
    } catch { /* noop */ }
  }, [conversations, activeKey]);

  useEffect(() => {
    const t = setInterval(() => { refreshConvos(); reloadActiveThread(); }, 20000);
    return () => clearInterval(t);
  }, [refreshConvos, reloadActiveThread]);

  const timeline = useMemo(() => buildMergedTimeline(threads), [threads]);

  // Demande cible (envoi message / relance) : la plus récente encore ouverte.
  const targetDemande = useMemo(() => {
    if (!activeConv) return null;
    const open = activeConv.demandes.find(d => ['ENVOYEE', 'VUE', 'ACCEPTEE', 'EN_COURS'].includes(d.status));
    return open ?? activeConv.demandes[0] ?? null;
  }, [activeConv]);

  const dossierOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of conversations) if (c.projectName) set.add(c.projectName);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [conversations]);

  const filtered = useMemo(() => {
    let list = conversations;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(c => c.name.toLowerCase().includes(q) || (c.projectName || '').toLowerCase().includes(q) || c.preview.toLowerCase().includes(q));
    if (dossierFilter !== 'all') list = list.filter(c => (c.projectName || '—') === dossierFilter);
    if (statusFilter !== 'tous') list = list.filter(c => statusBucket(effectiveConvStatus(c)) === statusFilter);
    return list;
  }, [conversations, search, dossierFilter, statusFilter]);

  const unreadCount = useMemo(
    () => conversations.filter(c => c.demandes.some(d => seen[d.id] !== d.updatedAt)).length,
    [conversations, seen],
  );

  const sendMessage = useCallback(async () => {
    const body = draft.trim();
    if (!body || !targetDemande || sending) return;
    setSending(true); setDraft('');
    try {
      const msg = await postMessagePro(targetDemande.id, body);
      setThreads(prev => prev.map(t => (t.id === targetDemande.id ? { ...t, messages: [...(t.messages ?? []), msg] } : t)));
      setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 50);
      showToast('Message envoyé ✓');
      refreshConvos();
    } catch { setDraft(body); showToast('Envoi impossible'); }
    finally { setSending(false); }
  }, [draft, targetDemande, sending, refreshConvos, showToast]);

  const relancer = useCallback(async () => {
    if (!activeConv || relancing) return;
    const open = activeConv.demandes.find(d => d.status === 'ENVOYEE' || d.status === 'VUE');
    if (!open) { showToast('Aucune demande en attente à relancer'); return; }
    setRelancing(true);
    try { await relanceDemandePro(open.id); showToast('Relance envoyée ✓'); refreshConvos(); }
    catch (e: any) { showToast(e?.message || 'Relance impossible'); }
    finally { setRelancing(false); }
  }, [activeConv, relancing, refreshConvos, showToast]);

  const onClassified = useCallback(() => {
    const id = classifyAtt?.id;
    setClassifyAtt(null);
    if (id) setClassifiedIds(prev => { const n = new Set(prev); n.add(id); return n; });
    refreshConvos(); reloadActiveThread();
  }, [classifyAtt, refreshConvos, reloadActiveThread]);

  return (
    <div className="w-full">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white text-sm font-semibold rounded-full px-4 py-2 shadow-lg">{toast}</div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#304035] flex items-center gap-2">
            💬 Messagerie intervenants
            {unreadCount > 0 && (
              <span className="text-[11px] font-bold text-white bg-red-500 rounded-full px-2 py-0.5">{unreadCount} nouveau{unreadCount > 1 ? 'x' : ''}</span>
            )}
          </h1>
          <p className="text-sm text-[#304035]/55">Une conversation par intervenant et par dossier. Classez les fichiers reçus directement dans le dossier.</p>
        </div>
      </div>

      <div className="flex rounded-2xl border border-[#304035]/12 bg-white overflow-hidden shadow-sm" style={{ height: 'calc(100vh - 12rem)', minHeight: 520 }}>
        {/* ── Colonne gauche : conversations ── */}
        <div className={`w-full md:w-[340px] shrink-0 border-r border-[#304035]/10 flex-col bg-[#fbf9f6] ${activeConv ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 border-b border-[#304035]/8 space-y-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#304035]/35 text-sm">🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un poseur, un dossier…" className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#304035]/12 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#304035]/15" />
            </div>
            <select value={dossierFilter} onChange={e => setDossierFilter(e.target.value)} className="w-full rounded-xl border border-[#304035]/12 bg-white text-[12px] px-2.5 py-1.5 focus:outline-none">
              <option value="all">Tous les dossiers</option>
              {dossierOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <div className="flex gap-1">
              {([['tous', 'Tous'], ['attente', 'En attente'], ['repondu', 'Répondu'], ['termine', 'Terminé']] as ['tous' | 'attente' | 'repondu' | 'termine', string][]).map(([k, l]) => {
                const on = statusFilter === k;
                return <button key={k} onClick={() => setStatusFilter(k)} className={`text-[11px] font-bold rounded-full px-2.5 py-1 transition-colors ${on ? 'bg-[#304035] text-white' : 'bg-[#304035]/6 text-[#304035]/55 hover:bg-[#304035]/10'}`}>{l}</button>;
              })}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-[#304035]/45">Chargement…</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#304035]/45">Aucune conversation.</div>
            ) : (
              filtered.map(c => {
                const isActive = c.key === activeKey;
                const unreadN = c.demandes.filter(d => seen[d.id] !== d.updatedAt).length;
                const unread = unreadN > 0;
                const st = STATUS[effectiveConvStatus(c)] ?? { label: c.status, bg: '#f1f5f9', color: '#475569' };
                const dc = avatarColor(c.projectName || c.key);
                return (
                  <button key={c.key} onClick={() => openConvo(c)} className={`w-full text-left px-3 py-3 flex gap-3 items-start border-b border-[#304035]/5 transition-colors ${isActive ? 'bg-[#304035]/8' : 'hover:bg-[#304035]/4'}`}>
                    <div className="relative shrink-0">
                      <div className="h-11 w-11 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: avatarColor(c.name) }}>{initials(c.name)}</div>
                      {unread && <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`truncate text-[14px] ${unread ? 'font-extrabold text-[#1a2a1e]' : 'font-semibold text-[#304035]'}`}>{c.name}</span>
                        <span className="shrink-0 text-[10px] text-[#304035]/40">{fmtRel(c.lastAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 min-w-0">
                        {c.projectName
                          ? <span className="shrink-0 text-[10px] font-bold rounded px-1.5 py-0.5" style={{ background: dc + '1a', color: dc }}>{c.projectName}</span>
                          : <span className="text-[10px] text-[#304035]/40">Sans dossier</span>}
                        {c.role && <span className="truncate text-[10px] text-[#304035]/45">{c.role}</span>}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className={`truncate text-[11.5px] ${unread ? 'text-[#304035]/80 font-medium' : 'text-[#304035]/50'}`}>{c.preview}</span>
                        {unread
                          ? <span className="shrink-0 text-[10px] font-bold text-white bg-[#a67749] rounded-full min-w-[16px] h-4 px-1 inline-flex items-center justify-center">{unreadN}</span>
                          : <span className="shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5" style={{ background: st.bg, color: st.color }}>{st.label}</span>}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Colonne droite : fil fusionné ── */}
        <div className={`flex-1 flex-col min-w-0 ${activeConv ? 'flex' : 'hidden md:flex'}`}>
          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8" style={{ background: 'linear-gradient(180deg,#fbf9f6,#f3ede5)' }}>
              <div className="text-6xl mb-4">💬</div>
              <p className="text-lg font-bold text-[#304035]">Vos conversations intervenants</p>
              <p className="text-sm text-[#304035]/55 max-w-xs mt-1">Sélectionnez une conversation à gauche pour voir le fil, recevoir les documents et y répondre.</p>
            </div>
          ) : (
            <>
              <button onClick={() => setActiveKey(null)} className="md:hidden flex items-center gap-1.5 px-3 py-2 border-b border-[#304035]/10 text-sm font-semibold text-[#304035] bg-white hover:bg-[#304035]/5">← Conversations</button>
              {/* En-tête de conversation */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-[#304035]/10 bg-white">
                <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: avatarColor(activeConv.name) }}>{initials(activeConv.name)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[#304035] truncate">{activeConv.name}{activeConv.role ? <span className="text-[#304035]/45 font-medium text-xs"> · {activeConv.role}</span> : null}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {activeConv.projectName && <span className="text-[10px] font-bold rounded px-1.5 py-0.5" style={{ background: avatarColor(activeConv.projectName) + '1a', color: avatarColor(activeConv.projectName) }}>{activeConv.projectName}</span>}
                    {(() => { const es = effectiveConvStatus(activeConv); return (
                    <span className="text-[10px] font-bold rounded-full px-2 py-0.5" style={{ background: STATUS[es]?.bg ?? '#f1f5f9', color: STATUS[es]?.color ?? '#475569' }}>{STATUS[es]?.label ?? activeConv.status}</span>
                    ); })()}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={relancer} disabled={relancing} className="text-xs font-bold rounded-lg border border-[#304035]/15 px-3 py-1.5 text-[#304035] hover:bg-[#304035]/5 disabled:opacity-50">{relancing ? '…' : 'Relancer'}</button>
                  {activeConv.projectId && <a href={`/dossiers/${activeConv.projectId}`} className="text-xs font-bold rounded-lg border border-[#a67749]/30 px-3 py-1.5 text-[#a67749] hover:bg-[#a67749]/8">Voir le dossier</a>}
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4" style={{ background: 'linear-gradient(180deg,#f7f2ec,#f3ede5)' }}>
                {threadLoading && timeline.length === 0 ? (
                  <div className="text-center text-sm text-[#304035]/45 py-10">Chargement du fil…</div>
                ) : (
                  timeline.map((it, i) => {
                    const prev = timeline[i - 1];
                    const showDay = !prev || new Date(prev.at).toDateString() !== new Date(it.at).toDateString();
                    return (
                      <div key={it.kind + it.id}>
                        {showDay && (<div className="flex justify-center my-3"><span className="text-[11px] font-semibold text-[#304035]/45 bg-white/70 rounded-full px-3 py-1">{dayLabel(it.at)}</span></div>)}
                        {it.kind === 'message'
                          ? <Bubble mine={it.role === 'pro'} name={it.name} time={fmtTime(it.at)} body={it.body} />
                          : it.kind === 'doc'
                          ? <DocBubble mine={it.role === 'pro'} att={it.att} time={fmtTime(it.at)} classified={classifiedIds.has(it.att.id)} onClassify={() => setClassifyAtt(it.att)} />
                          : it.kind === 'status'
                          ? (
                            <div className="flex justify-center my-2">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1" style={{ background: it.tone === 'ok' ? '#dcfce7' : it.tone === 'bad' ? '#fee2e2' : '#fef3c7', color: it.tone === 'ok' ? '#15803d' : it.tone === 'bad' ? '#b91c1c' : '#92400e' }}>
                                {it.tone === 'ok' ? '✓' : it.tone === 'bad' ? '✕' : '•'} {it.label} · {fmtTime(it.at)}
                              </span>
                            </div>
                          )
                          : (
                            <div className="mx-auto max-w-md my-3 rounded-2xl border border-[#cbb98a]/40 bg-[#fffaf2] px-4 py-2.5 text-center">
                              <div className="text-[11px] font-bold text-[#7c6c58]">📋 {it.label}</div>
                              {it.notes && <div className="text-[11px] text-[#3D3328] mt-1 whitespace-pre-wrap">{it.notes}</div>}
                              {it.scheduledFor && <div className="text-[11px] text-[#7c4f1d] mt-1 font-semibold">📅 {new Date(it.scheduledFor).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</div>}
                            </div>
                          )}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="border-t border-[#304035]/10 p-3 bg-white">
                <div className="flex items-end gap-2">
                  <textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Écrire un message…" rows={1} className="flex-1 resize-none rounded-xl border border-[#304035]/15 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#304035]/15 max-h-32" />
                  <button onClick={sendMessage} disabled={!draft.trim() || sending} className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40" style={{ background: `linear-gradient(135deg, ${GREEN}, ${DARK})` }}>{sending ? '…' : 'Envoyer'}</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {classifyAtt && activeConv?.projectId && (
        <ClassifyModal
          att={classifyAtt}
          projectId={activeConv.projectId}
          projectName={activeConv.projectName ?? undefined}
          onClose={() => setClassifyAtt(null)}
          onDone={onClassified}
        />
      )}
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function Bubble({ mine, name, time, body }: { mine: boolean; name: string; time: string; body: string }) {
  return (
    <div className={`flex mb-2 ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
        {!mine && <span className="text-[10px] text-[#304035]/45 mb-0.5 ml-1">{name}</span>}
        <div
          className={`px-3.5 py-2 text-sm whitespace-pre-wrap break-words shadow-sm ${mine ? 'rounded-2xl rounded-br-sm text-[#f3ecd9]' : 'rounded-2xl rounded-bl-sm bg-white text-[#1a2a1e] border border-[#304035]/8'}`}
          style={mine ? { background: `linear-gradient(135deg, ${GREEN}, ${DARK})` } : undefined}
        >
          {body}
        </div>
        <span className="text-[10px] text-[#304035]/35 mt-0.5 mx-1">{time}</span>
      </div>
    </div>
  );
}

function DocBubble({ mine, att, time, classified, onClassify }: { mine: boolean; att: DemandeAttachment; time: string; classified?: boolean; onClassify: () => void }) {
  const canClassify = !!att.dossierDocumentId && att.uploadedByRole === 'intervenant' && !classified;
  return (
    <div className={`flex mb-2 ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[78%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
        {!mine && <span className="text-[10px] text-[#304035]/45 mb-0.5 ml-1">📎 a envoyé un document</span>}
        <div className="rounded-2xl bg-white border border-[#a67749]/30 shadow-sm overflow-hidden w-full max-w-[16rem]">
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center text-lg shrink-0" style={{ background: '#f5eee8' }}>{fileIcon(att.mimeType)}</div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold text-[#1a2a1e] truncate">{att.displayName}</div>
              <div className="text-[10px] text-[#304035]/45">{att.mimeType ?? 'fichier'}</div>
            </div>
          </div>
          <div className="flex border-t border-[#304035]/8">
            <a
              href={`/api/v1/demandes/attachments/${encodeURIComponent(att.id)}`}
              target="_blank" rel="noreferrer"
              className="flex-1 text-center text-[12px] font-bold text-[#304035] py-2 hover:bg-[#304035]/5"
            >
              ⬇︎ Télécharger
            </a>
            {canClassify ? (
              <button onClick={onClassify} className="flex-1 text-center text-[12px] font-bold text-[#a67749] py-2 hover:bg-[#a67749]/10 border-l border-[#304035]/8">
                🗂 Classer
              </button>
            ) : classified ? (
              <span className="flex-1 text-center text-[12px] font-bold text-emerald-600 py-2 border-l border-[#304035]/8">✓ Classé</span>
            ) : null}
          </div>
        </div>
        <span className="text-[10px] text-[#304035]/35 mt-0.5 mx-1">{time}</span>
      </div>
    </div>
  );
}

function ClassifyModal({ att, projectId, onClose, onDone }: {
  att: DemandeAttachment; projectId: string; projectName?: string; onClose: () => void; onDone: () => void;
}) {
  // Références STABLES du store (évite une boucle de re-render). Filtrées par
  // métier actif (cloisonnement inter-métiers, P0 juillet 2026).
  const dossiers = useVisibleDossiers();
  const dossiersSignes = useVisibleDossiersSignes();

  // On peut classer dans N'IMPORTE QUEL dossier (en cours ou signé) + sous-dossier.
  const [selectedDossierId, setSelectedDossierId] = useState<string>(projectId);
  const [selected, setSelected] = useState<string>('');
  const [custom, setCustom] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameOf = (d: any) => [d?.name, d?.firstName].filter(Boolean).join(' ').trim() || 'Dossier';
  const dossierOptions = useMemo(() => ({
    encours: (dossiers ?? []).map((d: any) => ({ id: d.id, name: nameOf(d) })),
    signes: (dossiersSignes ?? []).map((d: any) => ({ id: d.id, name: nameOf(d) })),
  }), [dossiers, dossiersSignes]);

  // Arbre complet du dossier sélectionné (store), boîtes système intervenant exclues.
  const subfolders = useMemo(() => {
    const all = [...(dossiers ?? []), ...(dossiersSignes ?? [])] as any[];
    const d = all.find((x) => x.id === selectedDossierId);
    const labels = ((d?.subfolders ?? []) as any[]).map((sf) => sf?.label).filter(Boolean) as string[];
    const clean = labels.filter((l) => {
      const low = l.trim().toLowerCase();
      return !((low.includes('reçu') && low.includes('intervenant')) || low.includes('documents intervenant'));
    });
    return Array.from(new Set(clean)).sort((a, b) => {
      const da = a.split(' ▸ ').length, db = b.split(' ▸ ').length;
      return da !== db ? da - db : a.localeCompare(b, 'fr');
    });
  }, [dossiers, dossiersSignes, selectedDossierId]);

  useEffect(() => { setSelected(''); setCustom(''); }, [selectedDossierId]);

  const target = custom.trim() || selected;
  const selectedDossierName =
    [...dossierOptions.encours, ...dossierOptions.signes].find((d) => d.id === selectedDossierId)?.name ?? 'Dossier';

  const confirm = async () => {
    if (!target || saving) return;
    setSaving(true); setError(null);
    try {
      await classifyAttachmentPro(att.id, target, selectedDossierId);
      onDone();
    } catch (e: any) {
      setError(e?.message || 'Classement impossible');
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-[18px] w-full max-w-md shadow-2xl overflow-hidden">
        {/* En-tête vert */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ background: '#304035' }}>
          <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: 'rgba(255,255,255,0.12)' }}>🗂</div>
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-white">Classer le document</div>
            <div className="text-[12px] truncate" style={{ color: '#cbb98a' }} title={att.displayName}>{att.displayName}</div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3.5">
          {/* Aperçu de destination — mise à jour en direct */}
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12.5px]" style={{ background: '#f5eee8', border: '1px solid #ecdcc6', color: '#7a5327' }}>
            <span>→</span>
            <span className="truncate">
              <strong>{selectedDossierName}</strong>{' '}
              {target
                ? <span>· {target.split(' ▸ ').pop()}{custom.trim() ? ' (nouveau)' : ''}</span>
                : <span style={{ color: '#a9906f' }}>· choisissez un sous-dossier</span>}
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#304035]/50 mb-1.5">Dossier de destination</label>
            <select
              value={selectedDossierId}
              onChange={(e) => setSelectedDossierId(e.target.value)}
              className="w-full rounded-xl border border-[#304035]/15 bg-white px-3 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#a67749]/30"
            >
              {dossierOptions.encours.length > 0 && (
                <optgroup label="Dossiers en cours">
                  {dossierOptions.encours.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </optgroup>
              )}
              {dossierOptions.signes.length > 0 && (
                <optgroup label="Dossiers signés">
                  {dossierOptions.signes.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </optgroup>
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#304035]/50 mb-1.5">Sous-dossier</label>
            {subfolders.length === 0 ? (
              <div className="text-[13px] text-[#304035]/45 italic rounded-xl border border-dashed border-[#304035]/15 px-3 py-2.5">
                Aucun sous-dossier dans ce dossier — créez-en un ci-dessous.
              </div>
            ) : (
              <div className="max-h-52 overflow-y-auto rounded-xl border border-[#304035]/12 p-1.5 space-y-1 bg-[#faf8f4]">
                {subfolders.map((s) => {
                  const on = selected === s && !custom;
                  const depth = s.split(' ▸ ').length;
                  const nested = depth > 1;
                  const leaf = s.split(' ▸ ').pop() ?? s;
                  return (
                    <button
                      key={s}
                      onClick={() => { setSelected(s); setCustom(''); }}
                      style={nested ? { marginLeft: (depth - 1) * 12 } : undefined}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${on ? 'bg-[#304035] text-white' : 'bg-white hover:bg-[#a67749]/8 text-[#304035] border border-[#f0eae0]'}`}
                    >
                      <span className={on ? 'text-[#d9b38a]' : 'text-[#a67749]'}>{nested ? '↳' : '📁'}</span>
                      <span className="flex-1 text-[13px] font-semibold truncate" title={s}>{nested ? leaf : s}</span>
                      {on && <span className="text-[#d9b38a]">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#304035]/50 mb-1.5">…ou nouveau sous-dossier</label>
            <input
              value={custom}
              onChange={e => { setCustom(e.target.value); if (e.target.value) setSelected(''); }}
              placeholder="Ex : Relevés de mesures"
              className="w-full rounded-xl border border-[#304035]/15 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#a67749]/30"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-[#304035]/8">
          <button onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-[#304035]/12 px-4 py-2.5 text-sm font-bold text-[#304035]/60 hover:bg-[#304035]/5 disabled:opacity-50">Annuler</button>
          <button onClick={confirm} disabled={!target || saving} className="flex-1 rounded-xl text-white px-4 py-2.5 text-sm font-bold disabled:opacity-40" style={{ background: GOLD }}>
            {saving ? 'Classement…' : 'Classer ici'}
          </button>
        </div>
      </div>
    </div>
  );
}
