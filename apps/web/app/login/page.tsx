'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { authApi } from '@/lib/api';
import { Eye, EyeOff, ArrowRight, Star, CheckCircle } from 'lucide-react';

function getRedirectUrl(profession: string | null) {
  if (!profession) return '/portal-select';
  return `/portail-${profession}`;
}

export default function LoginPage() {
  const token = useAuthStore((s) => s.token);
  const profession = useAuthStore((s) => s.profession);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  useEffect(() => {
    if (token) {
      window.location.href = getRedirectUrl(profession);
    }
  }, [token, profession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      setAuth('', res.user as Parameters<typeof setAuth>[1]);
      window.location.href = getRedirectUrl(profession);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { value: '2 400+', label: 'Professionnels actifs' },
    { value: '98%', label: 'Satisfaction client' },
    { value: '3h', label: 'Gagnées par jour' },
  ];

  const features = [
    'Devis & facturation e-facture 2026',
    'IA photo-réalisme intégrée',
    'Planning & gestion d\'équipe',
    'CRM pipeline visuel',
  ];

  return (
    <>
      <style suppressHydrationWarning>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow: hidden; }
        @media (max-width: 900px) {
          body { overflow: auto !important; }
        }

        @keyframes particleFloat {
          0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-100px) rotate(720deg); opacity: 0; }
        }
        @keyframes loginOwlFloat {
          0%, 100% { transform: translateY(0px) rotate(-1deg); filter: drop-shadow(0 0 30px rgba(201,169,110,0.5)); }
          50% { transform: translateY(-12px) rotate(1deg); filter: drop-shadow(0 0 50px rgba(201,169,110,0.8)); }
        }
        @keyframes ringRotate {
          from { transform: translate(-50%,-50%) rotate(0deg); }
          to { transform: translate(-50%,-50%) rotate(360deg); }
        }
        @keyframes ringRotateRev {
          from { transform: translate(-50%,-50%) rotate(0deg); }
          to { transform: translate(-50%,-50%) rotate(-360deg); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.4; transform: translate(-50%,-50%) scale(1); }
          50% { opacity: 0.9; transform: translate(-50%,-50%) scale(1.15); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes borderGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,169,110,0); }
          50% { box-shadow: 0 0 0 3px rgba(201,169,110,0.15); }
        }

        /* ── Mobile responsive ── */
        .login-wrapper {
          position: fixed;
          inset: 0;
          display: flex;
          background: #060d08;
          font-family: 'Inter', -apple-system, sans-serif;
          overflow: hidden;
        }
        .login-panel-left {
          flex: 0 0 52%;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 5%;
          background: linear-gradient(160deg, #0e1810 0%, #1a2b1e 40%, #0e1810 100%);
          overflow: hidden;
        }
        .login-panel-right {
          flex: 0 0 48%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 6%;
          background: linear-gradient(160deg, #080f0a 0%, #0e1810 60%, #080f0a 100%);
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 900px) {
          body { overflow: auto !important; }
          .login-left-features { display: none !important; }
          .login-left-testimonial { display: none !important; }
          .login-wrapper {
            position: relative !important;
            flex-direction: column !important;
            overflow-y: auto !important;
            min-height: 100vh !important;
          }
          .login-panel-left {
            flex: none !important;
            width: 100% !important;
            padding: 40px 6% 30px !important;
            min-height: auto !important;
          }
          .login-panel-right {
            flex: none !important;
            width: 100% !important;
            padding: 30px 6% 50px !important;
            min-height: auto !important;
          }
        }
        @media (max-width: 600px) {
          .login-panel-left {
            padding: 32px 5% 24px !important;
          }
          .login-panel-right {
            padding: 20px 4% 40px !important;
          }
          .login-stats-row {
            gap: 16px !important;
          }
          .login-stats-row > div .stat-value {
            font-size: 1.4rem !important;
          }
          .login-form-card {
            padding: 32px 24px !important;
          }
        }

        .login-particle {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(201,169,110,0.6);
          animation: particleFloat linear infinite;
          pointer-events: none;
        }
        .input-field {
          width: 100%;
          padding: 14px 18px;
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
        .btn-submit:active:not(:disabled) { transform: translateY(0); }
        .btn-submit:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
      `}</style>

      <div className="login-wrapper">

        {/* ════════════════════════════════════════
            PANNEAU GAUCHE — Branding + WaoW
            ════════════════════════════════════════ */}
        <div className="login-panel-left">
          {/* Fond texture subtile — dégradé pur sans image */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 0,
            background: 'radial-gradient(ellipse at 30% 20%, rgba(201,169,110,0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(58,125,90,0.06) 0%, transparent 50%)',
          }} />

          {/* Particules flottantes */}
          {[...Array(14)].map((_, i) => (
            <div key={i} className="login-particle" style={{
              left: `${Math.random() * 100}%`,
              animationDuration: `${8 + Math.random() * 12}s`,
              animationDelay: `${Math.random() * 10}s`,
              width: i % 3 === 0 ? '6px' : '3px',
              height: i % 3 === 0 ? '6px' : '3px',
              opacity: 0.4 + Math.random() * 0.4,
            }} />
          ))}

          {/* Glow circles décoratifs */}
          <div style={{ position: 'absolute', top: '15%', left: '20%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,0.08) 0%, transparent 65%)', animation: 'glowPulse 5s ease-in-out infinite', transform: 'translate(-50%,-50%)' }} />
          <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(58,125,90,0.12) 0%, transparent 65%)', animation: 'glowPulse 7s ease-in-out infinite 2s', transform: 'translate(50%,50%)' }} />

          {/* Contenu principal */}
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '480px', animation: 'fadeInUp 0.7s ease-out' }}>

            {/* Chouette AVRA */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '32px' }}>
              {/* Rings concentriques */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: '260px', height: '260px', borderRadius: '50%', border: '1px solid rgba(201,169,110,0.25)', animation: 'ringRotate 8s linear infinite', transform: 'translate(-50%,-50%)' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: '210px', height: '210px', borderRadius: '50%', border: '1px dashed rgba(201,169,110,0.15)', animation: 'ringRotateRev 12s linear infinite', transform: 'translate(-50%,-50%)' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,0.2) 0%, transparent 70%)', animation: 'glowPulse 3s ease-in-out infinite', transform: 'translate(-50%,-50%)' }} />

              {/* Image chouette dans cercle */}
              <div style={{
                position: 'relative', zIndex: 2,
                width: '160px', height: '160px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#0a110c',
                border: '2px solid rgba(201,169,110,0.75)',
                boxShadow: '0 0 60px rgba(201,169,110,0.5), 0 0 20px rgba(201,169,110,0.25), 0 20px 60px rgba(0,0,0,0.6)',
                animation: 'loginOwlFloat 5s ease-in-out infinite',
                margin: '0 auto',
              }}>
                <Image
                  src="/logochouette4.png"
                  alt="AVRA"
                  fill
                  style={{ objectFit: 'contain', padding: 2, filter: 'brightness(1.25) saturate(1.4) contrast(1.05)' }}
                />
              </div>
            </div>

            {/* Titre AVRA */}
            <div style={{ marginBottom: '8px' }}>
              <span style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '3rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                background: 'linear-gradient(135deg, #f0d98a 0%, #C9A96E 50%, #a07840 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'shimmer 4s linear infinite',
                display: 'block',
              }}>AVRA</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '48px', letterSpacing: '0.05em' }}>
              Le logiciel N°1 des pros de l'agencement
            </p>

            {/* Stats */}
            <div className="login-stats-row" style={{ display: 'flex', gap: '32px', justifyContent: 'center', marginBottom: '48px', flexWrap: 'wrap' }}>
              {stats.map((stat, i) => (
                <div key={i} style={{ textAlign: 'center', animation: `fadeInUp 0.7s ease-out ${0.1 * i + 0.3}s both` }}>
                  <div className="stat-value" style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: '1.8rem', fontWeight: 800,
                    background: 'linear-gradient(135deg, #e8c97a, #C9A96E)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    whiteSpace: 'nowrap',
                  }}>{stat.value}</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', marginTop: '2px', fontWeight: 500 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Features list */}
            <div className="login-left-features" style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
              {features.map((feat, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', animation: `fadeInUp 0.6s ease-out ${0.15 * i + 0.5}s both` }}>
                  <CheckCircle size={16} style={{ color: '#C9A96E', flexShrink: 0 }} />
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem', fontWeight: 500 }}>{feat}</span>
                </div>
              ))}
            </div>

            {/* Témoignage */}
            <div className="login-left-testimonial" style={{
              marginTop: '40px',
              padding: '20px 24px',
              background: 'rgba(201,169,110,0.06)',
              border: '1px solid rgba(201,169,110,0.15)',
              borderRadius: '16px',
              textAlign: 'left',
              animation: 'fadeInUp 0.7s ease-out 0.8s both',
            }}>
              <div style={{ display: 'flex', gap: '3px', marginBottom: '10px' }}>
                {[...Array(5)].map((_, i) => <Star key={i} size={13} fill="#C9A96E" color="#C9A96E" />)}
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontStyle: 'italic', lineHeight: 1.6, marginBottom: '10px' }}>
                &ldquo;AVRA m'a fait gagner 3h par jour. Je ne reviendrai jamais en arrière.&rdquo;
              </p>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Sophie L. — Cuisiniste, Lyon</div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            PANNEAU DROIT — Formulaire
            ════════════════════════════════════════ */}
        <div className="login-panel-right">
          {/* Déco lumière dorée en arrière-plan */}
          <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,0.05) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(58,125,90,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />

          {/* Card formulaire */}
          <div className="login-form-card" style={{
            width: '100%', maxWidth: '420px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '28px',
            padding: '44px 40px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)',
            animation: 'slideInRight 0.6s ease-out',
          }}>
            {/* Header card */}
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.2)',
                borderRadius: '20px', padding: '5px 14px', marginBottom: '16px',
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A96E', boxShadow: '0 0 6px #C9A96E' }} />
                <span style={{ color: '#C9A96E', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Espace professionnel</span>
              </div>
              <h1 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '2rem', fontWeight: 800,
                color: '#fff', marginBottom: '8px',
                letterSpacing: '-0.01em',
              }}>Bon retour 👋</h1>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem' }}>
                Connectez-vous à votre espace AVRA
              </p>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Email */}
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.83rem', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.02em' }}>
                  Adresse email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                />
              </div>

              {/* Mot de passe */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.83rem', fontWeight: 600, letterSpacing: '0.02em' }}>
                    Mot de passe
                  </label>
                  <Link href="/forgot-password" style={{ color: 'rgba(201,169,110,0.7)', fontSize: '0.78rem', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}>
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPassFocused(true)}
                    onBlur={() => setPassFocused(false)}
                    required
                    placeholder="••••••••••••"
                    className="input-field"
                    style={{
                      paddingRight: '52px',
                      borderColor: passFocused ? 'rgba(201,169,110,0.6)' : 'rgba(255,255,255,0.12)',
                      background: passFocused ? 'rgba(201,169,110,0.06)' : 'rgba(255,255,255,0.05)',
                    }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                      color: 'rgba(255,255,255,0.35)', transition: 'color 0.2s',
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Erreur */}
              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '12px', padding: '12px 16px',
                  color: '#fca5a5', fontSize: '0.875rem', fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <span style={{ fontSize: '1rem' }}>⚠️</span> {error}
                </div>
              )}

              {/* Bouton submit */}
              <button type="submit" disabled={loading} className="btn-submit" style={{ marginTop: '4px' }}>
                {loading ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'ringRotate 0.8s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="30 70" />
                    </svg>
                    Connexion en cours…
                  </>
                ) : (
                  <>Se connecter <ArrowRight size={18} /></>
                )}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '28px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.78rem' }}>ou</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
            </div>

            {/* Lien inscription */}
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '0.88rem' }}>
              Pas encore de compte ?{' '}
              <Link href="/comment-ca-marche" style={{
                color: '#C9A96E', fontWeight: 700,
                textDecoration: 'none', transition: 'color 0.2s',
              }}>
                Demander une démo →
              </Link>
            </p>
          </div>

          {/* Footer */}
          <p style={{
            position: 'absolute', bottom: '24px',
            color: 'rgba(255,255,255,0.18)', fontSize: '0.75rem',
            textAlign: 'center',
          }}>
            AVRA © 2026 — Données hébergées en France 🇫🇷
          </p>
        </div>
      </div>
    </>
  );
}
