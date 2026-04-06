'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { authApi } from '@/lib/api';

function getRedirectUrl(profession: string | null) {
  if (!profession) return '/portal-select';
  return `/portail-${profession}`;
}

export default function LoginPage() {
  const token = useAuthStore((s) => s.token);
  const profession = useAuthStore((s) => s.profession);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      window.location.href = getRedirectUrl(profession);
    }
  }, [token, profession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Le serveur pose les cookies access_token et logged_in automatiquement
      const res = await authApi.login(email, password);
      setAuth('', res.user as Parameters<typeof setAuth>[1]);
      window.location.href = getRedirectUrl(profession);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#304035', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, overflowY: 'auto' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[#a67749]/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md px-6">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#a67749] bg-[#2a3830]">
            <span className="text-3xl font-bold text-white">A</span>
          </div>
          <h1 className="text-3xl font-bold tracking-[0.15em] text-white">AVRA</h1>
          <p className="mt-1 text-sm text-white/60">L'assistant virtuel révolutionnaire de l'agencement</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-white/10 bg-white/10 p-8 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-white mb-6 text-center">Connexion</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white/80 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="votre@email.fr"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#a67749]/50 focus:border-[#a67749]/50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white/80 mb-1.5">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#a67749]/50 focus:border-[#a67749]/50"
              />
            </div>
            {error && (
              <p className="rounded-xl bg-red-500/20 px-4 py-2 text-sm font-medium text-red-300">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#a67749] py-3.5 font-bold text-white transition-all hover:bg-[#b8853a] hover:shadow-lg disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-white/50">
              Pas encore de compte ?{' '}
              <Link href="/register" className="text-[#a67749] font-semibold hover:text-[#b8853a] transition-colors">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-white/25 text-xs mt-6">AVRA © 2026 — Tous droits réservés</p>
      </div>
    </div>
  );
}
