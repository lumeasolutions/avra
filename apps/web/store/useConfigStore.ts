/**
 * Store Configuration — paramètres généraux, société, facturation, etc.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export interface UserMember {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'VENDEUR' | 'POSEUR';
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

interface ConfigState {
  // Data
  preferences: PreferencesConfig;
  numerotation: NumerotationConfig;
  facturationConfig: FacturationConfig;
  notifConfig: NotifConfig;
  societe: Societe;
  relanceConfig: RelanceConfig;
  members: UserMember[];
  iaConfig: IAConfig;

  // Actions
  updateSociete: (data: Partial<Societe>) => void;
  updateRelanceConfig: (data: Partial<RelanceConfig>) => void;
  updatePreferences: (data: Partial<PreferencesConfig>) => void;
  updateNumerotation: (data: Partial<NumerotationConfig>) => void;
  updateFacturationConfig: (data: Partial<FacturationConfig>) => void;
  updateNotifConfig: (data: Partial<NotifConfig>) => void;
  updateIAConfig: (data: Partial<IAConfig>) => void;

  // Members actions
  addMember: (member: Omit<UserMember, 'id'>) => void;
  toggleMemberActive: (id: string) => void;
  removeMember: (id: string) => void;
  updateMemberRole: (id: string, role: 'ADMIN' | 'VENDEUR' | 'POSEUR') => void;

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
      members: INITIAL_MEMBERS,
      iaConfig: INITIAL_IA,

      updateSociete: (data) => {
        set(s => ({ societe: { ...s.societe, ...data } }));
      },

      updateRelanceConfig: (data) => {
        set(s => ({ relanceConfig: { ...s.relanceConfig, ...data } }));
      },

      updatePreferences: (data) => {
        set(s => ({ preferences: { ...s.preferences, ...data } }));
      },

      updateNumerotation: (data) => {
        set(s => ({ numerotation: { ...s.numerotation, ...data } }));
      },

      updateFacturationConfig: (data) => {
        set(s => ({ facturationConfig: { ...s.facturationConfig, ...data } }));
      },

      updateNotifConfig: (data) => {
        set(s => ({ notifConfig: { ...s.notifConfig, ...data } }));
      },

      updateIAConfig: (data) => {
        set(s => ({ iaConfig: { ...s.iaConfig, ...data } }));
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
