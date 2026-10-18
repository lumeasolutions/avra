'use client';
/**
 * Rendez-vous et interventions d'un dossier.
 *
 * - RDV du planning classique (client, visio…) : prochains RDV, bouton
 *   « Rejoindre » pour les visios, état de l'invitation client.
 * - Interventions du planning gestion (pose, livraison, relevé, SAV…) avec
 *   l'artisan assigné.
 *
 * Deux raccourcis pour planifier sans ressaisir le client : « Planifier un RDV »
 * et « Planifier une intervention » (choix du type). La fenêtre de création
 * s'ouvre avec le dossier déjà choisi, puis on revient ici.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Video, MapPin, Plus, ChevronDown, HardHat } from 'lucide-react';
import { usePlanningStore } from '@/store';
import { useAuthStore } from '@/store/useAuthStore';
import { infoVisio } from '@/lib/visio';
import { debutRdv, finRdv } from '@/lib/rdv';
import type { GestEvent, PlanningEvent } from '@/store/usePlanningStore';

/** Libellés des types d'intervention les plus courants (planning gestion). */
const LIBELLES_INTERVENTION: Record<string, string> = {
  'POSE CUISINE': 'Pose cuisine',
  'POSE GRANITE': 'Pose granite',
  POSEUR: 'Pose',
  LIVRAISON: 'Livraison',
  LIVREUR: 'Livraison',
  MESURAGE: 'Relevé de mesures',
  SUIVI_CHANTIER: 'Suivi chantier',
  RECEPTION: 'Réception travaux',
  'REUNION CHANTIER': 'Réunion chantier',
  SAV: 'SAV',
  COMPLEMENT: 'Complément',
};

type Element =
  | { kind: 'rdv'; ev: PlanningEvent; start: Date; end: Date }
  | { kind: 'intervention'; ev: GestEvent; start: Date; end: Date };

export function DossierRendezVous({
  dossierId, canEdit, dossierName,
}: { dossierId: string; canEdit: boolean; dossierName?: string }) {
  const events = usePlanningStore((s) => s.planningEvents);
  const gestEvents = usePlanningStore((s) => s.gestEvents);
  const typesPerso = usePlanningStore((s) => s.customInterventionTypes);
  const profession = useAuthStore((s) => s.profession);
  const [showPast, setShowPast] = useState(false);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Fermeture du menu « Planifier une intervention » au clic ailleurs.
  useEffect(() => {
    if (!menuOuvert) return;
    const fermer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOuvert(false);
    };
    document.addEventListener('mousedown', fermer);
    return () => document.removeEventListener('mousedown', fermer);
  }, [menuOuvert]);

  const { futurs, passes } = useMemo(() => {
    const now = Date.now();
    const nom = dossierName?.trim();
    const list: Element[] = [
      ...events
        .filter((e) => e.dossierId === dossierId)
        .map((e) => ({ kind: 'rdv' as const, ev: e, start: debutRdv(e), end: finRdv(e) })),
      // Interventions rattachées au dossier ; celles d'avant le rattachement
      // (sans dossier) sont retrouvées par le nom du client.
      ...gestEvents
        .filter((e) => e.dossierId === dossierId || (!e.dossierId && !!nom && e.client?.trim() === nom))
        .map((e) => ({ kind: 'intervention' as const, ev: e, start: debutRdv(e), end: finRdv(e) })),
    ].sort((a, b) => a.start.getTime() - b.start.getTime());
    return {
      futurs: list.filter((x) => x.end.getTime() >= now),
      passes: list.filter((x) => x.end.getTime() < now).reverse(),
    };
  }, [events, gestEvents, dossierId, dossierName]);

  if (!canEdit && futurs.length === 0 && passes.length === 0) return null;

  const retour = `/dossiers/${encodeURIComponent(dossierId)}`;
  const lienRdv = `/planning?nouveau=1&dossier=${encodeURIComponent(dossierId)}&retour=${encodeURIComponent(retour)}`;
  const lienIntervention = (type?: string) =>
    `/planning-gestion?nouveau=1&dossier=${encodeURIComponent(dossierId)}${type ? `&type=${encodeURIComponent(type)}` : ''}&retour=${encodeURIComponent(retour)}`;
  // Raccourcis d'intervention selon le métier (la pose d'un cuisiniste est une
  // « Pose cuisine », pour les autres métiers une « Pose »).
  const raccourcis: Array<{ type: string; libelle: string }> = [
    { type: profession === 'cuisiniste' ? 'POSE CUISINE' : 'POSEUR', libelle: 'Pose' },
    { type: 'LIVRAISON', libelle: 'Livraison' },
    { type: 'MESURAGE', libelle: 'Relevé de mesures' },
    { type: 'SUIVI_CHANTIER', libelle: 'Suivi chantier' },
    { type: 'SAV', libelle: 'SAV' },
  ];

  const libelleIntervention = (type: string) =>
    typesPerso.find((t) => t.key === type)?.label
    ?? LIBELLES_INTERVENTION[type]
    ?? (type.charAt(0) + type.slice(1).toLowerCase()).replace(/_/g, ' ');

  const Ligne = ({ x, passe }: { x: Element; passe?: boolean }) => {
    const jour = x.start.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
    const heure = `${x.start.getHours()}h${String(x.start.getMinutes()).padStart(2, '0')}`;
    const dateCol = (
      <div className="w-[88px] shrink-0">
        <p className="text-xs font-bold text-[#304035] capitalize">{jour}</p>
        <p className="text-[11px] text-[#304035]/50">{heure}</p>
      </div>
    );

    if (x.kind === 'intervention') {
      const ev = x.ev;
      return (
        <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3 ${passe ? 'opacity-60' : ''}`}>
          {dateCol}
          <div className="flex-1 min-w-[140px]">
            <Link href={`/planning-gestion?voir=${encodeURIComponent(ev.id)}`} className="text-sm font-semibold text-[#304035] hover:underline break-words">
              {libelleIntervention(ev.type)}
            </Link>
            <p className="text-[11px] text-[#304035]/50 break-words">
              <HardHat className="inline h-3 w-3 -mt-0.5 mr-1" />Planning gestion
              {ev.intervenantName ? <> · {ev.intervenantName}</> : <> · aucun artisan assigné</>}
            </p>
          </div>
        </div>
      );
    }

    const vis = infoVisio(x.ev.visioUrl);
    const enCours = !passe && Date.now() >= x.start.getTime() - 15 * 60000;
    return (
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3 ${passe ? 'opacity-60' : ''}`}>
        {dateCol}
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
            Rendez-vous et interventions <span className="font-normal text-[#304035]/40">({futurs.length + passes.length})</span>
          </h2>
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={lienRdv}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 border border-[#304035]/15 text-xs font-bold text-[#304035] hover:bg-[#304035]/5 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" /> Planifier un RDV
            </Link>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOuvert((v) => !v)}
                aria-expanded={menuOuvert}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 bg-[#304035] text-xs font-bold text-white hover:bg-[#3D5449] whitespace-nowrap"
              >
                <HardHat className="h-3.5 w-3.5" /> Planifier une intervention
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${menuOuvert ? 'rotate-180' : ''}`} />
              </button>
              {menuOuvert && (
                <div className="absolute right-0 z-30 mt-1.5 w-56 rounded-xl border border-[#304035]/10 bg-white shadow-xl overflow-hidden">
                  <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#304035]/45">
                    Planning gestion
                  </p>
                  {raccourcis.map((r) => (
                    <Link
                      key={r.type}
                      href={lienIntervention(r.type)}
                      className="block px-3 py-2 text-sm font-semibold text-[#304035] hover:bg-[#f5eee8]"
                    >
                      {r.libelle}
                    </Link>
                  ))}
                  <Link
                    href={lienIntervention()}
                    className="block px-3 py-2 text-sm text-[#304035]/70 hover:bg-[#f5eee8] border-t border-[#304035]/8"
                  >
                    Autre intervention…
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="divide-y divide-[#304035]/5">
        {futurs.length === 0 && (
          <p className="px-5 py-4 text-xs text-[#304035]/45">
            Rien de prévu. Planifiez un RDV client (sur place ou en visio, avec invitation agenda) ou une intervention
            (pose, livraison, relevé…) : l'artisan assigné reçoit la demande par e-mail.
          </p>
        )}
        {futurs.map((x) => <Ligne key={`${x.kind}-${x.ev.id}`} x={x} />)}
        {passes.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            className="w-full flex items-center justify-center gap-1 px-5 py-2.5 text-[11px] font-semibold text-[#304035]/50 hover:text-[#304035]"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showPast ? 'rotate-180' : ''}`} />
            {showPast ? 'Masquer' : 'Voir'} les rendez-vous passés ({passes.length})
          </button>
        )}
        {showPast && passes.map((x) => <Ligne key={`${x.kind}-${x.ev.id}`} x={x} passe />)}
      </div>
    </div>
  );
}
