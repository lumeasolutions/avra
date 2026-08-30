'use client';

/**
 * AdminDocsPinGate — verrou par code à 4 chiffres devant le « Dossier administratif »,
 * LIÉ À L'ORDINATEUR qui a créé le code.
 *
 * Confidentialité au-delà de l'authentification (la page reste protégée par le
 * JWT côté serveur). C'est un « écran de veille » : quelqu'un qui regarde par
 * dessus l'épaule — ou un autre membre du compte sur un autre poste — ne peut
 * pas ouvrir les documents sensibles.
 *
 * - Le code est stocké sur le COMPTE (useConfigStore → WorkspaceSettings.extra),
 *   ainsi que l'IDENTIFIANT DE L'ORDINATEUR propriétaire (celui qui a créé le
 *   code). Le dossier ne s'ouvre QUE sur cet ordinateur.
 * - 1ère utilisation → définition du code (saisie + confirmation) : l'ordinateur
 *   courant devient propriétaire.
 * - Ensuite, sur l'ordinateur propriétaire → code demandé à chaque accès.
 * - Sur UN AUTRE ordinateur → écran « Verrouillé sur un autre ordinateur » +
 *   bouton « Débloquer sur cet ordinateur » protégé par le MOT DE PASSE du
 *   compte (rebranche la propriété sur ce poste, code inchangé).
 * - « Code oublié ? » → réinitialisation protégée par le MOT DE PASSE du compte.
 */

import { useEffect, useState, useCallback } from 'react';
import { Lock, ShieldCheck, Delete, ArrowLeft, KeyRound, MonitorSmartphone } from 'lucide-react';
import { useConfigStore } from '@/store/useConfigStore';
import { api } from '@/lib/api';

const LEN = 4;
type Mode = 'enter' | 'setup-new' | 'setup-confirm' | 'reset-password' | 'locked-other' | 'unlock-other';

/** Identifiant stable de CET ordinateur (navigateur), créé une fois puis persistant. */
function getOrCreateDeviceId(): string {
  try {
    const KEY = 'avra_admin_device_id';
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return 'device-unknown';
  }
}

export function AdminDocsPinGate({ children }: { children: React.ReactNode }) {
  const storedPin = useConfigStore((s) => s.adminDocsPin);
  const storedDeviceId = useConfigStore((s) => s.adminDocsDeviceId);
  const setAdminDocsPin = useConfigStore((s) => s.setAdminDocsPin);
  const setAdminDocsDevice = useConfigStore((s) => s.setAdminDocsDevice);

  // Identité de l'ordinateur — résolue côté client uniquement (évite un
  // mismatch d'hydratation SSR).
  const [deviceId, setDeviceId] = useState<string | null>(null);
  useEffect(() => { setDeviceId(getOrCreateDeviceId()); }, []);

  const [unlocked, setUnlocked] = useState(false);
  const [mode, setMode] = useState<Mode>('enter');
  const [buffer, setBuffer] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  // Mot de passe (réinitialisation OU déblocage sur cet ordinateur)
  const [pwd, setPwd] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);

  // Est-ce que CET ordinateur est propriétaire ? (pas de code encore, ou pas de
  // propriétaire enregistré, ou l'id correspond)
  const lockedToOther = !!storedPin && !!storedDeviceId && !!deviceId && storedDeviceId !== deviceId;

  // Aligne le mode sur l'état stocké (le code + le device arrivent après le
  // montage via l'hydratation backend). On ne bouscule pas une saisie de mot
  // de passe en cours.
  useEffect(() => {
    if (unlocked || deviceId == null) return;
    setMode((m) => {
      if (m === 'reset-password' || m === 'unlock-other') return m;
      if (!storedPin) return 'setup-new';
      if (storedDeviceId && storedDeviceId !== deviceId) return 'locked-other';
      return 'enter';
    });
  }, [storedPin, storedDeviceId, deviceId, unlocked]);

  const fail = useCallback((msg: string) => {
    setError(msg);
    setShake(true);
    setBuffer('');
    setTimeout(() => setShake(false), 450);
  }, []);

  // Validation quand 4 chiffres saisis.
  useEffect(() => {
    if (buffer.length !== LEN) return;
    const code = buffer;
    if (mode === 'enter') {
      if (code === storedPin) setUnlocked(true);
      else fail('Code incorrect. Réessayez.');
    } else if (mode === 'setup-new') {
      setFirstPin(code); setBuffer(''); setError(''); setMode('setup-confirm');
    } else if (mode === 'setup-confirm') {
      if (code === firstPin) {
        // Création du code → cet ordinateur devient propriétaire.
        setAdminDocsPin(code, deviceId ?? getOrCreateDeviceId());
        setUnlocked(true);
      } else {
        setFirstPin(''); setMode('setup-new'); fail('Les deux codes ne correspondent pas. Recommencez.');
      }
    }
  }, [buffer, mode, storedPin, firstPin, fail, setAdminDocsPin, deviceId]);

  const push = useCallback((d: string) => { setError(''); setBuffer((b) => (b.length < LEN ? b + d : b)); }, []);
  const back = useCallback(() => { setError(''); setBuffer((b) => b.slice(0, -1)); }, []);

  // Saisie clavier pour les modes chiffres.
  useEffect(() => {
    if (unlocked || mode === 'reset-password' || mode === 'unlock-other' || mode === 'locked-other') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') push(e.key);
      else if (e.key === 'Backspace') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [unlocked, mode, push, back]);

  // Réinitialisation du code (ordinateur propriétaire) : efface code + propriétaire.
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

  // Déblocage sur CET ordinateur : mot de passe → transfère la propriété ici
  // (le code reste inchangé). Ensuite, saisie du code habituelle.
  const submitUnlockHere = useCallback(async () => {
    if (!pwd || pwdBusy) return;
    setPwdBusy(true); setError('');
    try {
      const r = await api<{ valid: boolean }>('/auth/verify-password', {
        method: 'POST', body: JSON.stringify({ password: pwd }),
      });
      if (r?.valid) {
        setAdminDocsDevice(deviceId ?? getOrCreateDeviceId());
        setPwd(''); setBuffer(''); setError('');
        setMode('enter');
      } else {
        setError('Mot de passe incorrect.');
      }
    } catch {
      setError('Impossible de vérifier le mot de passe. Réessayez.');
    } finally {
      setPwdBusy(false);
    }
  }, [pwd, pwdBusy, setAdminDocsDevice, deviceId]);

  if (unlocked) return <>{children}</>;

  // Tant que l'identité de l'ordinateur n'est pas résolue, on ne montre rien de
  // sensible (bref écran neutre).
  if (deviceId == null) {
    return <div className="flex items-center justify-center py-10" style={{ minHeight: '70vh' }} />;
  }

  const keys = ['1','2','3','4','5','6','7','8','9'];
  const isPasswordMode = mode === 'reset-password' || mode === 'unlock-other';
  const isLockedOther = mode === 'locked-other';

  const title =
    mode === 'enter' ? 'Dossier administratif verrouillé'
    : mode === 'setup-new' ? 'Créez votre code d’accès'
    : mode === 'setup-confirm' ? 'Confirmez votre code'
    : mode === 'locked-other' ? 'Verrouillé sur un autre ordinateur'
    : mode === 'unlock-other' ? 'Débloquer sur cet ordinateur'
    : 'Réinitialiser le code';
  const subtitle =
    mode === 'enter' ? 'Saisissez votre code à 4 chiffres pour accéder à vos documents.'
    : mode === 'setup-new' ? 'Choisissez un code à 4 chiffres. Cet ordinateur deviendra le seul à pouvoir ouvrir le dossier.'
    : mode === 'setup-confirm' ? 'Saisissez à nouveau le même code pour le confirmer.'
    : mode === 'locked-other' ? 'Ce dossier a été verrouillé depuis un autre ordinateur. Pour l’ouvrir ici, débloquez-le avec le mot de passe du compte.'
    : mode === 'unlock-other' ? 'Confirmez le mot de passe du compte pour transférer l’accès sur cet ordinateur (le code reste le même).'
    : 'Pour définir un nouveau code, confirmez votre mot de passe de compte.';

  return (
    <div className="flex items-center justify-center py-10" style={{ minHeight: '70vh' }}>
      <style>{`
        @keyframes avraPinShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
        .avra-pin-shake { animation: avraPinShake .45s ease; }
      `}</style>
      <div className={`w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-xl border border-[#304035]/8 ${shake ? 'avra-pin-shake' : ''}`}>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#304035]">
          {isLockedOther ? <MonitorSmartphone className="h-7 w-7 text-[#c9a96e]" />
            : isPasswordMode ? <KeyRound className="h-7 w-7 text-[#c9a96e]" />
            : <Lock className="h-7 w-7 text-[#c9a96e]" />}
        </div>
        <h2 className="text-lg font-bold text-[#304035]">{title}</h2>
        <p className="mt-1.5 text-sm text-[#304035]/55 leading-relaxed">{subtitle}</p>

        {isLockedOther ? (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => { setMode('unlock-other'); setPwd(''); setError(''); }}
              className="w-full rounded-xl bg-[#304035] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#3d5244]"
            >
              Débloquer sur cet ordinateur
            </button>
            <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#304035]/40">
              <ShieldCheck className="h-3.5 w-3.5" /> Vos documents restent invisibles ici sans le mot de passe.
            </p>
          </div>
        ) : isPasswordMode ? (
          <div className="mt-6 text-left">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#304035]/50">Mot de passe du compte</label>
            <input
              type="password"
              autoFocus
              value={pwd}
              onChange={(e) => { setPwd(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') (mode === 'unlock-other' ? submitUnlockHere() : submitReset()); }}
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/50 px-3.5 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
            />
            {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
            <button
              type="button"
              onClick={() => (mode === 'unlock-other' ? submitUnlockHere() : submitReset())}
              disabled={!pwd || pwdBusy}
              className="mt-4 w-full rounded-xl bg-[#304035] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#3d5244] disabled:opacity-40"
            >
              {pwdBusy ? 'Vérification…' : (mode === 'unlock-other' ? 'Débloquer sur cet ordinateur' : 'Valider et redéfinir un code')}
            </button>
            <button
              type="button"
              onClick={() => { setMode(mode === 'unlock-other' ? 'locked-other' : 'enter'); setPwd(''); setError(''); }}
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
            {error && <p className="mb-3 text-sm font-medium text-red-500">{error}</p>}
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
              <button type="button" onClick={() => { setMode('reset-password'); setBuffer(''); setError(''); }}
                className="mt-6 text-xs font-medium text-[#a67749] hover:underline">Code oublié ? Réinitialiser</button>
            ) : mode === 'setup-confirm' ? (
              <button type="button" onClick={() => { setMode('setup-new'); setFirstPin(''); setBuffer(''); setError(''); }}
                className="mt-6 inline-flex items-center gap-1 text-xs font-medium text-[#304035]/50 hover:underline">
                <ArrowLeft className="h-3.5 w-3.5" /> Recommencer</button>
            ) : (
              <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-[#304035]/40">
                <ShieldCheck className="h-3.5 w-3.5" /> Verrou lié à cet ordinateur · synchronisé au compte</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
