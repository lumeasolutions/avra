'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { authApi } from '@/lib/api';
import { Eye, EyeOff, ArrowRight, Sparkles, Zap, Shield, Layers, AlertTriangle } from 'lucide-react';

function getRedirectUrl(profession: string | null) {
  if (!profession) return '/portal-select';
  return `/portail-${profession}`;
}

/** Whitelist anti open-redirect : seules les routes internes safe sont acceptees. */
function safeNextUrl(next: string | null | undefined): string | null {
  if (!next) return null;
  if (typeof next !== 'string') return null;
  // Doit commencer par / mais pas par // (protocole-relatif) ni /\ (Windows hack)
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  // Routes autorisees explicitement
  const allowedPrefixes = ['/intervenant', '/invitation/', '/portail-', '/dashboard', '/dossiers'];
  return allowedPrefixes.some((p) => next === p || next.startsWith(p)) ? next : null;
}

/**
 * Detecte si le user connecte est un intervenant (lie a au moins un Intervenant).
 * Utilise pour rediriger vers /intervenant au lieu de /portail-* si c'est le cas.
 */
async function detectIsIntervenant(): Promise<boolean> {
  try {
    const res = await fetch('/api/v1/intervenant-portal/profile', {
      method: 'GET', credentials: 'include',
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

// Wrapper Suspense requis par Next.js 14 dès qu'un enfant utilise useSearchParams.
// Sans ce wrapper, le build échoue sur le pré-rendering statique de /login.
export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0a0a' }} />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
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
  // "Rester connecté" — coché par défaut, chargé depuis localStorage
  const [rememberMe, setRememberMe] = useState(true);
  // Détecte une redirection depuis la zone app après expiration de session
  const searchParams = useSearchParams();
  const sessionExpired = searchParams?.get('reason') === 'session-expired';
  // Lien retour priorité (ex: invitation acceptation, deep-link)
  const next = safeNextUrl(searchParams?.get('next'));

  useEffect(() => {
    // Charger la préférence sauvegardée
    const saved = localStorage.getItem('avra-remember');
    if (saved === 'false') setRememberMe(false);
  }, []);

  /**
   * Calcule la destination post-login.
   * Priorite :
   *  1. ?next= (whitelist) → respecte deep-link (typiquement /invitation/<token>)
   *  2. user lie a Intervenant → /intervenant
   *  3. profession choisie → /portail-<profession>
   *  4. fallback /portal-select
   */
  const computeRedirectAfterLogin = async (): Promise<string> => {
    if (next) return next;
    const isIntervenant = await detectIsIntervenant();
    if (isIntervenant) return '/intervenant';
    return getRedirectUrl(profession);
  };

  useEffect(() => {
    if (token) {
      // User deja connecte qui revient sur /login → redirige proprement
      computeRedirectAfterLogin().then((url) => {
        window.location.href = url;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, profession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      // Sauvegarder la préférence "rester connecté"
      localStorage.setItem('avra-remember', rememberMe ? 'true' : 'false');
      if (!rememberMe) {
        // Session uniquement — marqueur effacé à la fermeture du navigateur
        sessionStorage.setItem('avra-session-active', '1');
      } else {
        sessionStorage.removeItem('avra-session-active');
      }
      setAuth('', res.user as Parameters<typeof setAuth>[1]);
      const url = await computeRedirectAfterLogin();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  const pillars = [
    { icon: Sparkles, title: 'IA intégrée', desc: 'Rendus photo-réalistes, assistant contextuel' },
    { icon: Layers, title: 'Tout-en-un', desc: 'Dossiers, devis, planning, signature, paiement' },
    { icon: Zap, title: 'E-facture 2026', desc: 'Conformité réglementaire native' },
    { icon: Shield, title: 'Données en France', desc: 'Hébergement souverain, RGPD strict' },
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
        @keyframes auroraSweep {
          0%   { transform: translate(-50%,-50%) rotate(0deg); opacity: 0.55; }
          50%  { opacity: 0.9; }
          100% { transform: translate(-50%,-50%) rotate(360deg); opacity: 0.55; }
        }
        @keyframes satelliteOrbit {
          from { transform: rotate(0deg) translateX(var(--orbit-r, 150px)) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(var(--orbit-r, 150px)) rotate(-360deg); }
        }
        @keyframes satelliteOrbitRev {
          from { transform: rotate(0deg) translateX(var(--orbit-r, 150px)) rotate(0deg); }
          to   { transform: rotate(-360deg) translateX(var(--orbit-r, 150px)) rotate(360deg); }
        }
        @keyframes tiltBreath {
          0%,100% { transform: perspective(900px) rotateX(0deg) rotateY(0deg); }
          50%    { transform: perspective(900px) rotateX(2deg) rotateY(-2deg); }
        }
        @keyframes pillarGradient {
          0%,100% { background-position: 0% 50%; }
          50%    { background-position: 100% 50%; }
        }
        .pillar-card {
          position: relative;
          overflow: hidden;
          border-radius: 14px;
          padding: 14px 16px;
          background:
            linear-gradient(rgba(10,17,13,0.85), rgba(10,17,13,0.85)) padding-box,
            linear-gradient(120deg, rgba(201,169,110,0.55), rgba(232,201,122,0.15), rgba(58,125,90,0.5), rgba(201,169,110,0.55)) border-box;
          background-size: 100% 100%, 300% 100%;
          border: 1px solid transparent;
          animation: pillarGradient 8s ease-in-out infinite;
          transition: transform 0.35s cubic-bezier(.2,.8,.2,1), box-shadow 0.35s ease;
        }
        .pillar-card::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(circle at var(--mx,50%) var(--my,0%), rgba(232,201,122,0.18), transparent 55%);
          opacity: 0; transition: opacity 0.35s ease;
          pointer-events: none;
        }
        .pillar-card:hover { transform: translateY(-3px); box-shadow: 0 14px 36px rgba(0,0,0,0.45), 0 0 0 1px rgba(232,201,122,0.35); }
        .pillar-card:hover::before { opacity: 1; }

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
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '520px', animation: 'fadeInUp 0.7s ease-out' }}>

            {/* Badge bêta privée */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(201,169,110,0.1)',
              border: '1px solid rgba(201,169,110,0.3)',
              borderRadius: '30px', padding: '6px 16px',
              backdropFilter: 'blur(8px)',
            }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#C9A96E',
                boxShadow: '0 0 10px #C9A96E',
                animation: 'glowPulse 2s ease-in-out infinite',
                position: 'relative',
                transform: 'none',
              }} />
              <span style={{ color: '#C9A96E', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Bêta privée · Lancement juillet 2026
              </span>
            </div>
            </div>

            {/* Chouette AVRA */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
            <div style={{ position: 'relative', display: 'inline-block', animation: 'tiltBreath 9s ease-in-out infinite' }}>
              {/* Aurora sweep — halo conique rotatif */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%', width: '360px', height: '360px', borderRadius: '50%',
                background: 'conic-gradient(from 0deg, transparent 0deg, rgba(232,201,122,0.35) 45deg, transparent 120deg, rgba(58,125,90,0.25) 220deg, transparent 300deg)',
                filter: 'blur(22px)',
                animation: 'auroraSweep 16s linear infinite',
                transform: 'translate(-50%,-50%)',
                zIndex: 0,
                pointerEvents: 'none',
              }} />
              {/* Rings concentriques */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: '320px', height: '320px', borderRadius: '50%', border: '1px solid rgba(201,169,110,0.22)', animation: 'ringRotate 10s linear infinite', transform: 'translate(-50%,-50%)' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: '260px', height: '260px', borderRadius: '50%', border: '1px dashed rgba(201,169,110,0.2)', animation: 'ringRotateRev 14s linear infinite', transform: 'translate(-50%,-50%)' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: '210px', height: '210px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,0.28) 0%, transparent 70%)', animation: 'glowPulse 3s ease-in-out infinite', transform: 'translate(-50%,-50%)' }} />

              {/* Satellites orbitaux (points dorés qui tournent) */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: 0, height: 0, transform: 'translate(-50%,-50%)', zIndex: 1, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', width: '8px', height: '8px', borderRadius: '50%', background: '#f0d98a', boxShadow: '0 0 14px rgba(240,217,138,0.9)', top: '-4px', left: '-4px', ['--orbit-r' as string]: '160px', animation: 'satelliteOrbit 11s linear infinite' } as React.CSSProperties} />
                <div style={{ position: 'absolute', width: '5px', height: '5px', borderRadius: '50%', background: '#e8c97a', boxShadow: '0 0 10px rgba(232,201,122,0.8)', top: '-2.5px', left: '-2.5px', ['--orbit-r' as string]: '130px', animation: 'satelliteOrbitRev 9s linear infinite' } as React.CSSProperties} />
                <div style={{ position: 'absolute', width: '4px', height: '4px', borderRadius: '50%', background: '#ffe7a3', boxShadow: '0 0 8px rgba(255,231,163,0.85)', top: '-2px', left: '-2px', ['--orbit-r' as string]: '185px', animation: 'satelliteOrbit 17s linear infinite' } as React.CSSProperties} />
              </div>

              {/* Image chouette dans cercle */}
              <div style={{
                position: 'relative', zIndex: 2,
                width: '170px', height: '170px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#0a110c',
                border: '2px solid rgba(201,169,110,0.75)',
                boxShadow: '0 0 80px rgba(201,169,110,0.55), 0 0 24px rgba(201,169,110,0.25), 0 20px 60px rgba(0,0,0,0.6)',
                animation: 'loginOwlFloat 5s ease-in-out infinite',
                margin: '0 auto',
              }}>
                <Image
                  src="/nouveaulogochouette.png"
                  alt="AVRA"
                  fill
                  style={{ objectFit: 'contain', padding: 2 }}
                />
              </div>
            </div>
            </div>

            {/* Titre AVRA */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '3.4rem',
                fontWeight: 800,
                letterSpacing: '0.12em',
                background: 'linear-gradient(135deg, #ffe7a3 0%, #f5d67a 25%, #e8c97a 50%, #f0d98a 75%, #ffe7a3 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'shimmer 4s linear infinite',
                display: 'block',
                textShadow: '0 0 40px rgba(240,217,138,0.3)',
              }}>AVRA</span>
            </div>

            {/* Tagline impactante */}
            <h2 style={{
              color: '#fff', fontSize: '1.35rem', fontWeight: 600,
              lineHeight: 1.4, marginBottom: '10px',
              fontFamily: "'Playfair Display', Georgia, serif",
              animation: 'fadeInUp 0.7s ease-out 0.2s both',
            }}>
              L'ERP nouvelle génération des<br />
              <span style={{
                background: 'linear-gradient(135deg, #e8c97a, #C9A96E)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>pros de l'agencement</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.92rem', marginBottom: '44px', lineHeight: 1.6, letterSpacing: '0.01em', animation: 'fadeInUp 0.7s ease-out 0.3s both' }}>
              Une plateforme unique · pilotée par l'IA · pensée pour cuisinistes, menuisiers, architectes et agenceurs.
            </p>

            {/* Piliers produit (pas de stats fake) */}
            <div className="login-left-features" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', textAlign: 'left' }}>
              {pillars.map((p, i) => {
                const Icon = p.icon;
                return (
                  <div key={i} className="pillar-card" style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                    animation: `fadeInUp 0.6s ease-out ${0.15 * i + 0.5}s both, pillarGradient 8s ease-in-out infinite`,
                  }}
                  onMouseMove={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
                    e.currentTarget.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
                  }}
                  >
                    <div style={{
                      flexShrink: 0, position: 'relative',
                      width: '38px', height: '38px',
                      borderRadius: '11px',
                      background: 'linear-gradient(135deg, rgba(232,201,122,0.28), rgba(160,120,64,0.12))',
                      border: '1px solid rgba(232,201,122,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: 'inset 0 0 12px rgba(232,201,122,0.2), 0 4px 14px rgba(0,0,0,0.35)',
                    }}>
                      <Icon size={17} style={{ color: '#ffe7a3', filter: 'drop-shadow(0 0 6px rgba(232,201,122,0.7))' }} />
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700, marginBottom: '3px', letterSpacing: '0.01em' }}>{p.title}</div>
                      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.74rem', lineHeight: 1.45 }}>{p.desc}</div>
                    </div>
                  </div>
                );
              })}
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

            {/* Bandeau "Session expirée" si redirection depuis la zone app */}
            {sessionExpired && (
              <div
                role="alert"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '12px 14px',
                  marginBottom: 16,
                  borderRadius: 12,
                  background: 'rgba(201,169,110,0.12)',
                  border: '1px solid rgba(201,169,110,0.4)',
                  color: '#f5e9d4',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                }}
              >
                <AlertTriangle style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, color: '#d9b38a' }} />
                <div>
                  <strong style={{ color: '#fff', display: 'block', marginBottom: 2 }}>Session expirée</strong>
                  Votre session a expiré pour des raisons de sécurité. Reconnectez-vous pour reprendre.
                </div>
              </div>
            )}

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

              {/* Rester connecté */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                cursor: 'pointer', userSelect: 'none',
              }}>
                <div
                  onClick={() => setRememberMe(!rememberMe)}
                  style={{
                    width: '20px', height: '20px', flexShrink: 0,
                    borderRadius: '6px',
                    border: `1.5px solid ${rememberMe ? 'rgba(201,169,110,0.8)' : 'rgba(255,255,255,0.2)'}`,
                    background: rememberMe ? 'linear-gradient(135deg, #C9A96E, #a07840)' : 'rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: rememberMe ? '0 0 10px rgba(201,169,110,0.3)' : 'none',
                  }}
                >
                  {rememberMe && (
                    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                      <path d="M1 4L4 7L10 1" stroke="#0e1810" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span
                  onClick={() => setRememberMe(!rememberMe)}
                  style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.87rem', fontWeight: 500 }}
                >
                  Rester connecté
                </span>
              </label>

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

            {/* Lien liste d'attente (bêta privée) */}
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '0.88rem' }}>
              Pas encore partenaire bêta ?{' '}
              <Link href="/rejoindre" style={{
                color: '#C9A96E', fontWeight: 700,
                textDecoration: 'none', transition: 'color 0.2s',
              }}>
                Rejoindre la liste d&apos;attente →
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
