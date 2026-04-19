'use client';
import { useEffect, useState } from 'react';

interface Props {
  variant?: 'nav' | 'hero' | 'card';
  className?: string;
}

export default function PWAInstallButton({ variant = 'hero' }: Props) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(!showIOSGuide);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  if (installed) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        padding: '10px 20px', borderRadius: '12px',
        background: 'rgba(74,124,89,0.2)', border: '1px solid rgba(74,124,89,0.4)',
        color: '#4A7C59', fontSize: '0.9rem', fontWeight: 600,
      }}>
        ✓ Application déjà installée
      </div>
    );
  }

  if (variant === 'nav') {
    return (
      <button
        onClick={handleInstall}
        title="Installer l'application AVRA"
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '0.8rem', fontWeight: 600,
          color: '#C9A96E',
          padding: '7px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(201,169,110,0.3)',
          background: 'rgba(201,169,110,0.08)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(201,169,110,0.18)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,169,110,0.6)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(201,169,110,0.08)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,169,110,0.3)';
        }}
      >
        <span>📲</span>
        <span>App</span>
      </button>
    );
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={handleInstall}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px',
          fontSize: '1rem', fontWeight: 700,
          color: '#0e1810',
          padding: '14px 28px',
          borderRadius: '14px',
          border: 'none',
          background: 'linear-gradient(135deg, #e8c97a 0%, #C9A96E 100%)',
          cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(201,169,110,0.45), 0 2px 8px rgba(0,0,0,0.3)',
          transition: 'all 0.25s ease',
          animation: 'installPulse 3s ease-in-out infinite',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 48px rgba(201,169,110,0.6), 0 4px 12px rgba(0,0,0,0.3)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(201,169,110,0.45), 0 2px 8px rgba(0,0,0,0.3)';
        }}
      >
        <span style={{ fontSize: '1.2rem' }}>📲</span>
        {isIOS ? 'Installer sur iPhone / iPad' : deferredPrompt ? 'Installer gratuitement' : 'Installer l\'application'}
      </button>

      {showIOSGuide && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 12px)', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(14,24,16,0.97)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(201,169,110,0.25)', borderRadius: '16px',
          padding: '20px', width: '260px', zIndex: 200,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7 }}>
            <div style={{ fontWeight: 700, color: '#C9A96E', marginBottom: '8px', fontSize: '0.92rem' }}>📱 Sur iPhone / iPad :</div>
            <div>1. Appuyer sur <strong style={{ color: '#e8c97a' }}>Partager</strong> ↑</div>
            <div>2. Choisir <strong style={{ color: '#e8c97a' }}>"Sur l'écran d'accueil"</strong></div>
            <div>3. Appuyer sur <strong style={{ color: '#e8c97a' }}>Ajouter</strong></div>
          </div>
          <div style={{
            position: 'absolute', bottom: '-8px', left: '50%',
            width: '16px', height: '16px',
            background: 'rgba(14,24,16,0.97)',
            border: '1px solid rgba(201,169,110,0.25)',
            borderTop: 'none', borderLeft: 'none',
            transform: 'translateX(-50%) rotate(45deg)',
          }} />
        </div>
      )}

      <style>{`
        @keyframes installPulse {
          0%, 100% { box-shadow: 0 8px 32px rgba(201,169,110,0.45), 0 2px 8px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 8px 48px rgba(201,169,110,0.7), 0 2px 8px rgba(0,0,0,0.3); }
        }
      `}</style>
    </div>
  );
}
