'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Bell, Check } from 'lucide-react';
import { api } from '@/lib/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  type: string;
  createdAt: string;
}

export const NotificationsDropdown = React.memo(function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = () => {
    setLoading(true);
    api<Notification[]>('/notifications')
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const unreadCount = items.filter((n) => !n.isRead).length;

  const markAsRead = async (id: string) => {
    try {
      await api(`/notifications/${id}/read`, { method: 'POST' });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative rounded-full p-2 text-avra-primary/70 hover:bg-avra-surface hover:text-avra-primary"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-avra-error text-[10px] font-medium text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-avra border border-avra-primary/10 bg-white shadow-avra-lg">
          <div className="flex items-center justify-between border-b border-avra-primary/10 px-4 py-3">
            <span className="font-medium text-avra-primary">Notifications</span>
            <Link
              href="/notifications"
              className="text-xs font-medium text-avra-accent hover:underline"
              onClick={() => setOpen(false)}
            >
              Voir tout
            </Link>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-avra-primary/60">Chargement...</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-center text-sm text-avra-primary/60">Aucune notification</div>
            ) : (
              items.slice(0, 10).map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-avra-primary/5 px-4 py-3 last:border-0 ${!n.isRead ? 'bg-avra-surface/30' : ''}`}
                >
                  <p className="text-sm font-medium text-avra-primary">{n.title}</p>
                  <p className="mt-0.5 text-xs text-avra-primary/70 line-clamp-2">{n.message}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-avra-primary/50">
                      {new Date(n.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => markAsRead(n.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-avra-accent hover:underline"
                      >
                        <Check className="h-3 w-3" /> Marquer lu
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
});
