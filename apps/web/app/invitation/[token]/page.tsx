'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { CheckCircle2, XCircle, Mail, Building2, Calendar, AlertCircle, ShieldCheck, ArrowRight, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';
import { useDemandesStore } from '@/store/useDemandesStore';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Page publique d'acceptation d'invitation intervenant.
 *
 * Flux :
 *  1. L'intervenant reçoit un email avec /invitation/<token>
 *  2. La page affiche la preview (qui invite, type, message)
 *  3. S'il n'est pas connecté → CTA "Se connecter / créer un compte" qui
 *     revient sur cette page après login (next= /invitation/<token>)
 *  4. S'il est connecté → boutons Accepter / Refuser
 *  5. Après accept → redirect /intervenant
 */
export default function InvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  const preview = useDemandesStore((s) => s.invitationPreview);
  const loading = useDemandesStore((s) => s.loadingInvitationPreview);
  const error = useDemandesStore((s) => s.errorInvitationPreview);
  const fetchPreview = useDemandesStore((s) => s.fetchInvitationPreview);
  const acceptInv = useDemandesStore((s) => s.acceptInvitationPublic);
  const refuseInv = useDemandesStore((s) => s.refuseInvitationPublic);

  const [submitting, setSubmitting] = useState<'accept' | 'refuse' | null>(null);
  const [done, setDone] = useState<'accepted' | 'refused' | null>(null);

  useEffect(() => {
    if (token) fetchPreview(token);
  }, [token, fetchPreview]);

  const handleAccept = async () => {
    setSubmitting('accept');
    const ok = await acceptInv(token);
    setSubmitting(null);
    if (ok) {
      setDone('accepted');
      setTimeout(() => router.push('/intervenant'), 1400);
    }
  };

  const handleRefuse = async () => {
    if (!confirm('Confirmer le refus de cette invitation ?')) return;
    setSubmitting('refuse');
    const ok = await refuseInv(token);
    setSubmitting(null);
    if (ok) setDone('refused');
  };

  const goLogin = () => {
    // Garde le contexte pour revenir ici après login
    const next = encodeURIComponent(`/invitation/${token}`);
    router.push(`/login?next=${next}`);
  };

  if (!hasHydrated || loading) {
    return <PageShell><Skeleton /></PageShell>;
  }

  if (error || !preview) {
    return (
      <PageShell>
        <div style={card()}>
          <AlertCircle size={36} style={{ color: '#dc2626', margin: '8px auto 14px', display: 'block' }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>
            Invitation invalide
          </h1>
          <p style={{ fontSize: 14, color: '#5b5045', textAlign: 'center', lineHeight: 1.5 }}>
            {error ?? "Ce lien d'invitation n'existe pas ou a expiré."}
          </p>
        </div>
      </PageShell>
    );
  }

  if (done === 'accepted') {
    return (
      <PageShell>
        <div style={card()}>
          <CheckCircle2 size={48} style={{ color: '#15803d', margin: '8px auto 14px', display: 'block' }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>
            Invitation acceptée !
          </h1>
          <p style={{ fontSize: 14, color: '#5b5045', textAlign: 'center', lineHeight: 1.5 }}>
            Redirection vers votre espace intervenant…
          </p>
        </div>
      </PageShell>
    );
  }

  if (done === 'refused') {
    return (
      <PageShell>
        <div style={card()}>
          <XCircle size={48} style={{ color: '#7c6c58', margin: '8px auto 14px', display: 'block' }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>
            Invitation refusée
          </h1>
          <p style={{ fontSize: 14, color: '#5b5045', textAlign: 'center', lineHeight: 1.5 }}>
            Le client a été informé de votre refus.
          </p>
        </div>
      </PageShell>
    );
  }

  const intervenantName =
    preview.intervenant.companyName ??
    [preview.intervenant.firstName, preview.intervenant.lastName].filter(Boolean).join(' ') ??
    '—';
  const inviterName = [preview.createdBy.firstName, preview.createdBy.lastName].filter(Boolean).join(' ') || preview.createdBy.email;
  const expiry = new Date(preview.expiresAt);
  const expiresIn = Math.max(0, Math.round((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const emailMismatch = isAuthenticated && user?.email && user.email.toLowerCase() !== preview.email.toLowerCase();

  return (
    <PageShell>
      <div style={card()}>
        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 11, letterSpacing: '0.18em', fontWeight: 700,
            color: '#3D5449', textTransform: 'uppercase',
          }}>
            <ShieldCheck size={14} /> Invitation vérifiée
          </div>
        </div>

        <h1 style={{
          fontSize: 26, fontWeight: 800, textAlign: 'center',
          marginBottom: 8, letterSpacing: '-0.02em',
        }}>
          Vous êtes invité·e
        </h1>
        <p style={{ fontSize: 14, color: '#5b5045', textAlign: 'center', marginBottom: 22, lineHeight: 1.5 }}>
          <strong>{inviterName}</strong> ({preview.workspace.name}) souhaite collaborer avec vous via AVRA.
        </p>

        {/* Détails */}
        <div style={{
          background: '#fafaf8',
          borderRadius: 14,
          padding: 18,
          marginBottom: 18,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <Row icon={<Building2 size={14} />} label="Entreprise (vous)">
            {intervenantName}
            <span style={{ color: '#7c6c58', fontSize: 12, marginLeft: 8 }}>
              · {preview.intervenant.type}
            </span>
          </Row>
          <Row icon={<Mail size={14} />} label="Email d'invitation">
            {preview.email}
          </Row>
          <Row icon={<Calendar size={14} />} label="Expire dans">
            {expiresIn} jour{expiresIn > 1 ? 's' : ''}
            <span style={{ color: '#7c6c58', fontSize: 12, marginLeft: 8 }}>
              · {expiry.toLocaleDateString('fr-FR')}
            </span>
          </Row>
        </div>

        {preview.message && (
          <div style={{
            background: '#fff8ef',
            border: '1px solid #fde7c2',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 18,
            fontSize: 14,
            color: '#7c4f1d',
            lineHeight: 1.5,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Message du client
            </div>
            <div style={{ fontStyle: 'italic' }}>
              « {preview.message} »
            </div>
          </div>
        )}

        {/* Actions */}
        {!isAuthenticated ? (
          <NotAuthenticatedActions token={token} previewEmail={preview.email} goLogin={goLogin} />
        ) : emailMismatch ? (
          <div style={{
            padding: 16,
            background: '#fff5f5',
            border: '1px solid #fecaca',
            borderRadius: 10,
            fontSize: 13, color: '#991b1b',
            textAlign: 'center', lineHeight: 1.5,
          }}>
            <AlertCircle size={20} style={{ color: '#b91c1c', marginBottom: 6 }} />
            <div style={{ fontWeight: 700 }}>Email différent</div>
            <div style={{ marginTop: 4 }}>
              Cette invitation a été envoyée à <strong>{preview.email}</strong>, mais vous êtes connecté avec <strong>{user?.email}</strong>.
            </div>
            <div style={{ marginTop: 10 }}>
              <button onClick={() => { useAuthStore.getState().logout(); goLogin(); }} style={btnSecondary()}>
                Changer de compte
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleAccept} disabled={!!submitting} style={btnPrimary()}>
              <CheckCircle2 size={16} />
              {submitting === 'accept' ? '…' : "J'accepte"}
            </button>
            <button onClick={handleRefuse} disabled={!!submitting} style={btnSecondary()}>
              <XCircle size={16} />
              {submitting === 'refuse' ? '…' : 'Refuser'}
            </button>
          </div>
        )}
      </div>

      <p style={{
        textAlign: 'center', fontSize: 11, color: '#7c6c58',
        marginTop: 16,
      }}>
        Vos données sont protégées · AVRA hébergement souverain France
      </p>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a2a1e 0%, #2a3f30 50%, #3D5449 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#3D5449',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, color: '#7c6c58', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          marginBottom: 2,
        }}>
          {label}
        </div>
        <div style={{ fontSize: 14, color: '#1a2a1e', fontWeight: 500 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Bloc actions quand l'intervenant n'est pas connecte.
 * 2 modes : "Se connecter" (compte existant) OU "Creer mon compte"
 * (nouveau, qui appelle /auth/register-intervenant et bypass beta gate).
 */
function NotAuthenticatedActions({
  token, previewEmail, goLogin,
}: { token: string; previewEmail: string; goLogin: () => void }) {
  const [mode, setMode] = useState<'choose' | 'register'>('choose');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleRegister = async () => {
    setError(null);
    if (password.length < 8) {
      setError('Mot de passe : 8 caracteres minimum');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/register-intervenant', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, firstName: firstName.trim() || undefined, lastName: lastName.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? 'Erreur lors de la creation du compte');
      }
      // Inscription + acceptation invitation OK → redirect vers /intervenant
      window.location.href = '/intervenant';
    } catch (e: any) {
      setError(e?.message ?? 'Erreur inconnue');
      setSubmitting(false);
    }
  };

  if (mode === 'choose') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={() => setMode('register')} style={btnPrimary()}>
          <UserPlus size={16} />
          Creer mon compte AVRA
        </button>
        <button onClick={goLogin} style={{ ...btnPrimary(), background: 'transparent', color: '#1a2a1e', border: '1px solid #ddd5c7' }}>
          <LogIn size={16} />
          J'ai deja un compte
        </button>
        <p style={{ fontSize: 11, color: '#7c6c58', textAlign: 'center', marginTop: 6 }}>
          Email d'invitation : <strong>{previewEmail}</strong>
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 13, color: '#5b5045', textAlign: 'center', margin: 0 }}>
        Creation de votre compte AVRA pour <strong>{previewEmail}</strong>
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Prenom"
          maxLength={100}
          style={inputStyle()}
        />
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Nom"
          maxLength={100}
          style={inputStyle()}
        />
      </div>

      <div style={{ position: 'relative' }}>
        <input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe (8 caracteres min.)"
          minLength={8}
          autoFocus
          style={{ ...inputStyle(), paddingRight: 40 }}
        />
        <button
          type="button"
          onClick={() => setShowPassword(s => !s)}
          style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#7c6c58',
          }}
          aria-label="Afficher/masquer mot de passe"
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px',
          background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8,
          color: '#991b1b', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <button
        onClick={handleRegister}
        disabled={submitting || password.length < 8}
        style={{ ...btnPrimary(), opacity: submitting || password.length < 8 ? 0.6 : 1 }}
      >
        <CheckCircle2 size={16} />
        {submitting ? 'Creation…' : 'Creer mon compte et accepter'}
      </button>

      <button onClick={() => setMode('choose')} style={{
        background: 'transparent', border: 'none', color: '#7c6c58',
        fontSize: 12, cursor: 'pointer', textDecoration: 'underline',
      }}>
        Retour
      </button>
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '11px 14px',
    border: '1px solid #ddd5c7',
    borderRadius: 10,
    fontSize: 14, fontFamily: 'inherit',
    outline: 'none', background: '#fff',
  };
}

function Skeleton() {
  return (
    <div style={card()}>
      <div style={{ height: 28, background: '#ece7df', borderRadius: 8, marginBottom: 14, opacity: 0.6 }} />
      <div style={{ height: 14, background: '#ece7df', borderRadius: 8, marginBottom: 22, opacity: 0.6, width: '70%', marginInline: 'auto' }} />
      <div style={{ height: 140, background: '#ece7df', borderRadius: 14, marginBottom: 18, opacity: 0.6 }} />
      <div style={{ height: 44, background: '#ece7df', borderRadius: 12, opacity: 0.6 }} />
    </div>
  );
}

function card(): React.CSSProperties {
  return {
    background: '#fff',
    borderRadius: 22,
    padding: '32px 28px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  };
}

function btnPrimary(): React.CSSProperties {
  return {
    flex: 1,
    padding: '14px 20px',
    background: 'linear-gradient(135deg, #1a2a1e 0%, #3D5449 100%)',
    color: '#cbb98a',
    border: 'none',
    borderRadius: 12,
    fontSize: 14, fontWeight: 700,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%',
  };
}

function btnSecondary(): React.CSSProperties {
  return {
    flex: 1,
    padding: '14px 20px',
    background: 'transparent',
    color: '#5b5045',
    border: '1px solid #ddd5c7',
    borderRadius: 12,
    fontSize: 14, fontWeight: 600,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  };
}
