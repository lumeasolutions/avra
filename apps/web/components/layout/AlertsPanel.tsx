'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, AlertTriangle, XCircle, Clock, Info } from 'lucide-react';
import { useDossierStore, useFacturationStore, useUIStore } from '@/store';
import Image from 'next/image';
import Link from 'next/link';

const OWL_B64 = "/images/alerts-panel-1.png";
const TEXTURE_B64 = "/images/alerts-panel-2.jpeg";

function AlertIconComp({ severity }: { severity: string }) {
  if (severity === 'error')   return <XCircle className="h-4 w-4 text-red-500" />;
  if (severity === 'warning') return <AlertTriangle className="h-4 w-4 text-orange-500" />;
  if (severity === 'clock')   return <Clock className="h-4 w-4 text-gray-400" />;
  return <Info className="h-4 w-4 text-blue-400" />;
}

const DOT_COLOR: Record<string, string> = {
  error: '#D32F2F', warning: '#E07B00', clock: '#BDBDBD', info: '#42A5F5',
};
const ICON_BG: Record<string, string> = {
  error: '#FFF0F0', warning: '#FFF3E0', clock: '#F5F5F5', info: '#EFF6FF',
};

export function AlertsPanel() {
  const alerts        = useUIStore(s => s.alerts);
  const dismissAlert  = useUIStore(s => s.dismissAlert);
  const dossiers      = useDossierStore(s => s.dossiers);
  const dossiersSignes = useDossierStore(s => s.dossiersSignes);
  const invoices      = useFacturationStore(s => s.invoices);

  const [tab, setTab] = useState<'alerts' | 'chat'>('alerts');
  const activeAlerts  = alerts.filter(a => !a.dismissed);

  return (
    <>
      <style>{`
        @keyframes aFloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes aBlink  { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes aSlide  { from{opacity:0;transform:translateX(12px)} to{opacity:1;transform:translateX(0)} }
        @keyframes aMsgIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes aTyping { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-5px);opacity:1} }
        .a-float { animation: aFloat 3.5s ease-in-out infinite; }
        .a-blink { animation: aBlink 2s ease-in-out infinite; }
        .a-slide { animation: aSlide 0.3s ease both; }
        .a-msg   { animation: aMsgIn 0.25s ease both; }
        .a-tdot  { animation: aTyping 1.2s ease-in-out infinite; }
        .a-tdot:nth-child(2) { animation-delay:.2s }
        .a-tdot:nth-child(3) { animation-delay:.4s }
        .a-scroll::-webkit-scrollbar { width:3px }
        .a-scroll::-webkit-scrollbar-thumb { background:#C5C0B8; border-radius:3px }
        .a-card:hover { transform:translateX(3px); box-shadow:0 4px 16px rgba(0,0,0,0.1) !important; }
        .a-card { transition: transform .15s, box-shadow .15s; }
      `}</style>

      <aside className="fixed right-0 top-0 z-30 w-[290px] h-screen flex flex-col bg-[#F4F1ED] shadow-[-6px_0_40px_rgba(0,0,0,0.14)]">

        {/* ══ HEADER ══ */}
        <div className="relative h-[220px] flex-shrink-0 overflow-hidden">

          {/* SVG : texture exacte sidebar */}
          <svg viewBox="0 0 290 220" preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute top-0 left-0 w-full h-full"
          >
            <defs>
              {/* Même gradient que sidebar */}
              <linearGradient id="aGrad" x1="0" y1="0" x2="0.8" y2="1">
                <stop offset="0%"   stopColor="#567060"/>
                <stop offset="40%"  stopColor="#4A6358"/>
                <stop offset="100%" stopColor="#334840"/>
              </linearGradient>

              {/* Clip : forme courbe prononcée en bas */}
              <clipPath id="aClip">
                <path d="M 0,0 L 290,0 L 290,168 C 240,182 195,192 145,192 C 95,192 50,182 0,168 Z"/>
              </clipPath>

              {/* Grain identique sidebar */}
              <filter id="aGrain" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
                <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" result="noise"/>
                <feColorMatrix type="saturate" values="0" in="noise" result="gray"/>
                <feBlend in="SourceGraphic" in2="gray" mode="overlay" result="blended"/>
                <feComposite in="blended" in2="SourceGraphic" operator="in"/>
              </filter>

              {/* Lumière douce */}
              <radialGradient id="aSoftLight" cx="22%" cy="18%" r="65%">
                <stop offset="0%"   stopColor="rgba(255,255,255,0.13)"/>
                <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
              </radialGradient>

              {/* Ombre bas */}
              <linearGradient id="aBottomFade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="65%"  stopColor="rgba(0,0,0,0)"/>
                <stop offset="100%" stopColor="rgba(0,0,0,0.18)"/>
              </linearGradient>

              {/* Ombre interne */}
              <filter id="aInner" x="-5%" y="-5%" width="110%" height="110%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="10" result="blur"/>
                <feComposite in="blur" in2="SourceAlpha" operator="in" result="ib"/>
                <feColorMatrix type="matrix" in="ib"
                  values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0" result="cs"/>
                <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="cs"/></feMerge>
              </filter>
            </defs>

            {/* 1. Texture JPEG clipée */}
            <image href={TEXTURE_B64} x="0" y="0" width="290" height="220"
              preserveAspectRatio="xMidYMid slice" clipPath="url(#aClip)"/>

            {/* 2. Gradient vert + filtre grain overlay (0.82 opacity = dominant) */}
            <path d="M 0,0 L 290,0 L 290,168 C 240,182 195,192 145,192 C 95,192 50,182 0,168 Z"
              fill="url(#aGrad)" filter="url(#aGrain)" opacity="0.82"/>

            {/* 3. Lumière haut gauche */}
            <path d="M 0,0 L 290,0 L 290,168 C 240,182 195,192 145,192 C 95,192 50,182 0,168 Z"
              fill="url(#aSoftLight)"/>

            {/* 4. Ombre bas de forme */}
            <path d="M 0,0 L 290,0 L 290,168 C 240,182 195,192 145,192 C 95,192 50,182 0,168 Z"
              fill="url(#aBottomFade)"/>

            {/* 5. Ombre interne bords */}
            <path d="M 0,0 L 290,0 L 290,168 C 240,182 195,192 145,192 C 95,192 50,182 0,168 Z"
              fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="12" filter="url(#aInner)"/>

            {/* 6. Ombre sous la courbe */}
            <path d="M 0,168 C 50,182 95,192 145,192 C 195,192 240,182 290,168 L 290,176 C 240,190 195,200 145,200 C 95,200 50,190 0,176 Z"
              fill="rgba(0,0,0,0.09)"/>
          </svg>

          {/* Contenu header */}
          <div className="relative z-[2] flex flex-col items-center pt-[26px] gap-2">
            {/* Chouette avec cercle */}
            <div className="a-float w-[80px] h-[80px] rounded-full bg-[rgba(255,255,255,0.10)] border-2 border-[rgba(255,255,255,0.20)] flex items-center justify-center shadow-[0_6px_24px_rgba(0,0,0,0.30)]">
              <Image src={OWL_B64} alt="AVRA" width={52} height={52} loading="lazy" className="w-[52px] h-[52px] object-contain" style={{ filter:'drop-shadow(0 2px 8px rgba(0,0,0,0.35))' }}/>
            </div>

            {/* Titre */}
            <div className="text-[12px] font-bold tracking-[3px] text-[rgba(242,238,228,0.95)] text-center" style={{ textShadow:'0 1px 4px rgba(0,0,0,0.35)' }}>
              ASSISTANT AVRA
            </div>

            {/* Statut */}
            <div className="flex items-center gap-[5px] text-[10px] text-[rgba(190,225,205,0.85)] font-medium">
              <div className="a-blink w-[7px] h-[7px] rounded-full bg-[#4CAF50]" style={{ boxShadow:'0 0 7px #4CAF50' }}/>
              En ligne · IA active
            </div>
          </div>
        </div>

        {/* ══ TABS ══ */}
        <div className="flex bg-[#EBE8E3] border-b border-[rgba(0,0,0,0.07)] flex-shrink-0">
          {(['alerts','chat'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-[11px] text-[11px] font-semibold tracking-[0.5px] border-none bg-transparent cursor-pointer transition-all duration-200 ${tab === t ? 'text-[#3D5449] border-b-[2.5px] border-b-[#4A6358]' : 'text-[#9A9590] border-b-[2.5px] border-b-transparent'}`}>
              {t === 'alerts' ? (
                <span>
                  Alertes{' '}
                  {activeAlerts.length > 0 && (
                    <span className="inline-flex items-center justify-center bg-[#C0392B] text-white text-[9px] font-bold w-4 h-4 rounded-full ml-1 align-middle">
                      {activeAlerts.length}
                    </span>
                  )}
                </span>
              ) : 'Chat IA'}
            </button>
          ))}
        </div>

        {/* ══ VUE ALERTES ══ */}
        {tab === 'alerts' && (
          <div className="flex flex-col flex-1 overflow-hidden">

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-2 px-3 py-3 pb-[6px]">
              {[
                { val: dossiers.filter(d => d.status === 'URGENT').length, label:'Urgents', color:'#D32F2F' },
                { val: dossiersSignes.length,                               label:'Signés',  color:'#388E3C' },
                { val: invoices.filter(i => i.statut === 'RETARD').length,  label:'Retards', color:'#E07B00' },
              ].map(({ val, label, color }) => (
                <div key={label} className="bg-white rounded-[12px] py-2 px-1 text-center shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                  <div className="text-[22px] font-bold" style={{ color }}>{val}</div>
                  <div className="text-[9px] font-semibold text-[#9A9590] uppercase tracking-[0.5px]">{label}</div>
                </div>
              ))}
            </div>

            {/* Alertes */}
            <div className="a-scroll flex-1 overflow-y-auto px-[10px] py-1 pb-2 flex flex-col gap-[7px]">
              {activeAlerts.length === 0 ? (
                <div className="text-center py-7 text-[#388E3C] font-semibold text-[13px]">
                  ✅ Tout est en ordre
                </div>
              ) : activeAlerts.map((alert, i) => (
                <div key={alert.id} className="a-slide a-card bg-white rounded-[14px] py-[10px] px-[11px] flex items-center gap-[9px] shadow-[0_2px_10px_rgba(0,0,0,0.055)]" style={{ animationDelay: i * 0.05 + 's' }}>
                  <div className="w-[32px] h-[32px] rounded-[10px] flex-shrink-0 flex items-center justify-center" style={{ background: ICON_BG[alert.severity] ?? '#F5F5F5' }}>
                    <AlertIconComp severity={alert.severity}/>
                  </div>
                  <div className="flex-1 text-[11.5px] text-[#2C3529] font-medium leading-[1.4]">
                    {alert.text}
                    {alert.dossierId && (
                      <div>
                        <Link href={'/dossiers/' + alert.dossierId}
                          className="text-[10px] text-[#C49A3C] no-underline">
                          Voir →
                        </Link>
                      </div>
                    )}
                  </div>
                  <div className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: DOT_COLOR[alert.severity] ?? '#BDBDBD' }}/>
                  <button onClick={() => dismissAlert(alert.id)} className="border-none bg-transparent cursor-pointer text-[#C0BAB2] p-[2px] flex items-center">
                    <X className="h-3.5 w-3.5"/>
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="py-2 px-3 pb-3 flex items-center justify-between border-t border-[rgba(0,0,0,0.05)]">
              <span className="text-[11px] text-[#B0AB9F] font-medium">
                {activeAlerts.length} / {alerts.length} alertes
              </span>
              <div className="flex gap-[5px]">
                {['‹','›'].map(btn => (
                  <button key={btn} className="w-[26px] h-[26px] rounded-full border border-[#D8D3CB] bg-white text-[14px] text-[#4A6358] cursor-pointer flex items-center justify-center">{btn}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ VUE CHAT ══ */}
        {tab === 'chat' && <ChatView owlB64={OWL_B64}/>}

      </aside>
    </>
  );
}

function ChatView({ owlB64 }: { owlB64: string }) {
  const dossiers       = useDossierStore(s => s.dossiers);
  const dossiersSignes = useDossierStore(s => s.dossiersSignes);
  const invoices       = useFacturationStore(s => s.invoices);
  const alerts         = useUIStore(s => s.alerts);

  const [message,  setMessage]  = useState('');
  const [typing,   setTyping]   = useState(false);
  const [messages, setMessages] = useState<{ role:'user'|'ai'; text:string }[]>([
    { role:'ai', text:'Bonjour ! Je surveille vos ' + dossiers.length + ' dossiers et ' + alerts.filter(a => !a.dismissed).length + ' alerte(s) active(s). Comment puis-je vous aider ?' },
  ]);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, typing]);

  const getResponse = (msg: string) => {
    const lower   = msg.toLowerCase();
    const urgents = dossiers.filter(d => d.status === 'URGENT').map(d => d.name);
    const retards = invoices.filter(i => i.statut === 'RETARD').map(i => i.client);
    if (lower.includes('urgent') || lower.includes('priorit'))
      return urgents.length > 0 ? urgents.length + ' dossier(s) urgent(s) : ' + urgents.join(', ') + '.' : 'Aucun dossier urgent !';
    if (lower.includes('retard') || lower.includes('impay'))
      return retards.length > 0 ? retards.length + ' facture(s) en retard : ' + retards.join(', ') + '.' : 'Aucune facture en retard !';
    if (lower.includes('dossier'))
      return dossiers.length + ' dossiers actifs, ' + dossiersSignes.length + ' signés. Récents : ' + dossiers.slice(0,3).map(d => d.name).join(', ') + '.';
    if (lower.includes('facture'))
      return invoices.length + ' factures dont ' + invoices.filter(i => i.statut === 'EN ATTENTE').length + ' en attente.';
    return 'Je surveille vos ' + dossiers.length + ' dossiers et ' + alerts.filter(a => !a.dismissed).length + ' alertes en temps réel.';
  };

  const send = () => {
    if (!message.trim()) return;
    const txt = message.trim();
    setMessages(p => [...p, { role:'user', text:txt }]);
    setMessage('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages(p => [...p, { role:'ai', text:getResponse(txt) }]);
    }, 900);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="a-scroll a-msg flex-1 overflow-y-auto px-[10px] py-[14px] pb-2 flex flex-col gap-[10px]">
        {messages.map((m, i) => (
          <div key={i} className="a-msg flex gap-2 items-start" style={{ flexDirection: m.role === 'user' ? 'row-reverse' : 'row', animationDelay: i * 0.04 + 's' }}>
            <div className="w-[28px] h-[28px] rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ background: m.role === 'ai' ? '#3D5449' : 'linear-gradient(135deg,#C49A3C,#8B6914)' }}>
              {m.role === 'ai'
                ? <Image src={owlB64} alt="AI" width={18} height={18} loading="lazy" className="w-[18px] h-[18px] object-contain"/>
                : <span className="text-[11px] font-bold text-white">E</span>
              }
            </div>
            <div className="max-w-[186px]">
              <div className="py-[9px] px-[12px] rounded-[16px] text-[12px] leading-[1.5] shadow-[0_2px_8px_rgba(0,0,0,0.07)]" style={{
                borderBottomLeftRadius:  m.role === 'ai'   ? 4 : 16,
                borderBottomRightRadius: m.role === 'user' ? 4 : 16,
                background: m.role === 'ai'
                  ? 'white'
                  : 'linear-gradient(135deg,#4A6358,#334840)',
                color: m.role === 'ai' ? '#2C3529' : 'rgba(255,255,255,0.95)',
              }}>{m.text}</div>
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex gap-2 items-end">
            <div className="w-[28px] h-[28px] rounded-full bg-[#3D5449] flex items-center justify-center">
              <Image src={owlB64} alt="AI" width={18} height={18} loading="lazy" className="w-[18px] h-[18px] object-contain"/>
            </div>
            <div className="bg-white rounded-[16px] rounded-bl-[4px] py-[10px] px-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.07)] flex gap-1 items-center">
              <div className="a-tdot w-[6px] h-[6px] rounded-full bg-[#4A6358]"/>
              <div className="a-tdot w-[6px] h-[6px] rounded-full bg-[#4A6358]"/>
              <div className="a-tdot w-[6px] h-[6px] rounded-full bg-[#4A6358]"/>
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>

      <div className="py-2 px-[10px] pb-[14px] flex items-center gap-2 border-t border-[rgba(0,0,0,0.05)]">
        <input
          type="text" value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Posez votre question…"
          className="flex-1 bg-white border border-[rgba(0,0,0,0.09)] rounded-[20px] py-[9px] px-[14px] text-[12px] text-[#2C3529] outline-none shadow-[0_1px_4px_rgba(0,0,0,0.05)]"
        />
        <button onClick={send} className="w-[34px] h-[34px] rounded-full flex-shrink-0 bg-gradient-to-br from-[#4A6358] to-[#334840] border-none cursor-pointer flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.2)]">
          <Send className="h-3.5 w-3.5 text-white" style={{ transform:'translateX(1px)' }}/>
        </button>
      </div>
    </div>
  );
}
