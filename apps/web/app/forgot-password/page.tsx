'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Mail, ArrowRight } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      // Always show success — ne jamais révéler si l'email existe (sécurité)
      setSent(true);
    } catch {
      // Même en cas d'erreur réseau, afficher le message de succès
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style suppressHydrationWarning>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ringRotate {
          from { transform: translate(-50%,-50%) rotate(0deg); }
          to { transform: translate(-50%,-50%) rotate(360deg); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.4; transform: translate(-50%,-50%) scale(1); }
          50% { opacity: 0.9; transform: translate(-50%,-50%) scale(1.15); }
        }
        @keyframes loginOwlFloat {
          0%, 100% { transform: translateY(0px) rotate(-1deg); filter: drop-shadow(0 0 30px rgba(201,169,110,0.5)); }
          50% { transform: translateY(-8px) rotate(1deg); filter: drop-shadow(0 0 50px rgba(201,169,110,0.8)); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes checkPop {
          0% { transform: scale(0) rotate(-10deg); opacity: 0; }
          60% { transform: scale(1.15) rotate(3deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .fp-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(160deg, #060d08 0%, #0e1810 50%, #060d08 100%);
          padding: 24px 16px;
          font-family: 'Inter', -apple-system, sans-serif;
          position: relative;
          overflow: hidden;
        }
        .fp-card {
          width: 100%;
          max-width: 440px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 28px;
          padding: 48px 44px;
          backdrop-filter: blur(20px);
          box-shadow: 0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07);
          animation: fadeInUp 0.6s ease-out;
          position: relative;
          z-index: 1;
        }
        .input-field {
          width: 100%;
          padding: 14px 18px 14px 48px;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          color: #fff;
          font-size: 0.95rem;
          outline: none;
          transition: all 0.25s ease;
          font-family: inherit;
        }
        .input-field::placeholder { color: rgba(255,255,255,0.3); }
        .input-field:focus {
          border-color: rgba(201,169,110,0.6);
          background: rgba(201,169,110,0.06);
          box-shadow: 0 0 0 4px rgba(201,169,110,0.08), 0 4px 20px rgba(0,0,0,0.2);
        }
        .btn-submit {
          width: 100%;
          padding: 15px 24px;
          background: linear-gradient(135deg, #e8c97a 0%, #C9A96E 50%, #a07840 100%);
          background-size: 200% auto;
          color: #0e1810;
          font-weight: 800;
          font-size: 1rem;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          letter-spacing: 0.02em;
          box-shadow: 0 8px 32px rgba(201,169,110,0.4);
          font-family: inherit;
        }
        .btn-submit:hover:not(:disabled) {
          background-position: right center;
          transform: translateY(-2px);
          box-shadow: 0 14px 40px rgba(201,169,110,0.55);
        }
        .btn-submit:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
        @media (max-width: 480px) {
          .fp-card { padding: 36px 24px; }
        }
      `}</style>

      <div className="fp-wrapper">
        {/* Déco fond */}
        <div style={{ position: 'absolute', top: '15%', left: '50%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,0.06) 0%, transparent 60%)', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(58,125,90,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div className="fp-card">
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '20px' }}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: '130px', height: '130px', borderRadius: '50%', border: '1px solid rgba(201,169,110,0.2)', animation: 'ringRotate 8s linear infinite', transform: 'translate(-50%,-50%)' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: '100px', height: '100px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,0.15) 0%, transparent 70%)', animation: 'glowPulse 3s ease-in-out infinite', transform: 'translate(-50%,-50%)' }} />
              <div style={{
                position: 'relative', zIndex: 2,
                width: '80px', height: '80px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#0a110c',
                border: '2px solid rgba(201,169,110,0.6)',
                boxShadow: '0 0 40px rgba(201,169,110,0.35)',
                animation: 'loginOwlFloat 5s ease-in-out infinite',
                margin: '0 auto',
              }}>
                <Image src="/logochouette4.png" alt="AVRA" fill style={{ objectFit: 'contain', padding: 1 }} />
              </div>
            </div>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.2)',
              borderRadius: '20px', padding: '5px 14px', marginBottom: '16px',
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A96E', boxShadow: '0 0 6px #C9A96E' }} />
              <span style={{ color: '#C9A96E', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Espace professionnel</span>
            </div>
          </div>

          {sent ? (
            /* ── Écran succès ── */
            <div style={{ textAlign: 'center', animation: 'fadeInUp 0.5s ease-out' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(201,169,110,0.2), rgba(58,125,90,0.2))',
                border: '2px solid rgba(201,169,110,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
                animation: 'checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                boxShadow: '0 0 40px rgba(201,169,110,0.2)',
              }}>
                <span style={{ fontSize: '2rem' }}>✉️</span>
              </div>
              <h1 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '12px',
              }}>Email envoyé !</h1>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: '32px' }}>
                Si <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{email}</strong> est associé à un compte AVRA, vous recevrez un lien de réinitialisation dans quelques minutes.<br /><br />
                Pensez à vérifier vos spams.
              </p>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <button style={{
                  width: '100%', padding: '14px 24px',
                  background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.25)',
                  borderRadius: '14px', color: '#C9A96E', fontWeight: 700,
                  fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '8px', fontFamily: 'inherit', transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(201,169,110,0.18)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,169,110,0.5)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(201,169,110,0.1)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,169,110,0.25)';
                }}
                >
                  <ArrowLeft size={16} /> Retour à la connexion
                </button>
              </Link>
            </div>
          ) : (
            /* ── Formulaire ── */
            <>
              <h1 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '1.75rem', fontWeight: 800, color: '#fff',
                marginBottom: '10px', textAlign: 'center',
              }}>Mot de passe oublié ?</h1>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.88rem', textAlign: 'center', lineHeight: 1.6, marginBottom: '32px' }}>
                Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.83rem', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.02em' }}>
                    Adresse email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{
                      position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                      color: emailFocused ? '#C9A96E' : 'rgba(255,255,255,0.3)',
                      transition: 'color 0.2s', pointerEvents: 'none',
                    }} />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      required
                      placeholder="votre@email.fr"
                      className="input-field"
                      style={{
                        borderColor: emailFocused ? 'rgba(201,169,110,0.6)' : 'rgba(255,255,255,0.12)',
                        background: emailFocused ? 'rgba(201,169,110,0.06)' : 'rgba(255,255,255,0.05)',
                      }}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <div style={{
                    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: '12px', padding: '12px 16px',
                    color: '#fca5a5', fontSize: '0.875rem',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    <span>⚠️</span> {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-submit">
                  {loading ? (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'ringRotate 0.8s linear infinite' }}>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="30 70" />
                      </svg>
                      Envoi en cours…
                    </>
                  ) : (
                    <>Envoyer le lien <ArrowRight size={18} /></>
                  )}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '28px' }}>
                <Link href="/login" style={{
                  color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontWeight: 500,
                  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#C9A96E'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'}
                >
                  <ArrowLeft size={14} /> Retour à la connexion
                </Link>
              </div>
            </>
          )}

          {/* Footer */}
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '0.72rem', marginTop: '32px' }}>
            AVRA © 2026 — Données hébergées en France 🇫🇷
          </p>
        </div>
      </div>
    </>
  );
}
