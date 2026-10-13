'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Check, ArrowRight } from 'lucide-react';
import { useAuthStore, Profession } from '@/store/useAuthStore';

/**
 * Choix du métier, juste après la première connexion (13/10/2026).
 *
 * Même direction artistique que l'écran de connexion : nuit, vert profond,
 * cuivre. Chaque métier a sa photo (générée pour AVRA, même lumière du soir) :
 * l'îlot de cuisine, l'atelier d'ébéniste, la table de l'architecte.
 */
const PORTAILS: Array<{
  id: Exclude<Profession, null>;
  titre: string;
  accroche: string;
  description: string;
  image: string;
  flou: string;
  tags: string[];
}> = [
  {
    id: 'cuisiniste',
    titre: 'Cuisiniste',
    accroche: 'Showroom & sur-mesure',
    description: 'Conception, poses, SAV et planning des techniciens.',
    image: '/images/mobile/metier-cuisiniste.webp',
    flou: 'data:image/webp;base64,UklGRoQAAABXRUJQVlA4IHgAAAAwBACdASoMABUAPtFWo0uoJKMhsAgBABoJQBOmUABwcktJjsgGADhPJoAA/vD4fSSlQGv11FTxOmuTyn3ORJ2AkOJFxL9g+VkJGsy6H1//1YZ9gDDGt8NEDDQ/hicmlasuztPHdb5dmcBgWbaIUWbOXxtirGLwAAA=',
    tags: ['Conception', 'Planning pose', 'SAV'],
  },
  {
    id: 'menuisier',
    titre: 'Menuisier',
    accroche: 'Atelier & agencement',
    description: 'Commandes bois, devis matériaux, atelier et livraisons.',
    image: '/images/mobile/metier-menuisier.webp',
    flou: 'data:image/webp;base64,UklGRoAAAABXRUJQVlA4IHQAAACQAwCdASoMABUAPtFUo0uoJKMhsAgBABoJZACdACFmbAhCOBn2AP70QnyQ/Sf5NVVt5hsockj+Ovy6ZLVNM4hC9+eQlNQpYZ9UwdJ/FHh/S5bFfM3Tm8HWdZQDF663t1zLVd0Q84rhs3DyPwBluP9eU73AAA==',
    tags: ['Commandes bois', 'Chantiers'],
  },
  {
    id: 'architecte',
    titre: "Architecte d'intérieur",
    accroche: 'Projets & matières',
    description: 'Plans, visuels, devis, e-signature et facturation.',
    image: '/images/mobile/metier-architecte.webp',
    flou: 'data:image/webp;base64,UklGRpgAAABXRUJQVlA4IIwAAABwBACdASoMABUAPtFUo0uoJKMhsAgBABoJYgCdL11s/wGKlx8KUBd8gUM8AAD+9DXaUj+eAqY9vTsHsYHCExSnJiJIKAb85XKekG2Kp1blWoKsvcA2UJ3O7j6Ob91aDjp9LUjEIlTZ2fEK/Se8mLtlJndOkf1wxH9KUvzaiz9K6oOKdWc6d+roN2AAAA==',
    tags: ['Plans & visuels', 'E-signature'],
  },
];

export default function PortalSelectPage() {
  const setProfession = useAuthStore(s => s.setProfession);
  const profession = useAuthStore(s => s.profession);
  const user = useAuthStore(s => s.user);
  const [selected, setSelected] = useState<Profession>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profession) {
      window.location.href = `/portail-${profession}`;
    }
  }, [profession]);

  const handleConfirm = () => {
    if (!selected) return;
    setLoading(true);
    setProfession(selected);
    setTimeout(() => {
      window.location.href = `/portail-${selected}`;
    }, 900);
  };

  const prenom = user?.firstName?.trim();
  const choix = PORTAILS.find(p => p.id === selected);

  return (
    <main className={`ps${loading ? ' ps--sortie' : ''}`}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <header className="ps-entete">
        <div className="ps-logo">AVRA</div>
        <div className="ps-filet" />
        <p className="ps-bienvenue">Bienvenue{prenom ? `, ${prenom}` : ''}</p>
        <h1 className="ps-titre">Quel est votre métier&nbsp;?</h1>
        <p className="ps-sous-titre">Votre espace s&apos;adapte à votre façon de travailler.</p>
      </header>

      <div className="ps-cartes" role="radiogroup" aria-label="Votre métier">
        {PORTAILS.map((p, i) => {
          const actif = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={actif}
              className={`ps-carte${actif ? ' ps-carte--choisie' : ''}`}
              onClick={() => setSelected(p.id)}
              style={{ ['--i' as string]: i }}
            >
              <Image
                src={p.image}
                alt=""
                fill
                sizes="(min-width: 900px) 300px, 100vw"
                quality={85}
                placeholder="blur"
                blurDataURL={p.flou}
                className="ps-photo"
                priority={i === 0}
              />
              <span className="ps-voile" aria-hidden="true" />
              <span className="ps-coche" aria-hidden="true"><Check size={16} strokeWidth={2.6} /></span>
              <span className="ps-texte">
                <span className="ps-accroche">{p.accroche}</span>
                <strong className="ps-nom">{p.titre}</strong>
                <span className="ps-desc">{p.description}</span>
                <span className="ps-tags">
                  {p.tags.map(t => <span key={t} className="ps-tag">{t}</span>)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="ps-pied">
        <button
          type="button"
          className="ps-cta"
          onClick={handleConfirm}
          disabled={!selected || loading}
        >
          {loading ? (
            <>
              <svg className="ps-roue" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="28 60" />
              </svg>
              Ouverture de votre espace…
            </>
          ) : choix ? (
            <>Entrer dans mon espace {choix.titre.toLowerCase()} <ArrowRight size={18} aria-hidden="true" /></>
          ) : (
            'Choisissez votre métier'
          )}
        </button>
        <p className="ps-note">Vous pourrez changer de métier depuis vos paramètres.</p>
      </div>
    </main>
  );
}

/**
 * Styles préfixés « ps- », injectés par dangerouslySetInnerHTML (une balise
 * <style> en enfant texte fait diverger serveur et navigateur sur les
 * apostrophes).
 */
const STYLES = `
.ps {
  --ps-ivoire: #f5eee8;
  --ps-cuivre: #c99a6a;
  position: relative;
  min-height: 100vh; min-height: 100dvh;
  display: flex; flex-direction: column; align-items: center;
  padding: calc(env(safe-area-inset-top, 0px) + 36px) 18px 0;
  color: var(--ps-ivoire);
  font-family: var(--font-dm-sans, 'DM Sans'), -apple-system, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  background:
    radial-gradient(circle at 85% 0%, rgba(166,119,73,.16), transparent 42%),
    radial-gradient(circle at 0% 100%, rgba(48,64,53,.6), transparent 50%),
    linear-gradient(170deg, #18221c 0%, #0f1612 60%, #0b110d 100%);
  /* clip et non hidden : hidden ferait de la page un conteneur de défilement
     et le bouton du bas ne resterait plus collé à l'écran. */
  overflow-x: clip;
}
.ps *, .ps *::before, .ps *::after { box-sizing: border-box; }

.ps-entete { text-align: center; max-width: 560px; animation: ps-descend .8s cubic-bezier(.22,.61,.36,1) both; }
.ps-logo {
  font-family: var(--font-playfair-display, 'Playfair Display'), Georgia, serif;
  font-size: 30px; letter-spacing: .2em; margin-right: -.2em; line-height: 1;
}
.ps-filet {
  width: 120px; height: 1px; margin: 12px auto 18px; position: relative;
  background: linear-gradient(90deg, transparent, var(--ps-cuivre) 20%, #e2bd8f 50%, var(--ps-cuivre) 80%, transparent);
}
.ps-filet::after {
  content: ''; position: absolute; left: 50%; top: 50%; width: 5px; height: 5px;
  transform: translate(-50%,-50%) rotate(45deg); background: #e2bd8f; box-shadow: 0 0 10px rgba(226,189,143,.7);
}
.ps-bienvenue { font-size: 14px; letter-spacing: .04em; color: rgba(245,238,232,.62); }
.ps-titre {
  margin-top: 6px;
  font-family: var(--font-playfair-display, 'Playfair Display'), Georgia, serif;
  font-weight: 600; font-size: clamp(28px, 8vw, 40px); line-height: 1.15;
}
.ps-sous-titre { margin-top: 8px; font-size: 14.5px; color: rgba(245,238,232,.6); }

.ps-cartes {
  width: 100%; max-width: 980px;
  display: grid; grid-template-columns: 1fr; gap: 14px;
  margin-top: 26px;
}
.ps-carte {
  position: relative; overflow: hidden;
  height: 214px; border-radius: 22px;
  border: 1px solid rgba(245,238,232,.12);
  background: #141c17; color: inherit; font: inherit; text-align: left;
  padding: 0; cursor: pointer;
  box-shadow: 0 14px 34px rgba(0,0,0,.35);
  -webkit-tap-highlight-color: transparent;
  transition: transform .3s cubic-bezier(.22,1,.36,1), border-color .3s ease, box-shadow .3s ease;
  animation: ps-monte .7s cubic-bezier(.22,1,.36,1) both;
  animation-delay: calc(var(--i) * 90ms + 150ms);
}
.ps-photo { object-fit: cover; object-position: 50% 45%; transition: transform .8s cubic-bezier(.22,1,.36,1), filter .4s ease; filter: saturate(.92) brightness(.9); }
.ps-voile {
  position: absolute; inset: 0;
  background: linear-gradient(90deg, rgba(10,14,11,.88) 0%, rgba(10,14,11,.55) 52%, rgba(10,14,11,.08) 100%);
}
.ps-texte {
  position: absolute; inset: 0; padding: 18px 18px 16px;
  display: flex; flex-direction: column; justify-content: flex-end; gap: 4px;
  max-width: 86%;
}
.ps-accroche { font-size: 11px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: #d6ab7d; white-space: nowrap; }
.ps-nom {
  font-family: var(--font-playfair-display, 'Playfair Display'), Georgia, serif;
  font-weight: 600; font-size: 25px; line-height: 1.15;
}
.ps-desc { font-size: 13.5px; line-height: 1.4; color: rgba(245,238,232,.72); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ps-tags { display: flex; flex-wrap: nowrap; gap: 6px; margin-top: 8px; overflow: hidden; }
.ps-tag {
  padding: 4px 10px; border-radius: 999px; font-size: 11.5px; white-space: nowrap;
  background: rgba(245,238,232,.1); border: 1px solid rgba(245,238,232,.16); color: rgba(245,238,232,.82);
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
}
.ps-coche {
  position: absolute; top: 14px; right: 14px; z-index: 2;
  width: 30px; height: 30px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: transparent;
  border: 1.5px solid rgba(245,238,232,.5);
  background: rgba(10,14,11,.35);
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  transition: all .3s cubic-bezier(.34,1.56,.64,1);
}
.ps-carte--choisie {
  border-color: rgba(226,189,143,.85);
  box-shadow: 0 18px 44px rgba(166,119,73,.32), 0 0 0 1px rgba(226,189,143,.55), inset 0 0 0 1px rgba(226,189,143,.25);
}
.ps-carte--choisie .ps-photo { transform: scale(1.05); filter: saturate(1.05) brightness(1); }
.ps-carte--choisie .ps-coche {
  color: #fffaf4; border-color: transparent;
  background: linear-gradient(180deg, #c3925f, #8f633b);
  box-shadow: 0 4px 14px rgba(166,119,73,.55);
  transform: scale(1.08);
}
.ps-carte:active { transform: scale(.985); }
.ps-carte:focus-visible { outline: 2px solid #e2bd8f; outline-offset: 3px; }

.ps-pied {
  position: sticky; bottom: 0; z-index: 5;
  width: calc(100% + 36px); margin-top: 22px;
  padding: 18px 18px calc(env(safe-area-inset-bottom, 0px) + 18px);
  display: flex; flex-direction: column; align-items: center;
  background: linear-gradient(180deg, rgba(11,17,13,0) 0%, rgba(11,17,13,.92) 32%, #0b110d 100%);
}
.ps-cta {
  position: relative; overflow: hidden;
  width: 100%; max-width: 420px; height: 56px;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  border-radius: 16px; border: none; cursor: pointer;
  font: inherit; font-size: 16px; font-weight: 600; letter-spacing: .02em;
  color: #fffaf4;
  background: linear-gradient(180deg, #c3925f 0%, #a67749 52%, #8f633b 100%);
  box-shadow: 0 10px 28px rgba(166,119,73,.38), inset 0 1px 0 rgba(255,236,210,.35);
  transition: transform .2s ease, opacity .3s ease, filter .3s ease;
}
.ps-cta:disabled { cursor: default; filter: grayscale(.6) brightness(.55); box-shadow: none; }
.ps-cta:not(:disabled):active { transform: scale(.985); }
.ps-roue { width: 18px; height: 18px; animation: ps-tourne .8s linear infinite; }
.ps-note { margin-top: 12px; font-size: 12px; color: rgba(245,238,232,.4); }

.ps--sortie .ps-entete, .ps--sortie .ps-cartes { transition: opacity .6s ease, transform .6s ease; opacity: .35; transform: scale(.985); }

@keyframes ps-descend { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: none; } }
@keyframes ps-monte { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
@keyframes ps-tourne { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .ps *, .ps *::before, .ps *::after { animation: none !important; transition: none !important; }
}

/* Ordinateur : trois grandes cartes verticales côte à côte */
@media (min-width: 900px) {
  .ps { justify-content: center; padding: 48px 32px 0; }
  .ps-logo { font-size: 36px; }
  .ps-cartes { grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 36px; }
  .ps-carte { height: 460px; }
  .ps-carte:hover { transform: translateY(-6px); }
  .ps-carte:hover .ps-photo { transform: scale(1.04); }
  .ps-voile { background: linear-gradient(180deg, rgba(10,14,11,0) 30%, rgba(10,14,11,.6) 62%, rgba(10,14,11,.94) 100%); }
  .ps-texte { max-width: none; padding: 22px; }
  .ps-pied { position: static; background: none; width: 100%; padding: 30px 0 40px; }
}
`;
