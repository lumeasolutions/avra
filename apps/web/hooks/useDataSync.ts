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
import { useDossierStore } from '@/store/useDossierStore';
import { usePlanningStore } from '@/store/usePlanningStore';
import { useFacturationStore } from '@/store/useFacturationStore';
import { useIntervenantStore } from '@/store/useIntervenantStore';
import { useAuthStore } from '@/store/useAuthStore';

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
function mapPaymentStatus(status: string): 'PAYÉE' | 'EN ATTENTE' | 'ACOMPTE' | 'AVOIR' | 'RETARD' {
  switch (status) {
    case 'PAID': return 'PAYÉE';
    case 'PENDING': return 'EN ATTENTE';
    case 'FAILED': return 'RETARD';
    case 'REFUNDED': return 'AVOIR';
    default: return 'EN ATTENTE';
  }
}

function mapPaymentType(type: string): 'Facture' | "Facture d'acompte" | 'Avoir' {
  switch (type) {
    case 'ACOMPTE': return "Facture d'acompte";
    case 'AVOIR': return 'Avoir';
    default: return 'Facture';
  }
}

function mapEventType(event: any) {
  // Convertit un event Prisma en PlanningEvent frontend
  const startDate = new Date(event.startAt);
  // day 0=dimanche, on veut 1=lundi ... 5=vendredi
  const dayOfWeek = startDate.getDay() === 0 ? 7 : startDate.getDay();
  const startHour = startDate.getHours();
  const endDate = new Date(event.endAt || event.startAt);
  const durationMs = endDate.getTime() - startDate.getTime();
  const duration = Math.max(1, Math.round(durationMs / (1000 * 60 * 60)));

  return {
    id: event.id,
    day: dayOfWeek,
    startHour,
    duration,
    title: event.title,
    color: event.calendarType === 'GESTION' ? '#e8b86d' : '#5b9bd5',
    type: event.type,
    weekOffset: 0,
  };
}

export function useDataSync() {
  const [synced, setSynced] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncedRef = useRef(false);

  const user = useAuthStore((s) => s.user);
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

    // Perf : sync séquentielle — la Serverless Function NestJS est mono-instance
    // et 4 requêtes parallèles au cold-start saturent le process et provoquent des 500.
    // Deux vagues de 2 requêtes = meilleur compromis latence/stabilité.
    (async () => {
      try {
        await Promise.allSettled([syncProjects(), syncIntervenants()]);
        await Promise.allSettled([syncEvents(), syncPayments()]);
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

      // Si workspace vide ET données démo dans le store → vider
      if (!Array.isArray(data) || data.length === 0) {
        if (hasDemoData) useDossierStore.setState({ dossiers: [] });
        if (hasDemoSigned) useDossierStore.setState({ dossiersSignes: [] });
        if (hasDemoPerdu) useDossierStore.setState({ dossiersPerdus: [] });
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

      // Sous-dossiers par défaut pour un dossier "frais" venu du backend sans état local.
      const DEFAULT_SUBFOLDERS = [
        { label: 'DOSSIER RENSEIGNEMENT' },
        { label: 'ETAT DES LIEUX – PHOTOS EXISTANTS' },
        { label: 'RELEVE DE MESURES' },
        { label: 'PROJET VERSION 1 – APS' },
        { label: 'PROJET VERSION 2' },
        { label: 'PROJET VERSION 3 – APD' },
      ];
      const DEFAULT_SIGNED_SUBFOLDERS = [
        { label: 'DOSSIER AVANT VENTE' },
        { label: 'PROJET VERSION 3' },
        { label: 'SUIVI DE CHANTIER' },
        { label: 'RELEVE DE MESURES' },
        { label: 'PLAN TECHNIQUE DCE', alert: true },
        { label: 'COMMANDES', alert: true },
        { label: 'LIVRAISONS' },
        { label: 'FICHE DE POSE' },
        { label: 'SAV' },
        { label: 'RECEPTION CHANTIER' },
      ];

      // Dossiers actifs — merge : champs serveur-vrai (name/firstName/phone/email/createdAt/status)
      // écrasent le local ; champs client-only (subfolders/notes/address/tva/...) préservés.
      const dossiers = activeProjects.map((p) => {
        const local = localActiveById.get(p.id) || localSignedById.get(p.id);
        return {
          id: p.id,
          name: p.client?.lastName || p.name || 'Sans nom',
          firstName: p.client?.firstName || '',
          phone: p.client?.phone || '',
          email: p.client?.email || '',
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
            : DEFAULT_SUBFOLDERS.map((sf) => ({ ...sf })),
          notes: local?.notes ?? '',
        };
      });

      const dossiersSignes = signedProjects.map((p) => {
        const local = localSignedById.get(p.id) || localActiveById.get(p.id);
        return {
          id: p.id,
          name: p.client?.lastName || p.name || 'Sans nom',
          firstName: p.client?.firstName || '',
          phone: p.client?.phone || '',
          email: p.client?.email || '',
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
            : DEFAULT_SUBFOLDERS.map((sf) => ({ ...sf })),
          notes: local?.notes ?? '',
          signedDate: p.saleSignedAt
            ? new Date(p.saleSignedAt).toLocaleDateString('fr-FR')
            : new Date(p.updatedAt).toLocaleDateString('fr-FR'),
          signedSubfolders: (local as any)?.signedSubfolders && (local as any).signedSubfolders.length > 0
            ? (local as any).signedSubfolders
            : DEFAULT_SIGNED_SUBFOLDERS.map((sf) => ({ ...sf })),
          confirmations: (local as any)?.confirmations ?? [],
        };
      });

      const dossiersPerdus = lostProjects.map((p) => ({
        id: p.id,
        name: p.client?.lastName || p.name || 'Sans nom',
        reason: p.description || 'Raison non spécifiée',
        lostDate: new Date(p.updatedAt).toLocaleDateString('fr-FR'),
        montantEstime: p.saleAmount || 0,
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

  async function syncEvents() {
    try {
      const response = await api<any>('/events');
      const data: any[] = Array.isArray(response) ? response : (response?.data ?? []);

      const store = usePlanningStore.getState();
      const currentEventIds = new Set(store.planningEvents.map((e) => e.id));
      const hasDemoEvents = [...currentEventIds].some((id) => DEMO_EVENT_IDS.has(id));
      const currentGestIds = new Set(store.gestEvents.map((e) => e.id));
      const hasDemoGest = [...currentGestIds].some((id) => DEMO_GEST_IDS.has(id));

      // Si workspace vide → vider les events démo
      if (!Array.isArray(data) || data.length === 0) {
        if (hasDemoEvents) usePlanningStore.setState({ planningEvents: [] });
        if (hasDemoGest) usePlanningStore.setState({ gestEvents: [] });
        return;
      }

      const personalEvents = data.filter((e) => e.calendarType === 'PERSONAL');
      const gestEvents = data.filter((e) => e.calendarType === 'GESTION');

      const mappedPersonal = personalEvents.map(mapEventType);
      const mappedGest = gestEvents.map((event) => {
        const base = mapEventType(event);
        return {
          id: base.id,
          day: base.day,
          startHour: base.startHour,
          duration: base.duration,
          type: event.type || 'AUTRE',
          client: event.title || '',
          weekOffset: 0,
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

      const factStore = useFacturationStore.getState();

      // Détecter les factures de démo
      const DEMO_INVOICE_PREFIXES = ['F-2025-', 'F-2026-'];
      const hasDemoInvoices = factStore.invoices.some((inv) =>
        DEMO_INVOICE_PREFIXES.some((prefix) => inv.ref.startsWith(prefix)) &&
        typeof inv.id === 'string' && inv.id.length < 10,
      );

      // Si workspace vide → vider les factures démo
      if (!Array.isArray(data) || data.length === 0) {
        if (hasDemoInvoices) useFacturationStore.setState({ invoices: [] });
        return;
      }

      // Convertir les paiements Prisma en format Invoice frontend
      const invoices = data.map((p) => ({
        id: p.id,
        ref: p.reference || `F-${new Date(p.createdAt).getFullYear()}-${p.id.slice(0, 6).toUpperCase()}`,
        dossierId: p.projectId || undefined,
        client: p.project?.client
          ? `${p.project.client.firstName || ''} ${p.project.client.lastName || ''}`.trim() || p.project.client.company || 'Client'
          : 'Client',
        date: new Date(p.createdAt).toLocaleDateString('fr-FR'),
        montantHT: p.amount ? Number(p.amount) : 0,
        tva: 20,
        statut: mapPaymentStatus(p.status),
        type: mapPaymentType(p.type),
        notes: p.notes || '',
      }));

      if (hasDemoInvoices || invoices.length > 0) {
        useFacturationStore.setState({ invoices });
      }
    } catch (err) {
      console.warn('[DataSync] Payments sync failed, keeping local data:', err);
    }
  }

  async function syncIntervenants() {
    try {
      const response = await api<any>('/intervenants');
      const data: any[] = Array.isArray(response) ? response : (response?.data ?? []);

      const store = useIntervenantStore.getState();
      const currentIds = new Set(store.intervenants.map((i) => i.id));
      const hasDemoData = [...currentIds].some((id) => DEMO_INTERVENANT_IDS.has(id));

      // Si workspace vide → vider les intervenants démo
      if (!Array.isArray(data) || data.length === 0) {
        if (hasDemoData) useIntervenantStore.setState({ intervenants: [] });
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
