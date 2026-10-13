'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  House, FolderOpen, Sparkles, CalendarDays, LayoutGrid, X, Plus,
  FileSignature, Receipt, PenLine, CreditCard, CalendarRange, Package,
  Users, BarChart3, History, ShieldCheck, Settings, LifeBuoy, LogOut, ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useAssistantStore } from '@/store/useAssistantStore';
import { useConfigStore } from '@/store/useConfigStore';
import { useNavBadges } from '@/hooks/useNavBadges';

/**
 * Navigation de l'application sur téléphone (sous 900 px).
 *
 * Remplace le bouton « hamburger » et le menu latéral glissant :
 *   - une barre en bas à 5 entrées — Accueil, Dossiers, IA Studio (au centre,
 *     en relief : c'est l'outil qui distingue AVRA), Planning, Plus ;
 *   - « Plus » ouvre un menu plein écran, sur une photo de façades laquées,
 *     qui range tous les autres modules par usage.
 *
 * Sur ordinateur, rien ne change : ce composant n'est pas affiché (CSS) et le
 * menu latéral reste en place.
 */

/** Aperçu flou (12 x 26 px) de la photo du menu, affiché pendant son chargement. */
const FOND_MENU_FLOU =
  'data:image/webp;base64,UklGRnYAAABXRUJQVlA4IGoAAADwAwCdASoMABoAPtFWo0uoJKMhsAgBABoJYwCsACBsq2cy5bC+aLcAAP7xo51+kDM1u3XF5s653pGRHJUZA0mYvFV2X32opLWE3okkpc66gQxZbrmPCPPPKWLOMMa/IbtqCyO522XdVgAA';

const SUPPORT_EMAILS = ['lumeasolutions@outlook.fr', 'cgdesignplan@gmail.com'];

// Mêmes libellés que la page Paramètres > Équipe.
const ROLES: Record<string, string> = {
  OWNER: 'Propriétaire',
  ADMIN: 'Administrateur',
  MEMBER: 'Vendeur',
  VIEWER: 'Lecture seule',
};

type Tuile = {
  href: string;
  libelle: string;
  detail: string;
  icone: LucideIcon;
  pastille?: number;
};

type Rubrique = { titre: string; tuiles: Tuile[] };

function initiales(prenom?: string, nom?: string, email?: string): string {
  const p = (prenom ?? '').trim();
  const n = (nom ?? '').trim();
  if (p || n) return `${p.charAt(0)}${n.charAt(0)}`.toUpperCase() || 'A';
  return (email ?? 'A').charAt(0).toUpperCase();
}

export function MobileNav() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const [menuOuvert, setMenuOuvert] = useState(false);

  const user = useAuthStore((s) => s.user);
  const profession = useAuthStore((s) => s.profession);
  const logout = useAuthStore((s) => s.logout);
  const ouvrirAssistant = useAssistantStore((s) => s.setOpen);
  const assistantActif = useConfigStore((s) => s.iaConfig?.assistantActif ?? true);
  const b = useNavBadges();

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';
  const isSupport = !!user?.email && SUPPORT_EMAILS.includes(user.email.toLowerCase());
  const accueil = profession ? `/portail-${profession}` : '/dashboard';

  // Le menu se referme dès que la page change (lien suivi, retour arrière…).
  useEffect(() => { setMenuOuvert(false); }, [pathname]);

  // Menu ouvert : la page derrière ne défile plus, et « Échap » le referme.
  useEffect(() => {
    if (!menuOuvert) return;
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const surTouche = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOuvert(false); };
    window.addEventListener('keydown', surTouche);
    return () => {
      document.body.style.overflow = avant;
      window.removeEventListener('keydown', surTouche);
    };
  }, [menuOuvert]);

  const estActif = (prefixes: string[]) =>
    prefixes.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '-'));

  const ongletAccueil = pathname.startsWith('/portail-') || pathname === '/dashboard';
  const ongletDossiers = estActif(['/dossiers']);
  const ongletIA = estActif(['/ia-studio']);
  const ongletPlanning = estActif(['/planning']);
  const ongletPlus = !ongletAccueil && !ongletDossiers && !ongletIA && !ongletPlanning;

  const rubriques: Rubrique[] = [
    {
      titre: 'Ventes',
      tuiles: [
        { href: '/dossiers-signes', libelle: 'Dossiers signés', detail: 'Commandes, livraisons, pose', icone: FileSignature, pastille: b.confirmationsPendingCount },
        { href: '/facturation', libelle: 'Facturation', detail: 'Devis, factures, avoirs', icone: Receipt, pastille: b.factuBadge },
        { href: '/signature', libelle: 'E-Sign', detail: 'Signatures électroniques', icone: PenLine },
        { href: '/epaiement', libelle: 'E-Paiement', detail: 'Acomptes et règlements', icone: CreditCard },
      ],
    },
    {
      titre: 'Atelier & chantiers',
      tuiles: [
        { href: '/planning-gestion', libelle: 'Planning des poseurs', detail: 'Équipes et interventions', icone: CalendarRange, pastille: b.retardCount },
        { href: '/stock', libelle: 'Stock', detail: 'Articles et mouvements', icone: Package },
        { href: '/intervenants', libelle: 'Intervenants', detail: 'Artisans et demandes', icone: Users, pastille: b.demandesActionCount },
      ],
    },
    {
      titre: 'Pilotage',
      tuiles: [
        { href: '/statistiques', libelle: 'Statistiques', detail: "Chiffre d'affaires, marges", icone: BarChart3 },
        { href: '/historique', libelle: 'Historique', detail: 'Alertes et relances', icone: History, pastille: b.alertCount },
        ...(isAdmin ? [{ href: '/admin-docs', libelle: 'Dossier administratif', detail: 'Documents de la société', icone: ShieldCheck }] : []),
      ],
    },
  ];

  const nomComplet = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Mon compte';
  const role = (user?.role && ROLES[user.role]) || 'Collaborateur';

  const deconnexion = () => {
    setMenuOuvert(false);
    logout();
    router.push('/login');
  };

  const pastilleTotale = b.factuBadge + b.alertCount + b.demandesActionCount + b.retardCount;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* ── Barre du bas ─────────────────────────────────────────── */}
      <nav className="mn-barre" aria-label="Navigation principale">
        <Link href={accueil} className={`mn-onglet${ongletAccueil ? ' mn-actif' : ''}`} aria-current={ongletAccueil ? 'page' : undefined}>
          <House className="mn-ico" strokeWidth={1.8} aria-hidden="true" />
          <span>Accueil</span>
        </Link>

        <Link href="/dossiers" className={`mn-onglet${ongletDossiers ? ' mn-actif' : ''}`} aria-current={ongletDossiers ? 'page' : undefined}>
          <span className="mn-ico-wrap">
            <FolderOpen className="mn-ico" strokeWidth={1.8} aria-hidden="true" />
            {b.urgentCount > 0 && <span className="mn-pastille">{b.urgentCount > 99 ? '99+' : b.urgentCount}</span>}
          </span>
          <span>Dossiers</span>
        </Link>

        <Link href="/ia-studio" className={`mn-ia${ongletIA ? ' mn-actif' : ''}`} aria-label="IA Studio" aria-current={ongletIA ? 'page' : undefined}>
          <span className="mn-ia-bulle">
            <span className="mn-ia-halo" aria-hidden="true" />
            <Sparkles className="mn-ia-ico" strokeWidth={1.7} aria-hidden="true" />
          </span>
          <span className="mn-ia-texte">IA Studio</span>
        </Link>

        <Link href="/planning" className={`mn-onglet${ongletPlanning ? ' mn-actif' : ''}`} aria-current={ongletPlanning ? 'page' : undefined}>
          <CalendarDays className="mn-ico" strokeWidth={1.8} aria-hidden="true" />
          <span>Planning</span>
        </Link>

        <button
          type="button"
          className={`mn-onglet${ongletPlus || menuOuvert ? ' mn-actif' : ''}`}
          onClick={() => setMenuOuvert(true)}
          aria-haspopup="dialog"
          aria-expanded={menuOuvert}
        >
          <span className="mn-ico-wrap">
            <LayoutGrid className="mn-ico" strokeWidth={1.8} aria-hidden="true" />
            {pastilleTotale > 0 && <span className="mn-pastille mn-pastille--point" aria-label={`${pastilleTotale} éléments à traiter`} />}
          </span>
          <span>Plus</span>
        </button>
      </nav>

      {/* ── Menu « Plus » ────────────────────────────────────────── */}
      <MenuPlus
        ouvert={menuOuvert}
        fermer={() => setMenuOuvert(false)}
        rubriques={rubriques}
        nomComplet={nomComplet}
        role={role}
        espace={user?.workspaceName}
        initiales={initiales(user?.firstName, user?.lastName, user?.email)}
        isSupport={isSupport}
        assistantActif={assistantActif}
        ouvrirAssistant={() => { setMenuOuvert(false); ouvrirAssistant(true); }}
        deconnexion={deconnexion}
      />
    </>
  );
}

function MenuPlus(props: {
  ouvert: boolean;
  fermer: () => void;
  rubriques: Rubrique[];
  nomComplet: string;
  role: string;
  espace?: string;
  initiales: string;
  isSupport: boolean;
  assistantActif: boolean;
  ouvrirAssistant: () => void;
  deconnexion: () => void;
}) {
  const { ouvert, fermer } = props;
  // Glisser la poignée vers le bas referme le menu, comme une feuille iOS.
  const feuille = useRef<HTMLDivElement>(null);
  const depart = useRef<number | null>(null);
  const [decalage, setDecalage] = useState(0);
  // Monté seulement après la première ouverture : la photo de fond n'est pas
  // téléchargée tant que personne n'ouvre le menu.
  const [dejaOuvert, setDejaOuvert] = useState(false);
  useEffect(() => { if (ouvert) setDejaOuvert(true); }, [ouvert]);
  useEffect(() => { if (ouvert) { setDecalage(0); feuille.current?.focus(); } }, [ouvert]);

  if (!dejaOuvert) return null;

  let index = 0;

  return (
    <div className={`mn-plus${ouvert ? ' mn-plus--ouvert' : ''}`} aria-hidden={!ouvert}>
      <div className="mn-voile" onClick={fermer} />
      <div
        ref={feuille}
        className="mn-feuille"
        role="dialog"
        aria-modal="true"
        aria-label="Tous les modules"
        tabIndex={-1}
        style={decalage ? { transform: `translateY(${decalage}px)`, transition: 'none' } : undefined}
      >
        <div className="mn-fond" aria-hidden="true">
          <Image
            src="/images/mobile/menu-laque.webp"
            alt=""
            fill
            sizes="100vw"
            quality={85}
            placeholder="blur"
            blurDataURL={FOND_MENU_FLOU}
            style={{ objectFit: 'cover', objectPosition: '50% 40%' }}
          />
          <div className="mn-fond-ombre" />
        </div>

        <div
          className="mn-poignee-zone"
          onTouchStart={(e) => { depart.current = e.touches[0].clientY; }}
          onTouchMove={(e) => {
            if (depart.current === null) return;
            setDecalage(Math.max(0, e.touches[0].clientY - depart.current));
          }}
          onTouchEnd={() => {
            if (decalage > 110) fermer();
            depart.current = null;
            setDecalage(0);
          }}
        >
          <span className="mn-poignee" />
        </div>

        <div className="mn-contenu">
          <header className="mn-entete">
            <div className="mn-avatar" aria-hidden="true">{props.initiales}</div>
            <div className="mn-identite">
              <strong>{props.nomComplet}</strong>
              <span>{props.role}{props.espace ? ` · ${props.espace}` : ''}</span>
            </div>
            <button type="button" className="mn-fermer" onClick={fermer} aria-label="Fermer le menu">
              <X size={20} strokeWidth={1.8} />
            </button>
          </header>

          <div className="mn-actions">
            <Link href="/dossiers/nouveau" className="mn-action mn-action--cuivre" onClick={fermer} style={{ ['--i' as string]: index++ }}>
              <Plus size={19} strokeWidth={2} aria-hidden="true" />
              Nouveau dossier
            </Link>
            {props.assistantActif && (
              <button type="button" className="mn-action" onClick={props.ouvrirAssistant} style={{ ['--i' as string]: index++ }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/nouveaulogochouette.webp" alt="" width={22} height={22} className="mn-chouette" />
                Assistant AVRA
              </button>
            )}
          </div>

          {props.rubriques.map((r) => (
            <section key={r.titre} className="mn-rubrique">
              <h2 className="mn-rubrique-titre" style={{ ['--i' as string]: index++ }}>{r.titre}</h2>
              <div className="mn-grille">
                {r.tuiles.map((t) => {
                  const Icone = t.icone;
                  return (
                    <Link key={t.href} href={t.href} className="mn-tuile" onClick={fermer} style={{ ['--i' as string]: index++ }}>
                      <span className="mn-tuile-ico">
                        <Icone size={20} strokeWidth={1.7} aria-hidden="true" />
                      </span>
                      <span className="mn-tuile-texte">
                        <strong>{t.libelle}</strong>
                        <span>{t.detail}</span>
                      </span>
                      {t.pastille ? <span className="mn-tuile-pastille">{t.pastille > 99 ? '99+' : t.pastille}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}

          <section className="mn-rubrique">
            <h2 className="mn-rubrique-titre" style={{ ['--i' as string]: index++ }}>Compte</h2>
            <div className="mn-liste">
              <Link href="/parametres" className="mn-ligne" onClick={fermer} style={{ ['--i' as string]: index++ }}>
                <Settings size={19} strokeWidth={1.7} aria-hidden="true" />
                <span>Paramètres</span>
                <ChevronRight size={17} className="mn-chevron" aria-hidden="true" />
              </Link>
              {props.isSupport && (
                <Link href="/support" className="mn-ligne" onClick={fermer} style={{ ['--i' as string]: index++ }}>
                  <LifeBuoy size={19} strokeWidth={1.7} aria-hidden="true" />
                  <span>Support</span>
                  <ChevronRight size={17} className="mn-chevron" aria-hidden="true" />
                </Link>
              )}
              <button type="button" className="mn-ligne mn-ligne--sortie" onClick={props.deconnexion} style={{ ['--i' as string]: index++ }}>
                <LogOut size={19} strokeWidth={1.7} aria-hidden="true" />
                <span>Se déconnecter</span>
              </button>
            </div>
          </section>

          <p className="mn-signature">AVRA · Le logiciel des cuisinistes d&apos;exception</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Styles préfixés « mn- ». Injectés par dangerouslySetInnerHTML : en enfant
 * texte d'une balise <style>, React échappe les apostrophes différemment côté
 * serveur et côté navigateur (erreur d'hydratation).
 */
const STYLES = `
.mn-barre, .mn-plus { display: none; }

@media (max-width: 900px) {
  /* L'ancienne navigation mobile (bouton hamburger + menu glissant) s'efface. */
  .sidebar-hamburger, .sidebar-overlay { display: none !important; }

  /* Le contenu ne réserve plus de place au hamburger en haut, mais à la
     barre en bas. */
  .app-main-content {
    padding-top: calc(env(safe-area-inset-top, 0px) + 14px) !important;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 104px) !important;
  }

  /* L'assistant (la chouette) remonte au-dessus de la barre, sans son
     étiquette, plus discret pour ne pas masquer le contenu. */
  .avra-fab-dock {
    bottom: calc(env(safe-area-inset-bottom, 0px) + 88px) !important;
    right: 14px !important;
    transform: scale(.82); transform-origin: bottom right;
  }
  .avra-fab-dock .avra-label { display: none !important; }

  /* Panneau de l'assistant ouvert : au-dessus de la barre (sinon elle masquait
     le champ de saisie), sur toute la largeur de l'écran. */
  .ap-flottant {
    left: 10px !important; right: 10px !important; width: auto !important;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 84px) !important;
    max-height: calc(100dvh - env(safe-area-inset-top, 0px) - 110px) !important;
    z-index: 150 !important;
  }

  .mn-barre {
    --mn-cuivre: #c99a6a;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    align-items: end;
    /* 45 : au-dessus du contenu des pages, en dessous des fenêtres modales
       (z-index 50 et plus) — sinon la barre masquait leurs boutons du bas. */
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 45;
    padding: 6px 6px calc(env(safe-area-inset-bottom, 0px) + 6px);
    background: linear-gradient(180deg, rgba(24,33,27,.86) 0%, rgba(13,19,15,.95) 100%);
    -webkit-backdrop-filter: blur(20px) saturate(150%);
    backdrop-filter: blur(20px) saturate(150%);
    border-top: 1px solid rgba(245,238,232,.09);
    box-shadow: 0 -10px 30px rgba(10,14,11,.28);
    font-family: var(--font-dm-sans, 'DM Sans'), -apple-system, 'Segoe UI', Roboto, sans-serif;
  }
  .mn-onglet {
    position: relative;
    display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 4px;
    min-height: 54px; padding: 6px 0 4px;
    background: none; border: none; cursor: pointer;
    color: rgba(245,238,232,.56);
    font: inherit; font-size: 10.5px; font-weight: 500; letter-spacing: .02em;
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
    transition: color .2s ease;
  }
  .mn-onglet .mn-ico { width: 23px; height: 23px; transition: transform .25s cubic-bezier(.34,1.56,.64,1); }
  .mn-onglet:active .mn-ico { transform: scale(.88); }
  .mn-onglet.mn-actif { color: var(--mn-cuivre); }
  .mn-onglet.mn-actif::before {
    content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%);
    width: 22px; height: 3px; border-radius: 0 0 3px 3px;
    background: linear-gradient(90deg, #a67749, #e2bd8f, #a67749);
    box-shadow: 0 0 12px rgba(226,189,143,.7);
  }
  .mn-ico-wrap { position: relative; display: inline-flex; }
  .mn-pastille {
    position: absolute; top: -5px; right: -10px;
    min-width: 17px; height: 17px; padding: 0 4px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    background: #c4553f; color: #fff; font-size: 10px; font-weight: 700;
    border: 2px solid #141c17;
  }
  .mn-pastille--point { min-width: 10px; width: 10px; height: 10px; padding: 0; top: -2px; right: -3px; }

  /* Bouton central IA Studio, en relief au-dessus de la barre */
  .mn-ia {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    text-decoration: none; -webkit-tap-highlight-color: transparent;
    margin-top: -26px;
  }
  .mn-ia-bulle {
    position: relative;
    width: 60px; height: 60px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: radial-gradient(circle at 32% 28%, #e8c79c 0%, #c3925f 32%, #a67749 62%, #7d5530 100%);
    box-shadow:
      0 10px 24px rgba(166,119,73,.45),
      0 0 0 5px #141c17,
      0 0 0 6px rgba(226,189,143,.35),
      inset 0 2px 0 rgba(255,240,220,.45),
      inset 0 -3px 8px rgba(60,35,15,.35);
    transition: transform .25s cubic-bezier(.34,1.56,.64,1);
  }
  .mn-ia:active .mn-ia-bulle { transform: scale(.92); }
  .mn-ia-halo {
    position: absolute; inset: -6px; border-radius: 50%;
    border: 1px solid rgba(226,189,143,.55);
    animation: mn-halo 3.2s ease-out infinite;
  }
  .mn-ia-ico { width: 27px; height: 27px; color: #fffaf4; filter: drop-shadow(0 1px 2px rgba(60,35,15,.5)); }
  .mn-ia-texte { font-size: 10.5px; font-weight: 600; letter-spacing: .02em; color: rgba(245,238,232,.8); }
  .mn-ia.mn-actif .mn-ia-texte { color: #e2bd8f; }
  @keyframes mn-halo { 0% { transform: scale(1); opacity: .9; } 100% { transform: scale(1.35); opacity: 0; } }

  /* ── Menu « Plus » ── */
  .mn-plus { display: block; position: fixed; inset: 0; z-index: 300; pointer-events: none; }
  .mn-plus--ouvert { pointer-events: auto; }
  .mn-voile {
    position: absolute; inset: 0; background: rgba(6,9,7,.55);
    -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
    opacity: 0; transition: opacity .3s ease;
  }
  .mn-plus--ouvert .mn-voile { opacity: 1; }
  .mn-feuille {
    position: absolute; left: 0; right: 0; bottom: 0;
    height: calc(100% - env(safe-area-inset-top, 0px) - 18px);
    border-radius: 28px 28px 0 0;
    overflow: hidden; outline: none;
    background: #0f1612;
    color: #f5eee8;
    font-family: var(--font-dm-sans, 'DM Sans'), -apple-system, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 -20px 60px rgba(0,0,0,.5);
    transform: translateY(104%);
    transition: transform .45s cubic-bezier(.22,1,.36,1);
  }
  .mn-plus--ouvert .mn-feuille { transform: translateY(0); }
  .mn-fond { position: absolute; inset: 0; }
  .mn-fond-ombre {
    position: absolute; inset: 0;
    background:
      linear-gradient(180deg, rgba(10,14,11,.35) 0%, rgba(10,14,11,.62) 30%, rgba(10,14,11,.86) 70%, rgba(10,14,11,.94) 100%);
  }
  .mn-poignee-zone { position: relative; z-index: 2; height: 26px; display: flex; justify-content: center; align-items: center; touch-action: none; }
  .mn-poignee { width: 42px; height: 5px; border-radius: 3px; background: rgba(245,238,232,.35); }
  .mn-contenu {
    position: relative; z-index: 1;
    height: calc(100% - 26px);
    overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;
    padding: 4px 18px calc(env(safe-area-inset-bottom, 0px) + 28px);
  }

  .mn-entete { display: flex; align-items: center; gap: 13px; padding: 4px 2px 18px; }
  .mn-avatar {
    width: 50px; height: 50px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-playfair-display, 'Playfair Display'), Georgia, serif; font-size: 19px; font-weight: 600;
    color: #fffaf4;
    background: linear-gradient(145deg, #3d5244, #202b24);
    border: 1.5px solid rgba(226,189,143,.6);
    box-shadow: 0 6px 18px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.12);
  }
  .mn-identite { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .mn-identite strong {
    font-family: var(--font-playfair-display, 'Playfair Display'), Georgia, serif;
    font-size: 20px; font-weight: 600; line-height: 1.2;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .mn-identite span { font-size: 13px; color: rgba(245,238,232,.62); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mn-fermer {
    width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: rgba(245,238,232,.08); border: 1px solid rgba(245,238,232,.14);
    color: #f5eee8; cursor: pointer;
  }

  .mn-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px; }
  .mn-action {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    height: 50px; border-radius: 15px;
    font: inherit; font-size: 14.5px; font-weight: 600; color: #f5eee8; text-decoration: none;
    background: rgba(20,28,23,.55); border: 1px solid rgba(245,238,232,.14);
    -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
    cursor: pointer;
  }
  .mn-action--cuivre {
    color: #fffaf4; border-color: transparent;
    background: linear-gradient(180deg, #c3925f 0%, #a67749 55%, #8f633b 100%);
    box-shadow: 0 8px 22px rgba(166,119,73,.35), inset 0 1px 0 rgba(255,236,210,.35);
  }
  .mn-chouette { width: 22px; height: 22px; object-fit: contain; filter: drop-shadow(0 1px 3px rgba(0,0,0,.5)); }

  .mn-rubrique { margin-top: 22px; }
  .mn-rubrique-titre {
    display: flex; align-items: center; gap: 10px;
    margin: 0 2px 11px;
    font-size: 11.5px; font-weight: 600; letter-spacing: .18em; text-transform: uppercase;
    color: #d6ab7d;
  }
  .mn-rubrique-titre::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, rgba(201,154,106,.45), transparent); }

  .mn-grille { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .mn-tuile {
    position: relative;
    display: flex; flex-direction: column; align-items: flex-start; gap: 12px;
    min-height: 112px; padding: 14px 13px 13px;
    border-radius: 18px; text-decoration: none; color: #f5eee8;
    background: linear-gradient(160deg, rgba(42,54,46,.62) 0%, rgba(18,25,21,.72) 100%);
    border: 1px solid rgba(245,238,232,.11);
    -webkit-backdrop-filter: blur(16px) saturate(140%); backdrop-filter: blur(16px) saturate(140%);
    box-shadow: 0 10px 26px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.06);
    -webkit-tap-highlight-color: transparent;
    transition: transform .2s ease, border-color .2s ease;
  }
  .mn-tuile:active { transform: scale(.97); border-color: rgba(201,154,106,.55); }
  /* Tuile seule sur sa ligne : elle prend toute la largeur, en version couchée. */
  .mn-grille > .mn-tuile:last-child:nth-child(odd) {
    grid-column: 1 / -1; flex-direction: row; align-items: center; min-height: 74px;
  }
  .mn-tuile-ico {
    width: 40px; height: 40px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    color: #e2bd8f;
    background: linear-gradient(145deg, rgba(166,119,73,.28), rgba(166,119,73,.08));
    border: 1px solid rgba(226,189,143,.32);
    box-shadow: inset 0 1px 0 rgba(255,240,220,.12);
  }
  .mn-tuile-texte { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .mn-tuile-texte strong { font-size: 14.5px; font-weight: 600; line-height: 1.25; }
  .mn-tuile-texte span { font-size: 12px; line-height: 1.35; color: rgba(245,238,232,.55); }
  .mn-tuile-pastille {
    position: absolute; top: 12px; right: 12px;
    min-width: 22px; height: 22px; padding: 0 6px; border-radius: 11px;
    display: flex; align-items: center; justify-content: center;
    font-size: 11.5px; font-weight: 700; color: #fff;
    background: #c4553f; box-shadow: 0 0 0 3px rgba(196,85,63,.18);
  }

  .mn-liste {
    border-radius: 18px; overflow: hidden;
    background: rgba(18,25,21,.62); border: 1px solid rgba(245,238,232,.1);
    -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
  }
  .mn-ligne {
    width: 100%; display: flex; align-items: center; gap: 13px;
    min-height: 54px; padding: 0 16px;
    font: inherit; font-size: 15px; color: #f5eee8; text-decoration: none; text-align: left;
    background: none; border: none; cursor: pointer;
  }
  .mn-ligne + .mn-ligne { border-top: 1px solid rgba(245,238,232,.07); }
  .mn-ligne svg:first-child { color: #d6ab7d; flex-shrink: 0; }
  .mn-ligne span { flex: 1; }
  .mn-chevron { color: rgba(245,238,232,.35); }
  .mn-ligne--sortie, .mn-ligne--sortie svg:first-child { color: #e8968a !important; }

  .mn-signature { margin-top: 26px; text-align: center; font-size: 11.5px; letter-spacing: .06em; color: rgba(245,238,232,.35); }

  /* Entrée en cascade des éléments du menu */
  .mn-plus--ouvert .mn-action,
  .mn-plus--ouvert .mn-rubrique-titre,
  .mn-plus--ouvert .mn-tuile,
  .mn-plus--ouvert .mn-ligne {
    animation: mn-monte .5s cubic-bezier(.22,1,.36,1) both;
    animation-delay: calc(var(--i, 0) * 28ms + 120ms);
  }
  @keyframes mn-monte { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }

  @media (prefers-reduced-motion: reduce) {
    .mn-ia-halo { animation: none; }
    .mn-feuille, .mn-voile { transition: none; }
    .mn-plus--ouvert .mn-action, .mn-plus--ouvert .mn-rubrique-titre,
    .mn-plus--ouvert .mn-tuile, .mn-plus--ouvert .mn-ligne { animation: none; }
  }
}
`;
