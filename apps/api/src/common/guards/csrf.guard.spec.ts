import { CsrfGuard, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from './csrf.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';

/**
 * Minimal unit tests for the stateless double-submit CsrfGuard.
 * No NestJS test bed needed — guard takes Reflector via constructor.
 */
describe('CsrfGuard (stateless double-submit)', () => {
  let guard: CsrfGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new CsrfGuard(reflector);
  });

  function makeCtx(opts: {
    method: string;
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
    skip?: boolean;
  }): ExecutionContext {
    const request: any = {
      method: opts.method,
      cookies: opts.cookies ?? {},
      get: (name: string) => opts.headers?.[name.toLowerCase()] ?? '',
    };
    const setCookieCalls: unknown[] = [];
    const response: any = {
      cookie: (...args: unknown[]) => setCookieCalls.push(args),
    };
    return {
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  it('allows GET without any token (and provisions cookie)', () => {
    const ctx = makeCtx({ method: 'GET' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects POST without X-CSRF-Token header', () => {
    const ctx = makeCtx({
      method: 'POST',
      cookies: { [CSRF_COOKIE_NAME]: 'a'.repeat(64) },
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('rejects POST when header does not match cookie', () => {
    const ctx = makeCtx({
      method: 'POST',
      cookies: { [CSRF_COOKIE_NAME]: 'a'.repeat(64) },
      headers: { [CSRF_HEADER_NAME]: 'b'.repeat(64) },
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('accepts POST when header matches cookie', () => {
    const tok = 'c'.repeat(64);
    const ctx = makeCtx({
      method: 'POST',
      cookies: { [CSRF_COOKIE_NAME]: tok },
      headers: { [CSRF_HEADER_NAME]: tok },
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects POST when invalid cookie format triggers fresh issuance + missing header', () => {
    // Malformed cookie → guard issues a fresh token, but no header is sent → reject.
    const ctx = makeCtx({
      method: 'POST',
      cookies: { [CSRF_COOKIE_NAME]: 'not-hex-64' },
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
