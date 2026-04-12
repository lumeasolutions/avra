'use client';

import dynamic from 'next/dynamic';
import { Sidebar } from '@/components/layout/Sidebar';
import { AppGuard } from '@/components/layout/AppGuard';
import { usePathname } from 'next/navigation';
import { useRelanceEngine } from '@/hooks/useRelanceEngine';
import { useDataSync } from '@/hooks/useDataSync';
import { useAlertEngine } from '@/hooks/useAlertEngine';

/* Dynamic import pour code splitting */
const AssistantFAB = dynamic(() => import('@/components/layout/AssistantFAB').then(mod => mod.AssistantFAB), {
  ssr: false,
  loading: () => null,
});

/* Dynamic import pour code splitting */
const AssistantPanel = dynamic(() => import('@/components/layout/AssistantPanel').then(mod => mod.AssistantPanel), {
  ssr: false,
  loading: () => null,
});

function RelanceEngineProvider() {
  useRelanceEngine();
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
  const pathname = usePathname();
  const isTogglePage = TOGGLE_PAGES.some(p => pathname === p || pathname.startsWith(p + '/'));

  return (
    <AppGuard>
      <RelanceEngineProvider />
      <AlertEngineProvider />
      <DataSyncProvider />
      <div className="flex min-h-screen w-full bg-[#f5eee8]">
        {/* Sidebar gauche */}
        <Sidebar />
        {/* Contenu central */}
        <main
          className="min-h-screen py-5 overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            flex: '1 1 0%',
            minWidth: 0,
            paddingLeft: '24px',
            paddingRight: isTogglePage ? '4rem' : '24px',
          }}
        >
          {children}
        </main>

        {/* Pages planning : FAB toggle classique */}
        {isTogglePage && <AssistantFAB />}

        {/* Toutes les autres pages : assistant permanent pleine hauteur à droite */}
        {!isTogglePage && (
          <div style={{
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
          }}>
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
      </div>
    </AppGuard>
  );
}
