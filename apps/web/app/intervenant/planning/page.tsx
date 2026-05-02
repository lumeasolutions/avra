'use client';

import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { Calendar, ChevronRight, MapPin } from 'lucide-react';
import { useDemandesStore } from '@/store/useDemandesStore';
import { Demande } from '@/lib/demandes-api';
import { TypeBadge } from '../components/TypeBadge';
import { StatusBadge } from '../components/StatusBadge';

/**
 * Vue Planning intervenant.
 * Affiche les demandes avec scheduledFor, regroupées par jour.
 * Volontairement simple : pas de FullCalendar — l'intervenant a besoin
 * d'une liste claire, pas d'un agenda complexe.
 */
export default function IntervenantPlanningPage() {
  const myDemandes = useDemandesStore((s) => s.myDemandes);
  const fetchMyDemandes = useDemandesStore((s) => s.fetchMyDemandes);

  useEffect(() => {
    fetchMyDemandes();
  }, [fetchMyDemandes]);

  // Filtrer : seulement les demandes avec scheduledFor, ordonner asc
  const scheduled = useMemo(() => {
    return myDemandes
      .filter((d) => !!d.scheduledFor && d.status !== 'REFUSEE' && d.status !== 'ANNULEE')
      .sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime());
  }, [myDemandes]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  // Buckets : Aujourd'hui / Demain / Cette semaine / Plus tard / Passées
  const groups = useMemo(() => {
    const past: Demande[] = [];
    const todayList: Demande[] = [];
    const tomorrowList: Demande[] = [];
    const thisWeek: Demande[] = [];
    const later: Demande[] = [];

    for (const d of scheduled) {
      const dt = new Date(d.scheduledFor!);
      const dayStart = new Date(dt); dayStart.setHours(0, 0, 0, 0);
      if (dayStart < today) past.push(d);
      else if (dayStart.getTime() === today.getTime()) todayList.push(d);
      else if (dayStart.getTime() === tomorrow.getTime()) tomorrowList.push(d);
      else if (dayStart < nextWeek) thisWeek.push(d);
      else later.push(d);
    }
    return { past, todayList, tomorrowList, thisWeek, later };
  }, [scheduled, today, tomorrow, nextWeek]);

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: '#1a2a1e', letterSpacing: '-0.02em' }}>
          Mon planning
        </h1>
        <p style={{ fontSize: 13, color: '#7c6c58', margin: '4px 0 0' }}>
          Vos interventions à venir, classées par date.
        </p>
      </div>

      {scheduled.length === 0 ? (
        <div style={{
          padding: 48, textAlign: 'center',
          background: '#fff', borderRadius: 18,
          color: '#7c6c58',
          boxShadow: '0 2px 12px rgba(26,42,30,0.06)',
        }}>
          <Calendar size={32} style={{ color: '#cbb98a', marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2a1e', marginBottom: 4 }}>
            Aucune intervention planifiée
          </div>
          <div style={{ fontSize: 13 }}>
            Les demandes avec une date d'intervention apparaîtront ici.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {groups.todayList.length > 0 && (
            <Group title="Aujourd'hui" tone="urgent" demandes={groups.todayList} />
          )}
          {groups.tomorrowList.length > 0 && (
            <Group title="Demain" tone="primary" demandes={groups.tomorrowList} />
          )}
          {groups.thisWeek.length > 0 && (
            <Group title="Cette semaine" tone="primary" demandes={groups.thisWeek} />
          )}
          {groups.later.length > 0 && (
            <Group title="Plus tard" tone="neutral" demandes={groups.later} />
          )}
          {groups.past.length > 0 && (
            <Group title="Passées" tone="muted" demandes={groups.past} />
          )}
        </div>
      )}
    </div>
  );
}

function Group({
  title, tone, demandes,
}: { title: string; tone: 'urgent' | 'primary' | 'neutral' | 'muted'; demandes: Demande[] }) {
  const colors = {
    urgent:  { bg: '#fff7ed', fg: '#c2410c', ring: '#fed7aa' },
    primary: { bg: '#eff6ff', fg: '#1d4ed8', ring: '#bfdbfe' },
    neutral: { bg: '#f5eee8', fg: '#3D5449', ring: '#cbb98a' },
    muted:   { bg: '#f5f5f4', fg: '#525252', ring: '#d4d4d4' },
  }[tone];

  return (
    <section>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 14px',
        background: colors.bg, color: colors.fg,
        border: `1px solid ${colors.ring}`,
        borderRadius: 999,
        fontSize: 12, fontWeight: 700,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        marginBottom: 10,
      }}>
        {title} ({demandes.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {demandes.map((d) => <PlanningRow key={d.id} demande={d} />)}
      </div>
    </section>
  );
}

function PlanningRow({ demande }: { demande: Demande }) {
  const dt = new Date(demande.scheduledFor!);
  return (
    <Link
      href={`/intervenant/demandes/${demande.id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 18px',
        background: '#fff',
        borderRadius: 14,
        textDecoration: 'none',
        color: 'inherit',
        boxShadow: '0 1px 4px rgba(26,42,30,0.05)',
        transition: 'all 0.15s',
      }}
    >
      <div style={{
        width: 56, minWidth: 56,
        textAlign: 'center',
        padding: '8px 4px',
        background: '#f5eee8',
        borderRadius: 10,
      }}>
        <div style={{ fontSize: 11, color: '#7c6c58', fontWeight: 600, textTransform: 'uppercase' }}>
          {dt.toLocaleDateString('fr-FR', { month: 'short' })}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1a2a1e', lineHeight: 1, margin: '2px 0' }}>
          {dt.getDate()}
        </div>
        <div style={{ fontSize: 11, color: '#3D5449', fontWeight: 600 }}>
          {dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <TypeBadge type={demande.type} size="sm" />
          <StatusBadge status={demande.status} size="sm" />
        </div>
        <div style={{
          fontSize: 14, fontWeight: 700, color: '#1a2a1e',
          marginBottom: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {demande.title}
        </div>
        {demande.project && (
          <div style={{ fontSize: 12, color: '#5b5045', display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} /> {demande.project.name}
          </div>
        )}
      </div>

      <ChevronRight size={18} style={{ color: '#cbb98a', flexShrink: 0 }} />
    </Link>
  );
}
