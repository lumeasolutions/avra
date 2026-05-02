'use client';

/**
 * useEventActions — actions planning qui appellent l'API puis mettent à jour le store.
 */

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { usePlanningStore, PlanningEvent, GestEvent } from '@/store/usePlanningStore';
import { useAuthStore } from '@/store/useAuthStore';

// Conversion day number → Date proche
function dayAndHourToISO(day: number, hour: number, weekOffset: number = 0): string {
  const now = new Date();
  // Trouver le prochain lundi
  const dayOfWeek = now.getDay() || 7; // dimanche = 7
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + 1 + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);

  const target = new Date(monday);
  target.setDate(monday.getDate() + (day - 1)); // day=1 → lundi
  target.setHours(hour, 0, 0, 0);
  return target.toISOString();
}

export function useEventActions() {
  const user = useAuthStore((s) => s.user);
  const store = usePlanningStore();

  const addPlanningEvent = useCallback(
    async (event: Omit<PlanningEvent, 'id'>): Promise<void> => {
      store.addPlanningEvent(event);

      if (user?.id === 'demo' || !user?.workspaceId) return;

      const startAt = dayAndHourToISO(event.day, event.startHour, event.weekOffset);
      const endAt = dayAndHourToISO(event.day, event.startHour + (event.duration || 1), event.weekOffset);

      try {
        const result = await api<{ id: string }>('/events', {
          method: 'POST',
          body: JSON.stringify({
            title: event.title,
            calendarType: 'PERSONAL',
            type: event.type || 'AUTRE',
            startAt,
            endAt,
          }),
        });

        // Mettre à jour l'ID avec celui de la base
        if (result?.id) {
          const currentEvents = usePlanningStore.getState().planningEvents;
          // L'événement ajouté est le dernier
          const added = currentEvents[currentEvents.length - 1];
          if (added && added.title === event.title) {
            usePlanningStore.setState((s) => ({
              planningEvents: s.planningEvents.map((e) =>
                e.id === added.id ? { ...e, id: result.id } : e,
              ),
            }));
          }
        }
      } catch (err) {
        console.warn('[EventActions] API create failed:', err);
      }
    },
    [user, store],
  );

  const addGestEvent = useCallback(
    async (event: Omit<GestEvent, 'id'>): Promise<void> => {
      store.addGestEvent(event);

      if (user?.id === 'demo' || !user?.workspaceId) return;

      const startAt = dayAndHourToISO(event.day, event.startHour, event.weekOffset);
      const endAt = dayAndHourToISO(event.day, event.startHour + (event.duration || 1), event.weekOffset);

      try {
        await api('/events', {
          method: 'POST',
          body: JSON.stringify({
            title: event.client,
            calendarType: 'GESTION',
            type: event.type || 'AUTRE',
            startAt,
            endAt,
          }),
        });
      } catch (err) {
        console.warn('[EventActions] API create gest failed:', err);
      }
    },
    [user, store],
  );

  const deletePlanningEvent = useCallback(
    async (id: string): Promise<void> => {
      store.deletePlanningEvent(id);

      if (user?.id === 'demo' || !user?.workspaceId) return;
      // Éviter d'appeler l'API pour les IDs de démo
      if (['e1','e2','e3','e4','e5','e6','e7','e8'].includes(id)) return;

      try {
        await api(`/events/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('[EventActions] API delete failed:', err);
      }
    },
    [user, store],
  );

  const deleteGestEvent = useCallback(
    async (id: string): Promise<void> => {
      store.deleteGestEvent(id);

      if (user?.id === 'demo' || !user?.workspaceId) return;
      if (['g1','g2','g3','g4','g5'].includes(id)) return;

      try {
        await api(`/events/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('[EventActions] API delete gest failed:', err);
      }
    },
    [user, store],
  );

  return {
    addPlanningEvent,
    addGestEvent,
    deletePlanningEvent,
    deleteGestEvent,
  };
}
