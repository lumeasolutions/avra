import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseStorageService } from './supabase-storage.service';

/**
 * ─────────────────────────────────────────────────────────────
 * MIME types autorisés à l'upload (liste blanche stricte).
 * Tout autre type est refusé → empêche l'upload de binaires exécutables,
 * de fichiers HTML avec JS, etc.
 * ─────────────────────────────────────────────────────────────
 */
const ALLOWED_MIMES = new Set<string>([
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/heic',
  'image/heif',
  // PDF
  'application/pdf',
  // Office
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // OpenDocument
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  // Texte
  'text/plain',
  'text/csv',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
  // CAO / plans
  'application/acad',
  'application/x-acad',
  'image/vnd.dwg',
  'application/dxf',
]);

/** Taille max par fichier : 25 Mo. */
const MAX_FILE_BYTES = 25 * 1024 * 1024;

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
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      throw new BadRequestException(`Type de fichier non autorisé : ${file.mimetype}`);
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new BadRequestException(
        `Fichier trop volumineux (max ${Math.floor(MAX_FILE_BYTES / (1024 * 1024))} Mo)`,
      );
    }
    if (!subfolderLabel || subfolderLabel.length > 200) {
      throw new BadRequestException('Sous-dossier invalide');
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
