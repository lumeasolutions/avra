'use client';

/**
 * AdminDocsPinSettings — gestion du code PIN du Dossier administratif depuis
 * Paramètres. Permet de réinitialiser le code (protégé par le mot de passe du
 * compte). Après réinitialisation, un nouveau code est demandé au prochain
 * accès au Dossier administratif.
 */

import { useState } from 'react';
import { Lock, ShieldCheck, KeyRound, CheckCircle } from 'lucide-react';
import { useConfigStore } from '@/store/useConfigStore';
import { api } from '@/lib/api';

export function AdminDocsPinSettings() {
  const adminDocsPin = useConfigStore((s) => s.adminDocsPin);
  const setAdminDocsPin = useConfigStore((s) => s.setAdminDocsPin);

  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!pwd || busy) return;
    setBusy(true); setError('');
    try {
      const r = await api<{ valid: boolean }>('/auth/verify-password', {
        method: 'POST', body: JSON.stringify({ password: pwd }),
      });
      if (r?.valid) {
        setAdminDocsPin(null);
        setPwd(''); setOpen(false); setDone(true);
        setTimeout(() => setDone(false), 6000);
      } else {
        setError('Mot de passe incorrect.');
      }
    } catch {
      setError('Impossible de vérifier le mot de passe. Réessayez.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#304035]/8 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#304035]/5 text-[#a67749]">
          <Lock className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#304035]">Verrou à 4 chiffres</p>
          {adminDocsPin ? (
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-emerald-600">
              <ShieldCheck className="h-4 w-4" /> Un code d’accès est actif — demandé à chaque ouverture du Dossier administratif.
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-[#304035]/55">
              Aucun code défini. Il vous sera proposé au 1er accès au Dossier administratif.
            </p>
          )}
        </div>
      </div>

      {done && (
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          <CheckCircle className="h-4 w-4" /> Code réinitialisé. Un nouveau code vous sera demandé au prochain accès.
        </p>
      )}

      {adminDocsPin && !open && !done && (
        <button
          type="button"
          onClick={() => { setOpen(true); setError(''); }}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[#304035]/15 px-3.5 py-2 text-sm font-medium text-[#304035] transition-all hover:bg-[#304035]/5"
        >
          <KeyRound className="h-4 w-4" /> Réinitialiser / changer le code
        </button>
      )}

      {open && (
        <div className="mt-4 rounded-xl bg-[#f5eee8]/50 p-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-[#304035]/50">
            Confirmez votre mot de passe de compte
          </label>
          <input
            type="password"
            autoFocus
            value={pwd}
            onChange={(e) => { setPwd(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="••••••••"
            className="mt-1.5 w-full rounded-xl border border-[#304035]/15 bg-white px-3.5 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
          />
          {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={!pwd || busy}
              className="rounded-xl bg-[#304035] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#3d5244] disabled:opacity-40"
            >
              {busy ? 'Vérification…' : 'Réinitialiser le code'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setPwd(''); setError(''); }}
              className="rounded-xl px-4 py-2 text-sm font-medium text-[#304035]/60 hover:bg-[#304035]/5"
            >
              Annuler
            </button>
          </div>
          <p className="mt-3 text-xs text-[#304035]/40">
            Après réinitialisation, vous définirez un nouveau code au prochain accès au Dossier administratif.
          </p>
        </div>
      )}
    </div>
  );
}
