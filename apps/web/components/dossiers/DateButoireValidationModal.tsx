'use client';

/**
 * DateButoireValidationModal — modale "wahou" qui force la saisie des dates
 * butoires AVANT validation, avec en bonus à l'écran :
 *  - Le PLANNING GESTION (semaine courante) pour voir quels créneaux sont pris
 *  - Les DEVIS du dossier (DOSSIER AVANT VENTE) pour vérifier ce qui a été vendu
 *  - Les inputs de dates butoires (11 sous-dossiers signés)
 *
 * Sans dates butoires, l'équipe perd la traçabilité des deadlines projet.
 * Cette modale est BLOQUANTE : le bouton "Valider le projet" reste désactivé
 * tant qu'au moins une date manque.
 *
 * Effet wahou :
 *  - Backdrop radial sombre + blur progressif
 *  - Modal scale 0.86 → 1.02 → 1 avec rebond cubic-bezier
 *  - Header gradient vert + halos rotatifs + sparkles dorées
 *  - Icône calendar dans cercle qui pulse en boucle
 *  - Barre de progression dorée shimmer (devient verte à 100%)
 *  - Bouton "Valider" avec shimmer + glow quand tout est rempli
 *  - Bouton "Pré-remplir" qui suggère des délais standards par sous-dossier
 *  - Layout 2 colonnes responsive (1 colonne sur mobile)
 */

import { useState, useEffect, useMemo } from 'react';
import {
  X, Calendar, Sparkles, AlertTriangle, Check, Loader2,
  AlertCircle, Wand2, FileCheck, Receipt, CalendarDays, ChevronLeft, ChevronRight,
  Eye, Folder, ArrowRight, ArrowLeft, ExternalLink, FileText,
  Plus, Trash2, Search, Truck, ShoppingCart,
} from 'lucide-react';
import { usePlanningStore } from '@/store/usePlanningStore';
import { useDossierStore } from '@/store/useDossierStore';
import type {
  SubFolder,
  DocumentFile,
  CommandeAccessEntry,
} from '@/store/useDossierStore';
import {
  ARCHITECTE_PROJET_VERSION_REGEX,
  CUISINISTE_OPTION_REGEX,
  MENUISIER_PROJET_REGEX,
} from '@/store/useDossierStore';
import { getDocSignedUrl } from '@/lib/dossier-docs-api';
import { extractDossier, DATE_LABEL_TO_FIELD } from '@/lib/ai-extract-api';

/**
 * Suggestions auto-complete pour le panneau ACCEDER → COMMANDES.
 * Ce sont des MARQUES de fournisseurs (ex: LEICHT, BOSCH) qu'on COMMANDE.
 */
/**
 * Calcule le numero de semaine ISO 8601 (1-53) de la date "lundi de la semaine
 * en cours + offset semaines". Suit la convention francaise/europeenne :
 *  - Lundi est le 1er jour de la semaine
 *  - La semaine 1 est celle qui contient le premier jeudi de l'annee
 * Source : algo standard ISO 8601.
 */
function getIsoWeekNumber(weekOffset: number = 0): number {
  const today = new Date();
  // Trouver le lundi de la semaine en cours
  const day = today.getDay() || 7; // dim = 0 -> 7
  const monday = new Date(today);
  monday.setDate(today.getDate() - day + 1 + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);

  // Algo ISO 8601 : copier la date, aller au jeudi le plus proche (-3 +4),
  // puis calculer le nombre de semaines depuis le 1er janvier de cette annee.
  const target = new Date(monday.valueOf());
  const dayNum = (monday.getDay() + 6) % 7; // lundi = 0
  target.setDate(target.getDate() - dayNum + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target.getTime() - firstThursday.getTime();
  const weekNum = 1 + Math.round((diff / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  return weekNum;
}

const COMMANDES_SUGGESTIONS: string[] = [
  // Cuisines
  'LEICHT', 'SCHMIDT', 'MOBALPA', 'CUISINELLA', 'HYGENA', 'BOFFI', 'BULTHAUP',
  'SNAIDERO', 'POGGENPOHL', 'AVIVA', 'IXINA', 'CUISINES PLUS', 'IKEA METOD',
  'SOCOO\'C', 'ARTHUR BONNET', 'CHARLES REMA',
  // Marbriers / plans de travail
  'MARBRIER', 'COSENTINO (SILESTONE)', 'CAESARSTONE', 'COMPAC', 'GRANITOP',
  'NEOLITH', 'DEKTON',
  // Électroménager
  'BOSCH', 'SIEMENS', 'MIELE', 'AEG', 'SMEG', 'GAGGENAU', 'LIEBHERR',
  'WHIRLPOOL', 'ELECTROLUX', 'SCHOLTES',
  // Autres
  'MSA', 'COJER',
];

/**
 * Suggestions auto-complete pour le panneau ACCEDER → LIVRAISON.
 * Ce sont des CATÉGORIES de livraison (ex: CUISINE, ELECTRO, GRANIT) — un
 * dossier peut comporter plusieurs lots livrés à des dates différentes.
 */
const LIVRAISON_SUGGESTIONS: string[] = [
  'CUISINE', 'ELECTRO', 'GRANIT', 'MSA',
  'MARBRIER', 'MENUISERIE', 'PLAN DE TRAVAIL',
  'ÉLECTROMÉNAGER', 'ROBINETTERIE', 'EVIER',
  'POIGNÉES', 'ECLAIRAGE LED', 'CRÉDENCE',
  'PLOMBERIE', 'ÉLECTRICITÉ', 'CARRELAGE',
  'PEINTURE', 'SOL', 'PLINTHES',
  'ACCESSOIRES', 'DRESSING', 'SALLE DE BAIN',
  'MOBILIER', 'TIROIRS BLUM', 'CHARNIÈRES',
];

/** Détermine quel set de suggestions montrer selon le label de l'item access. */
function getSuggestionsForLabel(label: string): string[] {
  return label.toUpperCase().includes('LIVRAISON')
    ? LIVRAISON_SUGGESTIONS
    : COMMANDES_SUGGESTIONS;
}

type Profession = 'architecte' | 'menuisier' | 'cuisiniste' | null;

/**
 * Type d'un item dans la liste "Enregistrer date butoir pour rappel" :
 *  - 'date'   : input date classique (compte dans la progression)
 *  - 'access' : bouton "ACCEDER" qui ouvre la section dédiée du dossier
 *  - 'static' : pure information (icône folder, pas d'action) → ex. SAV
 */
export type DateButoireItemKind = 'date' | 'access' | 'static';

export interface DateButoireItem {
  label: string;
  kind: DateButoireItemKind;
}

/**
 * Liste fixe par défaut des items affichés dans le panneau "Enregistrer date
 * butoir pour rappel" lors de la validation d'un dossier signé.
 * Cette liste correspond exactement à la maquette validée par le client.
 */
export const DEFAULT_DATE_BUTOIRE_ITEMS: DateButoireItem[] = [
  { label: 'SUIVI DE CHANTIER',    kind: 'date'   },
  { label: 'RELEVE DE MESURES',    kind: 'date'   },
  { label: 'PLAN TECHNIQUE',       kind: 'date'   },
  { label: 'COMMANDES',            kind: 'access' },
  { label: 'LIVRAISON',            kind: 'access' },
  { label: 'FICHE DE POSE',        kind: 'date'   },
  { label: 'PERMIS DE CONSTRUIRE', kind: 'date'   },
  { label: 'SAV',                  kind: 'static' },
];

export interface DateButoireValidationProps {
  open: boolean;
  /**
   * Liste fixe des items à afficher (date / access / static).
   * Si non fourni, on utilise `DEFAULT_DATE_BUTOIRE_ITEMS`.
   * @deprecated `signedSubfolders` (string[]) reste accepté pour rétro-compat
   * mais sera retiré prochainement — préférer `items`.
   */
  items?: DateButoireItem[];
  /** Rétro-compat : si `items` absent, mappé en items 'date'. */
  signedSubfolders?: string[];
  /** ID du dossier en cours de validation — pour filtrer ses devis. */
  dossierId: string;
  /** Nom du client à afficher en titre. */
  clientName?: string;
  /** Sous-dossiers actifs du dossier (avec leurs documents). */
  subfolders?: SubFolder[];
  /** Métier de l'utilisateur — détermine quel sous-dossier est "le dernier projet". */
  profession?: Profession;
  loading?: boolean;
  /**
   * Callback déclenché quand l'utilisateur clique sur le bouton "ACCEDER" d'un
   * item de type 'access' (COMMANDES, LIVRAISON…). Le parent peut router vers
   * la section dédiée du dossier ou ouvrir un sub-drawer.
   */
  onAccessItem?: (label: string) => void;
  onConfirm: (dates: Record<string, string>) => Promise<void> | void;
  onCancel: () => void;
}

/**
 * Suggestions de délais par défaut pour les items 'date' courants.
 * Délai en jours depuis aujourd'hui. Override possible si label inconnu (J+30).
 */
const DEFAULT_DELAYS: Record<string, number> = {
  'SUIVI DE CHANTIER':    14,
  'RELEVE DE MESURES':    10,
  'PLAN TECHNIQUE':       30,
  'PLAN TECHNIQUE DCE':   30,
  'FICHE DE POSE':        95,
  'PERMIS DE CONSTRUIRE': 30,
};

const DAYS = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

function suggestDate(label: string): string {
  const days = DEFAULT_DELAYS[label] ?? 30;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayDelta(iso: string): number {
  if (!iso) return 0;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400_000);
}

export function DateButoireValidationModal({
  open, items, signedSubfolders, dossierId, clientName, subfolders, profession, loading,
  onAccessItem, onConfirm, onCancel,
}: DateButoireValidationProps) {
  // Résolution des items affichés : `items` prioritaire, sinon mapping legacy
  // depuis `signedSubfolders` (tous en 'date'), sinon liste par défaut.
  const resolvedItems: DateButoireItem[] = useMemo(() => {
    if (items && items.length > 0) return items;
    if (signedSubfolders && signedSubfolders.length > 0) {
      return signedSubfolders.map((label) => ({ label, kind: 'date' as const }));
    }
    return DEFAULT_DATE_BUTOIRE_ITEMS;
  }, [items, signedSubfolders]);

  /** Items qui demandent une saisie de date — ce sont eux qui comptent dans la progression. */
  const dateItems = useMemo(
    () => resolvedItems.filter((it) => it.kind === 'date'),
    [resolvedItems],
  );
  const planningEvents = usePlanningStore((s) => s.planningEvents);
  const gestEvents = usePlanningStore((s) => s.gestEvents);

  const [dates, setDates] = useState<Record<string, string>>({});
  // ID du doc en cours de chargement preview (loupe → spinner pendant fetch URL signée)
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  // Document actuellement affiché dans le panneau gauche (remplace planning + dossier APD)
  // → permet de consulter le PDF tout en remplissant les dates butoirs à droite.
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string; type?: string } | null>(null);
  // Drawer ACCEDER ouvert dans la colonne droite (remplace temporairement la
  // liste des dates butoirs principales). Si non null, la colonne droite
  // affiche le panneau commandes/livraison correspondant.
  const [accessDrawer, setAccessDrawer] = useState<{ label: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // ── État extraction IA ────────────────────────────────────────────────
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractInfo, setExtractInfo] = useState<{
    dates: number;
    commandes: number;
    livraisons: number;
    confiance: number;
  } | null>(null);

  // ── Store : commandes ACCEDER ──────────────────────────────────────────
  const commandesAccessAll = useDossierStore((s) => s.commandesAccess);
  const addCommandeAccess = useDossierStore((s) => s.addCommandeAccess);
  const updateCommandeAccess = useDossierStore((s) => s.updateCommandeAccess);
  const removeCommandeAccess = useDossierStore((s) => s.removeCommandeAccess);
  const commandesForDrawer: CommandeAccessEntry[] = useMemo(() => {
    if (!accessDrawer) return [];
    return commandesAccessAll[dossierId]?.[accessDrawer.label] ?? [];
  }, [accessDrawer, commandesAccessAll, dossierId]);

  // Reset à chaque ouverture
  useEffect(() => {
    if (!open) return;
    setDates({});
    setError(null);
    setWeekOffset(0);
    setPreviewDoc(null);
    setAccessDrawer(null);
    setExtractError(null);
    setExtractInfo(null);
    setExtracting(false);
  }, [open]);

  // Escape pour fermer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting && !loading) onCancel();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, submitting, loading, onCancel]);

  // ── Tous les documents du dossier, groupés par sous-dossier ──────────────
  // Au lieu de ne montrer QUE le dernier APD/OPTION/PROJET, on liste tout le
  // contenu du dossier (DOSSIER RENSEIGNEMENT, ETAT DES LIEUX, RELEVE DE
  // MESURES, PROJETS, APS, APD, etc.) pour que l'utilisateur puisse consulter
  // n'importe quel fichier en remplissant ses dates butoirs.
  // Le tri tente de mettre le « dernier projet » (APD le plus récent /
  // OPTION la plus récente / PROJET le plus récent) en premier — c'est le
  // plus pertinent au moment de saisir les dates — puis le reste en ordre
  // d'apparition.
  const allDocGroups = useMemo<Array<{ label: string; docs: DocumentFile[] }>>(() => {
    if (!subfolders || subfolders.length === 0) return [];

    // 1) Calcul du sous-dossier "le plus pertinent" pour le tri en tête
    let priorityLabel: string | null = null;
    {
      let bestVersion = -1;
      for (const sf of subfolders) {
        let version: number | null = null;
        if (profession === 'architecte') {
          const m = sf.label.match(ARCHITECTE_PROJET_VERSION_REGEX);
          if (m && m[2].toUpperCase() === 'APD') version = parseInt(m[1], 10);
        } else if (profession === 'cuisiniste') {
          const m = sf.label.match(CUISINISTE_OPTION_REGEX);
          if (m) version = parseInt(m[1], 10);
        } else if (profession === 'menuisier') {
          const m = sf.label.match(MENUISIER_PROJET_REGEX);
          if (m) version = parseInt(m[1], 10);
        } else {
          const m =
            sf.label.match(ARCHITECTE_PROJET_VERSION_REGEX) ??
            sf.label.match(CUISINISTE_OPTION_REGEX) ??
            sf.label.match(MENUISIER_PROJET_REGEX);
          if (m) version = parseInt(m[1], 10);
        }
        if (version !== null && Number.isFinite(version) && version > bestVersion) {
          bestVersion = version;
          priorityLabel = sf.label;
        }
      }
    }

    // 2) Construction des groupes : tous les sous-dossiers (avec ou sans docs)
    const groups: Array<{ label: string; docs: DocumentFile[] }> = subfolders.map((sf) => ({
      label: sf.label,
      docs: (sf.documents ?? []).map((d) =>
        typeof d === 'string' ? ({ name: d } as DocumentFile) : d,
      ),
    }));

    // 3) Tri : sous-dossier prioritaire en tête, puis le reste en ordre d'origine
    if (priorityLabel) {
      groups.sort((a, b) => {
        if (a.label === priorityLabel) return -1;
        if (b.label === priorityLabel) return 1;
        return 0;
      });
    }

    // 4) On retire les groupes vides pour ne pas saturer l'UI
    return groups.filter((g) => g.docs.length > 0);
  }, [subfolders, profession]);

  const totalDocsCount = useMemo(
    () => allDocGroups.reduce((acc, g) => acc + g.docs.length, 0),
    [allDocGroups],
  );

  // ── Planning de la semaine courante (filtré par weekOffset) ──────────────
  const weekEvents = useMemo(() => {
    const fromPlanning: Array<{ day: number; startHour: number; duration: number; title: string; color: string }> =
      planningEvents
        .filter((e) => (e.weekOffset ?? 0) === weekOffset)
        .map((e) => ({ day: e.day, startHour: e.startHour, duration: e.duration, title: e.title, color: e.color }));
    const fromGest: typeof fromPlanning =
      gestEvents
        .filter((e) => e.weekOffset === weekOffset)
        .map((e) => ({
          day: e.day,
          startHour: e.startHour,
          duration: e.duration,
          title: e.client,
          color: e.type === 'POSE' ? '#4a7ec0' : e.type === 'LIVRAISON' ? '#c08a5a' : '#7c3a1e',
        }));
    return [...fromPlanning, ...fromGest];
  }, [planningEvents, gestEvents, weekOffset]);

  // ── Computed ─────────────────────────────────────────────────────────────
  // Seuls les items 'date' comptent dans la progression / dans le `allFilled`.
  // Les 'access' et 'static' sont purement informatifs côté validation.
  const filledCount = useMemo(
    () => dateItems.filter((it) => !!dates[it.label]).length,
    [dateItems, dates],
  );
  const total = dateItems.length;
  const allFilled = total > 0 && filledCount === total;
  const progressPct = total === 0 ? 0 : Math.round((filledCount / total) * 100);

  const today = new Date().toISOString().slice(0, 10);

  const handlePrefill = () => {
    const next: Record<string, string> = {};
    for (const it of dateItems) next[it.label] = suggestDate(it.label);
    setDates(next);
    setError(null);
  };

  /**
   * Extraction IA des documents du dossier :
   *  - Appelle POST /api/v1/ia/extract-dossier
   *  - Pré-remplit les 5 dates butoires (mapping label → field)
   *  - Ajoute toutes les commandes/livraisons via addCommandeAccess
   *  - L'utilisateur garde la main : tous les champs restent éditables
   */
  const handleExtractWithAI = async () => {
    if (extracting || submitting || loading) return;
    setExtracting(true);
    setExtractError(null);
    setExtractInfo(null);
    try {
      const result = await extractDossier(dossierId);

      // 1. Dates butoires (mapping label → field)
      const nextDates: Record<string, string> = { ...dates };
      let datesFilled = 0;
      for (const [label, field] of Object.entries(DATE_LABEL_TO_FIELD)) {
        const value = result.datesButoires[field];
        if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
          nextDates[label] = value;
          datesFilled++;
        }
      }
      setDates(nextDates);

      // 2. Commandes
      let commandesAdded = 0;
      for (const cmd of result.commandes ?? []) {
        if (!cmd.fournisseur) continue;
        addCommandeAccess(dossierId, 'COMMANDES', {
          fournisseur: cmd.fournisseur,
          dateButoir: cmd.dateButoir ?? '',
        });
        commandesAdded++;
      }

      // 3. Livraisons
      let livraisonsAdded = 0;
      for (const liv of result.livraisons ?? []) {
        if (!liv.categorie) continue;
        addCommandeAccess(dossierId, 'LIVRAISON', {
          fournisseur: liv.categorie,
          dateButoir: liv.dateButoir ?? '',
        });
        livraisonsAdded++;
      }

      setExtractInfo({
        dates: datesFilled,
        commandes: commandesAdded,
        livraisons: livraisonsAdded,
        confiance: result.confiance ?? 0,
      });
      setError(null);
    } catch (err: any) {
      const msg = (err?.message || '').toString();
      let userMsg = "Échec extraction — vérifiez OPENAI_API_KEY ou saisissez manuellement";
      if (msg.toLowerCase().includes('openai')) {
        userMsg = "Service IA non configuré (OPENAI_API_KEY manquant). Saisissez manuellement.";
      } else if (msg.toLowerCase().includes('aucun document')) {
        userMsg = "Aucun document analysable dans ce dossier (PDF requis).";
      } else if (msg.toLowerCase().includes('throttl') || msg.toLowerCase().includes('limit')) {
        userMsg = "Trop d'appels — patientez 1 minute avant de réessayer.";
      } else if (msg) {
        userMsg = `Échec extraction : ${msg}`;
      }
      setExtractError(userMsg);
    } finally {
      setExtracting(false);
    }
  };

  // Auto-clear du banner success après 6s
  useEffect(() => {
    if (!extractInfo) return;
    const t = setTimeout(() => setExtractInfo(null), 6000);
    return () => clearTimeout(t);
  }, [extractInfo]);

  /**
   * Ouvre le doc DANS la colonne gauche de la modale (au lieu d'un nouvel onglet)
   * pour que l'utilisateur puisse consulter le devis/plan/etc tout en remplissant
   * les dates butoirs à droite, sans quitter la page.
   * - Backend (docId) : fetch URL signée fraîche → set previewDoc
   * - Legacy (dataUrl) : utilise directement la dataUrl
   * - Placeholder pur : indisponible
   */
  const handlePreviewDoc = async (doc: DocumentFile) => {
    const previewKey = doc.docId ?? doc.name;
    if (doc.dataUrl) {
      setPreviewDoc({ url: doc.dataUrl, name: doc.name, type: doc.type });
      return;
    }
    if (!doc.docId || !dossierId) return;
    setPreviewLoadingId(previewKey);
    try {
      const { signedUrl } = await getDocSignedUrl(dossierId, doc.docId);
      setPreviewDoc({ url: signedUrl, name: doc.name, type: doc.type });
    } catch (err) {
      console.error('[validation-modal] preview failed:', err);
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const closePreview = () => setPreviewDoc(null);

  /** Détecte si le doc est un PDF (pour ajouter les paramètres viewer Chrome). */
  const isPdfDoc = (doc: typeof previewDoc): boolean => {
    if (!doc) return false;
    if ((doc.type ?? '').toLowerCase() === 'application/pdf') return true;
    return doc.name.toLowerCase().endsWith('.pdf');
  };

  /** Détecte si on peut afficher le doc dans un iframe (PDF, image, txt). */
  const isInlinePreviewable = (doc: typeof previewDoc): boolean => {
    if (!doc) return false;
    const t = (doc.type ?? '').toLowerCase();
    if (t.startsWith('image/')) return true;
    if (t === 'application/pdf') return true;
    if (t.startsWith('text/')) return true;
    // Inférence par extension si type manquant
    const lower = doc.name.toLowerCase();
    return lower.endsWith('.pdf') || lower.endsWith('.png') || lower.endsWith('.jpg')
      || lower.endsWith('.jpeg') || lower.endsWith('.webp') || lower.endsWith('.gif');
  };

  /**
   * Construit l'URL d'aperçu pour l'iframe.
   * Pour les PDF : on ajoute des paramètres au fragment (#) qui sont reconnus
   * par le viewer PDF natif de Chrome/Edge :
   *   - toolbar=0  : cache la toolbar Chrome (on a la nôtre au-dessus)
   *   - navpanes=0 : cache le panneau gauche de miniatures (~30% de la largeur
   *                  gâchés sur un PDF d'une page → la facture remplit tout)
   *   - view=FitH  : fit largeur ; la facture s'affiche en grand directement
   *   - zoom=page-width : fallback compatibilité (Edge)
   * Pour les multi-pages : le scroll vertical de Chrome reste actif.
   */
  const buildPreviewUrl = (doc: { url: string; name: string; type?: string }): string => {
    if (!isPdfDoc(doc)) return doc.url;
    const sep = doc.url.includes('#') ? '&' : '#';
    return `${doc.url}${sep}toolbar=0&navpanes=0&statusbar=0&view=FitH&zoom=page-width`;
  };

  const handleSubmit = async () => {
    if (!allFilled) {
      setError('Toutes les dates butoires doivent être renseignées avant la validation.');
      return;
    }
    setSubmitting(true); setError(null);
    try {
      await onConfirm(dates);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors de la validation');
      setSubmitting(false);
    }
  };

  if (!open) return null;

  // Plage horaire affichée : on prend min/max des events visibles (avec borne 8h-19h par défaut)
  const hourFrom = Math.min(8, ...weekEvents.map((e) => e.startHour));
  const hourTo = Math.max(19, ...weekEvents.map((e) => e.startHour + e.duration));
  const hours = Array.from({ length: hourTo - hourFrom + 1 }, (_, i) => hourFrom + i);

  return (
    <>
      <style>{`
        @keyframes dbvFade {
          from { opacity: 0; backdrop-filter: blur(0); -webkit-backdrop-filter: blur(0); }
          to   { opacity: 1; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
        }
        @keyframes dbvReveal {
          0%   { opacity: 0; transform: scale(0.9) translateY(10px); filter: blur(6px); }
          60%  { opacity: 1; transform: scale(1.01) translateY(0); filter: blur(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        @keyframes dbvHaloRot { to { transform: rotate(360deg); } }
        @keyframes dbvIconPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(217, 179, 138, 0.55); }
          50%      { box-shadow: 0 0 0 14px rgba(217, 179, 138, 0); }
        }
        @keyframes dbvSparkle {
          0%   { transform: translateY(0) scale(1); opacity: 0; }
          15%  { opacity: 1; }
          50%  { transform: translateY(-12px) scale(1.15); opacity: 0.85; }
          90%  { opacity: 0.4; }
          100% { transform: translateY(-30px) scale(0.85); opacity: 0; }
        }
        @keyframes dbvShimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes dbvRowIn {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes dbv-shine {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes dbv-spin { to { transform: rotate(360deg); } }

        .dbv-bg {
          position: fixed; inset: 0; z-index: 90;
          background: radial-gradient(ellipse at center, rgba(48,64,53,0.65) 0%, rgba(8,12,10,0.88) 75%);
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          animation: dbvFade 0.32s ease-out;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
        }
        .dbv-card {
          width: 100%;
          max-width: 1200px;
          max-height: 95vh;
          background: #fff;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.6);
          box-shadow:
            0 0 0 1px rgba(48,64,53,0.06),
            0 40px 100px rgba(0,0,0,0.5),
            0 12px 30px rgba(48,64,53,0.22),
            inset 0 1px 0 rgba(255,255,255,0.9);
          animation: dbvReveal 0.55s cubic-bezier(0.34, 1.42, 0.64, 1);
          display: flex; flex-direction: column;
          overflow: hidden;
        }

        .dbv-head {
          position: relative; overflow: hidden; flex-shrink: 0;
          padding: 18px 22px 20px;
          background: linear-gradient(135deg, #2a3a30 0%, #3d5244 55%, #4a6552 100%);
          color: #fff;
        }
        .dbv-head::before, .dbv-head::after {
          content: ''; position: absolute; pointer-events: none;
          border-radius: 50%;
        }
        .dbv-head::before {
          top: -45%; left: -8%; width: 320px; height: 320px;
          background: radial-gradient(circle, rgba(217,179,138,0.42) 0%, rgba(217,179,138,0.1) 40%, transparent 70%);
          animation: dbvHaloRot 18s linear infinite;
        }
        .dbv-head::after {
          bottom: -38%; right: -6%; width: 280px; height: 280px;
          background: radial-gradient(circle, rgba(74,163,80,0.25) 0%, transparent 60%);
          animation: dbvHaloRot 24s linear infinite reverse;
        }
        .dbv-spark {
          position: absolute; width: 4px; height: 4px;
          border-radius: 50%; background: #d9b38a;
          box-shadow: 0 0 8px rgba(217,179,138,0.9), 0 0 14px rgba(217,179,138,0.4);
          animation: dbvSparkle 3.6s ease-in-out infinite;
          pointer-events: none;
        }
        .dbv-row { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .dbv-titles { display: flex; align-items: center; gap: 14px; }
        .dbv-icon {
          width: 48px; height: 48px; border-radius: 14px;
          background: radial-gradient(circle at 30% 30%, #f4d6a8 0%, #d9b38a 50%, #b88c5c 100%);
          color: #2a3a30; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          animation: dbvIconPulse 2.4s ease-in-out infinite;
          box-shadow: 0 6px 18px rgba(217,179,138,0.4);
        }
        .dbv-titles h2 { margin: 0; font-size: 18px; font-weight: 800; letter-spacing: -0.01em; }
        .dbv-titles p { margin: 2px 0 0; font-size: 11.5px; color: rgba(255,255,255,0.65); }

        .dbv-head-actions {
          display: flex; align-items: center; gap: 10px; flex-shrink: 0;
        }
        .dbv-extract-btn {
          display: inline-flex; align-items: center; gap: 6px;
          /* Largeur fixe pour éviter que le header se réajuste entre les
             états "Extraire avec IA" (~150px) et "Extraction…" (~120px) →
             sans ça, la barre de progression sous le titre se décalait
             visuellement à chaque changement d'état. */
          min-width: 168px;
          justify-content: center;
          padding: 8px 14px; border-radius: 10px;
          background: linear-gradient(135deg, #d9b38a 0%, #c89665 100%);
          color: #fff; font-size: 12px; font-weight: 700;
          letter-spacing: 0.01em; cursor: pointer;
          border: 1px solid rgba(255,255,255,0.25);
          box-shadow: 0 4px 14px rgba(200,150,101,0.4), inset 0 1px 0 rgba(255,255,255,0.18);
          animation: dbvExtractPulse 2.6s ease-in-out infinite;
          transition: transform 0.18s ease, box-shadow 0.2s ease, opacity 0.2s ease;
          flex-shrink: 0;
          font-family: inherit;
        }
        .dbv-extract-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(200,150,101,0.55), inset 0 1px 0 rgba(255,255,255,0.22);
        }
        .dbv-extract-btn:active:not(:disabled) { transform: scale(0.97); }
        .dbv-extract-btn:disabled {
          opacity: 0.55; cursor: not-allowed; animation: none;
        }
        @keyframes dbvExtractPulse {
          0%, 100% { box-shadow: 0 4px 14px rgba(200,150,101,0.4), inset 0 1px 0 rgba(255,255,255,0.18); }
          50% { box-shadow: 0 4px 22px rgba(217,179,138,0.7), inset 0 1px 0 rgba(255,255,255,0.22); }
        }
        .dbv-spin { animation: dbvSpin 0.9s linear infinite; }
        @keyframes dbvSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .dbv-extract-banner {
          position: relative; z-index: 1;
          margin-top: 12px;
          display: flex; align-items: center; gap: 8px;
          padding: 9px 12px; border-radius: 10px;
          font-size: 12px; font-weight: 600;
          backdrop-filter: blur(6px);
          animation: dbvBannerIn 0.32s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .dbv-extract-banner--error {
          background: rgba(220, 38, 38, 0.18);
          border: 1px solid rgba(252, 165, 165, 0.45);
          color: #fecaca;
        }
        .dbv-extract-banner--success {
          background: rgba(22, 163, 74, 0.20);
          border: 1px solid rgba(134, 239, 172, 0.45);
          color: #bbf7d0;
        }
        .dbv-extract-banner-close {
          margin-left: auto;
          background: transparent; border: 0; color: inherit;
          opacity: 0.7; cursor: pointer;
          padding: 2px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
        }
        .dbv-extract-banner-close:hover { opacity: 1; background: rgba(255,255,255,0.1); }
        @keyframes dbvBannerIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dbv-close {
          width: 32px; height: 32px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.85);
          cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s ease;
        }
        .dbv-close:hover:not(:disabled) { background: rgba(255,255,255,0.22); transform: rotate(90deg); }
        .dbv-close:disabled { opacity: 0.4; cursor: not-allowed; }

        .dbv-progress { position: relative; z-index: 1; margin-top: 12px; display: flex; align-items: center; gap: 14px; }
        .dbv-progress-pct {
          font-size: 22px; font-weight: 800; color: #fff;
          letter-spacing: -0.02em; line-height: 1;
        }
        .dbv-progress-pct.complete { color: #86efac; text-shadow: 0 0 14px rgba(134,239,172,0.5); }
        .dbv-progress-bar-wrap { flex: 1; }
        .dbv-progress-bar {
          height: 8px; border-radius: 999px;
          background: rgba(255,255,255,0.12);
          overflow: hidden; border: 1px solid rgba(255,255,255,0.08);
          margin-top: 4px;
        }
        .dbv-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #d9b38a 0%, #f0c785 50%, #d9b38a 100%);
          background-size: 200% 100%;
          animation: dbvShimmer 2.4s linear infinite;
          border-radius: 999px;
          transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
          box-shadow: 0 0 12px rgba(217,179,138,0.5);
        }
        .dbv-progress-fill.complete {
          background: linear-gradient(90deg, #22c55e 0%, #86efac 50%, #22c55e 100%);
          background-size: 200% 100%;
          box-shadow: 0 0 14px rgba(134,239,172,0.7);
        }
        .dbv-progress-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.55); font-weight: 700; }

        /* Body — 2 colonnes */
        .dbv-body {
          flex: 1; overflow: hidden;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          background: linear-gradient(180deg, #fbf8f3 0%, #fff 100%);
        }
        @media (max-width: 900px) {
          .dbv-body { grid-template-columns: 1fr; }
        }
        .dbv-col-left { display: flex; flex-direction: column; gap: 12px; padding: 16px; overflow-y: auto; border-right: 1px solid rgba(48,64,53,0.08); }
        .dbv-col-right { display: flex; flex-direction: column; padding: 16px; overflow-y: auto; }
        @media (max-width: 900px) {
          .dbv-col-left { border-right: none; border-bottom: 1px solid rgba(48,64,53,0.08); }
        }

        /* Sections cards */
        .dbv-section {
          background: #fff;
          border-radius: 14px;
          border: 1px solid rgba(48,64,53,0.08);
          overflow: hidden;
        }
        .dbv-section-head {
          display: flex; align-items: center; gap: 8px; justify-content: space-between;
          padding: 10px 14px;
          border-bottom: 1px solid rgba(48,64,53,0.06);
          background: linear-gradient(135deg, #f5eee8 0%, #faf6ef 100%);
        }
        .dbv-section-title {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 11px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.1em;
          color: #304035;
        }
        .dbv-section-title svg { color: #a67749; }

        /* Planning gestion mini */
        .dbv-plan-nav { display: inline-flex; align-items: center; gap: 6px; }
        .dbv-plan-nav button {
          width: 22px; height: 22px; border-radius: 6px;
          border: 1px solid rgba(48,64,53,0.12);
          background: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: rgba(48,64,53,0.55);
          transition: all 0.15s ease;
        }
        .dbv-plan-nav button:hover { background: rgba(48,64,53,0.06); color: #1a1614; }
        .dbv-plan-nav span { font-size: 11px; font-weight: 700; color: rgba(48,64,53,0.7); min-width: 60px; text-align: center; }

        .dbv-plan-grid {
          display: grid;
          grid-template-columns: 36px repeat(7, minmax(0, 1fr));
          background: #fafaf7;
          font-size: 10px;
          height: 100%;
        }
        .dbv-plan-headcell {
          padding: 6px 4px; text-align: center;
          font-weight: 800; color: rgba(48,64,53,0.6);
          background: #fff;
          border-bottom: 1px solid rgba(48,64,53,0.08);
        }
        .dbv-plan-hour {
          padding: 4px;
          text-align: right;
          color: rgba(48,64,53,0.45);
          font-family: 'Courier New', monospace;
          border-right: 1px solid rgba(48,64,53,0.06);
          font-size: 9px;
          background: #fff;
        }
        .dbv-plan-cell {
          position: relative;
          height: 28px;
          border-right: 1px solid rgba(48,64,53,0.04);
          border-bottom: 1px solid rgba(48,64,53,0.04);
        }
        .dbv-plan-event {
          position: absolute; left: 2px; right: 2px; top: 1px;
          padding: 2px 5px;
          border-radius: 5px;
          font-size: 9px; font-weight: 700;
          color: #fff;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          box-shadow: 0 1px 3px rgba(0,0,0,0.18);
        }
        .dbv-plan-empty {
          padding: 18px 12px;
          text-align: center;
          font-size: 11px;
          color: rgba(48,64,53,0.4);
        }

        /* Devis list */
        .dbv-devis-list { display: flex; flex-direction: column; gap: 6px; padding: 10px; max-height: 280px; overflow-y: auto; }

        /* Groupes de documents par sous-dossier */
        .dbv-doc-group { display: flex; flex-direction: column; gap: 4px; }
        .dbv-doc-group + .dbv-doc-group { margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(48,64,53,0.1); }
        .dbv-doc-group-label {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 6px;
          font-size: 10px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.06em;
          color: rgba(48,64,53,0.6);
        }
        .dbv-doc-group-label svg { color: #a67749; flex-shrink: 0; }
        .dbv-doc-group-count {
          margin-left: auto;
          font-size: 9px; font-weight: 700;
          padding: 1px 6px; border-radius: 999px;
          background: rgba(166,119,73,0.12);
          color: #a67749;
          letter-spacing: 0;
        }
        .dbv-devis-row {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px;
          border-radius: 9px;
          border: 1px solid rgba(48,64,53,0.08);
          background: #fff;
          transition: all 0.16s ease;
        }
        .dbv-devis-row:hover { border-color: rgba(166,119,73,0.3); background: #fff8ef; }
        .dbv-devis-icon {
          width: 28px; height: 28px; border-radius: 7px;
          background: linear-gradient(135deg, #fff8ef, #ffe7c2);
          color: #a67749;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; font-size: 11px;
        }
        .dbv-devis-info { flex: 1; min-width: 0; }
        .dbv-devis-ref { font-size: 12px; font-weight: 700; color: #1a1614; }
        .dbv-devis-meta { font-size: 10.5px; color: rgba(48,64,53,0.5); margin-top: 1px; }
        .dbv-devis-amount { font-size: 12px; font-weight: 800; color: #16a34a; flex-shrink: 0; }
        .dbv-devis-amount.neg { color: rgba(48,64,53,0.4); }

        /* Bouton loupe pour preview document */
        .dbv-preview-btn {
          flex-shrink: 0;
          width: 30px; height: 30px;
          border-radius: 8px;
          border: 1px solid rgba(48,64,53,0.1);
          background: #fff;
          color: rgba(48,64,53,0.55);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.16s ease;
        }
        .dbv-preview-btn:hover:not(:disabled) {
          border-color: #a67749;
          background: #fff8ef;
          color: #a67749;
          transform: scale(1.06);
          box-shadow: 0 2px 8px rgba(166,119,73,0.22);
        }
        .dbv-preview-btn:active:not(:disabled) { transform: scale(0.96); }
        .dbv-preview-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .dbv-empty {
          padding: 28px 16px;
          text-align: center;
          color: rgba(48,64,53,0.4);
          font-size: 11.5px;
        }

        /* Dates butoires (right column) */
        .dbv-warn {
          display: flex; gap: 10px;
          padding: 11px 14px;
          margin-bottom: 12px;
          border-radius: 12px;
          background: linear-gradient(135deg, #fff7ed 0%, #fff 100%);
          border: 1px solid rgba(249,115,22,0.25);
          color: #9a3412;
          font-size: 12px; line-height: 1.5;
        }
        .dbv-warn-icon { color: #ea580c; flex-shrink: 0; margin-top: 1px; }

        .dbv-prefill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 12px; margin-bottom: 12px;
          border-radius: 10px;
          background: linear-gradient(135deg, #fff8ef 0%, #ffe7c2 100%);
          border: 1px solid rgba(166,119,73,0.3);
          color: #7c4f1d; font-size: 12px; font-weight: 700;
          cursor: pointer; transition: all 0.18s ease;
        }
        .dbv-prefill:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(166,119,73,0.25);
          border-color: #a67749;
        }
        .dbv-prefill:disabled { opacity: 0.5; cursor: not-allowed; }

        .dbv-list { display: flex; flex-direction: column; gap: 7px; }
        .dbv-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px;
          border-radius: 10px;
          background: #fff;
          border: 1px solid rgba(48,64,53,0.1);
          transition: all 0.16s ease;
          animation: dbvRowIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) backwards;
        }
        .dbv-item:hover { border-color: rgba(166,119,73,0.4); }
        .dbv-item.filled {
          background: linear-gradient(135deg, #f0fdf4 0%, #fff 100%);
          border-color: rgba(34,197,94,0.3);
        }
        .dbv-item-bullet {
          width: 24px; height: 24px; border-radius: 50%;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 800;
          background: rgba(48,64,53,0.08);
          color: rgba(48,64,53,0.55);
          border: 1px solid rgba(48,64,53,0.1);
          transition: all 0.2s ease;
        }
        .dbv-item.filled .dbv-item-bullet {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: #fff; border-color: #16a34a;
          box-shadow: 0 3px 8px rgba(34,197,94,0.3);
        }
        .dbv-item-label {
          flex: 1; min-width: 0;
          font-size: 12px; font-weight: 700;
          color: #1a1614;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dbv-item-input {
          flex-shrink: 0; width: 145px;
          padding: 6px 8px;
          border: 1px solid rgba(48,64,53,0.15);
          border-radius: 7px;
          background: #fff;
          font-size: 11.5px; color: #1a1614;
          font-family: inherit;
          transition: all 0.16s ease;
        }
        .dbv-item-input:focus {
          outline: none;
          border-color: #a67749;
          box-shadow: 0 0 0 3px rgba(166,119,73,0.18);
        }
        .dbv-item.filled .dbv-item-input { border-color: rgba(34,197,94,0.4); }
        .dbv-item-delta {
          flex-shrink: 0;
          font-size: 10px; font-weight: 700;
          color: rgba(48,64,53,0.55);
          font-family: 'Courier New', monospace;
          min-width: 42px; text-align: right;
        }
        .dbv-item.filled .dbv-item-delta { color: #16a34a; }

        /* Banner "Enregistrer date butoir pour rappel" */
        .dbv-section-banner {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 9px 14px; margin-bottom: 10px;
          border-radius: 10px;
          background: linear-gradient(135deg, #2a3a30 0%, #3d5244 100%);
          color: #fff; font-size: 12px; font-weight: 800;
          letter-spacing: 0.04em; text-transform: uppercase;
          box-shadow: 0 4px 12px rgba(48,64,53,0.25);
          align-self: flex-start;
        }
        .dbv-section-banner svg { color: #d9b38a; }

        /* Bullet folder (icône dossier au lieu d'un numéro) */
        .dbv-item-bullet-folder {
          background: linear-gradient(135deg, #fff8ef 0%, #ffe7c2 100%);
          color: #a67749;
          border-color: rgba(166,119,73,0.3);
        }
        .dbv-item.filled .dbv-item-bullet-folder {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: #fff; border-color: #16a34a;
        }

        /* Bouton ACCEDER (items 'access' : COMMANDES, LIVRAISON) */
        .dbv-item-access { background: linear-gradient(135deg, #fbf8f3 0%, #fff 100%); }
        .dbv-access-btn {
          flex-shrink: 0;
          display: inline-flex; align-items: center; gap: 5px;
          padding: 7px 14px;
          border-radius: 8px;
          border: 1px solid rgba(166,119,73,0.4);
          background: linear-gradient(135deg, #fff8ef 0%, #ffe7c2 100%);
          color: #7c4f1d;
          font-size: 11px; font-weight: 800;
          letter-spacing: 0.08em;
          cursor: pointer;
          transition: all 0.18s ease;
          font-family: inherit;
        }
        .dbv-access-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          background: linear-gradient(135deg, #ffe7c2 0%, #f4d6a8 100%);
          border-color: #a67749;
          box-shadow: 0 4px 12px rgba(166,119,73,0.3);
          color: #5d3a14;
        }
        .dbv-access-btn:active:not(:disabled) { transform: translateY(0); }
        .dbv-access-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Item statique (SAV) — pas d'interaction */
        .dbv-item-static {
          background: rgba(48,64,53,0.02);
          opacity: 0.85;
        }

        /* Footer */
        .dbv-foot {
          flex-shrink: 0;
          display: flex; gap: 10px; align-items: center; justify-content: flex-end;
          padding: 14px 22px;
          border-top: 1px solid rgba(48,64,53,0.08);
          background: rgba(48,64,53,0.02);
        }
        .dbv-error {
          flex: 1;
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: #b91c1c; font-weight: 600;
          margin-right: 10px;
        }

        .dbv-btn {
          padding: 10px 20px; border-radius: 11px;
          font-size: 13px; font-weight: 800;
          cursor: pointer; transition: all 0.2s ease; border: none;
          display: inline-flex; align-items: center; gap: 8px;
          letter-spacing: 0.01em;
        }
        .dbv-cancel {
          background: rgba(48,64,53,0.05); color: #1a1614;
          border: 1px solid rgba(48,64,53,0.1);
        }
        .dbv-cancel:hover:not(:disabled) { background: rgba(48,64,53,0.1); }

        .dbv-confirm {
          background: linear-gradient(135deg, rgba(48,64,53,0.6) 0%, rgba(48,64,53,0.5) 100%);
          color: rgba(255,255,255,0.7);
          cursor: not-allowed;
          position: relative; overflow: hidden;
        }
        .dbv-confirm.ready {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          color: #fff; cursor: pointer;
          box-shadow: 0 8px 22px rgba(34,197,94,0.4);
          animation: dbvIconPulse 2s ease-in-out infinite;
        }
        .dbv-confirm.ready:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(34,197,94,0.5);
        }
        .dbv-confirm.ready::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%);
          transform: translateX(-100%);
          animation: dbv-shine 2.4s ease-in-out infinite;
          pointer-events: none;
        }
        .dbv-confirm:disabled, .dbv-confirm:disabled:hover {
          background: linear-gradient(135deg, rgba(48,64,53,0.5) 0%, rgba(48,64,53,0.4) 100%);
          color: rgba(255,255,255,0.7);
          cursor: not-allowed;
          box-shadow: none;
          transform: none; animation: none;
        }
        .dbv-confirm.submitting { animation: none; cursor: wait; }
        .dbv-spin { animation: dbv-spin 0.9s linear infinite; }

        /* ── Panneau d'aperçu document inline (remplace planning + dossier APD) ── */
        .dbv-preview-pane {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          /* Le viewer PDF de Chrome a un fond gris #525659 — on l'aligne pour
             une transition visuelle fluide entre toolbar custom et iframe. */
          background: #525659;
          border-radius: 14px;
          border: 1px solid rgba(48,64,53,0.08);
          overflow: hidden;
          animation: dbvReveal 0.36s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .dbv-preview-toolbar {
          flex-shrink: 0;
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(48,64,53,0.08);
          background: linear-gradient(135deg, #f5eee8 0%, #faf6ef 100%);
        }
        .dbv-preview-back {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 11px;
          border-radius: 8px;
          border: 1px solid rgba(48,64,53,0.12);
          background: #fff;
          color: #1a1614;
          font-size: 11.5px; font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
          font-family: inherit;
        }
        .dbv-preview-back:hover {
          background: #f5eee8;
          border-color: rgba(166,119,73,0.4);
          color: #7c4f1d;
        }
        .dbv-preview-name {
          flex: 1; min-width: 0;
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 12px; font-weight: 700;
          color: #1a1614;
        }
        .dbv-preview-name svg { color: #a67749; flex-shrink: 0; }
        .dbv-preview-name span {
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dbv-preview-external {
          flex-shrink: 0;
          width: 30px; height: 30px;
          border-radius: 8px;
          border: 1px solid rgba(48,64,53,0.1);
          background: #fff;
          color: rgba(48,64,53,0.6);
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s ease;
          text-decoration: none;
        }
        .dbv-preview-external:hover {
          color: #a67749;
          border-color: #a67749;
          background: #fff8ef;
        }
        .dbv-preview-frame {
          flex: 1;
          width: 100%;
          border: none;
          background: #fafaf7;
          min-height: 0;
        }
        .dbv-preview-fallback {
          flex: 1;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 12px;
          padding: 32px;
          text-align: center;
          color: rgba(48,64,53,0.6);
          font-size: 13px;
        }
        .dbv-preview-fallback p { margin: 0; max-width: 280px; }
        .dbv-preview-fallback-link {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px;
          border-radius: 9px;
          background: linear-gradient(135deg, #fff8ef 0%, #ffe7c2 100%);
          border: 1px solid rgba(166,119,73,0.4);
          color: #7c4f1d;
          font-size: 12px; font-weight: 700;
          text-decoration: none;
          transition: all 0.15s ease;
        }
        .dbv-preview-fallback-link:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(166,119,73,0.25);
        }
      `}</style>

      <div
        className="dbv-bg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dbv-h2"
        onClick={() => { if (!submitting && !loading) onCancel(); }}
      >
        <div className="dbv-card" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="dbv-head">
            {[
              { left: '14%', bottom: '18%', delay: '0s' },
              { left: '36%', bottom: '60%', delay: '0.7s' },
              { left: '58%', bottom: '24%', delay: '1.4s' },
              { left: '82%', bottom: '50%', delay: '0.4s' },
              { left: '92%', bottom: '14%', delay: '2.1s' },
              { left: '24%', bottom: '78%', delay: '1.8s' },
            ].map((p, i) => (
              <span key={i} className="dbv-spark" style={{ left: p.left, bottom: p.bottom, animationDelay: p.delay }} />
            ))}

            <div className="dbv-row">
              <div className="dbv-titles">
                <div className="dbv-icon"><Calendar style={{ width: 24, height: 24 }} /></div>
                <div>
                  <h2 id="dbv-h2">Validation projet</h2>
                  <p>{clientName ? `Dossier ${clientName} · ` : ''}Renseignez les dates butoires avant de valider</p>
                </div>
              </div>
              <div className="dbv-head-actions">
                <button
                  type="button"
                  className="dbv-extract-btn"
                  onClick={handleExtractWithAI}
                  disabled={extracting || submitting || loading}
                  title="Extraire automatiquement les dates et commandes depuis les documents du dossier"
                >
                  {extracting ? (
                    <>
                      <Loader2 className="dbv-spin" style={{ width: 14, height: 14 }} />
                      Extraction…
                    </>
                  ) : (
                    <>
                      <Sparkles style={{ width: 14, height: 14 }} />
                      Extraire avec IA
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="dbv-close"
                  onClick={onCancel}
                  disabled={submitting || loading}
                  aria-label="Fermer"
                >
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </div>

            {extractError && (
              <div className="dbv-extract-banner dbv-extract-banner--error" role="alert">
                <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
                <span>{extractError}</span>
                <button
                  type="button"
                  className="dbv-extract-banner-close"
                  onClick={() => setExtractError(null)}
                  aria-label="Fermer"
                >
                  <X style={{ width: 12, height: 12 }} />
                </button>
              </div>
            )}
            {extractInfo && (
              <div className="dbv-extract-banner dbv-extract-banner--success" role="status">
                <Check style={{ width: 14, height: 14, flexShrink: 0 }} />
                <span>
                  {extractInfo.dates} dates, {extractInfo.commandes} commandes,{' '}
                  {extractInfo.livraisons} livraisons extraites
                  {extractInfo.confiance < 0.7
                    ? ` · confiance faible (${Math.round(extractInfo.confiance * 100)}%) — vérifiez avant de valider`
                    : ' — vérifiez avant de valider'}
                </span>
              </div>
            )}

            <div className="dbv-progress">
              <span className={`dbv-progress-pct${allFilled ? ' complete' : ''}`}>{progressPct}%</span>
              <div className="dbv-progress-bar-wrap">
                <div className="dbv-progress-label">{filledCount} / {total} dates renseignées</div>
                <div className="dbv-progress-bar">
                  <div className={`dbv-progress-fill${allFilled ? ' complete' : ''}`} style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Body — 2 colonnes */}
          <div className="dbv-body">
            {/* COLONNE GAUCHE : Planning gestion + Devis (ou preview document si ouvert) */}
            <div className="dbv-col-left">
              {previewDoc ? (
                /* Mode preview document : on remplace planning + devis par le viewer */
                <div className="dbv-preview-pane">
                  <div className="dbv-preview-toolbar">
                    <button
                      type="button"
                      className="dbv-preview-back"
                      onClick={closePreview}
                      title="Revenir au planning + dossier"
                    >
                      <ArrowLeft style={{ width: 14, height: 14 }} />
                      Retour
                    </button>
                    <div className="dbv-preview-name" title={previewDoc.name}>
                      <FileText style={{ width: 13, height: 13 }} />
                      <span>{previewDoc.name}</span>
                    </div>
                    <a
                      href={previewDoc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dbv-preview-external"
                      title="Ouvrir dans un nouvel onglet"
                    >
                      <ExternalLink style={{ width: 13, height: 13 }} />
                    </a>
                  </div>
                  {isInlinePreviewable(previewDoc) ? (
                    <iframe
                      src={buildPreviewUrl(previewDoc)}
                      className="dbv-preview-frame"
                      title={`Aperçu de ${previewDoc.name}`}
                    />
                  ) : (
                    <div className="dbv-preview-fallback">
                      <FileText style={{ width: 32, height: 32, opacity: 0.4 }} />
                      <p>L'aperçu inline n'est pas disponible pour ce type de fichier.</p>
                      <a
                        href={previewDoc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="dbv-preview-fallback-link"
                      >
                        <ExternalLink style={{ width: 13, height: 13 }} />
                        Ouvrir dans un nouvel onglet
                      </a>
                    </div>
                  )}
                </div>
              ) : (
              <>
              <div className="dbv-section">
                <div className="dbv-section-head">
                  <span className="dbv-section-title">
                    <CalendarDays style={{ width: 13, height: 13 }} />
                    Planning gestion
                  </span>
                  <div className="dbv-plan-nav">
                    <button type="button" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Semaine précédente">
                      <ChevronLeft style={{ width: 12, height: 12 }} />
                    </button>
                    <span>{`Semaine ${getIsoWeekNumber(weekOffset)}`}</span>
                    <button type="button" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Semaine suivante">
                      <ChevronRight style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                </div>

                {/* Grille toujours visible (meme sans evenement) — l'utilisateur
                    voit immediatement quels creneaux sont libres pour planifier. */}
                <div className="dbv-plan-grid">
                  <div className="dbv-plan-headcell">·</div>
                  {DAYS.map((d) => <div key={d} className="dbv-plan-headcell">{d}</div>)}
                  {hours.map((h) => (
                    <div key={`row-${h}`} style={{ display: 'contents' }}>
                      <div className="dbv-plan-hour">{h}h</div>
                      {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                        const evt = weekEvents.find((e) => e.day === day && e.startHour === h);
                        return (
                          <div key={`c-${h}-${day}`} className="dbv-plan-cell">
                            {evt && (
                              <div
                                className="dbv-plan-event"
                                style={{
                                  background: evt.color,
                                  height: `${Math.max(1, evt.duration) * 28 - 2}px`,
                                }}
                                title={evt.title}
                              >
                                {evt.title}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="dbv-section">
                <div className="dbv-section-head">
                  <span className="dbv-section-title">
                    <Receipt style={{ width: 13, height: 13 }} />
                    Documents du dossier
                  </span>
                  {totalDocsCount > 0 && (
                    <span style={{ fontSize: 10, color: 'rgba(48,64,53,0.55)', fontWeight: 700 }}>
                      {totalDocsCount} fichier{totalDocsCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {allDocGroups.length === 0 ? (
                  <div className="dbv-empty">
                    Aucun document dans ce dossier
                  </div>
                ) : (
                  <div className="dbv-devis-list">
                    {allDocGroups.map((group, gi) => (
                      <div key={`group-${gi}`} className="dbv-doc-group">
                        <div className="dbv-doc-group-label" title={group.label}>
                          <Folder style={{ width: 11, height: 11 }} />
                          {group.label}
                          <span className="dbv-doc-group-count">
                            {group.docs.length}
                          </span>
                        </div>
                        {group.docs.map((doc, di) => {
                          const previewKey = doc.docId ?? `${group.label}-${doc.name}-${di}`;
                          const canPreview = !!(doc.docId || doc.dataUrl);
                          const isLoading = previewLoadingId === previewKey;
                          return (
                            <div key={previewKey} className="dbv-devis-row">
                              <div className="dbv-devis-icon">
                                <Receipt style={{ width: 13, height: 13 }} />
                              </div>
                              <div className="dbv-devis-info">
                                <div className="dbv-devis-ref" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {doc.name}
                                </div>
                                <div className="dbv-devis-meta">
                                  {(doc.size || doc.type) && (
                                    <>
                                      {doc.size ? `${(doc.size / 1024).toFixed(0)} Ko` : ''}
                                      {doc.size && doc.type ? ' · ' : ''}
                                      {doc.type ?? ''}
                                    </>
                                  )}
                                  {!doc.size && !doc.type && doc.addedAt ? `Ajouté le ${doc.addedAt}` : ''}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="dbv-preview-btn"
                                onClick={() => canPreview && handlePreviewDoc(doc)}
                                disabled={!canPreview || isLoading}
                                title={canPreview ? 'Voir le document' : 'Aperçu indisponible (placeholder sans contenu)'}
                                aria-label={`Voir ${doc.name}`}
                              >
                                {isLoading ? (
                                  <Loader2 style={{ width: 14, height: 14, animation: 'dbv-spin 0.9s linear infinite' }} />
                                ) : (
                                  <Eye style={{ width: 14, height: 14 }} />
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </>
              )}
            </div>

            {/* COLONNE DROITE : Dates butoires (ou drawer ACCEDER si ouvert) */}
            <div className="dbv-col-right">
              {accessDrawer ? (
                <CommandesAccessPanel
                  label={accessDrawer.label}
                  entries={commandesForDrawer}
                  onAdd={(e) => addCommandeAccess(dossierId, accessDrawer.label, e)}
                  onUpdate={(id, patch) => updateCommandeAccess(dossierId, accessDrawer.label, id, patch)}
                  onRemove={(id) => removeCommandeAccess(dossierId, accessDrawer.label, id)}
                  onBack={() => setAccessDrawer(null)}
                  disabled={submitting || loading}
                />
              ) : (
              <>
              <div className="dbv-warn">
                <AlertTriangle className="dbv-warn-icon" style={{ width: 16, height: 16 }} />
                <div>
                  Sans dates butoires, l'équipe perd la traçabilité des deadlines projet.
                  <strong> La validation est bloquée tant que toutes les dates ne sont pas saisies.</strong>
                </div>
              </div>

              <button
                type="button"
                className="dbv-prefill"
                onClick={handlePrefill}
                disabled={submitting || loading}
                title="Remplit avec des délais standards (modifiables ensuite)"
              >
                <Wand2 style={{ width: 12, height: 12 }} />
                <Sparkles style={{ width: 11, height: 11 }} />
                Pré-remplir avec des délais standards
              </button>

              <div className="dbv-section-banner">
                <Folder style={{ width: 14, height: 14 }} />
                Enregistrer date butoir pour rappel
              </div>

              <div className="dbv-list">
                {resolvedItems.map((item, i) => {
                  const { label, kind } = item;

                  // ── 1) Items 'access' (COMMANDES, LIVRAISON) → bouton ACCEDER ──
                  if (kind === 'access') {
                    return (
                      <div
                        key={label}
                        className="dbv-item dbv-item-access"
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <div className="dbv-item-bullet dbv-item-bullet-folder">
                          <Folder style={{ width: 12, height: 12 }} />
                        </div>
                        <span className="dbv-item-label" title={label}>{label}</span>
                        <button
                          type="button"
                          className="dbv-access-btn"
                          onClick={() => {
                            // Si le parent a fourni un callback (override),
                            // on l'appelle. Sinon → drawer interne.
                            if (onAccessItem) onAccessItem(label);
                            else setAccessDrawer({ label });
                          }}
                          disabled={submitting || loading}
                          aria-label={`Accéder à ${label}`}
                        >
                          ACCEDER
                          <ArrowRight style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                    );
                  }

                  // ── 2) Items 'static' (SAV) → folder seul, pas d'action ──
                  if (kind === 'static') {
                    return (
                      <div
                        key={label}
                        className="dbv-item dbv-item-static"
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <div className="dbv-item-bullet dbv-item-bullet-folder">
                          <Folder style={{ width: 12, height: 12 }} />
                        </div>
                        <span className="dbv-item-label" title={label}>{label}</span>
                      </div>
                    );
                  }

                  // ── 3) Items 'date' (cas par défaut) → input date ──
                  const value = dates[label] ?? '';
                  const isFilled = !!value;
                  const delta = isFilled ? dayDelta(value) : 0;
                  return (
                    <div
                      key={label}
                      className={`dbv-item${isFilled ? ' filled' : ''}`}
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <div className="dbv-item-bullet dbv-item-bullet-folder">
                        {isFilled ? <Check style={{ width: 12, height: 12 }} /> : <Folder style={{ width: 12, height: 12 }} />}
                      </div>
                      <span className="dbv-item-label" title={label}>{label}</span>
                      {isFilled && (
                        <span className="dbv-item-delta">
                          {delta === 0 ? "auj." : delta > 0 ? `J+${delta}` : `J${delta}`}
                        </span>
                      )}
                      <input
                        type="date"
                        className="dbv-item-input"
                        min={today}
                        value={value}
                        onChange={(e) => setDates((s) => ({ ...s, [label]: e.target.value }))}
                        disabled={submitting || loading}
                        aria-label={`Date butoire pour ${label}`}
                      />
                    </div>
                  );
                })}
              </div>
              </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="dbv-foot">
            {error && (
              <div className="dbv-error" role="alert">
                <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
                {error}
              </div>
            )}
            <button
              type="button"
              className="dbv-btn dbv-cancel"
              onClick={onCancel}
              disabled={submitting || loading}
            >
              Annuler
            </button>
            <button
              type="button"
              className={`dbv-btn dbv-confirm${allFilled ? ' ready' : ''}${submitting ? ' submitting' : ''}`}
              onClick={handleSubmit}
              disabled={!allFilled || submitting || loading}
            >
              {submitting || loading ? (
                <>
                  <Loader2 className="dbv-spin" style={{ width: 14, height: 14 }} />
                  Validation…
                </>
              ) : (
                <>
                  <FileCheck style={{ width: 14, height: 14 }} />
                  {allFilled ? 'Valider le projet' : `Encore ${total - filledCount} date${total - filledCount > 1 ? 's' : ''}`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Sous-composant : panneau ACCEDER (commandes / livraison) ───────────────

interface CommandesAccessPanelProps {
  label: string;
  entries: CommandeAccessEntry[];
  onAdd: (entry: Omit<CommandeAccessEntry, 'id'>) => void;
  onUpdate: (id: string, patch: Partial<Omit<CommandeAccessEntry, 'id'>>) => void;
  onRemove: (id: string) => void;
  onBack: () => void;
  disabled?: boolean;
}

function CommandesAccessPanel({
  label, entries, onAdd, onUpdate, onRemove, onBack, disabled,
}: CommandesAccessPanelProps) {
  const [draftFournisseur, setDraftFournisseur] = useState('');
  const [draftDate, setDraftDate] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const isLivraison = label.toUpperCase().includes('LIVRAISON');
  const suggestions = useMemo(() => getSuggestionsForLabel(label), [label]);
  const filteredSuggestions = useMemo(() => {
    const q = draftFournisseur.trim().toUpperCase();
    if (!q) return suggestions.slice(0, 8);
    return suggestions.filter((s) => s.includes(q)).slice(0, 8);
  }, [draftFournisseur, suggestions]);

  const placeholderText = isLivraison
    ? 'Catégorie / lot (ex: CUISINE, ELECTRO, GRANIT…)'
    : 'Marque / fournisseur (ex: LEICHT, MARBRIER…)';
  const fournisseurAria = isLivraison ? 'Nouvelle catégorie de livraison' : 'Nouveau fournisseur';

  const handleAdd = () => {
    const f = draftFournisseur.trim();
    if (!f) return;
    onAdd({ fournisseur: f, dateButoir: draftDate || '' });
    setDraftFournisseur('');
    setDraftDate('');
    setShowSuggestions(false);
  };

  /** Couleur urgence selon delta jours. Dépassée = rouge ; < 14j = orange ; >= 14j = vert. */
  const urgencyClass = (iso: string): string => {
    if (!iso) return 'cap-row-pending';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'cap-row-pending';
    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);
    const days = Math.round((d.getTime() - today0.getTime()) / 86_400_000);
    if (days < 0) return 'cap-row-late';
    if (days < 14) return 'cap-row-soon';
    return 'cap-row-ok';
  };

  const Icon = label.toUpperCase().includes('LIVRAISON') ? Truck : ShoppingCart;

  return (
    <div className="cap-pane">
      <style>{`
        @keyframes capSlideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes capRowIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .cap-pane {
          display: flex; flex-direction: column;
          height: 100%; min-height: 0;
          gap: 12px;
          animation: capSlideIn 0.36s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .cap-header {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px;
          border-radius: 14px;
          background: linear-gradient(135deg, #2a3a30 0%, #3d5244 100%);
          color: #fff;
          box-shadow: 0 6px 18px rgba(48,64,53,0.25);
          flex-shrink: 0;
        }
        .cap-back {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 11px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.08);
          color: #fff;
          font-size: 11.5px; font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: inherit;
          flex-shrink: 0;
        }
        .cap-back:hover { background: rgba(255,255,255,0.18); transform: translateX(-2px); }
        .cap-title { flex: 1; min-width: 0; }
        .cap-title-eyebrow {
          font-size: 9.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.12em;
          color: rgba(217,179,138,0.95);
        }
        .cap-title-main {
          font-size: 16px; font-weight: 800;
          margin-top: 1px;
          letter-spacing: -0.01em;
          display: inline-flex; align-items: center; gap: 8px;
        }
        .cap-counter {
          flex-shrink: 0;
          padding: 4px 10px; border-radius: 999px;
          background: rgba(217,179,138,0.18);
          color: #d9b38a;
          font-size: 11px; font-weight: 800;
          letter-spacing: 0.04em;
          border: 1px solid rgba(217,179,138,0.3);
        }

        .cap-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 2px; min-height: 0; }
        .cap-row {
          display: grid;
          grid-template-columns: auto 1fr auto auto;
          gap: 8px; align-items: center;
          padding: 10px 12px;
          border-radius: 12px;
          background: #fff;
          border: 1px solid rgba(48,64,53,0.1);
          transition: all 0.15s ease;
          animation: capRowIn 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .cap-row-bullet {
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 800;
          background: linear-gradient(135deg, #fff8ef 0%, #ffe7c2 100%);
          color: #a67749;
          border: 1px solid rgba(166,119,73,0.3);
          flex-shrink: 0;
        }
        .cap-row-fournisseur {
          font-size: 13px; font-weight: 700;
          color: #1a1614;
          letter-spacing: 0.01em;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cap-row-date {
          flex-shrink: 0; width: 145px;
          padding: 6px 8px;
          border: 1px solid rgba(48,64,53,0.15);
          border-radius: 7px;
          background: #fff;
          font-size: 11.5px; color: #1a1614;
          font-family: inherit;
        }
        .cap-row-date:focus { outline: none; border-color: #a67749; box-shadow: 0 0 0 3px rgba(166,119,73,0.18); }
        .cap-row-actions { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .cap-row-action-btn {
          width: 30px; height: 30px;
          border-radius: 8px;
          border: 1px solid rgba(48,64,53,0.1);
          background: #fff;
          color: rgba(48,64,53,0.55);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s ease;
        }
        .cap-row-action-btn:hover { color: #a67749; border-color: #a67749; background: #fff8ef; }
        .cap-row-action-btn.danger:hover { color: #dc2626; border-color: #fca5a5; background: #fef2f2; }
        .cap-row-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .cap-row.cap-row-late {
          background: linear-gradient(135deg, #fef2f2 0%, #fff 100%);
          border-color: rgba(220,38,38,0.35);
        }
        .cap-row.cap-row-late .cap-row-bullet {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          border-color: rgba(220,38,38,0.4);
          color: #b91c1c;
        }
        .cap-row.cap-row-soon {
          background: linear-gradient(135deg, #fff7ed 0%, #fff 100%);
          border-color: rgba(234,88,12,0.3);
        }
        .cap-row.cap-row-soon .cap-row-bullet {
          background: linear-gradient(135deg, #ffedd5, #fed7aa);
          border-color: rgba(234,88,12,0.35);
          color: #c2410c;
        }
        .cap-row.cap-row-ok {
          background: linear-gradient(135deg, #f0fdf4 0%, #fff 100%);
          border-color: rgba(34,197,94,0.3);
        }
        .cap-row.cap-row-ok .cap-row-bullet {
          background: linear-gradient(135deg, #dcfce7, #bbf7d0);
          border-color: rgba(34,197,94,0.4);
          color: #15803d;
        }

        /* Add row */
        .cap-add-block {
          flex-shrink: 0;
          padding: 12px;
          border-radius: 12px;
          background: linear-gradient(135deg, #fbf8f3 0%, #fff 100%);
          border: 1px dashed rgba(166,119,73,0.4);
          position: relative;
        }
        .cap-add-row {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 8px;
          align-items: center;
        }
        .cap-add-input {
          padding: 9px 12px;
          border: 1px solid rgba(48,64,53,0.15);
          border-radius: 9px;
          background: #fff;
          font-size: 12.5px; font-weight: 600;
          color: #1a1614;
          font-family: inherit;
          letter-spacing: 0.02em;
        }
        .cap-add-input:focus { outline: none; border-color: #a67749; box-shadow: 0 0 0 3px rgba(166,119,73,0.18); }
        .cap-add-input::placeholder { color: rgba(48,64,53,0.35); font-weight: 500; }
        .cap-add-date {
          width: 145px;
          padding: 9px 10px;
          border: 1px solid rgba(48,64,53,0.15);
          border-radius: 9px;
          background: #fff;
          font-size: 11.5px; color: #1a1614;
          font-family: inherit;
        }
        .cap-add-date:focus { outline: none; border-color: #a67749; box-shadow: 0 0 0 3px rgba(166,119,73,0.18); }
        .cap-add-btn {
          padding: 0 14px; height: 38px;
          border-radius: 9px;
          border: none;
          background: linear-gradient(135deg, #a67749 0%, #c89665 100%);
          color: #fff;
          font-size: 12px; font-weight: 800;
          cursor: pointer;
          display: inline-flex; align-items: center; gap: 5px;
          transition: all 0.18s ease;
          letter-spacing: 0.04em;
          box-shadow: 0 4px 12px rgba(166,119,73,0.3);
        }
        .cap-add-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(166,119,73,0.4);
        }
        .cap-add-btn:active { transform: translateY(0); }
        .cap-add-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; transform: none; }

        /* Suggestions popup */
        .cap-suggest {
          position: absolute;
          top: calc(100% + 4px);
          left: 12px; right: 12px;
          background: #fff;
          border: 1px solid rgba(48,64,53,0.15);
          border-radius: 10px;
          box-shadow: 0 12px 30px rgba(0,0,0,0.12);
          z-index: 5;
          max-height: 200px; overflow-y: auto;
          padding: 4px;
        }
        .cap-suggest-item {
          padding: 8px 10px;
          border-radius: 7px;
          font-size: 12px; font-weight: 700;
          color: #1a1614;
          cursor: pointer;
          transition: background 0.12s ease;
          display: flex; align-items: center; gap: 7px;
        }
        .cap-suggest-item:hover {
          background: linear-gradient(135deg, #fff8ef 0%, #ffe7c2 100%);
          color: #7c4f1d;
        }
        .cap-suggest-item svg { color: #a67749; flex-shrink: 0; }

        .cap-empty {
          padding: 32px 16px;
          text-align: center;
          color: rgba(48,64,53,0.4);
          font-size: 12px;
        }
      `}</style>

      {/* Header */}
      <div className="cap-header">
        <button type="button" className="cap-back" onClick={onBack} disabled={disabled}>
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Retour
        </button>
        <div className="cap-title">
          <div className="cap-title-eyebrow">Enregistrer date butoir pour rappel</div>
          <div className="cap-title-main">
            <Icon style={{ width: 16, height: 16, color: '#d9b38a' }} />
            {label}
          </div>
        </div>
        <span className="cap-counter">{entries.length}</span>
      </div>

      {/* Liste des entrées */}
      <div className="cap-list">
        {entries.length === 0 ? (
          <div className="cap-empty">
            Aucun fournisseur ajouté.<br />
            Saisissez la marque ci-dessous et sa date butoir.
          </div>
        ) : (
          entries.map((entry, idx) => {
            const cls = urgencyClass(entry.dateButoir);
            return (
              <div key={entry.id} className={`cap-row ${cls}`}>
                <div className="cap-row-bullet">{idx + 1}</div>
                <input
                  type="text"
                  className="cap-row-fournisseur"
                  value={entry.fournisseur}
                  onChange={(e) => onUpdate(entry.id, { fournisseur: e.target.value.toUpperCase() })}
                  disabled={disabled}
                  style={{ border: 'none', background: 'transparent', outline: 'none', minWidth: 0 }}
                  aria-label="Fournisseur"
                />
                <input
                  type="date"
                  className="cap-row-date"
                  value={entry.dateButoir}
                  min={today}
                  onChange={(e) => onUpdate(entry.id, { dateButoir: e.target.value })}
                  disabled={disabled}
                  aria-label={`Date butoir pour ${entry.fournisseur}`}
                />
                <div className="cap-row-actions">
                  <button
                    type="button"
                    className="cap-row-action-btn"
                    title="Recherche / consulter (à venir)"
                    disabled
                  >
                    <Search style={{ width: 14, height: 14 }} />
                  </button>
                  <button
                    type="button"
                    className="cap-row-action-btn danger"
                    onClick={() => onRemove(entry.id)}
                    disabled={disabled}
                    title="Supprimer cette ligne"
                    aria-label={`Supprimer ${entry.fournisseur}`}
                  >
                    <Trash2 style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Block d'ajout */}
      <div className="cap-add-block">
        <div className="cap-add-row">
          <input
            type="text"
            className="cap-add-input"
            placeholder={placeholderText}
            value={draftFournisseur}
            onChange={(e) => { setDraftFournisseur(e.target.value.toUpperCase()); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            disabled={disabled}
            aria-label={fournisseurAria}
          />
          <input
            type="date"
            className="cap-add-date"
            value={draftDate}
            min={today}
            onChange={(e) => setDraftDate(e.target.value)}
            disabled={disabled}
            aria-label="Date butoir nouvelle commande"
          />
          <button
            type="button"
            className="cap-add-btn"
            onClick={handleAdd}
            disabled={disabled || !draftFournisseur.trim()}
            title="Ajouter cette commande"
          >
            <Plus style={{ width: 14, height: 14 }} />
            Ajouter
          </button>
        </div>
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="cap-suggest">
            {filteredSuggestions.map((s) => (
              <div
                key={s}
                className="cap-suggest-item"
                onMouseDown={(e) => { e.preventDefault(); setDraftFournisseur(s); setShowSuggestions(false); }}
              >
                <Receipt style={{ width: 12, height: 12 }} />
                {s}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
