/**
 * Déclarations de types pour @prisma/client
 * Générées manuellement depuis prisma/schema.prisma
 */
declare module '@prisma/client' {
  export const UserRole: { OWNER: 'OWNER'; ADMIN: 'ADMIN'; MEMBER: 'MEMBER'; VIEWER: 'VIEWER' };
  export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

  export const WorkspacePlan: { STARTER: 'STARTER'; PRO: 'PRO'; ENTERPRISE: 'ENTERPRISE' };
  export type WorkspacePlan = 'STARTER' | 'PRO' | 'ENTERPRISE';

  export const TradeType: { ARCHITECTE_INTERIEUR: 'ARCHITECTE_INTERIEUR'; CUISINISTE: 'CUISINISTE'; MENUISIER: 'MENUISIER'; AGENCEUR: 'AGENCEUR'; DECORATEUR: 'DECORATEUR'; PROMOTEUR: 'PROMOTEUR'; AUTRE: 'AUTRE' };
  export type TradeType = 'ARCHITECTE_INTERIEUR' | 'CUISINISTE' | 'MENUISIER' | 'AGENCEUR' | 'DECORATEUR' | 'PROMOTEUR' | 'AUTRE';

  export const ClientType: { PARTICULIER: 'PARTICULIER'; PROFESSIONNEL: 'PROFESSIONNEL' };
  export type ClientType = 'PARTICULIER' | 'PROFESSIONNEL';

  export const AddressType: { BILLING: 'BILLING'; SITE: 'SITE'; OTHER: 'OTHER' };
  export type AddressType = 'BILLING' | 'SITE' | 'OTHER';

  export const ProjectLifecycleStatus: { DRAFT: 'DRAFT'; VENTE: 'VENTE'; SIGNE: 'SIGNE'; EN_CHANTIER: 'EN_CHANTIER'; RECEPTION: 'RECEPTION'; SAV: 'SAV'; CLOTURE: 'CLOTURE'; PERDU: 'PERDU'; ARCHIVE: 'ARCHIVE' };
  export type ProjectLifecycleStatus = 'DRAFT' | 'VENTE' | 'SIGNE' | 'EN_CHANTIER' | 'RECEPTION' | 'SAV' | 'CLOTURE' | 'PERDU' | 'ARCHIVE';

  export const ProjectPriority: { LOW: 'LOW'; MEDIUM: 'MEDIUM'; HIGH: 'HIGH'; URGENT: 'URGENT' };
  export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  export const PipelineStatus: { LEAD: 'LEAD'; PROSPECT: 'PROSPECT'; DEVIS_ENVOYE: 'DEVIS_ENVOYE'; NEGOCIATION: 'NEGOCIATION'; GAGNE: 'GAGNE'; PERDU: 'PERDU' };
  export type PipelineStatus = 'LEAD' | 'PROSPECT' | 'DEVIS_ENVOYE' | 'NEGOCIATION' | 'GAGNE' | 'PERDU';

  export const EventCalendarType: { PERSONAL: 'PERSONAL'; GESTION: 'GESTION' };
  export type EventCalendarType = 'PERSONAL' | 'GESTION';

  export const EventType: { REUNION: 'REUNION'; VISITE_CHANTIER: 'VISITE_CHANTIER'; LIVRAISON: 'LIVRAISON'; INSTALLATION: 'INSTALLATION'; RDV_CLIENT: 'RDV_CLIENT'; RELANCE: 'RELANCE'; FORMATION: 'FORMATION'; DEPLACEMENT: 'DEPLACEMENT'; APPEL: 'APPEL'; AUTRE: 'AUTRE' };
  export type EventType = 'REUNION' | 'VISITE_CHANTIER' | 'LIVRAISON' | 'INSTALLATION' | 'RDV_CLIENT' | 'RELANCE' | 'FORMATION' | 'DEPLACEMENT' | 'APPEL' | 'AUTRE';

  export const IntervenantType: { POSEUR: 'POSEUR'; ELECTRICIEN: 'ELECTRICIEN'; MACON: 'MACON'; PEINTRE: 'PEINTRE'; PLOMBIER: 'PLOMBIER'; CARRELEUR: 'CARRELEUR'; MENUISIER: 'MENUISIER'; CHAUFFAGISTE: 'CHAUFFAGISTE'; SERRURIER: 'SERRURIER'; GEOMETRE: 'GEOMETRE'; AUTRE: 'AUTRE' };
  export type IntervenantType = 'POSEUR' | 'ELECTRICIEN' | 'MACON' | 'PEINTRE' | 'PLOMBIER' | 'CARRELEUR' | 'MENUISIER' | 'CHAUFFAGISTE' | 'SERRURIER' | 'GEOMETRE' | 'AUTRE';

  export const IntervenantRequestStatus: { PENDING: 'PENDING'; SENT: 'SENT'; ACCEPTED: 'ACCEPTED'; REFUSED: 'REFUSED'; CANCELLED: 'CANCELLED' };
  export type IntervenantRequestStatus = 'PENDING' | 'SENT' | 'ACCEPTED' | 'REFUSED' | 'CANCELLED';

  export const DocumentKind: { PLAN: 'PLAN'; DEVIS: 'DEVIS'; FACTURE: 'FACTURE'; CONTRAT: 'CONTRAT'; BON_COMMANDE: 'BON_COMMANDE'; PHOTO: 'PHOTO'; IA_RENDER: 'IA_RENDER'; AUTRE: 'AUTRE' };
  export type DocumentKind = 'PLAN' | 'DEVIS' | 'FACTURE' | 'CONTRAT' | 'BON_COMMANDE' | 'PHOTO' | 'IA_RENDER' | 'AUTRE';

  export const FileMimeCategory: { IMAGE: 'IMAGE'; PDF: 'PDF'; DOCUMENT: 'DOCUMENT'; VIDEO: 'VIDEO'; ARCHIVE: 'ARCHIVE'; OTHER: 'OTHER' };
  export type FileMimeCategory = 'IMAGE' | 'PDF' | 'DOCUMENT' | 'VIDEO' | 'ARCHIVE' | 'OTHER';

  export const StockItemStatus: { AVAILABLE: 'AVAILABLE'; RESERVED: 'RESERVED'; OUT_OF_STOCK: 'OUT_OF_STOCK'; DISCONTINUED: 'DISCONTINUED'; ORDERED: 'ORDERED' };
  export type StockItemStatus = 'AVAILABLE' | 'RESERVED' | 'OUT_OF_STOCK' | 'DISCONTINUED' | 'ORDERED';

  export const StockCategory: { MEUBLE: 'MEUBLE'; ELECTROMENAGER: 'ELECTROMENAGER'; LUMINAIRE: 'LUMINAIRE'; ACCESSOIRE: 'ACCESSOIRE'; MATERIAU: 'MATERIAU'; TEXTILE: 'TEXTILE'; SANITAIRE: 'SANITAIRE'; AUTRE: 'AUTRE' };
  export type StockCategory = 'MEUBLE' | 'ELECTROMENAGER' | 'LUMINAIRE' | 'ACCESSOIRE' | 'MATERIAU' | 'TEXTILE' | 'SANITAIRE' | 'AUTRE';

  export const IaJobStatus: { QUEUED: 'QUEUED'; PROCESSING: 'PROCESSING'; DONE: 'DONE'; FAILED: 'FAILED' };
  export type IaJobStatus = 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED';

  export const IaJobType: { PHOTOREALISM_ENHANCE: 'PHOTOREALISM_ENHANCE'; COLOR_VARIATION: 'COLOR_VARIATION'; EDIT: 'EDIT'; PLAN_COMPARISON: 'PLAN_COMPARISON'; TEXT_ASSISTANT: 'TEXT_ASSISTANT' };
  export type IaJobType = 'PHOTOREALISM_ENHANCE' | 'COLOR_VARIATION' | 'EDIT' | 'PLAN_COMPARISON' | 'TEXT_ASSISTANT';

  export const PaymentType: { ACOMPTE: 'ACOMPTE'; SOLDE: 'SOLDE'; FACTURE: 'FACTURE'; AVOIR: 'AVOIR' };
  export type PaymentType = 'ACOMPTE' | 'SOLDE' | 'FACTURE' | 'AVOIR';

  export const PaymentStatus: { PENDING: 'PENDING'; PAID: 'PAID'; FAILED: 'FAILED'; REFUNDED: 'REFUNDED'; CANCELLED: 'CANCELLED' };
  export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

  export const SignatureStatus: { PENDING: 'PENDING'; SENT: 'SENT'; SIGNED: 'SIGNED'; REFUSED: 'REFUSED'; EXPIRED: 'EXPIRED'; CANCELLED: 'CANCELLED' };
  export type SignatureStatus = 'PENDING' | 'SENT' | 'SIGNED' | 'REFUSED' | 'EXPIRED' | 'CANCELLED';

  export const NotificationScope: { SYSTEM: 'SYSTEM'; PROJECT: 'PROJECT'; CLIENT: 'CLIENT'; PAYMENT: 'PAYMENT'; SIGNATURE: 'SIGNATURE'; IA: 'IA' };
  export type NotificationScope = 'SYSTEM' | 'PROJECT' | 'CLIENT' | 'PAYMENT' | 'SIGNATURE' | 'IA';

  export const AuditAction: { CREATE: 'CREATE'; UPDATE: 'UPDATE'; DELETE: 'DELETE'; LOGIN: 'LOGIN'; EXPORT: 'EXPORT'; UPLOAD: 'UPLOAD'; SIGN: 'SIGN'; PAY: 'PAY' };
  export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT' | 'UPLOAD' | 'SIGN' | 'PAY';

  export const DemandeType: {
    POSE: 'POSE'; LIVRAISON: 'LIVRAISON'; SAV: 'SAV'; MESURE: 'MESURE';
    DEVIS: 'DEVIS'; CONFIRMATION_COMMANDE: 'CONFIRMATION_COMMANDE';
    COMPLEMENT: 'COMPLEMENT'; AUTRE: 'AUTRE';
  };
  export type DemandeType =
    | 'POSE' | 'LIVRAISON' | 'SAV' | 'MESURE' | 'DEVIS'
    | 'CONFIRMATION_COMMANDE' | 'COMPLEMENT' | 'AUTRE';

  export const DemandeStatus: {
    ENVOYEE: 'ENVOYEE'; VUE: 'VUE'; ACCEPTEE: 'ACCEPTEE'; REFUSEE: 'REFUSEE';
    EN_COURS: 'EN_COURS'; TERMINEE: 'TERMINEE'; ANNULEE: 'ANNULEE';
  };
  export type DemandeStatus =
    | 'ENVOYEE' | 'VUE' | 'ACCEPTEE' | 'REFUSEE'
    | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';

  export const IntervenantInvitationStatus: {
    PENDING: 'PENDING'; ACCEPTED: 'ACCEPTED'; REFUSED: 'REFUSED';
    EXPIRED: 'EXPIRED'; REVOKED: 'REVOKED';
  };
  export type IntervenantInvitationStatus =
    | 'PENDING' | 'ACCEPTED' | 'REFUSED' | 'EXPIRED' | 'REVOKED';

  // PrismaClient avec tous les modèles du schema
  export class PrismaClient {
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    $transaction<T>(fn: (prisma: Omit<PrismaClient, '$transaction' | '$connect' | '$disconnect'>) => Promise<T>): Promise<T>;
    $transaction<T extends any[]>(queries: [...T]): Promise<T>;

    readonly user: any;
    readonly workspace: any;
    readonly userWorkspace: any;
    readonly workspaceSettings: any;
    readonly client: any;
    readonly contact: any;
    readonly address: any;
    readonly project: any;
    readonly dossierDocument: any;
    readonly projectFolder: any;
    readonly projectStageData: any;
    readonly projectCustomFieldValue: any;
    readonly projectIntervenant: any;
    readonly projectStockItem: any;
    readonly storedFile: any;
    readonly document: any;
    readonly documentShare: any;
    readonly documentAuditLog: any;
    readonly intervenantInvitation: any;
    readonly demande: any;
    readonly demandeMessage: any;
    readonly demandeAttachment: any;
    readonly demandeStatusEvent: any;
    readonly event: any;
    readonly eventIntervenant: any;
    readonly reminder: any;
    readonly intervenant: any;
    readonly intervenantRequest: any;
    readonly intervenantResponse: any;
    readonly supplier: any;
    readonly stockItem: any;
    readonly supplierOrder: any;
    readonly supplierOrderLine: any;
    readonly quote: any;
    readonly quoteLine: any;
    readonly paymentRequest: any;
    readonly signatureRequest: any;
    readonly iaJob: any;
    readonly notification: any;
    readonly auditLog: any;
    readonly automationRule: any;
  }

  export namespace Prisma {
    export type TransactionClient = any;
    export type PrismaPromise<T> = Promise<T>;
    export function defineExtension(config: any): any;
  }
}
