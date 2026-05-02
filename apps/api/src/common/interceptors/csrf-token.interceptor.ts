import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * CsrfTokenInterceptor
 * ---------------------------------------------------------------------------
 * In stateless double-submit mode (see CsrfGuard), the canonical token is the
 * cookie itself. As a convenience for clients that prefer reading a header
 * (and to keep the legacy contract intact), we still mirror the active token
 * in `X-CSRF-Token` on every response.
 * ---------------------------------------------------------------------------
 */
@Injectable()
export class CsrfTokenInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<{ csrfToken?: string }>();
    const response = ctx.getResponse<{ setHeader: (n: string, v: string) => void }>();

    if (request.csrfToken) {
      response.setHeader('X-CSRF-Token', request.csrfToken);
    }
    return next.handle();
  }
}
