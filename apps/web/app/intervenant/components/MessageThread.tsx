'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Camera, Loader2 } from 'lucide-react';
import { DemandeMessage } from '@/lib/demandes-api';

interface Props {
  messages: DemandeMessage[];
  currentUserId: string | null;
  onSend: (body: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  /** Active le bouton camera (defaut true). */
  allowPhotos?: boolean;
}

/**
 * Compresse une image (max 1280px de cote, JPEG qualite 0.75) et retourne
 * un data URL base64. Empeche les payloads >2 Mo.
 */
async function compressImage(file: File, maxSize = 1280, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas indisponible'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      URL.revokeObjectURL(url);
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image invalide'));
    };
    img.src = url;
  });
}

/**
 * Detecte si un message body contient une image embed (data URL).
 * Format : "[IMG]<dataUrl>[/IMG]<rest of message>"
 */
function parseMessageBody(body: string): { imageDataUrl?: string; text: string } {
  const match = body.match(/^\[IMG\](data:image\/[^[]+)\[\/IMG\]([\s\S]*)$/);
  if (match) {
    return { imageDataUrl: match[1], text: match[2].trim() };
  }
  return { text: body };
}

export function MessageThread({ messages, currentUserId, onSend, disabled, placeholder, allowPhotos = true }: Props) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [pendingPhotoDataUrl, setPendingPhotoDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const handlePhotoPick = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    setUploadingPhoto(true);
    try {
      const compressed = await compressImage(file);
      // Verifie que le payload reste < 2Mo en base64
      if (compressed.length > 2_000_000) {
        alert('Photo trop volumineuse meme compressee. Choisissez une autre image.');
        return;
      }
      setPendingPhotoDataUrl(compressed);
    } catch (e) {
      alert('Impossible de traiter cette image.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const send = async () => {
    const txt = body.trim();
    if ((!txt && !pendingPhotoDataUrl) || sending) return;
    setSending(true);
    try {
      const finalBody = pendingPhotoDataUrl
        ? `[IMG]${pendingPhotoDataUrl}[/IMG]${txt}`
        : txt;
      await onSend(finalBody);
      setBody('');
      setPendingPhotoDataUrl(null);
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
            const parsed = parseMessageBody(m.body);
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
                  padding: parsed.imageDataUrl ? 4 : '10px 14px',
                  background: isMe ? 'linear-gradient(135deg, #3D5449 0%, #4a6951 100%)' : '#fff',
                  color: isMe ? '#f5eee8' : '#1a2a1e',
                  borderRadius: 14,
                  borderBottomRightRadius: isMe ? 4 : 14,
                  borderBottomLeftRadius: isMe ? 14 : 4,
                  fontSize: 14,
                  lineHeight: 1.4,
                  boxShadow: '0 1px 3px rgba(26,42,30,0.07)',
                  overflow: 'hidden',
                }}>
                  {parsed.imageDataUrl && (
                    <img
                      src={parsed.imageDataUrl}
                      alt="Photo jointe"
                      onClick={() => window.open(parsed.imageDataUrl, '_blank')}
                      style={{
                        display: 'block',
                        maxWidth: 280,
                        maxHeight: 280,
                        borderRadius: 10,
                        cursor: 'zoom-in',
                        marginBottom: parsed.text ? 4 : 0,
                      }}
                    />
                  )}
                  {parsed.text && (
                    <div style={{
                      whiteSpace: 'pre-wrap',
                      padding: parsed.imageDataUrl ? '8px 10px 6px' : 0,
                    }}>
                      {parsed.text}
                    </div>
                  )}
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

      {/* Photo preview avant envoi */}
      {pendingPhotoDataUrl && !disabled && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px',
          background: '#fafaf8', border: '1px solid #ece7df', borderRadius: 10,
        }}>
          <img
            src={pendingPhotoDataUrl}
            alt="Aperçu"
            style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }}
          />
          <span style={{ flex: 1, fontSize: 12, color: '#5b5045' }}>
            Photo prête. Ajoutez un message si besoin puis envoyez.
          </span>
          <button
            onClick={() => setPendingPhotoDataUrl(null)}
            style={{
              background: 'transparent', border: 'none',
              fontSize: 12, fontWeight: 700, color: '#b91c1c',
              cursor: 'pointer',
            }}
          >
            Retirer
          </button>
        </div>
      )}

      {/* Composer */}
      {!disabled && (
        <div style={{
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
        }}>
          {allowPhotos && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto || sending}
                title="Prendre une photo"
                style={{
                  padding: '10px 12px',
                  background: pendingPhotoDataUrl ? '#15803d' : '#fafaf8',
                  color: pendingPhotoDataUrl ? '#fff' : '#3D5449',
                  border: '1px solid ' + (pendingPhotoDataUrl ? '#15803d' : '#ddd5c7'),
                  borderRadius: 12,
                  cursor: uploadingPhoto || sending ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center',
                  minHeight: 44,
                }}
              >
                {uploadingPhoto ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePhotoPick(f);
                  e.target.value = '';
                }}
              />
            </>
          )}
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
            disabled={sending || (!body.trim() && !pendingPhotoDataUrl)}
            style={{
              padding: '10px 16px',
              background: (sending || (!body.trim() && !pendingPhotoDataUrl)) ? '#9b8e7a' : '#1a2a1e',
              color: '#cbb98a',
              border: 'none',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              cursor: (sending || (!body.trim() && !pendingPhotoDataUrl)) ? 'not-allowed' : 'pointer',
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
