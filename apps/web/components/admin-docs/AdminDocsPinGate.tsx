'use client';

/**
 * AdminDocsPinGate — verrou par code à 4 chiffres devant le « Dossier administratif ».
 *
 * Confidentialité au-delà de l'authentification (la page reste protégée par le
 * JWT côté serveur). C'est un « écran de veille » : quelqu'un qui regarde par
 * dessus l'épaule ne peut pas ouvrir les documents sensibles.
 *
 * CHANGEMENT (sept. 2026) — retour cofondatrice, point 26 :
 *   « Alors c'était pas ma demande, si le gérant n'est pas sur son ordi il doit
 *     bien y avoir accès avec son code sur un autre ordinateur ou portable, je
 *     pense surtout que c'est le temps d'accès à déterminer pour pas que les
 *     employés aille voir sur l'ordinateur du patron. »
 *
 * Le verrou était auparavant LIÉ À L'ORDINATEUR : le dossier ne s'ouvrait que
 * sur le poste qui avait créé le code, et il fallait le mot de passe du compte
 * pour le débloquer ailleurs. Ce n'était pas ce qui était demandé, et ça bloquait
 * le gérant en déplacement.
 *
 * Désormais :
 *  - le code suffit, depuis N'IMPORTE QUEL ordinateur ou téléphone ;
 *  - le code est redemandé à CHAQUE ouverture de la page ;
 *  - et surtout, le dossier se REVERROUILLE TOUT SEUL après un moment sans
 *    activité — c'est ça qui empêche un employé d'aller regarder sur le poste
 *    du patron resté ouvert.
 *  - « Code oublié ? » → réinitialisation protégée par le mot de passe du compte.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Lock, ShieldCheck, Delete, ArrowLeft, KeyRound } from 'lucide-react';
import { useConfigStore } from '@/store/useConfigStore';
import { api } from '@/lib/api';

const LEN = 4;

/** Délai sans activité au bout duquel le dossier se referme tout seul. */
const INACTIVITY_MS = 5 * 60 * 1000; // 5 minutes
const INACTIVITY_LABEL = '5 minutes';

type Mode = 'enter' | 'setup-new' | 'setup-confirm' | 'reset-password';

export function AdminDocsPinGate({ children }: { children: React.ReactNode }) {
  const storedPin = useConfigStore((s) => s.adminDocsPin);
  const setAdminDocsPin = useConfigStore((s) => s.setAdminDocsPin);

  const [unlocked, setUnlocked] = useState(false);
  const [mode, setMode] = useState<Mode>('enter');
  const [buffer, setBuffer] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  /** Message affiché quand la fermeture vient de l'inactivité, pas d'un refus. */
  const [autoLocked, setAutoLocked] = useState(false);

  // Mot de passe (réinitialisation du code)
  const [pwd, setPwd] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);

  // Le code arrive après le montage (hydratation depuis le compte) : on aligne
  // le mode, sans bousculer une saisie de mot de passe en cours.
  useEffect(() => {
    if (unlocked) return;
    setMode((m) => (m === 'reset-password' ? m : storedPin ? 'enter' : 'setup-new'));
  }, [storedPin, unlocked]);

  const fail = useCallback((msg: string) => {
    setError(msg);
    setShake(true);
    setBuffer('');
    setTimeout(() => setShake(false), 450);
  }, []);

  // Validation quand 4 chiffres sont saisis.
  useEffect(() => {
    if (buffer.length !== LEN) return;
    const code = buffer;
    if (mode === 'enter') {
      if (code === storedPin) { setAutoLocked(false); setUnlocked(true); }
      else fail('Code incorrect. Réessayez.');
    } else if (mode === 'setup-new') {
      setFirstPin(code); setBuffer(''); setError(''); setMode('setup-confirm');
    } else if (mode === 'setup-confirm') {
      if (code === firstPin) {
        // `null` en 2e argument : on efface l'ancien verrou par appareil, qui
        // n'a plus cours.
        setAdminDocsPin(code, null);
        setAutoLocked(false);
        setUnlocked(true);
      } else {
        setFirstPin(''); setMode('setup-new'); fail('Les deux codes ne correspondent pas. Recommencez.');
      }
    }
  }, [buffer, mode, storedPin, firstPin, fail, setAdminDocsPin]);

  // ── Reverrouillage automatique après inactivité ────────────────────────────
  // Tout ce qui prouve une présence humaine (souris, clavier, défilement,
  // toucher) repousse l'échéance. Sinon, au bout du délai, on referme le
  // dossier et le code est redemandé.
  const idleTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!unlocked) return;
    const relock = () => {
      setUnlocked(false);
      setBuffer('');
      setError('');
      setMode('enter');
      setAutoLocked(true);
    };
    const arm = () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(relock, INACTIVITY_MS);
    };
    const events: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'];
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    arm();
    return () => {
      events.forEach((e) => window.removeEventListener(e, arm));
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [unlocked]);

  const push = useCallback((d: string) => { setError(''); setBuffer((b) => (b.length < LEN ? b + d : b)); }, []);
  const back = useCallback(() => { setError(''); setBuffer((b) => b.slice(0, -1)); }, []);

  // Saisie clavier pour les modes chiffres.
  useEffect(() => {
    if (unlocked || mode === 'reset-password') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') push(e.key);
      else if (e.key === 'Backspace') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [unlocked, mode, push, back]);

  // Réinitialisation du code, protégée par le mot de passe du compte.
  const submitReset = useCallback(async () => {
    if (!pwd || pwdBusy) return;
    setPwdBusy(true); setError('');
    try {
      const r = await api<{ valid: boolean }>('/auth/verify-password', {
        method: 'POST', body: JSON.stringify({ password: pwd }),
      });
      if (r?.valid) {
        setAdminDocsPin(null, null);
        setPwd(''); setFirstPin(''); setBuffer(''); setError('');
        setMode('setup-new');
      } else {
        setError('Mot de passe incorrect.');
      }
    } catch {
      setError('Impossible de vérifier le mot de passe. Réessayez.');
    } finally {
      setPwdBusy(false);
    }
  }, [pwd, pwdBusy, setAdminDocsPin]);

  if (unlocked) return <>{children}</>;

  const keys = ['1','2','3','4','5','6','7','8','9'];
  const isPasswordMode = mode === 'reset-password';

  const title =
    mode === 'enter' ? 'Dossier administratif verrouillé'
    : mode === 'setup-new' ? 'Créez votre code d’accès'
    : mode === 'setup-confirm' ? 'Confirmez votre code'
    : 'Réinitialiser le code';
  const subtitle =
    mode === 'enter'
      ? (autoLocked
          ? `Verrouillé automatiquement après ${INACTIVITY_LABEL} sans activité. Saisissez votre code pour reprendre.`
          : 'Saisissez votre code à 4 chiffres pour accéder à vos documents.')
    : mode === 'setup-new' ? 'Choisissez un code à 4 chiffres. Il vous suivra sur tous vos appareils.'
    : mode === 'setup-confirm' ? 'Saisissez à nouveau le même code pour le confirmer.'
    : 'Pour définir un nouveau code, confirmez votre mot de passe de compte.';

  return (
    <div className="flex items-center justify-center py-10" style={{ minHeight: '70vh' }}>
      <style>{`
        @keyframes avraPinShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
        .avra-pin-shake { animation: avraPinShake .45s ease; }
      `}</style>
      <div className={`w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-xl border border-[#304035]/8 ${shake ? 'avra-pin-shake' : ''}`}>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#304035]">
          {isPasswordMode ? <KeyRound className="h-7 w-7 text-[#c9a96e]" />
            : <Lock className="h-7 w-7 text-[#c9a96e]" />}
        </div>
        <h2 className="text-lg font-bold text-[#304035]">{title}</h2>
        <p className="mt-1.5 text-sm text-[#304035]/55 leading-relaxed">{subtitle}</p>

        {isPasswordMode ? (
          <div className="mt-6 text-left">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#304035]/50">Mot de passe du compte</label>
            <input
              type="password"
              autoFocus
              value={pwd}
              onChange={(e) => { setPwd(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submitReset(); }}
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/50 px-3.5 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
            />
            {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
            <button
              type="button"
              onClick={submitReset}
              disabled={!pwd || pwdBusy}
              className="mt-4 w-full rounded-xl bg-[#304035] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#3d5244] disabled:opacity-40"
            >
              {pwdBusy ? 'Vérification…' : 'Valider et redéfinir un code'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('enter'); setPwd(''); setError(''); }}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#304035]/50 hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Annuler
            </button>
          </div>
        ) : (
          <>
            <div className="my-7 flex items-center justify-center gap-3.5">
              {Array.from({ length: LEN }).map((_, i) => (
                <span key={i} className="h-4 w-4 rounded-full transition-all"
                  style={{ background: i < buffer.length ? '#c9a96e' : 'transparent', border: `2px solid ${i < buffer.length ? '#c9a96e' : 'rgba(48,64,53,0.25)'}` }} />
              ))}
            </div>
            {/* Hauteur réservée : le message d'erreur ne décale plus le pavé
                (sinon une frappe rapide tombe à côté). */}
            <div className="mb-3 min-h-[20px]">
              {error && <p className="text-sm font-medium text-red-500">{error}</p>}
            </div>
            <div className="mx-auto grid max-w-[240px] grid-cols-3 gap-3">
              {keys.map((k) => (
                <button key={k} type="button" onClick={() => push(k)}
                  className="h-14 rounded-2xl bg-[#f5eee8] text-xl font-semibold text-[#304035] transition-all hover:bg-[#304035]/10 active:scale-95">{k}</button>
              ))}
              <span />
              <button type="button" onClick={() => push('0')}
                className="h-14 rounded-2xl bg-[#f5eee8] text-xl font-semibold text-[#304035] transition-all hover:bg-[#304035]/10 active:scale-95">0</button>
              <button type="button" onClick={back} aria-label="Effacer"
                className="flex h-14 items-center justify-center rounded-2xl text-[#304035]/60 transition-all hover:bg-[#304035]/5 active:scale-95"><Delete className="h-6 w-6" /></button>
            </div>

            {mode === 'enter' ? (
              <>
                <button type="button" onClick={() => { setMode('reset-password'); setBuffer(''); setError(''); }}
                  className="mt-6 text-xs font-medium text-[#a67749] hover:underline">Code oublié ? Réinitialiser</button>
                <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#304035]/40">
                  <ShieldCheck className="h-3.5 w-3.5" /> Reverrouillage auto après {INACTIVITY_LABEL} sans activité
                </p>
              </>
            ) : mode === 'setup-confirm' ? (
              <button type="button" onClick={() => { setMode('setup-new'); setFirstPin(''); setBuffer(''); setError(''); }}
                className="mt-6 inline-flex items-center gap-1 text-xs font-medium text-[#304035]/50 hover:underline">
                <ArrowLeft className="h-3.5 w-3.5" /> Recommencer</button>
            ) : (
              <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-[#304035]/40">
                <ShieldCheck className="h-3.5 w-3.5" /> Code synchronisé sur tous vos appareils</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
