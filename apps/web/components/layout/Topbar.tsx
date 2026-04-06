'use client';

import { useRouter } from 'next/navigation';
import { Search, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { NotificationsDropdown } from './NotificationsDropdown';

export function Topbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-avra-primary/10 bg-white/80 px-6 backdrop-blur-sm">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-avra-primary/50" />
          <input
            type="search"
            placeholder="Recherche globale..."
            className="w-full rounded-lg border border-avra-primary/15 bg-avra-surface/50 py-2 pl-10 pr-4 text-sm outline-none placeholder:text-avra-primary/50 focus:border-avra-accent focus:ring-1 focus:ring-avra-accent/30"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <NotificationsDropdown />
        <div className="flex items-center gap-3 border-l border-avra-primary/10 pl-4">
          <div className="text-right">
            <p className="text-sm font-medium text-avra-primary">
              {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email}
            </p>
            <p className="text-xs text-avra-primary/60">{user?.workspaceName ?? 'Espace'}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg p-2 text-avra-primary/70 hover:bg-avra-surface hover:text-avra-error"
            aria-label="Déconnexion"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
