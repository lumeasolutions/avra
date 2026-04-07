'use client';
import { useEffect, useState } from 'react';

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={scrolled ? 'scrolled' : ''}>
      <a href="/" className="nav-logo">
        <img src="/logoavra2.png" alt="AVRA Logo" />
        <span className="nav-logo-text">AVRA</span>
      </a>

      <div className="nav-links">
        <a href="/">Accueil</a>
        <a href="/fonctionnalites">Fonctionnalités</a>
        <a href="/comment-ca-marche">Comment ça marche</a>
        <a href="/temoignages">Témoignages</a>
        <a href="/tarifs">Tarifs</a>
        <a href="/metiers">Métiers</a>
      </div>

      <div className="nav-cta">
        <a href="/login"><button className="btn-nav-login">Connexion</button></a>
        <a href="/register"><button className="btn-nav-primary">Essai gratuit 14 jours</button></a>
      </div>

      <div
        className="nav-hamburger"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Menu"
      >
        <span />
        <span />
        <span />
      </div>

      {menuOpen && (
        <div style={{
          position: 'fixed', top: '76px', left: 0, right: 0,
          background: 'rgba(30,43,34,.97)', padding: '24px 5%',
          borderBottom: '1px solid rgba(201,169,110,.15)', zIndex: 199,
          display: 'flex', flexDirection: 'column', gap: '8px'
        }}>
          {[
            ['Accueil', '/'],
            ['Fonctionnalités', '/fonctionnalites'],
            ['Comment ça marche', '/comment-ca-marche'],
            ['Témoignages', '/temoignages'],
            ['Tarifs', '/tarifs'],
            ['Métiers', '/metiers'],
          ].map(([label, href]) => (
            <a key={href} href={href} style={{
              color: 'rgba(255,255,255,.85)', padding: '10px 0',
              fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,.06)'
            }}>{label}</a>
          ))}
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <a href="/login" style={{ flex: 1 }}>
              <button className="btn-nav-login" style={{ width: '100%' }}>Connexion</button>
            </a>
            <a href="/register" style={{ flex: 1 }}>
              <button className="btn-nav-primary" style={{ width: '100%' }}>Essai gratuit</button>
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
