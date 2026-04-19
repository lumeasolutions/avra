'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params?.get('token') ?? '';
  const userId = params?.get('id') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Validation token présent
  const tokenMissing = !token || !userId;

  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (password.length >= 12) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'][strength];
  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return; }
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, token, newPassword: password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Erreur' }));
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message);
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
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
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
        }
        @keyframes checkPop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .rp-wrapper {
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
        .rp-card {
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
          padding: 14px 48px 14px 18px;
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
          box-shadow: 0 0 0 4px rgba(201,169,110,0.08);
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
          box-shadow: 0 8px 32px rgba(201,169,110,0.4);
          font-family: inherit;
        }
        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 14px 40px rgba(201,169,110,0.55);
        }
        .btn-submit:disabled { opacity: 0.65; cursor: not-allowed; }
        @media (max-width: 480px) {
          .rp-card { padding: 36px 24px; }
        }
      `}</style>

      <div className="rp-wrapper">
        <div style={{ position: 'absolute', top: '15%', left: '50%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,0.06) 0%, transparent 60%)', transform: 'translateX(-50%)', pointerEvents: 'none' }} />

        <div className="rp-card">
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '16px' }}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: '120px', height: '120px', borderRadius: '50%', border: '1px solid rgba(201,169,110,0.2)', animation: 'ringRotate 8s linear infinite', transform: 'translate(-50%,-50%)' }} />
              <div style={{ position: 'relative', zIndex: 2, width: '70px', height: '70px', borderRadius: '50%', overflow: 'hidden', background: '#0a110c', border: '2px solid rgba(201,169,110,0.6)', boxShadow: '0 0 40px rgba(201,169,110,0.3)', animation: 'loginOwlFloat 5s ease-in-out infinite', margin: '0 auto' }}>
                <Image src="/logochouette4.png" alt="AVRA" fill style={{ objectFit: 'contain', padding: 1 }} />
              </div>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: '20px', padding: '5px 14px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A96E', boxShadow: '0 0 6px #C9A96E' }} />
              <span style={{ color: '#C9A96E', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Espace professionnel</span>
            </div>
          </div>

          {tokenMissing ? (
            /* Lien invalide */
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
              <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>Lien invalide</h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '28px' }}>
                Ce lien de réinitialisation est invalide ou a expiré.<br />Demandez un nouveau lien.
              </p>
              <Link href="/forgot-password" style={{ textDecoration: 'none' }}>
                <button className="btn-submit">Nouveau lien <ArrowRight size={18} /></button>
              </Link>
            </div>
          ) : success ? (
            /* Succès */
            <div style={{ textAlign: 'center', animation: 'fadeInUp 0.5s ease-out' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(22,163,74,0.15))', border: '2px solid rgba(34,197,94,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', animation: 'checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: '0 0 40px rgba(34,197,94,0.2)' }}>
                <CheckCircle size={32} color="#22c55e" />
              </div>
              <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>Mot de passe mis à jour !</h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: '32px' }}>
                Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.
              </p>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <button className="btn-submit">Se connecter <ArrowRight size={18} /></button>
              </Link>
            </div>
          ) : (
            /* Formulaire */
            <>
              <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '10px', textAlign: 'center' }}>Nouveau mot de passe</h1>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.88rem', textAlign: 'center', lineHeight: 1.6, marginBottom: '28px' }}>Choisissez un mot de passe sécurisé pour votre compte AVRA.</p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Password */}
                <div>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.83rem', fontWeight: 600, marginBottom: '8px' }}>Nouveau mot de passe</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setPassFocused(true)}
                      onBlur={() => setPassFocused(false)}
                      required
                      placeholder="••••••••••••"
                      className="input-field"
                      style={{ borderColor: passFocused ? 'rgba(201,169,110,0.6)' : 'rgba(255,255,255,0.12)', background: passFocused ? 'rgba(201,169,110,0.06)' : 'rgba(255,255,255,0.05)' }}
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex' }}>
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {password && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[1,2,3,4,5].map(i => (
                          <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= strength ? strengthColor : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }} />
                        ))}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: strengthColor, fontWeight: 600, marginTop: '4px', display: 'block' }}>{strengthLabel}</span>
                    </div>
                  )}
                </div>

                {/* Confirm */}
                <div>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.83rem', fontWeight: 600, marginBottom: '8px' }}>Confirmer le mot de passe</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      onFocus={() => setConfirmFocused(true)}
                      onBlur={() => setConfirmFocused(false)}
                      required
                      placeholder="••••••••••••"
                      className="input-field"
                      style={{
                        borderColor: confirmFocused ? 'rgba(201,169,110,0.6)' : (confirm && confirm !== password ? 'rgba(239,68,68,0.5)' : (confirm && confirm === password ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.12)')),
                        background: confirmFocused ? 'rgba(201,169,110,0.06)' : 'rgba(255,255,255,0.05)',
                      }}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex' }}>
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '12px 16px', color: '#fca5a5', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>⚠️</span> {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-submit" style={{ marginTop: '4px' }}>
                  {loading ? (
                    <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'ringRotate 0.8s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70"/></svg>Mise à jour…</>
                  ) : (
                    <>Mettre à jour <ArrowRight size={18} /></>
                  )}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <Link href="/login" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#C9A96E'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'}
                >
                  <ArrowLeft size={14} /> Retour à la connexion
                </Link>
              </div>
            </>
          )}

          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '0.72rem', marginTop: '28px' }}>
            AVRA © 2026 — Données hébergées en France 🇫🇷
          </p>
        </div>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#060d08' }} />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
