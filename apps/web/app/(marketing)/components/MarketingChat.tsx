'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  typing?: boolean;
}

const SUGGESTIONS = [
  "C'est quoi AVRA ?",
  "Combien ça coûte ?",
  "Je suis cuisiniste, ça m'aide ?",
  "Comment fonctionne l'essai ?",
];

export function MarketingChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Bonjour ! Je suis Aria, votre guide AVRA 🦉\nComment puis-je vous aider aujourd'hui ?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pulsing, setPulsing] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Arrêter le pulse après 6 secondes
    const t = setTimeout(() => setPulsing(false), 6000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [messages, open]);

  const send = async (text?: string) => {
    const txt = (text ?? input).trim();
    if (!txt || loading) return;
    setInput('');
    setPulsing(false);

    const userMsg: Message = { role: 'user', content: txt };
    const history = [...messages, userMsg];
    setMessages([...history, { role: 'assistant', content: '', typing: true }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat-marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.body) throw new Error('no body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.content) {
              full += parsed.content;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: 'assistant', content: full, typing: false };
                return next;
              });
            }
            if (parsed.done) break;
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'assistant',
          content: "Désolée, une erreur s'est produite. Réessayez ou visitez avra.fr !",
          typing: false,
        };
        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  const showSuggestions = messages.length === 1;

  return (
    <>
      <style>{`
        @keyframes mcBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes mcPulseRing { 0%{transform:scale(1);opacity:0.8} 100%{transform:scale(1.5);opacity:0} }
        @keyframes mcOpen { from{opacity:0;transform:translateY(16px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes mcMsgIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes mcDot { 0%,60%,100%{transform:translateY(0);opacity:0.4} 30%{transform:translateY(-5px);opacity:1} }
        .mc-open { animation: mcOpen 0.25s ease both; }
        .mc-msg { animation: mcMsgIn 0.2s ease both; }
        .mc-dot { animation: mcDot 1.2s ease-in-out infinite; }
        .mc-dot:nth-child(2) { animation-delay: 0.2s; }
        .mc-dot:nth-child(3) { animation-delay: 0.4s; }
        .mc-scroll::-webkit-scrollbar { width: 3px; }
        .mc-scroll::-webkit-scrollbar-thumb { background: rgba(61,84,73,0.2); border-radius: 10px; }
        .mc-btn:hover { transform: scale(1.05); }
        .mc-suggestion:hover { background: #f0f5f2 !important; border-color: #3D5449 !important; color: #3D5449 !important; }
      `}</style>

      {/* Panel chat */}
      {open && (
        <div className="mc-open" style={{
          position: 'fixed', bottom: 90, right: 24, zIndex: 9999,
          width: 340, maxHeight: 520,
          background: 'white',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 20px rgba(61,84,73,0.12)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(61,84,73,0.12)',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #2C3E2F 0%, #3D5449 100%)',
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: '#0a110c',
              border: '2px solid rgba(201,169,110,0.6)',
              overflow: 'hidden', flexShrink: 0, position: 'relative',
              boxShadow: '0 0 12px rgba(201,169,110,0.3)',
            }}>
              <Image src="/nouveaulogochouette.png" alt="Aria" fill style={{ objectFit: 'contain', padding: 2, filter: 'brightness(1.2) saturate(1.3)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Aria — Assistante AVRA</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                En ligne
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
              width: 28, height: 28, cursor: 'pointer', color: 'white', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>×</button>
          </div>

          {/* Messages */}
          <div className="mc-scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((msg, i) => (
              <div key={i} className="mc-msg" style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-end', gap: 6,
              }}>
                {msg.role === 'assistant' && (
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: '#0a110c', border: '1.5px solid rgba(201,169,110,0.5)',
                    overflow: 'hidden', position: 'relative',
                  }}>
                    <Image src="/nouveaulogochouette.png" alt="" fill style={{ objectFit: 'contain', padding: 2, filter: 'brightness(1.15) saturate(1.3)' }} />
                  </div>
                )}
                <div style={{
                  maxWidth: '82%',
                  padding: '9px 12px',
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #3D5449, #2C3E2F)'
                    : '#F4F6F4',
                  color: msg.role === 'user' ? 'white' : '#1e2b22',
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.typing ? (
                    <span style={{ display: 'flex', gap: 3, alignItems: 'center', padding: '2px 0' }}>
                      {[0,1,2].map(j => <span key={j} className="mc-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#3D5449', display: 'inline-block' }} />)}
                    </span>
                  ) : msg.content}
                </div>
              </div>
            ))}

            {/* Suggestions */}
            {showSuggestions && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} className="mc-suggestion" onClick={() => send(s)} style={{
                    fontSize: 11, padding: '5px 10px', borderRadius: 20,
                    border: '1px solid #D8E0DC', background: 'white',
                    color: '#4A6358', cursor: 'pointer', transition: 'all 0.15s',
                  }}>{s}</button>
                ))}
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* CTA liens */}
          <div style={{ padding: '6px 14px', display: 'flex', gap: 6 }}>
            <Link href="/tarifs" style={{
              flex: 1, textAlign: 'center', fontSize: 10.5, fontWeight: 600,
              padding: '6px 8px', borderRadius: 8,
              border: '1px solid #3D5449', color: '#3D5449',
              textDecoration: 'none', transition: 'all 0.15s',
            }}>Voir les tarifs</Link>
            <Link href="/demo" style={{
              flex: 1, textAlign: 'center', fontSize: 10.5, fontWeight: 700,
              padding: '6px 8px', borderRadius: 8,
              background: 'linear-gradient(135deg, #3D5449, #2C3E2F)', color: 'white',
              textDecoration: 'none',
            }}>Voir une démo →</Link>
          </div>

          {/* Input */}
          <div style={{
            padding: '8px 12px 12px',
            borderTop: '1px solid #EFF2F0',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Posez votre question…"
              disabled={loading}
              style={{
                flex: 1, border: '1px solid #D8E0DC', borderRadius: 10,
                padding: '8px 12px', fontSize: 12.5, outline: 'none',
                background: loading ? '#f8faf8' : 'white', color: '#1e2b22',
                fontFamily: 'inherit',
              }}
            />
            <button onClick={() => send()} disabled={!input.trim() || loading} style={{
              width: 34, height: 34, borderRadius: '50%', border: 'none',
              background: input.trim() && !loading ? 'linear-gradient(135deg, #3D5449, #2C3E2F)' : '#D8E0DC',
              color: 'white', cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, transition: 'background 0.2s', flexShrink: 0,
            }}>↑</button>
          </div>
        </div>
      )}

      {/* Bouton flottant */}
      <button
        className="mc-btn"
        onClick={() => { setOpen(o => !o); setPulsing(false); }}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9998,
          width: 56, height: 56, borderRadius: '50%', border: 'none',
          background: 'linear-gradient(135deg, #3D5449 0%, #2C3E2F 100%)',
          boxShadow: '0 8px 24px rgba(61,84,73,0.4), 0 2px 8px rgba(0,0,0,0.2)',
          cursor: 'pointer', overflow: 'hidden',
          transition: 'transform 0.2s',
          padding: 0,
        }}
      >
        {/* Ring pulse si non ouvert et encore en pulse */}
        {pulsing && !open && (
          <span style={{
            position: 'absolute', inset: -6, borderRadius: '50%',
            border: '2px solid rgba(61,84,73,0.5)',
            animation: 'mcPulseRing 1.5s ease-out infinite',
            pointerEvents: 'none',
          }} />
        )}
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <Image
            src="/nouveaulogochouette.png"
            alt="Chat AVRA"
            fill
            style={{ objectFit: 'contain', padding: 8, filter: 'brightness(1.3) saturate(1.3)', animation: open ? 'none' : 'mcBounce 3s ease-in-out infinite' }}
          />
        </div>
        {!open && (
          <span style={{
            position: 'absolute', top: 6, right: 6, width: 10, height: 10,
            borderRadius: '50%', background: '#4ade80',
            border: '2px solid #2C3E2F',
          }} />
        )}
      </button>
    </>
  );
}
