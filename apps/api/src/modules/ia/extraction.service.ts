import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DossierDocumentsService } from '../dossier-documents/dossier-documents.service';
import { getOpenAIClient, isOpenAIConfigured } from './openai-client';
import {
  EXTRACTION_SYSTEM_PROMPT,
  EXTRACTION_JSON_SCHEMA,
} from './extraction.prompt';
import type {
  ExtractionResult,
  ExtractionDocumentPayload,
} from './extraction.types';

const MAX_TEXT_PER_DOC = 20_000; // ~5k tokens max par doc pour limiter le budget
const MAX_TOTAL_TEXT = 120_000; // budget total (~30k tokens)
const MAX_DOCS = 30;

/**
 * ExtractionService — extrait dates butoires + commandes + livraisons depuis
 * les documents PDF d'un dossier via OpenAI gpt-4o avec response_format strict.
 *
 * Flux :
 *   1. Vérification ownership workspace
 *   2. Liste des documents internes (avec storagePath)
 *   3. Téléchargement + extraction texte (pdf-parse) pour chaque PDF
 *   4. Construction du payload structuré
 *   5. Appel OpenAI gpt-4o avec json_schema strict
 *   6. Validation et retour
 */
@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dossierDocs: DossierDocumentsService,
  ) {}

  async extractFromDossier(
    workspaceId: string,
    dossierId: string,
  ): Promise<ExtractionResult> {
    if (!isOpenAIConfigured()) {
      throw new ServiceUnavailableException(
        "Service d'extraction IA non configuré (OPENAI_API_KEY manquant)",
      );
    }

    // 1. Ownership
    const project = await this.prisma.project.findFirst({
      where: { id: dossierId, workspaceId },
      select: { id: true, name: true },
    });
    if (!project) {
      throw new NotFoundException('Dossier introuvable');
    }

    // 2. Liste des docs internes
    const docs = await this.dossierDocs.listInternalForProject(workspaceId, dossierId);
    if (!docs.length) {
      throw new BadRequestException('Aucun document analysable dans ce dossier');
    }

    // 3. Extraction texte des PDF (skip images / autres pour MVP)
    const payload = await this.buildPayload(workspaceId, dossierId, docs);
    if (!payload.length) {
      throw new BadRequestException(
        'Aucun document PDF exploitable trouvé dans ce dossier',
      );
    }

    // 4. Appel OpenAI
    return this.callOpenAI(payload);
  }

  // ─────────────────────────────────────────────────────────────────

  private async buildPayload(
    workspaceId: string,
    dossierId: string,
    docs: Array<{
      id: string;
      subfolderLabel: string;
      originalName: string;
      mimeType: string;
      storagePath: string;
    }>,
  ): Promise<ExtractionDocumentPayload[]> {
    const pdfs = docs
      .filter(
        (d) =>
          d.mimeType === 'application/pdf' ||
          d.originalName.toLowerCase().endsWith('.pdf'),
      )
      .slice(0, MAX_DOCS);

    if (!pdfs.length) return [];

    const result: ExtractionDocumentPayload[] = [];
    let totalChars = 0;

    // pdf-parse est CJS — import dynamique pour ne pas casser le build webpack
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse');

    for (const doc of pdfs) {
      if (totalChars >= MAX_TOTAL_TEXT) break;
      try {
        const buffer = await this.dossierDocs.downloadDocument(
          workspaceId,
          dossierId,
          doc.id,
        );
        const parsed = await pdfParse(buffer);
        let text: string = (parsed?.text ?? '').trim();
        if (!text) continue;
        if (text.length > MAX_TEXT_PER_DOC) {
          text = text.slice(0, MAX_TEXT_PER_DOC) + '\n[...troncature]';
        }
        // Garde-fou budget total
        const remaining = MAX_TOTAL_TEXT - totalChars;
        if (text.length > remaining) {
          text = text.slice(0, remaining) + '\n[...troncature budget]';
        }
        totalChars += text.length;
        result.push({
          subfolder: doc.subfolderLabel,
          docName: doc.originalName,
          text,
        });
      } catch (err) {
        this.logger.warn(
          `Skipping doc ${doc.originalName} (parse error): ${(err as Error).message}`,
        );
      }
    }

    return result;
  }

  private async callOpenAI(
    payload: ExtractionDocumentPayload[],
  ): Promise<ExtractionResult> {
    const client = getOpenAIClient();
    if (!client) {
      throw new ServiceUnavailableException('OpenAI non disponible');
    }

    const model = process.env.OPENAI_MODEL_PREMIUM || 'gpt-4o';
    const userPayload = JSON.stringify(payload);

    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
          { role: 'user', content: userPayload },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: EXTRACTION_JSON_SCHEMA as any,
        },
        max_tokens: 2048,
        temperature: 0.1,
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new InternalServerErrorException("Réponse OpenAI vide");
      }

      let parsed: ExtractionResult;
      try {
        parsed = JSON.parse(content);
      } catch (err) {
        this.logger.error(
          `Failed to parse OpenAI extraction JSON: ${(err as Error).message}`,
        );
        throw new InternalServerErrorException(
          'Format de réponse IA invalide',
        );
      }

      // Sanity-check minimal en plus du schema strict
      if (!parsed.datesButoires) {
        throw new InternalServerErrorException(
          'Schema invalide : datesButoires manquant',
        );
      }
      if (!Array.isArray(parsed.commandes)) parsed.commandes = [];
      if (!Array.isArray(parsed.livraisons)) parsed.livraisons = [];
      if (typeof parsed.confiance !== 'number') parsed.confiance = 0;
      if (typeof parsed.notes !== 'string') parsed.notes = '';

      const usage = response.usage;
      this.logger.log(
        `Extraction OK : confiance=${parsed.confiance.toFixed(2)} dates=${
          Object.values(parsed.datesButoires).filter(Boolean).length
        }/5 commandes=${parsed.commandes.length} livraisons=${
          parsed.livraisons.length
        } tokens=${usage?.prompt_tokens ?? '?'}/${usage?.completion_tokens ?? '?'}`,
      );

      return parsed;
    } catch (err: any) {
      // Si c'est déjà une exception NestJS, propager
      if (err.status) throw err;
      this.logger.error('OpenAI extraction error:', err);
      throw new InternalServerErrorException(
        `Échec extraction IA : ${err?.message || 'erreur inconnue'}`,
      );
    }
  }
}
