'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { X, Send, AlertTriangle, XCircle, Clock, Info, ChevronDown, Mic, MicOff, Volume2, VolumeX, MessageSquare } from 'lucide-react';
import { useDossierStore, useFacturationStore, useUIStore, useConfigStore, useIntervenantStore, useVisibleDossiers, useVisibleDossiersSignes } from '@/store';
import { useAssistantStore } from '@/store/useAssistantStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useProjectActions } from '@/hooks/useProjectActions';
import { createQuote, quoteToDevis, type QuoteLineApi } from '@/lib/quotes-api';
import { createInvoice, invoiceApiToBase, invoiceApiToDetail } from '@/lib/invoices-api';
import { createDemande, listDemandesPro, type Demande } from '@/lib/demandes-api';
import { api } from '@/lib/api';
import { MicPermissionHelpModal } from './MicPermissionHelpModal';
import Link from 'next/link';
import { isRetardAlert, isUrgentAlert } from '@/lib/alertClassify';

// ── Messagerie intervenants : suivi « vu » ────────────────────────────────────
// MÊME clé localStorage que la page /messages-intervenants → non-lus synchronisés
// entre l'assistant et la page. Non-lu = seen[demandeId] !== demande.updatedAt.
const AP_MSG_SEEN_KEY = 'avra-msg-seen';
function apLoadSeen(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(AP_MSG_SEEN_KEY) || '{}'); } catch { return {}; }
}
function apSaveSeen(v: Record<string, string>) {
  try { localStorage.setItem(AP_MSG_SEEN_KEY, JSON.stringify(v)); } catch { /* noop */ }
}
function intervenantLabel(d: Demande): string {
  const iv = d.intervenant;
  if (!iv) return 'Intervenant';
  return iv.companyName || [iv.firstName, iv.lastName].filter(Boolean).join(' ') || 'Intervenant';
}
function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  return `il y a ${j} j`;
}

// ── Rendu Markdown léger ──────────────────────────────────────────────────────

function renderInline(text: string, baseColor: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  const patterns: { regex: RegExp; render: (match: string) => React.ReactNode }[] = [
    { regex: /\*\*(.+?)\*\*/,  render: m => <strong key={key++} style={{ fontWeight: 700 }}>{m}</strong> },
    { regex: /__(.+?)__/,      render: m => <strong key={key++} style={{ fontWeight: 700 }}>{m}</strong> },
    { regex: /\*(.+?)\*/,      render: m => <em key={key++}>{m}</em> },
    { regex: /_(.+?)_/,        render: m => <em key={key++}>{m}</em> },
    { regex: /`(.+?)`/,        render: m => <code key={key++} style={{ background:'rgba(0,0,0,0.08)', borderRadius:3, padding:'1px 4px', fontFamily:'monospace', fontSize:11 }}>{m}</code> },
  ];
  while (remaining.length > 0) {
    let best: { index: number; length: number; node: React.ReactNode } | null = null;
    for (const { regex, render } of patterns) {
      const m = remaining.match(regex);
      if (m && m.index !== undefined) {
        if (!best || m.index < best.index) best = { index: m.index, length: m[0].length, node: render(m[1]) };
      }
    }
    if (!best) { parts.push(remaining); break; }
    if (best.index > 0) parts.push(remaining.slice(0, best.index));
    parts.push(best.node);
    remaining = remaining.slice(best.index + best.length);
  }
  return <React.Fragment>{parts}</React.Fragment>;
}

function renderMarkdown(text: string, isUser: boolean): React.ReactNode {
  const color = isUser ? 'rgba(255,255,255,0.95)' : '#2C3529';
  const blocks = text.split(/\n{2,}/);

  return blocks.map((block, bi) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    // Heading
    const hMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (hMatch) return (
      <p key={bi} style={{ fontWeight: 700, fontSize: 12.5, marginTop: bi > 0 ? 6 : 0, marginBottom: 2, color }}>
        {renderInline(hMatch[1], color)}
      </p>
    );

    // Separator
    if (/^[-*]{3,}$/.test(trimmed)) return <hr key={bi} style={{ border:'none', borderTop:`1px solid ${isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`, margin:'4px 0' }} />;

    // List (unordered or ordered)
    const lines = trimmed.split('\n');
    const isUL = lines.every(l => /^[-*+]\s/.test(l.trim()));
    const isOL = lines.every(l => /^\d+[.)]\s/.test(l.trim()));

    if (isUL) return (
      <ul key={bi} style={{ margin: bi > 0 ? '5px 0 0 0' : '0', paddingLeft: 16, listStyleType:'disc', color }}>
        {lines.map((l, j) => (
          <li key={j} style={{ marginBottom: 1, lineHeight: 1.5, fontSize: 12 }}>
            {renderInline(l.trim().replace(/^[-*+]\s+/, ''), color)}
          </li>
        ))}
      </ul>
    );

    if (isOL) return (
      <ol key={bi} style={{ margin: bi > 0 ? '5px 0 0 0' : '0', paddingLeft: 16, color }}>
        {lines.map((l, j) => (
          <li key={j} style={{ marginBottom: 1, lineHeight: 1.5, fontSize: 12 }}>
            {renderInline(l.trim().replace(/^\d+[.)]\s+/, ''), color)}
          </li>
        ))}
      </ol>
    );

    // Mixed or regular paragraph (line by line)
    return (
      <p key={bi} style={{ margin: bi > 0 ? '5px 0 0 0' : '0', lineHeight: 1.55, color }}>
        {lines.map((line, li) => {
          const t = line.trim();
          const isBullet = /^[-*+]\s/.test(t) || /^\d+[.)]\s/.test(t);
          return (
            <React.Fragment key={li}>
              {li > 0 && (isBullet ? null : <br />)}
              {isBullet ? (
                <span style={{ display:'block', paddingLeft:10, position:'relative' }}>
                  <span style={{ position:'absolute', left:0, top:'0.5em', width:4, height:4, borderRadius:'50%', background: isUser ? 'rgba(255,255,255,0.7)' : '#4A6358', display:'inline-block' }}/>
                  {renderInline(t.replace(/^[-*+]\s+/, '').replace(/^\d+[.)]\s+/, ''), color)}
                </span>
              ) : renderInline(t, color)}
            </React.Fragment>
          );
        })}
      </p>
    );
  });
}

const OWL_B64 = "/nouveaulogochouette.png";
const TEXTURE_B64 = "/images/assistant-panel-2.jpeg";

function AlertIconComp({ severity }: { severity: string }) {
  if (severity === 'error')   return <XCircle className="h-4 w-4 text-red-500" />;
  if (severity === 'warning') return <AlertTriangle className="h-4 w-4 text-orange-500" />;
  if (severity === 'clock')   return <Clock className="h-4 w-4 text-gray-400" />;
  return <Info className="h-4 w-4 text-blue-400" />;
}

const DOT_COLOR: Record<string, string> = {
  error:'#D32F2F', warning:'#E07B00', clock:'#BDBDBD', info:'#42A5F5',
};
const ICON_BG: Record<string, string> = {
  error:'#FFF0F0', warning:'#FFF3E0', clock:'#F5F5F5', info:'#EFF6FF',
};

interface Props { open: boolean; onClose: () => void; permanent?: boolean; }

export function AssistantPanel({ open, onClose, permanent = false }: Props) {
  const alerts        = useUIStore(s => s.alerts);
  const dismissAlert  = useUIStore(s => s.dismissAlert);
  const dossiers      = useVisibleDossiers();
  const dossiersSignes = useVisibleDossiersSignes();
  const invoices      = useFacturationStore(s => s.invoices);

  const [tab, setTab] = useState<'alerts'|'chat'|'messages'>('alerts');
  // Filtre des alertes par catégorie (clic sur une carte KPI). 'all' = défaut.
  const [alertFilter, setAlertFilter] = useState<'all'|'urgent'|'retard'|'encours'>('all');

  // ── Messagerie intervenants : données + non-lus (polling léger) ──────────────
  const [msgDemandes, setMsgDemandes] = useState<Demande[]>([]);
  const [msgSeenTick, setMsgSeenTick] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const page = await listDemandesPro({ pageSize: 100 });
        if (!alive) return;
        const list = (page.data ?? []).filter((d) => d.intervenantId);
        // Premier passage (seen vide) : on marque tout comme lu pour ne pas
        // tout afficher en non-lu (aligné sur /messages-intervenants).
        const seen = apLoadSeen();
        if (Object.keys(seen).length === 0 && list.length > 0) {
          const init: Record<string, string> = {};
          list.forEach((d) => { init[d.id] = d.updatedAt; });
          apSaveSeen(init);
        }
        setMsgDemandes(list);
      } catch { /* silencieux — pas de clé/API : on n'affiche rien */ }
    };
    load();
    const iv = setInterval(load, 45000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const unreadMsgCount = useMemo(() => {
    void msgSeenTick;
    const seen = apLoadSeen();
    return msgDemandes.filter((d) => seen[d.id] !== d.updatedAt).length;
  }, [msgDemandes, msgSeenTick]);
  const activeAlerts  = alerts.filter(a => !a.dismissed);
  // Classifieurs URGENT/RETARD importés depuis @/lib/alertClassify — SOURCE DE
  // VÉRITÉ UNIQUE, partagée avec les badges « ! » sur les dossiers.
  const displayedAlerts = activeAlerts.filter(a =>
    alertFilter === 'urgent'  ? isUrgentAlert(a)
    : alertFilter === 'retard'  ? isRetardAlert(a)
    : alertFilter === 'encours' ? (!isUrgentAlert(a) && !isRetardAlert(a))
    : true);

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes apFloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes apBlink  { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes apSlide  { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:translateX(0)} }
        @keyframes apMsgIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes apOpen   { from{opacity:0;transform:translateY(20px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes apPulseRing { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.08);opacity:1} }
        @keyframes apTyping { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-5px);opacity:1} }
        .ap-float { animation: apFloat 3.5s ease-in-out infinite; }
        .ap-blink { animation: apBlink 2s ease-in-out infinite; }
        .ap-slide { animation: apSlide 0.3s ease both; }
        .ap-msg   { animation: apMsgIn 0.25s ease both; }
        .ap-tdot  { animation: apTyping 1.2s ease-in-out infinite; }
        .ap-tdot:nth-child(2) { animation-delay:.2s }
        .ap-tdot:nth-child(3) { animation-delay:.4s }
        .ap-scroll::-webkit-scrollbar { width:3px }
        .ap-scroll::-webkit-scrollbar-thumb { background:#C5C0B8; border-radius:3px }
        .ap-textarea::-webkit-scrollbar { width:4px }
        .ap-textarea::-webkit-scrollbar-thumb { background:#C5C0B8; border-radius:3px }
        .ap-textarea { word-wrap: break-word; overflow-wrap: anywhere; }
        .ap-card { transition:transform .15s,box-shadow .15s; }
        .ap-card:hover { transform:translateX(3px); box-shadow:0 4px 16px rgba(0,0,0,0.10) !important; }
      `}</style>



      {/* Panneau — permanent (sidebar) ou flottant */}
      <div className={permanent ? "relative w-full h-full z-40 overflow-hidden flex flex-col" : "fixed bottom-6 right-6 w-[300px] max-h-[580px] z-40 rounded-[28px] overflow-hidden shadow-[0_24px_72px_rgba(0,0,0,0.22),0_8px_24px_rgba(0,0,0,0.14)] flex flex-col animate-[apOpen_0.25s_cubic-bezier(0.34,1.56,0.64,1)_both]"}
        style={{ background: '#F5F2EE' }}>

        {/* Chouette filigrane — au centre du panneau */}
        <div style={{
          position: 'absolute', top: '55%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 0, pointerEvents: 'none',
          width: 390, height: 390,
        }}>
          <Image src="/nouveaulogochouette.png" alt="" width={390} height={390}
            style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.09 }}/>
        </div>


        {/* ── HEADER ── */}
        <div className="relative flex-shrink-0" style={{ height: 130, background: '#F5F2EE' }}>
          {/* Blob vert organique */}
          <svg viewBox="0 0 300 130" preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full">
            <defs>
              <linearGradient id="apBlobGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#5a7868"/>
                <stop offset="100%" stopColor="#3d5449"/>
              </linearGradient>
              <radialGradient id="apBlobLight" cx="25%" cy="20%" r="60%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.18)"/>
                <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
              </radialGradient>
            </defs>
            {/* Forme organique principale */}
            <path d="M 0,0 L 300,0 L 300,78 C 255,98 205,112 155,110 C 105,108 50,96 0,80 Z"
              fill="url(#apBlobGrad)"/>
            {/* Lumière sur le blob */}
            <path d="M 0,0 L 300,0 L 300,78 C 255,98 205,112 155,110 C 105,108 50,96 0,80 Z"
              fill="url(#apBlobLight)"/>
            {/* Ombre douce sous le blob */}
            <path d="M 0,80 C 50,96 105,108 155,110 C 205,112 255,98 300,78 L 300,84 C 255,104 205,118 155,116 C 105,114 50,102 0,86 Z"
              fill="rgba(0,0,0,0.07)"/>
          </svg>

          {/* Bouton fermer */}
          {!permanent && <button onClick={onClose} className="absolute top-3 right-3 z-[3] w-7 h-7 rounded-full bg-[rgba(0,0,0,0.20)] border-none cursor-pointer flex items-center justify-center text-[rgba(255,255,255,0.8)]">
            <ChevronDown className="h-4 w-4"/>
          </button>}

          {/* Chouette + titre */}
          <div className="absolute z-[2] flex items-center gap-3" style={{ top: 12, left: 16 }}>
            <div className="ap-float" style={{ width: 100, height: 100, flexShrink: 0 }}>
              <Image src={OWL_B64} alt="AVRA" width={100} height={100} loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}/>
            </div>
            <div>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
                color: 'rgba(210,240,220,0.85)', lineHeight: 1,
                textTransform: 'uppercase',
              }}>
                Assistant
              </div>
              <div style={{
                fontSize: 26, fontWeight: 900, letterSpacing: '0.04em', lineHeight: 1.1,
                background: 'linear-gradient(135deg, #ffffff 0%, #d4edda 50%, #a8d5b5 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                textShadow: 'none',
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))',
              }}>
                AVRA
              </div>
              <div className="flex items-center gap-[5px]" style={{ marginTop: 5 }}>
                <div className="ap-blink w-[6px] h-[6px] rounded-full"
                  style={{ background: '#4CAF50', boxShadow: '0 0 8px rgba(76,175,80,1)' }}/>
                <span style={{ color: 'rgba(210,240,220,0.9)', fontSize: 9, fontWeight: 600, letterSpacing: '0.05em' }}>En ligne · IA active</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── TABS : Chat IA pleine largeur en haut ; Alertes | Messagerie dessous ── */}
        <div className="flex flex-col flex-shrink-0" style={{ background: '#F5F2EE', padding: '0 12px' }}>
          <button onClick={() => setTab('chat')} style={{
            width: '100%', padding: '10px 0', fontSize: 11, fontWeight: 700,
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: tab === 'chat' ? '#3D5449' : '#A8A29E',
            borderBottom: tab === 'chat' ? '2.5px solid #4A6358' : '2.5px solid transparent',
            transition: 'all 0.2s', letterSpacing: '0.04em',
          }}>Chat IA</button>
          <div className="flex" style={{ gap: 4 }}>
            <button onClick={() => setTab('alerts')} style={{
              flex: 1, padding: '10px 0', fontSize: 11, fontWeight: 700,
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: tab === 'alerts' ? '#3D5449' : '#A8A29E',
              borderBottom: tab === 'alerts' ? '2.5px solid #4A6358' : '2.5px solid transparent',
              transition: 'all 0.2s', letterSpacing: '0.04em',
            }}>
              <span>Alertes{activeAlerts.length > 0 &&
                <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', background:'#C0392B', color:'white', fontSize:9, fontWeight:800, width:16, height:16, borderRadius:'50%', marginLeft:5, verticalAlign:'middle' }}>{activeAlerts.length}</span>
              }</span>
            </button>
            <button onClick={() => setTab('messages')} style={{
              flex: 1, padding: '10px 0', fontSize: 11, fontWeight: 700,
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: tab === 'messages' ? '#3D5449' : '#A8A29E',
              borderBottom: tab === 'messages' ? '2.5px solid #4A6358' : '2.5px solid transparent',
              transition: 'all 0.2s', letterSpacing: '0.04em',
            }}>
              <span>Messagerie{unreadMsgCount > 0 &&
                <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', background:'#C0392B', color:'white', fontSize:9, fontWeight:800, width:16, height:16, borderRadius:'50%', marginLeft:5, verticalAlign:'middle' }}>{unreadMsgCount}</span>
              }</span>
            </button>
          </div>
        </div>

        {/* ── VUE ALERTES ── */}
        {tab === 'alerts' && (
          <div className="flex flex-col flex-1 overflow-hidden" style={{ background: 'transparent', position: 'relative' }}>
            {/* KPIs */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, padding:'10px 12px 6px' }}>
              {[
                { fkey:'urgent'  as const, val:activeAlerts.filter(isUrgentAlert).length, label:'URGENTS', color:'#D32F2F', bg:'#FFF0F0' },
                { fkey:'encours' as const, val:dossiers.length,                          label:'EN COURS', color:'#388E3C', bg:'#F0FFF2' },
                { fkey:'retard'  as const, val:activeAlerts.filter(isRetardAlert).length, label:'RETARDS', color:'#E07B00', bg:'#FFF8F0' },
              ].map(({ fkey, val, label, color, bg }) => {
                const selected = alertFilter === fkey;
                return (
                <button key={label} onClick={() => setAlertFilter(selected ? 'all' : fkey)} title={selected ? 'Cliquer pour tout afficher' : `Voir seulement : ${label}`} style={{
                  background: selected ? bg : 'white', borderRadius:14, padding:'9px 4px', textAlign:'center',
                  boxShadow: selected ? `0 2px 10px ${color}33` : '0 2px 8px rgba(0,0,0,0.07)',
                  border: selected ? `2px solid ${color}` : '2px solid transparent',
                  cursor:'pointer', transition:'all .15s', outline:'none',
                }}>
                  <div style={{ fontSize:22, fontWeight:800, color, lineHeight:1 }}>{val}</div>
                  <div style={{ fontSize:8, fontWeight:700, color: selected ? color : '#9A9590', letterSpacing:'0.05em', marginTop:2 }}>{label}</div>
                </button>
                );
              })}
            </div>
            {/* Liste */}
            <div className="ap-scroll flex-1 overflow-y-auto" style={{ padding:'4px 12px 8px', display:'flex', flexDirection:'column', gap:7 }}>
              {displayedAlerts.length === 0 ? (
                <div style={{ textAlign:'center', padding:'24px 0', color:'#388E3C', fontWeight:600, fontSize:13 }}>
                  {alertFilter === 'all' ? '✅ Tout est en ordre' : '✅ Aucune alerte dans cette catégorie'}
                </div>
              ) : displayedAlerts.map((alert, i) => (
                <div key={alert.id} className="ap-slide ap-card" style={{
                  background:'white', borderRadius:16,
                  padding:'10px 11px', display:'flex', flexDirection:'column', gap:6,
                  boxShadow:'0 2px 10px rgba(0,0,0,0.07)',
                  animationDelay: i * 0.04 + 's',
                }}>
                  {/* Ligne principale */}
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{
                      width:32, height:32, borderRadius:10, flexShrink:0,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      background: ICON_BG[alert.severity] ?? '#F5F5F5',
                    }}>
                      <AlertIconComp severity={alert.severity}/>
                    </div>
                    {alert.dossierId ? (
                      <Link href={`/dossiers/${alert.dossierId}${alert.anchor ? `#${alert.anchor}` : ''}`} style={{ flex:1, minWidth:0, display:'block', textDecoration:'none', color:'inherit', cursor:'pointer' }}>
                        <div style={{ fontSize:11.5, color:'#1a1a1a', fontWeight:600, lineHeight:1.35 }}>
                          {alert.text}
                        </div>
                        {alert.category && (
                          <span style={{ fontSize:9, fontWeight:700, color:'#9A9590', textTransform:'uppercase', letterSpacing:'0.04em' }}>
                            {alert.category}
                          </span>
                        )}
                      </Link>
                    ) : (
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:11.5, color:'#1a1a1a', fontWeight:600, lineHeight:1.35 }}>
                          {alert.text}
                        </div>
                        {alert.category && (
                          <span style={{ fontSize:9, fontWeight:700, color:'#9A9590', textTransform:'uppercase', letterSpacing:'0.04em' }}>
                            {alert.category}
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                      <div style={{ width:7, height:7, borderRadius:'50%', background: DOT_COLOR[alert.severity] ?? '#BDBDBD' }}/>
                      <button onClick={() => dismissAlert(alert.id)} style={{ border:'none', background:'transparent', cursor:'pointer', color:'#C0BAB2', padding:2, display:'flex', alignItems:'center' }}>
                        <X className="h-3 w-3"/>
                      </button>
                    </div>
                  </div>
                  {/* Boutons d'action */}
                  {alert.actions && alert.actions.length > 0 && (
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap', paddingLeft:40 }}>
                      {alert.actions.map((act, j) => (
                        act.href ? (
                          <Link key={j} href={act.href} style={{
                            fontSize:10, fontWeight:600, color:'#4A6358', background:'#e8f0ec',
                            borderRadius:8, padding:'3px 8px', textDecoration:'none',
                            border:'1px solid rgba(74,99,88,0.15)',
                            transition:'background 0.15s',
                          }}>
                            {act.label}
                          </Link>
                        ) : (
                          <button key={j} style={{
                            fontSize:10, fontWeight:600, color:'#6b6158', background:'#f5eee8',
                            borderRadius:8, padding:'3px 8px', border:'1px solid rgba(0,0,0,0.08)',
                            cursor:'pointer', transition:'background 0.15s',
                          }}>
                            {act.label}
                          </button>
                        )
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Pagination */}
            <div style={{ padding:'8px 12px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:'1px solid rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize:11, color:'#B0AB9F', fontWeight:500 }}>
                {displayedAlerts.length} / {activeAlerts.length} alertes
                {alertFilter !== 'all' && (
                  <button onClick={() => setAlertFilter('all')} style={{ marginLeft:8, border:'none', background:'transparent', color:'#4A6358', fontWeight:700, fontSize:11, cursor:'pointer', textDecoration:'underline', padding:0 }}>
                    tout afficher
                  </button>
                )}
              </span>
              <div style={{ display:'flex', gap:5 }}>
                {['‹','›'].map(btn => (
                  <button key={btn} style={{ width:26, height:26, borderRadius:'50%', border:'1px solid #D8D3CB', background:'white', fontSize:14, color:'#4A6358', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>{btn}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── VUE CHAT ── */}
        {tab === 'chat' && <ChatView owlB64={OWL_B64}/>}

        {/* ── VUE MESSAGERIE INTERVENANTS ── */}
        {tab === 'messages' && <MessagesView demandes={msgDemandes} onSeen={() => setMsgSeenTick(t => t + 1)} />}
      </div>
    </>
  );
}

// ── Vue « Messagerie » : conversations avec les intervenants + non-lus ─────────
function MessagesView({ demandes, onSeen }: { demandes: Demande[]; onSeen: () => void }) {
  const seen = apLoadSeen();
  const sorted = [...demandes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const markSeen = (d: Demande) => {
    const s = apLoadSeen();
    s[d.id] = d.updatedAt;
    apSaveSeen(s);
    onSeen();
  };
  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ position: 'relative' }}>
      <div className="ap-scroll flex-1 overflow-y-auto" style={{ padding: '10px 12px 8px', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 12px', color: '#9A9590', fontWeight: 600, fontSize: 13 }}>
            Aucun échange avec un intervenant pour l’instant.
          </div>
        ) : sorted.map((d) => {
          const unread = seen[d.id] !== d.updatedAt;
          return (
            <Link
              key={d.id}
              href="/messages-intervenants"
              onClick={() => markSeen(d)}
              className="ap-card"
              style={{
                display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
                background: 'white', borderRadius: 14, padding: '10px 11px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.07)', color: 'inherit',
                border: unread ? '1.5px solid #a67749' : '1.5px solid transparent',
              }}
            >
              <div style={{ position: 'relative', width: 34, height: 34, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: unread ? '#f3e9dc' : '#F1EFEA' }}>
                <MessageSquare className="h-4 w-4" style={{ color: unread ? '#a67749' : '#9A9590' }} />
                {unread && <span style={{ position: 'absolute', top: -3, right: -3, width: 10, height: 10, borderRadius: '50%', background: '#C0392B', border: '2px solid white' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: unread ? 800 : 700, color: '#1a2a1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {intervenantLabel(d)}
                  </span>
                  <span style={{ fontSize: 9.5, color: '#B0AB9F', flexShrink: 0 }}>{relTime(d.updatedAt)}</span>
                </div>
                <div style={{ fontSize: 11, color: unread ? '#3D3328' : '#9A9590', fontWeight: unread ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.project?.name ? `${d.project.name} · ` : ''}{d.title}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <div style={{ padding: '8px 12px 12px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        <Link href="/messages-intervenants" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          textDecoration: 'none', background: '#4A6358', color: 'white',
          borderRadius: 12, padding: '10px', fontSize: 12, fontWeight: 700,
        }}>
          <MessageSquare className="h-4 w-4" /> Ouvrir la messagerie
        </Link>
      </div>
    </div>
  );
}

function ChatView({ owlB64 }: { owlB64: string }) {
  const dossiers       = useVisibleDossiers();
  const dossiersSignes = useVisibleDossiersSignes();
  const invoices       = useFacturationStore(s => s.invoices);
  const alerts         = useUIStore(s => s.alerts);
  // Volets 2-4 (28/05/2026) : reglages IA reels (personnalite, acces, actions).
  const iaConfig       = useConfigStore(s => s.iaConfig);

  // Avatar utilisateur : initiale reelle du compte connecte (avant : "E" code
  // en dur -> tous les utilisateurs voyaient "E"). Fallback "U" si pas de nom.
  const user = useAuthStore(s => s.user);
  const userInitial = (
    user?.firstName?.trim()?.[0]
    || user?.lastName?.trim()?.[0]
    || user?.email?.trim()?.[0]
    || 'U'
  ).toUpperCase();

  // Volet 5 : actions REELLES. Client de creation de dossier (gere API + store
  // + CSRF). Les devis/factures passent par createQuote/createInvoice (lib).
  const { createProject } = useProjectActions();
  // Volet 6 : intervenants pour resoudre nom -> id lors d'une demande.
  const intervenants = useIntervenantStore(s => s.intervenants);

  const [message,  setMessage]  = useState('');
  const [typing,   setTyping]   = useState(false);
  // ⬇️ Conversation persistée via zustand (commit du 02/05) — survit aux
  // navigations entre pages, reloads et fermetures d'onglet (localStorage).
  const messages = useAssistantStore((s) => s.messages);
  const setMessagesStore = useAssistantStore((s) => s.setMessages);
  const appendMessage = useAssistantStore((s) => s.appendMessage);
  const resetConversation = useAssistantStore((s) => s.resetConversation);
  // Wrapper pour conserver l'API existante setMessages(prev => ...)
  const setMessages = setMessagesStore;
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-resize du textarea : on rend la hauteur "auto" pour mesurer le scrollHeight
  // réel, puis on la fixe — bornée à max-height (140px ≈ 5 lignes).
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [message]);

  // Hydratation : si la conversation persistée est vide, on l'initialise avec
  // un message d'accueil contextuel (nb dossiers + alertes). Une seule fois.
  useEffect(() => {
    if (messages.length === 0) {
      resetConversation({
        role: 'ai',
        text: `Bonjour ! Je surveille vos ${dossiers.length} dossiers et ${alerts.filter((a) => !a.dismissed).length} alerte(s) active(s). Comment puis-je vous aider ?`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Vocal ──────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [showMicHelp, setShowMicHelp] = useState(false);
  const recognitionRef = useRef<any>(null);

  // ── Voix EN SORTIE (TTS) — l'assistant lit ses réponses à voix haute ───────
  // Désactivé par défaut, préférence mémorisée. Utilise la Web Speech Synthesis
  // (intégrée au navigateur, gratuite, aucune dépendance).
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('avra-tts') === '1';
  });
  const speak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const clean = text.replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim();
    if (!clean) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = 'fr-FR';
      window.speechSynthesis.speak(u);
    } catch { /* TTS indisponible → silencieux */ }
  };
  const toggleTts = () => {
    setTtsEnabled((on) => {
      const next = !on;
      if (typeof window !== 'undefined') {
        localStorage.setItem('avra-tts', next ? '1' : '0');
        if (!next && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      }
      return next;
    });
  };

  /**
   * Démarre la reconnaissance vocale (Web Speech API).
   * Gère explicitement TOUS les cas d'erreur courants pour donner un retour
   * clair à l'utilisateur (avant la version naïve faisait juste alert()
   * sur "non supporté" et silence sur les autres erreurs → micro qui semblait
   * cassé alors que c'était souvent les permissions).
   */
  const startVoice = async () => {
    setVoiceError(null);

    // 1. Vérification du contexte sécurisé (HTTPS obligatoire sauf localhost)
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setVoiceError('Le micro nécessite HTTPS. Cette page n\'est pas sécurisée.');
      return;
    }

    // 2. Vérification du support navigateur
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setVoiceError('Reconnaissance vocale non supportée — utilisez Chrome, Edge ou Safari.');
      return;
    }

    // 3. Demande explicite de permission micro AVANT de lancer SpeechRecognition.
    //    01/05/2026 — RETIRÉ le pré-check `permissions.query({ name: 'microphone' })`
    //    qui bloquait l'utilisateur. Bug Chromium : l'état "denied" reste cached
    //    même après que l'user ait toggle ON dans le panneau site, jusqu'au
    //    prochain reload. Résultat : la modale s'ouvrait à l'infini alors que
    //    le micro était bel et bien autorisé. On laisse `getUserMedia` être la
    //    seule source de vérité — il déclenche le prompt natif si besoin et
    //    voit l'état réel de la permission, pas une copie cachée.
    //    Sans ça, certains navigateurs (Chrome sur Windows notamment) émettent
    //    une erreur 'not-allowed' silencieuse si la permission n'a jamais été
    //    accordée, et l'utilisateur ne sait pas ce qui s'est passé.
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // On ferme le stream tout de suite, SpeechRecognition gère son propre
        // accès au micro après autorisation.
        stream.getTracks().forEach((t) => t.stop());
      } catch (err: any) {
        const name = err?.name ?? '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          // Au lieu d'un banner texte, on ouvre une modale visuelle avec
          // étapes illustrées + bouton "Recharger la page" (souvent
          // nécessaire après changement de permission Chrome).
          setShowMicHelp(true);
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setVoiceError('Aucun micro détecté sur cet appareil.');
        } else if (name === 'NotReadableError') {
          setVoiceError('Le micro est utilisé par une autre application.');
        } else {
          setVoiceError(`Erreur micro : ${name || 'inconnue'}`);
        }
        return;
      }
    }

    // 4. Lancement effectif de la reconnaissance
    try {
      const r = new SR();
      r.lang = 'fr-FR';
      r.interimResults = true; // affiche le texte au fur et à mesure
      r.continuous = false;    // s'arrête automatiquement après une pause
      r.maxAlternatives = 1;

      r.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
      };
      r.onend = () => setIsListening(false);
      r.onerror = (e: any) => {
        setIsListening(false);
        const errType = e?.error ?? 'unknown';
        // Cas 'not-allowed' / 'service-not-allowed' → modale visuelle d'aide
        if (errType === 'not-allowed' || errType === 'service-not-allowed') {
          setShowMicHelp(true);
          return;
        }
        const map: Record<string, string> = {
          'no-speech': 'Aucune voix détectée. Réessayez en parlant plus fort.',
          'audio-capture': 'Micro indisponible. Vérifiez qu\'il est branché et fonctionnel.',
          'network': 'Erreur réseau pendant la reconnaissance vocale.',
          'aborted': '', // user a stoppé manuellement, pas d'erreur
        };
        const msg = map[errType] ?? `Erreur de reconnaissance vocale : ${errType}`;
        if (msg) setVoiceError(msg);
      };
      r.onresult = (e: any) => {
        // On prend le résultat final + interim pour update live le champ
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const transcript = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalTranscript += transcript;
          else interimTranscript += transcript;
        }
        if (finalTranscript) {
          setMessage((prev) => (prev ? `${prev} ${finalTranscript}` : finalTranscript));
        }
      };

      recognitionRef.current = r;
      r.start();
    } catch (err: any) {
      setIsListening(false);
      setVoiceError(`Impossible de démarrer le micro : ${err?.message ?? 'erreur inconnue'}`);
    }
  };

  const stopVoice = () => {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setIsListening(false);
  };

  // Auto-clear de l'erreur micro après 5s
  useEffect(() => {
    if (!voiceError) return;
    const t = setTimeout(() => setVoiceError(null), 5000);
    return () => clearTimeout(t);
  }, [voiceError]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, typing]);

  // ── Actions proposées par l'IA (function-calling backend) ─────────
  // L'intention ET les paramètres sont désormais extraits CÔTÉ SERVEUR par le
  // modèle (outils OpenAI). Le front ne fait plus de pattern-matching : il
  // reçoit une action structurée { type, label, params }, l'affiche en carte de
  // confirmation, puis exécute la VRAIE création via les clients API existants.
  interface PendingAction {
    type: 'navigate' | 'create_dossier' | 'create_devis' | 'create_facture' | 'create_event' | 'create_demande' | 'info';
    label: string;
    target?: string;
    data?: any;
    params?: Record<string, unknown>;
  }

  // Mappe les lignes proposées par l'IA vers le format API (Decimal en string).
  const mapLines = (raw: unknown): QuoteLineApi[] => {
    if (!Array.isArray(raw)) return [];
    return raw.map((l: any, i: number) => ({
      description: String(l?.description ?? 'Prestation'),
      quantity: String(l?.quantity ?? '1'),
      unitPrice: String(l?.unitPrice ?? '0'),
      vatRate: l?.vatRate != null ? String(l.vatRate) : '20',
      unit: l?.unit ? String(l.unit) : null,
      position: i,
    }));
  };

  // Texte d'accompagnement si l'IA propose une action sans phrase (tool call pur).
  const defaultActionText = (a: PendingAction): string => {
    const p = (a.params ?? {}) as Record<string, any>;
    switch (a.type) {
      case 'create_dossier': {
        const who = [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || 'ce client';
        return `Je peux créer le dossier de ${who}. Confirmer ?`;
      }
      case 'create_devis':   return `Je peux créer ce devis${p.clientName ? ' pour ' + p.clientName : ''}. Confirmer ?`;
      case 'create_facture': return `Je peux créer cette facture${p.clientName ? ' pour ' + p.clientName : ''}. Confirmer ?`;
      case 'create_event':   return `Je peux ajouter ce RDV au planning${p.title ? ' (' + p.title + ')' : ''}. Confirmer ?`;
      case 'create_demande': return `Je peux envoyer cette demande${p.intervenantName ? ' à ' + p.intervenantName : ''}. Confirmer ?`;
      case 'navigate':       return `Je peux vous emmener sur ${a.label.replace('Aller sur ', '')}. Confirmer ?`;
      default:               return 'Je peux faire ça pour vous. Confirmer ?';
    }
  };

  const getResponse = (msg: string, action: PendingAction | null) => {
    const lower   = msg.toLowerCase();
    const urgents = dossiers.filter(d => d.status==='URGENT').map(d => d.name);
    const retards = invoices.filter(i => i.statut==='RETARD').map(i => i.client);
    if (action) {
      if (action.type === 'navigate') return `Je peux vous emmener sur ${action.label.replace('Aller sur ', '')}. Voulez-vous que j'y aille ?`;
      if (action.type === 'create_dossier') return "Je peux créer un nouveau dossier et vous y emmener. Voulez-vous que je le fasse ?";
    }
    if (lower.includes('urgent')||lower.includes('priorit'))
      return urgents.length>0 ? `${urgents.length} dossier(s) urgent(s) : ${urgents.join(', ')}.` : 'Aucun dossier urgent en ce moment !';
    if (lower.includes('retard')||lower.includes('impay'))
      return retards.length>0 ? `${retards.length} facture(s) en retard : ${retards.join(', ')}.` : 'Aucune facture en retard !';
    if (lower.includes('dossier'))
      return `${dossiers.length} dossiers actifs, ${dossiersSignes.length} signés. Récents : ${dossiers.slice(0,3).map(d=>d.name).join(', ')}.`;
    if (lower.includes('facture'))
      return `${invoices.length} factures dont ${invoices.filter(i=>i.statut==='EN ATTENTE').length} en attente.`;
    if (lower.includes('bonjour')||lower.includes('salut'))
      return `Bonjour ! Tout est sous contrôle. ${dossiers.length} dossiers actifs, ${urgents.length} urgents.`;
    if (lower.includes('aide')||lower.includes('help')||lower.includes('quoi'))
      return `Je peux : vous informer sur vos dossiers, alertes, factures. Vous naviguer vers n'importe quelle page. Créer des dossiers. Essayez "emmène-moi sur le planning" ou "crée un dossier".`;
    return `Je surveille vos ${dossiers.length} dossiers et ${alerts.filter(a=>!a.dismissed).length} alertes en temps réel. Posez-moi une question ou donnez-moi un ordre !`;
  };

  // Exécute RÉELLEMENT l'action confirmée via les clients API existants
  // (CSRF + auth + maj store gérés par ces clients). Retourne un texte de
  // succès + une éventuelle redirection. Throw en cas d'échec (catché par
  // handleConfirm qui affiche l'erreur).
  const executeAction = async (
    action: PendingAction,
  ): Promise<{ successText: string; navigateTo?: string }> => {
    const p = (action.params ?? {}) as Record<string, any>;
    switch (action.type) {
      case 'navigate': {
        const target = String(p.target ?? '').replace(/^\/+/, '');
        if (!target) return { successText: 'Destination inconnue.' };
        return { successText: 'Je vous y emmène…', navigateTo: `/${target}` };
      }
      case 'create_dossier': {
        const lastName = String(p.lastName ?? '').trim();
        if (!lastName) throw new Error('Nom du client manquant.');
        const id = await createProject({
          lastName,
          firstName: p.firstName ? String(p.firstName) : undefined,
          email: p.email ? String(p.email) : undefined,
          phone: p.phone ? String(p.phone) : undefined,
        });
        return { successText: `Dossier « ${lastName} » créé ✅`, navigateTo: `/dossiers/${id}` };
      }
      case 'create_devis': {
        const created = await createQuote({
          status: 'BROUILLON',
          clientName: p.clientName ? String(p.clientName) : undefined,
          objet: p.objet ? String(p.objet) : undefined,
          lines: mapLines(p.lines),
        });
        // Affichage immédiat dans le store (sans attendre le prochain resync).
        useFacturationStore.setState((s) => ({ devis: [quoteToDevis(created), ...s.devis] }));
        return { successText: `Devis ${created.reference ?? ''} créé ✅`.trim(), navigateTo: '/facturation' };
      }
      case 'create_facture': {
        const created = await createInvoice({
          type: 'STANDARD',
          clientName: p.clientName ? String(p.clientName) : undefined,
          objet: p.objet ? String(p.objet) : undefined,
          lines: mapLines(p.lines),
        });
        useFacturationStore.setState((s) => ({
          invoices: [invoiceApiToBase(created), ...s.invoices],
          invoiceDetails: { ...s.invoiceDetails, [created.id]: invoiceApiToDetail(created) },
        }));
        return { successText: `Facture ${created.reference ?? ''} créée ✅`.trim(), navigateTo: '/facturation' };
      }
      case 'create_event': {
        const title = String(p.title ?? '').trim();
        const startRaw = String(p.startAt ?? '').trim();
        const start = startRaw ? new Date(startRaw) : null;
        if (!title || !start || isNaN(start.getTime())) throw new Error('Titre ou date du RDV invalide.');
        const endRaw = p.endAt ? new Date(String(p.endAt)) : null;
        await api('/events', {
          method: 'POST',
          body: JSON.stringify({
            calendarType: 'GESTION',
            type: p.type ? String(p.type) : 'RDV_CLIENT',
            title,
            startAt: start.toISOString(),
            endAt: endRaw && !isNaN(endRaw.getTime()) ? endRaw.toISOString() : undefined,
            location: p.location ? String(p.location) : undefined,
          }),
        });
        return { successText: `RDV « ${title} » ajouté au planning ✅`, navigateTo: '/planning' };
      }
      case 'create_demande': {
        const who = String(p.intervenantName ?? '').trim().toLowerCase();
        const title = String(p.title ?? '').trim();
        if (!who || !title) throw new Error('Intervenant ou objet de la demande manquant.');
        // Résout le nom -> id (exact puis partiel). Le backend exige un id réel.
        const norm = (s?: string | null) => (s ?? '').trim().toLowerCase();
        const match = intervenants.find((iv) => norm(iv.name) === who)
          ?? intervenants.find((iv) => norm(iv.name).includes(who));
        if (!match) throw new Error(`Intervenant « ${p.intervenantName} » introuvable dans votre annuaire.`);
        await createDemande({
          intervenantId: match.id,
          type: (p.type ? String(p.type) : 'AUTRE') as any,
          title,
          notes: p.notes ? String(p.notes) : undefined,
          scheduledFor: p.scheduledFor ? new Date(String(p.scheduledFor)).toISOString() : undefined,
        });
        return { successText: `Demande « ${title} » envoyée à ${match.name} ✅` };
      }
      default:
        return { successText: 'Action non reconnue.' };
    }
  };

  const send = async () => {
    if (!message.trim()) return;
    const txt = message.trim();
    setMessages(p => [...p, { role:'user', text:txt }]);
    setMessage('');
    setTyping(true);

    try {
      // Construire les messages pour l'API
      const messagesPayload = [
        ...messages.map(m => ({
          role: m.role === 'ai' ? 'assistant' as const : 'user' as const,
          content: m.text,
        })),
        { role: 'user' as const, content: txt },
      ];

      // Appeler le endpoint chat avec SSE
      const response = await fetch('/api/ia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesPayload,
          // Volet 2 : personnalite injectee dans le system prompt cote backend.
          personnalite: iaConfig.personnalite,
          // Volet 3 : l'IA ne recoit que les categories de donnees autorisees.
          acces: {
            dossiers: iaConfig.accesDossiers,
            facturation: iaConfig.accesFacturation,
            planning: iaConfig.accesPlanning,
            stock: iaConfig.accesStock,
            stats: iaConfig.accesStats,
            intervenants: iaConfig.accesIntervenants,
          },
          // Volet 5 : actions REELLES — on n'expose au modele que les outils
          // dont le toggle est actif (Parametres → IA).
          actions: {
            dossier: iaConfig.actionCreerDossier,
            devis: iaConfig.actionCreerDevis,
            facture: iaConfig.actionCreerFacture,
            navigation: iaConfig.actionNavigation,
            // RDV + demande intervenant : actions productivité, suivent le toggle
            // "créer dossier" (pas de réglage dédié pour l'instant).
            event: iaConfig.actionCreerDossier,
            demande: iaConfig.actionCreerDossier,
          },
        }),
      });

      if (!response.body) {
        setTyping(false);
        setMessages(p => [...p, { role:'ai', text: 'Erreur: pas de réponse du serveur' }]);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';
      let firstChunk = true;
      let receivedAction: PendingAction | null = null;
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Buffering : une frame SSE peut être coupée entre deux chunks réseau.
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6);
          try {
            const data = JSON.parse(jsonStr);
            if (data.error) throw new Error(data.error);
            if (data.content) {
              aiResponse += data.content;
              if (firstChunk) {
                setTyping(false);
                setMessages(p => [...p, { role:'ai', text: data.content }]);
                firstChunk = false;
              } else {
                setMessages(p => {
                  const updated = [...p];
                  updated[updated.length - 1] = { ...updated[updated.length - 1], text: aiResponse };
                  return updated;
                });
              }
            }
            // Volet 5 : action structurée proposée par le modèle (function-call).
            if (data.action) receivedAction = data.action as PendingAction;
          } catch (e) {
            // Ligne JSON incomplète/non-JSON → on ignore ; une vraie erreur
            // serveur (data.error) est re-levée ci-dessus.
            if (e instanceof Error && e.message && !(e instanceof SyntaxError)) throw e;
          }
        }
      }

      setTyping(false);

      // Attacher l'action proposée pour afficher la carte de confirmation.
      if (receivedAction) {
        if (firstChunk) {
          // Tool call sans texte → message d'accompagnement par défaut.
          setMessages(p => [...p, { role:'ai', text: defaultActionText(receivedAction!), action: receivedAction! }]);
        } else {
          setMessages(p => {
            const updated = [...p];
            updated[updated.length - 1] = { ...updated[updated.length - 1], action: receivedAction! };
            return updated;
          });
        }
      } else if (firstChunk) {
        // Ni texte ni action (cas limite) → message neutre.
        setMessages(p => [...p, { role:'ai', text: "Je n'ai pas de réponse pour le moment." }]);
      }

      // Voix en sortie (si activée) : lit la réponse ou la proposition d'action.
      if (ttsEnabled) {
        const toSpeak = aiResponse.trim() || (receivedAction ? defaultActionText(receivedAction) : '');
        if (toSpeak) speak(toSpeak);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setTyping(false);
      // Fallback dégradé : pattern-matching local (lecture seule, aucune action).
      const fallbackResponse = getResponse(txt, null);
      setMessages(p => [...p, { role:'ai', text: fallbackResponse }]);
    }
  };

  const handleConfirm = async (action: PendingAction, confirmed: boolean) => {
    // Retire les boutons de la carte pour empêcher tout double-clic / double-
    // création. On repère le message par RÉFÉRENCE de l'objet action (et non par
    // index) : le store tronque à 100 messages, ce qui décalerait les index.
    // Ce setMessages est persisté de façon synchrone (zustand persist) AVANT
    // l'await ci-dessous → un reload en cours d'exécution ne ré-arme pas le bouton.
    setMessages(p => p.map(msg => (msg.action === action ? { ...msg, action: undefined } : msg)));

    if (!confirmed) {
      setMessages(p => [...p, { role:'ai', text:"D'accord, je ne fais rien. Autre chose ?" }]);
      return;
    }

    setMessages(p => [...p, { role:'ai', text: 'Je m’en occupe…' }]);
    try {
      const result = await executeAction(action);
      setMessages(p => [...p, { role:'ai', text: result.successText }]);
      if (result.navigateTo) {
        setTimeout(() => { window.location.href = result.navigateTo!; }, 800);
      }
    } catch (e: any) {
      setMessages(p => [...p, { role:'ai', text: `Échec : ${e?.message ?? 'erreur inconnue'}.` }]);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="ap-scroll flex-1 overflow-y-auto px-[10px] py-[14px] pb-[8px] flex flex-col gap-[10px]">
        {messages.map((m, i) => (
          <div key={i} className="ap-msg flex gap-2 items-start" style={{ flexDirection:m.role==='user'?'row-reverse':'row', animationDelay:i*0.04+'s' }}>
            <div className="w-[28px] h-[28px] rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ background:m.role==='ai'?'#3D5449':'linear-gradient(135deg,#C49A3C,#8B6914)' }}>
              {m.role==='ai' ? <Image src={owlB64} alt="AI" width={18} height={18} loading="lazy" className="w-[18px] h-[18px] object-contain"/> : <span className="text-[11px] font-bold text-white">{userInitial}</span>}
            </div>
            <div className="max-w-[190px]">
              <div className={`py-[9px] px-[12px] rounded-[16px] text-[12px] leading-[1.5] shadow-[0_2px_8px_rgba(0,0,0,0.07)]`} style={{ borderBottomLeftRadius:m.role==='ai'?4:16, borderBottomRightRadius:m.role==='user'?4:16, background:m.role==='ai'?'white':'linear-gradient(135deg,#4A6358,#334840)', color:m.role==='ai'?'#2C3529':'rgba(255,255,255,0.95)' }}>
                {renderMarkdown(m.text, m.role === 'user')}
              </div>
              {/* Boutons de confirmation si l'IA propose une action */}
              {m.role==='ai' && m.action && (
                <div className="flex gap-[6px] mt-[6px]">
                  <button onClick={() => handleConfirm(m.action!, true)} className="flex-1 py-[6px] px-[10px] bg-gradient-to-br from-[#4A6358] to-[#334840] text-white border-none rounded-[10px] text-[11px] font-bold cursor-pointer">
                    ✓ Oui
                  </button>
                  <button onClick={() => handleConfirm(m.action!, false)} className="flex-1 py-[6px] px-[10px] bg-[#f0ece6] text-[#6b6158] border border-[#D8D3CB] rounded-[10px] text-[11px] font-semibold cursor-pointer">
                    ✗ Non
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex gap-2 items-end">
            <div className="w-[28px] h-[28px] rounded-full bg-[#3D5449] flex items-center justify-center">
              <Image src={owlB64} alt="AI" width={18} height={18} loading="lazy" className="w-[18px] h-[18px] object-contain"/>
            </div>
            <div className="bg-white rounded-[16px] rounded-bl-[4px] py-[10px] px-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.07)] flex gap-1 items-center">
              <div className="ap-tdot w-[6px] h-[6px] rounded-full bg-[#4A6358]"/>
              <div className="ap-tdot w-[6px] h-[6px] rounded-full bg-[#4A6358]"/>
              <div className="ap-tdot w-[6px] h-[6px] rounded-full bg-[#4A6358]"/>
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>
      <div className="py-[8px] px-[10px] pb-[14px] flex flex-col gap-[6px] border-t border-[rgba(0,0,0,0.05)]">
        {isListening && (
          <div className="flex items-center gap-[6px] py-1 px-[10px] bg-[rgba(74,99,88,0.1)] rounded-[12px] text-[11px] text-[#4A6358] font-semibold">
            <div className="w-2 h-2 rounded-full bg-[#e53e3e]" style={{ animation:'apBlink 1s ease-in-out infinite' }}/>
            Écoute en cours…
          </div>
        )}
        {voiceError && (
          <div className="flex items-start gap-[6px] py-[6px] px-[10px] bg-[#fef2f2] border border-[#fecaca] rounded-[12px] text-[11px] text-[#b91c1c] font-medium leading-snug">
            <span className="leading-none mt-px">⚠️</span>
            <span className="flex-1">{voiceError}</span>
            <button
              type="button"
              onClick={() => setVoiceError(null)}
              className="text-[#b91c1c] hover:text-[#7f1d1d] flex-shrink-0"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          {/* Textarea auto-resize : grandit avec le contenu jusqu'à 5 lignes,
              puis scroll vertical interne. Enter envoie, Shift+Enter ajoute
              un saut de ligne (convention chat standard). */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Posez une question (Shift+Entrée = nouvelle ligne)"
            className="flex-1 min-h-[38px] max-h-[140px] bg-white border border-[rgba(0,0,0,0.09)] rounded-[20px] py-[9px] px-[14px] text-[12.5px] text-[#2C3529] outline-none shadow-[0_1px_4px_rgba(0,0,0,0.05)] resize-none leading-[1.4] focus:border-[#a67749] focus:ring-2 focus:ring-[#a67749]/20 transition-shadow ap-textarea"
            style={{ fontFamily: 'inherit' }}
          />
          <button onClick={toggleTts} title={ttsEnabled ? "Voix activée — cliquer pour couper" : "Lecture vocale des réponses"} className="w-[34px] h-[34px] rounded-full flex-shrink-0 border-none cursor-pointer flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.2)] mb-[2px]" style={{ background: ttsEnabled ? 'linear-gradient(135deg,#4A6358,#334840)' : '#e7e2da' }}>
            {ttsEnabled ? <Volume2 className="h-3.5 w-3.5 text-white"/> : <VolumeX className="h-3.5 w-3.5 text-[#6b6158]"/>}
          </button>
          <button onClick={isListening ? stopVoice : startVoice} title={isListening ? "Arrêter" : "Parler"} className={`w-[34px] h-[34px] rounded-full flex-shrink-0 border-none cursor-pointer flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.2)] mb-[2px]`} style={{ background: isListening ? 'linear-gradient(135deg,#e53e3e,#c53030)' : 'linear-gradient(135deg,#a67749,#8a5d34)' }}>
            {isListening ? <MicOff className="h-3.5 w-3.5 text-white"/> : <Mic className="h-3.5 w-3.5 text-white"/>}
          </button>
          <button onClick={send} className="w-[34px] h-[34px] rounded-full flex-shrink-0 bg-gradient-to-br from-[#4A6358] to-[#334840] border-none cursor-pointer flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.2)] mb-[2px]">
            <Send className="h-3.5 w-3.5 text-white" style={{ transform:'translateX(1px)' }}/>
          </button>
        </div>
      </div>

      {/* Modale d'aide micro — affichée auto quand permissions denied */}
      <MicPermissionHelpModal
        open={showMicHelp}
        onClose={() => setShowMicHelp(false)}
        onRetry={() => { setShowMicHelp(false); void startVoice(); }}
      />
    </div>
  );
}
