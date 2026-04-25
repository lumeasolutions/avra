import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * CsrfTokenInterceptor
 * ---------------------------------------------------------------------------
 * Expose le token CSRF généré par le `CsrfGuard` (qui le pose sur
 * `request.csrfToken` après chaque GET sûr OU après une mutation validée)
 * en réponse HTTP via le header `X-CSRF-Token`.
 *
 * Le frontend lit ce header sur chaque réponse, le stocke en mémoire et
 * le renvoie sur la prochaine requête mutante (POST/PUT/DELETE/PATCH).
 *
 * Sans cet interceptor, le token reste enfermé dans `request` et le
 * frontend n'a aucun moyen de le récupérer → toutes les mutations
 * échouent avec "Missing CSRF token in X-CSRF-Token header".
 *
 * Sécurité :
 *  - Le header `X-CSRF-Token` doit être déclaré dans `exposedHeaders`
 *    de la config CORS (sinon le browser cache la valeur côté JS).
 *  - Le token est rotatif (one-time use côté guard) : chaque mutation
 *    invalide l'ancien token et en regénère un nouveau qu'on expose ici.
 * ---------------------------------------------------------------------------
 */
@Injectable()
export class CsrfTokenInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    // Avant la réponse : si le guard a déjà posé un token (cas GET safe),
    // on l'expose. Cela couvre le cas du bootstrap initial.
    const earlyToken = (request as { csrfToken?: string }).csrfToken;
    if (earlyToken) response.setHeader('X-CSRF-Token', earlyToken);

    return next.handle().pipe(
      tap(() => {
        // Après la réponse (cas mutation validée) : un nouveau token a été
        // regénéré par le guard via `generateAndStoreToken`, on le pose.
        const lateToken = (request as { csrfToken?: string }).csrfToken;
        if (lateToken && lateToken !== earlyToken) {
          response.setHeader('X-CSRF-Token', lateToken);
        }
      }),
    );
  }
}
