'use client';

import { usePathname } from 'next/navigation';
import { MarketingChat } from '@/app/(marketing)/components/MarketingChat';

// Pages publiques (non-app) où Aria doit apparaître
const APP_PREFIXES = ['/dashboard', '/dossiers', '/facturation', '/planning', '/ia-studio', '/stock', '/parametres', '/portail', '/admin', '/intervenants', '/statistiques', '/commandes'];

export function MarketingChatWrapper() {
  const pathname = usePathname() ?? '';
  const isApp = APP_PREFIXES.some(p => pathname.startsWith(p));
  if (isApp) return null;
  return <MarketingChat />;
}
