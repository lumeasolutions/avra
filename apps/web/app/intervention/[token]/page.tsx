'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

interface DemandeView {
  id: string;
  type: string;
  title: string;
  notes?: string | null;
  status: string;
  scheduledFor?: string | null;
  responseMessage?: string | null;
  proName: string;
  intervenantName: string;
  workspaceName: string;
  projectName?: string | null;
  messages?: Array<{ authorRole: string; authorName: string; body: string; createdAt: string }>;
  attachments?: Array<{ id: string; displayName: string; mimeType?: string | null; createdAt: string; uploadedByRole?: string | null }>;
}

const STATUS_LABEL: Record<string, string> = {
  ENVOYEE: 'En attente de votre réponse',
  VUE: 'Vue',
  ACCEPTEE: 'Acceptée',
  REFUSEE: 'Refusée',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
};

function fmtDate(s?: string | null): string {
  if (!s) return '';
  try { return new Date(s).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return ''; }
}

// Upload DIRECT vers Supabase (signed URL) -> contourne la limite ~4,5 Mo de
// Vercel. La limite reelle est celle du service dossier-documents (25 Mo).
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

// --- Icones SVG inline (pas de dependance webfont sur cette page publique) ---
type IcoName = 'check' | 'x' | 'download' | 'calendar' | 'clock' | 'paperclip' | 'message' | 'pdf' | 'photo' | 'file' | 'checkCircle';
function Ico({ name, size = 16, color = 'currentColor', stroke = 2 }: { name: IcoName; size?: number; color?: string; stroke?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, style: { flexShrink: 0 } };
  switch (name) {
    case 'check': return <svg {...p}><path d="M20 6 9 17l-5-5" /></svg>;
    case 'x': return <svg {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>;
    case 'download': return <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>;
    case 'calendar': return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
    case 'clock': return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case 'paperclip': return <svg {...p}><path d="M21.44 11.05 12.25 20.24a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>;
    case 'message': return <svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
    case 'pdf': return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>;
    case 'photo': return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>;
    case 'file': return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>;
    case 'checkCircle': return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="m9 12 2 2 4-4" /></svg>;
    default: return null;
  }
}

function fileKind(mime?: string | null, name?: string): IcoName {
  const m = (mime || '').toLowerCase();
  const n = (name || '').toLowerCase();
  if (m.includes('pdf') || n.endsWith('.pdf')) return 'pdf';
  if (m.startsWith('image/') || /\.(jpe?g|png|gif|webp|heic|bmp|tiff?)$/.test(n)) return 'photo';
  return 'file';
}
const FILE_BADGE: Record<IcoName, { bg: string; fg: string }> = {
  pdf: { bg: '#fbecec', fg: '#b91c1c' },
  photo: { bg: '#e8efe6', fg: '#3b6d4a' },
  file: { bg: '#f0ece2', fg: '#7c6c58' },
  check: { bg: '', fg: '' }, x: { bg: '', fg: '' }, download: { bg: '', fg: '' }, calendar: { bg: '', fg: '' },
  clock: { bg: '', fg: '' }, paperclip: { bg: '', fg: '' }, message: { bg: '', fg: '' }, checkCircle: { bg: '', fg: '' },
};

export default function InterventionPublicPage() {
  const params = useParams();
  const search = useSearchParams();
  const token = String((params as any)?.token ?? '');
  const autoDo = search?.get('do');

  const [data, setData] = useState<DemandeView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/v1/demandes/public/intervention/${encodeURIComponent(token)}`);
      if (!r.ok) throw new Error('Lien invalide ou expiré');
      setData(await r.json());
    } catch (e: any) {
      setError(e?.message || 'Lien invalide ou expiré');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const act = useCallback(async (action: 'accept' | 'refuse' | 'complete') => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch(`/api/v1/demandes/public/intervention/${encodeURIComponent(token)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, message: message.trim() || undefined }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.message || 'Action impossible');
      }
      setDone(action);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Action impossible');
    } finally {
      setBusy(false);
    }
  }, [busy, token, message, load]);

  const sendReply = useCallback(async () => {
    if (sending || uploading || !reply.trim()) return;
    setSending(true); setError(null);
    try {
      const r = await fetch(`/api/v1/demandes/public/intervention/${encodeURIComponent(token)}/message`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply.trim() }),
      });
      if (!r.ok) throw new Error('Envoi impossible');
      setReply('');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Envoi impossible');
    } finally {
      setSending(false);
    }
  }, [sending, uploading, reply, token, load]);

  const uploadFiles = useCallback(async (files: File[]) => {
    if (!files || files.length === 0) return;
    if (sending) return; // pas d'upload pendant l'envoi d'un message
    const tooBig = files.find((f) => f.size > MAX_UPLOAD_BYTES);
    if (tooBig) {
      setError(`« ${tooBig.name} » dépasse la taille maximale (25 Mo).`);
      return;
    }
    setUploading(true); setError(null);
    try {
      for (const f of files) {
        const mimeType = f.type || 'application/octet-stream';
        // 1) Demande une URL d'upload signée (Supabase) au serveur.
        const initRes = await fetch(`/api/v1/demandes/public/intervention/${encodeURIComponent(token)}/upload-url`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: f.name, fileSize: f.size, mimeType }),
        });
        if (!initRes.ok) {
          const j = await initRes.json().catch(() => ({}));
          throw new Error(j?.message || `Préparation de l'envoi de « ${f.name} » impossible`);
        }
        const init = await initRes.json();
        // 2) Envoie le fichier DIRECTEMENT vers Supabase (pas de limite Vercel).
        const put = await fetch(init.uploadUrl, {
          method: 'PUT', headers: { 'Content-Type': mimeType }, body: f,
        });
        if (!put.ok) throw new Error(`Envoi de « ${f.name} » vers le stockage échoué`);
        // 3) Finalise : crée le document dans le dossier + rattache à la demande.
        const fin = await fetch(`/api/v1/demandes/public/intervention/${encodeURIComponent(token)}/finalize-upload`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storagePath: init.storagePath, fileName: f.name, fileSize: f.size, mimeType }),
        });
        if (!fin.ok) {
          const j = await fin.json().catch(() => ({}));
          throw new Error(j?.message || `Enregistrement de « ${f.name} » impossible`);
        }
      }
      await load();
    } catch (e: any) {
      setError(e?.message || 'Envoi impossible');
    } finally {
      setUploading(false);
    }
  }, [token, load, sending]);

  useEffect(() => { load(); }, [load]);
  // Rafraîchissement périodique : voir les réponses du pro / pièces reçues par e-mail
  // sans recharger la page (symétrie avec la messagerie pro qui polle aussi).
  useEffect(() => {
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (busy || sending || uploading) return;
      load();
    }, 20000);
    return () => clearInterval(id);
  }, [load, busy, sending, uploading]);
  // Auto-action si le lien e-mail contient ?do=accept|refuse|complete
  useEffect(() => {
    if (!loading && data && autoDo && !done && !busy) {
      if (autoDo === 'accept' || autoDo === 'refuse' || autoDo === 'complete') act(autoDo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, data, autoDo]);

  const page: React.CSSProperties = { minHeight: '100vh', background: '#f0ede4', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', color: '#1a2a1e' };
  const wrap: React.CSSProperties = { maxWidth: 560, margin: '0 auto', padding: '28px 16px 40px' };
  const card: React.CSSProperties = { background: '#fff', border: '1px solid rgba(48,64,53,0.1)', borderRadius: 16, boxShadow: '0 6px 24px rgba(48,64,53,0.06)', overflow: 'hidden' };
  const brand = (
    <div style={{ textAlign: 'center', marginBottom: 16, fontWeight: 800, letterSpacing: '0.22em', color: '#a67749', fontSize: 15 }}>AVRA</div>
  );

  if (loading) return <div style={page}><div style={wrap}>{brand}<div style={{ ...card, padding: 24, color: '#5b5045' }}>Chargement…</div></div></div>;
  if (error && !data) return <div style={page}><div style={wrap}>{brand}<div style={{ ...card, padding: 24 }}><h2 style={{ marginTop: 0, fontSize: 18 }}>Lien invalide</h2><p style={{ color: '#5b5045', margin: 0 }}>{error}</p></div></div></div>;
  if (!data) return null;

  const canAcceptRefuse = data.status === 'ENVOYEE' || data.status === 'VUE';
  const canComplete = data.status === 'ACCEPTEE' || data.status === 'EN_COURS';
  const terminal = ['REFUSEE', 'TERMINEE', 'ANNULEE'].includes(data.status);

  // Sépare les pièces partagées par le professionnel (ce que l'intervenant
  // consulte) des pièces que l'intervenant a lui-même envoyées. On ne mélange
  // plus les deux : les envois de l'intervenant s'affichent sous « Joindre un document ».
  const allAttachments = data.attachments ?? [];
  const sharedAttachments = allAttachments.filter((a) => a.uploadedByRole !== 'intervenant');
  const myAttachments = allAttachments.filter((a) => a.uploadedByRole === 'intervenant');

  const renderAttachment = (att: NonNullable<DemandeView['attachments']>[number]) => {
    const kind = fileKind(att.mimeType, att.displayName);
    const badge = FILE_BADGE[kind];
    return (
      <a
        key={att.id}
        href={`/api/v1/demandes/public/intervention/${encodeURIComponent(token)}/attachments/${encodeURIComponent(att.id)}`}
        target="_blank"
        rel="noreferrer"
        style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', background: '#fff', border: '1px solid #ece7df', borderRadius: 10, textDecoration: 'none', color: '#1a2a1e' }}
      >
        <span style={{ width: 30, height: 30, borderRadius: 8, background: badge.bg, color: badge.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Ico name={kind} size={17} color={badge.fg} />
        </span>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, fontSize: 14 }}>{att.displayName}</span>
        <span style={{ color: '#a67749', flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}><Ico name="download" size={17} color="#a67749" /></span>
      </a>
    );
  };

  const btnBase: React.CSSProperties = { flex: 1, borderRadius: 11, padding: '12px 14px', fontWeight: 700, fontSize: 15, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 };
  const btnPrimary: React.CSSProperties = { ...btnBase, background: '#304035', color: '#f3ecd9', border: 'none' };
  const btnOutline: React.CSSProperties = { ...btnBase, background: '#fff', color: '#304035', border: '1px solid rgba(48,64,53,0.25)' };

  return (
    <div style={page}>
      <div style={wrap}>
        {brand}
        <div style={card}>
          {/* Bandeau vert : contexte de la demande */}
          <div style={{ background: '#304035', padding: '18px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', color: '#cbb98a', textTransform: 'uppercase' }}>{data.type}</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '5px 0 0', lineHeight: 1.25 }}>{data.title}</h1>
            <p style={{ fontSize: 13.5, color: '#d9e0d4', margin: '7px 0 0' }}>
              De <strong style={{ color: '#fff' }}>{data.proName}</strong> · {data.workspaceName}{data.projectName ? <> · dossier <strong style={{ color: '#fff' }}>{data.projectName}</strong></> : null}
            </p>
          </div>

          {/* Corps */}
          <div style={{ padding: '18px 20px 20px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, padding: '5px 12px', borderRadius: 999, background: 'rgba(166,119,73,0.12)', color: '#7c4f1d' }}>
              <Ico name="clock" size={14} /> {STATUS_LABEL[data.status] ?? data.status}
            </span>

            {data.scheduledFor && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 0', fontSize: 13.5, color: '#3b6d4a' }}>
                <Ico name="calendar" size={16} color="#3b6d4a" />
                <span><strong style={{ color: '#1a2a1e' }}>Date prévue :</strong> {fmtDate(data.scheduledFor)}</span>
              </div>
            )}

            {data.notes && (
              <div style={{ margin: '14px 0 0', whiteSpace: 'pre-wrap', background: '#f7f6f1', padding: '12px 14px', borderRadius: 10, color: '#3D3328', fontSize: 14, lineHeight: 1.55 }}>{data.notes}</div>
            )}

            {sharedAttachments.length > 0 && (
              <div style={{ margin: '18px 0 0' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#7c6c58', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 9 }}>
                  Pièces jointes · {sharedAttachments.length}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sharedAttachments.map(renderAttachment)}
                </div>
              </div>
            )}

            {data.responseMessage && (
              <p style={{ margin: '16px 0 0', color: '#5b5045', fontStyle: 'italic', fontSize: 14 }}>Votre réponse : « {data.responseMessage} »</p>
            )}

            {error && (
              <div style={{ margin: '14px 0 0', background: '#fbecec', border: '1px solid #e7c9c9', color: '#b91c1c', borderRadius: 10, padding: '10px 12px', fontSize: 13.5 }}>{error}</div>
            )}

            {terminal ? (
              <div style={{ margin: '16px 0 0', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: data.status === 'TERMINEE' ? '#3b6d4a' : '#7c6c58' }}>
                {data.status === 'TERMINEE' && <Ico name="checkCircle" size={18} color="#3b6d4a" />}
                <span>{data.status === 'TERMINEE' ? 'Marqué comme terminé. Merci !' : data.status === 'REFUSEE' ? 'Vous avez refusé cette demande.' : 'Demande annulée.'}</span>
              </div>
            ) : (
              <>
                {(canAcceptRefuse || canComplete) && (
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Message (facultatif) — précision, question…"
                    rows={2}
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(48,64,53,0.15)', borderRadius: 10, padding: '10px 12px', fontSize: 14, margin: '16px 0 11px', fontFamily: 'inherit', resize: 'vertical', background: '#fff', color: '#1a2a1e' }}
                  />
                )}
                <div style={{ display: 'flex', gap: 9 }}>
                  {canAcceptRefuse && <button style={btnPrimary} disabled={busy} onClick={() => act('accept')}><Ico name="check" size={17} color="#f3ecd9" /> Accepter</button>}
                  {canAcceptRefuse && <button style={btnOutline} disabled={busy} onClick={() => act('refuse')}><Ico name="x" size={17} color="#304035" /> Refuser</button>}
                  {canComplete && <button style={btnPrimary} disabled={busy} onClick={() => act('complete')}><Ico name="check" size={17} color="#f3ecd9" /> Marquer terminé</button>}
                </div>
              </>
            )}

            {!terminal && (
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: uploading ? 'wait' : 'pointer', marginTop: 9, background: '#fff', color: '#1a2a1e', border: '1px dashed rgba(48,64,53,0.30)', borderRadius: 11, padding: '12px', fontWeight: 600, fontSize: 14 }}>
                <Ico name="paperclip" size={17} color="#1a2a1e" />
                {uploading ? 'Envoi en cours…' : 'Joindre un document'}
                <input type="file" multiple disabled={uploading || sending} onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ''; uploadFiles(files); }} style={{ display: 'none' }} />
              </label>
            )}
            {!terminal && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#7c6c58', textAlign: 'center' }}>
                PDF, photos, plans… (max 25 Mo / fichier). Reçu directement dans le dossier.
              </p>
            )}

            {myAttachments.length > 0 && (
              <div style={{ margin: '14px 0 0' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#3b6d4a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 9, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Ico name="checkCircle" size={14} color="#3b6d4a" /> Vos documents envoyés · {myAttachments.length}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {myAttachments.map(renderAttachment)}
                </div>
              </div>
            )}

            {data.messages && data.messages.length > 0 && (
              <div style={{ marginTop: 18, borderTop: '1px solid rgba(48,64,53,0.1)', paddingTop: 15 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#7c6c58', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Échanges</div>
                {data.messages.map((m, i) => {
                  const mine = m.authorRole === 'intervenant';
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                      <div style={{ fontSize: 11, color: '#9a8c7a', marginBottom: 3 }}>{mine ? 'Vous' : m.authorName} · {fmtDate(m.createdAt)}</div>
                      <div style={{ maxWidth: '85%', fontSize: 14, color: mine ? '#fff' : '#3D3328', whiteSpace: 'pre-wrap', background: mine ? '#304035' : '#f7f6f1', borderRadius: 12, padding: '9px 12px', lineHeight: 1.5 }}>
                        {m.body.replace(/^\[IMG:[^\]]*\]/, '📎 ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!terminal && (
              <div style={{ marginTop: 16, borderTop: '1px solid rgba(48,64,53,0.1)', paddingTop: 15 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Ico name="message" size={18} color="#a67749" />
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: '#1a2a1e' }}>Écrire un message</span>
                </div>
                <p style={{ margin: '6px 0 9px', fontSize: 13, color: '#7c6c58' }}>
                  Une question, une précision, une date à proposer ? Écrivez directement au professionnel.
                </p>
                <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Votre message…" rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(48,64,53,0.18)', borderRadius: 10, padding: '11px 13px', fontSize: 15, fontFamily: 'inherit', marginBottom: 9, background: '#fff', color: '#1a2a1e', resize: 'vertical' }} />
                <button onClick={sendReply} disabled={sending || uploading || !reply.trim()}
                  style={{ width: '100%', background: '#a67749', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 18px', fontWeight: 700, fontSize: 15, cursor: (sending || uploading) ? 'wait' : 'pointer', opacity: (sending || uploading || !reply.trim()) ? 0.5 : 1 }}>
                  {sending ? 'Envoi…' : uploading ? 'Patientez…' : 'Envoyer le message'}
                </button>
              </div>
            )}
          </div>
        </div>
        <p style={{ textAlign: 'center', color: '#9a8c7a', fontSize: 12, marginTop: 16 }}>
          Aucun compte nécessaire — vous répondez directement depuis ce lien.
        </p>
      </div>
    </div>
  );
}
