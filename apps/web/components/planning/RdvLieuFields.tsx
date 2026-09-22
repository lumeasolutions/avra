'use client';
/**
 * Lieu d'un RDV du planning : sur place (adresse) ou en visio (lien Meet,
 * Zoom, Teams, WhatsApp…). Retour cofondatrice 22/09/2026 — liens Google Meet
 * dans le planning.
 */
import React, { useState } from 'react';
import { MapPin, Video, ExternalLink, ClipboardPaste, CheckCircle2, AlertCircle } from 'lucide-react';
import { NOUVEAU_MEET_URL, fournisseurVisio, lienVisioValide, normaliserLienVisio } from '@/lib/visio';

export type ModeLieu = 'aucun' | 'place' | 'visio';

interface Props {
  mode: ModeLieu;
  location: string;
  visioUrl: string;
  onChange: (patch: { mode?: ModeLieu; location?: string; visioUrl?: string }) => void;
  /** Adresses connues du dossier choisi (client / chantier), proposées en un clic. */
  adressesDossier?: { label: string; value: string }[];
}

const LABEL = 'text-xs font-bold text-[#304035]/50 uppercase tracking-wider block mb-2';
const INPUT = 'w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-3 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/25 focus:outline-none focus:ring-2 focus:ring-[#304035]/20';

export function RdvLieuFields({ mode, location, visioUrl, onChange, adressesDossier = [] }: Props) {
  const [collerErr, setCollerErr] = useState('');
  const lien = visioUrl.trim();
  const valide = lien ? lienVisioValide(lien) : false;

  const coller = async () => {
    setCollerErr('');
    try {
      const txt = (await navigator.clipboard.readText()).trim();
      if (!txt) { setCollerErr('Le presse-papiers est vide.'); return; }
      onChange({ visioUrl: txt });
    } catch {
      setCollerErr('Collage automatique refusé par le navigateur : faites Ctrl+V (⌘V) dans le champ.');
    }
  };

  const Onglet = ({ k, icon, label }: { k: ModeLieu; icon: React.ReactNode; label: string }) => (
    <button
      type="button"
      onClick={() => onChange({ mode: k })}
      aria-pressed={mode === k}
      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border-2 transition-all"
      style={{
        borderColor: mode === k ? '#304035' : 'transparent',
        background: mode === k ? '#304035' : '#f5f5f5',
        color: mode === k ? 'white' : '#304035',
      }}
    >
      {icon}{label}
    </button>
  );

  return (
    <div>
      <label className={LABEL}>Lieu</label>
      <div className="flex gap-2">
        <Onglet k="aucun" icon={null} label="Non précisé" />
        <Onglet k="place" icon={<MapPin className="h-3.5 w-3.5" />} label="Sur place" />
        <Onglet k="visio" icon={<Video className="h-3.5 w-3.5" />} label="Visio" />
      </div>

      {mode === 'place' && (
        <div className="mt-2.5 space-y-2">
          <input
            value={location}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder="Adresse du rendez-vous"
            maxLength={300}
            className={INPUT}
          />
          {adressesDossier.filter((a) => a.value && a.value !== location.trim()).map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => onChange({ location: a.value })}
              className="block w-full text-left text-[11px] text-[#304035]/60 hover:text-[#304035] px-1"
            >
              <MapPin className="inline h-3 w-3 mr-1 -mt-0.5" />
              {a.label} : <span className="font-semibold">{a.value}</span> — utiliser
            </button>
          ))}
        </div>
      )}

      {mode === 'visio' && (
        <div className="mt-2.5 space-y-2">
          <div className="flex gap-2">
            <a
              href={NOUVEAU_MEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#304035]/15 bg-white px-3 py-2 text-xs font-bold text-[#304035] hover:bg-[#f5eee8] transition-colors"
            >
              <Video className="h-3.5 w-3.5 text-emerald-600" /> Créer un Google Meet <ExternalLink className="h-3 w-3 opacity-50" />
            </a>
            <button
              type="button"
              onClick={coller}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[#304035]/15 bg-white px-3 py-2 text-xs font-bold text-[#304035] hover:bg-[#f5eee8] transition-colors"
            >
              <ClipboardPaste className="h-3.5 w-3.5" /> Coller le lien
            </button>
          </div>
          <input
            value={visioUrl}
            onChange={(e) => onChange({ visioUrl: e.target.value })}
            onBlur={() => { if (lien && lienVisioValide(lien)) onChange({ visioUrl: normaliserLienVisio(lien) }); }}
            placeholder="https://meet.google.com/abc-defg-hij (ou Zoom, Teams, WhatsApp…)"
            inputMode="url"
            className={INPUT}
          />
          {lien ? (
            valide ? (
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Lien {fournisseurVisio(lien)} prêt — bouton « Rejoindre » sur le RDV
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600">
                <AlertCircle className="h-3.5 w-3.5" /> Ce n'est pas un lien valide (il doit commencer par https://).
              </p>
            )
          ) : (
            <p className="text-[11px] text-[#304035]/45 leading-snug">
              « Créer un Google Meet » ouvre une réunion dans un nouvel onglet : copiez son lien (barre d'adresse)
              puis revenez le coller ici. Zoom, Teams ou WhatsApp : collez simplement leur lien.
            </p>
          )}
          {collerErr && <p className="text-[11px] text-amber-700">{collerErr}</p>}
        </div>
      )}
    </div>
  );
}
