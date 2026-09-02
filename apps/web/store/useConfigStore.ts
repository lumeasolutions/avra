/**
 * Store Configuration — paramètres généraux, société, facturation, etc.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
// Persistance backend de la config (write-through debouncé + hydratation via useDataSync).
import { saveSettings } from '@/lib/settings-api';

// Types
export interface PreferencesConfig {
  langue: string;
  devise: string;
  tvaDefaut: number;
  formatDate: string;
  fuseauHoraire: string;
  modeCompact: boolean;
}

export interface NumerotationConfig {
  prefixeFacture: string;
  prefixeDevis: string;
  prefixeAvoir: string;
  prochainNumeroFacture: number;
  prochainNumeroDevis: number;
  anneeAutomatique: boolean;
}

export interface FacturationConfig {
  iban: string;
  bic: string;
  nomBanque: string;
  conditionsPaiement: string;
  mentionsLegales: string;
  penalitesRetard: string;
  escompte: string;
  tauxAcompte: number;
}

export interface NotifConfig {
  factureRetard: boolean;
  devisExpire: boolean;
  commandeAttente: boolean;
  planningRappel: boolean;
  nouveauDossier: boolean;
  paiementRecu: boolean;
  emailNotif: boolean;
  smsNotif: boolean;
}

export interface Societe {
  nom: string;
  adresse: string;
  codePostal: string;
  ville: string;
  siret: string;
  tva: string;
  phone: string;
  email: string;
  siteWeb: string;
  logo?: string;
}

export interface RelanceConfig {
  delaiAcompte: number;
  delaiSolde: number;
  delaiRetard: number;
  messageAcompte: string;
  messageSolde: string;
  messageRetard: string;
}

/** Tous les seuils (en jours) et interrupteurs on/off du système d'alerte. */
export interface AlertesConfig {
  // Dossiers
  echeanceProche: number;
  dossierInactif: number;
  rappelJ1: number;
  rappelJ2: number;
  rappelJ3: number;
  rappelFenetre: number;
  onButoirDepassee: boolean;
  onDossierInactif: boolean;
  onNouveauDossier: boolean;
  onDossierUrgent: boolean;
  // Facturation
  acompteNonRecu: number;
  acompteFacture: number;
  onFactureEcheance: boolean;
  onFactureRetard: boolean;
  onPaiementRecu: boolean;
  onAcompteNonRecu: boolean;
  // Devis
  devisSignature: number;
  devisSansReponse: number;
  onDevisExpire: boolean;
  onDevisRefuse: boolean;
  // Commandes
  commandeAttente: number;
  confirmationFournisseur: number;
  onLivraisonRetard: boolean;
  onCommandeAnnulee: boolean;
  onCommandeAttente: boolean;
  onConfirmationFournisseur: boolean;
  // Planning
  onRappelRdv: boolean;
  onVisiteNonFaite: boolean;
  onConflitPlanning: boolean;
  // Stock
  onStockCritique: boolean;
  onRupture: boolean;
  // Intervenants
  onDossiersAClasser: boolean;
  onCoordonneesIncompletes: boolean;
}

export interface UserMember {
  id: string;
  name: string;
  email: string;
  // OWNER conservé tel quel (pas rabattu sur ADMIN) pour rester aligné avec le
  // rôle réel côté base — évite les divergences store/serveur. VENDEUR/POSEUR
  // sont des libellés UI hérités ; MEMBER (backend) est mappé sur VENDEUR.
  role: 'OWNER' | 'ADMIN' | 'VENDEUR' | 'POSEUR';
  active: boolean;
}

export interface IAConfig {
  // Général
  assistantActif: boolean;
  personnalite: 'professionnel' | 'amical' | 'concis';
  promptSysteme: string;
  contextMetier: string;

  // Accès aux données
  accesDossiers: boolean;
  accesFacturation: boolean;
  accesPlanning: boolean;
  accesStock: boolean;
  accesStats: boolean;
  accesIntervenants: boolean;
  accesAdminDocs: boolean;

  // Actions autorisées
  actionNavigation: boolean;
  actionCreerDossier: boolean;
  actionCreerDevis: boolean;
  actionCreerFacture: boolean;
  actionEnvoyerRelance: boolean;
  actionModifierPlanning: boolean;

  // Comportement
  suggestionsAuto: boolean;
  voixActive: boolean;
  notificationsProactives: boolean;
  nombreMessagesHistorique: number;
  temperature: number;
  longueurMaxReponse: 'courte' | 'normale' | 'detaillee';
}

// Données initiales
const INITIAL_PREFERENCES: PreferencesConfig = {
  langue: 'fr',
  devise: 'EUR',
  tvaDefaut: 20,
  formatDate: 'dd/mm/yyyy',
  fuseauHoraire: 'Europe/Paris',
  modeCompact: false,
};

const INITIAL_NUMEROTATION: NumerotationConfig = {
  prefixeFacture: 'F',
  prefixeDevis: 'D',
  prefixeAvoir: 'AV',
  prochainNumeroFacture: 1,
  prochainNumeroDevis: 1,
  anneeAutomatique: true,
};

const INITIAL_FACTURATION_CFG: FacturationConfig = {
  iban: '',
  bic: '',
  nomBanque: '',
  conditionsPaiement: '30% acompte à la commande, 40% intermédiaire, 30% solde à réception',
  mentionsLegales: 'TVA non récupérable. En cas de retard de paiement, une pénalité égale à 3 fois le taux légal sera appliquée.',
  penalitesRetard: '3x taux légal en vigueur',
  escompte: 'Aucun escompte pour paiement anticipé',
  tauxAcompte: 30,
};

const INITIAL_NOTIF_CFG: NotifConfig = {
  factureRetard: true,
  devisExpire: true,
  commandeAttente: true,
  planningRappel: true,
  nouveauDossier: false,
  paiementRecu: true,
  emailNotif: true,
  smsNotif: false,
};

const INITIAL_SOCIETE: Societe = {
  nom: '',
  adresse: '',
  codePostal: '',
  ville: '',
  siret: '',
  tva: '',
  phone: '',
  email: '',
  siteWeb: '',
};

const INITIAL_RELANCE: RelanceConfig = {
  delaiAcompte: 7,
  delaiSolde: 30,
  delaiRetard: 3,
  messageAcompte: 'Bonjour {client}, nous vous rappelons que votre acompte de {montant}€ est attendu avant le {date}. Merci.',
  messageSolde: 'Bonjour {client}, votre solde de {montant}€ est à régler avant le {date}. N\'hésitez pas à nous contacter.',
  messageRetard: 'Bonjour {client}, nous constatons que votre règlement de {montant}€ est en retard. Merci de régulariser rapidement.',
};

const INITIAL_ALERTES: AlertesConfig = {
  echeanceProche: 7, dossierInactif: 30, rappelJ1: 14, rappelJ2: 7, rappelJ3: 3, rappelFenetre: 21,
  onButoirDepassee: true, onDossierInactif: true, onNouveauDossier: false, onDossierUrgent: true,
  acompteNonRecu: 7, acompteFacture: 7,
  onFactureEcheance: true, onFactureRetard: true, onPaiementRecu: true, onAcompteNonRecu: true,
  devisSignature: 5, devisSansReponse: 14, onDevisExpire: true, onDevisRefuse: true,
  commandeAttente: 3, confirmationFournisseur: 7,
  onLivraisonRetard: true, onCommandeAnnulee: true, onCommandeAttente: true, onConfirmationFournisseur: true,
  onRappelRdv: true, onVisiteNonFaite: true, onConflitPlanning: true,
  onStockCritique: true, onRupture: true,
  onDossiersAClasser: true, onCoordonneesIncompletes: true,
};

const INITIAL_IA: IAConfig = {
  assistantActif: true,
  personnalite: 'professionnel',
  promptSysteme: 'Tu es AVRA, un assistant spécialisé pour les professionnels de la cuisine et de l\'agencement intérieur. Tu aides à gérer les dossiers clients, la facturation et le planning. Réponds toujours en français, de manière professionnelle et concise.',
  contextMetier: 'Cuisines sur mesure, salles de bain, dressings, agencement intérieur',

  accesDossiers: true,
  accesFacturation: true,
  accesPlanning: true,
  accesStock: true,
  accesStats: true,
  accesIntervenants: true,
  accesAdminDocs: false,

  actionNavigation: true,
  actionCreerDossier: true,
  actionCreerDevis: false,
  actionCreerFacture: false,
  actionEnvoyerRelance: false,
  actionModifierPlanning: false,

  suggestionsAuto: true,
  voixActive: false,
  notificationsProactives: true,
  nombreMessagesHistorique: 20,
  temperature: 0.7,
  longueurMaxReponse: 'normale',
};

// Membres — vides. L'owner du workspace est ajouté dynamiquement à la connexion.
const INITIAL_MEMBERS: UserMember[] = [];

// Helper
const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 8);
const USERS = ['Cassandra', 'Sylvie', 'Christian'];
const randomUser = () => USERS[Math.floor(Math.random() * USERS.length)];

// ── Write-through backend (debouncé) ────────────────────────────────────────
// On regroupe les 8 blocs de config et on les pousse vers /settings (PUT) après
// 800 ms d'inactivité — évite de spammer l'API à chaque frappe clavier.
// `members` reste local ici (l'équipe a son propre backend, câblé séparément).
let _persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist(snapshot: () => ConfigState) {
  if (typeof window === 'undefined') return;
  if (_persistTimer) clearTimeout(_persistTimer);
  _persistTimer = setTimeout(() => {
    const s = snapshot();
    saveSettings({
      preferences: s.preferences,
      numerotation: s.numerotation,
      facturationConfig: s.facturationConfig,
      notifConfig: s.notifConfig,
      societe: s.societe,
      relanceConfig: s.relanceConfig,
      alertesConfig: s.alertesConfig,
      iaConfig: s.iaConfig,
      adminDocsPin: s.adminDocsPin,
      adminDocsDeviceId: s.adminDocsDeviceId,
    }).catch((e: any) => console.warn('[config] saveSettings échec, gardé en local:', e?.message || e));
  }, 800);
}

interface ConfigState {
  // Data
  preferences: PreferencesConfig;
  numerotation: NumerotationConfig;
  facturationConfig: FacturationConfig;
  notifConfig: NotifConfig;
  societe: Societe;
  relanceConfig: RelanceConfig;
  alertesConfig: AlertesConfig;
  members: UserMember[];
  iaConfig: IAConfig;
  /** Code PIN à 4 chiffres du Dossier administratif (null = non défini). Synchronisé au compte. */
  adminDocsPin: string | null;
  /** Identifiant de l'ORDINATEUR propriétaire du dossier administratif : celui qui
   *  a créé le code. Le dossier ne s'ouvre que sur cet appareil ; un autre doit
   *  se « rebrancher » via le mot de passe du compte. Synchronisé au compte. */
  adminDocsDeviceId: string | null;

  // Actions
  updateSociete: (data: Partial<Societe>) => void;
  updateRelanceConfig: (data: Partial<RelanceConfig>) => void;
  updateAlertesConfig: (data: Partial<AlertesConfig>) => void;
  updatePreferences: (data: Partial<PreferencesConfig>) => void;
  updateNumerotation: (data: Partial<NumerotationConfig>) => void;
  updateFacturationConfig: (data: Partial<FacturationConfig>) => void;
  updateNotifConfig: (data: Partial<NotifConfig>) => void;
  updateIAConfig: (data: Partial<IAConfig>) => void;
  /** Définit (ou efface) le code. Un `ownerDeviceId` lie le dossier à cet appareil. */
  setAdminDocsPin: (pin: string | null, ownerDeviceId?: string | null) => void;
  /** Transfère la propriété du dossier administratif à un appareil (rebranchement). */
  setAdminDocsDevice: (deviceId: string | null) => void;

  // Hydratation depuis le backend (sans re-déclencher de write-through)
  _hydrateFromBackend: (config: Partial<{
    preferences: PreferencesConfig;
    numerotation: NumerotationConfig;
    facturationConfig: FacturationConfig;
    notifConfig: NotifConfig;
    societe: Societe;
    relanceConfig: RelanceConfig;
    alertesConfig: AlertesConfig;
    iaConfig: IAConfig;
    adminDocsPin: string | null;
    adminDocsDeviceId: string | null;
  }>) => void;

  // Members actions
  addMember: (member: Omit<UserMember, 'id'>) => void;
  toggleMemberActive: (id: string) => void;
  removeMember: (id: string) => void;
  updateMemberRole: (id: string, role: 'ADMIN' | 'VENDEUR' | 'POSEUR') => void;
  /** Remplace la liste des membres (hydratation depuis le backend équipe). */
  setMembers: (members: UserMember[]) => void;

  // Reset
  reset: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      preferences: INITIAL_PREFERENCES,
      numerotation: INITIAL_NUMEROTATION,
      facturationConfig: INITIAL_FACTURATION_CFG,
      notifConfig: INITIAL_NOTIF_CFG,
      societe: INITIAL_SOCIETE,
      relanceConfig: INITIAL_RELANCE,
      alertesConfig: INITIAL_ALERTES,
      members: INITIAL_MEMBERS,
      iaConfig: INITIAL_IA,
      adminDocsPin: null,
      adminDocsDeviceId: null,

      updateSociete: (data) => {
        set(s => ({ societe: { ...s.societe, ...data } }));
        schedulePersist(get);
      },

      updateRelanceConfig: (data) => {
        set(s => ({ relanceConfig: { ...s.relanceConfig, ...data } }));
        schedulePersist(get);
      },

      updateAlertesConfig: (data) => {
        set(s => ({ alertesConfig: { ...(s.alertesConfig ?? INITIAL_ALERTES), ...data } }));
        schedulePersist(get);
      },

      updatePreferences: (data) => {
        set(s => ({ preferences: { ...s.preferences, ...data } }));
        schedulePersist(get);
      },

      updateNumerotation: (data) => {
        set(s => ({ numerotation: { ...s.numerotation, ...data } }));
        schedulePersist(get);
      },

      updateFacturationConfig: (data) => {
        set(s => ({ facturationConfig: { ...s.facturationConfig, ...data } }));
        schedulePersist(get);
      },

      updateNotifConfig: (data) => {
        set(s => ({ notifConfig: { ...s.notifConfig, ...data } }));
        schedulePersist(get);
      },

      updateIAConfig: (data) => {
        set(s => ({ iaConfig: { ...s.iaConfig, ...data } }));
        schedulePersist(get);
      },

      setAdminDocsPin: (pin, ownerDeviceId) => {
        set(ownerDeviceId !== undefined
          ? { adminDocsPin: pin, adminDocsDeviceId: ownerDeviceId }
          : { adminDocsPin: pin });
        schedulePersist(get);
      },

      setAdminDocsDevice: (deviceId) => {
        set({ adminDocsDeviceId: deviceId });
        schedulePersist(get);
      },

      // Applique la config venue du backend SANS re-pousser (pas de schedulePersist).
      _hydrateFromBackend: (config) => {
        if (!config) return;
        set(s => ({
          preferences:       config.preferences       ? { ...s.preferences, ...config.preferences } : s.preferences,
          numerotation:      config.numerotation       ? { ...s.numerotation, ...config.numerotation } : s.numerotation,
          facturationConfig: config.facturationConfig  ? { ...s.facturationConfig, ...config.facturationConfig } : s.facturationConfig,
          notifConfig:       config.notifConfig         ? { ...s.notifConfig, ...config.notifConfig } : s.notifConfig,
          societe:           config.societe             ? { ...s.societe, ...config.societe } : s.societe,
          relanceConfig:     config.relanceConfig       ? { ...s.relanceConfig, ...config.relanceConfig } : s.relanceConfig,
          alertesConfig:     config.alertesConfig       ? { ...(s.alertesConfig ?? INITIAL_ALERTES), ...config.alertesConfig } : s.alertesConfig,
          iaConfig:          config.iaConfig            ? { ...s.iaConfig, ...config.iaConfig } : s.iaConfig,
          adminDocsPin:      config.adminDocsPin !== undefined ? config.adminDocsPin : s.adminDocsPin,
          adminDocsDeviceId: config.adminDocsDeviceId !== undefined ? config.adminDocsDeviceId : s.adminDocsDeviceId,
        }));
      },

      addMember: (member) => {
        const newMember: UserMember = { ...member, id: 'm' + uid() };
        set(s => ({ members: [newMember, ...s.members] }));
      },

      toggleMemberActive: (id) => {
        set(s => ({ members: s.members.map(m => m.id === id ? { ...m, active: !m.active } : m) }));
      },

      removeMember: (id) => {
        set(s => ({ members: s.members.filter(mb => mb.id !== id) }));
      },

      updateMemberRole: (id, role) => {
        set(s => ({ members: s.members.map(m => m.id === id ? { ...m, role } : m) }));
      },

      setMembers: (members) => set({ members }),

      reset: () => set({
        preferences: INITIAL_PREFERENCES,
        numerotation: INITIAL_NUMEROTATION,
        facturationConfig: INITIAL_FACTURATION_CFG,
        notifConfig: INITIAL_NOTIF_CFG,
        societe: INITIAL_SOCIETE,
        relanceConfig: INITIAL_RELANCE,
        members: INITIAL_MEMBERS,
        iaConfig: INITIAL_IA,
      }),
    }),
    { name: 'avra-config-store' }
  )
);
