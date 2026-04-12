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

  const navLinks = [
    { label: 'Fonctionnalités', href: '/fonctionnalites' },
    { label: 'Tarifs', href: '/tarifs' },
    { label: 'Comment ça marche', href: '/comment-ca-marche' },
    { label: 'Métiers', href: '/metiers' },
  ];

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4%',
          height: '72px',
          background: scrolled
            ? 'rgba(10, 17, 12, 0.92)'
            : 'rgba(14, 24, 16, 0.75)',
          backdropFilter: 'blur(24px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
          borderBottom: scrolled
            ? '1px solid rgba(201, 169, 110, 0.25)'
            : '1px solid rgba(201, 169, 110, 0.08)',
          boxShadow: scrolled
            ? '0 8px 40px rgba(0,0,0,0.4), 0 1px 0 rgba(201,169,110,0.15)'
            : 'none',
          transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* ══ LOGO GAUCHE ══ */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Logo chouette — vraie image dans cercle fond sombre */}
          <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
            <Image
              src="/logochouette4.png"
              alt="AVRA Logo"
              fill
              priority
              sizes="56px"
              style={{ objectFit: 'contain', filter: 'brightness(0.9) saturate(0.85)' }}
            />
          </div>

          {/* Texte AVRA */}
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.45rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            background: 'linear-gradient(135deg, #e8c97a 0%, #C9A96E 50%, #a07840 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: 'none',
            filter: 'drop-shadow(0 1px 4px rgba(201,169,110,0.3))',
          }}>AVRA</span>
        </Link>

        {/* ══ LIENS CENTRE ══ */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
        }} className="nav-links-desktop">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.75)',
              padding: '8px 16px',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              textDecoration: 'none',
            }}
            onMouseEnter={e => {
              (e.target as HTMLElement).style.color = '#C9A96E';
              (e.target as HTMLElement).style.background = 'rgba(201,169,110,0.1)';
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.75)';
              (e.target as HTMLElement).style.background = 'transparent';
            }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* ══ CTA + CHOUETTE DROITE ══ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }} className="nav-cta-desktop">
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <button style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.7)',
              padding: '9px 18px',
              borderRadius: '9px',
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minHeight: '40px',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = '#C9A96E';
              (e.currentTarget as HTMLElement).style.color = '#C9A96E';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.14)';
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)';
            }}
            >Connexion</button>
          </Link>

          <Link href="/demo" style={{ textDecoration: 'none' }}>
            <button style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              color: '#0e1810',
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #e8c97a, #C9A96E)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minHeight: '40px',
              boxShadow: '0 4px 16px rgba(201,169,110,0.35)',
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(201,169,110,0.5)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(201,169,110,0.35)';
            }}
            >Demander une démo</button>
          </Link>

        </div>

        {/* ══ HAMBURGER MOBILE ══ */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
          style={{
            display: 'none',
            background: 'none', border: 'none',
            color: '#fff', cursor: 'pointer',
            padding: '8px', minWidth: '44px', minHeight: '44px',
            alignItems: 'center', justifyContent: 'center',
          }}
          className="nav-hamburger"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* ══ MOBILE MENU ══ */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: '72px', left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 99,
          backdropFilter: 'blur(4px)',
        }} onClick={() => setMenuOpen(false)}>
          <div style={{
            background: 'rgba(14,24,16,0.98)',
            backdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(201,169,110,0.15)',
            padding: '24px 5%',
            display: 'flex', flexDirection: 'column', gap: '0',
          }} onClick={e => e.stopPropagation()}>
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} style={{
                color: 'rgba(255,255,255,0.85)', padding: '14px 0',
                fontSize: '1rem', fontWeight: 500,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                textDecoration: 'none', display: 'block',
                transition: 'color 0.2s',
              }} onClick={() => setMenuOpen(false)}>
                {link.label}
              </Link>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                <button style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer' }}>
                  Connexion
                </button>
              </Link>
              <Link href="/demo" onClick={() => setMenuOpen(false)}>
                <button style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #e8c97a, #C9A96E)', color: '#0e1810', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
                  Demander une démo
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes navOwlFloat {
          0%, 100% { transform: translateY(0px) rotate(-1.5deg) scale(1); }
          33% { transform: translateY(-3px) rotate(0deg) scale(1.02); }
          66% { transform: translateY(-5px) rotate(1.5deg) scale(1.01); }
        }
        @keyframes navOwlGlow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes owlRing {
          0%, 100% { opacity: 0.3; transform: scale(1) rotate(0deg); }
          50% { opacity: 0.8; transform: scale(1.12) rotate(180deg); }
        }
        .nav-links-desktop {
          display: flex;
        }
        .nav-cta-desktop {
          display: flex;
        }
        @media (max-width: 900px) {
          .nav-links-desktop { display: none !important; }
          .nav-cta-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  );
}
