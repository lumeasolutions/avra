'use client';

import nextDynamic from 'next/dynamic';
import { Sidebar } from '@/components/layout/Sidebar';
import { AppGuard } from '@/components/layout/AppGuard';
import { usePathname } from 'next/navigation';
import { useDataSync } from '@/hooks/useDataSync';
import { useAlertEngine } from '@/hooks/useAlertEngine';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';
import { useIsMobile } from '@/hooks/useIsMobile';
import { SentryUserProvider } from '@/components/SentryUserProvider';

/* Dynamic import pour code splitting */
const AssistantFAB = nextDynamic(() => import('@/components/layout/AssistantFAB').then(mod => mod.AssistantFAB), {
  ssr: false,
  loading: () => null,
});

/* Dynamic import pour code splitting */
const AssistantPanel = nextDynamic(() => import('@/components/layout/AssistantPanel').then(mod => mod.AssistantPanel), {
  ssr: false,
  loading: () => null,
});

function RelanceEngineProvider() {
  return null;
}

/** Garde la session vivante : refresh proactif du JWT + récupération sur 401. */
function TokenRefreshProvider() {
  useTokenRefresh();
  return null;
}

function AlertEngineProvider() {
  useAlertEngine();
  return null;
}

/** Synchronise les stores Zustand avec Supabase via l'API NestJS */
function DataSyncProvider() {
  useDataSync();
  return null;
}

// Pages où l'assistant est en mode toggle (FAB) au lieu de permanent
const TOGGLE_PAGES = ['/planning', '/planning-gestion'];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const isTogglePage = TOGGLE_PAGES.some(p => pathname === p || pathname.startsWith(p + '/'));
  // Sur mobile, le panneau latéral est masqué (display:none < 900px) : le FAB
  // devient le SEUL accès à l'assistant — on l'affiche donc sur toutes les pages.
  const isMobile = useIsMobile();

  return (
    <AppGuard>
      <TokenRefreshProvider />
      <RelanceEngineProvider />
      <AlertEngineProvider />
      <DataSyncProvider />
      <SentryUserProvider />
      <div className="flex min-h-screen w-full bg-[#f5eee8]">
        {/* Sidebar gauche (inclut le bouton hamburger mobile) */}
        <Sidebar />
        {/* Contenu central */}
        <main
          className="app-main-content min-h-screen py-5 overflow-y-scroll app-scroll-visible"
          style={{
            flex: '1 1 0%',
            minWidth: 0,
            paddingLeft: '24px',
            paddingRight: isTogglePage ? '4rem' : '24px',
          }}
        >
          {children}
        </main>

        {/* FAB assistant : pages planning (tous écrans) + TOUTES les pages sur mobile
            (le panneau latéral étant masqué sous 900px, le FAB est le seul accès). */}
        {(isTogglePage || isMobile) && <AssistantFAB />}

        {/* Panneau permanent à droite : desktop uniquement, hors pages planning/assistant. */}
        {!isTogglePage && !isMobile && (
          <div
            className="assistant-panel-desktop"
            style={{
              width: 310,
              minWidth: 310,
              height: '100vh',
              position: 'sticky',
              top: 0,
              right: 0,
              zIndex: 40,
              flexShrink: 0,
              display: 'flex',
              padding: '14px 14px 14px 0',
            }}
          >
            <div style={{
              flex: 1,
              borderRadius: 24,
              overflow: 'hidden',
              boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 2px 10px rgba(0,0,0,0.08)',
            }}>
              <AssistantPanel open={true} onClose={() => {}} permanent={true} />
            </div>
          </div>
        )}

        {/* FAB "Assistant AVRA" volontairement absent hors /planning et /planning-gestion :
            les autres pages utilisent le panel permanent à droite. */}
      </div>
    </AppGuard>
  );
}
