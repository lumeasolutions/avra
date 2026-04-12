import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IaJobType } from '../../prisma-enums';
import { DocumentKind, FileMimeCategory } from '../../prisma-enums';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { QwenService } from './qwen.service';
import { FalService } from './fal.service';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');

// 🔒 Types de fichiers autorisés — les autres sont rejetés
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',        // .xlsx
  'text/plain',
  'text/csv',
]);

// Magic numbers (premiers octets) pour vérifier le vrai type du fichier
const MAGIC_SIGNATURES: { mime: string; bytes: number[]; offset?: number }[] = [
  { mime: 'image/jpeg',       bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png',        bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/gif',        bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp',       bytes: [0x52, 0x49, 0x46, 0x46] },
  { mime: 'application/pdf',  bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
];

function verifyMagicNumber(buffer: Buffer, declaredMime: string): boolean {
  const sig = MAGIC_SIGNATURES.find((s) => s.mime === declaredMime);
  if (!sig) return true; // Pas de signature connue → on fait confiance au MIME déclaré
  return sig.bytes.every((b, i) => buffer[i] === b);
}

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class IaService {
  private readonly logger = new Logger(IaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qwen: QwenService,
    private readonly fal: FalService,
  ) {}

  async uploadFile(
    workspaceId: string,
    userId: string,
    file: UploadedFile,
    projectId: string,
    title: string,
  ) {
    // 🔒 Validation du type MIME déclaré
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      throw new BadRequestException(
        `Type de fichier non autorisé : ${file.mimetype}. Types acceptés : images, PDF, DOCX, XLSX, CSV.`,
      );
    }

    // 🔒 Vérification du magic number (contenu réel du fichier)
    if (!verifyMagicNumber(file.buffer, file.mimetype)) {
      throw new BadRequestException(
        'Le contenu du fichier ne correspond pas au type déclaré. Fichier refusé.',
      );
    }

    const ext = path.extname(file.originalname) || '.bin';
    const storageKey = `workspaces/${workspaceId}/ia/${randomUUID()}${ext}`;
    const dir = path.join(UPLOAD_DIR, path.dirname(storageKey));
    const fullPath = path.join(UPLOAD_DIR, storageKey);
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, file.buffer);
    } catch (fsError) {
      this.logger.error('Filesystem write error:', fsError);
      throw new BadRequestException('Impossible d\'écrire le fichier sur le serveur. Vérifiez les permissions ou l\'espace disque.');
    }

    const mimeCategory = file.mimetype.startsWith('image/') ? FileMimeCategory.IMAGE : FileMimeCategory.OTHER;
    const stored = await this.prisma.storedFile.create({
      data: {
        workspaceId,
        uploadedById: userId,
        storageKey,
        originalName: file.originalname,
        mimeType: file.mimetype,
        mimeCategory,
        extension: ext.slice(1),
        sizeBytes: file.size,
      },
    });

    const doc = await this.prisma.document.create({
      data: {
        workspaceId,
        projectId,
        storedFileId: stored.id,
        createdById: userId,
        title: title || file.originalname,
        kind: DocumentKind.IA_RENDER,
      },
      include: { storedFile: true },
    });
    return { documentId: doc.id, storedFileId: stored.id, document: doc };
  }

  async createJob(
    workspaceId: string,
    userId: string,
    projectId: string | null,
    type: IaJobType,
    payload: { prompt?: string; sourceDocumentId?: string; style?: string },
  ) {
    return this.prisma.iaJob.create({
      data: {
        workspaceId,
        createdById: userId,
        projectId,
        type,
        status: 'QUEUED',
        prompt: payload.prompt,
        sourceDocumentId: payload.sourceDocumentId,
      },
    });
  }

  async findJobsByWorkspace(workspaceId: string, projectId?: string, page = 1, pageSize = 50) {
    // OPTIMISATION: Ajouter pagination et select pour éviter charger inutilement
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.iaJob.findMany({
        where: { workspaceId, ...(projectId && { projectId }) },
        select: {
          id: true,
          type: true,
          status: true,
          prompt: true,
          errorMessage: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
          // Charger seulement les champs nécessaires des documents
          sourceDocument: {
            select: {
              id: true,
              title: true,
              storedFile: {
                select: { id: true, originalName: true, publicUrl: true },
              },
            },
          },
          resultDocument: {
            select: {
              id: true,
              title: true,
              storedFile: {
                select: { id: true, originalName: true, publicUrl: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.iaJob.count({ where: { workspaceId, ...(projectId && { projectId }) } }),
    ]);

    return { data, total, page, pageSize };
  }

  async getJob(workspaceId: string, id: string) {
    // OPTIMISATION: Utiliser select pour charger seulement les données nécessaires
    return this.prisma.iaJob.findFirst({
      where: { id, workspaceId },
      select: {
        id: true,
        type: true,
        status: true,
        prompt: true,
        errorMessage: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        sourceDocument: {
          select: {
            id: true,
            title: true,
            kind: true,
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
        },
        resultDocument: {
          select: {
            id: true,
            title: true,
            kind: true,
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
        },
      },
    });
  }

  /**
   * Génère un rendu photoréaliste via fal.ai FLUX
   * Utilisé pour le IA Studio (kitchen renderings)
   */
  async generateRealisticRender(prompt: string): Promise<{ imageUrl: string | null; error?: string }> {
    try {
      const imageUrl = await this.fal.generateRealisticRender(prompt);
      return { imageUrl };
    } catch (error) {
      this.logger.error('Realistic render error:', error);
      return { imageUrl: null, error: (error as Error).message };
    }
  }

  /**
   * Colorise une image via fal.ai FLUX img2img
   * Utilisé pour le coloriste (kitchen colors adjustment)
   */
  async colorizeImage(
    sourceImageUrl: string,
    prompt: string,
  ): Promise<{ imageUrl: string | null; error?: string }> {
    try {
      const imageUrl = await this.fal.colorizeImage(sourceImageUrl, prompt);
      return { imageUrl };
    } catch (error) {
      this.logger.error('Colorize error:', error);
      return { imageUrl: null, error: (error as Error).message };
    }
  }

  /**
   * Retourne le statut des services IA
   */
  getIaStatus(): {
    qwenEnabled: boolean;
    falEnabled: boolean;
  } {
    return {
      qwenEnabled: this.qwen.isEnabled(),
      falEnabled: this.fal.isEnabled(),
    };
  }
}
