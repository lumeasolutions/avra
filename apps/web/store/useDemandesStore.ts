/**
 * Store Demandes & Invitations Intervenants.
 *
 * Couvre les deux côtés de la relation :
 *  - PRO : liste workspace, création, gestion d'invitations
 *  - INTERVENANT : mes demandes (filtré par Intervenant.userId)
 *
 * Pas de persist : toutes les données viennent de l'API (server is source of truth).
 * Le seul état local persistant est la sélection UI (filtres, ordre tri).
 */
import { create } from 'zustand';
import {
  Demande,
  DemandeMessage,
  DemandeStats,
  DemandesPage,
  DemandeStatus,
  DemandeType,
  IntervenantInvitation,
  InvitationPreview,
  listDemandesPro,
  statsDemandesPro,
  getDemandePro,
  createDemande as apiCreateDemande,
  updateDemandeStatusPro,
  postMessagePro,
  listInvitations,
  createInvitation as apiCreateInvitation,
  revokeInvitation as apiRevokeInvitation,
  listMyDemandes,
  statsMyDemandes,
  getMyDemande,
  markDemandeViewed,
  updateMyDemandeStatus,
  postMessageIntervenant,
  getInvitationByToken,
  acceptInvitation as apiAcceptInvitation,
  refuseInvitation as apiRefuseInvitation,
} from '@/lib/demandes-api';

// ─── Types internes ─────────────────────────────────────────────────────────

export interface DemandeFilters {
  status?: DemandeStatus;
  type?: DemandeType;
  intervenantId?: string;
  projectId?: string;
}

export interface IntervenantFilters {
  status?: DemandeStatus;
}

interface DemandesState {
  // ─── PRO side ────────────────────────────────────────────────────────────
  proDemandes: Demande[];
  proTotal: number;
  proPage: number;
  proPageSize: number;
  proStats: DemandeStats | null;
  proFilters: DemandeFilters;
  loadingProList: boolean;
  loadingProStats: boolean;
  errorProList: string | null;

  // Detail (partagé pro + intervenant — un seul detail à la fois affiché)
  currentDemande: Demande | null;
  loadingDetail: boolean;
  errorDetail: string | null;

  // Invitations (pro)
  invitations: IntervenantInvitation[];
  loadingInvitations: boolean;
  errorInvitations: string | null;

  // ─── INTERVENANT side ────────────────────────────────────────────────────
  myDemandes: Demande[];
  myTotal: number;
  myPage: number;
  myPageSize: number;
  myStats: DemandeStats | null;
  myFilters: IntervenantFilters;
  loadingMyList: boolean;
  loadingMyStats: boolean;
  errorMyList: string | null;

  // Invitation publique (page d'acceptation)
  invitationPreview: InvitationPreview | null;
  loadingInvitationPreview: boolean;
  errorInvitationPreview: string | null;

  // ─── PRO actions ─────────────────────────────────────────────────────────
  setProFilters: (filters: Partial<DemandeFilters>) => void;
  setProPage: (page: number) => void;
  fetchProDemandes: () => Promise<void>;
  fetchProStats: () => Promise<void>;
  createDemande: (data: {
    intervenantId: string;
    type: DemandeType;
    title: string;
    notes?: string;
    projectId?: string;
    eventId?: string;
    scheduledFor?: string;
    attachments?: Array<{ dossierDocumentId?: string; documentId?: string; displayName: string; mimeType?: string }>;
  }) => Promise<Demande | null>;
  updateProStatus: (id: string, status: DemandeStatus, comment?: string) => Promise<Demande | null>;
  postProMessage: (id: string, body: string) => Promise<DemandeMessage | null>;

  fetchInvitations: () => Promise<void>;
  createInvitation: (data: {
    intervenantId: string;
    email?: string;
    expiresInDays?: number;
    message?: string;
  }) => Promise<IntervenantInvitation | null>;
  revokeInvitation: (invitationId: string) => Promise<boolean>;

  // ─── INTERVENANT actions ─────────────────────────────────────────────────
  setMyFilters: (filters: Partial<IntervenantFilters>) => void;
  setMyPage: (page: number) => void;
  fetchMyDemandes: () => Promise<void>;
  fetchMyStats: () => Promise<void>;
  fetchMyDemande: (id: string) => Promise<Demande | null>;
  markViewed: (id: string) => Promise<void>;
  updateMyStatus: (id: string, status: DemandeStatus, comment?: string) => Promise<Demande | null>;
  postMyMessage: (id: string, body: string) => Promise<DemandeMessage | null>;

  // ─── Detail (commun) ─────────────────────────────────────────────────────
  fetchProDemande: (id: string) => Promise<Demande | null>;
  clearDetail: () => void;

  // ─── Invitation publique ─────────────────────────────────────────────────
  fetchInvitationPreview: (token: string) => Promise<InvitationPreview | null>;
  acceptInvitationPublic: (token: string) => Promise<boolean>;
  refuseInvitationPublic: (token: string) => Promise<boolean>;

  // ─── Reset ───────────────────────────────────────────────────────────────
  reset: () => void;
}

// ─── Helpers internes ───────────────────────────────────────────────────────

const isAuthError = (err: any): boolean => {
  const m = String(err?.message ?? '').toLowerCase();
  return m.includes('unauthorized') || m.includes('expir') || m.includes('too many');
};

const errMsg = (err: any, fallback: string): string => {
  const m = err?.message;
  return typeof m === 'string' && m.length > 0 ? m : fallback;
};

// ─── Store ──────────────────────────────────────────────────────────────────

export const useDemandesStore = create<DemandesState>((set, get) => ({
  // PRO
  proDemandes: [],
  proTotal: 0,
  proPage: 1,
  proPageSize: 50,
  proStats: null,
  proFilters: {},
  loadingProList: false,
  loadingProStats: false,
  errorProList: null,

  // Detail
  currentDemande: null,
  loadingDetail: false,
  errorDetail: null,

  // Invitations
  invitations: [],
  loadingInvitations: false,
  errorInvitations: null,

  // INTERVENANT
  myDemandes: [],
  myTotal: 0,
  myPage: 1,
  myPageSize: 50,
  myStats: null,
  myFilters: {},
  loadingMyList: false,
  loadingMyStats: false,
  errorMyList: null,

  // Invitation publique
  invitationPreview: null,
  loadingInvitationPreview: false,
  errorInvitationPreview: null,

  // ─── PRO ────────────────────────────────────────────────────────────────

  setProFilters: (filters) => {
    set((s) => ({ proFilters: { ...s.proFilters, ...filters }, proPage: 1 }));
    get().fetchProDemandes();
  },

  setProPage: (page) => {
    set({ proPage: page });
    get().fetchProDemandes();
  },

  fetchProDemandes: async () => {
    set({ loadingProList: true, errorProList: null });
    try {
      const { proFilters, proPage, proPageSize } = get();
      const res: DemandesPage = await listDemandesPro({
        ...proFilters, page: proPage, pageSize: proPageSize,
      });
      set({
        proDemandes: res.data,
        proTotal: res.total,
        proPage: res.page,
        proPageSize: res.pageSize,
        loadingProList: false,
      });
    } catch (e: any) {
      if (isAuthError(e)) {
        set({ proDemandes: [], proTotal: 0, loadingProList: false });
      } else {
        set({ loadingProList: false, errorProList: errMsg(e, 'Erreur chargement demandes') });
      }
    }
  },

  fetchProStats: async () => {
    set({ loadingProStats: true });
    try {
      const stats = await statsDemandesPro();
      set({ proStats: stats, loadingProStats: false });
    } catch {
      set({ proStats: null, loadingProStats: false });
    }
  },

  createDemande: async (data) => {
    try {
      const created = await apiCreateDemande(data);
      // Insertion en tête + refresh stats best-effort
      set((s) => ({ proDemandes: [created, ...s.proDemandes], proTotal: s.proTotal + 1 }));
      get().fetchProStats().catch(() => {/* noop */});
      return created;
    } catch (e: any) {
      set({ errorProList: errMsg(e, 'Erreur création demande') });
      return null;
    }
  },

  updateProStatus: async (id, status, comment) => {
    try {
      const updated = await updateDemandeStatusPro(id, status, comment);
      set((s) => ({
        proDemandes: s.proDemandes.map((d) => (d.id === id ? updated : d)),
        currentDemande: s.currentDemande?.id === id ? updated : s.currentDemande,
      }));
      get().fetchProStats().catch(() => {/* noop */});
      return updated;
    } catch (e: any) {
      set({ errorProList: errMsg(e, 'Erreur changement statut') });
      return null;
    }
  },

  postProMessage: async (id, body) => {
    try {
      const msg = await postMessagePro(id, body);
      // Append message au currentDemande si chargé
      set((s) => {
        if (s.currentDemande?.id !== id) return {};
        const messages = [...(s.currentDemande.messages ?? []), msg];
        return { currentDemande: { ...s.currentDemande, messages } };
      });
      return msg;
    } catch (e: any) {
      set({ errorDetail: errMsg(e, 'Erreur envoi message') });
      return null;
    }
  },

  // ─── Invitations (pro) ──────────────────────────────────────────────────

  fetchInvitations: async () => {
    set({ loadingInvitations: true, errorInvitations: null });
    try {
      const data = await listInvitations();
      set({ invitations: data, loadingInvitations: false });
    } catch (e: any) {
      if (isAuthError(e)) {
        set({ invitations: [], loadingInvitations: false });
      } else {
        set({ loadingInvitations: false, errorInvitations: errMsg(e, 'Erreur chargement invitations') });
      }
    }
  },

  createInvitation: async (data) => {
    try {
      const inv = await apiCreateInvitation(data);
      set((s) => ({ invitations: [inv, ...s.invitations] }));
      return inv;
    } catch (e: any) {
      set({ errorInvitations: errMsg(e, 'Erreur création invitation') });
      return null;
    }
  },

  revokeInvitation: async (invitationId) => {
    try {
      const updated = await apiRevokeInvitation(invitationId);
      set((s) => ({
        invitations: s.invitations.map((i) => (i.id === invitationId ? updated : i)),
      }));
      return true;
    } catch (e: any) {
      set({ errorInvitations: errMsg(e, 'Erreur révocation invitation') });
      return false;
    }
  },

  // ─── INTERVENANT ────────────────────────────────────────────────────────

  setMyFilters: (filters) => {
    set((s) => ({ myFilters: { ...s.myFilters, ...filters }, myPage: 1 }));
    get().fetchMyDemandes();
  },

  setMyPage: (page) => {
    set({ myPage: page });
    get().fetchMyDemandes();
  },

  fetchMyDemandes: async () => {
    set({ loadingMyList: true, errorMyList: null });
    try {
      const { myFilters, myPage, myPageSize } = get();
      const res: DemandesPage = await listMyDemandes({
        ...myFilters, page: myPage, pageSize: myPageSize,
      });
      set({
        myDemandes: res.data,
        myTotal: res.total,
        myPage: res.page,
        myPageSize: res.pageSize,
        loadingMyList: false,
      });
    } catch (e: any) {
      if (isAuthError(e)) {
        set({ myDemandes: [], myTotal: 0, loadingMyList: false });
      } else {
        set({ loadingMyList: false, errorMyList: errMsg(e, 'Erreur chargement mes demandes') });
      }
    }
  },

  fetchMyStats: async () => {
    set({ loadingMyStats: true });
    try {
      const stats = await statsMyDemandes();
      set({ myStats: stats, loadingMyStats: false });
    } catch {
      set({ myStats: null, loadingMyStats: false });
    }
  },

  fetchMyDemande: async (id) => {
    set({ loadingDetail: true, errorDetail: null });
    try {
      const d = await getMyDemande(id);
      set({ currentDemande: d, loadingDetail: false });
      return d;
    } catch (e: any) {
      set({ loadingDetail: false, errorDetail: errMsg(e, 'Erreur chargement demande') });
      return null;
    }
  },

  markViewed: async (id) => {
    try {
      const updated = await markDemandeViewed(id);
      set((s) => ({
        myDemandes: s.myDemandes.map((d) => (d.id === id ? updated : d)),
        currentDemande: s.currentDemande?.id === id ? updated : s.currentDemande,
      }));
      // Refresh stats discretement (unreadCount)
      get().fetchMyStats().catch(() => {/* noop */});
    } catch {
      // Idempotent : on ignore les erreurs (souvent 409 si déjà VUE)
    }
  },

  updateMyStatus: async (id, status, comment) => {
    try {
      const updated = await updateMyDemandeStatus(id, status, comment);
      set((s) => ({
        myDemandes: s.myDemandes.map((d) => (d.id === id ? updated : d)),
        currentDemande: s.currentDemande?.id === id ? updated : s.currentDemande,
      }));
      get().fetchMyStats().catch(() => {/* noop */});
      return updated;
    } catch (e: any) {
      set({ errorMyList: errMsg(e, 'Erreur changement statut') });
      return null;
    }
  },

  postMyMessage: async (id, body) => {
    try {
      const msg = await postMessageIntervenant(id, body);
      set((s) => {
        if (s.currentDemande?.id !== id) return {};
        const messages = [...(s.currentDemande.messages ?? []), msg];
        return { currentDemande: { ...s.currentDemande, messages } };
      });
      return msg;
    } catch (e: any) {
      set({ errorDetail: errMsg(e, 'Erreur envoi message') });
      return null;
    }
  },

  // ─── Detail (commun) ────────────────────────────────────────────────────

  fetchProDemande: async (id) => {
    set({ loadingDetail: true, errorDetail: null });
    try {
      const d = await getDemandePro(id);
      set({ currentDemande: d, loadingDetail: false });
      return d;
    } catch (e: any) {
      set({ loadingDetail: false, errorDetail: errMsg(e, 'Erreur chargement demande') });
      return null;
    }
  },

  clearDetail: () => set({ currentDemande: null, errorDetail: null }),

  // ─── Invitation publique ────────────────────────────────────────────────

  fetchInvitationPreview: async (token) => {
    set({ loadingInvitationPreview: true, errorInvitationPreview: null });
    try {
      const preview = await getInvitationByToken(token);
      set({ invitationPreview: preview, loadingInvitationPreview: false });
      return preview;
    } catch (e: any) {
      set({
        invitationPreview: null,
        loadingInvitationPreview: false,
        errorInvitationPreview: errMsg(e, 'Invitation introuvable ou expirée'),
      });
      return null;
    }
  },

  acceptInvitationPublic: async (token) => {
    try {
      await apiAcceptInvitation(token);
      // Refresh preview pour refléter le statut
      await get().fetchInvitationPreview(token).catch(() => {/* noop */});
      return true;
    } catch (e: any) {
      set({ errorInvitationPreview: errMsg(e, 'Erreur acceptation invitation') });
      return false;
    }
  },

  refuseInvitationPublic: async (token) => {
    try {
      await apiRefuseInvitation(token);
      await get().fetchInvitationPreview(token).catch(() => {/* noop */});
      return true;
    } catch (e: any) {
      set({ errorInvitationPreview: errMsg(e, 'Erreur refus invitation') });
      return false;
    }
  },

  // ─── Reset ──────────────────────────────────────────────────────────────

  reset: () => set({
    proDemandes: [], proTotal: 0, proPage: 1, proStats: null, proFilters: {},
    loadingProList: false, loadingProStats: false, errorProList: null,
    currentDemande: null, loadingDetail: false, errorDetail: null,
    invitations: [], loadingInvitations: false, errorInvitations: null,
    myDemandes: [], myTotal: 0, myPage: 1, myStats: null, myFilters: {},
    loadingMyList: false, loadingMyStats: false, errorMyList: null,
    invitationPreview: null, loadingInvitationPreview: false, errorInvitationPreview: null,
  }),
}));
