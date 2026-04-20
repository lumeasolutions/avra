'use client';

import { useEffect, useRef, useState, useCallback, type MouseEvent } from 'react';

interface Ripple { id: number; x: number; y: number; }
interface Comet { id: number; top: number; duration: number; delay: number; }

export default function HeroLogoBanner() {
  const bannerRef = useRef<HTMLDivElement>(null);
  const leftLogoRef = useRef<HTMLDivElement>(null);
  const rightLogoRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [magL, setMagL] = useState({ x: 0, y: 0 });
  const [magR, setMagR] = useState({ x: 0, y: 0 });
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [comets, setComets] = useState<Comet[]>([]);
  const [mounted, setMounted] = useState(false);
  const [blink, setBlink] = useState(false);

  // Perf : throttling du mousemove via requestAnimationFrame pour éviter
  // ~60 re-renders React par seconde. Une seule maj de state par frame.
  const rafRef = useRef<number | null>(null);
  const pendingMouseRef = useRef<{ clientX: number; clientY: number } | null>(null);

  useEffect(() => {
    // Trigger scroll-in animation on mount
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Comet spawner — toutes les 5s spawn 1-2 comètes
    const spawn = () => {
      setComets(prev => [...prev, {
        id: Date.now() + Math.random(),
        top: 10 + Math.random() * 75,
        duration: 1.6 + Math.random() * 1.2,
        delay: 0,
      }]);
    };
    spawn();
    const iv = setInterval(spawn, 4000 + Math.random() * 3000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    // Auto-cleanup comets
    if (comets.length === 0) return;
    const t = setTimeout(() => {
      setComets(prev => prev.slice(1));
    }, 3500);
    return () => clearTimeout(t);
  }, [comets]);

  useEffect(() => {
    // Chouette blink toutes les 7-12s
    const tick = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 220);
    };
    const iv = setInterval(tick, 8500 + Math.random() * 4000);
    return () => clearInterval(iv);
  }, []);

  const flushMouseMove = useCallback(() => {
    rafRef.current = null;
    const m = pendingMouseRef.current;
    pendingMouseRef.current = null;
    const el = bannerRef.current;
    if (!el || !m) return;
    const rect = el.getBoundingClientRect();
    const mx = m.clientX - rect.left;
    const my = m.clientY - rect.top;
    // Parallax global : valeur entre -1 et 1
    const nx = (mx / rect.width) * 2 - 1;
    const ny = (my / rect.height) * 2 - 1;
    setTilt({ x: nx, y: ny });

    const radius = 220;
    const lLogo = leftLogoRef.current;
    const rLogo = rightLogoRef.current;
    if (lLogo) {
      const lr = lLogo.getBoundingClientRect();
      const dx = m.clientX - (lr.left + lr.width / 2);
      const dy = m.clientY - (lr.top + lr.height / 2);
      const dist = Math.hypot(dx, dy);
      if (dist < radius && dist > 0) {
        const pull = (1 - dist / radius) * 18;
        setMagL({ x: (dx / dist) * pull, y: (dy / dist) * pull });
      } else {
        setMagL({ x: 0, y: 0 });
      }
    }
    if (rLogo) {
      const rr = rLogo.getBoundingClientRect();
      const dx = m.clientX - (rr.left + rr.width / 2);
      const dy = m.clientY - (rr.top + rr.height / 2);
      const dist = Math.hypot(dx, dy);
      if (dist < radius && dist > 0) {
        const pull = (1 - dist / radius) * 18;
        setMagR({ x: (dx / dist) * pull, y: (dy / dist) * pull });
      } else {
        setMagR({ x: 0, y: 0 });
      }
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    pendingMouseRef.current = { clientX: e.clientX, clientY: e.clientY };
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(flushMouseMove);
  }, [flushMouseMove]);

  const handleMouseLeave = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingMouseRef.current = null;
    setTilt({ x: 0, y: 0 });
    setMagL({ x: 0, y: 0 });
    setMagR({ x: 0, y: 0 });
  }, []);

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  const handleClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const el = bannerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const id = Date.now();
    setRipples(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 900);
  }, []);

  const tiltXDeg = tilt.y * -4;
  const tiltYDeg = tilt.x * 4;

  return (
    <div
      ref={bannerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className="hero-logo-banner"
      style={{
        position: 'relative', zIndex: 2, width: '100%',
        background: 'linear-gradient(90deg, rgba(10,16,12,0.95) 0%, rgba(48,64,53,0.7) 20%, rgba(201,169,110,0.35) 50%, rgba(48,64,53,0.7) 80%, rgba(10,16,12,0.95) 100%)',
        borderTop: '2px solid transparent',
        borderBottom: '2px solid transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '60px',
        padding: '18px 4%',
        flexShrink: 0,
        overflow: 'hidden',
        boxShadow: '0 20px 100px rgba(201,169,110,0.38), inset 0 0 150px rgba(201,169,110,0.1)',
        perspective: '1400px',
        cursor: 'pointer',
      }}
    >
      {/* Grain/bruit premium */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        opacity: 0.12, mixBlendMode: 'overlay',
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='7'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 0.85 0 0 0 0 0.55 0 0 0 0.7 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
      }} />

      {/* Bordures dorées animées */}
      <div aria-hidden style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.4), #f3d98a, rgba(201,169,110,0.4), transparent)',
        backgroundSize: '200% 100%',
        animation: 'heroBorderFlow 4s linear infinite',
        pointerEvents: 'none',
      }} />
      <div aria-hidden style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.4), #f3d98a, rgba(201,169,110,0.4), transparent)',
        backgroundSize: '200% 100%',
        animation: 'heroBorderFlow 4s linear infinite reverse',
        pointerEvents: 'none',
      }} />

      {/* Aurora waves en fond */}
      <div aria-hidden style={{
        position: 'absolute', inset: '-50%',
        background: 'conic-gradient(from 0deg at 50% 50%, rgba(201,169,110,0.3) 0deg, transparent 60deg, rgba(243,217,138,0.25) 120deg, transparent 180deg, rgba(201,169,110,0.3) 240deg, transparent 300deg, rgba(243,217,138,0.25) 360deg)',
        animation: 'heroAuroraSpin 30s linear infinite',
        pointerEvents: 'none',
        filter: 'blur(40px)',
        opacity: 0.6,
      }} />

      {/* Filaments aurora SVG */}
      <svg aria-hidden viewBox="0 0 1440 300" preserveAspectRatio="none" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.55,
      }}>
        <defs>
          <linearGradient id="aurora-grad-1" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#C9A96E" stopOpacity="0" />
            <stop offset="30%" stopColor="#f3d98a" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#C9A96E" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#C9A96E" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="aurora-grad-2" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#f3d98a" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f3d98a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0,150 Q360,60 720,150 T1440,150" fill="none" stroke="url(#aurora-grad-1)" strokeWidth="1.5" style={{ animation: 'auroraWave1 7s ease-in-out infinite', filter: 'blur(0.5px) drop-shadow(0 0 6px #C9A96E)' }} />
        <path d="M0,170 Q360,240 720,170 T1440,170" fill="none" stroke="url(#aurora-grad-2)" strokeWidth="1" style={{ animation: 'auroraWave2 9s ease-in-out infinite', filter: 'blur(0.8px) drop-shadow(0 0 8px #f3d98a)' }} />
        <path d="M0,130 Q360,200 720,130 T1440,130" fill="none" stroke="url(#aurora-grad-1)" strokeWidth="0.8" style={{ animation: 'auroraWave3 11s ease-in-out infinite', filter: 'blur(0.3px)' }} />
      </svg>

      {/* Sheen lumineux */}
      <div aria-hidden style={{
        position: 'absolute', top: 0, left: '-30%', width: '40%', height: '100%',
        background: 'linear-gradient(100deg, transparent 0%, rgba(255,225,160,0.22) 45%, rgba(255,255,255,0.38) 50%, rgba(255,225,160,0.22) 55%, transparent 100%)',
        animation: 'heroBannerSheen 4s ease-in-out infinite',
        pointerEvents: 'none',
        filter: 'blur(8px)',
      }} />

      {/* Rayons radiaux */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 25% 50%, rgba(201,169,110,0.4), transparent 45%), radial-gradient(ellipse at 75% 50%, rgba(201,169,110,0.4), transparent 45%), radial-gradient(ellipse at 50% 50%, rgba(243,217,138,0.15), transparent 60%)',
        animation: 'heroBannerPulse 5s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Particules dorées */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {[...Array(12)].map((_, i) => (
          <span key={i} style={{
            position: 'absolute',
            width: `${3 + (i % 4)}px`, height: `${3 + (i % 4)}px`,
            borderRadius: '50%',
            background: i % 3 === 0 ? '#ffffff' : '#f3d98a',
            boxShadow: `0 0 ${8 + (i % 3) * 4}px rgba(243,217,138,0.95), 0 0 ${20 + (i % 3) * 6}px rgba(201,169,110,0.7)`,
            left: `${(i * 8.13) % 100}%`,
            top: `${(i * 37 + 11) % 100}%`,
            animation: `heroParticle ${3 + (i % 5)}s ease-in-out ${i * 0.18}s infinite`,
            opacity: 0,
          }} />
        ))}
      </div>

      {/* Étincelles scintillantes */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {[...Array(5)].map((_, i) => (
          <span key={`sp-${i}`} style={{
            position: 'absolute',
            width: '2px', height: '2px',
            background: '#fff',
            borderRadius: '50%',
            boxShadow: '0 0 6px #fff, 0 0 12px #f3d98a, 0 0 20px #C9A96E',
            left: `${15 + i * 16}%`,
            top: `${(i * 23) % 80}%`,
            animation: `heroTwinkle ${2 + (i % 3)}s ease-in-out ${i * 0.4}s infinite`,
          }} />
        ))}
      </div>

      {/* Comètes / étoiles filantes */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {comets.map(c => (
          <span key={c.id} style={{
            position: 'absolute', top: `${c.top}%`, left: '-10%',
            width: 140, height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(243,217,138,0.9), #fff, rgba(243,217,138,0.9), transparent)',
            boxShadow: '0 0 12px #f3d98a, 0 0 24px #C9A96E',
            borderRadius: 2,
            animation: `heroComet ${c.duration}s linear forwards`,
          }} />
        ))}
      </div>

      {/* Connection beams électriques entre les 2 logos */}
      <svg aria-hidden viewBox="0 0 1440 300" preserveAspectRatio="none" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none',
      }}>
        <defs>
          <linearGradient id="beam-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f3d98a" stopOpacity="0" />
            <stop offset="50%" stopColor="#fff" stopOpacity="1" />
            <stop offset="100%" stopColor="#f3d98a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="250" y1="150" x2="1190" y2="150" stroke="url(#beam-grad)" strokeWidth="2" strokeDasharray="8 14" style={{ animation: 'heroBeamPulse 3s ease-in-out infinite', filter: 'drop-shadow(0 0 8px #f3d98a)' }} />
      </svg>

      {/* Ripples au clic */}
      {ripples.map(r => (
        <span key={r.id} aria-hidden style={{
          position: 'absolute', left: r.x, top: r.y,
          width: 0, height: 0, borderRadius: '50%',
          border: '2px solid rgba(243,217,138,0.9)',
          boxShadow: '0 0 20px rgba(243,217,138,0.8), inset 0 0 20px rgba(243,217,138,0.3)',
          transform: 'translate(-50%, -50%)',
          animation: 'heroRipple 0.9s ease-out forwards',
          pointerEvents: 'none',
        }} />
      ))}

      {/* Logo AVRA (gauche) */}
      <div
        ref={leftLogoRef}
        className="hero-logo-left"
        style={{
          position: 'relative', width: 240, height: 240,
          filter: 'drop-shadow(0 18px 48px rgba(201,169,110,0.75)) drop-shadow(0 0 32px rgba(243,217,138,0.55)) drop-shadow(0 0 6px rgba(255,255,255,0.4))',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.2s ease-out, opacity 1s ease-out',
          transform: mounted
            ? `translate3d(${magL.x}px, ${magL.y}px, 0) rotateX(${tiltXDeg}deg) rotateY(${tiltYDeg}deg)`
            : 'translate3d(-200px, 0, 0) rotateY(-40deg)',
          opacity: mounted ? 1 : 0,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, animation: 'heroLogoFloatL 6s ease-in-out infinite' }}>
          {/* Anneaux rotatifs */}
          <div aria-hidden style={{
            position: 'absolute', inset: -20, borderRadius: '50%',
            background: 'conic-gradient(from 0deg, transparent 0deg, rgba(201,169,110,0.7) 50deg, rgba(243,217,138,1) 90deg, rgba(255,255,255,0.9) 100deg, rgba(243,217,138,1) 110deg, rgba(201,169,110,0.7) 150deg, transparent 220deg, transparent 360deg)',
            animation: 'heroRingSpin 6s linear infinite',
            pointerEvents: 'none',
            mask: 'radial-gradient(circle, transparent 54%, #000 57%, #000 63%, transparent 66%)',
            WebkitMask: 'radial-gradient(circle, transparent 54%, #000 57%, #000 63%, transparent 66%)',
            filter: 'drop-shadow(0 0 12px rgba(243,217,138,0.8))',
          }} />
          <div aria-hidden style={{
            position: 'absolute', inset: -40, borderRadius: '50%',
            background: 'conic-gradient(from 180deg, transparent 0deg, rgba(243,217,138,0.5) 80deg, rgba(201,169,110,0.4) 120deg, transparent 200deg, transparent 360deg)',
            animation: 'heroRingSpinReverse 12s linear infinite',
            pointerEvents: 'none',
            mask: 'radial-gradient(circle, transparent 58%, #000 61%, #000 64%, transparent 67%)',
            WebkitMask: 'radial-gradient(circle, transparent 58%, #000 61%, #000 64%, transparent 67%)',
          }} />
          {/* Prisme rainbow sur l'anneau */}
          <div aria-hidden style={{
            position: 'absolute', inset: -20, borderRadius: '50%',
            background: 'conic-gradient(from 45deg, transparent 0deg, rgba(255,100,100,0.3) 30deg, rgba(255,200,100,0.3) 60deg, rgba(255,255,100,0.3) 90deg, rgba(100,255,150,0.3) 120deg, rgba(100,200,255,0.3) 150deg, rgba(200,100,255,0.3) 180deg, transparent 210deg, transparent 360deg)',
            animation: 'heroRingSpin 8s linear infinite reverse',
            pointerEvents: 'none',
            mask: 'radial-gradient(circle, transparent 56%, #000 58%, #000 60%, transparent 62%)',
            WebkitMask: 'radial-gradient(circle, transparent 56%, #000 58%, #000 60%, transparent 62%)',
            mixBlendMode: 'screen',
            opacity: 0.6,
          }} />
          {/* Aura */}
          <div aria-hidden style={{
            position: 'absolute', inset: -50, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.3), rgba(243,217,138,0.55) 25%, rgba(201,169,110,0.3) 55%, transparent 75%)',
            animation: 'heroLogoGlow 3.5s ease-in-out infinite',
            pointerEvents: 'none',
            filter: 'blur(3px)',
          }} />
          {/* Rayons de lumière */}
          <div aria-hidden style={{
            position: 'absolute', inset: -60, borderRadius: '50%',
            background: 'conic-gradient(from 0deg, transparent 0deg, rgba(243,217,138,0.25) 10deg, transparent 20deg, transparent 60deg, rgba(243,217,138,0.25) 70deg, transparent 80deg, transparent 120deg, rgba(243,217,138,0.25) 130deg, transparent 140deg, transparent 180deg, rgba(243,217,138,0.25) 190deg, transparent 200deg, transparent 240deg, rgba(243,217,138,0.25) 250deg, transparent 260deg, transparent 300deg, rgba(243,217,138,0.25) 310deg, transparent 320deg)',
            animation: 'heroRaySpin 16s linear infinite',
            pointerEvents: 'none',
            filter: 'blur(4px)',
          }} />
          {/* Logo image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nouveaulogoA.png" alt="AVRA Logo" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', animation: 'heroLogoShimmer 3s ease-in-out infinite' }} />
          {/* Reflet miroir */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nouveaulogoA.png" alt="" aria-hidden style={{
            position: 'absolute', left: 0, top: '100%', width: '100%', height: '60%',
            objectFit: 'contain', objectPosition: 'top',
            transform: 'scaleY(-1)',
            opacity: 0.28,
            filter: 'blur(1px)',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent 80%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent 80%)',
          }} />
        </div>
      </div>

      {/* Grand logo AVRA central — la pièce maîtresse */}
      <div
        className="hero-logo-center"
        style={{
          position: 'relative',
          width: 620, height: 200,
          flexShrink: 0,
          filter: 'drop-shadow(0 24px 60px rgba(201,169,110,0.85)) drop-shadow(0 0 48px rgba(243,217,138,0.7)) drop-shadow(0 0 8px rgba(255,255,255,0.5))',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.25s ease-out, opacity 1.1s ease-out',
          transform: mounted
            ? `translate3d(0, 0, 0) rotateX(${tiltXDeg * 0.6}deg) rotateY(${tiltYDeg * 0.6}deg)`
            : 'translate3d(0, 30px, 0) scale(0.85)',
          opacity: mounted ? 1 : 0,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, animation: 'heroAvraFloat 6s ease-in-out infinite' }}>
          {/* Halo radial derrière le texte */}
          <div aria-hidden style={{
            position: 'absolute', inset: '-40%',
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.18) 0%, rgba(243,217,138,0.45) 15%, rgba(201,169,110,0.35) 35%, rgba(201,169,110,0.15) 55%, transparent 78%)',
            animation: 'heroLogoGlow 4s ease-in-out infinite',
            pointerEvents: 'none',
            filter: 'blur(6px)',
          }} />
          {/* Rayons dorés verticaux en arrière-plan */}
          <div aria-hidden style={{
            position: 'absolute', inset: '-30%',
            background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(243,217,138,0.35) 15deg, transparent 30deg, transparent 60deg, rgba(243,217,138,0.35) 75deg, transparent 90deg, transparent 150deg, rgba(243,217,138,0.35) 165deg, transparent 180deg, transparent 240deg, rgba(243,217,138,0.35) 255deg, transparent 270deg, transparent 330deg, rgba(243,217,138,0.35) 345deg, transparent 360deg)',
            animation: 'heroRaySpin 22s linear infinite',
            pointerEvents: 'none',
            filter: 'blur(8px)',
            opacity: 0.7,
            mask: 'radial-gradient(ellipse at center, #000 0%, #000 40%, transparent 75%)',
            WebkitMask: 'radial-gradient(ellipse at center, #000 0%, #000 40%, transparent 75%)',
          }} />
          {/* Image AVRA */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nouveaulogoavra.png" alt="AVRA" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain',
            animation: 'heroLogoShimmer 3s ease-in-out infinite 0.75s',
          }} />
          {/* Overlay prisme rainbow subtil sur le texte */}
          <div aria-hidden style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(100deg, transparent 0%, rgba(255,180,80,0.08) 25%, rgba(255,230,150,0.15) 50%, rgba(180,220,255,0.08) 75%, transparent 100%)',
            mixBlendMode: 'screen',
            animation: 'heroBannerSheen 5s ease-in-out infinite',
            pointerEvents: 'none',
            maskImage: 'url(/nouveaulogoavra.png)',
            WebkitMaskImage: 'url(/nouveaulogoavra.png)',
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskPosition: 'center',
          }} />
          {/* Reflet miroir AVRA */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nouveaulogoavra.png" alt="" aria-hidden style={{
            position: 'absolute', left: 0, top: '100%', width: '100%', height: '55%',
            objectFit: 'contain', objectPosition: 'top',
            transform: 'scaleY(-1)',
            opacity: 0.25,
            filter: 'blur(1.5px)',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 85%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 85%)',
          }} />
        </div>
      </div>

      {/* Logo Chouette (droite) */}
      <div
        ref={rightLogoRef}
        className="hero-logo-right"
        style={{
          position: 'relative', width: 240, height: 240,
          filter: 'drop-shadow(0 18px 48px rgba(201,169,110,0.75)) drop-shadow(0 0 32px rgba(243,217,138,0.55)) drop-shadow(0 0 6px rgba(255,255,255,0.4))',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.2s ease-out, opacity 1s ease-out',
          transform: mounted
            ? `translate3d(${magR.x}px, ${magR.y}px, 0) rotateX(${tiltXDeg}deg) rotateY(${tiltYDeg}deg)`
            : 'translate3d(200px, 0, 0) rotateY(40deg)',
          opacity: mounted ? 1 : 0,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, animation: 'heroLogoFloatR 6s ease-in-out infinite' }}>
          {/* Anneaux rotatifs (inverse) */}
          <div aria-hidden style={{
            position: 'absolute', inset: -20, borderRadius: '50%',
            background: 'conic-gradient(from 180deg, transparent 0deg, rgba(201,169,110,0.7) 50deg, rgba(243,217,138,1) 90deg, rgba(255,255,255,0.9) 100deg, rgba(243,217,138,1) 110deg, rgba(201,169,110,0.7) 150deg, transparent 220deg, transparent 360deg)',
            animation: 'heroRingSpinReverse 6s linear infinite',
            pointerEvents: 'none',
            mask: 'radial-gradient(circle, transparent 54%, #000 57%, #000 63%, transparent 66%)',
            WebkitMask: 'radial-gradient(circle, transparent 54%, #000 57%, #000 63%, transparent 66%)',
            filter: 'drop-shadow(0 0 12px rgba(243,217,138,0.8))',
          }} />
          <div aria-hidden style={{
            position: 'absolute', inset: -40, borderRadius: '50%',
            background: 'conic-gradient(from 0deg, transparent 0deg, rgba(243,217,138,0.5) 80deg, rgba(201,169,110,0.4) 120deg, transparent 200deg, transparent 360deg)',
            animation: 'heroRingSpin 12s linear infinite',
            pointerEvents: 'none',
            mask: 'radial-gradient(circle, transparent 58%, #000 61%, #000 64%, transparent 67%)',
            WebkitMask: 'radial-gradient(circle, transparent 58%, #000 61%, #000 64%, transparent 67%)',
          }} />
          {/* Prisme rainbow */}
          <div aria-hidden style={{
            position: 'absolute', inset: -20, borderRadius: '50%',
            background: 'conic-gradient(from 225deg, transparent 0deg, rgba(200,100,255,0.3) 30deg, rgba(100,200,255,0.3) 60deg, rgba(100,255,150,0.3) 90deg, rgba(255,255,100,0.3) 120deg, rgba(255,200,100,0.3) 150deg, rgba(255,100,100,0.3) 180deg, transparent 210deg, transparent 360deg)',
            animation: 'heroRingSpinReverse 8s linear infinite reverse',
            pointerEvents: 'none',
            mask: 'radial-gradient(circle, transparent 56%, #000 58%, #000 60%, transparent 62%)',
            WebkitMask: 'radial-gradient(circle, transparent 56%, #000 58%, #000 60%, transparent 62%)',
            mixBlendMode: 'screen',
            opacity: 0.6,
          }} />
          {/* Aura */}
          <div aria-hidden style={{
            position: 'absolute', inset: -50, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.3), rgba(243,217,138,0.55) 25%, rgba(201,169,110,0.3) 55%, transparent 75%)',
            animation: 'heroLogoGlow 3.5s ease-in-out infinite 1.75s',
            pointerEvents: 'none',
            filter: 'blur(3px)',
          }} />
          {/* Rayons */}
          <div aria-hidden style={{
            position: 'absolute', inset: -60, borderRadius: '50%',
            background: 'conic-gradient(from 180deg, transparent 0deg, rgba(243,217,138,0.25) 10deg, transparent 20deg, transparent 60deg, rgba(243,217,138,0.25) 70deg, transparent 80deg, transparent 120deg, rgba(243,217,138,0.25) 130deg, transparent 140deg, transparent 180deg, rgba(243,217,138,0.25) 190deg, transparent 200deg, transparent 240deg, rgba(243,217,138,0.25) 250deg, transparent 260deg, transparent 300deg, rgba(243,217,138,0.25) 310deg, transparent 320deg)',
            animation: 'heroRaySpinReverse 16s linear infinite',
            pointerEvents: 'none',
            filter: 'blur(4px)',
          }} />
          {/* Logo image avec blink overlay */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nouveaulogochouette.png" alt="AVRA Chouette" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain',
            animation: 'heroLogoShimmer 3s ease-in-out infinite 1.5s',
            transform: blink ? 'scaleY(0.85)' : 'scaleY(1)',
            transformOrigin: 'center 45%',
            transition: 'transform 0.15s ease-out',
          }} />
          {/* Reflet miroir */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nouveaulogochouette.png" alt="" aria-hidden style={{
            position: 'absolute', left: 0, top: '100%', width: '100%', height: '60%',
            objectFit: 'contain', objectPosition: 'top',
            transform: 'scaleY(-1)',
            opacity: 0.28,
            filter: 'blur(1px)',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent 80%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent 80%)',
          }} />
        </div>
      </div>

      <style>{`
        @keyframes heroLogoFloatL {
          0%, 100% { transform: translateY(0) rotate(-4deg) scale(1); }
          50% { transform: translateY(-18px) rotate(4deg) scale(1.06); }
        }
        @keyframes heroLogoFloatR {
          0%, 100% { transform: translateY(0) rotate(4deg) scale(1); }
          50% { transform: translateY(-18px) rotate(-4deg) scale(1.06); }
        }
        @keyframes heroAvraFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.02); }
        }
        @keyframes heroLogoShimmer {
          0%, 100% { filter: brightness(1) saturate(1); }
          50% { filter: brightness(1.25) saturate(1.15); }
        }
        @keyframes heroLogoGlow {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.28); }
        }
        @keyframes heroSepPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes heroStarPulse {
          0%, 100% { opacity: 0.7; transform: translate(-50%, -50%) scale(0.8); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.4); }
        }
        @keyframes heroBannerPulse {
          0%, 100% { opacity: 0.75; }
          50% { opacity: 1; }
        }
        @keyframes heroBannerSheen {
          0% { left: -30%; }
          100% { left: 130%; }
        }
        @keyframes heroRingSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes heroRingSpinReverse {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }
        @keyframes heroRaySpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes heroRaySpinReverse {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }
        @keyframes heroAuroraSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes heroBeamSlide {
          0% { background-position: 0 0; }
          100% { background-position: 200px 200px; }
        }
        @keyframes heroBorderFlow {
          0% { background-position: 0% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes heroParticle {
          0%, 100% { opacity: 0; transform: translateY(0) scale(0.4); }
          15% { opacity: 1; }
          50% { opacity: 1; transform: translateY(-40px) scale(1.4); }
          85% { opacity: 0.7; }
        }
        @keyframes heroTwinkle {
          0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.8) rotate(180deg); }
        }
        @keyframes heroComet {
          0% { transform: translateX(0) translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(120vw) translateY(-40px); opacity: 0; }
        }
        @keyframes heroRipple {
          0% { width: 0; height: 0; opacity: 1; }
          100% { width: 400px; height: 400px; opacity: 0; border-width: 1px; }
        }
        @keyframes auroraWave1 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes auroraWave2 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(14px); }
        }
        @keyframes auroraWave3 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes heroBeamPulse {
          0%, 100% { opacity: 0.1; stroke-dashoffset: 0; }
          50% { opacity: 0.8; stroke-dashoffset: -44; }
        }
        @media (max-width: 1200px) {
          .hero-logo-banner { gap: 32px !important; }
          .hero-logo-center { width: 440px !important; height: 140px !important; }
          .hero-logo-left, .hero-logo-right { width: 170px !important; height: 170px !important; }
        }
        @media (max-width: 768px) {
          .hero-logo-banner { gap: 14px !important; padding: 14px 3% !important; flex-wrap: nowrap; }
          .hero-logo-center { width: 240px !important; height: 80px !important; }
          .hero-logo-left, .hero-logo-right { width: 90px !important; height: 90px !important; }
        }
      `}</style>
    </div>
  );
}
