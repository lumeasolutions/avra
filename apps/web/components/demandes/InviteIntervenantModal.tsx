'use client';

import { useEffect, useState } from 'react';
import { X, Mail, Send, Copy, CheckCircle2, AlertCircle, ExternalLink, Trash2 } from 'lucide-react';
import {
  IntervenantInvitation,
  createInvitation as apiCreateInvitation,
  revokeInvitation as apiRevokeInvitation,
} from '@/lib/demandes-api';

interface Props {
  open: boolean;
  onClose: () => void;
  intervenantId: string;
  intervenantName: string;
  defaultEmail?: string;
  /** Invitation existante (PENDING) — si fournie, on affiche l'etat + bouton revoquer/copier. */
  existingInvitation?: IntervenantInvitation | null;
  /** Callback apres creation/revocation reussie. */
  onChange?: (inv: IntervenantInvitation | null) => void;
}

/**
 * Modal simple pour envoyer/gerer un lien d'invitation a un intervenant.
 *
 * Workflow :
 *  1. Si pas d'invitation existante : formulaire (email + message optionnel) → POST /demandes/invitations
 *  2. Si invitation PENDING : affiche le lien copiable + bouton revoquer
 *  3. Apres acceptation : l'intervenant.userId est lie, l'invitation passe en ACCEPTED.
 */
export function InviteIntervenantModal({
  open, onClose, intervenantId, intervenantName, defaultEmail, existingInvitation, onChange,
}: Props) {
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<IntervenantInvitation | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setEmail(defaultEmail ?? '');
        setMessage('');
        setError(null);
        setCreated(null);
        setCopied(false);
      }, 250);
    } else {
      setEmail(defaultEmail ?? '');
    }
  }, [open, defaultEmail]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [open]);

  if (!open) return null;

  const activeInvitation = created ?? existingInvitation ?? null;
  const inviteUrl = activeInvitation
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invitation/${activeInvitation.token}`
    : '';

  const handleSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Email invalide');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const inv = await apiCreateInvitation({
        intervenantId,
        email: cleanEmail,
        message: message.trim() || undefined,
        expiresInDays: 14,
      });
      setCreated(inv);
      onChange?.(inv);
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!activeInvitation) return;
    if (!confirm('Revoquer cette invitation ? L\'intervenant ne pourra plus l\'utiliser.')) return;
    setSubmitting(true);
    try {
      const updated = await apiRevokeInvitation(activeInvitation.id);
      onChange?.(updated.status === 'PENDING' ? updated : null);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors de la revocation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {/* noop */}
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,18,0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 90,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 22,
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #1a2a1e 0%, #3D5449 100%)',
          color: '#cbb98a',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'rgba(203,185,138,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Mail size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 11, letterSpacing: '0.16em', fontWeight: 700,
              color: 'rgba(203,185,138,0.7)', textTransform: 'uppercase',
            }}>
              {activeInvitation ? 'Invitation envoyee' : 'Inviter sur AVRA'}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', marginTop: 2 }}>
              {intervenantName}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: 8, borderRadius: 8, color: 'rgba(245,238,232,0.7)',
            }}
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {!activeInvitation ? (
            // ─── Formulaire creation ────────────────────────────────────
            <>
              <p style={{ fontSize: 13, color: '#5b5045', lineHeight: 1.5, margin: '0 0 18px' }}>
                On va envoyer un lien securise par email a <strong>{intervenantName}</strong>.
                A l'acceptation, son compte sera lie a votre espace et il pourra recevoir
                vos demandes (pose, livraison, SAV, mesures…).
              </p>

              <Label>Email d'invitation *</Label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@entreprise.fr"
                autoFocus
                style={inputStyle()}
              />

              <Label style={{ marginTop: 14 }}>Message personnalise (optionnel)</Label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Bonjour, je vous invite a rejoindre mon espace AVRA pour suivre nos chantiers ensemble."
                style={{ ...inputStyle(), resize: 'vertical' }}
              />
              <div style={{ fontSize: 11, color: '#7c6c58', marginTop: 4 }}>
                {message.length}/500 — Le message apparaitra dans l'email et la page d'acceptation.
              </div>

              <div style={{
                marginTop: 14, padding: '10px 14px',
                background: '#fff8ef', border: '1px solid #fde7c2', borderRadius: 10,
                fontSize: 12, color: '#7c4f1d',
              }}>
                Le lien expirera dans 14 jours.
              </div>

              {error && (
                <div style={{
                  marginTop: 12, padding: '10px 14px',
                  background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10,
                  color: '#991b1b', fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                <button onClick={onClose} style={btnStyle('secondary')}>
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !email.trim()}
                  style={{
                    ...btnStyle('primary'),
                    flex: 1,
                    opacity: submitting || !email.trim() ? 0.6 : 1,
                    cursor: submitting || !email.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Send size={14} />
                  {submitting ? 'Envoi…' : "Envoyer l'invitation"}
                </button>
              </div>
            </>
          ) : (
            // ─── Etat invitation envoyee ────────────────────────────────
            <>
              <div style={{
                padding: 18,
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                border: '1px solid #bbf7d0',
                borderRadius: 14,
                marginBottom: 18,
                textAlign: 'center',
              }}>
                <CheckCircle2 size={36} style={{ color: '#15803d', margin: '0 auto 10px', display: 'block' }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: '#14532d', marginBottom: 4 }}>
                  Invitation envoyee
                </div>
                <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.5 }}>
                  Email envoye a <strong>{activeInvitation.email}</strong>.<br/>
                  Vous pouvez aussi copier le lien ci-dessous pour le partager directement.
                </div>
              </div>

              <Label>Lien d'invitation</Label>
              <div style={{
                display: 'flex', gap: 8, alignItems: 'stretch',
              }}>
                <input
                  readOnly
                  value={inviteUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  style={{
                    ...inputStyle(),
                    flex: 1,
                    fontFamily: 'monospace',
                    fontSize: 12,
                    background: '#fafaf8',
                  }}
                />
                <button
                  onClick={handleCopy}
                  style={{
                    padding: '10px 14px',
                    background: copied ? '#15803d' : '#1a2a1e',
                    color: copied ? '#fff' : '#cbb98a',
                    border: 'none', borderRadius: 10,
                    fontSize: 12, fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    minWidth: 90, justifyContent: 'center',
                    transition: 'all .15s',
                  }}
                >
                  {copied ? <><CheckCircle2 size={13} /> Copie</> : <><Copy size={13} /> Copier</>}
                </button>
              </div>

              <div style={{
                marginTop: 14, padding: '10px 14px',
                background: '#fafaf8', borderRadius: 10,
                fontSize: 12, color: '#5b5045',
                display: 'flex', flexDirection: 'column', gap: 4,
              }}>
                <div><strong>Expiration :</strong> {new Date(activeInvitation.expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <div><strong>Statut :</strong> En attente d'acceptation</div>
              </div>

              {error && (
                <div style={{
                  marginTop: 12, padding: '10px 14px',
                  background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10,
                  color: '#991b1b', fontSize: 13,
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                <button onClick={handleRevoke} disabled={submitting} style={{ ...btnStyle('danger'), flex: 1 }}>
                  <Trash2 size={13} /> Revoquer
                </button>
                <a
                  href={inviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...btnStyle('secondary'), textDecoration: 'none', flex: 1, justifyContent: 'center' }}
                >
                  <ExternalLink size={13} /> Apercu
                </a>
                <button onClick={onClose} style={btnStyle('primary')}>
                  Termine
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers UI ─────────────────────────────────────────────────────────────

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: '#7c6c58',
      textTransform: 'uppercase', letterSpacing: '0.06em',
      marginBottom: 6,
      ...style,
    }}>
      {children}
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #ddd5c7',
    borderRadius: 10,
    fontSize: 14, fontFamily: 'inherit',
    outline: 'none', background: '#fff',
  };
}

function btnStyle(variant: 'primary' | 'secondary' | 'danger'): React.CSSProperties {
  if (variant === 'primary') {
    return {
      padding: '10px 18px',
      background: '#1a2a1e', color: '#cbb98a',
      border: 'none', borderRadius: 10,
      fontSize: 13, fontWeight: 700,
      cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 6,
    };
  }
  if (variant === 'danger') {
    return {
      padding: '10px 18px',
      background: 'rgba(220,38,38,0.08)', color: '#b91c1c',
      border: '1px solid rgba(220,38,38,0.25)', borderRadius: 10,
      fontSize: 13, fontWeight: 600,
      cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 6,
      justifyContent: 'center',
    };
  }
  return {
    padding: '10px 18px',
    background: 'transparent', color: '#5b5045',
    border: '1px solid #ddd5c7', borderRadius: 10,
    fontSize: 13, fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 6,
  };
}
