'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { authApi } from '@/lib/api';
import { Eye, EyeOff, Mail, Lock, ArrowRight, ArrowUpRight, AlertTriangle } from 'lucide-react';

function getRedirectUrl(profession: string | null) {
  if (!profession) return '/portal-select';
  return `/portail-${profession}`;
}

/** Whitelist anti open-redirect : seules les routes internes safe sont acceptees. */
function safeNextUrl(next: string | null | undefined): string | null {
  if (!next) return null;
  if (typeof next !== 'string') return null;
  // Doit commencer par / mais pas par // (protocole-relatif) ni /\ (Windows hack)
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  // Routes autorisees explicitement
  const allowedPrefixes = ['/intervenant', '/invitation/', '/portail-', '/dashboard', '/dossiers'];
  return allowedPrefixes.some((p) => next === p || next.startsWith(p)) ? next : null;
}

/**
 * Detecte si le user connecte est un intervenant (lie a au moins un Intervenant).
 * Utilise pour rediriger vers /intervenant au lieu de /portail-* si c'est le cas.
 */
async function detectIsIntervenant(): Promise<boolean> {
  try {
    const res = await fetch('/api/v1/intervenant-portal/profile', {
      method: 'GET', credentials: 'include',
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

/** Site vitrine, ouvert depuis le pied de l'écran (« Plus d'informations »). */
const SITE_URL = 'https://avra-app.fr';

/**
 * Aperçu flou de la photo de fond (12 x 26 px), affiché le temps que la
 * vraie photo arrive : l'écran n'est jamais noir, même sur un réseau lent.
 */
const FOND_FLOU =
  'data:image/webp;base64,UklGRoYAAABXRUJQVlA4IHoAAADwAwCdASoMABoAPtFUpEuoJKOhsAgBABoJYwCdMoADT5xRfiu1pc+0AP7umXTdN3uGvY0XooopcfpEUkW+vYpPFeBE48WDCgGWbKbzE4sFMlZUXkvHIROCStD93HLgxDboYxemV/KBGCw8GDY6REfve8I06FX4rLwAAA==';

/**
 * Styles de l'écran, préfixés « lx- » pour ne rien faire déborder sur le
 * reste de l'application.
 *
 * Injectés par dangerouslySetInnerHTML : écrits en enfant texte d'une balise
 * <style>, React échappe les apostrophes différemment côté serveur et côté
 * navigateur, ce qui déclenche une erreur d'hydratation sur cette page.
 */
const STYLES = `
  .lx {
    --lx-ivoire: #f5eee8;
    --lx-cuivre: #a67749;
    --lx-cuivre-clair: #c99a6a;
    --lx-nuit: #0f1612;
    position: relative;
    min-height: 100vh;
    min-height: 100dvh;
    background: var(--lx-nuit);
    color: var(--lx-ivoire);
    font-family: var(--font-dm-sans, 'DM Sans'), -apple-system, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }
  .lx *, .lx *::before, .lx *::after { box-sizing: border-box; }

  /* ── Photo ─────────────────────────────────────────────── */
  .lx-media { position: absolute; inset: 0; overflow: hidden; }
  .lx-media img { animation: lx-zoom 16s cubic-bezier(.22,.61,.36,1) both; }
  .lx-ombre {
    position: absolute; inset: 0; pointer-events: none;
    background:
      linear-gradient(180deg, rgba(8,11,9,.62) 0%, rgba(8,11,9,.18) 26%, rgba(8,11,9,0) 42%),
      linear-gradient(180deg, rgba(10,14,11,0) 44%, rgba(10,14,11,.55) 66%, rgba(10,14,11,.88) 100%);
  }

  /* ── Colonne de contenu ────────────────────────────────── */
  .lx-contenu {
    position: relative; z-index: 1;
    min-height: 100vh;
    min-height: 100dvh;
    display: flex; flex-direction: column;
    padding:
      calc(env(safe-area-inset-top, 0px) + 40px)
      calc(env(safe-area-inset-right, 0px) + 20px)
      calc(env(safe-area-inset-bottom, 0px) + 18px)
      calc(env(safe-area-inset-left, 0px) + 20px);
  }
  .lx-espace { flex: 1 1 auto; min-height: 32px; }

  /* ── Marque ────────────────────────────────────────────── */
  .lx-marque { text-align: center; animation: lx-descend .9s cubic-bezier(.22,.61,.36,1) both; }
  .lx-logo {
    font-family: var(--font-playfair-display, 'Playfair Display'), Georgia, 'Times New Roman', serif;
    font-weight: 400;
    font-size: clamp(46px, 14vw, 62px);
    line-height: 1;
    letter-spacing: .16em;
    margin-right: -.16em; /* recentre : l'espacement s'ajoute aussi après le dernier A */
    color: var(--lx-ivoire);
    text-shadow: 0 2px 24px rgba(0,0,0,.35);
  }
  .lx-filet {
    width: min(210px, 62%); height: 1px; margin: 16px auto 14px;
    background: linear-gradient(90deg, transparent, var(--lx-cuivre-clair) 18%, #e2bd8f 50%, var(--lx-cuivre-clair) 82%, transparent);
    position: relative;
  }
  .lx-filet::after {
    content: ''; position: absolute; left: 50%; top: 50%;
    width: 5px; height: 5px; transform: translate(-50%,-50%) rotate(45deg);
    background: #e2bd8f; box-shadow: 0 0 10px rgba(226,189,143,.7);
  }
  .lx-accroche {
    font-size: 14.5px; letter-spacing: .03em; color: rgba(245,238,232,.88);
    text-shadow: 0 1px 12px rgba(0,0,0,.45);
  }
  .lx-marque--bureau { display: none; }

  /* ── Carte en verre dépoli ─────────────────────────────── */
  .lx-carte {
    width: 100%; max-width: 440px; margin: 0 auto;
    padding: 22px 20px 20px;
    border-radius: 26px;
    background: linear-gradient(180deg, rgba(42,52,45,.50) 0%, rgba(20,27,22,.72) 100%);
    -webkit-backdrop-filter: blur(22px) saturate(140%);
    backdrop-filter: blur(22px) saturate(140%);
    border: 1px solid rgba(245,238,232,.13);
    box-shadow: 0 24px 60px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08);
    animation: lx-monte .85s cubic-bezier(.22,.61,.36,1) .12s both;
  }
  .lx-titre { display: none; }
  .lx-form { display: flex; flex-direction: column; gap: 12px; }

  .lx-champ { position: relative; }
  .lx-champ-icone {
    position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
    width: 18px; height: 18px; color: rgba(245,238,232,.55); pointer-events: none;
    transition: color .2s ease;
  }
  .lx-input {
    width: 100%; height: 54px;
    padding: 0 16px 0 46px;
    border-radius: 15px;
    border: 1px solid rgba(245,238,232,.16);
    background: rgba(10,14,11,.38);
    color: var(--lx-ivoire);
    font: inherit; font-size: 16px; /* 16 px : iOS ne zoome pas sur le champ */
    outline: none;
    transition: border-color .2s ease, background .2s ease, box-shadow .2s ease;
  }
  .lx-input::placeholder { color: rgba(245,238,232,.48); }
  .lx-input:focus {
    border-color: rgba(201,154,106,.85);
    background: rgba(10,14,11,.55);
    box-shadow: 0 0 0 4px rgba(166,119,73,.18);
  }
  .lx-champ:focus-within .lx-champ-icone { color: var(--lx-cuivre-clair); }
  .lx-input--mdp { padding-right: 52px; }
  .lx-input:-webkit-autofill,
  .lx-input:-webkit-autofill:focus {
    -webkit-text-fill-color: var(--lx-ivoire);
    -webkit-box-shadow: 0 0 0 1000px #1b231e inset;
    caret-color: var(--lx-ivoire);
  }
  .lx-oeil {
    position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
    width: 44px; height: 44px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    background: none; border: none; cursor: pointer;
    color: rgba(245,238,232,.6);
  }
  .lx-oeil:hover { color: var(--lx-ivoire); }
  .lx-oeil:focus-visible { outline: 2px solid var(--lx-cuivre-clair); outline-offset: -2px; }

  .lx-ligne { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 2px 2px 4px; }
  .lx-rester { display: inline-flex; align-items: center; gap: 9px; cursor: pointer; user-select: none; font-size: 14px; color: rgba(245,238,232,.78); min-height: 32px; }
  .lx-rester input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  .lx-case {
    width: 19px; height: 19px; border-radius: 6px; flex-shrink: 0;
    border: 1.5px solid rgba(245,238,232,.32);
    display: flex; align-items: center; justify-content: center;
    transition: all .2s ease;
  }
  .lx-rester input:checked + .lx-case { background: linear-gradient(135deg, #c99a6a, #8c623c); border-color: transparent; }
  .lx-rester input:focus-visible + .lx-case { outline: 2px solid var(--lx-cuivre-clair); outline-offset: 2px; }
  .lx-oubli { font-size: 14px; color: var(--lx-cuivre-clair); text-decoration: none; min-height: 32px; display: inline-flex; align-items: center; }
  .lx-oubli:hover { color: #e2bd8f; text-decoration: underline; text-underline-offset: 3px; }

  .lx-alerte {
    display: flex; gap: 10px; align-items: flex-start;
    padding: 12px 14px; border-radius: 14px; margin-bottom: 14px;
    background: rgba(166,119,73,.16); border: 1px solid rgba(201,154,106,.45);
    font-size: 14px; line-height: 1.45; color: #f3e6d6;
  }
  .lx-erreur {
    padding: 11px 14px; border-radius: 14px;
    background: rgba(166,61,61,.22); border: 1px solid rgba(220,120,120,.38);
    color: #ffd9d4; font-size: 14px; line-height: 1.45;
  }

  .lx-bouton {
    position: relative; overflow: hidden;
    width: 100%; height: 56px; margin-top: 4px;
    border: none; border-radius: 15px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    font: inherit; font-size: 16.5px; font-weight: 600; letter-spacing: .02em;
    color: #fffaf4;
    background: linear-gradient(180deg, #c3925f 0%, #a67749 52%, #8f633b 100%);
    box-shadow: 0 10px 28px rgba(166,119,73,.38), inset 0 1px 0 rgba(255,236,210,.35), inset 0 -1px 0 rgba(0,0,0,.18);
    transition: transform .2s ease, box-shadow .2s ease, filter .2s ease;
  }
  .lx-bouton::after {
    content: ''; position: absolute; top: 0; bottom: 0; width: 40%; left: -60%;
    background: linear-gradient(100deg, transparent, rgba(255,240,220,.28), transparent);
    transform: skewX(-18deg);
    animation: lx-reflet 5.5s ease-in-out 1.6s infinite;
  }
  .lx-bouton:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 14px 34px rgba(166,119,73,.5), inset 0 1px 0 rgba(255,236,210,.35); filter: brightness(1.04); }
  .lx-bouton:active:not(:disabled) { transform: translateY(0) scale(.99); }
  .lx-bouton:disabled { cursor: progress; filter: saturate(.8) brightness(.92); }
  .lx-bouton:focus-visible { outline: 2px solid #e2bd8f; outline-offset: 3px; }
  .lx-roue { width: 18px; height: 18px; animation: lx-tourne .8s linear infinite; }

  .lx-inscription { text-align: center; margin-top: 16px; font-size: 14px; line-height: 1.5; color: rgba(245,238,232,.62); }
  .lx-inscription a { color: var(--lx-cuivre-clair); font-weight: 600; text-decoration: none; }
  .lx-inscription a:hover { color: #e2bd8f; text-decoration: underline; text-underline-offset: 3px; }

  /* ── Pied : site vitrine ───────────────────────────────── */
  .lx-pied { text-align: center; margin-top: 18px; animation: lx-monte .85s cubic-bezier(.22,.61,.36,1) .3s both; }
  .lx-site {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 16px; border-radius: 999px;
    font-size: 13.5px; color: rgba(245,238,232,.86); text-decoration: none;
    background: rgba(10,14,11,.35);
    border: 1px solid rgba(245,238,232,.14);
    -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
    transition: border-color .2s ease, color .2s ease, background .2s ease;
  }
  .lx-site strong { color: var(--lx-cuivre-clair); font-weight: 600; }
  .lx-site:hover { border-color: rgba(201,154,106,.6); color: var(--lx-ivoire); background: rgba(10,14,11,.5); }
  .lx-copyright { margin-top: 10px; font-size: 11.5px; letter-spacing: .02em; color: rgba(245,238,232,.42); }

  /* ── Animations ────────────────────────────────────────── */
  @keyframes lx-zoom { from { transform: scale(1.07); } to { transform: scale(1); } }
  @keyframes lx-descend { from { opacity: 0; transform: translateY(-14px); } to { opacity: 1; transform: none; } }
  @keyframes lx-monte { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }
  @keyframes lx-reflet { 0%, 70% { left: -60%; } 100% { left: 130%; } }
  @keyframes lx-tourne { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .lx *, .lx *::before, .lx *::after { animation: none !important; transition: none !important; }
  }

  /* ── Petits écrans en hauteur (iPhone SE, clavier ouvert) ─ */
  @media (max-height: 700px) and (max-width: 899px) {
    .lx-contenu { padding-top: calc(env(safe-area-inset-top, 0px) + 24px); }
    .lx-logo { font-size: 44px; }
    .lx-filet { margin: 12px auto 10px; }
    .lx-input { height: 50px; }
    .lx-bouton { height: 52px; }
  }

  /* ── Ordinateur : photo à gauche, formulaire à droite ─── */
  @media (min-width: 900px) {
    .lx { display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(480px, 1fr); }
    .lx-media { position: relative; inset: auto; min-height: 100dvh; }
    .lx-ombre {
      background:
        linear-gradient(180deg, rgba(8,11,9,.35) 0%, rgba(8,11,9,0) 30%, rgba(8,11,9,0) 55%, rgba(8,11,9,.78) 100%),
        linear-gradient(90deg, rgba(15,22,18,0) 70%, rgba(15,22,18,.9) 100%);
    }
    .lx-marque--bureau {
      display: block; position: absolute; left: 56px; right: 56px; bottom: 56px; text-align: left;
    }
    .lx-marque--bureau .lx-logo { font-size: 76px; margin-right: 0; }
    .lx-marque--bureau .lx-filet { margin: 20px 0 16px; width: 240px; }
    .lx-marque--bureau .lx-accroche { font-size: 17px; }
    .lx-modules { margin-top: 10px; font-size: 13px; letter-spacing: .14em; text-transform: uppercase; color: rgba(245,238,232,.6); }
    .lx-marque--mobile { display: none; }
    .lx-espace { display: none; }
    .lx-contenu {
      min-height: 100dvh; justify-content: center; align-items: center;
      padding: 48px clamp(32px, 6vw, 88px);
      background:
        radial-gradient(circle at 78% 12%, rgba(166,119,73,.13), transparent 48%),
        radial-gradient(circle at 15% 95%, rgba(48,64,53,.55), transparent 55%),
        linear-gradient(165deg, #18221c 0%, #0f1612 100%);
    }
    .lx-carte { padding: 34px 32px 28px; max-width: 430px; }
    .lx-titre {
      display: block; margin-bottom: 24px;
    }
    .lx-titre h1 {
      font-family: var(--font-playfair-display, 'Playfair Display'), Georgia, 'Times New Roman', serif;
      font-weight: 600; font-size: 30px; letter-spacing: .01em; color: var(--lx-ivoire);
    }
    .lx-titre p { margin-top: 6px; font-size: 15px; color: rgba(245,238,232,.6); }
    .lx-pied { margin-top: 28px; }
  }
`;

// Wrapper Suspense requis par Next.js 14 dès qu'un enfant utilise useSearchParams.
// Sans ce wrapper, le build échoue sur le pré-rendering statique de /login.
export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#0f1612' }} />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const token = useAuthStore((s) => s.token);
  const profession = useAuthStore((s) => s.profession);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // "Rester connecté" — coché par défaut, chargé depuis localStorage
  const [rememberMe, setRememberMe] = useState(true);
  // Détecte une redirection depuis la zone app après expiration de session
  const searchParams = useSearchParams();
  const sessionExpired = searchParams?.get('reason') === 'session-expired';
  // Lien retour priorité (ex: invitation acceptation, deep-link)
  const next = safeNextUrl(searchParams?.get('next'));

  useEffect(() => {
    // Charger la préférence sauvegardée
    const saved = localStorage.getItem('avra-remember');
    if (saved === 'false') setRememberMe(false);
  }, []);

  /**
   * Calcule la destination post-login.
   * Priorite :
   *  1. ?next= (whitelist) → respecte deep-link (typiquement /invitation/<token>)
   *  2. compte PRO (rôle workspace + workspaceId) → app pro, TOUJOURS.
   *     Un pro qui est aussi rattaché comme intervenant quelque part ne doit
   *     PAS être expédié au portail : sinon il perd l'accès à ses propres
   *     dossiers (bug « tout en lecture seule » observé 08/2026).
   *  3. user purement intervenant (rôle INTERVENANT / sans workspace) → /intervenant
   *  4. profession choisie → /portail-<profession>
   *  5. fallback /portal-select
   */
  const computeRedirectAfterLogin = async (
    connectedUser?: { role?: string | null; workspaceId?: string | null } | null,
  ): Promise<string> => {
    if (next) return next;
    // Le rôle pro prime sur le lien intervenant.
    const isPro =
      !!connectedUser &&
      connectedUser.role !== 'INTERVENANT' &&
      !!connectedUser.workspaceId;
    if (!isPro) {
      const isIntervenant = await detectIsIntervenant();
      if (isIntervenant) return '/intervenant';
    }
    return getRedirectUrl(profession);
  };

  useEffect(() => {
    if (token) {
      // User deja connecte qui revient sur /login → redirige proprement.
      // On passe le user persisté (avec son rôle) pour que le pro ne soit
      // pas renvoyé au portail intervenant s'il est aussi rattaché ailleurs.
      computeRedirectAfterLogin(useAuthStore.getState().user).then((url) => {
        window.location.href = url;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, profession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      // Sauvegarder la préférence "rester connecté"
      localStorage.setItem('avra-remember', rememberMe ? 'true' : 'false');
      if (!rememberMe) {
        // Session uniquement — marqueur effacé à la fermeture du navigateur
        sessionStorage.setItem('avra-session-active', '1');
      } else {
        sessionStorage.removeItem('avra-session-active');
      }
      setAuth('', res.user as Parameters<typeof setAuth>[1]);
      const url = await computeRedirectAfterLogin(res.user);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/*
        Écran de connexion « showroom » (13/10/2026), dessiné d'après la
        maquette validée par Esteve : une cuisine haut de gamme le soir en
        plein écran, le nom AVRA en haut, le formulaire dans une carte en
        verre dépoli en bas. Sur ordinateur, la photo occupe la moitié
        gauche et le formulaire la moitié droite.
      */}
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <main className="lx">
        <section className="lx-media" aria-hidden="true">
          <Image
            src="/images/login/cuisine-nuit.webp"
            alt=""
            fill
            priority
            sizes="(min-width: 900px) 54vw, 100vw"
            quality={90}
            placeholder="blur"
            blurDataURL={FOND_FLOU}
            style={{ objectFit: 'cover', objectPosition: '50% 38%' }}
          />
          <div className="lx-ombre" />
          <div className="lx-marque lx-marque--bureau">
            <div className="lx-logo">AVRA</div>
            <div className="lx-filet" />
            <p className="lx-accroche">Le logiciel des cuisinistes d&apos;exception</p>
            <p className="lx-modules">Dossiers · Planning · Facturation · Rendus IA</p>
          </div>
        </section>

        <div className="lx-contenu">
          <header className="lx-marque lx-marque--mobile">
            <div className="lx-logo" role="img" aria-label="AVRA">AVRA</div>
            <div className="lx-filet" />
            <p className="lx-accroche">Le logiciel des cuisinistes d&apos;exception</p>
          </header>

          <div className="lx-espace" />

          <div className="lx-carte">
            <div className="lx-titre">
              <h1>Connexion</h1>
              <p>Accédez à votre espace AVRA</p>
            </div>

            {/* Bandeau "Session expirée" si redirection depuis la zone app */}
            {sessionExpired && (
              <div className="lx-alerte" role="alert">
                <AlertTriangle size={17} style={{ marginTop: 2, flexShrink: 0, color: '#e2bd8f' }} />
                <div>
                  <strong style={{ display: 'block', color: '#fff', marginBottom: 2 }}>Session expirée</strong>
                  Votre session a expiré pour des raisons de sécurité. Reconnectez-vous pour reprendre.
                </div>
              </div>
            )}

            <form className="lx-form" onSubmit={handleSubmit}>
              <div className="lx-champ">
                <Mail className="lx-champ-icone" aria-hidden="true" />
                <input
                  className="lx-input"
                  type="email"
                  inputMode="email"
                  aria-label="Adresse e-mail"
                  placeholder="Adresse e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                />
              </div>

              <div className="lx-champ">
                <Lock className="lx-champ-icone" aria-hidden="true" />
                <input
                  className="lx-input lx-input--mdp"
                  type={showPassword ? 'text' : 'password'}
                  aria-label="Mot de passe"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="lx-oeil"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>

              <div className="lx-ligne">
                <label className="lx-rester">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="lx-case" aria-hidden="true">
                    {rememberMe && (
                      <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                        <path d="M1 4L4 7L10 1" stroke="#fffaf4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  Rester connecté
                </label>
                <Link href="/forgot-password" className="lx-oubli">Mot de passe oublié ?</Link>
              </div>

              {error && <div className="lx-erreur" role="alert">{error}</div>}

              <button type="submit" className="lx-bouton" disabled={loading}>
                {loading ? (
                  <>
                    <svg className="lx-roue" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="28 60" />
                    </svg>
                    Connexion…
                  </>
                ) : (
                  <>Se connecter <ArrowRight size={18} aria-hidden="true" /></>
                )}
              </button>
            </form>

            <p className="lx-inscription">
              Pas encore de compte ?<br />
              <Link href="/rejoindre">Rejoindre la liste d&apos;attente</Link>
            </p>
          </div>

          <footer className="lx-pied">
            <a className="lx-site" href={SITE_URL} target="_blank" rel="noopener noreferrer">
              Plus d&apos;informations sur <strong>avra-app.fr</strong>
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
            <p className="lx-copyright">© 2026 AVRA · Données hébergées en France</p>
          </footer>
        </div>
      </main>
    </>
  );
}
