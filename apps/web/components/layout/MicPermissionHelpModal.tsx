'use client';

/**
 * MicPermissionHelpModal — modale d'aide quand l'utilisateur a un souci avec
 * la permission micro (bloqué, ou state désync entre Chrome et la page).
 *
 * v2 (01/05/2026) — refonte profonde après bug "modale en boucle" :
 *  - VRAI test live de getUserMedia avec LED + niveau audio (AudioContext +
 *    AnalyserNode) → l'utilisateur voit immédiatement si le micro marche
 *  - Mode debug technique (Permissions API state live, support flags, UA,
 *    isSecureContext) avec bouton "Copier diagnostic"
 *  - Auto-rafraîchissement de l'état Permissions via `permissionStatus.onchange`
 *    → ferme auto la modale dès que l'utilisateur passe en "granted"
 *  - Bouton "Recharger la page" mis en action principale (souvent obligatoire
 *    après un toggle Chrome car l'état reste cached jusqu'au reload)
 *  - Détection navigateur (Chrome / Edge / Safari / Firefox) pour adapter
 *    les instructions de réautorisation
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Lock, Mic, RefreshCw, X, Check, ChevronDown, ChevronUp, Copy } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onRetry: () => void;
}

type BrowserKind = 'chrome' | 'edge' | 'safari' | 'firefox' | 'other';
type PermState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'unknown';
type TestState = 'idle' | 'testing' | 'ok' | 'ko';

function detectBrowser(): BrowserKind {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('firefox/')) return 'firefox';
  if (ua.includes('chrome/')) return 'chrome';
  if (ua.includes('safari/')) return 'safari';
  return 'other';
}

export function MicPermissionHelpModal({ open, onClose, onRetry }: Props) {
  const browser = useMemo<BrowserKind>(() => detectBrowser(), []);

  // ── État du test live ──────────────────────────────────────────────────────
  const [testState, setTestState] = useState<TestState>('idle');
  const [testError, setTestError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0); // 0..100
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  // ── État Permissions API live ──────────────────────────────────────────────
  const [permState, setPermState] = useState<PermState>('unknown');
  const permStatusRef = useRef<PermissionStatus | null>(null);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [showDebug, setShowDebug] = useState(false);
  const [copied, setCopied] = useState(false);

  // Capabilities (calculé une fois)
  const caps = useMemo(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        getUserMedia: false,
        speechRecognition: false,
        permissionsApi: false,
        isSecureContext: false,
        userAgent: '',
        host: '',
      };
    }
    return {
      getUserMedia: !!navigator.mediaDevices?.getUserMedia,
      speechRecognition: !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
      permissionsApi: !!(navigator as any).permissions?.query,
      isSecureContext: window.isSecureContext,
      userAgent: navigator.userAgent,
      host: window.location.host,
    };
  }, []);

  // ── Cleanup audio resources ────────────────────────────────────────────────
  const stopAudioTest = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
    setAudioLevel(0);
  };

  // ── ESC pour fermer + cleanup au démontage ────────────────────────────────
  useEffect(() => {
    if (!open) {
      stopAudioTest();
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  // Cleanup garanti au démontage du composant
  useEffect(() => {
    return () => stopAudioTest();
  }, []);

  // ── Surveillance live de la Permissions API ────────────────────────────────
  // Si l'utilisateur passe à "granted" (via toggle Chrome ou prompt accepté),
  // on ferme automatiquement la modale et on relance le flow vocal.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const refresh = (state: PermissionState) => {
      if (cancelled) return;
      setPermState(state);
      if (state === 'granted') {
        // Permission accordée live → ferme la modale et relance
        setTimeout(() => {
          if (!cancelled) {
            onRetry();
            onClose();
          }
        }, 250);
      }
    };

    (async () => {
      if (!(navigator as any).permissions?.query) {
        setPermState('unsupported');
        return;
      }
      try {
        const status: PermissionStatus = await (navigator as any).permissions.query({ name: 'microphone' });
        permStatusRef.current = status;
        refresh(status.state);
        const handler = () => refresh(status.state);
        status.addEventListener?.('change', handler);
        // Fallback pour anciennes implémentations qui n'ont que `onchange`
        try { (status as any).onchange = handler; } catch { /* ignore */ }
      } catch {
        setPermState('unknown');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Test live du micro avec niveau audio ───────────────────────────────────
  const handleTestMic = async () => {
    setTestState('testing');
    setTestError(null);
    stopAudioTest();

    if (!navigator.mediaDevices?.getUserMedia) {
      setTestState('ko');
      setTestError('getUserMedia non supporté par ce navigateur.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setTestState('ok');

      // Visualisation niveau audio
      try {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx: AudioContext = new AudioCtx();
          audioCtxRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);
          const buf = new Uint8Array(analyser.frequencyBinCount);

          const tick = () => {
            analyser.getByteTimeDomainData(buf);
            // RMS approx (centré sur 128)
            let sum = 0;
            for (let i = 0; i < buf.length; i++) {
              const v = (buf[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / buf.length); // 0..1
            // Boost visuel — un parlement normal donne ~0.05..0.15
            const pct = Math.min(100, Math.round(rms * 400));
            setAudioLevel(pct);
            rafRef.current = requestAnimationFrame(tick);
          };
          tick();
        }
      } catch {
        // Le test passe quand même même si l'analyseur foire
      }
    } catch (err: any) {
      const name = err?.name ?? 'unknown';
      setTestState('ko');
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setTestError('Micro toujours bloqué. Cliquez "Recharger la page" puis réessayez.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setTestError('Aucun micro détecté sur cet appareil.');
      } else if (name === 'NotReadableError') {
        setTestError('Le micro est utilisé par une autre application.');
      } else {
        setTestError(`Erreur : ${name}`);
      }
    }
  };

  // ── Reload page (forcer la prise en compte du nouveau permission state) ────
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  // ── Continuer = onRetry après test OK ──────────────────────────────────────
  const handleContinue = () => {
    stopAudioTest();
    onRetry();
    onClose();
  };

  // ── Copier le diagnostic technique ─────────────────────────────────────────
  const handleCopyDiag = async () => {
    const diag = [
      `=== Diagnostic micro AVRA ===`,
      `Date: ${new Date().toISOString()}`,
      `Host: ${caps.host}`,
      `Browser: ${browser}`,
      `isSecureContext: ${caps.isSecureContext}`,
      `getUserMedia: ${caps.getUserMedia}`,
      `SpeechRecognition: ${caps.speechRecognition}`,
      `Permissions API: ${caps.permissionsApi}`,
      `Permission state (live): ${permState}`,
      `Test result: ${testState}${testError ? ` (${testError})` : ''}`,
      `Audio level last: ${audioLevel}`,
      `User-Agent: ${caps.userAgent}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(diag);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback pas de clipboard API
    }
  };

  if (!open) return null;

  // Instructions adaptées par navigateur
  const steps =
    browser === 'firefox'
      ? [
          'En haut à gauche de la barre d\'adresse, cherche l\'icône 🎤 BARRÉE ou un cadenas',
          'Clique dessus → "Autorisations" → trouve "Utiliser le micro" → Autoriser',
          'Recharge la page (bouton bleu ci-dessous)',
        ]
      : browser === 'safari'
        ? [
            'Dans le menu Safari (en haut) → Réglages pour ce site web…',
            'Trouve "Microphone" → choisis "Autoriser"',
            'Recharge la page (bouton bleu ci-dessous)',
          ]
        : [
            'En haut à gauche de la barre d\'adresse, clique sur l\'icône 🔒 (ou ⓘ)',
            'Trouve "Microphone" → bascule sur "Autoriser"',
            'Recharge la page (bouton bleu ci-dessous) — Chrome garde l\'ancien état sinon',
          ];

  // Couleur de la LED de test
  const ledColor =
    testState === 'ok' ? '#22c55e' :
    testState === 'ko' ? '#ef4444' :
    testState === 'testing' ? '#f59e0b' : '#cbd5e1';

  return (
    <>
      <style>{`
        @keyframes mphFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mphReveal {
          from { opacity: 0; transform: scale(0.92) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes mphPulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.06); }
        }
        @keyframes mphArrow {
          0%, 100% { transform: translateX(0); }
          50%      { transform: translateX(-6px); }
        }
        @keyframes mphLedPulse {
          0%, 100% { box-shadow: 0 0 0 0 var(--mph-led-color); }
          50%      { box-shadow: 0 0 0 8px transparent; }
        }
        .mph-bg {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(8, 12, 10, 0.78);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          animation: mphFade 0.25s ease-out;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          overflow-y: auto;
        }
        .mph-card {
          width: 100%; max-width: 520px;
          background: #fff;
          border-radius: 22px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.4), 0 8px 24px rgba(48,64,53,0.18);
          animation: mphReveal 0.42s cubic-bezier(0.34, 1.42, 0.64, 1);
          overflow: hidden;
          max-height: calc(100vh - 32px);
          display: flex; flex-direction: column;
        }
        .mph-scroll { overflow-y: auto; flex: 1; }
        .mph-head {
          position: relative;
          padding: 22px 24px 18px;
          background: linear-gradient(135deg, #2a3a30 0%, #4a6358 100%);
          color: #fff;
          flex-shrink: 0;
        }
        .mph-head-icon {
          width: 52px; height: 52px;
          border-radius: 16px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 6px 20px rgba(220,38,38,0.4);
          margin-bottom: 12px;
          animation: mphPulse 2.5s ease-in-out infinite;
        }
        .mph-title { margin: 0; font-size: 19px; font-weight: 800; letter-spacing: -0.01em; }
        .mph-subtitle { margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.72); line-height: 1.4; }
        .mph-close {
          position: absolute; top: 14px; right: 14px;
          width: 32px; height: 32px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.85);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.18s ease;
        }
        .mph-close:hover { background: rgba(255,255,255,0.2); transform: rotate(90deg); }

        /* Bloc test live */
        .mph-test {
          margin: 18px 24px 0;
          padding: 14px 16px;
          background: linear-gradient(180deg, #f0f7f3 0%, #fbfdfa 100%);
          border-radius: 14px;
          border: 1px solid rgba(34,197,94,0.18);
        }
        .mph-test-row {
          display: flex; align-items: center; gap: 12px;
        }
        .mph-led {
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--mph-led-color);
          flex-shrink: 0;
          transition: background 0.2s ease;
        }
        .mph-led.testing { animation: mphLedPulse 1.2s ease-in-out infinite; }
        .mph-test-text { flex: 1; font-size: 13px; color: #1a1614; font-weight: 600; line-height: 1.4; }
        .mph-test-btn {
          padding: 8px 14px; border-radius: 10px;
          font-size: 12px; font-weight: 700;
          cursor: pointer; border: none;
          background: #fff; color: #1a3d2a;
          border: 1px solid rgba(34,197,94,0.4);
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .mph-test-btn:hover:not(:disabled) { background: #ecfdf5; }
        .mph-test-btn:disabled { opacity: 0.6; cursor: wait; }
        .mph-meter {
          margin-top: 10px;
          height: 8px; background: rgba(0,0,0,0.06);
          border-radius: 4px; overflow: hidden;
        }
        .mph-meter-fill {
          height: 100%;
          background: linear-gradient(90deg, #22c55e, #16a34a);
          transition: width 0.08s ease-out;
          border-radius: 4px;
        }
        .mph-test-error {
          margin-top: 8px;
          font-size: 11.5px; color: #b91c1c; line-height: 1.4;
          padding: 6px 8px; background: #fef2f2;
          border-radius: 6px; border: 1px solid #fecaca;
        }

        /* Illustration du browser bar */
        .mph-illustration {
          margin: 14px 24px 0;
          padding: 14px 16px;
          background: linear-gradient(180deg, #f5eee8 0%, #fbf8f3 100%);
          border-radius: 14px;
          border: 1px solid rgba(48,64,53,0.08);
        }
        .mph-browser-bar {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 10px;
          background: #fff;
          border-radius: 999px;
          border: 1px solid rgba(48,64,53,0.1);
          box-shadow: 0 2px 6px rgba(48,64,53,0.06);
        }
        .mph-lock-icon {
          flex-shrink: 0;
          width: 28px; height: 28px;
          border-radius: 8px;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(245,158,11,0.5);
          animation: mphPulse 1.6s ease-in-out infinite;
          position: relative;
        }
        .mph-lock-icon::after {
          content: ''; position: absolute; inset: -4px;
          border: 2px solid rgba(245,158,11,0.5);
          border-radius: 12px;
          animation: mphPulse 1.6s ease-in-out infinite;
        }
        .mph-arrow {
          color: #f59e0b; flex-shrink: 0;
          animation: mphArrow 1.4s ease-in-out infinite;
          font-weight: 800; font-size: 14px;
        }
        .mph-url {
          flex: 1;
          font-size: 11.5px; color: rgba(48,64,53,0.55);
          font-family: 'Courier New', monospace;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .mph-illustration-label {
          margin-top: 10px;
          text-align: center;
          font-size: 11.5px; color: #b45309; font-weight: 700;
        }

        /* Steps */
        .mph-steps {
          padding: 14px 24px 0;
          display: flex; flex-direction: column; gap: 8px;
        }
        .mph-step {
          display: flex; gap: 12px;
          padding: 10px 12px;
          background: linear-gradient(135deg, #fbf8f3 0%, #fff 100%);
          border-radius: 10px;
          border: 1px solid rgba(48,64,53,0.08);
        }
        .mph-step-num {
          flex-shrink: 0;
          width: 24px; height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a67749, #c89665);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 800;
        }
        .mph-step-text {
          flex: 1; font-size: 12.5px; line-height: 1.45;
          color: #1a1614; font-weight: 500;
        }

        /* Debug panel */
        .mph-debug-toggle {
          margin: 12px 24px 0;
          background: none; border: none;
          font-size: 11.5px; color: #6b6158;
          cursor: pointer;
          display: flex; align-items: center; gap: 4px;
          padding: 4px 0;
          font-weight: 600;
        }
        .mph-debug-toggle:hover { color: #1a1614; }
        .mph-debug {
          margin: 6px 24px 0;
          padding: 10px 12px;
          background: #0f1812; color: #d4f0db;
          border-radius: 10px;
          font-family: 'Courier New', monospace;
          font-size: 11px; line-height: 1.6;
          white-space: pre-wrap; word-break: break-all;
        }
        .mph-debug-row { display: flex; justify-content: space-between; gap: 10px; }
        .mph-debug-key { color: #94a3b8; }
        .mph-debug-val { color: #d4f0db; font-weight: 600; }
        .mph-debug-val.ok { color: #4ade80; }
        .mph-debug-val.ko { color: #f87171; }
        .mph-copy-btn {
          margin-top: 8px;
          padding: 6px 10px; border-radius: 8px;
          font-size: 11px; font-weight: 700;
          cursor: pointer; border: 1px solid rgba(74,222,128,0.4);
          background: rgba(74,222,128,0.1); color: #d4f0db;
          display: inline-flex; align-items: center; gap: 5px;
          transition: all 0.15s;
        }
        .mph-copy-btn:hover { background: rgba(74,222,128,0.2); }

        /* Footer */
        .mph-foot {
          padding: 16px 24px 20px;
          margin-top: 14px;
          display: flex; gap: 8px; justify-content: flex-end;
          border-top: 1px solid rgba(48,64,53,0.06);
          background: rgba(48,64,53,0.02);
          flex-shrink: 0;
          flex-wrap: wrap;
        }
        .mph-btn {
          padding: 10px 16px; border-radius: 11px;
          font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.18s ease;
          border: none; font-family: inherit;
          display: inline-flex; align-items: center; gap: 7px;
        }
        .mph-btn-cancel {
          background: rgba(48,64,53,0.06); color: #1a1614;
        }
        .mph-btn-cancel:hover { background: rgba(48,64,53,0.12); }
        .mph-btn-continue {
          background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
          color: #fff;
          box-shadow: 0 6px 16px rgba(34,197,94,0.35);
        }
        .mph-btn-continue:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(34,197,94,0.45);
        }
        /* Reload est l'action principale (souvent obligatoire après toggle Chrome) */
        .mph-btn-reload {
          background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
          color: #fff;
          box-shadow: 0 6px 16px rgba(59,130,246,0.45);
          padding: 11px 20px; font-size: 13.5px;
          order: 99; /* tout à droite */
        }
        .mph-btn-reload:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(59,130,246,0.55);
        }

        @keyframes mphSpin { to { transform: rotate(360deg); } }
        .mph-spin { animation: mphSpin 0.85s linear infinite; }
      `}</style>

      <div className="mph-bg" role="dialog" aria-modal="true" onClick={onClose}>
        <div className="mph-card" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="mph-head">
            <button type="button" className="mph-close" onClick={onClose} aria-label="Fermer">
              <X style={{ width: 16, height: 16 }} />
            </button>
            <div className="mph-head-icon">
              <Mic style={{ width: 26, height: 26, color: '#fff' }} />
            </div>
            <h2 className="mph-title">Problème d'accès au micro</h2>
            <p className="mph-subtitle">
              Testez votre micro maintenant, ou suivez les étapes pour réautoriser AVRA.
            </p>
          </div>

          <div className="mph-scroll">
            {/* Bloc test live */}
            <div className="mph-test" style={{ ['--mph-led-color' as any]: ledColor }}>
              <div className="mph-test-row">
                <div className={`mph-led ${testState === 'testing' ? 'testing' : ''}`} />
                <div className="mph-test-text">
                  {testState === 'idle' && 'Cliquez "Tester le micro" pour vérifier l\'accès.'}
                  {testState === 'testing' && 'Test en cours…'}
                  {testState === 'ok' && 'Micro fonctionnel — parlez pour voir le niveau ↓'}
                  {testState === 'ko' && (testError || 'Le micro ne répond pas.')}
                </div>
                <button
                  type="button"
                  className="mph-test-btn"
                  onClick={handleTestMic}
                  disabled={testState === 'testing'}
                >
                  {testState === 'idle' && 'Tester le micro'}
                  {testState === 'testing' && 'Test…'}
                  {testState === 'ok' && 'Re-tester'}
                  {testState === 'ko' && 'Re-tester'}
                </button>
              </div>
              {testState === 'ok' && (
                <div className="mph-meter" aria-label="Niveau audio">
                  <div className="mph-meter-fill" style={{ width: `${audioLevel}%` }} />
                </div>
              )}
              {testState === 'ko' && testError && (
                <div className="mph-test-error">{testError}</div>
              )}
            </div>

            {/* Illustration de la barre d'adresse */}
            <div className="mph-illustration">
              <div className="mph-browser-bar">
                <span className="mph-arrow">←</span>
                <div className="mph-lock-icon">
                  <Lock style={{ width: 14, height: 14 }} />
                </div>
                <div className="mph-url">{caps.host || 'avra-kappa.vercel.app'}</div>
              </div>
              <div className="mph-illustration-label">
                ↑ Cliquez sur cette icône en haut de votre navigateur
              </div>
            </div>

            {/* Steps */}
            <div className="mph-steps">
              {steps.map((text, i) => (
                <div key={i} className="mph-step">
                  <div className="mph-step-num">{i + 1}</div>
                  <div className="mph-step-text">{text}</div>
                </div>
              ))}
            </div>

            {/* Debug panel */}
            <button
              type="button"
              className="mph-debug-toggle"
              onClick={() => setShowDebug((v) => !v)}
            >
              {showDebug ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
              Détails techniques
            </button>
            {showDebug && (
              <div className="mph-debug">
                <div className="mph-debug-row">
                  <span className="mph-debug-key">Permission state (live)</span>
                  <span className={`mph-debug-val ${permState === 'granted' ? 'ok' : permState === 'denied' ? 'ko' : ''}`}>{permState}</span>
                </div>
                <div className="mph-debug-row">
                  <span className="mph-debug-key">isSecureContext</span>
                  <span className={`mph-debug-val ${caps.isSecureContext ? 'ok' : 'ko'}`}>{String(caps.isSecureContext)}</span>
                </div>
                <div className="mph-debug-row">
                  <span className="mph-debug-key">getUserMedia</span>
                  <span className={`mph-debug-val ${caps.getUserMedia ? 'ok' : 'ko'}`}>{String(caps.getUserMedia)}</span>
                </div>
                <div className="mph-debug-row">
                  <span className="mph-debug-key">SpeechRecognition</span>
                  <span className={`mph-debug-val ${caps.speechRecognition ? 'ok' : 'ko'}`}>{String(caps.speechRecognition)}</span>
                </div>
                <div className="mph-debug-row">
                  <span className="mph-debug-key">Permissions API</span>
                  <span className={`mph-debug-val ${caps.permissionsApi ? 'ok' : 'ko'}`}>{String(caps.permissionsApi)}</span>
                </div>
                <div className="mph-debug-row">
                  <span className="mph-debug-key">Browser</span>
                  <span className="mph-debug-val">{browser}</span>
                </div>
                <div className="mph-debug-row">
                  <span className="mph-debug-key">Host</span>
                  <span className="mph-debug-val">{caps.host}</span>
                </div>
                <button type="button" className="mph-copy-btn" onClick={handleCopyDiag}>
                  <Copy style={{ width: 11, height: 11 }} />
                  {copied ? 'Copié !' : 'Copier diagnostic'}
                </button>
              </div>
            )}
          </div>

          {/* Footer — Recharger en action principale (à droite) */}
          <div className="mph-foot">
            <button type="button" className="mph-btn mph-btn-cancel" onClick={onClose}>
              Plus tard
            </button>
            {testState === 'ok' && (
              <button type="button" className="mph-btn mph-btn-continue" onClick={handleContinue}>
                <Check style={{ width: 14, height: 14 }} />
                Continuer
              </button>
            )}
            <button
              type="button"
              className="mph-btn mph-btn-reload"
              onClick={handleReload}
              title="Recharge la page pour forcer Chrome à prendre en compte la nouvelle permission micro"
            >
              <RefreshCw style={{ width: 15, height: 15 }} />
              Recharger la page
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
