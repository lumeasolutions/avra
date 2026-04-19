'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  extra?: React.ReactNode;
}

export const PageHeader = React.memo(function PageHeader({ icon, title, subtitle, actions, extra }: PageHeaderProps) {
  const router = useRouter();

  return (
    <div
      className="page-header-root"
      style={{
        background: 'linear-gradient(135deg, #304035 0%, #3d5244 100%)',
        borderRadius: '16px',
        padding: extra ? '14px 130px 14px 16px' : '18px 130px 18px 16px',
        marginBottom: '16px',
        boxShadow: '0 4px 20px rgba(48,64,53,0.25)',
        overflow: 'visible',
        position: 'relative',
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .page-header-root {
            padding: 12px 16px !important;
            border-radius: 12px !important;
          }
          .page-header-owl {
            display: none !important;
          }
          .page-header-title {
            font-size: 17px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .page-header-subtitle {
            font-size: 11px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .page-header-back-btn {
            width: 32px !important;
            height: 32px !important;
            min-width: 32px !important;
            flex-shrink: 0 !important;
          }
          .page-header-top-row {
            flex-wrap: wrap !important;
            gap: 6px !important;
          }
          .page-header-title-block {
            min-width: 0 !important;
          }
          .page-header-actions {
            width: 100% !important;
            margin-top: 6px !important;
            flex-wrap: wrap !important;
            gap: 6px !important;
            overflow-x: auto !important;
          }
        }
      `}</style>

      {/* Ligne principale: retour + titre + actions */}
      <div className="page-header-top-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

        {/* Bouton retour */}
        <button
          className="page-header-back-btn"
          onClick={() => router.back()}
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
          title="Retour"
        >
          <ChevronLeft size={18} color="rgba(255,255,255,0.9)" />
        </button>

        {/* Titre */}
        <div className="page-header-title-block" style={{ minWidth: 0, flex: '1 1 auto' }}>
          <h1 className="page-header-title" style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.3px' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="page-header-subtitle" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: '3px 0 0 0' }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Actions — sur desktop : inline à droite | sur mobile : passe en dessous */}
        {actions && (
          <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' }}>
            {actions}
          </div>
        )}
      </div>

      {/* Rangée extra (nav, KPIs, etc.) */}
      {extra && (
        <div style={{ marginTop: 12 }}>
          {extra}
        </div>
      )}

      {/* Chouette — positionnée en absolute à droite */}
      <div className="page-header-owl" style={{
        position: 'absolute', right: -10, top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
      }}>
        <Image
          src="/logochouette4.png"
          alt=""
          width={120}
          height={120}
          style={{
            width: 120,
            height: 120,
            objectFit: 'contain',
            opacity: 0.82,
            filter: 'brightness(1.15) saturate(1.1) drop-shadow(0 2px 14px rgba(0,0,0,0.35))',
          }}
        />
      </div>
    </div>
  );
});
