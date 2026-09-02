'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CheckCircle2, Mail, Building2, Calendar, AlertCircle, ShieldCheck,
  Eye, EyeOff, LogIn, Check, X as XIcon, BadgeCheck,
} from 'lucide-react';
import { evaluatePassword, getMissingRulesMessage } from '@/lib/password-rules';

/**
 * Page publique d'acceptation d'une invitation d'ÉQUIPE (membre/vendeur).
 *
 * Le back-end envoie l'email d'invitation vers `/rejoindre-equipe/<token>`
 * (team-email.service.ts). Cette page était manquante → 404. Flux :
 *  1. GET /api/v1/team/invitation/<token> → preview (qui invite, workspace, rôle).
 *  2. Compte inexistant + invitation PENDING → formulaire de création
 *     (POST /api/v1/auth/register-member) qui crée le compte, le rattache au
 *     workspace avec le rôle de l'invitation, et connecte automatiquement.
 *  3. Compte déjà existant → CTA « Se connecter » (le back-end refuse la
 *     création et invite à se connecter).
 *  4. Invitation expirée / déjà acceptée / annulée → message explicite.
 *  5. Après création → redirection vers /portal-select.
 *
 * Route de haut niveau (hors (app)) : pas de garde d'auth, l'invité n'a pas
 * encore de session — même approche que /invitation/<token> (intervenant).
 */

interface TeamInvitationPreview {
  email: string;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
  message?: string | null;
  workspaceName: string;
  inviterName: string;
  expiresAt: string;
  status: string; // PENDING | ACCEPTED | EXPIRED | REVOKED | CANCELLED
  accountExists: boolean;
}

// Libellés alignés sur ceux que l'inviteur voit/choisit dans Paramètres →
// Équipe (ROLE_LABEL + options du formulaire d'invitation), pour que l'invité
// voie exactement le rôle choisi et pas un synonyme (« Vendeur » ≠ « Membre »).
function roleLabel(role: string): string {
  const r = (role || '').toUpperCase();
  if (r === 'OWNER') return 'Propriétaire';
  if (r === 'ADMIN') return 'Administrateur';
  return 'Membre'; // MEMBER (et variantes) → « Membre »
}

export default function RejoindreEquipePage() {
  const params = useParams();
  const router = useRouter();
  const token = (params?.token as string) ?? '';

  const [preview, setPreview] = useState<TeamInvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/v1/team/invitation/${encodeURIComponent(token)}`, {
          credentials: 'include',
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message ?? "Ce lien d'invitation n'existe pas ou a expiré.");
        }
        const data = (await res.json()) as TeamInvitationPreview;
        if (!cancelled) setPreview(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Erreur inconnue');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
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

  const status = (preview.status || '').toUpperCase();
  const expiry = new Date(preview.expiresAt);
  const expiresIn = Math.max(0, Math.round((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  // États terminaux : invitation non exploitable.
  if (status === 'EXPIRED') {
    return <TerminalState title="Invitation expirée" body="Ce lien a dépassé sa date de validité. Demandez à la personne qui vous a invité·e de vous en renvoyer un." />;
  }
  if (status === 'ACCEPTED') {
    return <TerminalState title="Invitation déjà acceptée" body="Vous avez déjà rejoint cette équipe." cta="Se connecter" onCta={() => router.push('/login')} />;
  }
  if (status === 'REVOKED' || status === 'CANCELLED') {
    return <TerminalState title="Invitation annulée" body="Cette invitation a été annulée par l'équipe." />;
  }

  return (
    <PageShell>
      <div style={card()}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 11, letterSpacing: '0.18em', fontWeight: 700,
            color: '#3D5449', textTransform: 'uppercase',
          }}>
            <ShieldCheck size={14} /> Invitation vérifiée
          </div>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, textAlign: 'center', marginBottom: 8, letterSpacing: '-0.02em' }}>
          Rejoindre une équipe
        </h1>
        <p style={{ fontSize: 14, color: '#5b5045', textAlign: 'center', marginBottom: 22, lineHeight: 1.5 }}>
          <strong>{preview.inviterName}</strong> vous invite à rejoindre
          {preview.workspaceName && preview.workspaceName.trim() !== preview.inviterName.trim()
            ? <> l'équipe <strong>{preview.workspaceName}</strong> sur AVRA.</>
            : <> son équipe sur AVRA.</>}
        </p>

        <div style={{
          background: '#fafaf8', borderRadius: 14, padding: 18, marginBottom: 18,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <Row icon={<Building2 size={14} />} label="Espace">{preview.workspaceName}</Row>
          <Row icon={<BadgeCheck size={14} />} label="Votre rôle">{roleLabel(preview.role)}</Row>
          <Row icon={<Mail size={14} />} label="Email d'invitation">{preview.email}</Row>
          <Row icon={<Calendar size={14} />} label="Expire dans">
            {expiresIn} jour{expiresIn > 1 ? 's' : ''}
            <span style={{ color: '#7c6c58', fontSize: 12, marginLeft: 8 }}>· {expiry.toLocaleDateString('fr-FR')}</span>
          </Row>
        </div>

        {preview.message && (
          <div style={{
            background: '#fff8ef', border: '1px solid #fde7c2', borderRadius: 12,
            padding: '12px 16px', marginBottom: 18, fontSize: 14, color: '#7c4f1d', lineHeight: 1.5,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Message
            </div>
            <div style={{ fontStyle: 'italic' }}>« {preview.message} »</div>
          </div>
        )}

        {preview.accountExists ? (
          <div style={{
            padding: 16, background: '#f2f6f3', border: '1px solid #cfe0d4', borderRadius: 10,
            fontSize: 13, color: '#2a3f30', textAlign: 'center', lineHeight: 1.5,
          }}>
            <div style={{ fontWeight: 700 }}>Vous avez déjà un compte AVRA</div>
            <div style={{ marginTop: 4 }}>
              Connectez-vous avec <strong>{preview.email}</strong> pour rejoindre l'équipe.
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={() => router.push('/login')} style={btnPrimary()}>
                <LogIn size={16} /> Se connecter
              </button>
            </div>
          </div>
        ) : (
          <RegisterMemberForm
            token={token}
            email={preview.email}
            initialFirstName={preview.firstName ?? ''}
            initialLastName={preview.lastName ?? ''}
          />
        )}
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#e8dcc0', marginTop: 16 }}>
        Vos données sont protégées · AVRA hébergement souverain France
      </p>
    </PageShell>
  );
}

function RegisterMemberForm({
  token, email, initialFirstName, initialLastName,
}: { token: string; email: string; initialFirstName: string; initialLastName: string }) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwdFocused, setPwdFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pwdEval = evaluatePassword(password);
  const pwdValid = pwdEval.allValid;

  const handleRegister = async () => {
    setError(null);
    const missingMsg = getMissingRulesMessage(password);
    if (missingMsg) { setError(missingMsg); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/register-member', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? 'Erreur lors de la création du compte');
      }
      // Compte créé + rattaché + connecté (cookies). On laisse le nouveau membre
      // choisir son portail métier.
      window.location.href = '/portal-select';
    } catch (e: any) {
      setError(e?.message ?? 'Erreur inconnue');
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 13, color: '#5b5045', textAlign: 'center', margin: 0 }}>
        Créez votre compte pour <strong>{email}</strong>
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" maxLength={100} style={inputStyle()} />
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom" maxLength={100} style={inputStyle()} />
      </div>

      <div style={{ position: 'relative' }}>
        <input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={() => setPwdFocused(true)}
          onBlur={() => setPwdFocused(false)}
          placeholder="Mot de passe (12 caractères min.)"
          minLength={12}
          style={{ ...inputStyle(), paddingRight: 40 }}
        />
        <button
          type="button"
          onClick={() => setShowPassword((s) => !s)}
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#7c6c58' }}
          aria-label="Afficher/masquer mot de passe"
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {(pwdFocused || password) && (
        <ul style={{
          listStyle: 'none', padding: '10px 12px', margin: 0,
          background: '#fbf8f3', border: '1px solid #ede4d4', borderRadius: 8,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {pwdEval.rules.map((r) => (
            <li key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: r.ok ? '#15803d' : '#7c6c58', transition: 'color 0.2s' }}>
              {r.ok ? <Check size={13} style={{ color: '#22c55e', flexShrink: 0 }} /> : <XIcon size={13} style={{ color: '#c0a886', flexShrink: 0 }} />}
              <span style={{ textDecoration: r.ok ? 'line-through' : 'none' }}>{r.label}</span>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <div style={{ padding: '10px 14px', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <button
        onClick={handleRegister}
        disabled={submitting || !pwdValid}
        style={{ ...btnPrimary(), opacity: submitting || !pwdValid ? 0.6 : 1 }}
      >
        <CheckCircle2 size={16} />
        {submitting ? 'Création…' : 'Créer mon compte et rejoindre'}
      </button>

      <p style={{ fontSize: 11, color: '#7c6c58', textAlign: 'center', margin: 0 }}>
        Vous avez déjà un compte ?{' '}
        <a href="/login" style={{ color: '#3D5449', fontWeight: 700 }}>Se connecter</a>
      </p>
    </div>
  );
}

function TerminalState({ title, body, cta, onCta }: { title: string; body: string; cta?: string; onCta?: () => void }) {
  return (
    <PageShell>
      <div style={card()}>
        <AlertCircle size={36} style={{ color: '#b45309', margin: '8px auto 14px', display: 'block' }} />
        <h1 style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>{title}</h1>
        <p style={{ fontSize: 14, color: '#5b5045', textAlign: 'center', lineHeight: 1.5 }}>{body}</p>
        {cta && onCta && (
          <div style={{ marginTop: 16 }}>
            <button onClick={onCta} style={btnPrimary()}><LogIn size={16} /> {cta}</button>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a2a1e 0%, #2a3f30 50%, #3D5449 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>{children}</div>
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3D5449', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#7c6c58', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 14, color: '#1a2a1e', fontWeight: 500 }}>{children}</div>
      </div>
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return { width: '100%', padding: '11px 14px', border: '1px solid #ddd5c7', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff' };
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
  return { background: '#fff', borderRadius: 22, padding: '32px 28px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };
}

function btnPrimary(): React.CSSProperties {
  return {
    padding: '14px 20px',
    background: 'linear-gradient(135deg, #1a2a1e 0%, #3D5449 100%)',
    color: '#cbb98a', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
  };
}
