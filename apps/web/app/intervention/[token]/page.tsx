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
    if (sending || !reply.trim()) return;
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
  }, [sending, reply, token, load]);

  useEffect(() => { load(); }, [load]);
  // Auto-action si le lien e-mail contient ?do=accept|refuse|complete
  useEffect(() => {
    if (!loading && data && autoDo && !done && !busy) {
      if (autoDo === 'accept' || autoDo === 'refuse' || autoDo === 'complete') act(autoDo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, data, autoDo]);

  const wrap: React.CSSProperties = { maxWidth: 560, margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', color: '#1a2a1e' };
  const card: React.CSSProperties = { background: '#fff', border: '1px solid rgba(48,64,53,0.1)', borderRadius: 16, padding: 24, boxShadow: '0 6px 24px rgba(48,64,53,0.06)' };

  if (loading) return <div style={wrap}><div style={card}>Chargement…</div></div>;
  if (error && !data) return <div style={wrap}><div style={card}><h2 style={{ marginTop: 0 }}>Lien invalide</h2><p style={{ color: '#5b5045' }}>{error}</p></div></div>;
  if (!data) return null;

  const canAcceptRefuse = data.status === 'ENVOYEE' || data.status === 'VUE';
  const canComplete = data.status === 'ACCEPTEE' || data.status === 'EN_COURS';
  const terminal = ['REFUSEE', 'TERMINEE', 'ANNULEE'].includes(data.status);

  const btn = (bg: string): React.CSSProperties => ({ flex: 1, minWidth: 120, background: bg, color: '#fff', border: 'none', borderRadius: 12, padding: '13px 16px', fontWeight: 700, fontSize: 15, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 });

  return (
    <div style={wrap}>
      <div style={{ textAlign: 'center', marginBottom: 18, fontWeight: 800, letterSpacing: '0.15em', color: '#a67749' }}>AVRA</div>
      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#7c6c58', textTransform: 'uppercase' }}>{data.type}</div>
        <h1 style={{ fontSize: 22, margin: '6px 0 4px' }}>{data.title}</h1>
        <p style={{ color: '#5b5045', margin: '0 0 14px' }}>
          De <strong>{data.proName}</strong> ({data.workspaceName}){data.projectName ? <> · dossier <strong>{data.projectName}</strong></> : null}
        </p>

        <div style={{ display: 'inline-block', fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: 'rgba(166,119,73,0.12)', color: '#7c4f1d', marginBottom: 14 }}>
          {STATUS_LABEL[data.status] ?? data.status}
        </div>

        {data.scheduledFor && (
          <p style={{ margin: '0 0 12px', color: '#7c4f1d' }}><strong>Date prévue :</strong> {fmtDate(data.scheduledFor)}</p>
        )}
        {data.notes && (
          <p style={{ margin: '0 0 16px', whiteSpace: 'pre-wrap', background: '#fafaf8', padding: '12px 14px', borderRadius: 10, color: '#3D3328' }}>{data.notes}</p>
        )}
        {data.responseMessage && (
          <p style={{ margin: '0 0 16px', color: '#5b5045', fontStyle: 'italic' }}>Votre réponse : « {data.responseMessage} »</p>
        )}

        {error && <p style={{ color: '#dc2626', fontSize: 14 }}>{error}</p>}

        {terminal ? (
          <p style={{ color: '#16a34a', fontWeight: 700, marginTop: 8 }}>
            {data.status === 'TERMINEE' ? '✓ Marqué comme terminé. Merci !' : data.status === 'REFUSEE' ? 'Vous avez refusé cette demande.' : 'Demande annulée.'}
          </p>
        ) : (
          <>
            {(canAcceptRefuse || canComplete) && (
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message (facultatif) — précision, question…"
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(48,64,53,0.15)', borderRadius: 10, padding: '10px 12px', fontSize: 14, marginBottom: 12, fontFamily: 'inherit' }}
              />
            )}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {canAcceptRefuse && <button style={btn('#16a34a')} disabled={busy} onClick={() => act('accept')}>Accepter</button>}
              {canAcceptRefuse && <button style={btn('#dc2626')} disabled={busy} onClick={() => act('refuse')}>Refuser</button>}
              {canComplete && <button style={btn('#1a2a1e')} disabled={busy} onClick={() => act('complete')}>Marquer terminé</button>}
            </div>
          </>
        )}

        {data.messages && data.messages.length > 0 && (
          <div style={{ marginTop: 18, borderTop: '1px solid rgba(48,64,53,0.1)', paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#7c6c58', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Échanges</div>
            {data.messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#9a8c7a' }}>{m.authorRole === 'intervenant' ? 'Vous' : m.authorName} · {fmtDate(m.createdAt)}</div>
                <div style={{ fontSize: 14, color: '#3D3328', whiteSpace: 'pre-wrap' }}>{m.body.replace(/^\[IMG:[^\]]*\]/, '📎 ')}</div>
              </div>
            ))}
          </div>
        )}
        {!terminal && (
          <div style={{ marginTop: 14 }}>
            <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Écrire un message au professionnel…" rows={2}
              style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(48,64,53,0.15)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', marginBottom: 8 }} />
            <button onClick={sendReply} disabled={sending || !reply.trim()}
              style={{ background: '#a67749', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: sending ? 'wait' : 'pointer', opacity: (sending || !reply.trim()) ? 0.5 : 1 }}>
              Envoyer le message
            </button>
          </div>
        )}
      </div>
      <p style={{ textAlign: 'center', color: '#9a8c7a', fontSize: 12, marginTop: 16 }}>
        Aucun compte nécessaire — vous répondez directement depuis ce lien.
      </p>
    </div>
  );
}
