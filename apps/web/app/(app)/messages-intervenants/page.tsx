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
  listDemandesPro, getDemandePro, postMessagePro,
  classifyAttachmentPro,
  type Demande, type DemandeAttachment,
} from '@/lib/demandes-api';
import { useDossierStore } from '@/store';

// ─── Palette ──────────────────────────────────────────────────────────────
const GREEN = '#304035';
const DARK = '#1a2a1e';
const GOLD = '#a67749';

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  ENVOYEE:  { label: 'En attente', bg: '#eef2ff', color: '#4338ca' },
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
  | { kind: 'status'; id: string; at: string; label: string; tone: 'ok' | 'bad' | 'info' };

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

// ═══════════════════════════════════════════════════════════════════════════
export default function MessagesIntervenantsPage() {
  const [convos, setConvos] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<Demande | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [seen, setSeen] = useState<Record<string, string>>({});
  const [classifyAtt, setClassifyAtt] = useState<DemandeAttachment | null>(null);
  const [classifiedIds, setClassifiedIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastScrollId = useRef<string | null>(null);
  const seenInitRef = useRef(false);

  useEffect(() => { setSeen(loadSeen()); }, []);

  // Premier passage (localStorage vide) : on considère tout déjà lu pour éviter
  // d'afficher toutes les conversations en "non lu".
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
    try {
      const page = await listDemandesPro({ pageSize: 200 });
      setConvos(page.data ?? []);
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refreshConvos(); }, [refreshConvos]);

  // Charge le fil de la conversation active + marque comme vue.
  const openConvo = useCallback(async (d: Demande) => {
    setActiveId(d.id);
    setThread(null);
    setThreadLoading(true);
    try {
      const full = await getDemandePro(d.id);
      setThread(full);
    } catch { /* noop */ }
    finally { setThreadLoading(false); }
    setSeen(prev => { const next = { ...prev, [d.id]: d.updatedAt }; saveSeen(next); return next; });
  }, []);

  // Scroll en bas seulement à l'ouverture d'une conversation (pas à chaque
  // rafraîchissement de fond, sinon on "tire" l'utilisateur vers le bas).
  useEffect(() => {
    if (!thread) return;
    if (lastScrollId.current !== thread.id) {
      lastScrollId.current = thread.id;
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread]);

  // Recharge silencieusement le fil actif (nouveaux messages/docs de l'intervenant).
  const reloadActiveThread = useCallback(async () => {
    if (!activeId) return;
    try {
      const full = await getDemandePro(activeId);
      setThread(prev => (prev && prev.id === full.id ? full : prev));
      setSeen(prev => { const n = { ...prev, [full.id]: full.updatedAt }; saveSeen(n); return n; });
    } catch { /* noop */ }
  }, [activeId]);

  // La conversation ouverte est considérée lue dès qu'elle bouge (pas de pastille sur soi-même).
  useEffect(() => {
    if (!activeId) return;
    const c = convos.find(x => x.id === activeId);
    if (c && seen[activeId] !== c.updatedAt) {
      setSeen(prev => { const n = { ...prev, [activeId]: c.updatedAt }; saveSeen(n); return n; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convos, activeId]);

  // Rafraîchissement léger (effet "notification") : nouvelles activités -> pastilles
  // non lu, ET rechargement du fil ouvert pour voir les messages/docs entrants.
  useEffect(() => {
    const t = setInterval(() => { refreshConvos(); reloadActiveThread(); }, 20000);
    return () => clearInterval(t);
  }, [refreshConvos, reloadActiveThread]);

  const timeline = useMemo(() => buildTimeline(thread), [thread]);

  const filtered = useMemo(() => {
    let list = [...convos];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(d =>
      intervName(d).toLowerCase().includes(q) ||
      (d.title || '').toLowerCase().includes(q) ||
      (d.project?.name || '').toLowerCase().includes(q),
    );
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [convos, search]);

  const unreadCount = useMemo(
    () => convos.filter(d => seen[d.id] !== d.updatedAt).length,
    [convos, seen],
  );

  const sendMessage = useCallback(async () => {
    const body = draft.trim();
    if (!body || !activeId || sending) return;
    setSending(true);
    try {
      const msg = await postMessagePro(activeId, body);
      setDraft('');
      setThread(prev => prev ? { ...prev, messages: [...(prev.messages ?? []), msg] } : prev);
      setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 50);
      refreshConvos();
    } catch { /* noop */ }
    finally { setSending(false); }
  }, [draft, activeId, sending, refreshConvos]);

  const onClassified = useCallback(() => {
    const id = classifyAtt?.id;
    setClassifyAtt(null);
    if (id) setClassifiedIds(prev => { const n = new Set(prev); n.add(id); return n; });
    refreshConvos();
    reloadActiveThread();
  }, [classifyAtt, refreshConvos, reloadActiveThread]);

  const active = thread ?? convos.find(c => c.id === activeId) ?? null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#304035] flex items-center gap-2">
            💬 Messagerie intervenants
            {unreadCount > 0 && (
              <span className="text-[11px] font-bold text-white bg-red-500 rounded-full px-2 py-0.5">{unreadCount} nouveau{unreadCount > 1 ? 'x' : ''}</span>
            )}
          </h1>
          <p className="text-sm text-[#304035]/55">Vos échanges et documents reçus, en conversation. Classez les fichiers directement dans le dossier.</p>
        </div>
      </div>

      <div className="flex rounded-2xl border border-[#304035]/12 bg-white overflow-hidden shadow-sm" style={{ height: 'calc(100vh - 12rem)', minHeight: 520 }}>
        {/* ── Colonne gauche : conversations ──
            Mobile : pleine largeur, masquée quand une conversation est ouverte. */}
        <div className={`w-full md:w-[340px] shrink-0 border-r border-[#304035]/10 flex-col bg-[#fbf9f6] ${active ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 border-b border-[#304035]/8">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#304035]/35 text-sm">🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#304035]/12 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#304035]/15"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-[#304035]/45">Chargement…</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#304035]/45">Aucune conversation.</div>
            ) : (
              filtered.map(d => {
                const name = intervName(d);
                const isActive = d.id === activeId;
                const unread = seen[d.id] !== d.updatedAt;
                const st = STATUS[d.status] ?? { label: d.status, bg: '#f1f5f9', color: '#475569' };
                return (
                  <button
                    key={d.id}
                    onClick={() => openConvo(d)}
                    className={`w-full text-left px-3 py-3 flex gap-3 items-center border-b border-[#304035]/5 transition-colors ${isActive ? 'bg-[#304035]/8' : 'hover:bg-[#304035]/4'}`}
                  >
                    <div className="relative shrink-0">
                      <div className="h-11 w-11 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: avatarColor(name) }}>
                        {initials(name)}
                      </div>
                      {unread && <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`truncate text-[14px] ${unread ? 'font-extrabold text-[#1a2a1e]' : 'font-semibold text-[#304035]'}`}>{name}</span>
                        <span className="shrink-0 text-[10px] text-[#304035]/40">{fmtRel(d.updatedAt)}</span>
                      </div>
                      <div className={`truncate text-[12px] ${unread ? 'text-[#304035]/80 font-medium' : 'text-[#304035]/55'}`}>{d.title}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        {d.project?.name && <span className="truncate text-[10px] text-[#a67749]/90 font-semibold">· {d.project.name}</span>}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Colonne droite : fil ──
            Mobile : pleine largeur, masquée tant qu'aucune conversation n'est ouverte. */}
        <div className={`flex-1 flex-col min-w-0 ${active ? 'flex' : 'hidden md:flex'}`}>
          {!active ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8" style={{ background: 'linear-gradient(180deg,#fbf9f6,#f3ede5)' }}>
              <div className="text-6xl mb-4">💬</div>
              <p className="text-lg font-bold text-[#304035]">Vos conversations intervenants</p>
              <p className="text-sm text-[#304035]/55 max-w-xs mt-1">Sélectionnez une conversation à gauche pour voir le fil, recevoir les documents et y répondre.</p>
            </div>
          ) : (
            <>
              {/* Retour à la liste — mobile uniquement */}
              <button
                onClick={() => setActiveId(null)}
                className="md:hidden flex items-center gap-1.5 px-3 py-2 border-b border-[#304035]/10 text-sm font-semibold text-[#304035] bg-white hover:bg-[#304035]/5"
              >
                ← Conversations
              </button>
              <ThreadHeader d={active} />
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4" style={{ background: 'linear-gradient(180deg,#f7f2ec,#f3ede5)' }}>
                {threadLoading && timeline.length === 0 ? (
                  <div className="text-center text-sm text-[#304035]/45 py-10">Chargement du fil…</div>
                ) : (
                  <>
                    <RequestCard d={active} />
                    {timeline.map((it, i) => {
                      const prev = timeline[i - 1];
                      const showDay = !prev || new Date(prev.at).toDateString() !== new Date(it.at).toDateString();
                      return (
                        <div key={it.kind + it.id}>
                          {showDay && (
                            <div className="flex justify-center my-3">
                              <span className="text-[11px] font-semibold text-[#304035]/45 bg-white/70 rounded-full px-3 py-1">{dayLabel(it.at)}</span>
                            </div>
                          )}
                          {it.kind === 'message'
                            ? <Bubble mine={it.role === 'pro'} name={it.name} time={fmtTime(it.at)} body={it.body} />
                            : it.kind === 'doc'
                            ? <DocBubble mine={it.role === 'pro'} att={it.att} time={fmtTime(it.at)} classified={classifiedIds.has(it.att.id)} onClassify={() => setClassifyAtt(it.att)} />
                            : (
                              <div className="flex justify-center my-2">
                                <span
                                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1"
                                  style={{
                                    background: it.tone === 'ok' ? '#dcfce7' : it.tone === 'bad' ? '#fee2e2' : '#fef3c7',
                                    color: it.tone === 'ok' ? '#15803d' : it.tone === 'bad' ? '#b91c1c' : '#92400e',
                                  }}
                                >
                                  {it.tone === 'ok' ? '✓' : it.tone === 'bad' ? '✕' : '•'} {it.label} · {fmtTime(it.at)}
                                </span>
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
              <div className="border-t border-[#304035]/10 p-3 bg-white">
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Écrire un message…"
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-[#304035]/15 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#304035]/15 max-h-32"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!draft.trim() || sending}
                    className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
                    style={{ background: `linear-gradient(135deg, ${GREEN}, ${DARK})` }}
                  >
                    {sending ? '…' : 'Envoyer'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {classifyAtt && active?.project?.id && (
        <ClassifyModal
          att={classifyAtt}
          projectId={active.project.id}
          projectName={active.project.name}
          onClose={() => setClassifyAtt(null)}
          onDone={onClassified}
        />
      )}
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function ThreadHeader({ d }: { d: Demande }) {
  const name = intervName(d);
  const st = STATUS[d.status] ?? { label: d.status, bg: '#f1f5f9', color: '#475569' };
  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-[#304035]/10 bg-white">
      <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: avatarColor(name) }}>
        {initials(name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[#304035] truncate">{name}</div>
        <div className="text-xs text-[#304035]/55 truncate">
          {d.title}{d.project?.name ? <span className="text-[#a67749] font-semibold"> · {d.project.name}</span> : null}
        </div>
      </div>
      <span className="shrink-0 text-xs font-bold rounded-full px-2.5 py-1" style={{ background: st.bg, color: st.color }}>{st.label}</span>
      {d.project?.id && (
        <a href={`/dossiers/${d.project.id}`} className="shrink-0 text-xs font-bold text-[#a67749] hover:underline">Voir le dossier →</a>
      )}
    </div>
  );
}

/** Carte de la demande d'origine, en tête du fil. */
function RequestCard({ d }: { d: Demande }) {
  return (
    <div className="mx-auto max-w-md mb-2 rounded-2xl border border-[#cbb98a]/40 bg-[#fffaf2] px-4 py-3 text-center">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#7c6c58]">{d.type} · demande envoyée</div>
      <div className="text-sm font-bold text-[#1a2a1e] mt-0.5">{d.title}</div>
      {d.notes && <div className="text-xs text-[#3D3328] mt-1 whitespace-pre-wrap">{d.notes}</div>}
      {d.scheduledFor && <div className="text-xs text-[#7c4f1d] mt-1 font-semibold">📅 {new Date(d.scheduledFor).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</div>}
    </div>
  );
}

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
  // Références STABLES du store (évite une boucle de re-render).
  const dossiers = useDossierStore((s) => s.dossiers);
  const dossiersSignes = useDossierStore((s) => s.dossiersSignes);

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
      return low !== "reçu de l'intervenant" && !low.includes('documents intervenants');
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
