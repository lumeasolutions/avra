'use client';

import React from 'react';
import Image from 'next/image';

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader = React.memo(function PageHeader({ icon, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #304035 0%, #3d5244 100%)',
        borderRadius: '16px',
        padding: '18px 20px 18px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
        boxShadow: '0 4px 20px rgba(48,64,53,0.25)',
        overflow: 'hidden',
      }}
    >
      {/* Gauche: icon + titre */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0, flex: '1 1 auto' }}>
        <div
          style={{
            background: 'rgba(255,255,255,0.12)',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.15)',
            flexShrink: 0,
          }}
        >
          <div style={{ color: '#f0c674' }}>{icon}</div>
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.3px' }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: '3px 0 0 0' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Centre: boutons/actions */}
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' }}>
          {actions}
        </div>
      )}

      {/* Droite: logo chouette PNG transparent */}
      <div style={{ flex: '0 0 72px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <img
          src="/logochouette2.png"
          alt=""
          style={{
            height: '64px',
            width: '64px',
            objectFit: 'contain',
            opacity: 0.35,
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
});
