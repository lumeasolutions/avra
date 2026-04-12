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
      {/* Ligne principale: retour + titre + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Bouton retour */}
        <button
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
        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.3px' }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: '3px 0 0 0' }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' }}>
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
      <div style={{
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
