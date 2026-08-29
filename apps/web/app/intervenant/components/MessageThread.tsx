'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Camera, Loader2 } from 'lucide-react';
import { DemandeMessage } from '@/lib/demandes-api';

interface Props {
  messages: DemandeMessage[];
  currentUserId: string | null;
  onSend: (body: string) => Promise<void>;
  /** Upload photo via Supabase (preferred). Si fourni, court-circuite le mode base64. */
  onSendPhoto?: (file: File, text?: string) => Promise<void>;
  /** Resout un storagePath en signed URL (pour afficher les photos uploadees). */
  resolveImageUrl?: (storagePath: string) => Promise<string>;
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
 * Detecte le format de message :
 *  - "[IMG]<dataUrl>[/IMG]<text>"     legacy base64 inline (Phase 3 v1)
 *  - "[IMG:<storagePath>]<text>"      Supabase Storage (Phase C v2)
 *  - sinon : message texte simple
 */
function parseMessageBody(body: string): { imageDataUrl?: string; imageStoragePath?: string; fileStoragePath?: string; text: string } {
  const dataUrlMatch = body.match(/^\[IMG\](data:image\/[^[]+)\[\/IMG\]([\s\S]*)$/);
  if (dataUrlMatch) {
    return { imageDataUrl: dataUrlMatch[1], text: dataUrlMatch[2].trim() };
  }
  const storageMatch = body.match(/^\[IMG:([^\]]+)\]([\s\S]*)$/);
  if (storageMatch) {
    return { imageStoragePath: storageMatch[1], text: storageMatch[2].trim() };
  }
  // [FILE:<path>] = pièce jointe non-image (PDF/devis) -> lien téléchargeable.
  const fileMatch = body.match(/^\[FILE:([^\]]+)\]([\s\S]*)$/);
  if (fileMatch) {
    return { fileStoragePath: fileMatch[1], text: fileMatch[2].trim() };
  }
  return { text: body };
}

export function MessageThread({
  messages, currentUserId, onSend, onSendPhoto, resolveImageUrl,
  disabled, placeholder, allowPhotos = true,
}: Props) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [pendingPhotoDataUrl, setPendingPhotoDataUrl] = useState<string | null>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Cache pour les signed URLs des photos storage path
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // Resolution paresseuse des storage paths -> signed URLs au render
  useEffect(() => {
    if (!resolveImageUrl) return;
    const pathsToResolve = new Set<string>();
    for (const m of messages) {
      const parsed = parseMessageBody(m.body);
      if (parsed.imageStoragePath && !signedUrls[parsed.imageStoragePath]) {
        pathsToResolve.add(parsed.imageStoragePath);
      }
      if (parsed.fileStoragePath && !signedUrls[parsed.fileStoragePath]) {
        pathsToResolve.add(parsed.fileStoragePath);
      }
    }
    if (pathsToResolve.size === 0) return;
    let cancelled = false;
    Promise.all(
      Array.from(pathsToResolve).map(p =>
        resolveImageUrl(p).then(url => ({ p, url })).catch(() => null)
      )
    ).then(results => {
      if (cancelled) return;
      const updates: Record<string, string> = {};
      for (const r of results) if (r) updates[r.p] = r.url;
      if (Object.keys(updates).length) setSignedUrls(prev => ({ ...prev, ...updates }));
    });
    return () => { cancelled = true; };
  }, [messages, resolveImageUrl, signedUrls]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const handlePhotoPick = async (file: File) => {
    if (!file) return;
    const isImg = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isImg && !isPdf) { alert('Formats acceptés : image ou PDF (devis).'); return; }
    setUploadingPhoto(true);
    try {
      // Upload Supabase (fichier brut) : requis pour le PDF (pas de compression).
      // Pour un PDF on ne genere pas d'apercu image -> apercu = puce fichier.
      if (onSendPhoto) {
        setPendingPhotoDataUrl(isImg ? URL.createObjectURL(file) : null);
        setPendingPhotoFile(file);
        return;
      }
      // Fallback legacy (sans upload Supabase) : images seulement.
      if (isPdf) { alert('L\'envoi de PDF n\'est pas disponible ici.'); return; }
      const compressed = await compressImage(file);
      if (compressed.length > 2_000_000) {
        alert('Photo trop volumineuse meme compressee. Choisissez une autre image.');
        return;
      }
      setPendingPhotoDataUrl(compressed);
      setPendingPhotoFile(null);
    } catch (e) {
      alert('Impossible de traiter cette image.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const send = async () => {
    const txt = body.trim();
    const hasPhoto = !!pendingPhotoDataUrl || !!pendingPhotoFile;
    if ((!txt && !hasPhoto) || sending) return;
    setSending(true);
    try {
      // Mode preferred : upload Supabase si onSendPhoto fourni + file dispo
      if (onSendPhoto && pendingPhotoFile) {
        await onSendPhoto(pendingPhotoFile, txt || undefined);
      } else if (pendingPhotoDataUrl) {
        // Legacy : embed base64 dans body
        const finalBody = `[IMG]${pendingPhotoDataUrl}[/IMG]${txt}`;
        await onSend(finalBody);
      } else {
        await onSend(txt);
      }
      setBody('');
      setPendingPhotoDataUrl(null);
      setPendingPhotoFile(null);
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
                  {(() => {
                    const imageUrl = parsed.imageDataUrl
                      ?? (parsed.imageStoragePath ? signedUrls[parsed.imageStoragePath] : undefined);
                    if (!imageUrl && parsed.imageStoragePath) {
                      // Resolution en cours
                      return (
                        <div style={{
                          width: 280, height: 180, borderRadius: 10,
                          background: '#f5eee8',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#7c6c58', fontSize: 11,
                          marginBottom: parsed.text ? 4 : 0,
                        }}>
                          📸 Chargement…
                        </div>
                      );
                    }
                    if (!imageUrl) return null;
                    return (
                      <img
                        src={imageUrl}
                        alt="Photo jointe"
                        onClick={() => window.open(imageUrl, '_blank')}
                        style={{
                          display: 'block',
                          maxWidth: 280,
                          maxHeight: 280,
                          borderRadius: 10,
                          cursor: 'zoom-in',
                          marginBottom: parsed.text ? 4 : 0,
                        }}
                      />
                    );
                  })()}
                  {parsed.fileStoragePath && (() => {
                    const fileUrl = signedUrls[parsed.fileStoragePath];
                    return (
                      <a
                        href={fileUrl || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => { if (!fileUrl) e.preventDefault(); }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                          padding: '9px 12px', borderRadius: 10,
                          background: '#fef2f2', border: '1px solid #fecaca',
                          color: '#b91c1c', textDecoration: 'none', fontWeight: 700, fontSize: 12.5,
                          marginBottom: parsed.text ? 6 : 0, maxWidth: 280,
                        }}
                      >
                        📄 {fileUrl ? 'Ouvrir le document (PDF)' : 'Chargement…'}
                      </a>
                    );
                  })()}
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

      {/* Aperçu de la pièce jointe avant envoi (image OU fichier PDF) */}
      {(pendingPhotoDataUrl || pendingPhotoFile) && !disabled && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px',
          background: '#fafaf8', border: '1px solid #ece7df', borderRadius: 10,
        }}>
          {pendingPhotoDataUrl ? (
            <img
              src={pendingPhotoDataUrl}
              alt="Aperçu"
              style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }}
            />
          ) : (
            <span style={{ width: 56, height: 56, borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📄</span>
          )}
          <span style={{ flex: 1, fontSize: 12, color: '#5b5045' }}>
            {pendingPhotoDataUrl ? 'Photo prête.' : `${pendingPhotoFile?.name ?? 'Document'} prêt.`} Ajoutez un message si besoin puis envoyez.
          </span>
          <button
            onClick={() => { setPendingPhotoDataUrl(null); setPendingPhotoFile(null); }}
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
                accept="image/*,application/pdf,.pdf"
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
