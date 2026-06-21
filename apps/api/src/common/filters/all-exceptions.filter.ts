import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Global Exception Filter
 *
 * Capture TOUTES les exceptions (HttpException + erreurs inattendues type
 * PrismaClientKnownRequestError, TypeError, ReferenceError, etc.) et :
 *  1. Log un diagnostic détaillé côté serveur (pour Vercel logs / Sentry).
 *     Les secrets (password, tokens) sont déjà filtrés par scrubForLog en amont.
 *  2. Renvoie une réponse JSON standard côté client, sans fuiter de stack trace.
 *
 * AVANT ce filtre, les erreurs non-HttpException renvoyaient un 500 générique
 * silencieux ("Internal server error") sans aucun log exploitable côté Vercel.
 * Cela rendait le debug d'un 500 prod quasi impossible.
 *
 * Ce filtre est branché globalement via APP_FILTER dans CommonModule.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Code Prisma (P2002, P2025, etc.) si l'erreur en porte un.
    const prismaCode = (exception as { code?: string })?.code;

    // Détermine le statut HTTP à renvoyer.
    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let clientMessage: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      clientMessage = exception.getResponse();
    } else if (typeof prismaCode === 'string' && prismaCode.startsWith('P')) {
      // Mappe les erreurs Prisma connues vers un statut HTTP correct.
      // On renvoie un message GÉNÉRIQUE (jamais le détail Prisma) au client.
      const mapped = mapPrismaError(prismaCode);
      if (mapped) {
        status = mapped.status;
        clientMessage = mapped.message;
      }
    }

    // Construit un message de log technique pour le serveur, qui inclut :
    //  - la méthode + URL,
    //  - le nom de la classe d'erreur,
    //  - le message,
    //  - le code Prisma (P2022, P2002, etc.) si applicable,
    //  - la stack trace.
    const errorName = exception instanceof Error ? exception.constructor.name : typeof exception;
    const errorMessage = exception instanceof Error ? exception.message : String(exception);
    const stack = exception instanceof Error ? exception.stack : undefined;

    // Log compact (1 ligne) — facile à grep dans les logs Vercel.
    const summary = `[${request.method} ${request.url}] ${status} ${errorName}: ${errorMessage}${
      prismaCode ? ` (code=${prismaCode})` : ''
    }`;

    if (status >= 500) {
      this.logger.error(summary);
      if (stack) this.logger.error(stack);
    } else if (status >= 400) {
      this.logger.warn(summary);
    } else {
      this.logger.log(summary);
    }

    // Renvoie une réponse propre au client.
    if (typeof clientMessage === 'string') {
      response.status(status).json({
        statusCode: status,
        message: clientMessage,
      });
    } else {
      // HttpException avec un objet (ex: ValidationPipe) → on garde la forme.
      response.status(status).json(clientMessage);
    }
  }
}

/**
 * Mappe un code d'erreur Prisma connu vers un statut HTTP + un message client
 * GÉNÉRIQUE (on ne fuite jamais le détail Prisma, qui peut révéler des noms de
 * colonnes/contraintes). Retourne null pour les codes non mappés (→ 500).
 */
function mapPrismaError(code: string): { status: number; message: string } | null {
  switch (code) {
    case 'P2002': // Unique constraint violation
      return { status: HttpStatus.CONFLICT, message: 'Cette ressource existe déjà.' };
    case 'P2025': // Record not found (update/delete)
      return { status: HttpStatus.NOT_FOUND, message: 'Ressource introuvable.' };
    case 'P2003': // Foreign key constraint failed
      return { status: HttpStatus.BAD_REQUEST, message: 'Référence invalide.' };
    case 'P2000': // Value too long for column
      return { status: HttpStatus.BAD_REQUEST, message: 'Une valeur dépasse la taille autorisée.' };
    case 'P2014': // Required relation violation
      return { status: HttpStatus.BAD_REQUEST, message: 'Relation requise manquante ou invalide.' };
    default:
      return null;
  }
}
