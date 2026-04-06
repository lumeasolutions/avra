// ── Prisma Enums ────────────────────────────────────────────────────────────
// Ces enums sont définis dans prisma/schema.prisma et re-exportés ici
// pour éviter la dépendance à `prisma generate` au moment du build.

export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export type WorkspacePlan = 'STARTER' | 'PRO' | 'ENTERPRISE';

export type TradeType =
  | 'ARCHITECTE_INTERIEUR'
  | 'CUISINISTE'
  | 'MENUISIER'
  | 'AGENCEUR'
  | 'DECORATEUR'
  | 'PROMOTEUR'
  | 'AUTRE';

export type ClientType = 'PARTICULIER' | 'PROFESSIONNEL';

export type AddressType = 'BILLING' | 'SITE' | 'OTHER';

export type ProjectLifecycleStatus =
  | 'DRAFT'
  | 'VENTE'
  | 'SIGNE'
  | 'EN_CHANTIER'
  | 'RECEPTION'
  | 'SAV'
  | 'CLOTURE'
  | 'PERDU'
  | 'ARCHIVE';

export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type PipelineStatus =
  | 'LEAD'
  | 'PROSPECT'
  | 'DEVIS_ENVOYE'
  | 'NEGOCIATION'
  | 'GAGNE'
  | 'PERDU';

export type EventCalendarType = 'PERSONAL' | 'GESTION';

export type EventType =
  | 'REUNION'
  | 'VISITE_CHANTIER'
  | 'LIVRAISON'
  | 'INSTALLATION'
  | 'RDV_CLIENT'
  | 'RELANCE'
  | 'FORMATION'
  | 'DEPLACEMENT'
  | 'APPEL'
  | 'AUTRE';

export type IntervenantType =
  | 'POSEUR'
  | 'ELECTRICIEN'
  | 'MACON'
  | 'PEINTRE'
  | 'PLOMBIER'
  | 'CARRELEUR'
  | 'MENUISIER'
  | 'CHAUFFAGISTE'
  | 'SERRURIER'
  | 'GEOMETRE'
  | 'AUTRE';

export type IntervenantRequestStatus =
  | 'PENDING'
  | 'SENT'
  | 'ACCEPTED'
  | 'REFUSED'
  | 'CANCELLED';

export type DocumentKind =
  | 'PLAN'
  | 'DEVIS'
  | 'FACTURE'
  | 'CONTRAT'
  | 'BON_COMMANDE'
  | 'PHOTO'
  | 'IA_RENDER'
  | 'AUTRE';

export type FileMimeCategory =
  | 'IMAGE'
  | 'PDF'
  | 'DOCUMENT'
  | 'VIDEO'
  | 'ARCHIVE'
  | 'OTHER';

export type StockItemStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'OUT_OF_STOCK'
  | 'DISCONTINUED'
  | 'ORDERED';

export type StockCategory =
  | 'MEUBLE'
  | 'ELECTROMENAGER'
  | 'LUMINAIRE'
  | 'ACCESSOIRE'
  | 'MATERIAU'
  | 'TEXTILE'
  | 'SANITAIRE'
  | 'AUTRE';

export type IaJobStatus = 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED';

export type IaJobType =
  | 'PHOTOREALISM_ENHANCE'
  | 'COLOR_VARIATION'
  | 'EDIT'
  | 'PLAN_COMPARISON'
  | 'TEXT_ASSISTANT';

export type PaymentType = 'ACOMPTE' | 'SOLDE' | 'FACTURE' | 'AVOIR';

export type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED';

export type SignatureStatus =
  | 'PENDING'
  | 'SENT'
  | 'SIGNED'
  | 'REFUSED'
  | 'EXPIRED'
  | 'CANCELLED';

export type NotificationScope =
  | 'SYSTEM'
  | 'PROJECT'
  | 'CLIENT'
  | 'PAYMENT'
  | 'SIGNATURE'
  | 'IA';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'EXPORT'
  | 'UPLOAD'
  | 'SIGN'
  | 'PAY';
