'use client';

import { useState, useEffect } from 'react';
import { Bell, Trash2, CheckCircle, AlertCircle, Info, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Fetch audit logs to display as notifications
    api<any>('/audit-logs?page=1&pageSize=50')
      .then(res => {
        if (cancelled) return;
        // FONC 13/07/2026 — AuditLog n'a ni entityType ni entityId (→ affichait
        // « undefined: undefined »), et `action` est une enum anglaise
        // (CREATE/UPDATE/... → `.includes('créé')` ne matchait jamais, type
        // toujours « info »). On mappe proprement action → type + titre FR, et
        // on construit un message lisible depuis `changes` sans champ undefined.
        const TYPE_BY_ACTION: Record<string, Notification['type']> = {
          CREATE: 'success', SIGN: 'success', PAY: 'success',
          UPLOAD: 'info', UPDATE: 'info', EXPORT: 'info', LOGIN: 'info',
          DELETE: 'warning',
        };
        const TITLE_BY_ACTION: Record<string, string> = {
          CREATE: 'Création', UPDATE: 'Modification', DELETE: 'Suppression',
          LOGIN: 'Connexion', EXPORT: 'Export', UPLOAD: 'Import de fichier',
          SIGN: 'Signature', PAY: 'Paiement',
        };
        const describe = (log: any): string => {
          const c = log?.changes;
          if (c && typeof c === 'object') {
            const label = c.name ?? c.title ?? c.reference ?? c.entity ?? c.label;
            if (typeof label === 'string' && label) return label;
            const keys = Object.keys(c);
            if (keys.length) return keys.slice(0, 4).join(', ');
          }
          return log?.projectId ? 'Dossier concerné' : 'Activité sur votre espace';
        };
        const notifs: Notification[] = (res.data ?? []).map((log: any) => {
          const action = String(log?.action ?? '').toUpperCase();
          return {
            id: log.id,
            type: TYPE_BY_ACTION[action] ?? 'info',
            title: TITLE_BY_ACTION[action] ?? (action ? action.toLowerCase() : 'Activité'),
            message: describe(log),
            timestamp: log.createdAt,
            read: false,
          };
        });
        setNotifications(notifs);
      })
      .catch(e => {
        if (cancelled) return;
        // Pas de notifications de démonstration — workspace vierge
        setNotifications([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const delete_notification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'error': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-orange-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-[#304035]/50">Chargement des notifications...</div>;
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Bell className="h-7 w-7" />}
        title="Notifications"
        subtitle={unreadCount + ' non lu(s)'}
      />

      <div className="rounded-2xl bg-white shadow-md border border-[#304035]/8 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="px-7 py-16 text-center">
            <Bell className="h-12 w-12 text-[#304035]/10 mx-auto mb-3" />
            <p className="text-[#304035]/40 text-sm">Aucune notification</p>
          </div>
        ) : (
          <div className="divide-y divide-[#304035]/5">
            {notifications.map(n => (
              <div
                key={n.id}
                className={`px-6 py-4 hover:bg-[#f5eee8]/30 transition-all ${!n.read ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-start gap-4">
                  {getIcon(n.type)}
                  <div className="flex-1">
                    <p className="font-semibold text-[#304035]">{n.title}</p>
                    <p className="text-sm text-[#304035]/60 mt-0.5">{n.message}</p>
                    <p className="flex items-center gap-1.5 text-xs text-[#304035]/40 mt-2">
                      <Clock className="h-3 w-3" />
                      {new Date(n.timestamp).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Marquer comme lu
                    </button>
                  )}
                  <button
                    onClick={() => delete_notification(n.id)}
                    className="text-[#304035]/30 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
