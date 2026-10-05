'use client';

/**
 * AdminDocsPinSettings — le code du Dossier administratif se définit et se
 * refait ici, dans les Paramètres.
 *
 * Jusqu'au 05/10/2026, on ne pouvait que REMETTRE À ZÉRO depuis cet écran : le
 * nouveau code était ensuite réclamé au prochain passage sur le Dossier
 * administratif. Entre les deux, le dossier n'était plus protégé du tout, et
 * on ne savait pas toujours qu'il fallait aller le redéfinir ailleurs.
 *
 * Désormais le code se saisit sur place, et il remplace l'ancien d'un bloc :
 * on n'est jamais sans protection.
 *
 * Changer un code existant passe toujours par le mot de passe du compte — la
 * vérification se fait côté serveur (`/auth/verify-password`), sans effet de
 * bord sur la session. Sans cette barrière, un ordinateur resté ouvert
 * suffirait à contourner le verrou.
 */

import { useState } from 'react';
import { Lock, ShieldCheck, KeyRound, CheckCircle, ShieldOff } from 'lucide-react';
import { useConfigStore } from '@/store/useConfigStore';
import { api } from '@/lib/api';

type Etape = 'repos' | 'motDePasse' | 'saisie';

export function AdminDocsPinSettings() {
  const adminDocsPin = useConfigStore((s) => s.adminDocsPin);
  const setAdminDocsPin = useConfigStore((s) => s.setAdminDocsPin);

  const [etape, setEtape] = useState<Etape>('repos');
  const [pwd, setPwd] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fait, setFait] = useState<string | null>(null);

  const quatreChiffres = (v: string) => /^\d{4}$/.test(v);
  const chiffresSeuls = (v: string) => v.replace(/\D/g, '').slice(0, 4);

  const reinitialiser = () => {
    setEtape('repos'); setPwd(''); setCode(''); setConfirmation(''); setError('');
  };

  /** Étape 1 (changement d'un code existant) : le mot de passe du compte. */
  const verifierMotDePasse = async () => {
    if (!pwd || busy) return;
    setBusy(true); setError('');
    try {
      const r = await api<{ valid: boolean }>('/auth/verify-password', {
        method: 'POST', body: JSON.stringify({ password: pwd }),
      });
      if (r?.valid) { setPwd(''); setEtape('saisie'); }
      else setError('Mot de passe incorrect.');
    } catch {
      setError('Impossible de vérifier le mot de passe. Réessayez.');
    } finally {
      setBusy(false);
    }
  };

  /** Étape 2 : le nouveau code, saisi deux fois. */
  const enregistrer = () => {
    if (!quatreChiffres(code)) { setError('Le code fait exactement 4 chiffres.'); return; }
    if (code !== confirmation) { setError('Les deux codes ne sont pas identiques.'); return; }
    // Second argument à null : on relâche aussi le verrou d'ordinateur, sinon
    // le nouveau code resterait lié à la machine qui portait l'ancien.
    setAdminDocsPin(code, null);
    reinitialiser();
    setFait('Code enregistré. Il sera demandé à la prochaine ouverture du Dossier administratif.');
    setTimeout(() => setFait(null), 6000);
  };

  const desactiver = () => {
    setAdminDocsPin(null, null);
    reinitialiser();
    setFait('Verrou désactivé. Le Dossier administratif s’ouvre sans code — il reste réservé aux administrateurs.');
    setTimeout(() => setFait(null), 8000);
  };

  const champCode = (valeur: string, poser: (v: string) => void, libelle: string, auto = false) => (
    <div className="flex-1">
      <label className="text-xs font-semibold uppercase tracking-wide text-[#304035]/50">{libelle}</label>
      <input
        inputMode="numeric"
        autoComplete="off"
        autoFocus={auto}
        value={valeur}
        onChange={(e) => { poser(chiffresSeuls(e.target.value)); setError(''); }}
        onKeyDown={(e) => { if (e.key === 'Enter') enregistrer(); }}
        placeholder="••••"
        className="mt-1.5 w-full rounded-xl border border-[#304035]/15 bg-white px-3.5 py-2.5 text-center text-lg font-bold tracking-[0.4em] text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
      />
    </div>
  );

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
              Aucun code défini. Le Dossier administratif s’ouvre sans code — il reste réservé aux administrateurs.
            </p>
          )}
        </div>
      </div>

      {fait && (
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          <CheckCircle className="h-4 w-4" /> {fait}
        </p>
      )}

      {etape === 'repos' && !fait && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setError(''); setEtape(adminDocsPin ? 'motDePasse' : 'saisie'); }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#304035]/15 px-3.5 py-2 text-sm font-medium text-[#304035] transition-all hover:bg-[#304035]/5"
          >
            <KeyRound className="h-4 w-4" /> {adminDocsPin ? 'Changer le code' : 'Définir un code'}
          </button>
          {adminDocsPin && (
            <button
              type="button"
              onClick={desactiver}
              className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium text-[#304035]/50 transition-all hover:bg-[#304035]/5 hover:text-[#304035]"
            >
              <ShieldOff className="h-4 w-4" /> Désactiver le verrou
            </button>
          )}
        </div>
      )}

      {etape === 'motDePasse' && (
        <div className="mt-4 rounded-xl bg-[#f5eee8]/50 p-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-[#304035]/50">
            Confirmez votre mot de passe de compte
          </label>
          <input
            type="password"
            autoFocus
            value={pwd}
            onChange={(e) => { setPwd(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') void verifierMotDePasse(); }}
            placeholder="••••••••"
            className="mt-1.5 w-full rounded-xl border border-[#304035]/15 bg-white px-3.5 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/40"
          />
          {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void verifierMotDePasse()}
              disabled={!pwd || busy}
              className="rounded-xl bg-[#304035] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#3d5244] disabled:opacity-40"
            >
              {busy ? 'Vérification…' : 'Continuer'}
            </button>
            <button type="button" onClick={reinitialiser}
              className="rounded-xl px-4 py-2 text-sm font-medium text-[#304035]/60 hover:bg-[#304035]/5">
              Annuler
            </button>
          </div>
          <p className="mt-3 text-xs text-[#304035]/40">
            Sans cette vérification, un ordinateur resté ouvert suffirait à changer le code.
          </p>
        </div>
      )}

      {etape === 'saisie' && (
        <div className="mt-4 rounded-xl bg-[#f5eee8]/50 p-4">
          <div className="flex gap-3">
            {champCode(code, setCode, 'Nouveau code', true)}
            {champCode(confirmation, setConfirmation, 'Confirmez')}
          </div>
          {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={enregistrer}
              disabled={!quatreChiffres(code) || !quatreChiffres(confirmation)}
              className="rounded-xl bg-[#304035] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#3d5244] disabled:opacity-40"
            >
              Enregistrer le code
            </button>
            <button type="button" onClick={reinitialiser}
              className="rounded-xl px-4 py-2 text-sm font-medium text-[#304035]/60 hover:bg-[#304035]/5">
              Annuler
            </button>
          </div>
          <p className="mt-3 text-xs text-[#304035]/40">
            Le nouveau code remplace l’ancien immédiatement. Il sera demandé à la prochaine ouverture du Dossier administratif.
          </p>
        </div>
      )}
    </div>
  );
}
