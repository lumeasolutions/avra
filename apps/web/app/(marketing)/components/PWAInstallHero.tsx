'use client';

import { useState, useEffect } from 'react';

export function PWAInstallHero() {
  const [deferredPrompt, setDP] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }
    const handler = (e: Event) => { e.preventDefault(); setDP(e); };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  const handleInstall = async () => {
    if (isIOS) { setShowGuide(!showGuide); return; }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDP(null);
  };

  if (installed) {
    return (
      <div style={{ color: '#4A7C59', fontWeight: 600, fontSize: '1rem' }}>
        ✓ Application déjà installée
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={handleInstall}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '12px',
          fontSize: '1.05rem', fontWeight: 700, color: '#0e1810',
          padding: '16px 36px', borderRadius: '16px', border: 'none',
          background: 'linear-gradient(135deg, #e8c97a 0%, #C9A96E 100%)',
          cursor: 'pointer',
          boxShadow: '0 8px 40px rgba(201,169,110,0.5)',
          animation: 'pwaBtnPulse 3s ease-in-out infinite',
          transition: 'all 0.25s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 56px rgba(201,169,110,0.65)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 40px rgba(201,169,110,0.5)';
        }}
      >
        <span style={{ fontSize: '1.3rem' }}>📲</span>
        {isIOS
          ? 'Voir comment installer sur iPhone'
          : deferredPrompt
            ? "Installer l'application gratuitement"
            : "Télécharger l'application"}
      </button>

      {showGuide && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 16px)', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(14,24,16,0.97)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(201,169,110,0.3)', borderRadius: '16px',
          padding: '20px 24px', width: '280px', zIndex: 200,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}>
          <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.8 }}>
            <div style={{ fontWeight: 700, color: '#C9A96E', marginBottom: '10px' }}>📱 Sur iPhone / iPad :</div>
            <div>1. Appuyez sur <strong style={{ color: '#e8c97a' }}>Partager</strong> ↑ (en bas de Safari)</div>
            <div>2. Choisissez <strong style={{ color: '#e8c97a' }}>&quot;Sur l&apos;écran d&apos;accueil&quot;</strong></div>
            <div>3. Appuyez sur <strong style={{ color: '#e8c97a' }}>Ajouter</strong> ✓</div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pwaBtnPulse {
          0%, 100% { box-shadow: 0 8px 40px rgba(201,169,110,0.5); }
          50% { box-shadow: 0 8px 60px rgba(201,169,110,0.75); }
        }
      `}</style>
    </div>
  );
}

export function PWAInstallCCM() {
  const [deferredPrompt, setDP] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);
    if (window.matchMedia('(display-mode: standalone)').matches) { setInstalled(true); return; }
    const handler = (e: Event) => { e.preventDefault(); setDP(e); };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  const handleInstall = async () => {
    if (isIOS) { setShowGuide(!showGuide); return; }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDP(null);
  };

  if (installed) return (
    <div style={{ color: '#4A7C59', fontWeight: 600, fontSize: '1rem' }}>
      ✓ Application déjà installée sur cet appareil
    </div>
  );

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={handleInstall} style={{
        display: 'inline-flex', alignItems: 'center', gap: '12px',
        fontSize: '1.05rem', fontWeight: 700, color: '#0e1810',
        padding: '16px 40px', borderRadius: '16px', border: 'none',
        background: 'linear-gradient(135deg, #e8c97a 0%, #C9A96E 100%)',
        cursor: 'pointer', boxShadow: '0 8px 40px rgba(201,169,110,0.5)',
        transition: 'all 0.25s ease',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 56px rgba(201,169,110,0.65)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 40px rgba(201,169,110,0.5)'; }}
      >
        <span style={{ fontSize: '1.3rem' }}>📲</span>
        {isIOS
          ? 'Voir comment installer sur iPhone'
          : deferredPrompt
            ? "Installer l'app maintenant — gratuit"
            : "Installer l'application AVRA"}
      </button>
      {showGuide && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 16px)', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(14,24,16,0.97)', border: '1px solid rgba(201,169,110,0.3)',
          borderRadius: '16px', padding: '20px 24px', width: '280px', zIndex: 200,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}>
          <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.8 }}>
            <div style={{ fontWeight: 700, color: '#C9A96E', marginBottom: '10px' }}>📱 Sur iPhone / iPad :</div>
            <div>1. Appuyez sur <strong style={{ color: '#e8c97a' }}>Partager</strong> ↑</div>
            <div>2. Choisissez <strong style={{ color: '#e8c97a' }}>&quot;Sur l&apos;écran d&apos;accueil&quot;</strong></div>
            <div>3. Appuyez sur <strong style={{ color: '#e8c97a' }}>Ajouter</strong> ✓</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PWAInstallTarifs() {
  const [dp, setDp] = useState<any>(null);
  const [ok, setOk] = useState(false);
  const [ios, setIos] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    if (window.matchMedia('(display-mode: standalone)').matches) { setOk(true); return; }
    const h = (e: Event) => { e.preventDefault(); setDp(e); };
    window.addEventListener('beforeinstallprompt', h as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', h as EventListener);
  }, []);

  const go = async () => {
    if (ios) { setShowGuide(!showGuide); return; }
    if (!dp) return;
    dp.prompt();
    const { outcome } = await dp.userChoice;
    if (outcome === 'accepted') setOk(true);
    setDp(null);
  };

  if (ok) return <div style={{ color: '#4A7C59', fontWeight: 600 }}>✓ App installée</div>;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={go} style={{
        flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '10px',
        fontSize: '0.95rem', fontWeight: 700, color: '#0e1810',
        padding: '14px 28px', borderRadius: '12px', border: 'none',
        background: 'linear-gradient(135deg, #e8c97a, #C9A96E)',
        cursor: 'pointer', boxShadow: '0 4px 24px rgba(201,169,110,0.4)',
        whiteSpace: 'nowrap', transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(201,169,110,0.55)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(201,169,110,0.4)'; }}
      >
        <span>📲</span>
        {ios ? 'Guide installation iPhone' : dp ? "Installer l'app" : "Télécharger l'app"}
      </button>
      {showGuide && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 12px)', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(14,24,16,0.97)', border: '1px solid rgba(201,169,110,0.3)',
          borderRadius: '14px', padding: '16px 20px', width: '260px', zIndex: 200,
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        }}>
          <div style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.8 }}>
            <div style={{ fontWeight: 700, color: '#C9A96E', marginBottom: '8px' }}>📱 Sur iPhone :</div>
            <div>1. Partager ↑ dans Safari</div>
            <div>2. &quot;Sur l&apos;écran d&apos;accueil&quot;</div>
            <div>3. Ajouter ✓</div>
          </div>
        </div>
      )}
    </div>
  );
}
