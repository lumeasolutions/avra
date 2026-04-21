'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Twitter, Linkedin, Facebook } from 'lucide-react';

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
    metiers: [
      { label: 'Cuisiniste', href: '/metiers#cuisiniste' },
      { label: 'Menuisier', href: '/metiers#menuisier' },
      { label: "Architecte d'intérieur", href: '/metiers#architecte' },
      { label: 'Agenceur', href: '/metiers#agenceur' },
    ],
    resources: [
      { label: 'Blog', href: '/blog' },
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

  const socialLinks = [
    { icon: Twitter, href: 'https://twitter.com/avra_fr', label: 'Twitter' },
    { icon: Linkedin, href: 'https://linkedin.com/company/avra', label: 'LinkedIn' },
    { icon: Facebook, href: 'https://facebook.com/avra.fr', label: 'Facebook' },
  ];

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
          <div style={{ display: 'flex', gap: '12px', marginTop: '1.5rem' }}>
            {socialLinks.map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="footer-social-icon"
              >
                <Icon size={20} />
              </a>
            ))}
          </div>
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
          © {currentYear} AVRA by Luméa — Tous droits réservés · Conforme e-facture 2026 · Bêta privée, lancement juillet 2026
        </span>
        <div className="footer-bottom-links">
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/confidentialite">Politique de confidentialité</Link>
          <a href="mailto:contact@avra.fr">contact@avra.fr</a>
        </div>
      </div>

      <style jsx>{`
        .footer-social-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(201, 169, 110, 0.1);
          color: rgba(201, 169, 110, 0.6);
          transition: all 0.3s ease;
        }

        .footer-social-icon:hover {
          background: rgba(201, 169, 110, 0.25);
          color: #c9a96e;
        }
      `}</style>
    </footer>
  );
}
