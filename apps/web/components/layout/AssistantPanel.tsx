'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { X, Send, AlertTriangle, XCircle, Clock, Info, ChevronDown, Mic, MicOff } from 'lucide-react';
import { useDossierStore, useFacturationStore, useUIStore } from '@/store';
import Link from 'next/link';

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
  const dossiers      = useDossierStore(s => s.dossiers);
  const dossiersSignes = useDossierStore(s => s.dossiersSignes);
  const invoices      = useFacturationStore(s => s.invoices);

  const [tab, setTab] = useState<'alerts'|'chat'>('alerts');
  const activeAlerts  = alerts.filter(a => !a.dismissed);

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

        {/* ── TABS ── */}
        <div className="flex flex-shrink-0" style={{ background: '#F5F2EE', padding: '0 12px', gap: 4 }}>
          {(['alerts','chat'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '10px 0', fontSize: 11, fontWeight: 700,
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: tab === t ? '#3D5449' : '#A8A29E',
              borderBottom: tab === t ? '2.5px solid #4A6358' : '2.5px solid transparent',
              transition: 'all 0.2s', letterSpacing: '0.04em',
            }}>
              {t === 'alerts' ? (
                <span>Alertes{activeAlerts.length > 0 &&
                  <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', background:'#C0392B', color:'white', fontSize:9, fontWeight:800, width:16, height:16, borderRadius:'50%', marginLeft:5, verticalAlign:'middle' }}>{activeAlerts.length}</span>
                }</span>
              ) : 'Chat IA'}
            </button>
          ))}
        </div>

        {/* ── VUE ALERTES ── */}
        {tab === 'alerts' && (
          <div className="flex flex-col flex-1 overflow-hidden" style={{ background: 'transparent', position: 'relative' }}>
            {/* KPIs */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, padding:'10px 12px 6px' }}>
              {[
                { val:dossiers.filter(d => d.status==='URGENT').length, label:'URGENTS', color:'#D32F2F', bg:'#FFF0F0' },
                { val:dossiersSignes.length,                             label:'SIGNÉS',  color:'#388E3C', bg:'#F0FFF2' },
                { val:invoices.filter(i => i.statut==='RETARD').length,  label:'RETARDS', color:'#E07B00', bg:'#FFF8F0' },
              ].map(({ val, label, color, bg }) => (
                <div key={label} style={{ background:'white', borderRadius:14, padding:'9px 4px', textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.07)' }}>
                  <div style={{ fontSize:22, fontWeight:800, color, lineHeight:1 }}>{val}</div>
                  <div style={{ fontSize:8, fontWeight:700, color:'#9A9590', letterSpacing:'0.05em', marginTop:2 }}>{label}</div>
                </div>
              ))}
            </div>
            {/* Liste */}
            <div className="ap-scroll flex-1 overflow-y-auto" style={{ padding:'4px 12px 8px', display:'flex', flexDirection:'column', gap:7 }}>
              {activeAlerts.length === 0 ? (
                <div style={{ textAlign:'center', padding:'24px 0', color:'#388E3C', fontWeight:600, fontSize:13 }}>
                  ✅ Tout est en ordre
                </div>
              ) : activeAlerts.map((alert, i) => (
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
              <span style={{ fontSize:11, color:'#B0AB9F', fontWeight:500 }}>{activeAlerts.length} / {alerts.length} alertes</span>
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
      </div>
    </>
  );
}

function ChatView({ owlB64 }: { owlB64: string }) {
  const dossiers       = useDossierStore(s => s.dossiers);
  const dossiersSignes = useDossierStore(s => s.dossiersSignes);
  const invoices       = useFacturationStore(s => s.invoices);
  const alerts         = useUIStore(s => s.alerts);
  const addDossier     = useDossierStore(s => s.addDossier);

  const [message,  setMessage]  = useState('');
  const [typing,   setTyping]   = useState(false);
  const [messages, setMessages] = useState<{ role:'user'|'ai'; text:string; action?: PendingAction }[]>([
    { role:'ai', text:'Bonjour ! Je surveille vos '+dossiers.length+' dossiers et '+alerts.filter(a=>!a.dismissed).length+' alerte(s) active(s). Comment puis-je vous aider ?' },
  ]);
  const endRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Vocal ──────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("La reconnaissance vocale n'est pas supportée par ce navigateur."); return; }
    const r = new SR();
    r.lang = 'fr-FR'; r.interimResults = false; r.maxAlternatives = 1;
    r.onstart = () => setIsListening(true);
    r.onend   = () => setIsListening(false);
    r.onerror = () => setIsListening(false);
    r.onresult = (e: any) => setMessage(prev => prev + (prev ? ' ' : '') + e.results[0][0].transcript);
    recognitionRef.current = r;
    r.start();
  };
  const stopVoice = () => { recognitionRef.current?.stop(); setIsListening(false); };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, typing]);

  // ── Détection d'intention ─────────────────────────────────
  interface PendingAction {
    type: 'navigate' | 'create_dossier' | 'info';
    label: string;
    target?: string;
    data?: any;
  }

  const detectAction = (msg: string): PendingAction | null => {
    const lower = msg.toLowerCase();
    // Navigation
    if ((lower.includes('aller') || lower.includes('ouvrir') || lower.includes('emmène') || lower.includes('va')) && lower.includes('planning'))
      return { type: 'navigate', label: 'Aller sur la page Planning', target: '/planning' };
    if ((lower.includes('aller') || lower.includes('ouvrir') || lower.includes('emmène') || lower.includes('va')) && (lower.includes('dossier') || lower.includes('accueil')))
      return { type: 'navigate', label: 'Aller sur la page Dossiers', target: '/dossiers' };
    if ((lower.includes('aller') || lower.includes('ouvrir') || lower.includes('emmène') || lower.includes('va')) && lower.includes('stock'))
      return { type: 'navigate', label: 'Aller sur la page Stock', target: '/stock' };
    if ((lower.includes('aller') || lower.includes('ouvrir') || lower.includes('emmène') || lower.includes('va')) && lower.includes('factur'))
      return { type: 'navigate', label: 'Aller sur la page Facturation', target: '/facturation' };
    if ((lower.includes('aller') || lower.includes('ouvrir') || lower.includes('emmène') || lower.includes('va')) && (lower.includes('stat') || lower.includes('statistique')))
      return { type: 'navigate', label: 'Aller sur les Statistiques', target: '/statistiques' };
    if ((lower.includes('aller') || lower.includes('ouvrir') || lower.includes('emmène') || lower.includes('va')) && lower.includes('ia'))
      return { type: 'navigate', label: 'Aller sur IA Photo Réalisme', target: '/ia-studio' };
    if ((lower.includes('aller') || lower.includes('ouvrir') || lower.includes('emmène') || lower.includes('va')) && lower.includes('paramètre'))
      return { type: 'navigate', label: 'Aller sur les Paramètres', target: '/parametres' };
    // Création dossier
    if ((lower.includes('créer') || lower.includes('crée') || lower.includes('nouveau') || lower.includes('ajouter')) && lower.includes('dossier'))
      return { type: 'create_dossier', label: 'Créer un nouveau dossier', target: '/dossiers/nouveau' };
    return null;
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

  const executeAction = (action: PendingAction) => {
    if (action.type === 'navigate' || action.type === 'create_dossier') {
      window.location.href = action.target!;
    }
  };

  const send = async () => {
    if (!message.trim()) return;
    const txt = message.trim();
    const action = detectAction(txt);
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
        body: JSON.stringify({ messages: messagesPayload }),
      });

      if (!response.body) {
        setTyping(false);
        setMessages(p => [...p, { role:'ai', text: 'Erreur: pas de réponse du serveur', action: action || undefined }]);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';
      let firstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const data = JSON.parse(jsonStr);
              if (data.content) {
                aiResponse += data.content;
                if (firstChunk) {
                  setTyping(false);
                  setMessages(p => [...p, { role:'ai', text: data.content, action: action || undefined }]);
                  firstChunk = false;
                } else {
                  // Mettre à jour le dernier message avec le contenu accumulé
                  setMessages(p => {
                    const updated = [...p];
                    updated[updated.length - 1].text = aiResponse;
                    return updated;
                  });
                }
              }
              if (data.done) break;
            } catch {
              // Ignorer les erreurs JSON
            }
          }
        }
      }

      setTyping(false);
    } catch (error) {
      console.error('Chat error:', error);
      setTyping(false);
      setMessages(p => [...p, { role:'ai', text: 'Erreur de communication avec l\'IA. Utilisation du mode fallback...', action: action || undefined }]);
      // Fallback au mode pattern-matching
      const fallbackResponse = getResponse(txt, action);
      setMessages(p => [...p, { role:'ai', text: fallbackResponse, action: action || undefined }]);
    }
  };

  const handleConfirm = (action: PendingAction, confirmed: boolean) => {
    if (confirmed) {
      setMessages(p => [...p, { role:'ai', text:'Parfait ! Je vous y emmène…' }]);
      setTimeout(() => executeAction(action), 600);
    } else {
      setMessages(p => [...p, { role:'ai', text:"D'accord, je ne fais rien. Autre chose ?" }]);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="ap-scroll flex-1 overflow-y-auto px-[10px] py-[14px] pb-[8px] flex flex-col gap-[10px]">
        {messages.map((m, i) => (
          <div key={i} className="ap-msg flex gap-2 items-start" style={{ flexDirection:m.role==='user'?'row-reverse':'row', animationDelay:i*0.04+'s' }}>
            <div className="w-[28px] h-[28px] rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ background:m.role==='ai'?'#3D5449':'linear-gradient(135deg,#C49A3C,#8B6914)' }}>
              {m.role==='ai' ? <Image src={owlB64} alt="AI" width={18} height={18} loading="lazy" className="w-[18px] h-[18px] object-contain"/> : <span className="text-[11px] font-bold text-white">E</span>}
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
        <div className="flex items-center gap-2">
          <input type="text" value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Posez une question ou un ordre…"
            className="flex-1 bg-white border border-[rgba(0,0,0,0.09)] rounded-[20px] py-[9px] px-[14px] text-[12px] text-[#2C3529] outline-none shadow-[0_1px_4px_rgba(0,0,0,0.05)]"/>
          <button onClick={isListening ? stopVoice : startVoice} title={isListening ? "Arrêter" : "Parler"} className={`w-[34px] h-[34px] rounded-full flex-shrink-0 border-none cursor-pointer flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.2)]`} style={{ background: isListening ? 'linear-gradient(135deg,#e53e3e,#c53030)' : 'linear-gradient(135deg,#a67749,#8a5d34)' }}>
            {isListening ? <MicOff className="h-3.5 w-3.5 text-white"/> : <Mic className="h-3.5 w-3.5 text-white"/>}
          </button>
          <button onClick={send} className="w-[34px] h-[34px] rounded-full flex-shrink-0 bg-gradient-to-br from-[#4A6358] to-[#334840] border-none cursor-pointer flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.2)]">
            <Send className="h-3.5 w-3.5 text-white" style={{ transform:'translateX(1px)' }}/>
          </button>
        </div>
      </div>
    </div>
  );
}
