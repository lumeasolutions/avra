'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore, Profession } from '@/store/useAuthStore';
import { authApi } from '@/lib/api';

const PORTAILS = [
  {
    id: 'architecte' as Profession,
    emoji: '🏛️',
    titre: 'Architecte d\'intérieur',
    description: 'Projets déco, plans, suivi de chantier, dossiers clients, e-signature et facturation.',
    couleur: '#3D5449',
    gradient: 'linear-gradient(135deg, #3D5449 0%, #2C3E2F 100%)',
  },
  {
    id: 'menuisier' as Profession,
    emoji: '🪵',
    titre: 'Menuisier',
    description: 'Commandes bois, gestion des chantiers, devis matériaux, planning atelier.',
    couleur: '#7B4F2E',
    gradient: 'linear-gradient(135deg, #7B4F2E 0%, #5C3820 100%)',
  },
  {
    id: 'cuisiniste' as Profession,
    emoji: '🍳',
    titre: 'Cuisiniste',
    description: 'Conception cuisines, gestion poses, SAV, catalogue produits, planning techniciens.',
    couleur: '#1A3A5C',
    gradient: 'linear-gradient(135deg, #1A3A5C 0%, #0F2540 100%)',
  },
];

type Step = 'portail' | 'infos';

export default function RegisterPage() {
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setProfession = useAuthStore((s) => s.setProfession);

  const [step, setStep] = useState<Step>('portail');
  const [selectedPortail, setSelectedPortail] = useState<Profession>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      window.location.href = `/portail-${useAuthStore.getState().profession}`;
    }
  }, [token]);

  const handlePortailNext = () => {
    if (!selectedPortail) return;
    setStep('infos');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedPortail) { setError('Portail non sélectionné'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return; }
    if (password.length < 12) { setError('Le mot de passe doit contenir au moins 12 caractères'); return; }
    if (!/[A-Z]/.test(password)) { setError('Le mot de passe doit contenir au moins une majuscule'); return; }
    if (!/[0-9]/.test(password)) { setError('Le mot de passe doit contenir au moins un chiffre'); return; }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) { setError('Le mot de passe doit contenir au moins un caractère spécial (!@#$...)'); return; }
    if (!workspaceName.trim()) { setError('Le nom de votre entreprise est requis'); return; }

    setLoading(true);
    try {
      // 1. Créer le compte
      await authApi.register(email, password, workspaceName.trim(), firstName.trim(), lastName.trim());

      // 2. Se connecter immédiatement (le serveur pose les cookies)
      const res = await authApi.login(email, password);

      // 3. Sauvegarder le portail choisi (définitif)
      setProfession(selectedPortail);
      setAuth('', { ...res.user, firstName, lastName } as Parameters<typeof setAuth>[1]);

      // 4. Rediriger vers le bon portail
      window.location.href = `/portail-${selectedPortail}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#304035', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, overflowY: 'auto', padding: '40px 20px' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[#a67749]/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl px-6">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#a67749] bg-[#2a3830]">
            <span className="text-2xl font-bold text-white">A</span>
          </div>
          <h1 className="text-3xl font-bold tracking-[0.15em] text-white">AVRA</h1>
          <p className="mt-1 text-sm text-white/60">Créez votre espace professionnel</p>
        </div>

        {/* Étapes */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className={`flex items-center gap-2 text-sm font-semibold ${step === 'portail' ? 'text-[#a67749]' : 'text-white/40'}`}>
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${step === 'portail' ? 'border-[#a67749] bg-[#a67749]/20 text-[#a67749]' : selectedPortail ? 'border-white/40 bg-white/10 text-white/60' : 'border-white/20 text-white/30'}`}>1</span>
            Votre portail
          </div>
          <div className="w-8 h-px bg-white/20" />
          <div className={`flex items-center gap-2 text-sm font-semibold ${step === 'infos' ? 'text-[#a67749]' : 'text-white/40'}`}>
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${step === 'infos' ? 'border-[#a67749] bg-[#a67749]/20 text-[#a67749]' : 'border-white/20 text-white/30'}`}>2</span>
            Vos informations
          </div>
        </div>

        {/* Étape 1 — Choix portail */}
        {step === 'portail' && (
          <div>
            <p className="text-center text-white/70 mb-6 text-sm">
              Choisissez votre métier. Ce portail sera <span className="text-white font-semibold">définitif</span> — il personnalise entièrement votre espace AVRA.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {PORTAILS.map((p) => {
                const isSelected = selectedPortail === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPortail(p.id)}
                    className="text-left rounded-2xl p-6 transition-all duration-200 border-2"
                    style={{
                      background: isSelected ? p.gradient : 'rgba(255,255,255,0.06)',
                      borderColor: isSelected ? p.couleur : 'rgba(255,255,255,0.1)',
                      transform: isSelected ? 'translateY(-3px)' : 'none',
                      boxShadow: isSelected ? `0 12px 32px ${p.couleur}44` : '0 2px 8px rgba(0,0,0,0.2)',
                    }}
                  >
                    {isSelected && (
                      <div className="flex justify-end mb-2">
                        <span className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center text-white text-xs font-bold">✓</span>
                      </div>
                    )}
                    <div className="text-3xl mb-3">{p.emoji}</div>
                    <div className="text-white font-bold text-base mb-2">{p.titre}</div>
                    <div className="text-white/60 text-xs leading-relaxed">{p.description}</div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={handlePortailNext}
              disabled={!selectedPortail}
              className="w-full rounded-2xl py-3.5 font-bold text-base transition-all"
              style={{
                background: selectedPortail ? 'linear-gradient(135deg, #a67749, #8B6014)' : 'rgba(255,255,255,0.08)',
                color: selectedPortail ? 'white' : 'rgba(255,255,255,0.3)',
                cursor: selectedPortail ? 'pointer' : 'not-allowed',
                boxShadow: selectedPortail ? '0 8px 24px rgba(166,119,73,0.4)' : 'none',
              }}
            >
              Continuer avec {selectedPortail ? PORTAILS.find(p => p.id === selectedPortail)?.emoji : ''} {selectedPortail ? PORTAILS.find(p => p.id === selectedPortail)?.titre : 'votre portail'} →
            </button>
          </div>
        )}

        {/* Étape 2 — Informations */}
        {step === 'infos' && (
          <div className="rounded-3xl border border-white/10 bg-white/10 p-8 backdrop-blur-sm">
            {/* Portail choisi (résumé) */}
            {selectedPortail && (
              <div
                className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6"
                style={{ background: `${PORTAILS.find(p => p.id === selectedPortail)?.couleur}33`, border: `1px solid ${PORTAILS.find(p => p.id === selectedPortail)?.couleur}55` }}
              >
                <span className="text-xl">{PORTAILS.find(p => p.id === selectedPortail)?.emoji}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{PORTAILS.find(p => p.id === selectedPortail)?.titre}</p>
                  <p className="text-white/50 text-xs">Portail sélectionné — définitif</p>
                </div>
                <button onClick={() => setStep('portail')} className="ml-auto text-white/40 hover:text-white/70 text-xs underline">Modifier</button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-1.5">Prénom</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="Jean"
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#a67749]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-1.5">Nom</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="Dupont"
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#a67749]/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Nom de votre entreprise</label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  required
                  placeholder="Mon Studio Design"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#a67749]/50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Email professionnel</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="votre@email.fr"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#a67749]/50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Mot de passe <span className="text-white/40 font-normal">(12 car. min, majuscule, chiffre, symbole)</span></label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={12}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#a67749]/50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#a67749]/50"
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
                {loading ? 'Création du compte…' : 'Créer mon compte et accéder à AVRA'}
              </button>
            </form>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-white/50">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-[#a67749] font-semibold hover:text-[#b8853a] transition-colors">
              Se connecter
            </Link>
          </p>
        </div>
        <p className="text-center text-white/25 text-xs mt-4">AVRA © 2026 — Tous droits réservés</p>
      </div>
    </div>
  );
}
