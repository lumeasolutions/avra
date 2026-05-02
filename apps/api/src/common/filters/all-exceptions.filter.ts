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

    // Détermine le statut HTTP à renvoyer.
    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let clientMessage: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      clientMessage = exception.getResponse();
    }

    // Construit un message de log technique pour le serveur, qui inclut :
    //  - la méthode + URL,
    //  - le nom de la classe d'erreur,
    //  - le message,
    //  - le code Prisma (P2022, P2002, etc.) si applicable,
    //  - la stack trace.
    const errorName = exception instanceof Error ? exception.constructor.name : typeof exception;
    const errorMessage = exception instanceof Error ? exception.message : String(exception);
    const prismaCode = (exception as { code?: string })?.code;
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
