import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentKind } from '../../prisma-enums';
import * as fs from 'fs/promises';
import { PathTraversalGuard } from '../../common/security/path-traversal.guard';

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
