import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
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
  ExtractionImagePayload,
} from './extraction.types';

const MAX_TEXT_PER_DOC = 20_000; // ~5k tokens max par doc pour limiter le budget
const MAX_TOTAL_TEXT = 120_000; // budget total (~30k tokens)
const MAX_DOCS = 30;
const MAX_IMAGES = 8; // budget images Vision (~85-2720 tokens / img selon detail)
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB, au-dela on skip (limite API OpenAI)

type DocKind = 'pdf' | 'image' | 'docx' | 'spreadsheet' | 'text' | 'unsupported';

/**
 * ExtractionService — extrait dates butoires + commandes + livraisons depuis
 * les documents d'un dossier via OpenAI gpt-4o (Vision multimodal).
 *
 * Formats supportes (27/05/2026 — V2 multi-format) :
 *   - PDF      (pdf-parse)
 *   - Image    (PNG, JPG, JPEG, WEBP, GIF — Vision base64 inline)
 *   - DOCX     (mammoth — Word moderne)
 *   - XLSX/XLS (exceljs — Excel)
 *   - CSV/TXT  (decodage UTF-8 direct)
 *
 * Flux :
 *   1. Verification ownership workspace
 *   2. Liste des documents internes (avec storagePath)
 *   3. Telechargement + extraction texte OU encodage base64 (images)
 *   4. Construction d'un payload mixte (texte + image_url)
 *   5. Appel OpenAI gpt-4o (Vision) avec response_format json_schema strict
 *   6. Validation + retour
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
    scope: 'achat' | 'vente' | 'all' = 'all',
  ): Promise<ExtractionResult> {
    if (!isOpenAIConfigured()) {
      throw new ServiceUnavailableException(
        "Service d'extraction IA non configure (OPENAI_API_KEY manquant)",
      );
    }

    const project = await this.prisma.project.findFirst({
      where: { id: dossierId, workspaceId },
      select: { id: true, name: true },
    });
    if (!project) throw new NotFoundException('Dossier introuvable');

    let docs = await this.dossierDocs.listInternalForProject(workspaceId, dossierId);
    if (!docs.length) throw new BadRequestException('Aucun document analysable dans ce dossier');

    // Restriction par scope (21/06/2026) : permet aux boutons de la fiche dossier
    // de cibler precisement les bons sous-dossiers.
    //  - achat : factures des sous-dossiers d'approvisionnement
    //  - vente : devis du DERNIER OPTION / PROJET / APD
    if (scope === 'achat') {
      docs = docs.filter((d) =>
        /commande|facture|achat|fournisseur/i.test(d.subfolderLabel || ''),
      );
      if (!docs.length) {
        throw new BadRequestException(
          "Aucune facture d'achat trouvee dans les sous-dossiers Commandes / Confirmations fournisseurs",
        );
      }
    } else if (scope === 'vente') {
      const devisRe = /option|projet|apd/i;
      const candidates = docs.filter((d) => devisRe.test(d.subfolderLabel || ''));
      if (!candidates.length) {
        throw new BadRequestException(
          'Aucun devis trouve dans un sous-dossier OPTION / PROJET / APD',
        );
      }
      const numOf = (s: string) => {
        const m = (s || '').match(/\d+/g);
        return m ? Math.max(...m.map(Number)) : 0;
      };
      const bestNum = Math.max(...candidates.map((d) => numOf(d.subfolderLabel)));
      docs = candidates.filter((d) => numOf(d.subfolderLabel) === bestNum);
    }

    const { textPayload, imagePayload, stats } = await this.buildPayload(
      workspaceId,
      dossierId,
      docs,
    );

    if (!textPayload.length && !imagePayload.length) {
      throw new BadRequestException(
        'Aucun document exploitable trouve (formats supportes : PDF, images PNG/JPG/WEBP, DOCX, XLSX, CSV, TXT)',
      );
    }

    this.logger.log(
      `Extraction payload: ${textPayload.length} doc(s) texte, ${imagePayload.length} image(s) - kinds=${JSON.stringify(stats)}`,
    );

    // Fiabilité : si plusieurs documents, on analyse CHAQUE document dans son
    // propre appel IA (en parallèle) puis on fusionne. L'IA ne peut plus en
    // oublier un quand on lui en donne plusieurs d'un coup (plusieurs factures).
    const chunks: Array<{ text: ExtractionDocumentPayload[]; images: ExtractionImagePayload[] }> = [
      ...textPayload.map((t) => ({ text: [t], images: [] as ExtractionImagePayload[] })),
      ...imagePayload.map((im) => ({ text: [] as ExtractionDocumentPayload[], images: [im] })),
    ];
    if (chunks.length <= 1 || chunks.length > 10) {
      // 0-1 document : un seul appel suffit. >10 : on evite trop d'appels paralleles.
      return this.callOpenAI(textPayload, imagePayload);
    }
    const settled = await Promise.allSettled(
      chunks.map((c) => this.callOpenAI(c.text, c.images)),
    );
    return this.mergeExtractionResults(settled);
  }

  // -----------------------------------------------------------------

  private classifyDoc(d: { mimeType: string; originalName: string }): DocKind {
    const mime = (d.mimeType || '').toLowerCase();
    const name = (d.originalName || '').toLowerCase();
    if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
    if (mime.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(name)) return 'image';
    if (mime.includes('wordprocessingml') || name.endsWith('.docx')) return 'docx';
    if (mime.includes('spreadsheetml') || /\.(xlsx|xls)$/i.test(name)) return 'spreadsheet';
    if (mime.startsWith('text/') || /\.(csv|txt|md)$/i.test(name)) return 'text';
    return 'unsupported';
  }

  private resolveImageMime(d: { mimeType: string; originalName: string }): string {
    const mime = (d.mimeType || '').toLowerCase();
    if (mime.startsWith('image/')) {
      return mime === 'image/jpg' ? 'image/jpeg' : mime;
    }
    const name = (d.originalName || '').toLowerCase();
    if (name.endsWith('.png')) return 'image/png';
    if (name.endsWith('.webp')) return 'image/webp';
    if (name.endsWith('.gif')) return 'image/gif';
    return 'image/jpeg';
  }

  private async buildPayload(
    workspaceId: string,
    dossierId: string,
    docs: Array<{
      id: string;
      subfolderLabel: string;
      originalName: string;
      mimeType: string;
      storagePath: string;
      sizeBytes?: number | null;
    }>,
  ): Promise<{
    textPayload: ExtractionDocumentPayload[];
    imagePayload: ExtractionImagePayload[];
    stats: Record<DocKind, number>;
  }> {
    const stats: Record<DocKind, number> = {
      pdf: 0, image: 0, docx: 0, spreadsheet: 0, text: 0, unsupported: 0,
    };

    const classified = docs.slice(0, MAX_DOCS).map((d) => ({
      ...d,
      kind: this.classifyDoc(d),
    }));
    for (const c of classified) stats[c.kind]++;

    const textPayload: ExtractionDocumentPayload[] = [];
    const imagePayload: ExtractionImagePayload[] = [];
    let totalChars = 0;
    let imageCount = 0;

    // pdf-parse est CJS - import dynamique pour ne pas casser le build webpack
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse');

    for (const doc of classified) {
      if (totalChars >= MAX_TOTAL_TEXT && imageCount >= MAX_IMAGES) break;
      if (doc.kind === 'unsupported') continue;

      try {
        const buffer = await this.dossierDocs.downloadDocument(
          workspaceId,
          dossierId,
          doc.id,
        );

        if (doc.kind === 'pdf') {
          if (totalChars >= MAX_TOTAL_TEXT) continue;
          const parsed = await pdfParse(buffer);
          const text = this.clampText((parsed?.text ?? '').trim(), MAX_TEXT_PER_DOC, MAX_TOTAL_TEXT - totalChars);
          if (!text) continue;
          totalChars += text.length;
          textPayload.push({ subfolder: doc.subfolderLabel, docName: doc.originalName, type: 'pdf', text });
        } else if (doc.kind === 'docx') {
          if (totalChars >= MAX_TOTAL_TEXT) continue;
          const raw = await this.extractDocxText(buffer);
          const text = this.clampText(raw, MAX_TEXT_PER_DOC, MAX_TOTAL_TEXT - totalChars);
          if (!text) continue;
          totalChars += text.length;
          textPayload.push({ subfolder: doc.subfolderLabel, docName: doc.originalName, type: 'docx', text });
        } else if (doc.kind === 'spreadsheet') {
          if (totalChars >= MAX_TOTAL_TEXT) continue;
          const raw = await this.extractSpreadsheetText(buffer);
          const text = this.clampText(raw, MAX_TEXT_PER_DOC, MAX_TOTAL_TEXT - totalChars);
          if (!text) continue;
          totalChars += text.length;
          textPayload.push({ subfolder: doc.subfolderLabel, docName: doc.originalName, type: 'xlsx', text });
        } else if (doc.kind === 'text') {
          if (totalChars >= MAX_TOTAL_TEXT) continue;
          const raw = buffer.toString('utf-8');
          const text = this.clampText(raw, MAX_TEXT_PER_DOC, MAX_TOTAL_TEXT - totalChars);
          if (!text) continue;
          totalChars += text.length;
          textPayload.push({ subfolder: doc.subfolderLabel, docName: doc.originalName, type: 'text', text });
        } else if (doc.kind === 'image') {
          if (imageCount >= MAX_IMAGES) continue;
          if (buffer.length > MAX_IMAGE_BYTES) {
            this.logger.warn(`Skip image trop volumineuse ${doc.originalName} (${buffer.length} bytes)`);
            continue;
          }
          const mime = this.resolveImageMime(doc);
          const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
          imagePayload.push({ subfolder: doc.subfolderLabel, docName: doc.originalName, mime, dataUrl });
          imageCount++;
        }
      } catch (err) {
        this.logger.warn(
          `Skipping doc ${doc.originalName} (parse error): ${(err as Error).message}`,
        );
      }
    }

    return { textPayload, imagePayload, stats };
  }

  private clampText(raw: string, perDoc: number, remainingBudget: number): string {
    if (!raw) return '';
    let text = raw;
    if (text.length > perDoc) text = text.slice(0, perDoc) + '\n[...troncature]';
    if (text.length > remainingBudget) text = text.slice(0, Math.max(0, remainingBudget)) + '\n[...troncature budget]';
    return text;
  }

  private async extractDocxText(buffer: Buffer): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return (result?.value ?? '').trim();
    } catch (err) {
      this.logger.warn(`mammoth extract failed: ${(err as Error).message}`);
      return '';
    }
  }

  private async extractSpreadsheetText(buffer: Buffer): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ExcelJS = require('exceljs');
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      const lines: string[] = [];
      wb.eachSheet((sheet: any) => {
        lines.push(`# Feuille: ${sheet.name}`);
        sheet.eachRow((row: any) => {
          const vals: string[] = [];
          row.eachCell({ includeEmpty: false }, (cell: any) => {
            const v = cell.value;
            if (v === null || v === undefined) {
              vals.push('');
            } else if (typeof v === 'object' && 'richText' in v) {
              vals.push(v.richText.map((r: any) => r.text).join(''));
            } else if (typeof v === 'object' && 'result' in v) {
              vals.push(String(v.result ?? ''));
            } else if (v instanceof Date) {
              vals.push(v.toISOString().slice(0, 10));
            } else {
              vals.push(String(v));
            }
          });
          if (vals.some((x) => x.trim() !== '')) lines.push(vals.join('\t'));
        });
        lines.push('');
      });
      return lines.join('\n').trim();
    } catch (err) {
      this.logger.warn(`exceljs extract failed: ${(err as Error).message}`);
      return '';
    }
  }

  /** Fusionne les resultats d'extractions document-par-document (mode parallele). */
  private mergeExtractionResults(
    settled: PromiseSettledResult<ExtractionResult>[],
  ): ExtractionResult {
    const ok = settled
      .filter((s): s is PromiseFulfilledResult<ExtractionResult> => s.status === 'fulfilled')
      .map((s) => s.value);
    if (ok.length === 0) {
      const firstErr = settled.find((s) => s.status === 'rejected') as PromiseRejectedResult | undefined;
      throw firstErr?.reason ?? new InternalServerErrorException('Extraction IA echouee');
    }
    const dateKeys: Array<keyof ExtractionResult['datesButoires']> = [
      'suiviChantier', 'releveMesures', 'planTechnique', 'fichePose', 'permisConstruire',
    ];
    const datesButoires = {} as ExtractionResult['datesButoires'];
    for (const k of dateKeys) {
      datesButoires[k] = ok.map((r) => r.datesButoires?.[k]).find((v) => v != null) ?? null;
    }
    const commandes = ok.flatMap((r) => r.commandes ?? []);
    const livraisons = ok.flatMap((r) => r.livraisons ?? []);
    const confiance = ok.reduce((s, r) => s + (r.confiance ?? 0), 0) / ok.length;
    const notes = ok.map((r) => r.notes).filter(Boolean).join(' - ').slice(0, 500);
    return { datesButoires, commandes, livraisons, confiance, notes };
  }

  private async callOpenAI(
    textPayload: ExtractionDocumentPayload[],
    imagePayload: ExtractionImagePayload[],
  ): Promise<ExtractionResult> {
    const client = getOpenAIClient();
    if (!client) throw new ServiceUnavailableException('OpenAI non disponible');

    const model = process.env.OPENAI_MODEL_PREMIUM || 'gpt-4o';

    const userContent: Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } }
    > = [];

    const textIntro = textPayload.length > 0
      ? `Voici les documents textuels du dossier (PDF / DOCX / XLSX / TXT) :\n${JSON.stringify(textPayload)}`
      : `Aucun document textuel - analyse les images suivantes :`;
    userContent.push({ type: 'text', text: textIntro });

    for (const img of imagePayload) {
      userContent.push({
        type: 'text',
        text: `Image : "${img.docName}" (sous-dossier : ${img.subfolder})`,
      });
      userContent.push({
        type: 'image_url',
        image_url: { url: img.dataUrl, detail: 'auto' },
      });
    }

    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
          { role: 'user', content: userContent as any },
        ],
        response_format: { type: 'json_schema', json_schema: EXTRACTION_JSON_SCHEMA as any },
        max_tokens: 4096,
        temperature: 0.1,
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) throw new InternalServerErrorException("Reponse OpenAI vide");

      // M10 : détecter une réponse coupée par max_tokens (sinon JSON.parse échoue
      // et renvoie « Format de réponse IA invalide », message trompeur).
      if (response.choices?.[0]?.finish_reason === 'length') {
        this.logger.error('Extraction tronquée : max_tokens atteint (finish_reason=length)');
        throw new InternalServerErrorException(
          'Réponse IA tronquée : trop de contenu à analyser. Réduisez le nombre de documents.',
        );
      }

      let parsed: ExtractionResult;
      try {
        parsed = JSON.parse(content);
      } catch (err) {
        this.logger.error(`Failed to parse OpenAI extraction JSON: ${(err as Error).message}`);
        throw new InternalServerErrorException('Format de reponse IA invalide');
      }

      if (!parsed.datesButoires) throw new InternalServerErrorException('Schema invalide : datesButoires manquant');
      if (!Array.isArray(parsed.commandes)) parsed.commandes = [];
      if (!Array.isArray(parsed.livraisons)) parsed.livraisons = [];
      if (typeof parsed.confiance !== 'number') parsed.confiance = 0;
      if (typeof parsed.notes !== 'string') parsed.notes = '';

      const usage = response.usage;
      const inTokens = usage?.prompt_tokens ?? 0;
      const outTokens = usage?.completion_tokens ?? 0;
      const cost = (inTokens * 2.5 + outTokens * 10) / 1_000_000;

      this.logger.log(
        `Extraction OK : confiance=${parsed.confiance.toFixed(2)} dates=${
          Object.values(parsed.datesButoires).filter(Boolean).length
        }/5 commandes=${parsed.commandes.length} livraisons=${parsed.livraisons.length} ` +
          `textDocs=${textPayload.length} images=${imagePayload.length} tokens=${inTokens}/${outTokens} ~$${cost.toFixed(5)}`,
      );
      try {
        Sentry.addBreadcrumb({
          category: 'ai',
          type: 'info',
          level: 'info',
          message: 'extract-dossier',
          data: {
            model,
            input_tokens: inTokens,
            output_tokens: outTokens,
            estimated_cost_usd: Number(cost.toFixed(6)),
            confiance: parsed.confiance,
            dates_filled: Object.values(parsed.datesButoires).filter(Boolean).length,
            commandes_count: parsed.commandes.length,
            livraisons_count: parsed.livraisons.length,
            text_docs: textPayload.length,
            images: imagePayload.length,
          },
        });
      } catch {
        // Sentry non initialise en dev
      }

      return parsed;
    } catch (err: any) {
      if (err.status) throw err;
      this.logger.error('OpenAI extraction error:', err);
      throw new InternalServerErrorException(`Echec extraction IA : ${err?.message || 'erreur inconnue'}`);
    }
  }
}
