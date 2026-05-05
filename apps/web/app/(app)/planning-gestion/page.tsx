'use client';

import { useState } from 'react';
import {
  CalendarCog, ChevronLeft, ChevronRight, Plus, X,
  Hammer, Truck, Zap, Wrench, Users, TrendingUp,
  AlertTriangle, CheckCircle, Clock, ChevronDown
} from 'lucide-react';
import { useDossierStore, usePlanningStore } from '@/store';
import { useIntervenantStore } from '@/store/useIntervenantStore';
import { PageHeader } from '@/components/layout/PageHeader';

/**
 * Genere une couleur stable a partir d'un nom (hash deterministe).
 * Garantit que le meme intervenant a toujours la meme couleur d'avatar
 * sans devoir la stocker en DB.
 */
function nameToColor(name: string): string {
  // Palette tres saturee qui s'integre bien avec le branding (verts/ocres)
  const palette = [
    '#5b9bd5', '#e07050', '#a78bfa', '#2ecc71', '#f59e0b',
    '#0ea5e9', '#dc2626', '#16a34a', '#8b5cf6', '#ea580c',
    '#0891b2', '#84cc16', '#ec4899', '#14b8a6', '#a67749',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

/** Initiales pour l'avatar (max 2 caracteres). */
function nameToInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Format affichable du type metier (POSEUR -> Poseur). */
function formatTypeLabel(type: string | null | undefined): string {
  if (!type) return '';
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

/* ── CONSTANTES ── */
const HOURS = [8,9,10,11,12,13,14,15,16,17,18,19,20];
const DAYS_SHORT = ['LUN','MAR','MERC','JEU','VEN','SAM','DIM'];
const CELL_H = 56;
const START_HOUR = 8;
const MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

/* ── TYPES D'INTERVENTION ──
 * Inclut les types "dual-planning" (Livraison, Suivi chantier, Reception
 * travaux, Releve de mesures, Etat des lieux, RDV fournisseur) qui sont
 * communs aux 3 metiers cuisiniste/architecte/menuisier + les types
 * historiques propres au planning gestion (poses techniques, electriciens,
 * etc.).
 */
const INTERVENTION_TYPES = [
  // Dual-planning : visibles aussi sur /planning
  { key: 'LIVRAISON',         label: 'Livraison',           color: '#e8a020', icon: '📦' },
  { key: 'SUIVI_CHANTIER',    label: 'Suivi chantier',      color: '#7c4f1d', icon: '🏗' },
  { key: 'RECEPTION',         label: 'Réception travaux',   color: '#2ecc71', icon: '✅' },
  { key: 'MESURAGE',          label: 'Relevé de mesures',   color: '#e74c3c', icon: '📏' },
  // Interventions techniques cuisiniste
  { key: 'POSE CUISINE',      label: 'Pose Cuisine',        color: '#5b9bd5', icon: '🍳' },
  { key: 'POSE GRANITE',      label: 'Pose Granite',        color: '#8B4513', icon: '🪨' },
  { key: 'REUNION CHANTIER',  label: 'Réunion Chantier',    color: '#e07050', icon: '👷' },
  // Corps de metier specialistes (intervenants courants en cuisine)
  { key: 'POSEUR',            label: 'Poseur',              color: '#0ea5e9', icon: '🔨' },
  { key: 'PLOMBIER',          label: 'Plombier',            color: '#2ecc71', icon: '🔧' },
  { key: 'ELECTRICIEN',       label: 'Électricien',         color: '#f0c040', icon: '⚡' },
  { key: 'PLAQUISTE',         label: 'Plaquiste',           color: '#94a3b8', icon: '🧱' },
  { key: 'LIVREUR',           label: 'Livreur',             color: '#fb923c', icon: '🚚' },
  { key: 'MARBRIER',          label: 'Marbrier',            color: '#52525b', icon: '🪨' },
];

/**
 * Artisans occasionnels — affichés dans le menu "+" du sélecteur de type
 * d'intervention. Ce sont des corps de métier avec qui on travaille moins
 * souvent (vs liste principale ci-dessus). L'utilisateur peut quand même
 * les sélectionner via "+" pour planifier une intervention ponctuelle.
 */
const OCCASIONAL_INTERVENTION_TYPES = [
  { key: 'MACON',                 label: 'Maçon',                       color: '#a16207', icon: '🧱' },
  { key: 'PLATRIER',              label: 'Plâtrier',                    color: '#9ca3af', icon: '🪨' },
  { key: 'MENUISIER',             label: 'Menuisier',                   color: '#854d0e', icon: '🪵' },
  { key: 'EBENISTE',              label: 'Ébéniste',                    color: '#78350f', icon: '🪑' },
  { key: 'AGENCEUR',              label: 'Agenceur',                    color: '#7c2d12', icon: '🛋' },
  { key: 'CHARPENTIER',           label: 'Charpentier',                 color: '#b45309', icon: '🪚' },
  { key: 'CARRELEUR',             label: 'Carreleur',                   color: '#0e7490', icon: '◼' },
  { key: 'PARQUETEUR',            label: 'Parqueteur',                  color: '#92400e', icon: '🪵' },
  { key: 'PEINTRE_BATIMENT',      label: 'Peintre bâtiment',            color: '#dc2626', icon: '🎨' },
  { key: 'ENDUISEUR',             label: 'Enduiseur',                   color: '#a3a3a3', icon: '🧴' },
  { key: 'FACADIER',              label: 'Façadier',                    color: '#6b7280', icon: '🏢' },
  { key: 'CHAUFFAGISTE',          label: 'Chauffagiste',                color: '#dc2626', icon: '🔥' },
  { key: 'CLIMATICIEN',           label: 'Climaticien',                 color: '#0ea5e9', icon: '❄' },
  { key: 'FRIGORISTE',            label: 'Frigoriste',                  color: '#2563eb', icon: '🧊' },
  { key: 'INSTALLATEUR_DOMOTIQUE', label: 'Installateur domotique',     color: '#7c3aed', icon: '🏠' },
  { key: 'TECHNICIEN_VMC',        label: 'Technicien VMC',              color: '#06b6d4', icon: '🌬' },
  { key: 'SERRURIER',             label: 'Serrurier',                   color: '#525252', icon: '🔐' },
  { key: 'FERRONNIER',            label: 'Ferronnier',                  color: '#404040', icon: '⚙' },
  { key: 'MENUISIER_ALU_PVC',     label: 'Menuisier aluminium / PVC',   color: '#737373', icon: '🪟' },
  { key: 'MIROITIER',             label: 'Miroitier',                   color: '#0891b2', icon: '🪞' },
  { key: 'TAPISSIER',             label: 'Tapissier',                   color: '#9d174d', icon: '🛋' },
];

/** Tous les types possibles, fusionnés (pour la résolution de label/color). */
const ALL_INTERVENTION_TYPES = [...INTERVENTION_TYPES, ...OCCASIONAL_INTERVENTION_TYPES];

/* ── INTERVENANTS ── */
// Migration vers useIntervenantStore : la liste est maintenant lue
// dynamiquement depuis le store (page /intervenants). Plus de tableau
// statique vide ici.

/* ── HELPERS ── */
function getWeekDates(offset: number): Date[] {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function getWeekLabel(offset: number): string {
  const dates = getWeekDates(offset);
  const mon = dates[0];
  const sun = dates[6];
  const sm = MONTHS[mon.getMonth()];
  const em = MONTHS[sun.getMonth()];
  if (mon.getMonth() === sun.getMonth()) {
    return mon.getDate() + ' — ' + sun.getDate() + ' ' + sm + ' ' + sun.getFullYear();
  }
  return mon.getDate() + ' ' + sm + ' — ' + sun.getDate() + ' ' + em + ' ' + sun.getFullYear();
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/* ── COMPOSANT PRINCIPAL ── */
export default function PlanningGestionPage() {
  const dossiers        = useDossierStore(s => s.dossiers);
  const dossiersSignes  = useDossierStore(s => s.dossiersSignes);
  const gestEvents      = usePlanningStore(s => s.gestEvents);
  const addGestEvent    = usePlanningStore(s => s.addGestEvent);
  const deleteGestEvent = usePlanningStore(s => s.deleteGestEvent);
  // Liste des intervenants du workspace (la vraie liste creee dans /intervenants)
  const intervenantsList = useIntervenantStore(s => s.intervenants);

  const [weekOffset, setWeekOffset]   = useState(0);
  const [showAdd,    setShowAdd]      = useState(false);
  const [showOccasionalPicker, setShowOccasionalPicker] = useState(false);
  const [newEvent,   setNewEvent]     = useState<{ type: string; client: string; duration: number; intervenantId: string | null }>({ type: 'POSE CUISINE', client: '', duration: 4, intervenantId: null });
  const [modalDate,  setModalDate]    = useState('');
  const [modalHour,  setModalHour]    = useState(9);
  const [calYear,    setCalYear]      = useState(() => new Date().getFullYear());
  const [calMonth,   setCalMonth]     = useState(() => new Date().getMonth());
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [pickYear,   setPickYear]     = useState(() => new Date().getFullYear());
  const [pickMonth,  setPickMonth]    = useState(() => new Date().getMonth());

  const allClients = [...dossiers, ...dossiersSignes].map(d => d.name);
  const dates = getWeekDates(weekOffset);
  const currentEvents = gestEvents.filter(e => e.weekOffset === weekOffset);
  const todayDate = new Date();

  const typeInfo = ALL_INTERVENTION_TYPES.find(t => t.key === newEvent.type) || INTERVENTION_TYPES[0];

  const openAdd = (day: number, hour: number) => {
    const cellDate = getWeekDates(weekOffset)[day - 1];
    const yyyy = cellDate.getFullYear();
    const mm   = String(cellDate.getMonth() + 1).padStart(2, '0');
    const dd   = String(cellDate.getDate()).padStart(2, '0');
    setModalDate(yyyy + '-' + mm + '-' + dd);
    setModalHour(hour);
    setCalYear(cellDate.getFullYear());
    setCalMonth(cellDate.getMonth());
    setNewEvent({ type: 'POSE CUISINE', client: '', duration: 4, intervenantId: null });
    setShowAdd(true);
  };

  const handleAdd = () => {
    if (!newEvent.client.trim() || !modalDate) return;
    const chosen  = new Date(modalDate + 'T00:00:00');
    const today2  = new Date(); today2.setHours(0,0,0,0);
    const chosenMon = new Date(chosen);
    chosenMon.setDate(chosen.getDate() - ((chosen.getDay() + 6) % 7));
    const baseMon = new Date(today2);
    baseMon.setDate(today2.getDate() - ((today2.getDay() + 6) % 7));
    const diffWeeks = Math.round((chosenMon.getTime() - baseMon.getTime()) / (7 * 86400000));
    const dayOfWeek = ((chosen.getDay() + 6) % 7) + 1;
    // Snapshot de l'intervenant assigne (nom + type) au moment de la creation
    // pour conserver l'affichage si l'intervenant est supprime/modifie apres.
    const assignedIntervenant = newEvent.intervenantId
      ? intervenantsList.find((iv) => iv.id === newEvent.intervenantId) ?? null
      : null;
    addGestEvent({
      day: dayOfWeek,
      startHour: modalHour,
      duration: newEvent.duration,
      type: newEvent.type,
      client: newEvent.client,
      weekOffset: diffWeeks,
      intervenantId: assignedIntervenant?.id,
      intervenantName: assignedIntervenant?.name,
      intervenantType: assignedIntervenant?.type,
    });
    setWeekOffset(diffWeeks);
    setShowAdd(false);
  };

  /* ── WEEK PICKER cells ── */
  const allPickCells: (Date | null)[] = [];
  const firstDay = new Date(pickYear, pickMonth, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  for (let i = 0; i < startOffset; i++) allPickCells.push(null);
  for (let i = 1; i <= daysInMonth(pickYear, pickMonth); i++) {
    allPickCells.push(new Date(pickYear, pickMonth, i));
  }
  while (allPickCells.length % 7 !== 0) allPickCells.push(null);
  const weekRows: (Date | null)[][] = [];
  for (let i = 0; i < allPickCells.length; i += 7) weekRows.push(allPickCells.slice(i, i + 7));

  /* ── MODAL calendar cells ── */
  const calFirstDay    = new Date(calYear, calMonth, 1);
  const calStartOffset = (calFirstDay.getDay() + 6) % 7;
  const calCells: (Date | null)[] = [];
  for (let i = 0; i < calStartOffset; i++) calCells.push(null);
  for (let i = 1; i <= daysInMonth(calYear, calMonth); i++) {
    calCells.push(new Date(calYear, calMonth, i));
  }
  while (calCells.length % 7 !== 0) calCells.push(null);

  /* ── KPIs (no JSX here) ── */
  const kpiData = [
    { iconKey: 'Hammer',     label: 'Interventions cette semaine', val: String(currentEvents.length), sub: gestEvents.length + ' total', color: '#5b9bd5', bg: 'from-[#5b9bd5]/10 to-[#5b9bd5]/5' },
    { iconKey: 'Users',      label: 'Intervenants actifs',         val: String(intervenantsList.length), sub: currentEvents.length + ' interventions cette semaine', color: '#e07050', bg: 'from-[#e07050]/10 to-[#e07050]/5' },
    { iconKey: 'Clock',      label: 'Heures planifiées',           val: String(currentEvents.reduce((acc, e) => acc + e.duration, 0)) + 'h', sub: 'cette semaine', color: '#2ecc71', bg: 'from-[#2ecc71]/10 to-[#2ecc71]/5' },
    { iconKey: 'TrendingUp', label: 'Taux de charge',              val: Math.min(100, Math.round((currentEvents.reduce((acc, e) => acc + e.duration, 0) / 50) * 100)) + '%', sub: 'semaine en cours', color: '#f0c040', bg: 'from-[#f0c040]/10 to-[#f0c040]/5' },
  ];

  function renderKpiIcon(iconKey: string) {
    if (iconKey === 'Hammer') return <Hammer className="h-5 w-5" />;
    if (iconKey === 'Users') return <Users className="h-5 w-5" />;
    if (iconKey === 'Clock') return <Clock className="h-5 w-5" />;
    if (iconKey === 'TrendingUp') return <TrendingUp className="h-5 w-5" />;
    return null;
  }

  return (
    <div className="space-y-6">
      <style>{`
        @media (max-width: 768px) {
          .pg-kpi-extra { grid-template-columns: repeat(2, 1fr) !important; }
          .pg-main-layout { flex-direction: column !important; }
          .pg-side-panel { width: 100% !important; }
          .pg-cal-wrap { overflow-x: auto; }
          .pg-cal-inner { min-width: 560px; }
        }
      `}</style>

      <PageHeader
        icon={<CalendarCog className="h-7 w-7" />}
        title="Planning gestion"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => setWeekOffset(w => w - 1)}
              style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronLeft className="h-4 w-4" style={{ color: 'white' }} />
            </button>
            <button onClick={() => setWeekOffset(0)}
              style={{ padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: weekOffset === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }}>
              Aujourd'hui
            </button>
            <button onClick={() => setWeekOffset(w => w + 1)}
              style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronRight className="h-4 w-4" style={{ color: 'white' }} />
            </button>
            {/* Week picker */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { const mon = getWeekDates(weekOffset)[0]; setPickYear(mon.getFullYear()); setPickMonth(mon.getMonth()); setShowWeekPicker(v => !v); }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer' }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{getWeekLabel(weekOffset)}</span>
                <ChevronDown className="h-3 w-3" style={{ color: 'rgba(255,255,255,0.6)' }} />
              </button>
              {showWeekPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowWeekPicker(false)} />
                  <div className="absolute left-0 top-full mt-2 z-50 w-72 rounded-2xl bg-white shadow-2xl border border-[#304035]/10 p-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-3">
                      <button onClick={() => { const d = new Date(pickYear, pickMonth - 1); setPickYear(d.getFullYear()); setPickMonth(d.getMonth()); }} className="p-1.5 rounded-lg hover:bg-[#f5eee8] transition-colors">
                        <ChevronLeft className="h-4 w-4 text-[#304035]" />
                      </button>
                      <span className="text-sm font-bold text-[#304035] capitalize">{MONTHS[pickMonth]} {pickYear}</span>
                      <button onClick={() => { const d = new Date(pickYear, pickMonth + 1); setPickYear(d.getFullYear()); setPickMonth(d.getMonth()); }} className="p-1.5 rounded-lg hover:bg-[#f5eee8] transition-colors">
                        <ChevronRight className="h-4 w-4 text-[#304035]" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 mb-1">
                      {['L','M','M','J','V','S','D'].map((d, i) => (
                        <div key={i} className="text-center text-[10px] font-bold text-[#304035]/40 py-1">{d}</div>
                      ))}
                    </div>
                    {weekRows.map((row, ri) => {
                      const monday = row.find(d => d !== null);
                      if (!monday) return null;
                      const mon2 = new Date(monday);
                      mon2.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
                      const baseMon2 = new Date(todayDate);
                      baseMon2.setDate(todayDate.getDate() - ((todayDate.getDay() + 6) % 7));
                      const diff2 = Math.round((mon2.getTime() - baseMon2.getTime()) / (7 * 86400000));
                      const isActive = diff2 === weekOffset;
                      return (
                        <button key={ri} onClick={() => { setWeekOffset(diff2); setShowWeekPicker(false); }}
                          className="grid grid-cols-7 w-full rounded-lg mb-0.5 transition-all"
                          style={{ background: isActive ? '#304035' : 'transparent' }}
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(48,64,53,0.07)'; }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          {row.map((d, ci) => (
                            <div key={ci} className="text-center py-1.5 text-xs font-medium" style={{ color: isActive ? 'rgba(255,255,255,0.9)' : d ? '#304035' : 'transparent' }}>
                              {d ? d.getDate() : '·'}
                            </div>
                          ))}
                        </button>
                      );
                    })}
                    <div className="mt-2 pt-2 border-t border-[#304035]/10">
                      <button onClick={() => { setWeekOffset(0); setShowWeekPicker(false); }} className="w-full text-xs font-semibold text-[#a67749] hover:text-[#304035] transition-colors py-1">
                        Revenir à aujourd'hui
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        }
        extra={
          <div className="pg-kpi-extra" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {kpiData.map((k, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '8px 12px', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ color: 'rgba(255,255,255,0.7)' }}>{renderKpiIcon(k.iconKey)}</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'white', lineHeight: 1 }}>{k.val}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{k.label}</div>
                </div>
              </div>
            ))}
          </div>
        }
      />

      {/* ── CORPS ── */}
      <div className="pg-main-layout flex gap-5">

        {/* ── CALENDRIER ── */}
        <div className="flex-1 rounded-2xl bg-white shadow-lg border border-[#304035]/8 overflow-hidden card-in" style={{ animationDelay: '160ms' }}>
          <div className="pg-cal-wrap">
          <div className="pg-cal-inner">
          {/* En-tête jours */}
          <div className="grid border-b border-[#304035]/10 bg-gradient-to-r from-[#304035]/3 to-transparent" style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}>
            <div className="py-4 px-3" />
            {DAYS_SHORT.map((day, i) => {
              const d = dates[i];
              const isCurrentDay = weekOffset === 0 && d.toDateString() === todayDate.toDateString();
              return (
                <div key={day} className={'py-4 text-center transition-all ' + (isCurrentDay ? 'bg-[#304035]/5' : '')}>
                  <div className={'text-xs font-bold uppercase tracking-wider ' + (isCurrentDay ? 'text-[#304035]' : 'text-[#304035]/40')}>{day}</div>
                  <div className={'text-lg font-bold mt-1 ' + (isCurrentDay ? 'bg-[#304035] text-white rounded-lg py-0.5 px-2 inline-block' : 'text-[#304035]')}>
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grille horaire */}
          <div className="relative overflow-y-auto" style={{ maxHeight: '540px' }}>
            <div className="grid" style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}>

              {/* Colonne heures */}
              <div className="bg-gradient-to-b from-[#304035]/2 to-transparent sticky left-0 z-10">
                {HOURS.map(h => (
                  <div
                    key={h}
                    className="flex items-start justify-end pr-3 text-[11px] font-semibold text-[#304035]/40 border-b border-[#304035]/5"
                    style={{ height: CELL_H + 'px', paddingTop: '8px' }}
                  >
                    {h}:00
                  </div>
                ))}
              </div>

              {/* Colonnes jours */}
              {DAYS_SHORT.map((_, dayIdx) => (
                <div key={dayIdx} className="relative border-l border-[#304035]/5">
                  {HOURS.map((_, hIdx) => {
                    const hour = START_HOUR + hIdx;
                    return (
                      <div
                        key={hIdx}
                        className="border-b border-[#304035]/5 hover:bg-[#304035]/2 transition-colors cursor-pointer group relative"
                        style={{ height: CELL_H + 'px' }}
                        onClick={() => openAdd(dayIdx + 1, hour)}
                      >
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <div className="h-7 w-7 rounded-full bg-[#a67749] text-white flex items-center justify-center shadow-md">
                            <Plus className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Événements */}
                  {currentEvents.filter(e => e.day === dayIdx + 1).map(ev => {
                    const top    = (ev.startHour - START_HOUR) * CELL_H;
                    const height = ev.duration * CELL_H - 4;
                    const color  = ALL_INTERVENTION_TYPES.find(t => t.key === ev.type)?.color || '#a67749';
                    const icon   = ALL_INTERVENTION_TYPES.find(t => t.key === ev.type)?.icon || '🔨';
                    return (
                      <div
                        key={ev.id}
                        className="event-in absolute left-1 right-1 rounded-xl px-2.5 py-2 text-white shadow-lg border border-white/20 group flex flex-col justify-center transition-all duration-200 hover:border-white/50"
                        style={{
                          top: (top + 2) + 'px',
                          height: height + 'px',
                          backgroundColor: color,
                          zIndex: 10,
                          boxShadow: '0 4px 16px ' + color + '55',
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => deleteGestEvent(ev.id)}
                          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-md hover:bg-white/25"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="text-base leading-tight">{icon}</div>
                        <div className="font-bold text-[11px] leading-tight mt-0.5 truncate pr-4">{ev.type}</div>
                        <div className="text-[11px] font-semibold opacity-90 truncate">{ev.client}</div>
                        {ev.intervenantName && (
                          <div className="text-[10px] font-semibold opacity-95 truncate flex items-center gap-1 mt-0.5">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/80" />
                            {ev.intervenantName}
                            {ev.intervenantType && <span className="opacity-75">· {formatTypeLabel(ev.intervenantType)}</span>}
                          </div>
                        )}
                        <div className="text-[10px] opacity-70 mt-0.5">{ev.startHour}:00 — {ev.startHour + ev.duration}:00</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          </div>
          </div>
        </div>

        {/* ── PANNEAU DROIT ── */}
        <div className="pg-side-panel w-64 flex flex-col gap-4">

          {/* Légende */}
          <div className="card-in rounded-2xl bg-white border border-[#304035]/8 shadow-sm p-4" style={{ animationDelay: '200ms' }}>
            <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider mb-3">Types d'intervention</p>
            <div className="space-y-1.5">
              {INTERVENTION_TYPES.map(({ key, label, color, icon }) => (
                <div key={key} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#f5eee8]/60 transition-colors">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs font-semibold text-[#304035]">{icon} {label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Intervenants — tableau Nom + Métier branche sur le store reel */}
          <div className="card-in rounded-2xl bg-white border border-[#304035]/8 shadow-sm p-4" style={{ animationDelay: '240ms' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider">Intervenants</p>
              {intervenantsList.length > 0 && (
                <span className="text-[10px] font-bold text-[#a67749] bg-[#a67749]/10 rounded-full px-2 py-0.5">{intervenantsList.length}</span>
              )}
            </div>
            {intervenantsList.length === 0 ? (
              <div className="text-[11px] text-[#304035]/45 italic py-2">
                Aucun intervenant pour l'instant.
                <br />
                Ajoutez-en depuis la page <a href="/intervenants" className="underline text-[#a67749] hover:text-[#86592e]">Intervenants</a>.
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-[#304035]/5">
                {intervenantsList.map(iv => {
                  const color = nameToColor(iv.name || iv.id);
                  return (
                    <div key={iv.id} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm"
                        style={{ background: color }}
                        title={iv.name}
                      >
                        {nameToInitials(iv.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#304035] truncate">{iv.name || 'Sans nom'}</p>
                        <p className="text-[10px] text-[#304035]/55 truncate">
                          <span
                            className="inline-block px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wider"
                            style={{ background: color + '20', color: color }}
                          >
                            {formatTypeLabel(iv.type) || 'Autre'}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Alertes chantier */}
          <div className="card-in rounded-2xl bg-white border border-[#304035]/8 shadow-sm p-4" style={{ animationDelay: '280ms' }}>
            <p className="text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider mb-3">Alertes chantier</p>
            {currentEvents.length === 0 ? (
              <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-[#2ecc71]/10">
                <CheckCircle className="h-4 w-4 text-[#2ecc71] shrink-0" />
                <p className="text-xs font-semibold text-[#2ecc71]">Aucune alerte</p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentEvents.length >= 4 && (
                  <div className="flex items-start gap-2 px-2 py-2 rounded-lg bg-[#f0c040]/10">
                    <AlertTriangle className="h-3.5 w-3.5 text-[#f0c040] shrink-0 mt-0.5" />
                    <p className="text-[11px] font-semibold text-[#a67749] leading-snug">Semaine chargée : {currentEvents.length} interventions</p>
                  </div>
                )}
                {currentEvents.some(e => e.duration >= 6) && (
                  <div className="flex items-start gap-2 px-2 py-2 rounded-lg bg-[#e07050]/10">
                    <Clock className="h-3.5 w-3.5 text-[#e07050] shrink-0 mt-0.5" />
                    <p className="text-[11px] font-semibold text-[#e07050] leading-snug">Intervention longue durée planifiée</p>
                  </div>
                )}
                {currentEvents.length < 4 && !currentEvents.some(e => e.duration >= 6) && (
                  <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-[#2ecc71]/10">
                    <CheckCircle className="h-4 w-4 text-[#2ecc71] shrink-0" />
                    <p className="text-xs font-semibold text-[#2ecc71]">Planning équilibré</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FAB */}
          <button
            onClick={() => {
              const d = new Date();
              openAdd(((d.getDay() + 6) % 7) + 1, 9);
            }}
            className="card-in rounded-2xl bg-gradient-to-br from-[#304035] to-[#304035]/85 text-white p-4 shadow-lg hover:shadow-xl transition-all flex items-center gap-3 font-semibold text-sm active:scale-95"
            style={{ animationDelay: '320ms' }}
          >
            <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Plus className="h-5 w-5" />
            </div>
            Planifier une intervention
          </button>
        </div>
      </div>

      {/* ── MODAL NOUVELLE INTERVENTION ── */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm overflow-y-auto py-6"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl border border-[#304035]/10 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-xl font-bold text-[#304035]">Nouvelle intervention</h3>
                <p className="text-sm text-[#304035]/50 mt-0.5">{typeInfo.icon} {typeInfo.label}</p>
              </div>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-xl hover:bg-[#f5eee8] transition-colors">
                <X className="h-5 w-5 text-[#304035]/50" />
              </button>
            </div>

            <div className="space-y-5">

              {/* Type d'intervention — liste principale + bouton "+" pour
                  ouvrir la liste des artisans occasionnels. */}
              <div className="relative">
                <label className="block text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider mb-2">Type d'intervention</label>
                <div className="grid grid-cols-2 gap-2">
                  {INTERVENTION_TYPES.map(t => (
                    <button
                      key={t.key}
                      onClick={() => setNewEvent(p => ({ ...p, type: t.key }))}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-left text-xs font-semibold"
                      style={{
                        borderColor: newEvent.type === t.key ? t.color : 'rgba(48,64,53,0.12)',
                        background: newEvent.type === t.key ? t.color + '18' : 'transparent',
                        color: newEvent.type === t.key ? t.color : '#304035',
                      }}
                    >
                      <span>{t.icon}</span>
                      <span className="truncate">{t.label}</span>
                    </button>
                  ))}
                  {/* Bouton "+" → ouvre le popover des artisans occasionnels */}
                  {(() => {
                    const occType = OCCASIONAL_INTERVENTION_TYPES.find(t => t.key === newEvent.type);
                    const isOccSelected = !!occType;
                    return (
                      <button
                        type="button"
                        onClick={() => setShowOccasionalPicker(s => !s)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed transition-all text-left text-xs font-semibold"
                        style={{
                          borderColor: isOccSelected ? (occType?.color ?? '#a67749') : 'rgba(166,119,73,0.4)',
                          background: isOccSelected ? (occType!.color + '18') : 'rgba(166,119,73,0.04)',
                          color: isOccSelected ? (occType!.color) : '#a67749',
                        }}
                        title="Artisans occasionnels (maçon, plâtrier, carreleur, etc.)"
                      >
                        {isOccSelected ? (
                          <>
                            <span>{occType!.icon}</span>
                            <span className="truncate">{occType!.label}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-lg leading-none">+</span>
                            <span className="truncate">Autre artisan</span>
                          </>
                        )}
                      </button>
                    );
                  })()}
                </div>

                {/* Popover liste artisans occasionnels */}
                {showOccasionalPicker && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowOccasionalPicker(false)}
                    />
                    <div
                      className="absolute z-40 mt-2 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-[#304035]/10 overflow-hidden"
                      style={{
                        animation: 'cardIn 0.16s ease both',
                        maxHeight: '320px',
                        overflowY: 'auto',
                      }}
                    >
                      <div className="sticky top-0 bg-gradient-to-r from-[#fff8ef] to-[#fbf8f3] border-b border-[#a67749]/15 px-3 py-2">
                        <p className="text-[10px] font-bold text-[#7c4f1d] uppercase tracking-wider">
                          Artisans occasionnels
                        </p>
                        <p className="text-[10px] text-[#304035]/50 mt-0.5">
                          Pour les corps de métier moins fréquents
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 p-2">
                        {OCCASIONAL_INTERVENTION_TYPES.map(t => (
                          <button
                            key={t.key}
                            type="button"
                            onClick={() => {
                              setNewEvent(p => ({ ...p, type: t.key }));
                              setShowOccasionalPicker(false);
                            }}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all text-left text-xs font-semibold hover:scale-[1.02]"
                            style={{
                              borderColor: newEvent.type === t.key ? t.color : 'rgba(48,64,53,0.08)',
                              background: newEvent.type === t.key ? t.color + '18' : 'white',
                              color: newEvent.type === t.key ? t.color : '#304035',
                            }}
                          >
                            <span className="text-sm">{t.icon}</span>
                            <span className="truncate">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Client */}
              <div>
                <label className="block text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider mb-2">Client / Dossier *</label>
                <input
                  autoFocus
                  list="gestion-clients"
                  value={newEvent.client}
                  onChange={e => setNewEvent(p => ({ ...p, client: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder="Tapez ou sélectionnez..."
                  className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/50 px-3 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/30 focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
                />
                <datalist id="gestion-clients">
                  {allClients.map(n => <option key={n} value={n} />)}
                </datalist>
              </div>

              {/* Calendrier date */}
              <div>
                <label className="block text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider mb-2">Date</label>
                <div className="rounded-2xl border border-[#304035]/12 bg-[#f5eee8]/30 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => { const d = new Date(calYear, calMonth - 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}
                      className="p-1.5 rounded-lg hover:bg-[#304035]/8 transition-colors"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 text-[#304035]" />
                    </button>
                    <span className="text-xs font-bold text-[#304035] capitalize">{MONTHS[calMonth]} {calYear}</span>
                    <button
                      onClick={() => { const d = new Date(calYear, calMonth + 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}
                      className="p-1.5 rounded-lg hover:bg-[#304035]/8 transition-colors"
                    >
                      <ChevronRight className="h-3.5 w-3.5 text-[#304035]" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 mb-1">
                    {['L','M','M','J','V','S','D'].map((d, i) => (
                      <div key={i} className="text-center text-[10px] font-bold text-[#304035]/35 py-0.5">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {calCells.map((d, i) => {
                      if (!d) return <div key={i} />;
                      const yyyy = d.getFullYear();
                      const mm   = String(d.getMonth() + 1).padStart(2, '0');
                      const dd2  = String(d.getDate()).padStart(2, '0');
                      const iso  = yyyy + '-' + mm + '-' + dd2;
                      const isSelected = iso === modalDate;
                      const isToday2 = d.toDateString() === todayDate.toDateString();
                      return (
                        <button
                          key={i}
                          onClick={() => setModalDate(iso)}
                          className="h-7 w-full flex items-center justify-center rounded-lg text-xs font-semibold transition-all"
                          style={{
                            background: isSelected ? '#304035' : isToday2 ? 'rgba(16,185,129,0.15)' : 'transparent',
                            color: isSelected ? 'white' : isToday2 ? '#10b981' : '#304035',
                          }}
                        >
                          {d.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Heure */}
              <div>
                <label className="block text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider mb-2">Heure de début</label>
                <div className="flex flex-wrap gap-2">
                  {[8,9,10,11,12,13,14,15,16,17,18,19].map(h => (
                    <button
                      key={h}
                      onClick={() => setModalHour(h)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background: modalHour === h ? '#304035' : 'rgba(48,64,53,0.07)',
                        color: modalHour === h ? 'white' : '#304035',
                      }}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>

              {/* Durée */}
              <div>
                <label className="block text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider mb-2">Durée</label>
                <div className="flex flex-wrap gap-2">
                  {[1,2,3,4,5,6,7,8].map(h => (
                    <button
                      key={h}
                      onClick={() => setNewEvent(p => ({ ...p, duration: h }))}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background: newEvent.duration === h ? typeInfo.color : 'rgba(48,64,53,0.07)',
                        color: newEvent.duration === h ? 'white' : '#304035',
                      }}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>

              {/* Intervenant assigne (optionnel mais recommande) ─────────────────────
                  Lit la liste des intervenants depuis useIntervenantStore. Affiche
                  Nom + Metier (POSEUR, PLOMBIER, ELECTRICIEN, ...) pour faciliter
                  le choix sur le terrain. Le metier est snapshote dans l'event. */}
              <div>
                <label className="block text-[10px] font-bold text-[#304035]/50 uppercase tracking-wider mb-2">
                  Intervenant assigné <span className="text-[#304035]/40 font-normal normal-case">(optionnel)</span>
                </label>
                {intervenantsList.length === 0 ? (
                  <div className="text-[11px] text-[#304035]/45 italic rounded-xl border border-dashed border-[#304035]/20 px-3 py-2">
                    Aucun intervenant disponible. Ajoutez-en depuis <a href="/intervenants" className="underline text-[#a67749] hover:text-[#86592e]">la page Intervenants</a>.
                  </div>
                ) : (
                  <select
                    value={newEvent.intervenantId ?? ''}
                    onChange={(e) => setNewEvent(p => ({ ...p, intervenantId: e.target.value || null }))}
                    aria-label="Choisir un intervenant"
                    className="w-full rounded-xl border border-[#304035]/20 bg-white px-3 py-2 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#a67749]/40"
                  >
                    <option value="">— Aucun intervenant —</option>
                    {intervenantsList.map((iv) => (
                      <option key={iv.id} value={iv.id}>
                        {iv.name || 'Sans nom'}
                        {iv.type ? ` · ${formatTypeLabel(iv.type)}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleAdd}
                disabled={!newEvent.client.trim() || !modalDate}
                className="flex-1 rounded-xl py-3 font-bold text-white transition-all disabled:opacity-40"
                style={{ background: typeInfo.color }}
              >
                Planifier l'intervention
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 rounded-xl border border-[#304035]/20 py-3 font-semibold text-[#304035] hover:bg-[#f5eee8] transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
