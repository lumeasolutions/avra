import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentKind, FileMimeCategory } from '../../prisma-enums';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { PathTraversalGuard } from '../../common/security/path-traversal.guard';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');

const ADMIN_ALLOWED_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
]);

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProject(
    workspaceId: string,
    projectId: string,
    folderId?: string,
    page = 1,
    pageSize = 50,
  ) {
    const where: { projectId: string; workspaceId: string; folderId?: string | null } = {
      projectId,
      workspaceId,
    };
    if (folderId !== undefined) where.folderId = folderId ?? null;

    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        // OPTIMISATION: Utiliser select au lieu de include pour charger seulement les champs nécessaires
        select: {
          id: true,
          title: true,
          kind: true,
          visibilityClient: true,
          version: true,
          createdAt: true,
          updatedAt: true,
          storedFile: {
            select: {
              id: true,
              originalName: true,
              mimeType: true,
              mimeCategory: true,
              sizeBytes: true,
              publicUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.document.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async create(
    workspaceId: string,
    projectId: string,
    createdById: string,
    data: { title: string; kind: DocumentKind; storedFileId: string; folderId?: string },
  ) {
    // SECURITY: Validate storedFileId to prevent path traversal
    PathTraversalGuard.validateStorageKey(data.storedFileId);

    return this.prisma.document.create({
      data: { ...data, workspaceId, projectId, createdById },
      select: {
        id: true,
        title: true,
        kind: true,
        version: true,
        createdAt: true,
        storedFile: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            publicUrl: true,
          },
        },
      },
    });
  }

  /* ── ADMIN DOCS ── */

  async findAdminDocs(workspaceId: string, category?: string) {
    const where: any = { workspaceId, projectId: null };
    if (category && category !== 'all') where.folderId = category;

    const data = await this.prisma.document.findMany({
      where,
      select: {
        id: true,
        title: true,
        kind: true,
        createdAt: true,
        folderId: true,
        storedFile: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            mimeCategory: true,
            sizeBytes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return data;
  }

  async uploadAdminDoc(
    workspaceId: string,
    userId: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    category: string,
    title?: string,
  ) {
    if (!ADMIN_ALLOWED_MIMES.has(file.mimetype)) {
      throw new BadRequestException(`Type de fichier non autorisé : ${file.mimetype}`);
    }

    const ext = path.extname(file.originalname) || '.bin';
    const storageKey = `workspaces/${workspaceId}/admin/${randomUUID()}${ext}`;
    const dir = path.join(UPLOAD_DIR, path.dirname(storageKey));
    const fullPath = path.join(UPLOAD_DIR, storageKey);

    fsSync.mkdirSync(dir, { recursive: true });
    fsSync.writeFileSync(fullPath, file.buffer);

    const mimeCategory = file.mimetype.startsWith('image/')
      ? FileMimeCategory.IMAGE
      : file.mimetype === 'application/pdf'
      ? FileMimeCategory.PDF
      : FileMimeCategory.DOCUMENT;

    const stored = await this.prisma.storedFile.create({
      data: {
        workspaceId, uploadedById: userId, storageKey,
        originalName: file.originalname, mimeType: file.mimetype,
        mimeCategory, extension: ext.slice(1), sizeBytes: file.size,
      },
    });

    const doc = await this.prisma.document.create({
      data: {
        workspaceId, storedFileId: stored.id, createdById: userId,
        projectId: null,
        folderId: category !== 'all' ? category : null,
        title: title || file.originalname,
        kind: DocumentKind.CONTRAT,
      },
      select: {
        id: true, title: true, kind: true, folderId: true, createdAt: true,
        storedFile: { select: { id: true, originalName: true, mimeType: true, mimeCategory: true, sizeBytes: true } },
      },
    });
    return doc;
  }

  async downloadAdminDoc(workspaceId: string, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, workspaceId, projectId: null },
      include: { storedFile: true },
    });
    if (!doc?.storedFile) throw new NotFoundException('Document introuvable');
    PathTraversalGuard.validateStorageKey(doc.storedFile.storageKey);
    const filePath = path.join(UPLOAD_DIR, doc.storedFile.storageKey);
    return { filePath, originalName: doc.storedFile.originalName, mimeType: doc.storedFile.mimeType };
  }

  async remove(workspaceId: string, id: string) {
    const existing = await this.prisma.document.findFirst({
      where: { id, workspaceId },
      include: { storedFile: true },
    });
    if (!existing) return null;

    // ✅ Use transaction to ensure document and storedFile are deleted together
    return this.prisma.$transaction(async (tx) => {
      // Delete the document
      const deleted = await tx.document.delete({ where: { id } });

      // Delete the stored file (both DB and filesystem)
      if (existing.storedFile) {
        await tx.storedFile.delete({ where: { id: existing.storedFile.id } });

        // 🔒 SECURITY: Validate storage key before deleting from filesystem
        try {
          const uploadDir = process.env.UPLOAD_DIR ?? '/tmp/uploads';
          PathTraversalGuard.validateStorageKey(existing.storedFile.storageKey);
          const filePath = PathTraversalGuard.validateUploadPath(existing.storedFile.storageKey, uploadDir);
          await fs.unlink(filePath).catch(() => {
            // Ignore if file doesn't exist
          });
        } catch (error) {
          // Log error but don't fail the transaction
          console.error('Failed to delete file from disk:', error);
        }
      }

      return deleted;
    });
  }
}
