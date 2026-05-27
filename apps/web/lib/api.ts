/**
 * Client API AVRA — appels vers le backend NestJS
 *
 * Sécurité : les requêtes incluent les cookies HttpOnly (credentials: 'include').
 * Le token JWT voyage dans un cookie HttpOnly défini par le serveur —
 * il n'est jamais lisible par JavaScript (protection XSS).
 * Le header Authorization n'est utilisé qu'en mode démo (pas de backend réel).
 */
// Tout est servi sur le même domaine Vercel : le frontend appelle /api/v1/*
// qui est routé par vercel.json vers la Serverless Function NestJS (apps/web/api/index.ts).
// Les routes Next.js Route Handlers (/api/ia/*, /api/signature, /api/save-image)
// restent gérées par Next.js. Le préfixe v1 évite tout conflit.
const _rawApiUrl = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
const API_BASE = typeof window !== 'undefined'
  ? '/api/v1'     // Same-origin → routé via vercel.json vers la Serverless Function NestJS
  : _rawApiUrl;   // SSR → même chemin relatif

// ── CSRF Token Management (CRIT-002, double-submit cookie) ────────────────
// The backend posts a NON-HttpOnly `csrf_token` cookie. For mutations we
// MUST mirror that cookie value in the `X-CSRF-Token` header. No server
// store, no rotation per request — the cookie is the single source of truth
// for the duration of its lifetime (24h). Stateless, serverless-friendly.

let currentCsrfToken: string | null = null;

/** Read csrf_token from document.cookie (browser-only). */
function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)csrf_token=([a-f0-9]+)/i);
  return m ? m[1] : null;
}

/** Capture the token from a response — kept for back-compat with header-based clients. */
function captureCsrfFromResponse(res: Response): void {
  const t = res.headers.get('x-csrf-token') ?? res.headers.get('X-CSRF-Token');
  if (t) currentCsrfToken = t;
  // Always re-sync from cookie if available (it's the canonical source).
  const fromCookie = readCsrfCookie();
  if (fromCookie) currentCsrfToken = fromCookie;
}

/** Bootstrap a CSRF cookie via the dedicated endpoint. */
async function bootstrapCsrfToken(): Promise<string | null> {
  // First try the cookie — maybe it's already there.
  const cookieToken = readCsrfCookie();
  if (cookieToken) {
    currentCsrfToken = cookieToken;
    return cookieToken;
  }
  try {
    const res = await fetch(`${API_BASE}/security/csrf-token`, {
      method: 'GET',
      credentials: 'include',
    });
    captureCsrfFromResponse(res);
    if (currentCsrfToken) return currentCsrfToken;
    if (res.ok) {
      const json = await res.json().catch(() => null);
      if (json?.token && typeof json.token === 'string') {
        currentCsrfToken = json.token;
        return currentCsrfToken;
      }
    }
  } catch {/* network — silently */}
  return null;
}

export function getCsrfToken(): string | null {
  return readCsrfCookie() ?? currentCsrfToken;
}

/** Récupère le token démo depuis le store Zustand (uniquement si pas de cookie serveur) */
function getDemoToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('avra-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Validation stricte de la structure pour éviter la pollution de prototype
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    const token = parsed?.state?.token;
    // S'assurer que le token est bien une chaîne, pas un objet malveillant
    if (typeof token !== 'string' || token.length === 0) return null;
    return token;
  } catch {
    return null;
  }
}

// ── Déduplication du refresh token ──────────────────────────────────────────
// Plusieurs requêtes 401 simultanées ne doivent déclencher qu'UN seul appel /auth/refresh.
// De plus, un backoff 5s après échec empêche la boucle serrée qui saturait la Serverless Function.
let refreshInFlight: Promise<boolean> | null = null;
let lastRefreshFailedAt = 0;
const REFRESH_BACKOFF_MS = 5_000;

/** Redirige vers /login en cas de session définitivement perdue. Idempotent
 *  (ne redirige pas si on est déjà sur /login ou /register). */
let sessionExpiredHandled = false;
function handleSessionExpired() {
  if (sessionExpiredHandled) return;
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/rejoindre') || path === '/') return;
  sessionExpiredHandled = true;
  // Purge le state Zustand auth pour ne pas rester bloqué dans un état "logged-in"
  try {
    const raw = localStorage.getItem('avra-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state) {
        parsed.state.token = null;
        parsed.state.user = null;
        localStorage.setItem('avra-auth', JSON.stringify(parsed));
      }
    }
    document.cookie = 'logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  } catch {/* noop */}
  // Redirection avec un flag pour afficher un message UX
  window.location.href = `/login?reason=session-expired&from=${encodeURIComponent(path)}`;
}

async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  if (Date.now() - lastRefreshFailedAt < REFRESH_BACKOFF_MS) return false;

  refreshInFlight = (async () => {
    // ── CROSS-TAB DEDUPLICATION (27/05/2026) ──────────────────────────
    // Cf lib/refreshLock.ts. Si un autre onglet vient de rafraichir,
    // notre cookie est deja a jour, on saute. Si un autre onglet est en
    // train de rafraichir, on attend son resultat.
    try {
      const lock = await import('./refreshLock');
      if (lock.wasRecentlyRefreshed()) return true;
      if (lock.isAnotherTabRefreshing()) {
        const ok = await lock.waitForOtherTabRefresh();
        return ok;
      }
      if (!lock.tryAcquireLock()) {
        const ok = await lock.waitForOtherTabRefresh();
        return ok;
      }
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({}),
        });
        if (res.ok) {
          lock.markRefreshSuccess();
          return true;
        }
        // 401 : retry 1 fois apres 2s avant d'abandonner
        if (res.status === 401) {
          lock.releaseLock();
          await new Promise((r) => setTimeout(r, 2000));
          if (lock.wasRecentlyRefreshed()) return true;
          const retry = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({}),
          });
          if (retry.ok) {
            lock.markRefreshSuccess();
            return true;
          }
        } else {
          lock.releaseLock();
        }
        lastRefreshFailedAt = Date.now();
        return false;
      } catch {
        lock.releaseLock();
        lastRefreshFailedAt = Date.now();
        return false;
      }
    } catch {
      // Fallback sans lock (si l'import dynamique echoue, tres rare)
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({}),
        });
        if (!res.ok) { lastRefreshFailedAt = Date.now(); return false; }
        return true;
      } catch {
        lastRefreshFailedAt = Date.now();
        return false;
      }
    } finally {
      // Libere le verrou apres un court moment pour permettre un nouveau refresh en cas de besoin
      setTimeout(() => { refreshInFlight = null; }, 100);
    }
  })();

  return refreshInFlight;
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string | null; _retried?: boolean; _csrfRetried?: boolean } = {},
): Promise<T> {
  const { token = getDemoToken(), _retried, _csrfRetried, ...init } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };

  // Le header Authorization n'est utilisé qu'en fallback mode démo
  // En production, le cookie HttpOnly est envoyé automatiquement
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // CSRF (double-submit): mirror the csrf_token cookie into the header.
  const method = (init.method ?? 'GET').toUpperCase();
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const isAuthPath = path.startsWith('/auth/'); // @SkipCsrf — login/register/refresh
  if (isMutation && !isAuthPath && !headers['X-CSRF-Token']) {
    let token = readCsrfCookie() ?? currentCsrfToken;
    if (!token) token = await bootstrapCsrfToken();
    if (token) headers['X-CSRF-Token'] = token;
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include', // 🔒 Envoie les cookies HttpOnly automatiquement
  });

  // Capture le nouveau token CSRF expose par le serveur
  captureCsrfFromResponse(res);

  // Handle 401 — essayer de rafraîchir le token (une seule fois, pas de boucle)
  if (res.status === 401 && !_retried && !path.startsWith('/auth/')) {
    const ok = await refreshAccessToken();
    if (!ok) {
      // Refresh impossible → session morte → redirection /login
      handleSessionExpired();
      throw new Error('Session expirée');
    }
    // Nouveau cookie access_token défini par le serveur — relancer la requête UNE seule fois
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });
    captureCsrfFromResponse(res);
    if (res.status === 401) {
      // Même après refresh, toujours 401 → vraie session morte
      handleSessionExpired();
      throw new Error('Session expirée');
    }
  }

  // Handle 403 CSRF — refresh le token et retry une seule fois
  if (res.status === 403 && !_csrfRetried && isMutation && !isAuthPath) {
    const errBody = await res.clone().json().catch(() => null) as { message?: string } | null;
    const msg = (errBody?.message ?? '').toLowerCase();
    if (msg.includes('csrf')) {
      currentCsrfToken = null;
      const fresh = await bootstrapCsrfToken();
      if (fresh) {
        return api<T>(path, { ...options, _csrfRetried: true });
      }
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'Erreur API');
  }
  return res.json();
}

export const authApi = {
  login: (email: string, password: string) =>
    fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        // NestJS validation errors return message as an array — join for display
        const msg = Array.isArray(err.message)
          ? err.message.join(', ')
          : (err.message ?? 'Erreur de connexion');
        throw new Error(msg);
      }
      return res.json() as Promise<{ user: object }>;
    }),

  register: (email: string, password: string, workspaceName: string, firstName?: string, lastName?: string) =>
    api<{ userId: string; workspaceId: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, workspaceName, firstName, lastName }),
      token: null,
    }),

  me: () => api<{ id: string; email: string; role: string; workspaceId: string }>('/auth/me', { method: 'GET' }),

  logout: () =>
    fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).then(() => undefined),
};

/**
 * Upload fichier (multipart) vers l'API.
 * - Envoie le cookie HttpOnly via `credentials: 'include'`
 * - Fallback Bearer token (mode démo / prod sans cookie encore posé)
 * - Sur 401 : tente un refresh puis rejoue la requête UNE fois
 *   (aligné sur le comportement de `api()`)
 */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  opts: { _csrfRetried?: boolean } = {},
): Promise<T> {
  const token = getDemoToken();
  const buildHeaders = (csrf: string | null): Record<string, string> => {
    const h: Record<string, string> = {};
    if (token) h['Authorization'] = `Bearer ${token}`;
    if (csrf) h['X-CSRF-Token'] = csrf;
    return h;
  };

  // Ensure a CSRF cookie exists before the upload.
  let csrf = readCsrfCookie() ?? currentCsrfToken;
  if (!csrf && !path.startsWith('/auth/')) {
    csrf = await bootstrapCsrfToken();
  }

  let res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers: buildHeaders(csrf),
  });
  captureCsrfFromResponse(res);

  if (res.status === 401) {
    const ok = await refreshAccessToken();
    if (!ok) {
      handleSessionExpired();
      throw new Error('Session expirée');
    }
    csrf = readCsrfCookie() ?? currentCsrfToken;
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: buildHeaders(csrf),
    });
    captureCsrfFromResponse(res);
    if (res.status === 401) {
      handleSessionExpired();
      throw new Error('Session expirée');
    }
  }

  // Retry sur 403 CSRF
  if (res.status === 403 && !opts._csrfRetried) {
    const errBody = await res.clone().json().catch(() => null) as { message?: string } | null;
    if ((errBody?.message ?? '').toLowerCase().includes('csrf')) {
      currentCsrfToken = null;
      const fresh = await bootstrapCsrfToken();
      if (fresh) {
        return apiUpload<T>(path, formData, { _csrfRetried: true });
      }
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'Erreur upload');
  }
  return res.json();
}
