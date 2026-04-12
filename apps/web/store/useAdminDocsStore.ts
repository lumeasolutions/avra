import { create } from 'zustand';
import { api, apiUpload } from '@/lib/api';

export interface AdminDoc {
  id: string;
  title: string;
  kind: string;
  folderId: string | null;
  createdAt: string;
  storedFile: {
    id: string;
    originalName: string;
    mimeType: string;
    mimeCategory: string;
    sizeBytes: number;
  };
}

interface AdminDocsState {
  docs: AdminDoc[];
  loading: boolean;
  uploading: boolean;
  error: string | null;

  fetchDocs: () => Promise<void>;
  uploadDoc: (file: File, category: string, title?: string) => Promise<void>;
  deleteDoc: (id: string) => Promise<void>;
  downloadDoc: (id: string, filename: string) => Promise<void>;
}

export const useAdminDocsStore = create<AdminDocsState>((set, get) => ({
  docs: [],
  loading: false,
  uploading: false,
  error: null,

  fetchDocs: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api<AdminDoc[]>('/documents/admin');
      set({ docs: data, loading: false });
    } catch (e: any) {
      // 401/429 = pas connecté ou rate limit — on affiche juste vide silencieusement
      if (e.message === 'Unauthorized' || e.message?.includes('Too Many')) {
        set({ docs: [], loading: false });
      } else {
        set({ loading: false, error: e.message });
      }
    }
  },

  uploadDoc: async (file: File, category: string, title?: string) => {
    set({ uploading: true, error: null });
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', category);
      if (title) fd.append('title', title);
      const doc = await apiUpload<AdminDoc>('/documents/admin/upload', fd);
      set(s => ({ docs: [doc, ...s.docs], uploading: false }));
    } catch (e: any) {
      set({ uploading: false, error: e.message });
      throw e;
    }
  },

  deleteDoc: async (id: string) => {
    try {
      await api(`/documents/${id}`, { method: 'DELETE' });
      set(s => ({ docs: s.docs.filter(d => d.id !== id) }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  downloadDoc: async (id: string, filename: string) => {
    const token = (() => {
      try {
        const raw = localStorage.getItem('avra-auth');
        if (!raw) return null;
        return JSON.parse(raw)?.state?.token ?? null;
      } catch { return null; }
    })();

    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/v1/documents/admin/${id}/download`, {
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
}));
