'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { label: 'Fonctionnalités', href: '/fonctionnalites' },
      { label: 'Tarifs', href: '/tarifs' },
      { label: 'Comment ça marche', href: '/comment-ca-marche' },
      { label: 'Témoignages', href: '/temoignages' },
      { label: 'Démo', href: '/demo' },
      { label: '🌱 Rejoindre la bêta', href: '/rejoindre' },
    ],
    // SEO 06/09/2026 — on pointe les vraies pages metier, plus les ancres de
    // /metiers. Deux raisons : les ancres #cuisiniste et #agenceur n'existent
    // pas (les identifiants du tableau de /metiers sont « cuisiniste-agenceur »
    // et « architecte »), et surtout /agenceur n'avait AUCUN lien entrant sur
    // tout le site alors qu'il est dans le sitemap. Sur /metiers, seule la
    // fiche du metier actif est rendue : les trois autres liens n'existent pas
    // dans le HTML. Le pied de page est donc le seul lien permanent vers ces
    // quatre pages.
    metiers: [
      { label: 'Cuisiniste', href: '/cuisiniste' },
      { label: 'Menuisier', href: '/menuisier' },
      { label: "Architecte d'intérieur", href: '/architecte-interieur' },
      { label: 'Agenceur', href: '/agenceur' },
      { label: 'Comparer les métiers', href: '/metiers' },
    ],
    resources: [
      { label: 'Blog', href: '/blog' },
      { label: 'Glossaire métier', href: '/glossaire' },
      { label: 'Guide e-facture 2026', href: '/blog/e-facture-2026' },
      { label: 'Comparatif logiciels', href: '/blog/logiciel-cuisiniste-comparatif' },
      { label: 'Contact', href: '/contact' },
    ],
    legal: [
      { label: 'Mentions légales', href: '/mentions-legales' },
      { label: 'Politique de confidentialité', href: '/confidentialite' },
      { label: 'CGV', href: '/cgv' },
    ],
  };

  // Pas de liens vers des reseaux sociaux : les comptes Twitter, LinkedIn et
  // Facebook affiches ici n'existaient pas (verifie avec Esteve, sept. 2026).
  // Un lien mort en pied de page dessert le referencement et la credibilite ;
  // on les remet le jour ou les comptes existent vraiment.

  return (
    <footer>
      <div className="footer-grid">
        {/* Brand Column */}
        <div className="footer-brand">
          <div className="nav-logo-text">AVRA</div>
          <p>
            L&apos;ERP intelligent conçu pour les professionnels de l&apos;agencement
            intérieur. Cuisinistes, menuisiers, architectes — tout en un.
          </p>
        </div>

        {/* Produit Column */}
        <div className="footer-col">
          <h5>Produit</h5>
          {footerLinks.product.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Métiers Column */}
        <div className="footer-col">
          <h5>Métiers</h5>
          {footerLinks.metiers.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Ressources Column (combined Resources + Legal for 4 cols) */}
        <div className="footer-col">
          <h5>Ressources</h5>
          {footerLinks.resources.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          <h5 style={{ marginTop: '2rem' }}>Légal</h5>
          {footerLinks.legal.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="footer-bottom">
        <span>
          © {currentYear} AVRA by Luméa — Tous droits réservés · Conforme e-facture 2026 · Bêta privée, lancement janvier 2027
        </span>
        <div className="footer-bottom-links">
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/confidentialite">Politique de confidentialité</Link>
          <a href="mailto:contact@avra-app.fr">contact@avra-app.fr</a>
        </div>
      </div>

    </footer>
  );
}
