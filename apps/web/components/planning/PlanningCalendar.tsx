'use client';

import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { api } from '@/lib/api';

interface EventItem {
  id: string;
  title: string;
  type: string;
  calendarType: string;
  startAt: string;
  endAt: string | null;
  project?: { id: string; name: string } | null;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function getMonthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function getMonthEnd(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}
function getWeekStart(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(x.getFullYear(), x.getMonth(), diff);
}
function getWeekEnd(d: Date) {
  const start = new Date(d);
  start.setDate(start.getDate() + 6);
  start.setHours(23, 59, 59);
  return start;
}

function formatMonthYear(d: Date) {
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

interface PlanningCalendarProps {
  calendarType?: 'PERSONAL' | 'GESTION';
}

export function PlanningCalendar({ calendarType }: PlanningCalendarProps) {
  const [view, setView] = useState<'month' | 'week'>('month');
  const [current, setCurrent] = useState(() => new Date());
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);

  const { rangeStart, rangeEnd, cells } = useMemo(() => {
    if (view === 'month') {
      const start = getMonthStart(new Date(current));
      const end = getMonthEnd(new Date(current));
      const startDay = start.getDay() === 0 ? 6 : start.getDay() - 1;
      const firstCell = new Date(start);
      firstCell.setDate(firstCell.getDate() - startDay);
      const cells: Date[] = [];
      for (let i = 0; i < 42; i++) {
        const d = new Date(firstCell);
        d.setDate(firstCell.getDate() + i);
        cells.push(d);
      }
      return { rangeStart: start, rangeEnd: end, cells };
    } else {
      const d = new Date(current);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(start.getFullYear(), start.getMonth(), diff);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59);
      const cells: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const cell = new Date(weekStart);
        cell.setDate(weekStart.getDate() + i);
        cells.push(cell);
      }
      return { rangeStart: weekStart, rangeEnd: weekEnd, cells };
    }
  }, [current, view]);

  useEffect(() => {
    setLoading(true);
    const from = rangeStart.toISOString().slice(0, 10);
    const to = rangeEnd.toISOString().slice(0, 10);
    const typeParam = calendarType ? `&calendarType=${calendarType}` : '';
    api<EventItem[]>(`/events?from=${from}&to=${to}${typeParam}`)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [rangeStart.toISOString(), rangeEnd.toISOString(), calendarType]);

  const getEventsForDay = (date: Date) => {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return events.filter((e) => {
      const start = new Date(e.startAt);
      return start >= dayStart && start < dayEnd;
    });
  };

  const prev = () => {
    const d = new Date(current);
    if (view === 'month') d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setCurrent(d);
  };
  const next = () => {
    const d = new Date(current);
    if (view === 'month') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setCurrent(d);
  };
  const today = () => setCurrent(new Date());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prev}
            className="rounded-lg p-2 text-avra-primary hover:bg-avra-surface"
            aria-label="Précédent"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="min-w-[200px] text-center text-lg font-medium text-avra-primary">
            {view === 'month' ? formatMonthYear(current) : `Semaine du ${cells[0]?.toLocaleDateString('fr-FR')}`}
          </h2>
          <button
            type="button"
            onClick={next}
            className="rounded-lg p-2 text-avra-primary hover:bg-avra-surface"
            aria-label="Suivant"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={today}
            className="ml-2 rounded-lg border border-avra-primary/15 px-3 py-1.5 text-sm text-avra-primary hover:bg-avra-surface"
          >
            Aujourd&apos;hui
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView('month')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${view === 'month' ? 'bg-avra-primary text-white' : 'bg-avra-surface text-avra-primary'}`}
          >
            Mois
          </button>
          <button
            type="button"
            onClick={() => setView('week')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${view === 'week' ? 'bg-avra-primary text-white' : 'bg-avra-surface text-avra-primary'}`}
          >
            Semaine
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-avra border border-avra-primary/10 bg-white">
          <p className="text-avra-primary/60">Chargement...</p>
        </div>
      ) : view === 'month' ? (
        <div className="rounded-avra border border-avra-primary/10 bg-white overflow-hidden shadow-avra">
          <div className="grid grid-cols-7 border-b border-avra-primary/10 bg-avra-surface/50">
            {WEEKDAYS.map((day) => (
              <div key={day} className="px-2 py-2 text-center text-sm font-medium text-avra-primary">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((date, i) => {
              const isCurrentMonth = date.getMonth() === current.getMonth();
              const isToday =
                date.getDate() === new Date().getDate() &&
                date.getMonth() === new Date().getMonth() &&
                date.getFullYear() === new Date().getFullYear();
              const dayEvents = getEventsForDay(date);
              return (
                <div
                  key={i}
                  className={`min-h-[100px] border-b border-r border-avra-primary/5 p-1 last:border-r-0 ${!isCurrentMonth ? 'bg-avra-surface/30' : ''} ${isToday ? 'ring-1 ring-avra-accent/50' : ''}`}
                >
                  <span className={`text-sm ${isCurrentMonth ? 'text-avra-primary' : 'text-avra-primary/40'}`}>
                    {date.getDate()}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        className="truncate rounded px-1 py-0.5 text-xs bg-avra-primary/10 text-avra-primary"
                        title={e.title}
                      >
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-xs text-avra-primary/50">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-avra border border-avra-primary/10 bg-white overflow-hidden shadow-avra">
          <div className="grid grid-cols-7 border-b border-avra-primary/10 bg-avra-surface/50">
            {cells.map((date) => (
              <div key={date.toISOString()} className="border-r border-avra-primary/5 p-2 text-center last:border-r-0">
                <div className="text-sm font-medium text-avra-primary">{WEEKDAYS[date.getDay() === 0 ? 6 : date.getDay() - 1]}</div>
                <div className="text-xs text-avra-primary/60">{date.getDate()}/{date.getMonth() + 1}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 min-h-[300px]">
            {cells.map((date) => {
              const dayEvents = getEventsForDay(date);
              return (
                <div key={date.toISOString()} className="border-r border-b border-avra-primary/5 p-2 last:border-r-0">
                  <div className="space-y-2">
                    {dayEvents.map((e) => (
                      <div
                        key={e.id}
                        className="rounded-lg border border-avra-primary/10 bg-avra-surface/50 p-2 text-sm text-avra-primary"
                      >
                        <p className="font-medium">{e.title}</p>
                        <p className="text-xs text-avra-primary/60">
                          {new Date(e.startAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          {e.project?.name && ` · ${e.project.name}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
