'use client';

/**
 * StatsGateModal v2 — modale BLOQUANTE refondue (audit 26/05/2026).
 *
 * Demande initiale : impossible d'accéder aux tableaux statistiques tant qu'au
 * moins un dossier signé n'a pas ses prix achat HT + vente HT renseignés ligne
 * par ligne (par fournisseur). La v1 marchait mais avait 3 douleurs UX :
 *   1. Pas multi-ligne intuitive (mono-formulaire mono-ligne)
 *   2. Pas d'accès aux fichiers source (devis + factures achats)
 *   3. Bloquant sans échappatoire (18 dossiers en backlog = drame)
 *
 * Refonte v2 — 10 améliorations câblées et corrélées :
 *
 *   [A] Auto-import depuis confirmations validées
 *       Bouton "🪄 Importer N confirmations" qui crée d'un coup N lignes
 *       pré-remplies (fournisseur + prixAchatHT). L'utilisateur n'a plus
 *       qu'à compléter les prix vente.
 *
 *   [B] Snooze ce dossier (statsSkipped)
 *       Bouton "⏭ Reporter ce dossier" pour les dossiers historiques sans
 *       info dispo. Marque statsSkipped=true → exclu du gate.
 *
 *   [C] Raccourcis clavier
 *       Entrée   → ajoute la ligne et focus sur fournisseur
 *       Cmd/Ctrl + Entrée → ajoute la ligne et passe au dossier suivant
 *       Échap    → vide le brouillon en cours
 *       Tab      → cycle classique entre champs
 *
 *   [D] Marge live pendant la saisie
 *       Affiche en temps réel "Marge: X € (Y%)" avec couleur (vert/rouge/gris).
 *       Détecte les inversions achat>vente.
 *
 *   [E] Brouillon persistant (localStorage)
 *       Sauvegarde le draft (fournisseur/achat/vente) par dossierId. Restauré
 *       au prochain ouvert. Clé : avra:statsgate:draft:{dossierId}.
 *
 *   [F] Progression sidebar
 *       Chaque dossier dans la liste gauche affiche un anneau coloré + ratio
 *       lignes/confirmations attendues. Couleur : vert (complet), orange
 *       (partiel), rouge (vide), violet (reporté).
 *
 *   [P0] Click sur confirmation = pré-remplir
 *        Bouton + sur chaque confirmation listée → préremplit le draft sans
 *        l'ajouter directement (utile si l'utilisateur veut ajuster avant).
 *
 *   [P1] Multi-ligne évidente
 *        Badge "Ligne N+1" au-dessus du formulaire, auto-focus après ajout,
 *        toast "✓ Ligne ajoutée" éphémère.
 *
 *   [P2] Accès aux sous-dossiers
 *        Bouton "📁 Ouvrir le dossier signé" → router.push vers /dossiers/{id}.
 *
 *   [P3] Devis cliquables
 *        Chaque devis ACCEPTÉ devient un lien vers /facturation?devis={ref}.
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Trash2, FolderOpen, AlertTriangle, ChevronRight, CheckCircle2,
  Euro, FileText, Package, Wand2, Clock, ExternalLink, Sparkles, X,
} from 'lucide-react';
import type {
  DossierSigne,
  DossierPrixLigne,
  ConfirmationFournisseur,
  SubFolder,
  DocumentFile,
  SubFolderDocument,
} from '@/store/useDossierStore';
import {
  ARCHITECTE_PROJET_VERSION_REGEX,
  CUISINISTE_OPTION_REGEX,
  MENUISIER_PROJET_REGEX,
} from '@/store/useDossierStore';
import { getDocSignedUrl } from '@/lib/dossier-docs-api';
import { extractDossier } from '@/lib/ai-extract-api';
import type { Devis } from '@/store/useFacturationStore';

interface Props {
  /** Dossiers signés qui n'ont pas (ou pas assez de) lignes prix. */
  missingDossiers: DossierSigne[];
  /** Tous les dossiers signés — garde le dossier courant sélectionné même
   *  après l'ajout d'une 1re ligne (sinon il sort de missingDossiers et la
   *  sélection saute au suivant → impossible d'ajouter plusieurs lignes). */
  allSignes: DossierSigne[];
  /** Tous les devis (pour afficher les ACCEPTÉ par dossier dans le récap). */
  allDevis: Devis[];
  /** Callback persistance : ajout d'une ligne sur le dossier. */
  onAddLigne: (dossierId: string, ligne: Omit<DossierPrixLigne, 'id'>) => void;
  /** Callback persistance : suppression d'une ligne. */
  onRemoveLigne: (dossierId: string, ligneId: string) => void;
  /** Auto-import : ajoute N lignes d'un coup (StatsGate v2). */
  onAddLignesBulk: (dossierId: string, lignes: Omit<DossierPrixLigne, 'id'>[]) => void;
  /** Snooze : reporte un dossier hors du gate (StatsGate v2). */
  onSkipDossier: (dossierId: string, skipped: boolean) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const draftStorageKey = (dossierId: string) => `avra:statsgate:draft:${dossierId}`;

interface Draft { fournisseur: string; achat: string; vente: string; }
const EMPTY_DRAFT: Draft = { fournisseur: '', achat: '', vente: '' };

function readDraft(dossierId: string): Draft {
  if (typeof window === 'undefined') return EMPTY_DRAFT;
  try {
    const raw = localStorage.getItem(draftStorageKey(dossierId));
    if (!raw) return EMPTY_DRAFT;
    const parsed = JSON.parse(raw);
    return {
      fournisseur: typeof parsed?.fournisseur === 'string' ? parsed.fournisseur : '',
      achat:       typeof parsed?.achat       === 'string' ? parsed.achat       : '',
      vente:       typeof parsed?.vente       === 'string' ? parsed.vente       : '',
    };
  } catch { return EMPTY_DRAFT; }
}

function writeDraft(dossierId: string, draft: Draft): void {
  if (typeof window === 'undefined') return;
  const isEmpty = !draft.fournisseur && !draft.achat && !draft.vente;
  try {
    if (isEmpty) localStorage.removeItem(draftStorageKey(dossierId));
    else localStorage.setItem(draftStorageKey(dossierId), JSON.stringify(draft));
  } catch { /* quota plein → silently ignore */ }
}

// ── Composant principal ────────────────────────────────────────────────────
export function StatsGateModal({
  missingDossiers, allSignes, allDevis, onAddLigne, onRemoveLigne, onAddLignesBulk, onSkipDossier,
}: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(missingDossiers[0]?.id ?? null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [toast, setToast] = useState<{ message: string; tone: 'ok' | 'info' } | null>(null);
  const fournisseurInputRef = useRef<HTMLInputElement>(null);
  const venteInputRef = useRef<HTMLInputElement>(null);

  // ── Extraction IA (27/05/2026) — reutilise l'endpoint /ia/extract-dossier ──
  // L'IA analyse les PDF du dossier (devis fournisseurs, factures d'achats)
  // et retourne des { fournisseur, montantHT } qu'on transforme en lignes prix.
  const [aiExtracting, setAiExtracting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Résout le dossier courant dans TOUS les signés (pas seulement
  // missingDossiers) : il reste sélectionné après sa 1re ligne → saisie
  // multi-lignes possible. On n'avance qu'au clic « Suivant ».
  const selected = useMemo(
    () =>
      allSignes.find((d) => d.id === selectedId) ??
      missingDossiers.find((d) => d.id === selectedId) ??
      missingDossiers[0] ?? null,
    [allSignes, missingDossiers, selectedId],
  );

  // Liste de gauche = dossiers à compléter + le dossier courant (même s'il a
  // déjà des lignes), pour qu'il reste visible pendant la saisie.
  const listDossiers = useMemo(() => {
    if (selected && !missingDossiers.some((d) => d.id === selected.id)) {
      return [selected, ...missingDossiers];
    }
    return missingDossiers;
  }, [missingDossiers, selected]);

  // ── [E] Brouillon : restauration au changement de dossier ───────────────
  useEffect(() => {
    if (!selected) return;
    setDraft(readDraft(selected.id));
  }, [selected?.id]);

  // ── [E] Brouillon : persistance throttlée à chaque keystroke ────────────
  useEffect(() => {
    if (!selected) return;
    const t = setTimeout(() => writeDraft(selected.id, draft), 250);
    return () => clearTimeout(t);
  }, [draft, selected?.id]);

  // ── Toast auto-clear ────────────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // Récup devis ACCEPTÉ du dossier (rappel des prix vendus)
  const devisValides = useMemo(
    () => (selected ? allDevis.filter((d) => d.dossierId === selected.id && d.statut === 'ACCEPTÉ') : []),
    [allDevis, selected],
  );

  // Récup confirmations VALIDÉES du dossier (rappel des prix achetés)
  const confirmsValidees: ConfirmationFournisseur[] = useMemo(
    () => (selected?.confirmations ?? []).filter((c) => c.validee),
    [selected],
  );

  // ── NOUVEAU 27/05/2026 : sous-dossiers OPTIONS VALIDÉES (avec leurs docs) ──
  // L'utilisateur a explique que les "Options validees" doivent permettre de
  // consulter les devis PDF presents dans les sous-dossiers OPTION/PROJET/APD
  // du dossier signe, pas seulement les devis du store Facturation. On liste
  // les sous-dossiers qui matchent les regex ET qui contiennent ≥1 doc.
  const optionsValideesSubfolders = useMemo<Array<{ label: string; docs: DocumentFile[] }>>(() => {
    const subfolders = selected?.signedSubfolders ?? [];
    return subfolders
      // P2 (28/05/2026) : a la signature, les sous-dossiers recoivent un suffixe
      // " VALIDEE"/" VALIDE" (+ eventuel nom custom), ex "OPTION 1 CUISINE VALIDEE",
      // "PROJET 1 VALIDE", "PROJET VERSION 1 - APD VALIDE". Les regex ancrees en
      // fin ($) ne matchaient alors plus → devis non affiches. On matche donc le
      // DEBUT du label (non ancre en fin) pour tolerer suffixe + custom.
      .filter((sf) => {
        const L = sf.label;
        return (
          /^OPTION\s+\d+/i.test(L) ||
          /^PROJET\s+VERSION\s+\d+\s*[–—-]\s*(APS|APD)/i.test(L) ||
          /^PROJET\s+\d+/i.test(L) ||
          // 20/06/2026 : a la signature, l'APD validee architecte est renommee
          // "APD VERSION N (DOSSIER SIGNE)" (cf buildArchitecteValidated dans
          // useDossierStore). Ce label ne matchait aucune regex -> projet jamais
          // detecte cote stats. On l'ajoute pour que les devis architecte remontent.
          /^APD\s+VERSION\s+\d+/i.test(L) ||
          ARCHITECTE_PROJET_VERSION_REGEX.test(L) ||
          CUISINISTE_OPTION_REGEX.test(L) ||
          MENUISIER_PROJET_REGEX.test(L)
        );
      })
      .map((sf) => ({
        label: sf.label,
        docs: (sf.documents ?? []).map((d: SubFolderDocument) =>
          typeof d === 'string' ? ({ name: d } as DocumentFile) : d,
        ),
      }))
      .filter((g) => g.docs.length > 0);
  }, [selected]);

  // ── NOUVEAU 27/05/2026 : sous-dossiers CONFIRMATIONS / FACTURES ACHATS ──
  const confirmationsSubfolders = useMemo<Array<{ label: string; docs: DocumentFile[] }>>(() => {
    const subfolders = selected?.signedSubfolders ?? [];
    return subfolders
      .filter((sf) =>
        /CONFIRMATION/i.test(sf.label) ||
        /FACTURE.*ACHAT/i.test(sf.label) ||
        /FACTURES.*ACHATS/i.test(sf.label),
      )
      .map((sf) => ({
        label: sf.label,
        docs: (sf.documents ?? []).map((d: SubFolderDocument) =>
          typeof d === 'string' ? ({ name: d } as DocumentFile) : d,
        ),
      }))
      .filter((g) => g.docs.length > 0);
  }, [selected]);

  // Helper : ouvrir un doc dans un nouvel onglet (URL signee fraiche)
  const handleOpenDoc = async (doc: DocumentFile) => {
    if (doc.dataUrl) {
      window.open(doc.dataUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!doc.docId || !selected) return;
    try {
      const { signedUrl } = await getDocSignedUrl(selected.id, doc.docId);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('[StatsGate] preview failed:', err);
    }
  };

  const selectedLignes = selected?.prixLignes ?? [];
  const totalAchat = selectedLignes.reduce((s, l) => s + l.prixAchatHT, 0);
  const totalVente = selectedLignes.reduce((s, l) => s + l.prixVenteHT, 0);
  const marge = totalVente - totalAchat;
  const margePct = totalVente > 0 ? Math.round((marge / totalVente) * 100) : 0;

  const handleExtractAI = useCallback(async () => {
    if (!selected || aiExtracting) return;
    setAiExtracting(true);
    setAiError(null);
    try {
      const result = await extractDossier(selected.id);
      // Dedup par (fournisseur, produit) : on ne re-crée pas une ligne déjà
      // présente, même si l'utilisateur a complété ses prix entre-temps. Évite
      // les doublons en cas de ré-extraction (clic multiple ou ajout de doc).
      const key = (l: { fournisseur: string; produit?: string }) =>
        `${l.fournisseur}::${(l.produit ?? '').trim().toLowerCase()}`;
      const existing = new Set(selectedLignes.map(key));
      const toImport = (result.commandes ?? [])
        .map((c) => {
          // Séparation stricte : l'extraction (devis OPTION/PROJET/APD) ne remplit
          // QUE le prix de VENTE. Le prix d'achat vient uniquement des
          // confirmations fournisseurs (bouton « Importer N confirmations »).
          const vente = typeof c.montantVenteHT === 'number' && c.montantVenteHT > 0
            ? c.montantVenteHT
            : (typeof c.montantHT === 'number' && c.montantHT > 0 ? c.montantHT : 0);
          return {
            fournisseur: c.fournisseur,
            produit: c.produit ?? undefined,
            prixAchatHT: 0,
            prixVenteHT: vente,
          };
        })
        .filter((l) => l.fournisseur && l.prixVenteHT > 0)
        .filter((l) => !existing.has(key(l)));
      if (toImport.length === 0) {
        setToast({ message: 'IA : aucune nouvelle ligne à extraire (déjà importé ou pas de montants détectés)', tone: 'info' });
      } else {
        onAddLignesBulk(selected.id, toImport);
        const conf = Math.round((result.confiance ?? 0) * 100);
        setToast({
          message: `🪄 IA : ${toImport.length} ligne${toImport.length > 1 ? 's' : ''} créée${toImport.length > 1 ? 's' : ''} (confiance ${conf}%) — l'achat vient des confirmations fournisseurs`,
          tone: 'ok',
        });
      }
    } catch (err: any) {
      const msg = (err?.message ?? '').toString();
      let userMsg = "Échec extraction IA — vérifiez OPENAI_API_KEY ou saisissez manuellement";
      if (msg.toLowerCase().includes('openai')) {
        userMsg = "Service IA non configuré (OPENAI_API_KEY manquant). Saisissez manuellement.";
      } else if (msg.toLowerCase().includes('aucun document')) {
        userMsg = "Aucun document analysable dans ce dossier (PDF requis).";
      } else if (msg.toLowerCase().includes('throttl') || msg.toLowerCase().includes('limit')) {
        userMsg = "Trop d'appels IA — patientez 1 minute avant de réessayer.";
      } else if (msg) {
        userMsg = `Échec extraction IA : ${msg}`;
      }
      setAiError(userMsg);
    } finally {
      setAiExtracting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, aiExtracting, selectedLignes, onAddLignesBulk]);

  // Auto-clear erreur IA apres 8s
  useEffect(() => {
    if (!aiError) return;
    const t = setTimeout(() => setAiError(null), 8000);
    return () => clearTimeout(t);
  }, [aiError]);

  // ── [D] Marge live calculée sur le brouillon en cours ───────────────────
  const liveAchat = parseFloat(draft.achat.replace(',', '.'));
  const liveVente = parseFloat(draft.vente.replace(',', '.'));
  const liveMarge = (Number.isFinite(liveAchat) && Number.isFinite(liveVente))
    ? liveVente - liveAchat
    : null;
  const liveMargePct = (liveMarge !== null && liveVente > 0)
    ? Math.round((liveMarge / liveVente) * 100)
    : null;

  // ── Validation du draft ─────────────────────────────────────────────────
  const draftIsValid = useMemo(() => {
    if (!draft.fournisseur.trim()) return false;
    if (!Number.isFinite(liveAchat) || liveAchat < 0) return false;
    // P3 (28/05/2026) : la vente est OPTIONNELLE — on peut saisir une ligne
    // d'achat seule (devis fournisseur) et completer le prix de vente plus tard
    // (badge "Vente a saisir"). On ne bloque que si une vente NEGATIVE est tapee.
    if (draft.vente.trim() && (!Number.isFinite(liveVente) || liveVente < 0)) return false;
    return true;
  }, [draft, liveAchat, liveVente]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const focusFournisseur = useCallback(() => {
    setTimeout(() => fournisseurInputRef.current?.focus(), 0);
  }, []);

  const goToNextDossier = useCallback(() => {
    if (!selected) return;
    const idx = missingDossiers.findIndex((d) => d.id === selected.id);
    const next = missingDossiers[idx + 1] ?? missingDossiers[0];
    if (next && next.id !== selected.id) setSelectedId(next.id);
  }, [selected, missingDossiers]);

  const handleAddLigne = useCallback((opts?: { goNext?: boolean }) => {
    if (!selected || !draftIsValid) return;
    onAddLigne(selected.id, {
      fournisseur: draft.fournisseur.trim(),
      prixAchatHT: liveAchat,
      // Vente vide → 0 (a completer plus tard). Cf. P3.
      prixVenteHT: Number.isFinite(liveVente) ? liveVente : 0,
    });
    setDraft(EMPTY_DRAFT);
    writeDraft(selected.id, EMPTY_DRAFT);
    setToast({ message: '✓ Ligne ajoutée', tone: 'ok' });
    if (opts?.goNext) goToNextDossier();
    else focusFournisseur();
  }, [selected, draftIsValid, draft, liveAchat, liveVente, onAddLigne, goToNextDossier, focusFournisseur]);

  // ── [A] Auto-import depuis confirmations ────────────────────────────────
  const handleAutoImport = useCallback(() => {
    if (!selected) return;
    // Exclut les confirmations déjà importées (même fournisseur + montant)
    const existing = new Set(
      selectedLignes.map((l) => `${l.fournisseur}::${l.prixAchatHT}`),
    );
    const toImport = confirmsValidees
      .filter((c) => c.fournisseur && typeof c.montant === 'number')
      .map((c) => ({
        fournisseur: c.fournisseur,
        prixAchatHT: c.montant ?? 0,
        prixVenteHT: 0,
      }))
      .filter((l) => !existing.has(`${l.fournisseur}::${l.prixAchatHT}`));
    if (toImport.length === 0) {
      setToast({ message: 'Toutes les confirmations sont déjà importées', tone: 'info' });
      return;
    }
    onAddLignesBulk(selected.id, toImport);
    setToast({ message: `🪄 ${toImport.length} ligne${toImport.length > 1 ? 's' : ''} importée${toImport.length > 1 ? 's' : ''} — complétez les prix vente`, tone: 'ok' });
  }, [selected, confirmsValidees, selectedLignes, onAddLignesBulk]);

  // ── [P0] Pré-remplir depuis une confirmation cliquée ────────────────────
  const handlePreFillFromConfirmation = useCallback((c: ConfirmationFournisseur) => {
    setDraft({
      fournisseur: c.fournisseur ?? '',
      achat: typeof c.montant === 'number' ? String(c.montant) : '',
      vente: '',
    });
    focusFournisseur();
  }, [focusFournisseur]);

  // ── [B] Snooze ──────────────────────────────────────────────────────────
  const handleSkip = useCallback(() => {
    if (!selected) return;
    onSkipDossier(selected.id, true);
    setToast({ message: '⏭ Dossier reporté', tone: 'info' });
  }, [selected, onSkipDossier]);

  // ── [C] Raccourcis clavier sur la zone formulaire ───────────────────────
  const handleFormKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddLigne({ goNext: e.ctrlKey || e.metaKey });
    } else if (e.key === 'Escape') {
      setDraft(EMPTY_DRAFT);
    }
  }, [handleAddLigne]);

  // ── [F] Progression : ratio lignes saisies vs confirmations attendues ──
  const getProgress = useCallback((d: DossierSigne): { ratio: number; tone: 'empty' | 'partial' | 'complete' } => {
    const lignes = d.prixLignes?.length ?? 0;
    const expected = Math.max(1, (d.confirmations ?? []).filter((c) => c.validee).length);
    const ratio = Math.min(1, lignes / expected);
    if (lignes === 0) return { ratio: 0, tone: 'empty' };
    if (ratio >= 1) return { ratio: 1, tone: 'complete' };
    return { ratio, tone: 'partial' };
  }, []);

  if (!selected) return null;

  // ── Rendu ───────────────────────────────────────────────────────────────
  const importable = confirmsValidees.filter((c) =>
    c.fournisseur && typeof c.montant === 'number' &&
    !selectedLignes.some((l) => l.fournisseur === c.fournisseur && l.prixAchatHT === c.montant)
  );

  return (
    <>
      <style>{`
        @keyframes sgFadeIn { from { opacity: 0; backdrop-filter: blur(0); } to { opacity: 1; backdrop-filter: blur(6px); } }
        @keyframes sgScaleIn { from { transform: scale(0.94) translateY(8px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        @keyframes sgGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(217,179,138,0.5); } 50% { box-shadow: 0 0 0 8px rgba(217,179,138,0); } }
        @keyframes sg-spin { to { transform: rotate(360deg); } }
        @keyframes sgToastIn { from { transform: translateY(20px) scale(0.92); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes sgSparkle { 0%,100% { transform: rotate(0deg) scale(1); } 50% { transform: rotate(8deg) scale(1.08); } }
        .sg-overlay { animation: sgFadeIn 0.32s ease-out; }
        .sg-card    { animation: sgScaleIn 0.45s cubic-bezier(0.22,1,0.36,1); }
        .sg-import-btn { animation: sgGlow 2.4s ease-in-out infinite; }
        .sg-import-btn:hover .sg-import-icon { animation: sgSparkle 0.6s ease-in-out infinite; }
        .sg-toast { animation: sgToastIn 0.28s cubic-bezier(0.22,1,0.36,1); }
        .sg-progress-ring {
          --p: 0;
          background: conic-gradient(var(--c) calc(var(--p) * 1%), rgba(48,64,53,0.08) 0);
          mask: radial-gradient(circle, transparent 7px, #000 8px);
          -webkit-mask: radial-gradient(circle, transparent 7px, #000 8px);
        }
      `}</style>

      <div
        className="sg-overlay"
        style={{
          // Fix bug visuel 26/05/2026 — sur certains navigateurs/iframes,
          // `inset: 0` laissait une bande de 24px en haut non couverte
          // (overlay reportait top: 24 dans le boundingRect malgré top: 0
          // en CSS computed). On force la taille viewport-relative pour
          // éliminer ce gap.
          position: 'fixed',
          top: 0, left: 0,
          width: '100vw', height: '100vh',
          minWidth: '100vw', minHeight: '100vh',
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: 16,
          // Permet le scroll de la card si elle dépasse (très petits écrans)
          overflowY: 'auto',
        }}
      >
        <div
          className="sg-card"
          style={{
            background: '#fff', borderRadius: 20, width: '100%', maxWidth: 1400,
            maxHeight: '94vh', display: 'flex', flexDirection: 'column',
            overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.4), 0 12px 30px rgba(48,64,53,0.22)',
          }}
        >
          {/* ─── Header alerte ─────────────────────────────────────────── */}
          <div style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fff 100%)',
            borderBottom: '1px solid rgba(48,64,53,0.08)',
            display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: '#f59e0b',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <AlertTriangle size={20} color="#fff" strokeWidth={2.5} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{
                margin: 0, fontSize: 16, fontWeight: 800, color: '#304035',
                letterSpacing: '0.02em', textTransform: 'uppercase',
              }}>
                Statistiques manquants <span style={{
                  fontWeight: 600, color: 'rgba(48,64,53,0.55)', textTransform: 'none',
                }}>(prix achat / prix vente)</span>
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(48,64,53,0.65)' }}>
                {missingDossiers.length} dossier{missingDossiers.length > 1 ? 's' : ''} à
                compléter. Astuce : utilisez <strong style={{ color: '#a67749' }}>Entrée</strong> pour
                ajouter, <strong style={{ color: '#a67749' }}>Cmd/Ctrl + Entrée</strong> pour passer au suivant.
              </p>
            </div>
            {/* Bouton X de fermeture (26/05/2026 — fix UX "je ne peux pas quitter").
                Permet de quitter le gate temporairement et naviguer ailleurs.
                L'accès aux statistiques reste verrouillé tant que des dossiers
                manquent — le user verra le placeholder verrouillé au retour. */}
            <button
              onClick={() => {
                if (window.confirm('Quitter sans compléter ?\n\nL\'accès aux statistiques restera verrouillé tant que tous les dossiers n\'ont pas leurs prix saisis ou ne sont pas reportés.')) {
                  // Navigation vers le dashboard. Pas d'API à appeler — c'est
                  // juste un escape hatch UI. La modale reste prête à se rouvrir
                  // au prochain accès /statistiques tant qu'il manque des prix.
                  if (typeof window !== 'undefined') window.location.assign('/dashboard');
                }
              }}
              style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                border: '1px solid rgba(48,64,53,0.15)',
                background: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(48,64,53,0.55)', transition: 'all 0.18s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.color = '#dc2626';
                e.currentTarget.style.borderColor = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.6)';
                e.currentTarget.style.color = 'rgba(48,64,53,0.55)';
                e.currentTarget.style.borderColor = 'rgba(48,64,53,0.15)';
              }}
              title="Quitter (l'accès aux stats reste verrouillé)"
            >
              <X size={16} />
            </button>
          </div>

          {/* ─── Body 3-col (27/05/2026) : sidebar + consultation + saisie ── */}
          <div style={{
            flex: 1, display: 'grid',
            gridTemplateColumns: 'minmax(220px, 250px) 1fr 1fr',
            minHeight: 0,
          }}>
            {/* ─── COLONNE GAUCHE : liste avec [F] progression ──────── */}
            <div style={{
              borderRight: '1px solid rgba(48,64,53,0.08)',
              background: '#fafaf8', overflowY: 'auto', padding: '14px',
            }}>
              <p style={{
                margin: '0 0 10px 4px', fontSize: 10, fontWeight: 700,
                color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                Dossiers à compléter ({missingDossiers.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {listDossiers.map((d) => {
                  const isSelected = d.id === selected.id;
                  const prog = getProgress(d);
                  const color = prog.tone === 'complete' ? '#16a34a'
                    : prog.tone === 'partial' ? '#f59e0b' : '#dc2626';
                  return (
                    <button
                      key={d.id}
                      onClick={() => setSelectedId(d.id)}
                      style={{
                        padding: '10px 12px', borderRadius: 10,
                        border: `1.5px solid ${isSelected ? '#304035' : 'rgba(48,64,53,0.1)'}`,
                        background: isSelected ? '#fff' : 'transparent',
                        cursor: 'pointer', textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: 10,
                        transition: 'all 0.15s',
                      }}
                    >
                      {/* [F] anneau de progression */}
                      <div style={{ position: 'relative', width: 24, height: 24, flexShrink: 0 }}>
                        <div
                          className="sg-progress-ring"
                          style={{
                            width: 24, height: 24, borderRadius: '50%',
                            ['--p' as any]: Math.round(prog.ratio * 100),
                            ['--c' as any]: color,
                          }}
                        />
                        <div style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <FolderOpen size={11} color={isSelected ? '#a67749' : color} />
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          margin: 0, fontSize: 12, fontWeight: 700, color: '#304035',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {d.name}{d.firstName ? ` ${d.firstName}` : ''}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 10, color, fontWeight: 600 }}>
                          {(d.prixLignes?.length ?? 0)} ligne{(d.prixLignes?.length ?? 0) > 1 ? 's' : ''}
                          {prog.tone === 'partial' && ` / ~${(d.confirmations ?? []).filter((c) => c.validee).length}`}
                        </p>
                      </div>
                      {isSelected && <ChevronRight size={14} color="#304035" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ─── COLONNE MILIEU : CONSULTATION (options + confirmations) ── */}
            <div style={{ overflowY: 'auto', padding: '18px 22px', borderRight: '1px solid rgba(48,64,53,0.08)' }}>
              {/* Titre dossier + actions [P2] [B] */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                gap: 8, marginBottom: 14, flexWrap: 'wrap',
              }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#304035' }}>
                  {selected.name}{selected.firstName ? ` ${selected.firstName}` : ''}
                </h3>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => window.open(`/dossiers/${selected.id}`, '_blank', 'noopener,noreferrer')}
                    style={{
                      padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                      border: '1px solid rgba(48,64,53,0.18)', background: '#fff', color: '#304035',
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}
                    title="Ouvre la fiche dossier signé dans un nouvel onglet"
                  >
                    <ExternalLink size={10} /> Ouvrir
                  </button>
                  <button
                    onClick={handleSkip}
                    style={{
                      padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                      border: '1px solid rgba(120,80,180,0.3)', background: 'rgba(120,80,180,0.06)',
                      color: '#7850b4', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}
                    title="Reporte ce dossier — vous pourrez le compléter plus tard"
                  >
                    <Clock size={10} /> Reporter
                  </button>
                </div>
              </div>

              {/* Sections empilées : OPTIONS VALIDÉES puis CONFIRMATIONS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* OPTIONS VALIDÉES (ex 'Devis validés') [P3] */}
                <div style={{
                  padding: '12px 14px', background: 'rgba(166,119,73,0.06)',
                  border: '1px solid rgba(166,119,73,0.2)', borderRadius: 12,
                }}>
                  <p style={{
                    margin: '0 0 8px', fontSize: 10, fontWeight: 800, color: '#a67749',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <FileText size={11} /> Options validées <span style={{ fontWeight: 600, opacity: 0.7 }}>(devis · prix vente)</span>
                  </p>
                  {/* 1) Devis du store Facturation (statut ACCEPTÉ) */}
                  {devisValides.length > 0 && (
                    <ul style={{
                      listStyle: 'none', padding: 0, margin: '0 0 8px',
                      display: 'flex', flexDirection: 'column', gap: 4,
                    }}>
                      {devisValides.map((dv) => (
                        <li key={dv.id}>
                          <button
                            onClick={() => router.push(`/facturation?devis=${encodeURIComponent(dv.ref)}`)}
                            style={{
                              width: '100%', padding: '4px 6px', borderRadius: 6,
                              border: 'none', background: 'transparent', cursor: 'pointer',
                              fontSize: 11, color: '#304035', textAlign: 'left',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(166,119,73,0.1)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            title="Ouvrir le devis dans Facturation"
                          >
                            <span style={{ textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                              Devis n°{dv.ref}
                            </span>
                            <span style={{ fontWeight: 700, flexShrink: 0 }}>{fmt(dv.totalHT)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* 2) NOUVEAU 27/05/2026 : documents des sous-dossiers OPTION/PROJET/APD */}
                  {optionsValideesSubfolders.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {optionsValideesSubfolders.map((g) => (
                        <div key={g.label}>
                          <p style={{
                            margin: '0 0 4px', fontSize: 9, fontWeight: 800,
                            color: '#7c4f1d', textTransform: 'uppercase',
                            letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                            <FolderOpen size={9} /> {g.label} <span style={{ opacity: 0.6, fontWeight: 600 }}>({g.docs.length})</span>
                          </p>
                          <ul style={{
                            listStyle: 'none', padding: 0, margin: 0,
                            display: 'flex', flexDirection: 'column', gap: 2,
                          }}>
                            {g.docs.map((doc, di) => (
                              <li key={doc.docId ?? `${g.label}-${doc.name}-${di}`}>
                                <button
                                  onClick={() => handleOpenDoc(doc)}
                                  style={{
                                    width: '100%', padding: '3px 6px', borderRadius: 5,
                                    border: 'none', background: 'transparent', cursor: 'pointer',
                                    fontSize: 11, color: '#304035', textAlign: 'left',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    transition: 'background 0.15s',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(166,119,73,0.1)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                  title={`Ouvrir ${doc.name} dans un nouvel onglet`}
                                >
                                  <FileText size={10} color="#a67749" style={{ flexShrink: 0 }} />
                                  <span style={{
                                    overflow: 'hidden', textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap', flex: 1,
                                    textDecoration: 'underline', textDecorationStyle: 'dotted',
                                  }}>{doc.name}</span>
                                  <ExternalLink size={9} color="rgba(48,64,53,0.4)" style={{ flexShrink: 0 }} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Empty state combiné */}
                  {devisValides.length === 0 && optionsValideesSubfolders.length === 0 && (
                    <p style={{
                      margin: 0, fontSize: 11, color: 'rgba(48,64,53,0.5)', fontStyle: 'italic',
                    }}>
                      Aucune option validée — ajoutez des documents dans les sous-dossiers OPTION/PROJET/APD du dossier signé pour les retrouver ici.
                    </p>
                  )}
                </div>

                {/* CONFIRMATIONS VALIDÉES [P0] */}
                <div style={{
                  padding: '12px 14px', background: 'rgba(16,185,129,0.06)',
                  border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12,
                }}>
                  <p style={{
                    margin: '0 0 8px', fontSize: 10, fontWeight: 800, color: '#059669',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <Package size={11} /> Confirmations validées <span style={{ fontWeight: 600, opacity: 0.7 }}>(prix achat)</span>
                  </p>
                  {confirmsValidees.length === 0 ? (
                    <p style={{
                      margin: 0, fontSize: 11, color: 'rgba(48,64,53,0.5)', fontStyle: 'italic',
                    }}>Aucune confirmation validée.</p>
                  ) : (
                    <ul style={{
                      listStyle: 'none', padding: 0, margin: 0,
                      display: 'flex', flexDirection: 'column', gap: 4,
                    }}>
                      {confirmsValidees.map((c) => (
                        <li key={c.id}>
                          <button
                            onClick={() => handlePreFillFromConfirmation(c)}
                            style={{
                              width: '100%', padding: '4px 6px', borderRadius: 6,
                              border: 'none', background: 'transparent', cursor: 'pointer',
                              fontSize: 11, color: '#304035', textAlign: 'left',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6,
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16,185,129,0.12)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            title="Cliquer pour pré-remplir le formulaire"
                          >
                            <span style={{
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                              <Plus size={9} color="#059669" />
                              {c.fournisseur}
                            </span>
                            <span style={{ fontWeight: 700, flexShrink: 0 }}>{c.montant ? fmt(c.montant) : '—'}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* ─── COLONNE DROITE : SAISIE PRIX ──────────────────────────── */}
            <div style={{ overflowY: 'auto', padding: '18px 22px' }}>
              <p style={{
                margin: '0 0 12px', fontSize: 10, fontWeight: 800,
                color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                Saisie des prix
              </p>

              {/* [IA] Bouton d'extraction IA (27/05/2026) — analyse les PDF
                  du devis (OPTION/PROJET/APD) et cree les lignes prix de vente
                  automatiquement. Reutilise l'endpoint /ia/extract-dossier
                  deja utilise par DateButoireValidationModal. */}
              <button
                onClick={handleExtractAI}
                disabled={aiExtracting}
                className="sg-import-btn"
                style={{
                  width: '100%', marginBottom: 10, padding: '11px 14px',
                  borderRadius: 12, border: '1.5px solid #6366f1',
                  background: aiExtracting
                    ? 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)'
                    : 'linear-gradient(135deg, #eef2ff 0%, #c7d2fe 100%)',
                  color: '#4338ca', fontWeight: 700, fontSize: 12,
                  cursor: aiExtracting ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 6, textAlign: 'center',
                  opacity: aiExtracting ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                }}
                title="L'IA lit le devis (OPTION/PROJET/APD) et crée les lignes de prix de vente. Le prix d'achat vient des confirmations fournisseurs."
              >
                {aiExtracting ? (
                  <>
                    <span className="sg-spinner" style={{
                      width: 14, height: 14, borderRadius: '50%',
                      border: '2px solid rgba(99,102,241,0.3)',
                      borderTopColor: '#4338ca',
                      animation: 'sg-spin 0.7s linear infinite',
                    }} />
                    Analyse IA des documents…
                  </>
                ) : (
                  <>
                    <Wand2 size={14} />
                    🪄 Extraire le prix de vente (devis)
                    <Sparkles size={11} />
                  </>
                )}
              </button>
              {aiError && (
                <div style={{
                  marginBottom: 10, padding: '8px 12px', borderRadius: 8,
                  background: 'rgba(220,38,38,0.08)',
                  border: '1px solid rgba(220,38,38,0.25)',
                  color: '#991b1b', fontSize: 11, lineHeight: 1.4,
                  display: 'flex', alignItems: 'flex-start', gap: 6,
                }}>
                  <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{aiError}</span>
                </div>
              )}

              {/* [A] Bouton d'auto-import (deplace dans col saisie) */}
              {importable.length > 0 && (
                <button
                  onClick={handleAutoImport}
                  className="sg-import-btn"
                  style={{
                    width: '100%', marginBottom: 14, padding: '11px 14px',
                    borderRadius: 12, border: '1.5px solid #a67749',
                    background: 'linear-gradient(135deg, #fff8ef 0%, #ffe7c2 100%)',
                    color: '#7c4f1d', fontWeight: 700, fontSize: 12,
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 6, textAlign: 'center',
                  }}
                >
                  <Wand2 className="sg-import-icon" size={14} />
                  Importer {importable.length} confirmation{importable.length > 1 ? 's' : ''}
                  <Sparkles size={11} />
                </button>
              )}

              {/* Lignes déjà saisies + récap marge */}
              {selectedLignes.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <p style={{
                    margin: '0 0 8px', fontSize: 10, fontWeight: 700,
                    color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}>
                    Lignes saisies ({selectedLignes.length})
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedLignes.map((l) => {
                      const m = l.prixVenteHT - l.prixAchatHT;
                      const mPct = l.prixVenteHT > 0 ? Math.round((m / l.prixVenteHT) * 100) : 0;
                      const needsVente = l.prixVenteHT === 0;
                      return (
                        <div
                          key={l.id}
                          style={{
                            display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1.1fr auto',
                            gap: 10, alignItems: 'center', padding: '8px 12px',
                            background: needsVente ? 'rgba(245,158,11,0.06)' : '#fff',
                            border: `1px solid ${needsVente ? 'rgba(245,158,11,0.3)' : 'rgba(48,64,53,0.08)'}`,
                            borderRadius: 10, fontSize: 12,
                          }}
                        >
                          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontWeight: 700, color: '#304035', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.produit || l.fournisseur}</span>
                            {l.produit && <span style={{ fontSize: 10, color: 'rgba(48,64,53,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.fournisseur}</span>}
                          </span>
                          <span style={{ color: '#dc2626' }}>Achat {fmt(l.prixAchatHT)}</span>
                          <span style={{ color: needsVente ? '#f59e0b' : '#16a34a', fontWeight: needsVente ? 700 : 400 }}>
                            {needsVente ? '⚠ Vente à saisir' : `Vente ${fmt(l.prixVenteHT)}`}
                          </span>
                          <span style={{ fontWeight: 700, color: m >= 0 ? '#16a34a' : '#dc2626' }}>
                            {needsVente ? '—' : `Marge ${fmt(m)} (${mPct}%)`}
                          </span>
                          <button
                            onClick={() => onRemoveLigne(selected.id, l.id)}
                            style={{
                              padding: 4, borderRadius: 6, border: 'none',
                              background: 'transparent', cursor: 'pointer', color: 'rgba(48,64,53,0.4)',
                            }}
                            title="Retirer cette ligne"
                            aria-label="Retirer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                    {/* Totaux */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1.1fr auto',
                      gap: 10, padding: '8px 12px',
                      background: 'rgba(48,64,53,0.04)', borderRadius: 10,
                      fontSize: 12, fontWeight: 800,
                    }}>
                      <span style={{ color: '#304035' }}>TOTAL</span>
                      <span style={{ color: '#dc2626' }}>{fmt(totalAchat)}</span>
                      <span style={{ color: '#16a34a' }}>{fmt(totalVente)}</span>
                      <span style={{ color: marge >= 0 ? '#16a34a' : '#dc2626' }}>
                        {fmt(marge)} ({margePct}%)
                      </span>
                      <span />
                    </div>
                  </div>
                </div>
              )}

              {/* [P1] Formulaire ajout nouvelle ligne — multi-ligne évidente + [C] raccourcis + [D] marge live */}
              <div
                onKeyDown={handleFormKeyDown}
                style={{
                  padding: 14, border: '1.5px dashed rgba(166,119,73,0.4)',
                  borderRadius: 12, background: 'rgba(166,119,73,0.04)',
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 10, gap: 8, flexWrap: 'wrap',
                }}>
                  <p style={{
                    margin: 0, fontSize: 11, fontWeight: 700, color: '#a67749',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <Plus size={13} />
                    Ajouter une ligne fournisseur
                    <span style={{
                      marginLeft: 6, padding: '2px 8px', borderRadius: 999,
                      background: '#a67749', color: '#fff', fontSize: 9, letterSpacing: 0,
                    }}>
                      Ligne {selectedLignes.length + 1}
                    </span>
                  </p>
                  <p style={{
                    margin: 0, fontSize: 10, color: 'rgba(48,64,53,0.5)',
                    fontStyle: 'italic',
                  }}>
                    Ajoutez autant de lignes que de fournisseurs/produits.
                  </p>
                </div>

                {/* Formulaire VERTICAL (27/05/2026) : inputs empilés pour éviter
                    le tassement dans une colonne étroite. */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{
                      display: 'block', fontSize: 9, fontWeight: 700,
                      color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase',
                      letterSpacing: '0.06em', marginBottom: 4,
                    }}>
                      Marque / fournisseur
                    </label>
                    <input
                      ref={fournisseurInputRef}
                      type="text"
                      value={draft.fournisseur}
                      onChange={(e) => setDraft((d) => ({ ...d, fournisseur: e.target.value }))}
                      placeholder="ex: LEICHT, MARBRIER…"
                      maxLength={50}
                      style={{
                        width: '100%', padding: '9px 12px',
                        border: '1px solid rgba(48,64,53,0.15)', borderRadius: 8,
                        fontSize: 13, color: '#304035', background: '#fff', outline: 'none',
                      }}
                    />
                  </div>
                  {/* Achat + Vente côte à côte (2 col) pour gain de place vertical */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{
                        display: 'block', fontSize: 9, fontWeight: 700,
                        color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase',
                        letterSpacing: '0.06em', marginBottom: 4,
                      }}>
                        Prix achat HT
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          value={draft.achat}
                          onChange={(e) => setDraft((d) => ({ ...d, achat: e.target.value }))}
                          placeholder="0"
                          min={0}
                          step="0.01"
                          style={{
                            width: '100%', padding: '9px 28px 9px 12px',
                            border: '1px solid rgba(48,64,53,0.15)', borderRadius: 8,
                            fontSize: 13, color: '#304035', background: '#fff', outline: 'none',
                          }}
                        />
                        <Euro size={12} style={{
                          position: 'absolute', right: 10, top: '50%',
                          transform: 'translateY(-50%)', color: 'rgba(48,64,53,0.35)',
                        }} />
                      </div>
                    </div>
                    <div>
                      <label style={{
                        display: 'block', fontSize: 9, fontWeight: 700,
                        color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase',
                        letterSpacing: '0.06em', marginBottom: 4,
                      }}>
                        Prix vente HT
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          ref={venteInputRef}
                          type="number"
                          value={draft.vente}
                          onChange={(e) => setDraft((d) => ({ ...d, vente: e.target.value }))}
                          placeholder="0"
                          min={0}
                          step="0.01"
                          style={{
                            width: '100%', padding: '9px 28px 9px 12px',
                            border: '1px solid rgba(48,64,53,0.15)', borderRadius: 8,
                            fontSize: 13, color: '#304035', background: '#fff', outline: 'none',
                          }}
                        />
                        <Euro size={12} style={{
                          position: 'absolute', right: 10, top: '50%',
                          transform: 'translateY(-50%)', color: 'rgba(48,64,53,0.35)',
                        }} />
                      </div>
                    </div>
                  </div>
                  {/* Bouton AJOUTER pleine largeur en bas */}
                  <button
                    onClick={() => handleAddLigne()}
                    disabled={!draftIsValid}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 8, border: 'none',
                      background: !draftIsValid
                        ? 'rgba(166,119,73,0.3)'
                        : 'linear-gradient(135deg, #a67749, #d4b882)',
                      fontSize: 13, fontWeight: 800, color: '#fff',
                      cursor: !draftIsValid ? 'not-allowed' : 'pointer',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      letterSpacing: '0.02em',
                      transition: 'transform 0.12s',
                    }}
                    onMouseEnter={(e) => {
                      if (draftIsValid) e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <Plus size={14} /> Ajouter la ligne
                  </button>
                </div>

                {/* [D] Marge live calculée pendant la saisie */}
                {liveMarge !== null && (Number.isFinite(liveAchat) || Number.isFinite(liveVente)) && (
                  <div style={{
                    marginTop: 10, padding: '8px 12px', borderRadius: 8,
                    background: liveMarge < 0 ? 'rgba(220,38,38,0.08)'
                      : liveMarge === 0 ? 'rgba(48,64,53,0.04)'
                      : 'rgba(16,185,129,0.08)',
                    border: `1px solid ${liveMarge < 0 ? 'rgba(220,38,38,0.2)' : 'rgba(16,185,129,0.2)'}`,
                    fontSize: 12, display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ color: 'rgba(48,64,53,0.6)', fontSize: 11 }}>
                      Marge prévisionnelle de la ligne
                    </span>
                    <span style={{
                      fontWeight: 800,
                      color: liveMarge < 0 ? '#dc2626' : liveMarge === 0 ? 'rgba(48,64,53,0.5)' : '#16a34a',
                    }}>
                      {liveMarge < 0 && '⚠ '}
                      {fmt(liveMarge)} {liveMargePct !== null && `(${liveMargePct}%)`}
                      {liveMarge < 0 && ' — vente < achat'}
                    </span>
                  </div>
                )}
              </div>

              {/* Statut du dossier — completed si ≥1 ligne avec vente > 0 */}
              {selectedLignes.length > 0 && selectedLignes.every((l) => l.prixVenteHT > 0) && (
                <div style={{
                  marginTop: 14, padding: '10px 14px',
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={15} color="#16a34a" />
                    <p style={{ margin: 0, fontSize: 12, color: '#15803d', fontWeight: 600 }}>
                      Dossier complété — passez au suivant ou ajoutez d'autres lignes.
                    </p>
                  </div>
                  <button
                    onClick={goToNextDossier}
                    style={{
                      padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                      border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer',
                    }}
                  >
                    Suivant →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ─── Footer ─────────────────────────────────────────────── */}
          <div style={{
            padding: '12px 22px', borderTop: '1px solid rgba(48,64,53,0.08)',
            background: '#fafaf8', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center',
            fontSize: 11, color: 'rgba(48,64,53,0.6)', flexShrink: 0,
          }}>
            <span>
              <strong style={{ color: '#92400e' }}>Modale obligatoire</strong> — accès aux
              stats verrouillé tant que tous les dossiers n'ont pas leurs prix
              (ou ne sont pas reportés via ⏭).
            </span>
            <span style={{ fontWeight: 700, color: '#304035' }}>
              {missingDossiers.length} restant{missingDossiers.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* ─── Toast notification ────────────────────────────────────── */}
        {toast && (
          <div
            className="sg-toast"
            style={{
              position: 'fixed', bottom: 32, right: 32, zIndex: 80,
              padding: '12px 18px', borderRadius: 12,
              background: toast.tone === 'ok'
                ? 'linear-gradient(135deg, #16a34a, #22c55e)'
                : 'linear-gradient(135deg, #304035, #4a6552)',
              color: '#fff', fontSize: 13, fontWeight: 700,
              boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {toast.message}
          </div>
        )}
      </div>
    </>
  );
}
