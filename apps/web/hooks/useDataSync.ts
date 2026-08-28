'use client';

/**
 * useDataSync — synchronise les stores Zustand avec les données réelles de Supabase via l'API NestJS.
 *
 * Stratégie :
 * - À chaque montage de l'app (après hydration Zustand), on charge les données depuis l'API
 * - On détecte si le store contient des données demo (ids commençant par d1, s1, etc.)
 * - Si oui, on remplace par les données réelles
 * - Si l'API échoue (offline, pas de token), on garde les données locales
 */

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import {
  useDossierStore,
  getDefaultSubfoldersForProfession,
  buildSignedSubfoldersForProfession,
  mapTradeTypeToProfession,
  type Dossier as DossierType,
  type DossierProfession,
} from '@/store/useDossierStore';
import { usePlanningStore } from '@/store/usePlanningStore';
import { useFacturationStore } from '@/store/useFacturationStore';
import { useIntervenantStore } from '@/store/useIntervenantStore';
import { useStockStore } from '@/store/useStockStore';
import { stockItemFromApi } from '@/lib/stock-api';
import { useConfigStore } from '@/store/useConfigStore';
import { getSettings } from '@/lib/settings-api';
import { useAuthStore, clearAllAppStoresHard } from '@/store/useAuthStore';
import { createQuote, devisToPayload, quoteToDevis } from '@/lib/quotes-api';
import { createInvoice, invoiceDetailToPayload, invoiceApiToDetail, invoiceApiToBase } from '@/lib/invoices-api';

// IDs fictifs de démonstration (hardcodés dans les stores initiaux)
const DEMO_DOSSIER_IDS = new Set(['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9']);
const DEMO_SIGNED_IDS = new Set(['s1', 's2', 's3', 's4']);
const DEMO_PERDU_IDS = new Set(['p1', 'p2', 'p3']);
const DEMO_EVENT_IDS = new Set(['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8']);
const DEMO_GEST_IDS = new Set(['g1', 'g2', 'g3', 'g4', 'g5']);
const DEMO_INTERVENANT_IDS = new Set(['i1', 'i2', 'i3', 'i4', 'i5', 'i6']);

// Mappings des statuts Prisma → statuts frontend
function mapLifecycleToStatus(lifecycle: string): 'URGENT' | 'EN COURS' | 'FINITION' | 'A VALIDER' {
  switch (lifecycle) {
    case 'DRAFT': return 'A VALIDER';
    case 'VENTE': return 'EN COURS';
    case 'EN_CHANTIER': return 'FINITION';
    default: return 'EN COURS';
  }
}

function mapPriorityToStatus(priority: string, lifecycle: string): 'URGENT' | 'EN COURS' | 'FINITION' | 'A VALIDER' {
  if (priority === 'URGENT') return 'URGENT';
  return mapLifecycleToStatus(lifecycle);
}

// Mapping statuts paiements Prisma → frontend
function mapPaymentType(type: string): 'Facture' | "Facture d'acompte" | 'Avoir' {
  switch (type) {
    case 'ACOMPTE': return "Facture d'acompte";
    case 'AVOIR': return 'Avoir';
    default: return 'Facture';
  }
}

// Restauration fidèle d'un event serveur -> créneau planning (semaine + champs
// riches stockés en JSON dans description). Remplace l'ancien mapEventType (à perte).
function _wkMon(d: Date): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function restoreEvent(event: any) {
  const start = new Date(event.startAt);
  const day = start.getDay() === 0 ? 7 : start.getDay();
  const startHour = start.getHours();
  const startMinute = start.getMinutes();
  const weekOffset = Math.round((_wkMon(start).getTime() - _wkMon(new Date()).getTime()) / (7 * 86400000));
  const endDate = new Date(event.endAt || event.startAt);
  const durationMinutes = Math.max(15, Math.round((endDate.getTime() - start.getTime()) / 60000));
  let extra: any = {};
  try { if (event.description) extra = JSON.parse(event.description); } catch { /* description libre non-JSON */ }
  return { day, startHour, startMinute, weekOffset, durationMinutes, extra };
}

export function useDataSync() {
  const [synced, setSynced] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncedRef = useRef(false);

  const user = useAuthStore((s) => s.user);
  const profession = useAuthStore((s) => s.profession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  useEffect(() => {
    // Ne synchroniser qu'une fois par session, après hydration Zustand
    if (!hasHydrated) return;
    if (syncedRef.current) return;
    if (!isAuthenticated()) return;
    // Pas de sync en mode demo
    if (user?.id === 'demo') return;

    syncedRef.current = true;
    setSyncing(true);

    // Détection multi-utilisateur : si l'utilisateur connecté est différent
    // du dernier connu sur ce navigateur, on purge l'ensemble des stores
    // métier pour éviter les fuites de données entre comptes.
    // Un flag `avra-reset-in-progress` empêche toute boucle de reload même
    // si l'écriture du nouveau userId échoue avant le reload.
    if (typeof localStorage !== 'undefined' && typeof user?.id === 'string' && user.id.length > 0) {
      const resetInProgress = localStorage.getItem('avra-reset-in-progress') === 'true';
      if (resetInProgress) {
        // On vient d'effectuer un reset, on consomme le flag et on continue.
        localStorage.removeItem('avra-reset-in-progress');
        localStorage.setItem('avra-last-user-id', user.id);
      } else {
        const lastUserId = localStorage.getItem('avra-last-user-id');
        if (lastUserId && lastUserId !== user.id) {
          clearAllAppStoresHard();
          localStorage.setItem('avra-last-user-id', user.id);
          localStorage.setItem('avra-reset-in-progress', 'true');
          if (typeof window !== 'undefined') window.location.reload();
          return;
        }
        localStorage.setItem('avra-last-user-id', user.id);
      }
    }

    // Perf : sync séquentielle — la Serverless Function NestJS est mono-instance
    // et 4 requêtes parallèles au cold-start saturent le process et provoquent des 500.
    // Deux vagues de 2 requêtes = meilleur compromis latence/stabilité.
    (async () => {
      try {
        await Promise.allSettled([syncProjects(), syncIntervenants()]);
        await Promise.allSettled([syncEvents(), syncPayments()]);
        await Promise.allSettled([syncQuotes(), syncInvoices()]);
        await Promise.allSettled([syncStock(), syncSettings()]);
      } finally {
        setSynced(true);
        setSyncing(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, user?.id]);

  async function syncProjects() {
    try {
      const response = await api<any>('/projects?pageSize=100');
      // API retourne { data, total, page, pageSize } ou directement un tableau
      const data: any[] = Array.isArray(response) ? response : (response?.data ?? []);

      // Vérifier si le store contient des données démo AVANT le check de longueur
      const store = useDossierStore.getState();
      const currentIds = new Set(store.dossiers.map((d) => d.id));
      const hasDemoData = [...currentIds].some((id) => DEMO_DOSSIER_IDS.has(id));
      const currentSignedIds = new Set(store.dossiersSignes.map((d) => d.id));
      const hasDemoSigned = [...currentSignedIds].some((id) => DEMO_SIGNED_IDS.has(id));
      const currentPerduIds = new Set(store.dossiersPerdus.map((d) => d.id));
      const hasDemoPerdu = [...currentPerduIds].some((id) => DEMO_PERDU_IDS.has(id));

      // Backend = source de vérité : si le workspace n'a AUCUN projet, on vide
      // les stores locaux. Sinon un compte remis à zéro garderait son cache
      // localStorage et afficherait des dossiers + stats fantômes.
      if (!Array.isArray(data) || data.length === 0) {
        useDossierStore.setState({ dossiers: [], dossiersSignes: [], dossiersPerdus: [] });
        return;
      }

      // Séparer les projets par statut lifecycle
      const activeProjects = data.filter(
        (p) => !['SIGNE', 'EN_CHANTIER', 'RECEPTION', 'SAV', 'CLOTURE', 'PERDU', 'ARCHIVE'].includes(p.lifecycleStatus),
      );
      const signedProjects = data.filter((p) =>
        ['SIGNE', 'EN_CHANTIER', 'RECEPTION', 'SAV'].includes(p.lifecycleStatus),
      );
      const lostProjects = data.filter((p) => ['PERDU', 'ARCHIVE'].includes(p.lifecycleStatus));

      // Index des dossiers locaux existants par ID (pour merger les champs client-only).
      // Rappel : l'API ne retourne PAS subfolders/notes/tauxTVA/delaiChantier/address/tva.
      // On doit donc préserver ces champs s'ils sont déjà dans le store.
      const localActiveById = new Map(store.dossiers.map((d) => [d.id, d]));
      const localSignedById = new Map(store.dossiersSignes.map((d) => [d.id, d]));

      // Métier de CHAQUE dossier — P0 cloisonnement (juillet 2026) : on ne se
      // fie plus à la profession courante du compte (un compte multi-métier
      // navigue entre les 3 portails avec le même workspace) mais au
      // `tradeType` fiable du Project côté backend, fixé à sa création.
      // Fallback sur la profession courante uniquement si le projet n'a pas
      // de tradeType mappable (AGENCEUR/DECORATEUR/PROMOTEUR/AUTRE, ou
      // dossier créé avant l'introduction de tradeType) — pour ne PAS casser
      // l'affichage des comptes mono-métier existants.
      const professionFor = (p: any): DossierProfession =>
        mapTradeTypeToProfession(p?.tradeType) ?? (profession as DossierProfession) ?? null;

      // Sous-dossiers par défaut pour un dossier "frais" venu du backend sans
      // état local — dépendent du métier DU DOSSIER, pas du portail courant :
      //  - architecte : PROJET – APS / PROJET – APD
      //  - cuisiniste : OPTION
      //  - menuisier : PROJET
      // (FIX 22/07/2026 — plus de numérotation par défaut, cf. useDossierStore.ts)
      // Helper : construit la liste de sous-dossiers signés profession-aware
      // depuis un dossier source (en cours OU signé) et le métier du projet.
      // Si on n'a pas le local, un dossier "vide" sert de stand-in (la
      // fonction n'a besoin que du `.subfolders` du source pour archiver).
      const buildSignedFor = (sourceLocal: DossierType | undefined, projectProfession: DossierProfession): import('@/store/useDossierStore').SubFolder[] => {
        const sourceDossier: DossierType = sourceLocal ?? ({
          id: '',
          name: '',
          status: 'EN COURS',
          createdAt: '',
          subfolders: [],
        } as DossierType);
        return buildSignedSubfoldersForProfession(sourceDossier, projectProfession);
      };

      // Dossiers actifs — merge : champs serveur-vrai (name/firstName/phone/email/createdAt/status)
      // écrasent le local ; champs client-only (subfolders/notes/address/tva/...) préservés.
      const dossiers = activeProjects.map((p) => {
        const local = localActiveById.get(p.id) || localSignedById.get(p.id);
        const dossierProfession = professionFor(p);
        return {
          id: p.id,
          name: p.client?.lastName || p.name || 'Sans nom',
          firstName: p.client?.firstName || '',
          phone: p.client?.phone || '',
          email: p.client?.email || '',
          // Métier propriétaire du dossier — cloisonnement inter-portails (P0).
          profession: dossierProfession,
          // Champs préservés du local si dispo, sinon défaut vide
          address: local?.address ?? '',
          siteAddress: local?.siteAddress,
          postalCode: local?.postalCode,
          tva: local?.tva,
          tauxTVA: local?.tauxTVA,
          delaiChantier: local?.delaiChantier,
          delaiChantierUnit: local?.delaiChantierUnit,
          status: mapPriorityToStatus(p.priority, p.lifecycleStatus),
          createdAt: new Date(p.createdAt).toLocaleDateString('fr-FR'),
          subfolders: local?.subfolders && local.subfolders.length > 0
            ? local.subfolders
            : getDefaultSubfoldersForProfession(dossierProfession).map((sf) => ({ ...sf })),
          notes: local?.notes ?? '',
          // VAGUE 2 (28/05/2026) : ces champs sont maintenant PERSISTES en base.
          // On prefere donc la valeur API (source de verite multi-device) et on
          // retombe sur le local seulement si l'API ne l'a pas encore (dossier
          // cree avant la migration). Fini la perte de donnees au reload.
          prixLignes: (p.prixLignes ?? (local as any)?.prixLignes) ?? [],
          vendeurName: p.vendeurName ?? (local as any)?.vendeurName,
          statsSkipped: p.statsSkipped ?? (local as any)?.statsSkipped,
          dateButoires: p.dateButoires ?? (local as any)?.dateButoires,
        };
      });

      const dossiersSignes = signedProjects.map((p) => {
        const local = localSignedById.get(p.id) || localActiveById.get(p.id);
        const dossierProfession = professionFor(p);
        // FIX 30/04/2026 : on calcule la liste signée profession-aware ici.
        // Si on a deja des signedSubfolders en local (sign() recent), on les
        // garde. Sinon on construit la liste en fonction du métier DU PROJET
        // (architecte → ARCHITECTE_SIGNED_SUBFOLDERS, menuisier →
        // MENUISIER_SIGNED_SUBFOLDERS, cuisiniste → CUISINISTE).
        const localSignedSubs = (local as any)?.signedSubfolders;
        const computedSigned = (localSignedSubs && localSignedSubs.length > 0)
          ? localSignedSubs
          : buildSignedFor(local, dossierProfession);
        // La page /dossiers/[id] rend `dossier.subfolders` partout — pour
        // les dossiers signés on aligne donc subfolders sur la liste signée.
        return {
          id: p.id,
          name: p.client?.lastName || p.name || 'Sans nom',
          firstName: p.client?.firstName || '',
          phone: p.client?.phone || '',
          email: p.client?.email || '',
          // Métier propriétaire du dossier — cloisonnement inter-portails (P0).
          profession: dossierProfession,
          address: local?.address ?? '',
          siteAddress: local?.siteAddress,
          postalCode: local?.postalCode,
          tva: local?.tva,
          tauxTVA: local?.tauxTVA,
          delaiChantier: local?.delaiChantier,
          delaiChantierUnit: local?.delaiChantierUnit,
          status: mapPriorityToStatus(p.priority, p.lifecycleStatus),
          createdAt: new Date(p.createdAt).toLocaleDateString('fr-FR'),
          subfolders: computedSigned,
          notes: local?.notes ?? '',
          signedDate: p.saleSignedAt
            ? new Date(p.saleSignedAt).toLocaleDateString('fr-FR')
            : new Date(p.updatedAt).toLocaleDateString('fr-FR'),
          signedSubfolders: computedSigned,
          // VAGUE 2 (28/05/2026) : champs persistes en base — on prefere l'API,
          // fallback local pour les dossiers anterieurs a la migration.
          confirmations: (p.confirmations ?? (local as any)?.confirmations) ?? [],
          prixLignes: (p.prixLignes ?? (local as any)?.prixLignes) ?? [],
          vendeurName: p.vendeurName ?? (local as any)?.vendeurName,
          statsSkipped: p.statsSkipped ?? (local as any)?.statsSkipped,
          terminated: p.terminated ?? (local as any)?.terminated,
          terminatedDate: p.terminatedAt
            ? new Date(p.terminatedAt).toLocaleDateString('fr-FR')
            : (local as any)?.terminatedDate,
          archivedAt: p.archivedAt ?? (local as any)?.archivedAt ?? null,
          dateButoires: p.dateButoires ?? (local as any)?.dateButoires,
          montant: typeof p.saleAmount === 'number' ? p.saleAmount : (local as any)?.montant,
          montantEstime: (local as any)?.montantEstime,
        };
      });

      const dossiersPerdus = lostProjects.map((p) => ({
        id: p.id,
        name: p.client?.lastName || p.name || 'Sans nom',
        reason: p.description || 'Raison non spécifiée',
        lostDate: new Date(p.updatedAt).toLocaleDateString('fr-FR'),
        montantEstime: p.saleAmount || 0,
        // Métier propriétaire du dossier — cloisonnement inter-portails (P0).
        profession: professionFor(p),
      }));

      // Remplacer les données de démo par les données réelles
      if (hasDemoData || dossiers.length > 0) {
        const realIds = new Set(dossiers.map((d) => d.id));
        // Garder les dossiers non-démo créés localement (en attente d'un id cuid du backend)
        const localNonDemoActive = hasDemoData
          ? []
          : store.dossiers.filter((d) => !realIds.has(d.id));

        useDossierStore.setState({
          dossiers: [...dossiers, ...localNonDemoActive],
        });
      }

      if (hasDemoSigned || dossiersSignes.length > 0) {
        const realSignedIds = new Set(dossiersSignes.map((d) => d.id));
        const localNonDemoSigned = hasDemoSigned
          ? []
          : store.dossiersSignes.filter((d) => !realSignedIds.has(d.id));

        useDossierStore.setState({
          dossiersSignes: [...dossiersSignes, ...localNonDemoSigned],
        });
      }

      // VAGUE 3 (05/07/2026) — hydrate le tableau de bord (dates butoires +
      // validations « Validé » + lignes commande/confirmation/livraison) depuis
      // la colonne dossierBoard.
      //
      // FUSION, le LOCAL GAGNE par clé (fix 06/07/2026) : on ne remplace JAMAIS
      // l'état local en bloc, sinon un board serveur périmé (push pas encore
      // arrivé, ou re-sync) écraserait une validation qu'on vient de cliquer
      // dans le tableau de bord → « ça ne tient pas ». Le serveur ne fait que
      // COMBLER les clés absentes en local. On relit l'état le plus frais.
      {
        const cur = useDossierStore.getState();
        const nextDates = { ...cur.datesButoiresSignes };
        const nextValidees = { ...cur.echeancesValidees };
        const nextCommandes = { ...cur.commandesAccess };
        let touched = false;
        // Hydrate le board pour TOUS les dossiers (actifs + signés + perdus),
        // pas seulement les signés : les dossiers EN COURS ont aussi des
        // validations d'étapes (tableau de bord « dossiers en cours »).
        for (const p of data) {
          const b = (p as any).dossierBoard;
          if (!b || typeof b !== 'object') continue;
          if (b.dates && typeof b.dates === 'object') {
            nextDates[p.id] = { ...b.dates, ...(cur.datesButoiresSignes[p.id] ?? {}) }; touched = true;
          }
          if (b.validees && typeof b.validees === 'object') {
            nextValidees[p.id] = { ...b.validees, ...(cur.echeancesValidees[p.id] ?? {}) }; touched = true;
          }
          if (b.commandes && typeof b.commandes === 'object') {
            nextCommandes[p.id] = { ...b.commandes, ...(cur.commandesAccess[p.id] ?? {}) }; touched = true;
          }
        }
        if (touched) {
          useDossierStore.setState({
            datesButoiresSignes: nextDates,
            echeancesValidees: nextValidees,
            commandesAccess: nextCommandes,
          });
        }
      }

      if (hasDemoPerdu || dossiersPerdus.length > 0) {
        const realPerduIds = new Set(dossiersPerdus.map((d) => d.id));
        const localNonDemoPerdu = hasDemoPerdu
          ? []
          : store.dossiersPerdus.filter(
              (d) => !realPerduIds.has(d.id) && !DEMO_PERDU_IDS.has(d.id),
            );

        useDossierStore.setState({
          dossiersPerdus: [...dossiersPerdus, ...localNonDemoPerdu],
        });
      }
    } catch (err) {
      // Silence — garder les données locales en cas d'erreur
      console.warn('[DataSync] Projects sync failed, keeping local data:', err);
    }
  }

  async function syncStock() {
    try {
      const response = await api<any>('/stock?pageSize=200');
      const data: any[] = Array.isArray(response) ? response : (response?.data ?? []);
      // Backend vide → on vide aussi le stock local (compte remis à zéro).
      if (!Array.isArray(data) || data.length === 0) {
        useStockStore.setState({ stockItems: [] });
        return;
      }
      useStockStore.setState({ stockItems: data.map(stockItemFromApi) });
    } catch (err) {
      console.warn('[DataSync] Stock sync failed, keeping local data:', err);
    }
  }

  async function syncSettings() {
    try {
      const res = await getSettings();
      if (res?.config) useConfigStore.getState()._hydrateFromBackend(res.config as any);
    } catch (err) {
      console.warn('[DataSync] Settings sync failed, keeping local data:', err);
    }
  }

  async function syncEvents() {
    try {
      const response = await api<any>('/events');
      const data: any[] = Array.isArray(response) ? response : (response?.data ?? []);

      const store = usePlanningStore.getState();
      const currentEventIds = new Set(store.planningEvents.map((e) => e.id));
      const hasDemoEvents = [...currentEventIds].some((id) => DEMO_EVENT_IDS.has(id));
      const currentGestIds = new Set(store.gestEvents.map((e) => e.id));
      const hasDemoGest = [...currentGestIds].some((id) => DEMO_GEST_IDS.has(id));

      // Backend vide → on vide aussi le planning local (compte remis à zéro).
      if (!Array.isArray(data) || data.length === 0) {
        usePlanningStore.setState({ planningEvents: [], gestEvents: [] });
        return;
      }

      const personalEvents = data.filter((e) => e.calendarType === 'PERSONAL');
      const gestEvents = data.filter((e) => e.calendarType === 'GESTION');

      const mappedPersonal = personalEvents.map((event) => {
        const r = restoreEvent(event);
        return {
          id: event.id, day: r.day, startHour: r.startHour, startMinute: r.startMinute,
          duration: r.extra.duration ?? Math.max(1, Math.round(r.durationMinutes / 60)),
          durationMinutes: r.extra.durationMinutes ?? r.durationMinutes,
          title: r.extra.title || event.title || '',
          color: r.extra.color || (event.calendarType === 'GESTION' ? '#e8b86d' : '#5b9bd5'),
          type: r.extra.type || event.type || 'AUTRE',
          weekOffset: r.weekOffset,
        };
      });
      const mappedGest = gestEvents.map((event) => {
        const r = restoreEvent(event);
        return {
          id: event.id, day: r.day, startHour: r.startHour, startMinute: r.startMinute,
          duration: r.extra.duration ?? Math.max(1, Math.round(r.durationMinutes / 60)),
          durationMinutes: r.extra.durationMinutes ?? r.durationMinutes,
          type: r.extra.type || event.type || 'AUTRE',
          client: r.extra.client || event.title || '',
          weekOffset: r.weekOffset,
          intervenantId: r.extra.intervenantId,
          intervenantName: r.extra.intervenantName,
          intervenantType: r.extra.intervenantType,
        };
      });

      if (hasDemoEvents || mappedPersonal.length > 0) {
        usePlanningStore.setState({ planningEvents: mappedPersonal });
      }

      if (hasDemoGest || mappedGest.length > 0) {
        usePlanningStore.setState({ gestEvents: mappedGest });
      }
    } catch (err) {
      console.warn('[DataSync] Events sync failed, keeping local data:', err);
    }
  }

  async function syncPayments() {
    try {
      const response = await api<any>('/payments');
      const data: any[] = Array.isArray(response) ? response : (response?.data ?? []);

      // IMPORTANT : /payments = PaymentRequest (acomptes / encaissements), à NE PAS
      // confondre avec /invoices (factures). Avant, cette fonction écrivait à tort
      // dans `invoices` (aussitôt écrasé par syncInvoices → factures perdues) et le
      // tableau `payments` restait vide → fausses alertes « acompte non reçu ».
      // On hydrate donc désormais le bon tableau `payments`. Les factures sont gérées
      // exclusivement par syncInvoices.
      const payStatut = (s: string): 'ENCAISSÉ' | 'EN ATTENTE' | 'RETARD' =>
        s === 'PAID' ? 'ENCAISSÉ' : s === 'FAILED' ? 'RETARD' : 'EN ATTENTE';

      const payments = (Array.isArray(data) ? data : []).map((p) => ({
        id: p.id,
        dossierId: p.projectId || undefined,
        client: p.project?.client
          ? `${p.project.client.firstName || ''} ${p.project.client.lastName || ''}`.trim() || p.project.client.company || 'Client'
          : 'Client',
        type: mapPaymentType(p.type),
        amount: p.amount ? Number(p.amount) : 0,
        method: p.method || '',
        date: new Date(p.createdAt).toLocaleDateString('fr-FR'),
        statut: payStatut(p.status),
      }));

      useFacturationStore.setState({ payments });
    } catch (err) {
      console.warn('[DataSync] Payments sync failed, keeping local data:', err);
    }
  }

  async function syncQuotes() {
    try {
      const response = await api<any>('/quotes');
      const data: any[] = Array.isArray(response) ? response : (response?.data ?? []);

      // Devis purement locaux (jamais persistes : id "dev...") avec au moins une ligne.
      // Migration unique vers la base ; on garde le local si l'appel echoue.
      const localOnly = useFacturationStore.getState().devis.filter(
        (d) => typeof d.id === 'string' && d.id.startsWith('dev') && (d.lignes?.length ?? 0) > 0,
      );
      const migratedIds = new Set(localOnly.map((d) => d.id));
      const migrated: any[] = [];
      for (const d of localOnly) {
        try {
          migrated.push(await createQuote(devisToPayload(d)));
        } catch (e) {
          // garde le devis en local — il sera repousse a la prochaine edition
          migratedIds.delete(d.id);
        }
      }

      // Devis backend = source de verite. On merge : devis backend (+ migres)
      // PLUS les devis locaux non migres (drafts vides ou migration echouee).
      const backendDevis = [...data, ...migrated].map(quoteToDevis);
      const stillLocal = useFacturationStore
        .getState()
        .devis.filter((d) => d.id.startsWith('dev') && !migratedIds.has(d.id));
      useFacturationStore.setState({ devis: [...stillLocal, ...backendDevis] });
    } catch (err) {
      console.warn('[DataSync] Quotes sync failed, keeping local data:', err);
    }
  }

  async function syncInvoices() {
    try {
      const response = await api<any>('/invoices');
      const data: any[] = Array.isArray(response) ? response : (response?.data ?? []);

      const fact = useFacturationStore.getState();
      // Factures purement locales (id "inv...") avec lignes -> migration unique.
      const localDetails = Object.values(fact.invoiceDetails).filter(
        (d: any) => typeof d.id === 'string' && d.id.startsWith('inv') && (d.lignes?.length ?? 0) > 0,
      );
      const migratedIds = new Set(localDetails.map((d: any) => d.id));
      const migrated: any[] = [];
      for (const d of localDetails) {
        try {
          migrated.push(await createInvoice(invoiceDetailToPayload(d as any)));
        } catch {
          migratedIds.delete((d as any).id);
        }
      }

      // Factures backend = source de verite (+ migrees). Merge des locales non migrees.
      const all = [...data, ...migrated];
      const backendBase = all.map(invoiceApiToBase);
      const backendDetails: Record<string, any> = {};
      for (const a of all) backendDetails[a.id] = invoiceApiToDetail(a);

      const stillLocalBase = fact.invoices.filter(
        (i) => typeof i.id === 'string' && i.id.startsWith('inv') && !migratedIds.has(i.id),
      );
      const stillLocalDetails: Record<string, any> = {};
      for (const [id, d] of Object.entries(fact.invoiceDetails)) {
        if (id.startsWith('inv') && !migratedIds.has(id)) stillLocalDetails[id] = d;
      }

      useFacturationStore.setState({
        invoices: [...stillLocalBase, ...backendBase],
        invoiceDetails: { ...stillLocalDetails, ...backendDetails },
      });
    } catch (err) {
      console.warn('[DataSync] Invoices sync failed, keeping local data:', err);
    }
  }

  async function syncIntervenants() {
    try {
      const response = await api<any>('/intervenants');
      const data: any[] = Array.isArray(response) ? response : (response?.data ?? []);

      const store = useIntervenantStore.getState();
      const currentIds = new Set(store.intervenants.map((i) => i.id));
      const hasDemoData = [...currentIds].some((id) => DEMO_INTERVENANT_IDS.has(id));

      // Backend vide → on vide aussi les intervenants locaux (compte remis à zéro).
      if (!Array.isArray(data) || data.length === 0) {
        useIntervenantStore.setState({ intervenants: [] });
        return;
      }

      // Convertir en format frontend
      const intervenants = data.map((i) => ({
        id: i.id,
        type: i.type || 'AUTRE',
        name: i.companyName
          ? i.companyName
          : `${i.lastName || ''} ${i.firstName || ''}`.trim() || i.companyName || 'Sans nom',
        phone: i.phone || '',
        email: i.email || '',
        notes: i.notes || '',
        // Champs evaluation manuelle (Phase A)
        rating: i.rating ?? null,
        ratingComment: i.ratingComment ?? null,
        tagsCsv: i.tagsCsv ?? null,
        dossiers: [],
      }));

      if (hasDemoData || intervenants.length > 0) {
        useIntervenantStore.setState({ intervenants });
      }
    } catch (err) {
      console.warn('[DataSync] Intervenants sync failed, keeping local data:', err);
    }
  }

  return { synced, syncing };
}
