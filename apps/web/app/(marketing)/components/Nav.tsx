'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    // Close menu on route change
    setMenuOpen(false);
  }, []);

  const navLinks = [
    { label: 'Fonctionnalités', href: '/fonctionnalites' },
    { label: 'Tarifs', href: '/tarifs' },
    { label: 'Comment ça marche', href: '/comment-ca-marche' },
    { label: 'Témoignages', href: '/temoignages' },
    { label: 'Métiers', href: '/metiers' },
  ];

  return (
    <>
      <nav className={scrolled ? 'scrolled' : ''}>
        {/* Logo */}
        <Link href="/" className="nav-logo">
          <Image
            src="/logoavra2.png"
            alt="AVRA Logo"
            width={120}
            height={40}
            priority
          />
          <span className="nav-logo-text">AVRA</span>
        </Link>

        {/* Desktop Links */}
        <div className="nav-links">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="nav-cta">
          <Link href="/login">
            <button className="btn-nav-login">Connexion</button>
          </Link>
          <Link href="/register">
            <button className="btn-nav-primary">Essai gratuit 14 jours</button>
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="mobile-menu-backdrop">
          <div className="mobile-menu">
            <nav className="mobile-menu-links">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="mobile-menu-link">
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mobile-menu-cta">
              <Link href="/login" className="mobile-menu-cta-link">
                <button className="btn-nav-login" style={{ width: '100%' }}>
                  Connexion
                </button>
              </Link>
              <Link href="/register" className="mobile-menu-cta-link">
                <button className="btn-nav-primary" style={{ width: '100%' }}>
                  Essai gratuit
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .mobile-menu-backdrop {
          position: fixed;
          top: 76px;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 99;
          animation: fadeIn 0.2s ease-out;
        }

        .mobile-menu {
          position: fixed;
          top: 76px;
          left: 0;
          right: 0;
          background: rgba(30, 43, 34, 0.98);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(201, 169, 110, 0.15);
          padding: 24px 5%;
          z-index: 100;
          max-height: calc(100vh - 76px);
          overflow-y: auto;
          animation: slideDown 0.3s ease-out;
        }

        .mobile-menu-links {
          display: flex;
          flex-direction: column;
          gap: 0;
          margin-bottom: 24px;
        }

        .mobile-menu-link {
          color: rgba(255, 255, 255, 0.85);
          padding: 12px 0;
          font-size: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          transition: color 0.3s ease;
          display: block;
        }

        .mobile-menu-link:hover {
          color: #c9a96e;
        }

        .mobile-menu-cta {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .mobile-menu-cta-link {
          display: block;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
