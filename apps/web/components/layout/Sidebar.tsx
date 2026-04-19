'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

import { useDossierStore, useFacturationStore, useUIStore } from '@/store';
import { AssistantPanel } from './AssistantPanel';
import { useAuthStore } from '@/store/useAuthStore';

const PROFESSION_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  architecte: { label: "Architecte d'intérieur", emoji: '🏛️', color: '#3D5449' },
  menuisier:  { label: 'Menuisier',               emoji: '🪵', color: '#7B4F2E' },
  cuisiniste: { label: 'Cuisiniste',               emoji: '🍳', color: '#1A3A5C' },
};

export function Sidebar() {
  const pathname = usePathname() ?? '';
  const dossiers = useDossierStore(s => s.dossiers);
  const dossiersSignes = useDossierStore(s => s.dossiersSignes);
  const invoices = useFacturationStore(s => s.invoices);
  const devis = useFacturationStore(s => s.devis);
  const alerts = useUIStore(s => s.alerts);
  const profession = useAuthStore(s => s.profession);
  const professionInfo = profession ? PROFESSION_LABELS[profession] : null;
  const urgentCount = useMemo(() => dossiers.filter(d => d.status === 'URGENT').length, [dossiers]);
  const signedCount = dossiersSignes.length;
  const retardCount = useMemo(() => invoices.filter(e => e.statut === 'RETARD').length, [invoices]);
  const alertCount = useMemo(() => alerts.filter(a => !a.dismissed).length, [alerts]);
  const devisSignatureCount = useMemo(() => devis.filter(d => d.signatureStatus === 'EN_ATTENTE_SIGNATURE').length, [devis]);
  const devisEnvoyeCount = useMemo(() => devis.filter(d => d.statut === 'ENVOYÉ').length, [devis]);
  const factuBadge = retardCount + devisSignatureCount + devisEnvoyeCount;
  const confirmationsPendingCount = useMemo(
    () => dossiersSignes.reduce((s, d) => s + (d.confirmations ?? []).filter(c => !c.validee).length, 0),
    [dossiersSignes]
  );

  // ── Mobile open/close state ──────────────────────────────────────────────
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  const sidebarContent = (
    <div className="sidebar" style={mobileOpen ? { transform: 'translateX(0)' } : undefined}>

      <svg className="sidebar-bg" viewBox="0 0 400 900" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">

      <defs>



      <linearGradient id="sidebarGrad" x1="0" y1="0" x2="0" y2="1">

      <stop offset="0%" stopColor="#1a2a1e"/>

      <stop offset="25%" stopColor="#2a3f30"/>

      <stop offset="55%" stopColor="#384f3d"/>

      <stop offset="80%" stopColor="#2a3f30"/>

      <stop offset="100%" stopColor="#1a2a1e"/>

      </linearGradient>



      <clipPath id="sidebarClip">

      <path d="M 0,0 L 390,0 L 390,900 L 0,900 Z"/>

      </clipPath>



      <filter id="grain" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">

      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" result="noise"/>

      <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise"/>

      <feBlend in="SourceGraphic" in2="grayNoise" mode="overlay" result="blended"/>

      <feComposite in="blended" in2="SourceGraphic" operator="in"/>

      </filter>



      <filter id="innerShadow" x="-5%" y="-5%" width="110%" height="110%">

      <feGaussianBlur in="SourceAlpha" stdDeviation="12" result="blur"/>

      <feComposite in="blur" in2="SourceAlpha" operator="in" result="innerBlur"/>

      <feColorMatrix type="matrix" in="innerBlur"

      values="0 0 0 0 0

      0 0 0 0 0

      0 0 0 0 0

      0 0 0 0.6 0" result="coloredShadow"/>

      <feMerge>

      <feMergeNode in="SourceGraphic"/>

      <feMergeNode in="coloredShadow"/>

      </feMerge>

      </filter>



      <radialGradient id="softLight" cx="20%" cy="15%" r="60%">

      <stop offset="0%" stopColor="rgba(255,255,255,0.08)"/>

      <stop offset="100%" stopColor="rgba(255,255,255,0)"/>

      </radialGradient>



      <linearGradient id="edgeShadow" x1="0" y1="0" x2="1" y2="0">

      <stop offset="0%" stopColor="rgba(0,0,0,0)"/>

      <stop offset="80%" stopColor="rgba(0,0,0,0)"/>

      <stop offset="100%" stopColor="rgba(0,0,0,0.35)"/>

      </linearGradient>



      <linearGradient id="topShadow" x1="0" y1="0" x2="0" y2="1">

      <stop offset="0%" stopColor="rgba(0,0,0,0.3)"/>

      <stop offset="15%" stopColor="rgba(0,0,0,0)"/>

      </linearGradient>



      <linearGradient id="bottomShadow" x1="0" y1="0" x2="0" y2="1">

      <stop offset="85%" stopColor="rgba(0,0,0,0)"/>

      <stop offset="100%" stopColor="rgba(0,0,0,0.3)"/>

      </linearGradient>

      </defs>

















      {/* Fond droit */}
      <path d="M 0,0 L 265,0 L 265,900 L 0,900 Z" fill="url(#sidebarGrad)"/>

      {/* Lumière douce */}
      <path d="M 0,0 L 265,0 L 265,900 L 0,900 Z" fill="url(#softLight)"/>

      </svg>



      {/* Bouton fermer (mobile uniquement) */}
      <button
        className="sidebar-close-btn"
        onClick={close}
        aria-label="Fermer le menu"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" width={20} height={20}>
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      {/* Bouton paramètres — roue en haut à gauche */}
      <Link href="/parametres" style={{
        position: 'absolute', top: 14, left: 14, zIndex: 20,
        width: 34, height: 34, borderRadius: '50%',
        background: 'rgba(255,255,255,0.10)',
        border: '1px solid rgba(255,255,255,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      }} onClick={close}>
        <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" width={16} height={16}>
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </Link>

      {/* Bouton historique — sous paramètres */}
      <Link href="/historique" style={{
        position: 'absolute', top: 54, left: 14, zIndex: 20,
        width: 34, height: 34, borderRadius: '50%',
        background: 'rgba(255,255,255,0.10)',
        border: '1px solid rgba(255,255,255,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      }} onClick={close}>
        <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" width={16} height={16}>
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        {alertCount > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            background: '#C0392B', color: 'white',
            fontSize: 8, fontWeight: 800,
            width: 14, height: 14, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{alertCount}</span>
        )}
      </Link>

      <div className="sidebar-logo">

      <div style={{background: "transparent", boxShadow: "none", width: "220px", height: "220px"}}>

      <Image src="/logosidebar3.png"

      width={220}

      height={220}

      priority

      style={{width: "220px", height: "220px", objectFit: "cover", borderRadius: "16px"}}

      alt="AVRA Logo"/>

      </div>

      </div>



      <Link href="/dossiers/nouveau" className="btn-nouveau" onClick={close}>

      <svg viewBox="0 0 24 24" fill="none">

      <line x1="12" y1="5" x2="12" y2="19"/>

      <line x1="5" y1="12" x2="19" y2="12"/>

      </svg>

      Nouveau dossier

      </Link>


      <nav className="menu-list">
        {profession && (
          <Link
            href={`/portail-${profession}`}
            className={`menu-item ${pathname.startsWith('/portail-') || pathname === '/dashboard' ? 'active' : ''}`}
            onClick={close}
          >
            <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
            Tableau de bord
          </Link>
        )}
        <Link href="/dossiers" className={`menu-item ${pathname === '/dossiers' ? 'active' : ''}`} onClick={close}>
          <svg viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          Dossiers en cours
          {urgentCount > 0 && <span className="badge">{urgentCount}</span>}
        </Link>
        <Link href="/dossiers-signes" className={`menu-item ${pathname === '/dossiers-signes' ? 'active' : ''}`} onClick={close}>
          <svg viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          Dossiers signés
          {signedCount > 0 && <span className="badge">{signedCount}</span>}
          {confirmationsPendingCount > 0 && <span style={{marginLeft:'2px'}} className="badge" title="Confirmations fournisseurs en attente">{confirmationsPendingCount}</span>}
        </Link>
        <Link href="/planning" className={`menu-item ${pathname === '/planning' ? 'active' : ''}`} onClick={close}>
          <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Planning
        </Link>
        <Link href="/planning-gestion" className={`menu-item ${pathname === '/planning-gestion' ? 'active' : ''}`} onClick={close}>
          <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/></svg>
          Planning gestion
          {retardCount > 0 && <span className="badge">{retardCount}</span>}
        </Link>
        <Link href="/stock" className={`menu-item ${pathname === '/stock' ? 'active' : ''}`} onClick={close}>
          <svg viewBox="0 0 24 24" fill="none"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          Stock
        </Link>
        <Link href="/admin-docs" className={`menu-item ${pathname === '/admin-docs' ? 'active' : ''}`} onClick={close}>
          <svg viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Dossier administratif
        </Link>
        <Link href="/ia-studio" className={`menu-item ${pathname === '/ia-studio' ? 'active' : ''}`} onClick={close}>
          <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 17V13"/><path d="M12 17V7"/><path d="M16 17v-4"/></svg>
          IA photo réalisme
        </Link>
        <Link href="/statistiques" className={`menu-item ${pathname === '/statistiques' ? 'active' : ''}`} onClick={close}>
          <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 17V13"/><path d="M12 17V7"/><path d="M16 17v-4"/></svg>
          Statistiques
        </Link>
        <Link href="/facturation" className={`menu-item ${pathname === '/facturation' ? 'active' : ''}`} onClick={close}>
          <svg viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>
          Facturation
          {factuBadge > 0 && <span className="badge">{factuBadge}</span>}
        </Link>
        <Link href="/signature" className={`menu-item ${pathname === '/signature' ? 'active' : ''}`} onClick={close}>
          <svg viewBox="0 0 24 24" fill="none"><path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
          E Sign
        </Link>
        <Link href="/intervenants" className={`menu-item ${pathname === '/intervenants' ? 'active' : ''}`} onClick={close}>
          <svg viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Intervenants
        </Link>
      </nav>
    </div>
  );

  return (
    <>
      {/* ── Bouton hamburger mobile ──────────────────────────────── */}
      <button
        className="sidebar-hamburger"
        onClick={() => setMobileOpen(true)}
        aria-label="Ouvrir le menu"
      >
        {urgentCount + factuBadge + alertCount > 0 && (
          <span className="hamburger-badge">{urgentCount + factuBadge + alertCount}</span>
        )}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={22} height={22}>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* ── Overlay (mobile seulement) ──────────────────────────── */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      {sidebarContent}
    </>
  );
}
