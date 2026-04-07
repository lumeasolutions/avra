import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { YouSignService } from './yousign.service';
import { CreateSignatureDto } from './dto/create-signature.dto';

@Injectable()
export class SignatureService {
  private readonly logger = new Logger(SignatureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly youSignService: YouSignService
  ) {}

  async findByProject(workspaceId: string, projectId: string, page = 1, pageSize = 50) {
    // OPTIMISATION: Ajouter pagination et select ciblé
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.signatureRequest.findMany({
        where: { workspaceId, projectId },
        select: {
          id: true,
          status: true,
          provider: true,
          signingUrl: true,
          signedAt: true,
          createdAt: true,
          updatedAt: true,
          documentTitle: true,
          signerEmail: true,
          signerName: true,
          signerPhone: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.signatureRequest.count({ where: { workspaceId, projectId } }),
    ]);

    return { data, total, page, pageSize };
  }

  async findByWorkspace(workspaceId: string, page = 1, pageSize = 50) {
    // OPTIMISATION: Ajouter pagination et select ciblé
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.signatureRequest.findMany({
        where: { workspaceId },
        select: {
          id: true,
          status: true,
          provider: true,
          signingUrl: true,
          signedAt: true,
          createdAt: true,
          updatedAt: true,
          documentTitle: true,
          signerEmail: true,
          signerName: true,
          signerPhone: true,
          project: { select: { id: true, name: true, reference: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.signatureRequest.count({ where: { workspaceId } }),
    ]);

    return { data, total, page, pageSize };
  }

  async create(workspaceId: string, dto: CreateSignatureDto) {
    let signingUrl: string | null = null;
    let providerRef: string | null = null;
    let status = 'PENDING';
    let yousignDocId: string | null = null;
    let yousignSignerId: string | null = null;

    // Try YouSign flow if enabled
    if (this.youSignService.isEnabled()) {
      try {
        // Step 1: Create signature request
        const documentTitle = dto.documentTitle || 'Document à signer';
        const yousignRequest = await this.youSignService.createSignatureRequest(
          documentTitle,
          'email'
        );
        providerRef = yousignRequest.id;

        // Step 2: Upload document if provided as base64
        let documentId: string | undefined;
        if (dto.documentBase64) {
          try {
            const pdfBuffer = Buffer.from(dto.documentBase64, 'base64');
            const fileName = `${documentTitle}.pdf`;
            const uploadedDoc = await this.youSignService.uploadDocument(
              yousignRequest.id,
              pdfBuffer,
              fileName
            );
            documentId = uploadedDoc.id;
            yousignDocId = documentId;
          } catch (uploadError) {
            this.logger.error(`Failed to upload document to YouSign: ${uploadError}`);
            // Continue without document, can be added later
          }
        }

        // Step 3: Add signer if all required info provided
        if (documentId && dto.signerEmail && dto.signerFirstName && dto.signerLastName) {
          try {
            const signerResponse = await this.youSignService.addSigner(
              yousignRequest.id,
              documentId,
              {
                firstName: dto.signerFirstName,
                lastName: dto.signerLastName,
                email: dto.signerEmail,
                phone: dto.signerPhone,
              }
            );
            yousignSignerId = signerResponse.id;
            signingUrl = signerResponse.signature_link || null;
          } catch (signerError) {
            this.logger.error(`Failed to add signer to YouSign: ${signerError}`);
          }
        }

        // Step 4: Activate the request
        try {
          const activatedRequest = await this.youSignService.activateRequest(
            yousignRequest.id
          );

          // Get signing link from activated request if not already set
          if (!signingUrl && activatedRequest.signers && activatedRequest.signers.length > 0) {
            signingUrl = activatedRequest.signers[0].signature_link || null;
          }

          status = 'SENT';
        } catch (activateError) {
          this.logger.error(`Failed to activate YouSign request: ${activateError}`);
        }
      } catch (yousignError) {
        this.logger.error(`YouSign integration error: ${yousignError}`);
        // Fallback to local saving without YouSign
      }
    }

    // Save to database
    const data: any = {
      workspaceId,
      projectId: dto.projectId,
      provider: 'yousign',
      status: status as any,
      signingUrl,
      providerRef,
      documentTitle: dto.documentTitle,
      signerEmail: dto.signerEmail,
      signerName: dto.signerFirstName ? `${dto.signerFirstName} ${dto.signerLastName}` : undefined,
      signerPhone: dto.signerPhone,
      message: dto.message,
      yousignDocId,
      yousignSignerId,
    };

    return this.prisma.signatureRequest.create({
      data,
      select: {
        id: true,
        status: true,
        provider: true,
        signingUrl: true,
        createdAt: true,
        project: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(workspaceId: string, id: string) {
    // OPTIMISATION: Utiliser select au lieu de include
    return this.prisma.signatureRequest.findFirst({
      where: { id, workspaceId },
      select: {
        id: true,
        status: true,
        provider: true,
        providerRef: true,
        signingUrl: true,
        signedAt: true,
        createdAt: true,
        updatedAt: true,
        project: {
          select: { id: true, name: true, reference: true },
        },
      },
    });
  }

  async updateStatus(workspaceId: string, id: string, status: string) {
    // OPTIMISATION: Fusionner vérification et update
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.signatureRequest.findFirst({ where: { id, workspaceId } });
      if (!existing) return null;
      return tx.signatureRequest.update({
        where: { id },
        data: { status: status as any, signedAt: status === 'SIGNED' ? new Date() : null },
        select: {
          id: true,
          status: true,
          signedAt: true,
          updatedAt: true,
        },
      });
    });
  }

  async remove(workspaceId: string, id: string) {
    // OPTIMISATION: Fusionner vérification et suppression
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.signatureRequest.findFirst({ where: { id, workspaceId } });
      if (!existing) return null;
      return tx.signatureRequest.delete({ where: { id } });
    });
  }
}
