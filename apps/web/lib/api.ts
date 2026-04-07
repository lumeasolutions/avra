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

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token = getDemoToken(), ...init } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };

  // Le header Authorization n'est utilisé qu'en fallback mode démo
  // En production, le cookie HttpOnly est envoyé automatiquement
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include', // 🔒 Envoie les cookies HttpOnly automatiquement
  });

  // Handle 401 — essayer de rafraîchir le token
  if (res.status === 401) {
    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Le cookie refresh_token est envoyé automatiquement
        body: JSON.stringify({}),
      });
      if (refreshRes.ok) {
        // Nouveau cookie access_token défini par le serveur — relancer la requête
        res = await fetch(`${API_BASE}${path}`, {
          ...init,
          headers,
          credentials: 'include',
        });
      } else {
        throw new Error('Unauthorized');
      }
    } catch {
      throw new Error('Unauthorized');
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
        throw new Error(err.message ?? 'Erreur de connexion');
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

/** Upload fichier (multipart) vers l'API */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    body: formData,
    credentials: 'include', // 🔒 Cookie HttpOnly envoyé automatiquement
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'Erreur upload');
  }
  return res.json();
}
