'use client';
/**
 * Rendez-vous d'un dossier (planning classique) : prochains RDV, bouton
 * « Rejoindre » pour les visios, état de l'invitation client, et raccourci
 * pour planifier un RDV déjà rattaché au dossier.
 */
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Video, MapPin, Plus, ChevronDown } from 'lucide-react';
import { usePlanningStore } from '@/store';
import { infoVisio } from '@/lib/visio';
import { debutRdv, finRdv } from '@/lib/rdv';

export function DossierRendezVous({ dossierId, canEdit }: { dossierId: string; canEdit: boolean }) {
  const events = usePlanningStore((s) => s.planningEvents);
  const [showPast, setShowPast] = useState(false);

  const { futurs, passes } = useMemo(() => {
    const now = Date.now();
    const list = events
      .filter((e) => e.dossierId === dossierId)
      .map((e) => ({ ev: e, start: debutRdv(e), end: finRdv(e) }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    return {
      futurs: list.filter((x) => x.end.getTime() >= now),
      passes: list.filter((x) => x.end.getTime() < now).reverse(),
    };
  }, [events, dossierId]);

  if (!canEdit && futurs.length === 0 && passes.length === 0) return null;

  const Ligne = ({ x, passe }: { x: (typeof futurs)[number]; passe?: boolean }) => {
    const vis = infoVisio(x.ev.visioUrl);
    const jour = x.start.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
    const heure = `${x.start.getHours()}h${String(x.start.getMinutes()).padStart(2, '0')}`;
    const enCours = !passe && Date.now() >= x.start.getTime() - 15 * 60000;
    return (
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3 ${passe ? 'opacity-60' : ''}`}>
        <div className="w-[88px] shrink-0">
          <p className="text-xs font-bold text-[#304035] capitalize">{jour}</p>
          <p className="text-[11px] text-[#304035]/50">{heure}</p>
        </div>
        <div className="flex-1 min-w-[140px]">
          <Link href={`/planning?voir=${x.ev.id}`} className="text-sm font-semibold text-[#304035] hover:underline break-words">
            {x.ev.title || 'RDV'}
          </Link>
          <p className="text-[11px] text-[#304035]/50 flex items-center gap-1 flex-wrap">
            {vis ? <><Video className="h-3 w-3" /> Visio {vis.provider}</> : x.ev.location ? <><MapPin className="h-3 w-3" /> {x.ev.location}</> : 'Lieu non précisé'}
            {x.ev.invite && (
              <span className={x.ev.invite.status === 'ANNULEE' ? 'text-red-600' : 'text-emerald-700'}>
                · {x.ev.invite.status === 'ANNULEE' ? 'annulation envoyée' : `invitation envoyée à ${x.ev.invite.to}`}
              </span>
            )}
          </p>
        </div>
        {vis && !passe && (
          <a
            href={vis.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${enCours ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'border border-emerald-300 text-emerald-700 hover:bg-emerald-50'}`}
          >
            <Video className="h-3.5 w-3.5" /> Rejoindre
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-[#304035]/8 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-5 py-4 border-b border-[#304035]/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-xl"><CalendarDays className="h-4 w-4 text-emerald-600" /></div>
          <h2 className="text-sm font-bold text-[#304035] whitespace-nowrap">
            Rendez-vous <span className="font-normal text-[#304035]/40">({futurs.length + passes.length})</span>
          </h2>
        </div>
        {canEdit && (
          <Link
            href={`/planning?nouveau=1&dossier=${encodeURIComponent(dossierId)}`}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 border border-[#304035]/15 text-xs font-bold text-[#304035] hover:bg-[#304035]/5 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" /> Planifier un RDV
          </Link>
        )}
      </div>
      <div className="divide-y divide-[#304035]/5">
        {futurs.length === 0 && (
          <p className="px-5 py-4 text-xs text-[#304035]/45">
            Aucun RDV à venir. Planifiez-en un (sur place ou en visio) : il pourra être envoyé au client avec l'invitation agenda.
          </p>
        )}
        {futurs.map((x) => <Ligne key={x.ev.id} x={x} />)}
        {passes.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            className="w-full flex items-center justify-center gap-1 px-5 py-2.5 text-[11px] font-semibold text-[#304035]/50 hover:text-[#304035]"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showPast ? 'rotate-180' : ''}`} />
            {showPast ? 'Masquer' : 'Voir'} les RDV passés ({passes.length})
          </button>
        )}
        {showPast && passes.map((x) => <Ligne key={x.ev.id} x={x} passe />)}
      </div>
    </div>
  );
}
