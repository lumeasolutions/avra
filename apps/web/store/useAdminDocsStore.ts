import { create } from 'zustand';
import { api, apiUpload } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AdminDocCreatedBy {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface AdminDoc {
  id: string;
  title: string;
  kind: string;
  folderId: string | null;
  version: number;
  expiresAt: string | null;
  description: string | null;
  tagsCsv: string | null;
  parentDocumentId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: AdminDocCreatedBy;
  storedFile: {
    id: string;
    originalName: string;
    mimeType: string;
    mimeCategory: string;
    sizeBytes: number;
  };
  _count?: { childVersions: number };
}

export interface AdminDocVersion {
  id: string;
  title: string;
  version: number;
  createdAt: string;
  createdBy: { email: string; firstName: string | null; lastName: string | null };
  storedFile: { originalName: string; sizeBytes: number; mimeType: string };
}

export interface AdminDocShare {
  id: string;
  token: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface AdminAuditEntry {
  id: string;
  workspaceId: string;
  documentId: string | null;
  documentTitle: string;
  userId: string;
  userEmail: string;
  action: string;
  meta: string | null;
  createdAt: string;
}

export interface AdminStats {
  total: number;
  totalAllVersions: number;
  byCategory: Record<string, number>;
  totalBytes: number;
  expiringSoon: Array<{ id: string; title: string; expiresAt: string }>;
  expired: Array<{ id: string; title: string; expiresAt: string }>;
  latest: { id: string; title: string; createdAt: string } | null;
}

export interface UploadOptions {
  category?: string;
  title?: string;
  description?: string;
  tagsCsv?: string;
  expiresAt?: string;
  replaceDocumentId?: string;
}

interface AdminDocsState {
  // Data
  docs: AdminDoc[];
  stats: AdminStats | null;
  audit: AdminAuditEntry[];
  auditTotal: number;
  // UI states
  loading: boolean;
  uploading: boolean;
  loadingStats: boolean;
  loadingAudit: boolean;
  error: string | null;
  // Actions
  fetchDocs: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchAudit: (page?: number, pageSize?: number) => Promise<void>;
  uploadDoc: (file: File, options: UploadOptions) => Promise<AdminDoc | null>;
  updateDoc: (id: string, patch: {
    title?: string;
    description?: string | null;
    tagsCsv?: string | null;
    expiresAt?: string | null;
    category?: string;
  }) => Promise<void>;
  deleteDoc: (id: string) => Promise<void>;
  bulkDeleteDocs: (ids: string[]) => Promise<string[]>;
  downloadDoc: (id: string, filename: string) => Promise<void>;
  fetchVersions: (documentId: string) => Promise<AdminDocVersion[]>;
  fetchShares: (documentId: string) => Promise<AdminDocShare[]>;
  createShare: (documentId: string, expiresInHours: number) => Promise<AdminDocShare | null>;
  revokeShare: (shareId: string) => Promise<void>;
}

// ─── Helper : sanitize l'API path (anti path-traversal côté client). ──
function safeId(id: string): string {
  return encodeURIComponent(id.replace(/[^a-zA-Z0-9_-]/g, ''));
}

export const useAdminDocsStore = create<AdminDocsState>((set, get) => ({
  docs: [],
  stats: null,
  audit: [],
  auditTotal: 0,
  loading: false,
  uploading: false,
  loadingStats: false,
  loadingAudit: false,
  error: null,

  // ── Fetches ──────────────────────────────────────────────────────────────

  fetchDocs: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api<AdminDoc[]>('/documents/admin');
      set({ docs: data, loading: false });
    } catch (e: any) {
      // 401 / 429 / Session expirée → silencieux (auth handler s'en occupe)
      const m = (e?.message ?? '').toLowerCase();
      if (m.includes('unauthorized') || m.includes('too many') || m.includes('expir')) {
        set({ docs: [], loading: false });
      } else {
        set({ loading: false, error: e?.message ?? 'Erreur chargement' });
      }
    }
  },

  fetchStats: async () => {
    set({ loadingStats: true });
    try {
      const stats = await api<AdminStats>('/documents/admin/stats');
      set({ stats, loadingStats: false });
    } catch {
      set({ stats: null, loadingStats: false });
    }
  },

  fetchAudit: async (page = 1, pageSize = 50) => {
    set({ loadingAudit: true });
    try {
      const res = await api<{ data: AdminAuditEntry[]; total: number }>(
        `/documents/admin/audit-log?page=${page}&pageSize=${pageSize}`,
      );
      set({ audit: res.data, auditTotal: res.total, loadingAudit: false });
    } catch {
      set({ audit: [], auditTotal: 0, loadingAudit: false });
    }
  },

  // ── Mutations ────────────────────────────────────────────────────────────

  uploadDoc: async (file, options) => {
    set({ uploading: true, error: null });
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (options.category) fd.append('category', options.category);
      if (options.title) fd.append('title', options.title);
      if (options.description) fd.append('description', options.description);
      if (options.tagsCsv) fd.append('tagsCsv', options.tagsCsv);
      if (options.expiresAt) fd.append('expiresAt', options.expiresAt);
      if (options.replaceDocumentId) fd.append('replaceDocumentId', options.replaceDocumentId);
      const doc = await apiUpload<AdminDoc>('/documents/admin/upload', fd);
      set((s) => {
        // Si remplace : on remplace l'ancien dans la liste, on garde le placement
        if (options.replaceDocumentId) {
          const idx = s.docs.findIndex((d) => d.id === options.replaceDocumentId);
          if (idx >= 0) {
            const next = [...s.docs];
            next[idx] = doc;
            return { docs: next, uploading: false };
          }
        }
        return { docs: [doc, ...s.docs], uploading: false };
      });
      // Refresh stats best-effort
      get().fetchStats().catch(() => {/* noop */});
      return doc;
    } catch (e: any) {
      set({ uploading: false, error: e?.message ?? 'Erreur upload' });
      throw e;
    }
  },

  updateDoc: async (id, patch) => {
    set({ error: null });
    try {
      const updated = await api<AdminDoc>(`/documents/admin/${safeId(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      set((s) => ({
        docs: s.docs.map((d) => (d.id === id ? updated : d)),
      }));
      get().fetchStats().catch(() => {/* noop */});
    } catch (e: any) {
      set({ error: e?.message ?? 'Erreur mise à jour' });
      throw e;
    }
  },

  deleteDoc: async (id) => {
    try {
      await api(`/documents/${safeId(id)}`, { method: 'DELETE' });
      set((s) => ({ docs: s.docs.filter((d) => d.id !== id) }));
      get().fetchStats().catch(() => {/* noop */});
    } catch (e: any) {
      set({ error: e?.message ?? 'Erreur suppression' });
      throw e;
    }
  },

  bulkDeleteDocs: async (ids) => {
    if (!ids.length) return [];
    try {
      const res = await api<{ deleted: string[] }>(
        '/documents/admin/bulk',
        {
          method: 'DELETE',
          body: JSON.stringify({ ids }),
        },
      );
      const deletedSet = new Set(res.deleted);
      set((s) => ({ docs: s.docs.filter((d) => !deletedSet.has(d.id)) }));
      get().fetchStats().catch(() => {/* noop */});
      return res.deleted;
    } catch (e: any) {
      set({ error: e?.message ?? 'Erreur suppression bulk' });
      throw e;
    }
  },

  // ── Download avec auth (cookie) + audit côté serveur ─────────────────────

  downloadDoc: async (id, filename) => {
    const token = (() => {
      try {
        const raw = localStorage.getItem('avra-auth');
        if (!raw) return null;
        return JSON.parse(raw)?.state?.token ?? null;
      } catch { return null; }
    })();
    const headers: HeadersInit = {};
    if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/v1/documents/admin/${safeId(id)}/download`, {
      credentials: 'include',
      headers,
    });
    if (!res.ok) throw new Error('Erreur téléchargement');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  // ── Versions ─────────────────────────────────────────────────────────────

  fetchVersions: async (documentId) => {
    try {
      return await api<AdminDocVersion[]>(`/documents/admin/${safeId(documentId)}/versions`);
    } catch {
      return [];
    }
  },

  // ── Sharing ──────────────────────────────────────────────────────────────

  fetchShares: async (documentId) => {
    try {
      return await api<AdminDocShare[]>(`/documents/admin/${safeId(documentId)}/shares`);
    } catch {
      return [];
    }
  },

  createShare: async (documentId, expiresInHours) => {
    try {
      return await api<AdminDocShare>(`/documents/admin/${safeId(documentId)}/shares`, {
        method: 'POST',
        body: JSON.stringify({ expiresInHours }),
      });
    } catch (e: any) {
      set({ error: e?.message ?? 'Erreur création lien' });
      return null;
    }
  },

  revokeShare: async (shareId) => {
    try {
      await api(`/documents/admin/shares/${safeId(shareId)}`, { method: 'DELETE' });
    } catch (e: any) {
      set({ error: e?.message ?? 'Erreur révocation' });
      throw e;
    }
  },
}));

// ─── Helpers exposés (pour usage UI) ────────────────────────────────────────

/** Décompose un tagsCsv en array (filtre les vides). */
export function parseTags(tagsCsv: string | null | undefined): string[] {
  if (!tagsCsv) return [];
  return tagsCsv.split(',').map((t) => t.trim()).filter(Boolean);
}

/** Recompose un array de tags en CSV (sanitisé légèrement côté front). */
export function stringifyTags(tags: string[]): string {
  return tags
    .map((t) => t.trim().slice(0, 32))
    .filter((t) => t.length > 0)
    .slice(0, 10)
    .join(',');
}

/** Calcul du statut d'expiration d'un document. */
export type ExpirationStatus = 'none' | 'far' | 'soon' | 'expired';

export function expirationStatus(expiresAt: string | null | undefined): ExpirationStatus {
  if (!expiresAt) return 'none';
  const t = new Date(expiresAt).getTime();
  if (isNaN(t)) return 'none';
  const now = Date.now();
  if (t < now) return 'expired';
  if (t < now + 30 * 86400_000) return 'soon';
  return 'far';
}

/** Format octets → "1,2 Mo" lisible. */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '0 o';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} Go`;
}
