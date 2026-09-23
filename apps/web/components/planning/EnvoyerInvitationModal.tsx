'use client';
/**
 * Envoi d'un RDV au client : e-mail au nom de la société + invitation agenda
 * (.ics) avec, le cas échéant, le bouton « Rejoindre la visio ».
 * Trois usages : 1er envoi, mise à jour (après modification), annulation.
 */
import React, { useState } from 'react';
import { X, Send, Loader2, CheckCircle2, Video, MapPin, CalendarDays, AlertTriangle } from 'lucide-react';
import { useConfigStore, usePlanningStore } from '@/store';
import { attendreRdvEnregistre, type PlanningEvent } from '@/store/usePlanningStore';
import { envoyerInvitationRdv, type TypeEnvoi } from '@/lib/events-api';
import { infoVisio } from '@/lib/visio';
import { dureeLisible, dureeRdvMin, quandRdv } from '@/lib/rdv';
import { backdropClose } from '@/lib/backdropClose';

interface Props {
  event: PlanningEvent;
  kind: TypeEnvoi;
  /** Valeurs proposées au 1er envoi (reprises du dossier). */
  defaults?: { to?: string; name?: string; titre?: string };
  onClose: () => void;
  /** Appelé après un envoi réussi (ex. suppression du RDV après l'annulation). */
  onSent?: () => void;
  /** Annulation : libellé du bouton secondaire « supprimer sans prévenir ». */
  onSkip?: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function EnvoyerInvitationModal({ event, kind, defaults, onClose, onSent, onSkip }: Props) {
  const societe = useConfigStore((s) => s.societe);
  const setInvite = usePlanningStore((s) => s._setInvite);
  const prev = event.invite;
  /**
    * Destinataires (23/09/2026). Retour cofondatrice : « peut-on rajouter
    * plusieurs adresses mails dans l'invitation ? quand c'est surtout des
    * réunions groupées ». On garde une saisie libre (Entrée, virgule,
    * point-virgule ou espace valident) et on affiche les adresses en pastilles.
    */
  const [destinataires, setDestinataires] = useState<string[]>(() => {
    const repris = prev?.destinataires?.length
      ? prev.destinataires
      : [prev?.to ?? defaults?.to ?? ''];
    return repris.map((m) => m.trim().toLowerCase()).filter(Boolean);
  });
  const [saisie, setSaisie] = useState('');
  const [saisieErr, setSaisieErr] = useState('');
  const [name, setName] = useState(prev?.name ?? defaults?.name ?? '');
  const [titre, setTitre] = useState(prev?.titre ?? defaults?.titre ?? 'Rendez-vous');
  const visio = infoVisio(event.visioUrl);
  const [message, setMessage] = useState(() => {
    if (kind === 'cancel') return '';
    if (kind === 'update') return 'Notre rendez-vous a été modifié : voici les nouvelles informations.';
    return visio
      ? 'Le rendez-vous se fera en visio : cliquez sur « Rejoindre la visio » le jour venu, aucune installation n\'est nécessaire.'
      : 'Au plaisir de vous rencontrer.';
  });
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [err, setErr] = useState('');

  const titreModal = kind === 'cancel' ? 'Prévenir le client de l\'annulation'
    : kind === 'update' ? 'Envoyer la mise à jour au client' : 'Envoyer le RDV au client';

  /** Les destinataires d'une annulation ne se modifient pas : mêmes personnes. */
  const listeModifiable = kind !== 'cancel';
  const MAX_DEST = 20;

  /**
   * Ajoute les adresses saisies. Accepte le collage d'une liste entière
   * (virgules, points-virgules, espaces, retours à la ligne) — c'est ainsi
   * qu'on récupère une liste de participants depuis un mail ou un tableur.
   * Renvoie ce qui n'a pas pu être ajouté, pour ne pas l'effacer sous les
   * doigts de l'utilisateur.
   */
  const ajouterAdresses = (texte: string): string => {
    const morceaux = texte.split(/[\s,;]+/).map((m) => m.trim()).filter(Boolean);
    if (morceaux.length === 0) return '';
    const invalides: string[] = [];
    let trop = false;
    setDestinataires((actuels) => {
      const out = [...actuels];
      for (const brut of morceaux) {
        const mail = brut.toLowerCase();
        if (!EMAIL_RE.test(mail)) { invalides.push(brut); continue; }
        if (out.includes(mail)) continue;
        if (out.length >= MAX_DEST) { trop = true; continue; }
        out.push(mail);
      }
      return out;
    });
    setSaisieErr(
      trop ? `Vingt destinataires au maximum.`
        : invalides.length ? `Adresse invalide : ${invalides.join(', ')}` : '',
    );
    return invalides.join(' ');
  };

  const retirerAdresse = (mail: string) =>
    setDestinataires((actuels) => actuels.filter((m) => m !== mail));

  const listeFinale = () => {
    const restes = saisie.trim();
    if (!restes) return destinataires;
    const morceaux = restes.split(/[\s,;]+/).map((m) => m.trim().toLowerCase()).filter(Boolean);
    const valides = morceaux.filter((m) => EMAIL_RE.test(m) && !destinataires.includes(m));
    return [...destinataires, ...valides].slice(0, MAX_DEST);
  };

  const envoyer = async () => {
    setErr('');
    // Une adresse encore en cours de frappe compte : on ne perd pas un envoi
    // parce que l'utilisateur n'a pas appuyé sur Entrée.
    const liste = listeFinale();
    if (liste.length === 0) { setErr('Indiquez au moins une adresse e-mail.'); return; }
    if (saisie.trim() && liste.length === destinataires.length) {
      setErr(`Adresse e-mail invalide : ${saisie.trim()}`); return;
    }
    setDestinataires(liste); setSaisie(''); setSaisieErr('');
    if (!titre.trim()) { setErr('Indiquez l\'objet du rendez-vous.'); return; }
    setState('sending');
    try {
      const id = await attendreRdvEnregistre(event.id);
      if (!id) throw new Error('Le RDV n\'est pas encore enregistré sur le serveur. Réessayez dans quelques secondes.');
      const invite = await envoyerInvitationRdv(id, {
        kind, to: liste[0], destinataires: liste,
        name: name.trim() || undefined, titre: titre.trim(), message: message.trim() || undefined,
      });
      setInvite(id, invite);
      setState('done');
      // Suite immédiate (ex. suppression après annulation), même si la
      // confirmation est fermée par la croix plutôt que par « OK ».
      onSent?.();
    } catch (e: any) {
      setErr(e?.message || 'Envoi impossible.');
      setState('idle');
    }
  };

  const INPUT = 'w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-3 py-2 text-sm text-[#304035] placeholder:text-[#304035]/25 focus:outline-none focus:ring-2 focus:ring-[#304035]/20';
  const LABEL = 'text-[11px] font-bold text-[#304035]/50 uppercase tracking-wider block mb-1.5';

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center overflow-y-auto p-3"
      style={{ background: 'rgba(30,30,30,0.45)', backdropFilter: 'blur(4px)' }}
      {...backdropClose(() => { if (state !== 'sending') onClose(); })}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-base font-bold text-[#304035]">{titreModal}</h3>
          <button type="button" onClick={onClose} disabled={state === 'sending'} className="p-1.5 rounded-lg hover:bg-[#304035]/5 text-[#304035]/40" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {state === 'done' ? (
          <div className="px-5 pb-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#304035]">
              {kind === 'cancel' ? 'Annulation envoyée' : kind === 'update' ? 'Mise à jour envoyée' : 'Invitation envoyée'}
              {destinataires.length > 1
                ? ` à ${destinataires.length} destinataires`
                : ` à ${destinataires[0] ?? ''}`}
            </p>
            <p className="text-xs text-[#304035]/55 mt-1.5 leading-relaxed">
              {kind === 'cancel'
                ? 'Le RDV sera retiré de son agenda s\'il l\'avait ajouté.'
                : 'Le client peut ajouter le RDV à son agenda en un clic depuis l\'e-mail.'}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full py-2.5 rounded-2xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #3d5244, #304035)' }}
            >
              OK
            </button>
          </div>
        ) : (
          <div className="px-5 pb-5 space-y-3">
            {/* Récapitulatif */}
            <div className="rounded-2xl bg-[#f5eee8]/60 px-3.5 py-3 text-xs text-[#304035] space-y-1">
              <p className="flex items-center gap-1.5 font-bold"><CalendarDays className="h-3.5 w-3.5" />{quandRdv(event)} · {dureeLisible(dureeRdvMin(event))}</p>
              {visio && <p className="flex items-center gap-1.5"><Video className="h-3.5 w-3.5 text-emerald-600" />Visio {visio.provider}{kind !== 'cancel' ? ' — bouton « Rejoindre » dans l\'e-mail' : ''}</p>}
              {!visio && event.location && <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{event.location}</p>}
              {!visio && !event.location && kind !== 'cancel' && (
                <p className="flex items-center gap-1.5 text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />Ni adresse ni lien visio : ajoutez-en un via « Modifier » si besoin.</p>
              )}
            </div>

            <div>
              <label className={LABEL}>
                {destinataires.length > 1 ? `Destinataires (${destinataires.length})` : 'E-mail du client'}
              </label>
              <div className={`${INPUT} flex flex-wrap items-center gap-1.5 py-1.5`}>
                {destinataires.map((mail) => (
                  <span key={mail} className="inline-flex items-center gap-1 rounded-lg bg-[#304035]/8 px-2 py-1 text-[11px] font-semibold text-[#304035]">
                    {mail}
                    {listeModifiable && (
                      <button type="button" onClick={() => retirerAdresse(mail)} aria-label={`Retirer ${mail}`}
                        className="text-[#304035]/45 hover:text-red-600">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
                {listeModifiable && destinataires.length < MAX_DEST && (
                  <input
                    value={saisie}
                    onChange={(e) => { setSaisie(e.target.value); setSaisieErr(''); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === 'Tab') {
                        if (!saisie.trim()) return;
                        e.preventDefault();
                        setSaisie(ajouterAdresses(saisie));
                      } else if (e.key === 'Backspace' && !saisie && destinataires.length) {
                        setDestinataires((a) => a.slice(0, -1));
                      }
                    }}
                    onBlur={() => { if (saisie.trim()) setSaisie(ajouterAdresses(saisie)); }}
                    type="email"
                    placeholder={destinataires.length ? 'Ajouter une adresse…' : 'client@exemple.fr'}
                    className="flex-1 min-w-[140px] bg-transparent text-sm text-[#304035] placeholder:text-[#304035]/25 focus:outline-none"
                  />
                )}
              </div>
              {saisieErr && <p className="text-[10px] font-semibold text-red-600 mt-1">{saisieErr}</p>}
              {listeModifiable ? (
                <p className="text-[10px] text-[#304035]/45 mt-1">
                  Réunion groupée : ajoutez autant d'adresses que nécessaire (Entrée ou virgule pour valider).
                  Chaque participant reçoit l'invitation et voit les autres, comme dans un agenda partagé.
                </p>
              ) : (
                <p className="text-[10px] text-[#304035]/45 mt-1">
                  {destinataires.length > 1 ? 'Mêmes destinataires que' : 'Même destinataire que'} l'invitation initiale.
                </p>
              )}
            </div>
            {kind !== 'cancel' && (
              <>
                <div>
                  <label className={LABEL}>Nom du client</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Madame Dupont" maxLength={120} className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Objet du rendez-vous</label>
                  <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex : Présentation de votre projet cuisine" maxLength={150} className={INPUT} />
                </div>
              </>
            )}
            <div>
              <label className={LABEL}>Message (facultatif)</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={2000} className={`${INPUT} resize-none`} />
            </div>

            <p className="text-[10px] text-[#304035]/45 leading-relaxed">
              Envoyé au nom de <b>{societe.nom || 'votre société'}</b>
              {societe.email ? <> ; les réponses du client arrivent sur <b>{societe.email}</b>.</> : <> ; ses réponses arriveront sur l'e-mail de votre compte (renseignez l'e-mail société dans Paramètres).</>}
            </p>

            {err && <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}

            <div className="flex gap-2 pt-1">
              {onSkip ? (
                <button type="button" onClick={onSkip} disabled={state === 'sending'} className="flex-1 py-2.5 rounded-2xl border border-[#304035]/15 text-xs font-bold text-[#304035]/60 hover:bg-[#f5eee8]">
                  Supprimer sans prévenir
                </button>
              ) : (
                <button type="button" onClick={onClose} disabled={state === 'sending'} className="flex-1 py-2.5 rounded-2xl border border-[#304035]/15 text-sm font-bold text-[#304035]/60 hover:bg-[#f5eee8]">
                  {kind === 'update' ? 'Ne pas prévenir' : 'Annuler'}
                </button>
              )}
              <button
                type="button"
                onClick={envoyer}
                disabled={state === 'sending' || (destinataires.length === 0 && !saisie.trim())}
                className="flex-[1.4] flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-sm font-bold text-white disabled:opacity-40"
                style={{ background: kind === 'cancel' ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : 'linear-gradient(135deg, #3d5244, #304035)' }}
              >
                {state === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {kind === 'cancel' ? 'Prévenir et supprimer' : 'Envoyer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
