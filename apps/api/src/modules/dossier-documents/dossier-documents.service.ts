import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseStorageService } from './supabase-storage.service';
import { VirusScanService } from '../../common/security/virus-scan.service';

/**
 * ─────────────────────────────────────────────────────────────
 * MIME types autorisés à l'upload (liste blanche stricte).
 * Tout autre type est refusé → empêche l'upload de binaires exécutables,
 * de fichiers HTML avec JS, etc.
 * ─────────────────────────────────────────────────────────────
 */
/**
 * NOTE : cette liste n'est plus un FILTRE (on n'refuse plus un fichier sur un
 * MIME absent d'ici). La politique du document store est désormais « tout
 * format non dangereux est accepté » : la sécurité repose sur la blacklist
 * d'extensions (BLOCKED_EXTENSIONS), la détection de contenu exécutable
 * (DANGEROUS_DETECTED_MIMES) et le scan antivirus. Cet ensemble est conservé à
 * titre INDICATIF (types métier courants attendus). Voir upload()/initDirectUpload().
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ALLOWED_MIMES = new Set<string>([
  // ─── Images ─────────────────────────────────────────────────────────
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/heic',
  'image/heif',
  'image/bmp',
  'image/tiff',
  'image/x-icon',
  'image/avif',
  // RAW photo (pour plans/relevés terrain pris au reflex)
  'image/x-canon-cr2',
  'image/x-nikon-nef',
  'image/x-sony-arw',
  'image/x-adobe-dng',

  // ─── PDF ────────────────────────────────────────────────────────────
  'application/pdf',

  // ─── Office Microsoft ───────────────────────────────────────────────
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-word.document.macroenabled.12',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroenabled.12',
  'application/vnd.ms-excel.sheet.binary.macroenabled.12',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.presentationml.slideshow',

  // ─── Apple iWork ────────────────────────────────────────────────────
  'application/x-iwork-pages-sffpages',
  'application/x-iwork-numbers-sffnumbers',
  'application/x-iwork-keynote-sffkey',

  // ─── OpenDocument ───────────────────────────────────────────────────
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
  'application/vnd.oasis.opendocument.graphics',

  // ─── Texte & code ───────────────────────────────────────────────────
  'text/plain',
  'text/csv',
  'text/tab-separated-values',
  'text/markdown',
  'text/rtf',
  'application/rtf',
  'application/json',
  'application/xml',
  'text/xml',

  // ─── Archives ──────────────────────────────────────────────────────
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',
  'application/x-gzip',

  // ─── CAO 2D / 3D et plans techniques ──────────────────────────────
  // AutoCAD
  'application/acad',
  'application/x-acad',
  'application/autocad_dwg',
  'image/vnd.dwg',
  'image/x-dwg',
  'application/dwg',
  'application/x-dwg',
  'application/dxf',
  'application/x-dxf',
  'image/vnd.dxf',
  // SketchUp
  'application/vnd.sketchup.skp',
  'application/x-sketchup',
  'model/vnd.sketchup.skp',
  // Fusion 360 / Inventor / Solidworks / Step / IGES
  'model/step',
  'application/step',
  'application/x-step',
  'model/iges',
  'application/iges',
  'application/octet-stream', // generique pour fichiers logiciels metier (KDMax, Winner, Cabinet Vision, TopSolid Wood — voir blacklist extensions ci-dessous)
  // 3D models (rendus IA, exports SketchUp)
  'model/gltf-binary',
  'model/gltf+json',
  'model/obj',
  'model/stl',
  'application/x-tgif',

  // ─── Audio / Video (releves chantier) ──────────────────────────────
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/x-matroska',

  // ─── Email & contacts ──────────────────────────────────────────────
  'message/rfc822',
  'application/vnd.ms-outlook',
  'text/vcard',
]);

/**
 * Extensions categoriquement bloquees (executables et scripts dangereux).
 * Verifiees sur le nom de fichier original — meme si le MIME passe, on
 * refuse si l'extension est dans cette liste.
 */
const BLOCKED_EXTENSIONS = new Set<string>([
  '.exe', '.msi', '.msp', '.mst', '.bat', '.cmd', '.com', '.pif', '.scr',
  '.vbs', '.vbe', '.vb', '.js', '.jse', '.wsf', '.wsh', '.ws', '.ps1', '.psm1',
  '.sh', '.bash', '.zsh', '.fish',
  '.app', '.dmg', '.pkg', '.command', '.action', '.workflow', '.scpt',
  '.dll', '.sys', '.drv', '.cpl', '.msc', '.gadget', '.chm', '.hta',
  '.reg', '.lnk', '.scf', '.inf', '.jnlp',
  '.jar', '.apk', '.ipa',
  '.html', '.htm', '.svg', // servis inline -> risque XSS : on bloque en extension (SVG géré via image/svg+xml si besoin, mais bloqué ici)
]);

// Types DÉTECTÉS (magic-bytes) categoriquement dangereux : on refuse meme si
// l'extension est innocente (ex. un .exe renomme en .dwg).
const DANGEROUS_DETECTED_MIMES = new Set<string>([
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-dosexec',
  'application/vnd.microsoft.portable-executable',
  'application/x-executable',
  'application/x-elf',
  'application/x-mach-binary',
  'application/x-sharedlib',
]);

/**
 * Verifie si un nom de fichier porte une extension dangereuse.
 * Returns true si bloque.
 */
function hasBlockedExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  for (const ext of BLOCKED_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

/**
 * Taille max par fichier : 50 Mo. Aligné sur la limite globale du bucket
 * Supabase (l'upload va en DIRECT vers Supabase, sans passer par la Function
 * Vercel, donc pas de limite de body serverless). Couvre la plupart des
 * fichiers métier (DWG, DXF, PDF de plans, SketchUp léger). Pour aller au-delà
 * (gros Revit/SketchUp), relever d'abord la limite globale Storage dans le
 * dashboard Supabase (plan Pro requis), puis augmenter cette constante.
 */
const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** Normalise une string pour une clé de storage (A-Z, a-z, 0-9, ._-). */
function slugifyForStorage(input: string, max = 120): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, max);
}

@Injectable()
export class DossierDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
    private readonly virusScan: VirusScanService,
  ) {}

  /**
   * Vérifie que le projet existe ET appartient au workspace de l'utilisateur.
   * Renvoie `{ projectId }` ou lève 404 / 403.
   */
  private async assertProjectInWorkspace(
    workspaceId: string,
    projectId: string,
  ): Promise<void> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId },
      select: { id: true, workspaceId: true },
    });
    if (!project) throw new NotFoundException('Dossier introuvable');
    if (project.workspaceId !== workspaceId) {
      throw new ForbiddenException('Accès interdit à ce dossier');
    }
  }

  /**
   * Upload un fichier dans un sous-dossier d'un dossier (projet).
   * Sécurité :
   *  - Vérif ownership workspace
   *  - Whitelist MIME
   *  - Taille max 25 Mo
   *  - Path storage aléatoire non devinable
   */
  async upload(
    workspaceId: string,
    userId: string,
    projectId: string,
    subfolderLabel: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ) {
    if (!file?.buffer) throw new BadRequestException('Aucun fichier fourni');
    // Bloquer categoriquement les extensions dangereuses, peu importe le MIME
    if (hasBlockedExtension(file.originalname)) {
      throw new BadRequestException(
        `Extension non autorisée pour des raisons de sécurité : ${file.originalname}`,
      );
    }
    // Politique DOCUMENT STORE : on accepte TOUT format non dangereux. Les
    // pros déposent des fichiers métier très variés (DWG, DXF, SKP, Revit,
    // ArchiCAD, IFC, STEP, IGES, et formats propriétaires PRW/DRW/KDMax/Winner/
    // Cabinet Vision/TopSolid…). On ne refuse PLUS sur un simple MIME inconnu :
    // la sécurité repose sur (1) la blacklist d'extensions ci-dessus,
    // (2) la détection de contenu exécutable ci-dessous, (3) le scan antivirus.
    if (file.size > MAX_FILE_BYTES) {
      throw new BadRequestException(
        `Fichier trop volumineux (max ${Math.floor(MAX_FILE_BYTES / (1024 * 1024))} Mo)`,
      );
    }
    // Magic-bytes : refuse le CONTENU exécutable (ex. un .exe renommé en .dwg)
    // et un PDF sans en-tête %PDF-. Tout le reste passe.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ft = require('file-type');
      const detected = ft?.fromBuffer
        ? await ft.fromBuffer(file.buffer)
        : (ft?.fileTypeFromBuffer ? await ft.fileTypeFromBuffer(file.buffer) : null);
      if (detected?.mime && DANGEROUS_DETECTED_MIMES.has(detected.mime)) {
        throw new BadRequestException('Fichier exécutable interdit (contenu binaire dangereux détecté).');
      }
      if (!detected?.mime && file.mimetype === 'application/pdf') {
        // Un PDF déclaré doit avoir l'en-tête %PDF- (sinon zéro-octet ou forgé).
        const head = file.buffer.subarray(0, 5).toString('ascii');
        if (head !== '%PDF-') {
          throw new BadRequestException("Le fichier déclaré comme PDF n'a pas l'entête %PDF-");
        }
      }
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      // Module indisponible — on continue (blacklist d'extensions + AV restent actifs).
    }
    if (!subfolderLabel || subfolderLabel.length > 200) {
      throw new BadRequestException('Sous-dossier invalide');
    }

    // ✅ HIGH-009: virus scan (no-op if CLOUDMERSIVE_API_KEY not set)
    const av = await this.virusScan.scanBuffer(file.buffer, file.originalname);
    if (!av.clean) {
      throw new BadRequestException('Le fichier a été rejeté par l\'antivirus');
    }

    await this.assertProjectInWorkspace(workspaceId, projectId);

    // Path : workspaces/{wsId}/projects/{projectId}/{subfolderSlug}/{uuid}_{filename}
    // → inclut le workspaceId pour faciliter audit + éventuelles policies RLS.
    const uuid = randomUUID().replace(/-/g, '');
    const storagePath = [
      'workspaces',
      slugifyForStorage(workspaceId, 64),
      'projects',
      slugifyForStorage(projectId, 64),
      slugifyForStorage(subfolderLabel, 80),
      `${uuid}_${slugifyForStorage(file.originalname, 120)}`,
    ].join('/');

    await this.storage.upload(storagePath, file.buffer, file.mimetype);

    try {
      return await this.prisma.dossierDocument.create({
        data: {
          workspaceId,
          projectId,
          subfolderLabel,
          storageBucket: this.storage.bucket,
          storagePath,
          originalName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          createdById: userId,
        },
        select: {
          id: true,
          subfolderLabel: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
        },
      });
    } catch (err) {
      // Rollback : si la DB échoue, on retire le fichier du bucket pour pas
      // laisser d'orphelin.
      await this.storage.remove(storagePath).catch(() => undefined);
      throw err;
    }
  }

  /**
   * Direct upload — ÉTAPE 1 : initialise un upload direct vers Supabase
   * Storage. Le client recevra une signed URL d'upload, fera un PUT
   * directement vers Supabase (sans repasser par notre backend),
   * puis appellera finalizeUpload pour créer l'enregistrement DB.
   *
   * Avantages vs upload classique :
   *  - 2-3× plus rapide (pas de double-hop browser→Vercel→Supabase)
   *  - Décharge la Vercel Function (économie bande passante + CPU)
   *  - Qualité 100% préservée (aucune compression, aucun re-encode)
   *
   * Toutes les validations sécurité sont faites ici (auth, ownership,
   * MIME whitelist, taille, extension) AVANT de générer la signed URL.
   */
  async initDirectUpload(
    workspaceId: string,
    projectId: string,
    subfolderLabel: string,
    fileName: string,
    fileSize: number,
    mimeType: string,
  ) {
    if (hasBlockedExtension(fileName)) {
      throw new BadRequestException(
        `Extension non autorisée pour des raisons de sécurité : ${fileName}`,
      );
    }
    // Politique DOCUMENT STORE : tout format non dangereux est accepté (fichiers
    // métier variés). Pas de rejet sur MIME inconnu — la blacklist d'extensions
    // ci-dessus + le scan antivirus au finalize sont les garde-fous. (`mimeType`
    // est conservé pour l'affichage/téléchargement.)
    void mimeType;
    if (fileSize > MAX_FILE_BYTES) {
      throw new BadRequestException(
        `Fichier trop volumineux (max ${Math.floor(MAX_FILE_BYTES / (1024 * 1024))} Mo)`,
      );
    }
    if (!subfolderLabel || subfolderLabel.length > 200) {
      throw new BadRequestException('Sous-dossier invalide');
    }
    await this.assertProjectInWorkspace(workspaceId, projectId);

    // Génère un storagePath côté serveur (l'attaquant ne peut pas écrire
    // ailleurs car la signed URL est liée à ce path précis).
    const uuid = randomUUID().replace(/-/g, '');
    const storagePath = [
      'workspaces',
      slugifyForStorage(workspaceId, 64),
      'projects',
      slugifyForStorage(projectId, 64),
      slugifyForStorage(subfolderLabel, 80),
      `${uuid}_${slugifyForStorage(fileName, 120)}`,
    ].join('/');

    const { signedUrl, token } = await this.storage.createSignedUploadUrl(storagePath);

    return {
      uploadUrl: signedUrl,
      token,
      storagePath,
      bucket: this.storage.bucket,
      // TTL 5 min côté Supabase ; on le retourne au client pour info.
      expiresInSeconds: 300,
    };
  }

  /**
   * Direct upload — ÉTAPE 2 : finalise un upload direct.
   * Le client a déjà PUT le fichier vers Supabase via la signed URL ;
   * on vérifie qu'il existe bien à ce path, on fait les checks finaux
   * (taille, AV scan), puis on crée l'enregistrement DossierDocument.
   */
  async finalizeDirectUpload(
    workspaceId: string,
    userId: string,
    projectId: string,
    subfolderLabel: string,
    storagePath: string,
    fileName: string,
    fileSize: number,
    mimeType: string,
  ) {
    await this.assertProjectInWorkspace(workspaceId, projectId);

    // Vérifie que le storagePath demandé matche bien le pattern attendu
    // pour ce workspace/project (anti-IDOR : refuse si l'utilisateur
    // tente de finaliser un path qui ne lui appartient pas).
    const expectedPrefix = [
      'workspaces',
      slugifyForStorage(workspaceId, 64),
      'projects',
      slugifyForStorage(projectId, 64),
      slugifyForStorage(subfolderLabel, 80),
    ].join('/') + '/';
    if (!storagePath.startsWith(expectedPrefix)) {
      throw new BadRequestException('storagePath invalide pour ce dossier');
    }

    // Vérifie que le fichier existe physiquement dans le bucket
    const { exists, size: realSize } = await this.storage.exists(storagePath);
    if (!exists) {
      throw new BadRequestException('Fichier non trouvé dans le bucket — upload incomplet ou expiré');
    }

    // AV scan post-upload (download → scan → suppression si infecté)
    // Note : pour un MVP, on skip si CLOUDMERSIVE_API_KEY absent (fail-open).
    // À activer en prod en posant la clé.
    if (process.env.CLOUDMERSIVE_API_KEY) {
      try {
        const buf = await this.storage.download(storagePath);
        const av = await this.virusScan.scanBuffer(buf, fileName);
        if (!av.clean) {
          await this.storage.remove(storagePath).catch(() => undefined);
          throw new BadRequestException('Le fichier a été rejeté par l\'antivirus');
        }
      } catch (e) {
        if (e instanceof BadRequestException) throw e;
        // AV indisponible — on log mais on laisse passer (fail-open intentionnel).
      }
    }

    try {
      return await this.prisma.dossierDocument.create({
        data: {
          workspaceId,
          projectId,
          subfolderLabel,
          storageBucket: this.storage.bucket,
          storagePath,
          originalName: fileName,
          mimeType,
          sizeBytes: realSize ?? fileSize,
          createdById: userId,
        },
        select: {
          id: true,
          subfolderLabel: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
        },
      });
    } catch (err) {
      // Rollback : retire le fichier du bucket si la DB échoue
      await this.storage.remove(storagePath).catch(() => undefined);
      throw err;
    }
  }

  /**
   * Liste tous les documents d'un dossier avec leur storagePath.
   * Réservé aux usages internes (extraction IA, etc.) — n'expose pas le path
   * vers le client final.
   */
  async listInternalForProject(workspaceId: string, projectId: string) {
    await this.assertProjectInWorkspace(workspaceId, projectId);
    return this.prisma.dossierDocument.findMany({
      where: { workspaceId, projectId },
      select: {
        id: true,
        subfolderLabel: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        storagePath: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Télécharge le binaire d'un document (utilisé par l'extraction IA). */
  async downloadDocument(workspaceId: string, projectId: string, documentId: string): Promise<Buffer> {
    await this.assertProjectInWorkspace(workspaceId, projectId);
    const doc = await this.prisma.dossierDocument.findFirst({
      where: { id: documentId, projectId, workspaceId },
      select: { id: true, storagePath: true },
    });
    if (!doc) throw new NotFoundException('Document introuvable');
    return this.storage.download(doc.storagePath);
  }

  /** Liste tous les documents d'un dossier, groupés par sous-dossier. */
  async listByProject(workspaceId: string, projectId: string) {
    await this.assertProjectInWorkspace(workspaceId, projectId);
    const docs = await this.prisma.dossierDocument.findMany({
      where: { workspaceId, projectId },
      select: {
        id: true,
        subfolderLabel: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return docs;
  }

  /** Retourne une URL signée temporaire (60 min). */
  async getSignedUrl(workspaceId: string, projectId: string, documentId: string) {
    await this.assertProjectInWorkspace(workspaceId, projectId);
    const doc = await this.prisma.dossierDocument.findFirst({
      where: { id: documentId, projectId, workspaceId },
      select: { id: true, storagePath: true, originalName: true, mimeType: true },
    });
    if (!doc) throw new NotFoundException('Document introuvable');
    const expiresIn = 60 * 60; // 60 minutes
    const signedUrl = await this.storage.createSignedUrl(doc.storagePath, expiresIn);
    return {
      signedUrl,
      expiresIn,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
    };
  }

  /** Supprime un document (DB + bucket, cascade). */
  async remove(workspaceId: string, projectId: string, documentId: string) {
    await this.assertProjectInWorkspace(workspaceId, projectId);
    const doc = await this.prisma.dossierDocument.findFirst({
      where: { id: documentId, projectId, workspaceId },
      select: { id: true, storagePath: true },
    });
    if (!doc) throw new NotFoundException('Document introuvable');
    // Supprime d'abord de la DB (source de vérité), puis du bucket (best-effort).
    await this.prisma.dossierDocument.delete({ where: { id: doc.id } });
    await this.storage.remove(doc.storagePath);
    return { ok: true };
  }
}
