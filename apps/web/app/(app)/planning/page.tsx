'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, X, Clock,
  AlertTriangle, Circle, CheckCircle, Zap, CalendarDays,
  MapPin, User, ArrowRight, TrendingUp, Target, Wrench,
  Pencil, Trash2,
} from 'lucide-react';
import { useDossierStore, usePlanningStore } from '@/store';
import { useDemandesStore } from '@/store/useDemandesStore';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { SendToIntervenantButton } from '@/components/demandes/SendToIntervenantButton';

/* ── CONSTANTES ── */
const HOURS = [8,9,10,11,12,13,14,15,16,17,18,19];
const DAYS_SHORT = ['LUN','MAR','MER','JEU','VEN','SAM','DIM'];
const DAYS_FULL  = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const CELL_H = 52;
const START_HOUR = 8;
const MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

/* ── TYPES RDV — declares globalement, filtres par profession via getRdvTypes() ─ */
type RdvTypeDef = {
  key: string;
  label: string;
  color: string;
  icon: string;
  /** Si true, le RDV apparait aussi dans /planning-gestion (operationnel + gestion) */
  dualPlanning?: boolean;
};

/**
 * Types communs (livraison/suivi chantier/etc.) qui peuvent etre crees depuis
 * les 2 plannings — tagges dualPlanning: true.
 */
const RDV_DUAL: RdvTypeDef[] = [
  { key: 'LIVRAISON',     label: 'Livraison',           color: '#e8a020', icon: '📦', dualPlanning: true },
  { key: 'SUIVI_CHANTIER',label: 'Suivi chantier',      color: '#7c4f1d', icon: '🏗', dualPlanning: true },
  { key: 'RECEPTION',     label: 'Réception travaux',   color: '#2ecc71', icon: '✅', dualPlanning: true },
  { key: 'MESURAGE',      label: 'Relevé de mesures',   color: '#e74c3c', icon: '📏', dualPlanning: true },
  { key: 'ETAT_LIEUX',    label: 'État des lieux',      color: '#a78bfa', icon: '📋', dualPlanning: true },
  { key: 'RDV_FOURNISSEUR',label: 'RDV fournisseur',    color: '#f59e0b', icon: '🚚', dualPlanning: true },
];

/** Types specifiques cuisiniste */
const RDV_CUISINISTE: RdvTypeDef[] = [
  { key: 'COMMANDE',          label: 'Commande',                    color: '#1A3A5C', icon: '🛒' },
  { key: 'PLAN_TECHNIQUE',    label: 'Plan technique',              color: '#5b9bd5', icon: '📐' },
  { key: 'FICHE_POSE',        label: 'Fiche de pose',               color: '#0ea5e9', icon: '📝' },
  { key: 'CLIENT',            label: 'RDV client',                  color: '#9b59b6', icon: '🤝' },
  { key: 'MODIFS_DOSSIER',    label: 'Modifications dossier',       color: '#8b5cf6', icon: '✏️' },
  { key: 'ADMIN',             label: 'Administratif',               color: '#64748b', icon: '🗂' },
  { key: 'DESSIN_PROJET',     label: 'Dessin projet',               color: '#0891b2', icon: '🎨' },
  { key: 'ORG_LIVRAISON',     label: 'Organisation livraison',      color: '#ea580c', icon: '📦' },
  { key: 'SAV',               label: 'Dossier SAV',                 color: '#dc2626', icon: '🛠' },
];

/**
 * Cles RDV_DUAL a exclure du planning Cuisiniste — geree au niveau de
 * getRdvTypes() pour preserver les autres metiers (architecte, menuisier)
 * qui peuvent avoir besoin de ces types.
 */
const CUISINISTE_EXCLUDED_DUAL_KEYS = new Set<string>(['ETAT_LIEUX', 'RDV_FOURNISSEUR']);

/** Types specifiques architecte d'interieur */
const RDV_ARCHITECTE: RdvTypeDef[] = [
  { key: 'APS',               label: 'APS',                         color: '#3D5449', icon: '📐' },
  { key: 'APD',               label: 'APD',                         color: '#2C3E2F', icon: '📐' },
  { key: 'MODIFS_APS',        label: 'Modifications APS',           color: '#6b8e73', icon: '✏️' },
  { key: 'MODIFS_APD',        label: 'Modifications APD',           color: '#4a6951', icon: '✏️' },
  { key: 'CLIENT',            label: 'RDV client',                  color: '#9b59b6', icon: '🤝' },
  { key: 'DESSIN_PERMIS',     label: 'Dessin permis de construire', color: '#0891b2', icon: '🏛' },
  { key: 'DCE',               label: 'DCE',                         color: '#0284c7', icon: '📑' },
  { key: 'MODIFS_PERMIS',     label: 'Modifications permis',        color: '#0369a1', icon: '✏️' },
  { key: 'MODIFS_DCE',        label: 'Modifications DCE',           color: '#075985', icon: '✏️' },
  { key: 'MARCHE_SIGNATURE',  label: 'Marché / Signatures',         color: '#be185d', icon: '✍️' },
  { key: 'COMMANDE_FOURNISSEUR',label: 'Commande fournisseur',      color: '#16a34a', icon: '🛒' },
  { key: 'CONFIRM_COMMANDE',  label: 'Confirmation commande',       color: '#15803d', icon: '✅' },
  { key: 'ORG_LIVRAISON',     label: 'Organisation livraison',      color: '#ea580c', icon: '📦' },
  { key: 'SAV',               label: 'Dossier SAV',                 color: '#dc2626', icon: '🛠' },
  { key: 'ADMIN',             label: 'Administratif',               color: '#64748b', icon: '🗂' },
];

/** Types specifiques menuisier */
const RDV_MENUISIER: RdvTypeDef[] = [
  { key: 'DOSSIER_FAB',       label: 'Dossier fabrication',         color: '#7B4F2E', icon: '🪚' },
  { key: 'PLAN_TECHNIQUE',    label: 'Dossier plan technique',      color: '#a67749', icon: '📐' },
  { key: 'CLIENT',            label: 'RDV client',                  color: '#9b59b6', icon: '🤝' },
  { key: 'MODIFS_DOSSIER',    label: 'Modifications dossier',       color: '#8b5cf6', icon: '✏️' },
  { key: 'ADMIN',             label: 'Administratif',               color: '#64748b', icon: '🗂' },
  { key: 'DESSIN_PROJET',     label: 'Dessin projet',               color: '#0891b2', icon: '🎨' },
  { key: 'CONFIRM_COMMANDE',  label: 'Confirmation commande',       color: '#16a34a', icon: '✅' },
  { key: 'COMMANDE_FOURNISSEUR',label: 'Commande fournisseur',      color: '#15803d', icon: '🛒' },
  { key: 'ORG_LIVRAISON',     label: 'Organisation livraison',      color: '#ea580c', icon: '📦' },
  { key: 'SAV',               label: 'Dossier SAV',                 color: '#dc2626', icon: '🛠' },
  { key: 'DEBIT_LISTE',       label: 'Débit-liste matériaux',       color: '#92400e', icon: '📦' },
];

/**
 * Retourne la liste filtree des types selon la profession active.
 * Pour /planning : tous les types (specifiques + dual).
 * Pour /planning-gestion : uniquement les dualPlanning.
 */
function getRdvTypes(profession: string | null | undefined, viewKind: 'planning' | 'planning-gestion' = 'planning'): RdvTypeDef[] {
  let specific: RdvTypeDef[] = [];
  switch (profession) {
    case 'cuisiniste': specific = RDV_CUISINISTE; break;
    case 'architecte': specific = RDV_ARCHITECTE; break;
    case 'menuisier':  specific = RDV_MENUISIER; break;
    default:
      // Fallback : ancienne liste generique
      specific = [
        { key: 'VISITE', label: 'Visite chantier', color: '#e07050', icon: '🔨' },
        { key: 'PLAN',   label: 'Remise plan',     color: '#5b9bd5', icon: '📐' },
        { key: 'CLIENT', label: 'RDV client',      color: '#9b59b6', icon: '🤝' },
      ];
  }
  if (viewKind === 'planning-gestion') {
    return RDV_DUAL;
  }
  // /planning : specifiques d'abord, puis dual (livraison/etc.)
  // Pour cuisiniste : on filtre 'Etat des lieux' et 'RDV fournisseur' qui ne
  // s'appliquent pas a ce metier (workflow client direct, pas de visite tech
  // intermediaire ni de RDV fournisseur dans le planning operationnel).
  const dual = profession === 'cuisiniste'
    ? RDV_DUAL.filter((t) => !CUISINISTE_EXCLUDED_DUAL_KEYS.has(t.key))
    : RDV_DUAL;
  return [...specific, ...dual];
}

// Backward compat : ancien export utilise dans le code
const RDV_TYPES: RdvTypeDef[] = [...RDV_DUAL];

/* ── STATUS COLORS ── */
const STATUS_COLOR: Record<string, string> = {
  'URGENT':    '#ef4444',
  'EN COURS':  '#f97316',
  'FINITION':  '#10b981',
  'A VALIDER': '#4ade80',
};

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
  const start = dates[0], end = dates[6];
  if (start.getMonth() === end.getMonth())
    return `${start.getDate()} — ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  return `${start.getDate()} ${MONTHS[start.getMonth()]} — ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
}

function isToday(d: Date): boolean {
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function avatarColor(name: string) {
  const palettes = [
    ['#2d5a30','#4aa350'], ['#7c3a1e','#c08a5a'],
    ['#1e3a5f','#4a7ec0'], ['#5a2d5a','#c04aa3'],
    ['#3a4a1e','#7ec04a'], ['#1a4a4a','#4ac0c0'],
    ['#4a3a1e','#c0a04a'],
  ];
  return palettes[name.charCodeAt(0) % palettes.length];
}

function daysUntil(dateStr: string): number {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return 999;
  const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

/* ── COMPOSANT PRINCIPAL ── */
export default function PlanningPage() {
  const router = useRouter();
  const dossiers        = useDossierStore(s => s.dossiers);
  const dossiersSignes  = useDossierStore(s => s.dossiersSignes);
  const planningEvents  = usePlanningStore(s => s.planningEvents);
  const addPlanningEvent   = usePlanningStore(s => s.addPlanningEvent);
  const updatePlanningEvent = usePlanningStore(s => s.updatePlanningEvent);
  const deletePlanningEvent = usePlanningStore(s => s.deletePlanningEvent);

  // Profession active → filtre les types de RDV proposes
  const profession = useAuthStore(s => s.profession);
  const rdvTypes = useMemo(() => getRdvTypes(profession, 'planning'), [profession]);

  // Demandes scheduledFor (interventions intervenants) — merge avec planning
  const proDemandes = useDemandesStore(s => s.proDemandes);
  const fetchProDemandes = useDemandesStore(s => s.fetchProDemandes);
  useEffect(() => { fetchProDemandes(); }, [fetchProDemandes]);
  const upcomingInterventions = useMemo(() => {
    const now = Date.now();
    const oneWeek = now + 7 * 86400_000;
    return proDemandes
      .filter(d => d.scheduledFor && new Date(d.scheduledFor).getTime() >= now && new Date(d.scheduledFor).getTime() <= oneWeek)
      .filter(d => d.status !== 'REFUSEE' && d.status !== 'ANNULEE')
      .sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime())
      .slice(0, 5);
  }, [proDemandes]);

  const [weekOffset, setWeekOffset]   = useState(0);
  const [showAdd,    setShowAdd]      = useState(false);
  const [addCell,    setAddCell]      = useState<{ day: number; hour: number } | null>(null);
  const [newEvent,   setNewEvent]     = useState({ type: 'CLIENT', dossierId: '', title: '', duration: 2, color: '' });
  const [modalDate,  setModalDate]    = useState('');  // 'YYYY-MM-DD'
  const [modalHour,  setModalHour]    = useState(9);
  // Mini calendrier custom (modal RDV)
  const [calYear,  setCalYear]  = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth()); // 0-11
  // Picker semaine dans le header
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [pickYear,  setPickYear]  = useState(() => new Date().getFullYear());
  const [pickMonth, setPickMonth] = useState(() => new Date().getMonth());
  const [nowPct,     setNowPct]       = useState(0);
  const [hoveredId,  setHoveredId]    = useState<string | null>(null);
  const [clickedId,  setClickedId]    = useState<string | null>(null);
  // Popover Google-Agenda-style (clic sur RDV → menu Modifier / Supprimer)
  const [popoverEventId, setPopoverEventId] = useState<string | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null);
  // Modale d'édition (réutilise le state newEvent + showAdd, mais en mode "edit")
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  // Drag & drop : id de l'event en cours de drag + offset visuel
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ day: number; hour: number } | null>(null);

  /* Ligne "maintenant" en temps réel */
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const mins = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
      setNowPct(Math.max(0, Math.min(100, (mins / (HOURS.length * 60)) * 100)));
    };
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, []);

  const dates = getWeekDates(weekOffset);
  const currentEvents = planningEvents.filter(e => (e.weekOffset ?? 0) === weekOffset);

  /**
   * Layout "quinconce" — calcule pour chaque event sa colonne et le nombre
   * total de colonnes du cluster d'overlap. Permet d'afficher 2-3 RDV
   * côte-à-côte dans le même créneau (style Google Agenda).
   *
   * Algo : pour chaque jour, on traite les events triés par startHour puis
   * duration desc. On assigne à chaque event la 1ère colonne libre. Un cluster
   * = ensemble d'events qui s'overlapent transitivement. La largeur d'un
   * event = 1 / (nombre max de colonnes utilisées dans son cluster).
   */
  const eventLayout = useMemo(() => {
    const map = new Map<string, { col: number; cols: number }>();
    // Group par day
    const byDay = new Map<number, typeof currentEvents>();
    for (const ev of currentEvents) {
      const arr = byDay.get(ev.day) ?? [];
      arr.push(ev);
      byDay.set(ev.day, arr);
    }
    for (const [, evs] of byDay) {
      // Trier par startHour, puis durée descendante (les plus longs d'abord)
      const sorted = [...evs].sort((a, b) => {
        if (a.startHour !== b.startHour) return a.startHour - b.startHour;
        return b.duration - a.duration;
      });

      // Assignation gloutonne : pour chaque event, trouver la 1ère colonne libre
      const colEnds: number[] = []; // colEnds[c] = endHour du dernier event de la col c
      const colsAssigned = new Map<string, number>();

      for (const ev of sorted) {
        const evStart = ev.startHour;
        const evEnd = ev.startHour + ev.duration;
        let assignedCol = -1;
        for (let c = 0; c < colEnds.length; c++) {
          if (colEnds[c] <= evStart) {
            assignedCol = c;
            colEnds[c] = evEnd;
            break;
          }
        }
        if (assignedCol === -1) {
          assignedCol = colEnds.length;
          colEnds.push(evEnd);
        }
        colsAssigned.set(ev.id, assignedCol);
      }

      // Pour chaque event, calculer le nombre de colonnes "actives" dans son cluster.
      // Un cluster = events qui s'overlapent (au moins 2 à 2 transitivement).
      // Pour la simplicité on retourne le nombre TOTAL de colonnes du jour si
      // l'event chevauche au moins une autre, sinon 1. C'est moins optimal mais
      // visuellement OK et facile à comprendre.
      for (const ev of sorted) {
        const evStart = ev.startHour;
        const evEnd = ev.startHour + ev.duration;
        const overlapping = sorted.filter(other =>
          other.id !== ev.id &&
          !(other.startHour + other.duration <= evStart) &&
          !(other.startHour >= evEnd),
        );
        // Nombre de colonnes effectives = max(col assignée + 1) parmi cet event
        // et tous ceux qui le chevauchent.
        let maxCol = colsAssigned.get(ev.id) ?? 0;
        for (const o of overlapping) {
          maxCol = Math.max(maxCol, colsAssigned.get(o.id) ?? 0);
        }
        map.set(ev.id, {
          col: colsAssigned.get(ev.id) ?? 0,
          cols: maxCol + 1,
        });
      }
    }
    return map;
  }, [currentEvents]);

  const allDossiers = [...dossiers, ...dossiersSignes];
  const clientNames = allDossiers.map(d => ({ id: d.id, label: `${d.name}${('firstName' in d && d.firstName) ? ' ' + d.firstName : ''}` }));

  /* KPIs */
  const eventsThisWeek = currentEvents.length;
  const urgentCount    = dossiers.filter(d => d.status === 'URGENT').length;
  const nextEvent      = [...currentEvents].sort((a,b) => a.day - b.day || a.startHour - b.startHour)[0];

  /* Taux d'occupation : % des créneaux de 8h-19h utilisés sur 5 jours ouvrés */
  const totalSlots = 5 * HOURS.length;
  const usedSlots  = currentEvents.filter(e => e.day <= 5).reduce((s, e) => s + (e.duration || 1), 0);
  const occupPct   = Math.round(Math.min(100, (usedSlots / totalSlots) * 100));

  /* Ouverture modal ajout */
  const openAdd = (day: number, hour: number) => {
    setAddCell({ day, hour });
    setNewEvent({ type: 'CLIENT', dossierId: dossiers[0]?.id ?? '', title: '', duration: 2, color: '' });
    // Calcul de la date réelle correspondant à la cellule cliquée
    const cellDate = getWeekDates(weekOffset)[day - 1];
    const yyyy = cellDate.getFullYear();
    const mm = String(cellDate.getMonth() + 1).padStart(2, '0');
    const dd = String(cellDate.getDate()).padStart(2, '0');
    setModalDate(`${yyyy}-${mm}-${dd}`);
    setModalHour(hour);
    setCalYear(cellDate.getFullYear());
    setCalMonth(cellDate.getMonth());
    setShowAdd(true);
  };

  const handleAdd = () => {
    if (!modalDate) return;
    const dossier = allDossiers.find(d => d.id === newEvent.dossierId);
    const rdvType = rdvTypes.find(r => r.key === newEvent.type) ?? RDV_TYPES.find(r => r.key === newEvent.type);

    // Calcule le weekOffset et le day (1=lun...7=dim) à partir de modalDate
    const chosen = new Date(modalDate + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    // Lundi de la semaine de chosen
    const chosenMon = new Date(chosen);
    chosenMon.setDate(chosen.getDate() - ((chosen.getDay() + 6) % 7));
    // Lundi de la semaine courante (weekOffset=0)
    const baseMon = new Date(today);
    baseMon.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const diffWeeks = Math.round((chosenMon.getTime() - baseMon.getTime()) / (7 * 86400000));
    const dayOfWeek = ((chosen.getDay() + 6) % 7) + 1; // 1=lun...7=dim

    addPlanningEvent({
      day: dayOfWeek,
      startHour: modalHour,
      duration: newEvent.duration,
      title: newEvent.title || (dossier ? `${rdvType?.icon} ${dossier.name}` : rdvType?.label ?? 'RDV'),
      // Couleur custom prioritaire (color picker), sinon couleur du type RDV
      color: newEvent.color || rdvType?.color || '#5b9bd5',
      type: newEvent.type,
      weekOffset: diffWeeks,
    });
    // Naviguer vers la semaine de l'événement créé
    setWeekOffset(diffWeeks);
    setShowAdd(false);
    setEditingEventId(null);
  };

  /* Édition d'un événement existant (réutilise la modale showAdd) */
  const openEdit = (eventId: string) => {
    const ev = planningEvents.find(e => e.id === eventId);
    if (!ev) return;
    setEditingEventId(eventId);
    setNewEvent({
      type: ev.type ?? 'CLIENT',
      dossierId: '',
      title: ev.title ?? '',
      duration: ev.duration ?? 2,
      color: ev.color ?? '',
    });
    // Calcule la date réelle de l'event (jour + weekOffset)
    const eventDates = getWeekDates(ev.weekOffset ?? 0);
    const cellDate = eventDates[(ev.day ?? 1) - 1];
    if (cellDate) {
      const yyyy = cellDate.getFullYear();
      const mm = String(cellDate.getMonth() + 1).padStart(2, '0');
      const dd = String(cellDate.getDate()).padStart(2, '0');
      setModalDate(`${yyyy}-${mm}-${dd}`);
      setModalHour(ev.startHour ?? 9);
      setCalYear(cellDate.getFullYear());
      setCalMonth(cellDate.getMonth());
    }
    setPopoverEventId(null);
    setShowAdd(true);
  };

  /* Sauvegarde de l'édition (en cours d'édition) */
  const handleSaveEdit = () => {
    if (!editingEventId || !modalDate) return;
    const dossier = allDossiers.find(d => d.id === newEvent.dossierId);
    const rdvType = rdvTypes.find(r => r.key === newEvent.type) ?? RDV_TYPES.find(r => r.key === newEvent.type);
    const chosen = new Date(modalDate + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const chosenMon = new Date(chosen);
    chosenMon.setDate(chosen.getDate() - ((chosen.getDay() + 6) % 7));
    const baseMon = new Date(today);
    baseMon.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const diffWeeks = Math.round((chosenMon.getTime() - baseMon.getTime()) / (7 * 86400000));
    const dayOfWeek = ((chosen.getDay() + 6) % 7) + 1;
    updatePlanningEvent(editingEventId, {
      day: dayOfWeek,
      startHour: modalHour,
      duration: newEvent.duration,
      title: newEvent.title || (dossier ? `${rdvType?.icon} ${dossier.name}` : rdvType?.label ?? 'RDV'),
      // Couleur custom prioritaire (color picker), sinon couleur du type RDV
      color: newEvent.color || rdvType?.color || '#5b9bd5',
      type: newEvent.type,
      weekOffset: diffWeeks,
    });
    setWeekOffset(diffWeeks);
    setShowAdd(false);
    setEditingEventId(null);
  };

  /* Drop d'un event sur une autre cellule (drag & drop) */
  const handleDropEvent = (targetDay: number, targetHour: number) => {
    if (!draggingEventId) return;
    updatePlanningEvent(draggingEventId, {
      day: targetDay,
      startHour: targetHour,
      weekOffset: weekOffset,
    });
    setDraggingEventId(null);
    setDragOverCell(null);
  };

  /* Fermer le popover si on clique ailleurs.
   * Bug fix : on utilise `click` au lieu de `mousedown` pour que le onClick
   * React (sur les boutons Modifier/Supprimer du popover) soit déclenché
   * AVANT que le listener document. Sinon le popover se fermait avant que
   * le bouton "Modifier" ne soit traité, et openEdit n'était jamais appelé.
   * On vérifie aussi que le target n'est pas dans le popover pour éviter
   * de fermer en plein milieu d'une interaction. */
  useEffect(() => {
    if (!popoverEventId) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('.plan-popover')) return;
      setPopoverEventId(null);
    };
    // setTimeout(0) pour ne pas attraper le click qui vient d'ouvrir le popover
    const t = setTimeout(() => document.addEventListener('click', onDocClick), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', onDocClick);
    };
  }, [popoverEventId]);

  /* Deadlines : dossiers créés avec status URGENT depuis > 7 jours */
  const deadlines = dossiers
    .filter(d => ['URGENT','EN COURS'].includes(d.status))
    .slice(0, 4)
    .map(d => {
      const delta = daysUntil(d.createdAt);
      return { ...d, delta };
    })
    .sort((a, b) => a.delta - b.delta);

  return (
    <div className="w-full space-y-4">
      <style>{`
        @media (max-width: 768px) {
          .plan-kpi-extra { grid-template-columns: repeat(2, 1fr) !important; }
          .plan-main-layout { flex-direction: column !important; }
          .plan-side-panel { width: 100% !important; }
          .plan-cal-wrap { overflow-x: auto; }
          .plan-cal-inner { min-width: 560px; }
        }
      `}</style>
      

      {/* ── HEADER avec nav + KPIs intégrés ── */}
      <PageHeader
        icon={<Calendar className="h-7 w-7" />}
        title="Planning"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <ChevronLeft className="h-4 w-4" style={{ color: 'white' }} />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              style={{
                padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: weekOffset === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.3)', color: 'white',
              }}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <ChevronRight className="h-4 w-4" style={{ color: 'white' }} />
            </button>
            {/* Week picker */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  const visibleMonday = getWeekDates(weekOffset)[0];
                  setPickYear(visibleMonday.getFullYear());
                  setPickMonth(visibleMonday.getMonth());
                  setShowWeekPicker(v => !v);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer' }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{getWeekLabel(weekOffset)}</span>
                <ChevronRight className="h-3 w-3 rotate-90" style={{ color: 'rgba(255,255,255,0.6)' }} />
              </button>
              {showWeekPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowWeekPicker(false)} />
                  <div
                    className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-[#304035]/10 overflow-hidden"
                    style={{ width: 300, boxShadow: '0 12px 40px rgba(48,64,53,0.18)' }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#304035]/8 bg-[#f9f6f2]">
                      <button onClick={() => { if (pickMonth === 0) { setPickMonth(11); setPickYear(y => y-1); } else setPickMonth(m => m-1); }} className="p-1.5 rounded-lg hover:bg-white transition-colors">
                        <ChevronLeft className="h-4 w-4 text-[#304035]/60" />
                      </button>
                      <span className="text-sm font-bold text-[#304035] capitalize">
                        {new Date(pickYear, pickMonth, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </span>
                      <button onClick={() => { if (pickMonth === 11) { setPickMonth(0); setPickYear(y => y+1); } else setPickMonth(m => m+1); }} className="p-1.5 rounded-lg hover:bg-white transition-colors">
                        <ChevronRight className="h-4 w-4 text-[#304035]/60" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 px-2 pt-2">
                      {['L','M','M','J','V','S','D'].map((d, i) => (
                        <div key={i} className="text-center text-[10px] font-bold text-[#304035]/30 pb-1">{d}</div>
                      ))}
                    </div>
                    <div className="px-2 pb-3">
                      {(() => {
                        const firstDay = new Date(pickYear, pickMonth, 1);
                        const startOffset = (firstDay.getDay() + 6) % 7;
                        const daysInMonth = new Date(pickYear, pickMonth + 1, 0).getDate();
                        const allCells: (number | null)[] = [...Array(startOffset).fill(null)];
                        for (let d = 1; d <= daysInMonth; d++) allCells.push(d);
                        while (allCells.length % 7 !== 0) allCells.push(null);
                        const weeks: (number | null)[][] = [];
                        for (let i = 0; i < allCells.length; i += 7) weeks.push(allCells.slice(i, i+7));
                        const today = new Date(); today.setHours(0,0,0,0);
                        const baseMon = new Date(today);
                        baseMon.setDate(today.getDate() - ((today.getDay()+6)%7));
                        return weeks.map((week, wi) => {
                          const firstDay2 = week.find(d => d !== null);
                          if (firstDay2 === null || firstDay2 === undefined) return null;
                          const weekDate = new Date(pickYear, pickMonth, firstDay2 as number);
                          const weekMon = new Date(weekDate);
                          weekMon.setDate(weekDate.getDate() - ((weekDate.getDay()+6)%7));
                          const offset = Math.round((weekMon.getTime() - baseMon.getTime()) / (7*86400000));
                          const isActive = offset === weekOffset;
                          return (
                            <button key={wi} onClick={() => { setWeekOffset(offset); setShowWeekPicker(false); }}
                              className="grid grid-cols-7 w-full rounded-xl px-1 py-0.5 transition-all mb-0.5"
                              style={{ background: isActive ? '#304035' : 'transparent' }}
                              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(48,64,53,0.06)'; }}
                              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                            >
                              {week.map((d, ci) => {
                                const isToday3 = d !== null && new Date(pickYear, pickMonth, d as number).toDateString() === new Date().toDateString();
                                return (
                                  <span key={ci} className="flex items-center justify-center h-8 text-xs font-semibold rounded-full"
                                    style={{ color: d === null ? 'transparent' : isActive ? 'rgba(255,255,255,0.9)' : isToday3 ? '#10b981' : '#304035', fontWeight: isToday3 ? 700 : 500 }}>
                                    {d ?? ''}
                                  </span>
                                );
                              })}
                            </button>
                          );
                        });
                      })()}
                    </div>
                    <div className="border-t border-[#304035]/8 px-3 py-2">
                      <button onClick={() => { setWeekOffset(0); setShowWeekPicker(false); }} className="w-full py-1.5 rounded-xl text-xs font-bold text-[#304035]/60 hover:bg-[#f5eee8] transition-colors">
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
          <div className="plan-kpi-extra" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {/* KPI 1 */}
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '8px 12px', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <CalendarDays size={16} color="rgba(255,255,255,0.7)" />
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'white', lineHeight: 1 }}>{eventsThisWeek}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>Cette semaine</div>
              </div>
            </div>
            {/* KPI 2 */}
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '8px 12px', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={16} color="rgba(255,160,100,0.9)" />
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'white', lineHeight: 1 }}>{urgentCount}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>Urgents</div>
              </div>
            </div>
            {/* KPI 3 */}
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '8px 12px', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Clock size={16} color="rgba(255,255,255,0.7)" />
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'white', lineHeight: 1 }}>
                  {!nextEvent ? '—' : (() => {
                    const todayDow = (new Date().getDay() + 6) % 7 + 1;
                    const diff = nextEvent.day - todayDow + weekOffset * 7;
                    if (diff < 0) return 'Passé';
                    if (diff === 0) return 'Auj.';
                    return 'J+' + diff;
                  })()}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>Prochain RDV</div>
              </div>
            </div>
            {/* KPI 4 */}
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '8px 12px', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <TrendingUp size={16} color="rgba(255,255,255,0.7)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'white', lineHeight: 1 }}>{occupPct}%</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>Occupation</div>
                <div style={{ marginTop: 4, height: 3, background: 'rgba(255,255,255,0.2)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 10, background: 'rgba(255,255,255,0.7)', width: occupPct + '%', transition: 'width 1s ease' }} />
                </div>
              </div>
            </div>
          </div>
        }
      />

      {/* ── BANNER : Prochaines interventions intervenants (cette semaine) ── */}
      {upcomingInterventions.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#304035]/8 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[#304035]/5 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-[#a67749]" />
            <h3 className="text-xs font-bold text-[#304035] uppercase tracking-widest">Prochaines interventions intervenants ({upcomingInterventions.length})</h3>
          </div>
          <div className="p-3 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {upcomingInterventions.map(d => {
              const dt = new Date(d.scheduledFor!);
              const interName = d.intervenant?.companyName ?? [d.intervenant?.firstName, d.intervenant?.lastName].filter(Boolean).join(' ') ?? '—';
              return (
                <a
                  key={d.id}
                  href={`/intervenants?demande=${d.id}`}
                  className="block rounded-xl border border-[#304035]/8 hover:border-[#a67749]/40 hover:shadow-sm p-3 transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-[#a67749] uppercase tracking-wider">{d.type}</span>
                    <span className="text-[10px] text-[#304035]/55 font-bold">{dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} {dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs font-bold text-[#304035] truncate">{d.title}</p>
                  <p className="text-[10px] text-[#304035]/55 mt-0.5 truncate">→ {interName}</p>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MAIN : CALENDRIER + PANNEAU DROIT ── */}
      <div className="plan-main-layout flex gap-4 items-start">

        {/* ── CALENDRIER SEMAINE (70%) ── */}
        <div className="flex-1 bg-white rounded-2xl border border-[#304035]/8 shadow-sm overflow-hidden" style={{ minWidth: 0 }}>
          <div className="plan-cal-wrap overflow-x-auto">
          <div className="plan-cal-inner">
          {/* En-têtes des jours */}
          <div className="grid border-b border-[#304035]/8" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
            <div className="py-3 border-r border-[#304035]/5" />
            {dates.map((d, i) => {
              const today = isToday(d);
              return (
                <div key={i} className={`py-3 text-center border-r border-[#304035]/5 last:border-r-0 ${today ? 'bg-emerald-50/60' : ''}`}>
                  <p className="text-xs font-bold text-[#304035]/40 uppercase tracking-widest">{DAYS_SHORT[i]}</p>
                  <div className="flex justify-center mt-1">
                    {today ? (
                      <span
                        className="today-badge w-8 h-8 rounded-full bg-[#304035] text-white text-sm font-bold flex items-center justify-center shadow-md"
                        style={{ boxShadow: '0 0 0 3px rgba(16,185,129,0.3)' }}
                      >
                        {d.getDate()}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-[#304035]/60">{d.getDate()}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grille horaire */}
          <div className="relative overflow-y-auto" style={{ maxHeight: '460px' }}>

            {/* Ligne "maintenant" (seulement si semaine courante) */}
            {weekOffset === 0 && (
              <div
                className="now-line absolute left-0 right-0 z-30 flex items-center"
                style={{ top: `${nowPct}%` }}
              >
                <div className="w-14 flex justify-end pr-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div className="flex-1 h-px bg-emerald-500 opacity-70" />
              </div>
            )}

            {HOURS.map((hour, hi) => (
              <div
                key={hour}
                className="grid"
                style={{ gridTemplateColumns: '52px repeat(7, 1fr)', height: CELL_H }}
              >
                {/* Label heure */}
                <div className="flex items-start justify-end pr-2 pt-1 border-r border-[#304035]/5">
                  <span className="text-xs text-[#304035]/30 font-medium">{hour}:00</span>
                </div>

                {/* Cellules jour */}
                {dates.map((d, di) => {
                  const today = isToday(d);
                  const cellEvents = currentEvents.filter(e => e.day === di + 1 && e.startHour === hour);
                  const isDragOver = dragOverCell?.day === di + 1 && dragOverCell?.hour === hour;
                  return (
                    <div
                      key={di}
                      className={`plan-cell relative border-r border-b border-[#304035]/5 last:border-r-0 ${today ? 'bg-emerald-50/20' : ''} ${isDragOver ? 'plan-cell-dragover' : ''}`}
                      style={{ height: CELL_H }}
                      onClick={() => openAdd(di + 1, hour)}
                      // Drop target pour drag & drop
                      onDragOver={(e) => {
                        if (draggingEventId) {
                          e.preventDefault();
                          if (!isDragOver) setDragOverCell({ day: di + 1, hour });
                        }
                      }}
                      onDragLeave={() => {
                        if (isDragOver) setDragOverCell(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDropEvent(di + 1, hour);
                      }}
                    >
                      {/* Hint + au hover */}
                      <div className="add-hint absolute inset-0 flex items-center justify-center">
                        <Plus className="h-3.5 w-3.5 text-[#304035]/20" />
                      </div>

                      {/* Événements — affichés en quinconce si overlap */}
                      {cellEvents.map(ev => {
                        const isHovered = hoveredId === ev.id;
                        const layout = eventLayout.get(ev.id) ?? { col: 0, cols: 1 };
                        // Position horizontale : on partage la largeur entre cols colonnes
                        const widthPct = 100 / layout.cols;
                        const leftPct = layout.col * widthPct;
                        const isDragging = draggingEventId === ev.id;
                        return (
                          <div
                            key={ev.id}
                            className="plan-event absolute rounded-xl px-2 py-1 cursor-grab active:cursor-grabbing select-none group"
                            style={{
                              top: 2,
                              left: `calc(${leftPct}% + 2px)`,
                              width: `calc(${widthPct}% - 4px)`,
                              height: ev.duration * CELL_H - 4,
                              background: ev.color,
                              boxShadow: isHovered
                                ? `0 4px 16px ${ev.color}55, 0 2px 4px rgba(0,0,0,0.1)`
                                : `0 1px 3px rgba(0,0,0,0.08)`,
                              zIndex: isHovered ? 15 : 10,
                              opacity: isDragging ? 0.4 : 1,
                              transition: isDragging ? 'none' : 'opacity 0.15s, box-shadow 0.15s',
                            }}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              setDraggingEventId(ev.id);
                              setPopoverEventId(null);
                              // Permet de garder le curseur "move"
                              e.dataTransfer.effectAllowed = 'move';
                              try { e.dataTransfer.setData('text/plain', ev.id); } catch { /* ignore */ }
                            }}
                            onDragEnd={() => {
                              setDraggingEventId(null);
                              setDragOverCell(null);
                            }}
                            onMouseEnter={() => setHoveredId(ev.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            onClick={e => {
                              e.stopPropagation();
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              setPopoverPosition({
                                x: rect.right + 8,
                                y: rect.top,
                              });
                              setPopoverEventId(ev.id);
                              setClickedId(ev.id);
                              setTimeout(() => setClickedId(null), 400);
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="min-w-0">
                                <p className="text-white text-xs font-bold truncate leading-tight">{ev.title}</p>
                                <p className="text-white/70 text-[10px] mt-0.5">{ev.startHour}:00 — {ev.startHour + ev.duration}:00</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Légende types — selon profession */}
          <div className="border-t border-[#304035]/5 px-4 py-3 flex flex-wrap gap-2">
            {rdvTypes.map(t => (
              <span key={t.key} className="flex items-center gap-1.5 text-xs text-[#304035]/50">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} />
                {t.label}
                {t.dualPlanning && <span className="text-[9px] text-[#a67749]/60" title="Aussi visible sur Planning gestion">↔</span>}
              </span>
            ))}
          </div>
          </div>
          </div>
        </div>

        {/* ── PANNEAU DROIT (30%) ── */}
        <div className="plan-side-panel w-72 flex-shrink-0 space-y-3">

          {/* Dossiers actifs cette semaine */}
          <div className="bg-white rounded-2xl border border-[#304035]/8 shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-2 border-b border-[#304035]/5">
              <h3 className="text-xs font-bold text-[#304035]/50 uppercase tracking-wider">Dossiers en cours</h3>
            </div>
            <div className="divide-y divide-[#304035]/5 max-h-52 overflow-y-auto">
              {dossiers.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-[#304035]/30">Aucun dossier actif</p>
              ) : (
                dossiers.map((d, i) => {
                  const [c1, c2] = avatarColor(d.name);
                  const initials = d.name.charAt(0) + (('firstName' in d && d.firstName) ? (d.firstName as string).charAt(0) : '');
                  return (
                    <Link
                      key={d.id}
                      href={`/dossiers/${d.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#f5eee8]/40 transition-all group"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div
                        className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                      >
                        {initials.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#304035] group-hover:text-[#a67749] transition-colors truncate">
                          {d.name}{('firstName' in d && d.firstName) ? ` ${d.firstName}` : ''}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: STATUS_COLOR[d.status] || '#999' }}
                          />
                          <span className="text-[10px] text-[#304035]/40">{d.status}</span>
                        </div>
                      </div>
                      <ArrowRight className="h-3 w-3 text-[#304035]/15 group-hover:text-[#a67749] transition-colors flex-shrink-0" />
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Deadlines / Alertes */}
          <div className="bg-white rounded-2xl border border-[#304035]/8 shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-2 border-b border-[#304035]/5">
              <h3 className="text-xs font-bold text-[#304035]/50 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Priorités
              </h3>
            </div>
            <div className="p-3 space-y-2">
              {deadlines.length === 0 ? (
                <p className="text-xs text-[#304035]/30 text-center py-4">Tout est sous contrôle 🎉</p>
              ) : (
                deadlines.map((d, i) => {
                  const isUrgent = d.status === 'URGENT';
                  return (
                    <Link
                      key={d.id}
                      href={`/dossiers/${d.id}`}
                      className="deadline-row flex items-center gap-2.5 p-2.5 rounded-xl border hover:shadow-sm transition-all group"
                      style={{
                        animationDelay: `${i * 50}ms`,
                        borderColor: isUrgent ? '#fca5a5' : '#fdba74',
                        background: isUrgent ? 'rgba(239,68,68,0.04)' : 'rgba(249,115,22,0.04)',
                      }}
                    >
                      <div
                        className="p-1.5 rounded-lg flex-shrink-0"
                        style={{ background: isUrgent ? '#ef444415' : '#f9731615' }}
                      >
                        {isUrgent
                          ? <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                          : <Clock className="h-3.5 w-3.5 text-orange-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#304035] truncate group-hover:text-[#a67749] transition-colors">
                          {d.name}{('firstName' in d && d.firstName) ? ` ${d.firstName}` : ''}
                        </p>
                        <p className="text-[10px] text-[#304035]/40">{d.status}</p>
                      </div>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          color: isUrgent ? '#ef4444' : '#f97316',
                          background: isUrgent ? '#ef444415' : '#f9731615',
                        }}
                      >
                        {isUrgent ? '🔴 URGENT' : '🟠 EN COURS'}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Bouton Ajouter RDV rapide */}
          <button
            onClick={() => { const d = new Date(); openAdd((d.getDay() + 6) % 7 + 1, 9); }}

            className="add-btn w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#304035] text-white font-bold text-sm shadow-md hover:bg-[#3d5244] transition-all"
            style={{ boxShadow: '0 4px 14px rgba(48,64,53,0.25)' }}
          >
            <Plus className="add-btn-icon h-4 w-4" />
            Planifier un RDV
          </button>
        </div>
      </div>

      {/* ── POPOVER RDV (style Google Agenda : Modifier / Supprimer) ── */}
      {popoverEventId && popoverPosition && (() => {
        const ev = planningEvents.find(e => e.id === popoverEventId);
        if (!ev) return null;
        // Calcule la position en évitant de sortir de l'écran
        const popoverWidth = 240;
        const screenW = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const screenH = typeof window !== 'undefined' ? window.innerHeight : 1080;
        let left = popoverPosition.x;
        let top = popoverPosition.y;
        if (left + popoverWidth > screenW - 16) left = popoverPosition.x - popoverWidth - 32;
        if (top + 220 > screenH - 16) top = Math.max(16, screenH - 240);
        return (
          <div
            className="plan-popover fixed z-[60]"
            style={{ left, top, width: popoverWidth }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl border border-[#304035]/10 overflow-hidden"
              style={{ animation: 'cardIn 0.16s ease both' }}
            >
              {/* Bandeau couleur */}
              <div className="h-1.5 w-full" style={{ background: ev.color }} />
              <div className="p-4">
                <div className="flex items-start gap-2 mb-3">
                  <div
                    className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                    style={{ background: ev.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#304035] leading-tight">{ev.title || 'RDV'}</p>
                    <p className="text-xs text-[#304035]/55 mt-0.5">
                      {ev.startHour}:00 — {ev.startHour + ev.duration}:00 · {DAYS_FULL[ev.day - 1] ?? ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setPopoverEventId(null)}
                    className="p-1 rounded hover:bg-[#304035]/5 text-[#304035]/40"
                    aria-label="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(ev.id)}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#304035] text-white text-xs font-bold hover:bg-[#4a6358] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Modifier
                  </button>
                  <button
                    onClick={() => {
                      deletePlanningEvent(ev.id);
                      setPopoverEventId(null);
                    }}
                    className="flex-1 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 border border-red-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL AJOUT ── */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-6"
          style={{ background: 'rgba(30,30,30,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowAdd(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
            style={{ animation: 'cardIn 0.2s ease both', boxShadow: '0 24px 64px rgba(48,64,53,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#304035]">Planifier un RDV</h3>
                  {modalDate && (
                    <p className="text-xs text-[#304035]/40 mt-0.5">
                      {new Date(modalDate + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {modalHour}h00
                    </p>
                  )}
                </div>
              </div>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-xl hover:bg-[#f5eee8] transition-all">
                <X className="h-4 w-4 text-[#304035]/50" />
              </button>
            </div>

            <div className="space-y-4">

              {/* ── Mini Calendrier custom ── */}
              <div className="rounded-2xl border border-[#304035]/10 overflow-hidden bg-[#f9f6f2]">
                {/* Barre navigation mois */}
                <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-[#304035]/8">
                  <button
                    onClick={() => {
                      if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                      else setCalMonth(m => m - 1);
                    }}
                    className="p-1 rounded-lg hover:bg-[#f5eee8] transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4 text-[#304035]/60" />
                  </button>
                  <span className="text-sm font-bold text-[#304035] capitalize">
                    {new Date(calYear, calMonth, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => {
                      if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                      else setCalMonth(m => m + 1);
                    }}
                    className="p-1 rounded-lg hover:bg-[#f5eee8] transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 text-[#304035]/60" />
                  </button>
                </div>

                {/* Jours de la semaine */}
                <div className="grid grid-cols-7 px-2 pt-2 pb-1">
                  {['L','M','M','J','V','S','D'].map((d, i) => (
                    <div key={i} className="text-center text-[10px] font-bold text-[#304035]/35 pb-1">{d}</div>
                  ))}
                </div>

                {/* Grille des jours */}
                <div className="grid grid-cols-7 px-2 pb-2 gap-y-0.5">
                  {(() => {
                    const firstDay = new Date(calYear, calMonth, 1);
                    // Décalage: lundi=0, mardi=1... dimanche=6
                    const startOffset = (firstDay.getDay() + 6) % 7;
                    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                    const today = new Date();
                    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
                    const cells = [];
                    // Cases vides avant le 1er
                    for (let i = 0; i < startOffset; i++) {
                      cells.push(<div key={`e${i}`} />);
                    }
                    for (let d = 1; d <= daysInMonth; d++) {
                      const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                      const isSelected = dateStr === modalDate;
                      const isToday2 = dateStr === todayStr;
                      cells.push(
                        <button
                          key={d}
                          onClick={() => setModalDate(dateStr)}
                          className="flex items-center justify-center h-8 w-8 mx-auto rounded-full text-xs font-semibold transition-all"
                          style={{
                            background: isSelected ? '#304035' : isToday2 ? 'rgba(16,185,129,0.15)' : 'transparent',
                            color: isSelected ? 'white' : isToday2 ? '#10b981' : '#304035',
                            fontWeight: isToday2 || isSelected ? 700 : 500,
                          }}
                        >
                          {d}
                        </button>
                      );
                    }
                    return cells;
                  })()}
                </div>
              </div>

              {/* Heure */}
              <div>
                <label className="text-xs font-bold text-[#304035]/50 uppercase tracking-wider block mb-2">Heure de début</label>
                <div className="flex flex-wrap gap-1.5">
                  {HOURS.map(h => (
                    <button
                      key={h}
                      onClick={() => setModalHour(h)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border"
                      style={{
                        background: modalHour === h ? '#304035' : 'transparent',
                        color: modalHour === h ? 'white' : '#304035',
                        borderColor: modalHour === h ? '#304035' : 'rgba(48,64,53,0.15)',
                      }}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>

              {/* Type RDV — adapte selon profession */}
              <div>
                <label className="text-xs font-bold text-[#304035]/50 uppercase tracking-wider block mb-2">
                  Type de RDV
                  <span className="ml-2 text-[10px] font-normal text-[#304035]/35 normal-case">
                    ({rdvTypes.length} options
                    {profession ? ` · ${profession === 'cuisiniste' ? 'Cuisiniste' : profession === 'architecte' ? 'Architecte' : 'Menuisier'}` : ''})
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {rdvTypes.map(t => (
                    <button
                      key={t.key}
                      onClick={() => setNewEvent(n => ({ ...n, type: t.key }))}
                      className="relative flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-left transition-all text-sm font-medium"
                      style={{
                        borderColor: newEvent.type === t.key ? t.color : 'transparent',
                        background: newEvent.type === t.key ? `${t.color}15` : '#f5f5f5',
                        color: newEvent.type === t.key ? t.color : '#304035',
                      }}
                    >
                      <span>{t.icon}</span>
                      <span className="text-xs flex-1">{t.label}</span>
                      {t.dualPlanning && (
                        <span
                          className="text-[9px] font-bold opacity-60"
                          title="Aussi visible sur Planning gestion"
                        >
                          ↔
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[#304035]/40 mt-1.5 leading-snug">
                  ↔ Visible sur les deux plannings (Planning + Planning gestion)
                </p>
              </div>

              {/* Color picker — palette + custom (override la couleur du type) */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-[#304035]/70 mb-2 uppercase tracking-wider">
                  Couleur du RDV
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    '', // Auto = couleur du type
                    '#5b9bd5', '#4aa350', '#e07b00', '#d32f2f',
                    '#9333ea', '#0891b2', '#db2777', '#7c3a1e',
                    '#525252',
                  ].map((c) => {
                    const isAuto = c === '';
                    const isSelected = (newEvent.color || '') === c;
                    return (
                      <button
                        key={c || 'auto'}
                        type="button"
                        onClick={() => setNewEvent(n => ({ ...n, color: c }))}
                        className="relative w-7 h-7 rounded-full border-2 transition-all"
                        style={{
                          background: isAuto
                            ? 'conic-gradient(from 0deg, #5b9bd5, #4aa350, #e07b00, #d32f2f, #9333ea, #5b9bd5)'
                            : c,
                          borderColor: isSelected ? '#304035' : 'rgba(48,64,53,0.15)',
                          transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                          boxShadow: isSelected ? '0 2px 8px rgba(48,64,53,0.25)' : 'none',
                        }}
                        title={isAuto ? 'Couleur auto (selon type)' : c}
                        aria-label={isAuto ? 'Couleur automatique' : `Couleur ${c}`}
                      >
                        {isSelected && (
                          <CheckCircle
                            className="absolute inset-0 m-auto h-3.5 w-3.5"
                            style={{ color: isAuto ? '#fff' : '#fff', strokeWidth: 3 }}
                          />
                        )}
                      </button>
                    );
                  })}
                  {/* Color picker natif pour couleur 100% custom */}
                  <label
                    className="relative w-7 h-7 rounded-full border-2 border-dashed border-[#304035]/30 cursor-pointer flex items-center justify-center hover:border-[#304035]/60 transition-colors"
                    title="Choisir une couleur personnalisée"
                  >
                    <Plus className="h-3.5 w-3.5 text-[#304035]/50" />
                    <input
                      type="color"
                      value={newEvent.color || '#5b9bd5'}
                      onChange={(e) => setNewEvent(n => ({ ...n, color: e.target.value }))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      aria-label="Couleur personnalisée"
                    />
                  </label>
                </div>
                <p className="text-[10px] text-[#304035]/40 mt-1.5 leading-snug">
                  Le rond multicolore = couleur auto (héritée du type RDV)
                </p>
              </div>

              {/* Dossier */}
              <div>
                <label className="text-xs font-bold text-[#304035]/50 uppercase tracking-wider block mb-2">Dossier client</label>
                <select
                  value={newEvent.dossierId}
                  onChange={e => setNewEvent(n => ({ ...n, dossierId: e.target.value }))}
                  className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-3 py-2.5 text-sm text-[#304035] focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
                >
                  <option value="">— Choisir un dossier —</option>
                  {clientNames.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Titre optionnel */}
              <div>
                <label className="text-xs font-bold text-[#304035]/50 uppercase tracking-wider block mb-2">Titre (optionnel)</label>
                <input
                  value={newEvent.title}
                  onChange={e => setNewEvent(n => ({ ...n, title: e.target.value }))}
                  placeholder="Ex: Livraison cuisine Turpin…"
                  className="w-full rounded-xl border border-[#304035]/15 bg-[#f5eee8]/30 px-3 py-2.5 text-sm text-[#304035] placeholder:text-[#304035]/25 focus:outline-none focus:ring-2 focus:ring-[#304035]/20"
                />
              </div>

              {/* Durée */}
              <div>
                <label className="text-xs font-bold text-[#304035]/50 uppercase tracking-wider block mb-2">Durée</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 6].map(h => (
                    <button
                      key={h}
                      onClick={() => setNewEvent(n => ({ ...n, duration: h }))}
                      className="flex-1 py-2 rounded-xl text-sm font-bold transition-all border-2"
                      style={{
                        borderColor: newEvent.duration === h ? '#304035' : 'transparent',
                        background: newEvent.duration === h ? '#304035' : '#f5f5f5',
                        color: newEvent.duration === h ? 'white' : '#304035',
                      }}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>

              {/* Boutons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-3 rounded-2xl border border-[#304035]/15 text-sm font-bold text-[#304035]/60 hover:bg-[#f5eee8] transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={editingEventId ? handleSaveEdit : handleAdd}
                  disabled={(!editingEventId && !newEvent.dossierId) || !modalDate}
                  className="flex-2 flex-grow py-3 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg, #3d5244, #304035)',
                    boxShadow: '0 4px 12px rgba(48,64,53,0.3)',
                  }}
                >
                  {editingEventId ? 'Enregistrer ✓' : 'Planifier ✓'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
