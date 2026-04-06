'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, Send, AlertTriangle, XCircle, Clock, Info, ChevronDown, Mic, MicOff } from 'lucide-react';
import { useDossierStore, useFacturationStore, useUIStore } from '@/store';
import Link from 'next/link';

const OWL_B64 = "/images/assistant-panel-1.png";
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

  // ── Vocal ──────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('La reconnaissance vocale n\'est pas supportée par ce navigateur.'); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend   = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setMessage(prev => prev + (prev ? ' ' : '') + transcript);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopVoice = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes apFloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes apBlink  { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes apSlide  { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:translateX(0)} }
        @keyframes apMsgIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes apOpen   { from{opacity:0;transform:translateY(20px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
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
      <div className={permanent ? "relative w-full h-screen z-40 overflow-hidden bg-[#F4F1ED] shadow-[-4px_0_24px_rgba(0,0,0,0.10)] flex flex-col" : "fixed bottom-6 right-6 w-[300px] max-h-[580px] z-40 rounded-[28px] overflow-hidden bg-[#F4F1ED] shadow-[0_24px_72px_rgba(0,0,0,0.22),0_8px_24px_rgba(0,0,0,0.14),0_0_0_1px_rgba(255,255,255,0.45)_inset] flex flex-col animate-[apOpen_0.25s_cubic-bezier(0.34,1.56,0.64,1)_both]"}>

        {/* ── HEADER SVG ── */}
        <div className="relative h-[200px] flex-shrink-0 overflow-hidden">
          <svg viewBox="0 0 300 210" preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute top-0 left-0 w-full h-full"
          >
            <defs>
              <linearGradient id="apGrad" x1="0" y1="0" x2="0.8" y2="1">
                <stop offset="0%"  stopColor="#567060"/>
                <stop offset="40%" stopColor="#4A6358"/>
                <stop offset="100%" stopColor="#334840"/>
              </linearGradient>
              <clipPath id="apClip">
                <path d="M 0,0 L 300,0 L 300,160 C 250,175 200,185 150,185 C 100,185 50,175 0,160 Z"/>
              </clipPath>
              <filter id="apGrain" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
                <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" result="noise"/>
                <feColorMatrix type="saturate" values="0" in="noise" result="gray"/>
                <feBlend in="SourceGraphic" in2="gray" mode="overlay" result="blended"/>
                <feComposite in="blended" in2="SourceGraphic" operator="in"/>
              </filter>
              <radialGradient id="apSoftLight" cx="22%" cy="18%" r="65%">
                <stop offset="0%"   stopColor="rgba(255,255,255,0.13)"/>
                <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
              </radialGradient>
              <linearGradient id="apBottomFade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="65%"  stopColor="rgba(0,0,0,0)"/>
                <stop offset="100%" stopColor="rgba(0,0,0,0.18)"/>
              </linearGradient>
            </defs>
            {/* 1. Texture JPEG */}
            <image href={TEXTURE_B64} x="0" y="0" width="300" height="210"
              preserveAspectRatio="xMidYMid slice" clipPath="url(#apClip)"/>
            {/* 2. Gradient vert + grain */}
            <path d="M 0,0 L 300,0 L 300,160 C 250,175 200,185 150,185 C 100,185 50,175 0,160 Z"
              fill="url(#apGrad)" filter="url(#apGrain)" opacity="0.82"/>
            {/* 3. Lumière */}
            <path d="M 0,0 L 300,0 L 300,160 C 250,175 200,185 150,185 C 100,185 50,175 0,160 Z"
              fill="url(#apSoftLight)"/>
            {/* 4. Ombre bas */}
            <path d="M 0,0 L 300,0 L 300,160 C 250,175 200,185 150,185 C 100,185 50,175 0,160 Z"
              fill="url(#apBottomFade)"/>
            {/* 5. Ombre sous courbe */}
            <path d="M 0,160 C 50,175 100,185 150,185 C 200,185 250,175 300,160 L 300,168 C 250,183 200,193 150,193 C 100,193 50,183 0,168 Z"
              fill="rgba(0,0,0,0.08)"/>
          </svg>

          {/* Bouton fermer — masqué en mode permanent */}
          {!permanent && <button onClick={onClose} className="absolute top-3 right-3 z-[3] w-7 h-7 rounded-full bg-[rgba(0,0,0,0.20)] border-none cursor-pointer flex items-center justify-center text-[rgba(255,255,255,0.8)]">
            <ChevronDown className="h-4 w-4"/>
          </button>}

          {/* Contenu header */}
          <div className="relative z-[2] flex flex-col items-center pt-6 gap-2">
            <div className="ap-float w-[76px] h-[76px] rounded-full bg-[rgba(255,255,255,0.10)] border-2 border-[rgba(255,255,255,0.20)] flex items-center justify-center shadow-[0_6px_24px_rgba(0,0,0,0.30)]">
              <Image src={OWL_B64} alt="AVRA" width={50} height={50} loading="lazy" className="w-[50px] h-[50px] object-contain" style={{ filter:'drop-shadow(0 2px 8px rgba(0,0,0,0.35))' }}/>
            </div>
            <div className="text-[11px] font-bold tracking-[3px] text-[rgba(242,238,228,0.95)] text-center" style={{ textShadow:'0 1px 4px rgba(0,0,0,0.35)' }}>
              ASSISTANT AVRA
            </div>
            <div className="flex items-center gap-[5px] text-[10px] text-[rgba(190,225,205,0.85)] font-medium">
              <div className="ap-blink w-[7px] h-[7px] rounded-full bg-[#4CAF50]" style={{ boxShadow:'0 0 7px #4CAF50' }}/>
              En ligne · IA active
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex bg-[#EBE8E3] border-b border-[rgba(0,0,0,0.07)] flex-shrink-0">
          {(['alerts','chat'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-[11px] text-[11px] font-semibold tracking-[0.5px] border-none bg-transparent cursor-pointer transition-all duration-200 ${tab === t ? 'text-[#3D5449] border-b-[2.5px] border-b-[#4A6358]' : 'text-[#9A9590] border-b-[2.5px] border-b-transparent'}`}>
              {t === 'alerts' ? (
                <span>Alertes{activeAlerts.length > 0 &&
                  <span className="inline-flex items-center justify-center bg-[#C0392B] text-white text-[9px] font-bold w-4 h-4 rounded-full ml-1 align-middle">{activeAlerts.length}</span>
                }</span>
              ) : 'Chat IA'}
            </button>
          ))}
        </div>

        {/* ── VUE ALERTES ── */}
        {tab === 'alerts' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-[7px] px-[11px] py-[11px] pb-[6px]">
              {[
                { val:dossiers.filter(d => d.status==='URGENT').length, label:'Urgents', color:'#D32F2F' },
                { val:dossiersSignes.length,                             label:'Signés',  color:'#388E3C' },
                { val:invoices.filter(i => i.statut==='RETARD').length,  label:'Retards', color:'#E07B00' },
              ].map(({ val, label, color }) => (
                <div key={label} className="bg-white rounded-[12px] p-[8px_4px] text-center shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                  <div className="text-[22px] font-bold" style={{ color }}>{val}</div>
                  <div className="text-[9px] font-semibold text-[#9A9590] uppercase tracking-[0.5px]">{label}</div>
                </div>
              ))}
            </div>
            {/* Liste */}
            <div className="ap-scroll flex-1 overflow-y-auto px-[10px] py-[4px] pb-[8px] flex flex-col gap-[7px]">
              {activeAlerts.length === 0 ? (
                <div className="text-center py-6 text-[#388E3C] font-semibold text-[13px]">
                  ✅ Tout est en ordre
                </div>
              ) : activeAlerts.map((alert, i) => (
                <div key={alert.id} className="ap-slide ap-card bg-white rounded-[14px] py-[10px] px-[11px] flex items-center gap-[9px] shadow-[0_2px_10px_rgba(0,0,0,0.055)]" style={{ animationDelay: i * 0.05 + 's' }}>
                  <div className="w-[32px] h-[32px] rounded-[10px] flex-shrink-0 flex items-center justify-center" style={{ background: ICON_BG[alert.severity] ?? '#F5F5F5' }}>
                    <AlertIconComp severity={alert.severity}/>
                  </div>
                  <div className="flex-1 text-[11.5px] text-[#2C3529] font-medium leading-[1.4]">
                    {alert.text}
                    {alert.dossierId && (
                      <div><Link href={'/dossiers/'+alert.dossierId} className="text-[10px] text-[#C49A3C] no-underline">Voir →</Link></div>
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
            <div className="py-[7px] px-[11px] pb-[11px] flex items-center justify-between border-t border-[rgba(0,0,0,0.05)]">
              <span className="text-[11px] text-[#B0AB9F] font-medium">{activeAlerts.length} / {alerts.length} alertes</span>
              <div className="flex gap-[5px]">
                {['‹','›'].map(btn => (
                  <button key={btn} className="w-[26px] h-[26px] rounded-full border border-[#D8D3CB] bg-white text-[14px] text-[#4A6358] cursor-pointer flex items-center justify-center">{btn}</button>
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
              <div className={`py-[9px] px-[12px] rounded-[16px] text-[12px] leading-[1.5] shadow-[0_2px_8px_rgba(0,0,0,0.07)]`} style={{ borderBottomLeftRadius:m.role==='ai'?4:16, borderBottomRightRadius:m.role==='user'?4:16, background:m.role==='ai'?'white':'linear-gradient(135deg,#4A6358,#334840)', color:m.role==='ai'?'#2C3529':'rgba(255,255,255,0.95)' }}>{m.text}</div>
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
