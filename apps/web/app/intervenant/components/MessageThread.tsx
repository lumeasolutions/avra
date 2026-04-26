'use client';

import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { DemandeMessage } from '@/lib/demandes-api';

interface Props {
  messages: DemandeMessage[];
  currentUserId: string | null;
  onSend: (body: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageThread({ messages, currentUserId, onSend, disabled, placeholder }: Props) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const send = async () => {
    const txt = body.trim();
    if (!txt || sending) return;
    setSending(true);
    try {
      await onSend(txt);
      setBody('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Liste des messages */}
      <div style={{
        background: '#fafaf8',
        borderRadius: 14,
        padding: 14,
        maxHeight: 420,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        border: '1px solid #ece7df',
      }}>
        {messages.length === 0 ? (
          <div style={{
            padding: 40, textAlign: 'center',
            color: '#7c6c58', fontSize: 13,
          }}>
            Aucun message dans ce fil. Commencez la conversation.
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.authorId === currentUserId;
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{
                  maxWidth: '78%',
                  padding: '10px 14px',
                  background: isMe ? 'linear-gradient(135deg, #3D5449 0%, #4a6951 100%)' : '#fff',
                  color: isMe ? '#f5eee8' : '#1a2a1e',
                  borderRadius: 14,
                  borderBottomRightRadius: isMe ? 4 : 14,
                  borderBottomLeftRadius: isMe ? 14 : 4,
                  fontSize: 14,
                  lineHeight: 1.4,
                  whiteSpace: 'pre-wrap',
                  boxShadow: '0 1px 3px rgba(26,42,30,0.07)',
                }}>
                  {m.body}
                </div>
                <div style={{
                  fontSize: 10,
                  color: '#7c6c58',
                  marginTop: 3,
                  padding: '0 6px',
                }}>
                  {isMe ? 'Vous' : m.authorName} · {new Date(m.createdAt).toLocaleString('fr-FR', {
                    day: '2-digit', month: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      {!disabled && (
        <div style={{
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
        }}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={placeholder ?? 'Écrire un message…  (Ctrl+Entrée pour envoyer)'}
            rows={2}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: '1px solid #ddd5c7',
              borderRadius: 12,
              fontSize: 14,
              fontFamily: 'inherit',
              resize: 'vertical',
              background: '#fff',
              outline: 'none',
            }}
          />
          <button
            onClick={send}
            disabled={sending || !body.trim()}
            style={{
              padding: '10px 16px',
              background: sending || !body.trim() ? '#9b8e7a' : '#1a2a1e',
              color: '#cbb98a',
              border: 'none',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              cursor: sending || !body.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              minHeight: 44,
            }}
          >
            <Send size={15} />
            {sending ? '…' : 'Envoyer'}
          </button>
        </div>
      )}
    </div>
  );
}
