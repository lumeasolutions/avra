'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Inbox, Hammer, Calendar, User, LogOut, BellRing, type LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useDemandesStore } from '@/store/useDemandesStore';

const NAV: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: '/intervenant',           label: 'Accueil',     icon: Hammer },
  { href: '/intervenant/demandes',  label: 'Demandes',    icon: Inbox },
  { href: '/intervenant/planning',  label: 'Planning',    icon: Calendar },
  { href: '/intervenant/profil',    label: 'Mon profil',  icon: User },
];

export function IntervenantSidebar() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const myStats = useDemandesStore((s) => s.myStats);
  const fetchMyStats = useDemandesStore((s) => s.fetchMyStats);

  useEffect(() => {
    fetchMyStats();
    const interval = setInterval(() => fetchMyStats(), 60_000);
    return () => clearInterval(interval);
  }, [fetchMyStats]);

  const unread = myStats?.unreadCount ?? 0;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const initials = ((user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')).toUpperCase()
    || user?.email?.[0]?.toUpperCase() || '?';

  return (
    <aside style={{
      width: 256,
      minWidth: 256,
      height: '100vh',
      background: 'linear-gradient(180deg, #1a2a1e 0%, #2a3f30 50%, #1a2a1e 100%)',
      color: '#f5eee8',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
      boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
    }}>
      {/* Branding */}
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 12, letterSpacing: '0.18em', color: '#cbb98a', fontWeight: 600, textTransform: 'uppercase' }}>
          Espace
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: '#f5eee8' }}>
          Intervenant
        </div>
        <div style={{ fontSize: 11, color: 'rgba(245,238,232,0.55)', marginTop: 2 }}>
          AVRA
        </div>
      </div>

      {/* Profil bloc */}
      <div style={{
        margin: 16,
        padding: 14,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: 'linear-gradient(135deg, #cbb98a 0%, #a08654 100%)',
          color: '#1a2a1e',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 16,
        }}>
          {initials}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: '#f5eee8',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : 'Intervenant'}
          </div>
          <div style={{
            fontSize: 11, color: 'rgba(245,238,232,0.6)', marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {user?.email ?? ''}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          const showBadge = item.href === '/intervenant/demandes' && unread > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                borderRadius: 10,
                fontSize: 14, fontWeight: 600,
                color: active ? '#1a2a1e' : 'rgba(245,238,232,0.85)',
                background: active ? '#cbb98a' : 'transparent',
                transition: 'all 0.15s',
                textDecoration: 'none',
                position: 'relative',
              }}
            >
              <Icon size={18} strokeWidth={2} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {showBadge && (
                <span style={{
                  background: '#dc2626', color: '#fff',
                  minWidth: 22, height: 22, padding: '0 7px',
                  borderRadius: 11,
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Stats compactes */}
      {myStats && (
        <div style={{
          margin: '0 16px 16px',
          padding: 12,
          background: 'rgba(0,0,0,0.18)',
          borderRadius: 12,
          fontSize: 11,
          color: 'rgba(245,238,232,0.7)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span>Total</span><span style={{ color: '#f5eee8', fontWeight: 700 }}>{myStats.total}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span>En cours</span><span style={{ color: '#f5eee8', fontWeight: 700 }}>{myStats.byStatus?.EN_COURS ?? 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <BellRing size={11} /> Non lues
            </span>
            <span style={{ color: unread > 0 ? '#fca5a5' : '#f5eee8', fontWeight: 700 }}>{unread}</span>
          </div>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        style={{
          margin: '0 16px 16px',
          padding: '10px 14px',
          background: 'rgba(220,38,38,0.12)',
          color: '#fca5a5',
          border: '1px solid rgba(220,38,38,0.25)',
          borderRadius: 10,
          fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 10,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        <LogOut size={16} />
        Déconnexion
      </button>
    </aside>
  );
}
