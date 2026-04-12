'use client';

import Link from 'next/link';
import { useDossierStore, useFacturationStore, usePlanningStore } from '@/store';
import { useAuthStore } from '@/store/useAuthStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { useMemo, useState } from 'react';
import { usePortailGuard } from '@/hooks/usePortailGuard';

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const DAYS_OF_WEEK = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];
const HOURS = Array.from({ length: 9 }, (_, i) => i + 9); // 9:00 to 17:00

const getStatusColor = (status: string) => {
  switch (status) {
    case 'URGENT': return { bg: '#FFF0F0', text: '#C0392B' };
    case 'EN COURS': return { bg: '#FFF3E0', text: '#E07B00' };
    case 'A VALIDER': return { bg: '#FFFDE7', text: '#F9A825' };
    case 'FINITION': return { bg: '#E8F5E9', text: '#2E7D32' };
    default: return { bg: '#E5EDF5', text: '#1A3A5C' };
  }
};

export default function PortailCuisinistePage() {
  usePortailGuard('cuisiniste');
  const dossiers = useDossierStore(s => s.dossiers);
  const dossiersSignes = useDossierStore(s => s.dossiersSignes);
  const invoices = useFacturationStore(s => s.invoices);
  const planningEvents = usePlanningStore(s => s.planningEvents);
  const user = useAuthStore(s => s.user);

  const [filterEnCours, setFilterEnCours] = useState<string|null>(null);
  const [filterSignes, setFilterSignes] = useState<string|null>(null);

  const STATUS_ORDER: Record<string,number> = { URGENT: 0, 'EN COURS': 1, 'A VALIDER': 2, FINITION: 3 };
  const byUrgency = (a: {status:string}, b: {status:string}) =>
    (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);

  const dossiersFiltered = useMemo(() => {
    const sorted = [...dossiers].sort(byUrgency);
    return filterEnCours ? sorted.filter(d => d.status === filterEnCours) : sorted;
  }, [dossiers, filterEnCours]);

  const dossiersSignesFiltered = useMemo(() => {
    const sorted = [...dossiersSignes].sort((a,b) => byUrgency(a as any, b as any));
    return filterSignes ? sorted.filter(d => (d as any).status === filterSignes) : sorted;
  }, [dossiersSignes, filterSignes]);

  const enCoursStatuses = useMemo(() => [...new Set(dossiers.map(d => d.status))], [dossiers]);
  const signesStatuses = useMemo(() => [...new Set(dossiersSignes.map(d => (d as any).status))], [dossiersSignes]);

  const stats = useMemo(() => {
    const ca = invoices.filter(i => i.statut === 'PAYÉE').reduce((s, i) => s + i.montantHT, 0);
    const urgents = dossiers.filter(d => d.status === 'URGENT').length;
    const enPose = dossiers.filter(d => d.status === 'EN COURS').length;
    const savOuverts = dossiersSignes.filter(d => (d.confirmations ?? []).some(c => !c.validee)).length;
    return { ca, urgents, enPose, savOuverts };
  }, [dossiers, dossiersSignes, invoices]);

  // Render a dossier item with status badge
  const renderDossierItem = (d: typeof dossiers[0]) => {
    const colors = getStatusColor(d.status);
    return (
      <Link key={d.id} href={`/dossiers/${d.id}`} className="flex items-center gap-[10px] py-[10px] px-3 rounded-[10px] bg-[#F8FAFB] no-underline transition-colors duration-200" style={{ borderLeft: `3px solid ${colors.text}` }}>
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#2E7D32] to-[#1B5E20] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
          {d.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-[#0F2540] overflow-hidden text-ellipsis">{d.name}</div>
          <div className="text-[10px] text-[#7A8E9F] mt-[2px]">{d.firstName ? `${d.firstName} •` : ''} {d.status}</div>
        </div>
        <div className="text-[9px] font-bold py-1 px-[10px] rounded-[12px] flex-shrink-0" style={{ background: colors.bg, color: colors.text }}>{d.status}</div>
      </Link>
    );
  };

  return (
    <div className="pt-0 pb-7 pl-6 pr-0" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>

      {/* En-tête portail */}
      <PageHeader
        icon={<span className="text-2xl">🍳</span>}
        title={'Bonjour' + (user?.firstName ? ', ' + user.firstName : '') + ' 👋'}
        subtitle="Vue d'ensemble de vos dossiers, planning et alertes"
      />


      {/* DOSSIERS EN COURS / DOSSIERS SIGNÉS */}
      <div className="grid grid-cols-2 gap-5 mb-7">

        {/* DOSSIERS EN COURS */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="flex justify-between items-center mb-2">
            <h3 className="m-0 text-[17px] font-bold text-[#0F2540]">📋 DOSSIERS EN COURS</h3>
            <Link href="/dossiers" className="text-[12px] text-[#2E7D32] font-semibold no-underline">Voir tous →</Link>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
            {['Tous', ...enCoursStatuses].map(s => {
              const active = s === 'Tous' ? filterEnCours === null : filterEnCours === s;
              const col = getStatusColor(s);
              return (
                <button key={s} onClick={() => setFilterEnCours(s === 'Tous' ? null : (filterEnCours === s ? null : s))}
                  style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: active ? (s === 'Tous' ? '#0F2540' : col.bg) : '#F0F2F5',
                    color: active ? (s === 'Tous' ? 'white' : col.text) : '#7A8E9F',
                    outline: active ? `1.5px solid ${s === 'Tous' ? '#0F2540' : col.text}` : 'none',
                  }}>{s}</button>
              );
            })}
          </div>
          <div className="flex flex-col gap-[10px] max-h-[160px] overflow-y-auto">
            {dossiersFiltered.slice(0, 8).map(d => renderDossierItem(d))}
            {dossiersFiltered.length === 0 && (
              <p className="text-[#4A6A8A] text-[13px] text-center py-5">Aucun dossier</p>
            )}
          </div>
        </div>

        {/* DOSSIERS SIGNÉS */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="flex justify-between items-center mb-2">
            <h3 className="m-0 text-[17px] font-bold text-[#0F2540]">✅ DOSSIERS SIGNÉS</h3>
            <Link href="/dossiers-signes" className="text-[12px] text-[#2E7D32] font-semibold no-underline">Voir tous →</Link>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
            {['Tous', ...signesStatuses].map(s => {
              const active = s === 'Tous' ? filterSignes === null : filterSignes === s;
              const col = getStatusColor(s);
              return (
                <button key={s} onClick={() => setFilterSignes(s === 'Tous' ? null : (filterSignes === s ? null : s))}
                  style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: active ? (s === 'Tous' ? '#0F2540' : col.bg) : '#F0F2F5',
                    color: active ? (s === 'Tous' ? 'white' : col.text) : '#7A8E9F',
                    outline: active ? `1.5px solid ${s === 'Tous' ? '#0F2540' : col.text}` : 'none',
                  }}>{s}</button>
              );
            })}
          </div>
          <div className="flex flex-col gap-[10px] max-h-[160px] overflow-y-auto">
            {dossiersSignesFiltered.slice(0, 8).map(d => renderDossierItem(d as any))}
            {dossiersSignesFiltered.length === 0 && (
              <p className="text-[#4A6A8A] text-[13px] text-center py-5">Aucun dossier</p>
            )}
          </div>
        </div>
      </div>

      {/* PLANNING */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] mb-7">
        <h3 className="m-0 mb-4 text-[17px] font-bold text-[#0F2540]">📅 PLANNING</h3>

        {/* Grille de planning */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(7, 1fr)', gap: 0, fontSize: 12, overflowX: 'auto' }}>
          {/* Header - Jours */}
          <div style={{ fontWeight: 700, color: '#0F2540', padding: '8px 4px', borderBottom: '2px solid #E0E6ED' }}></div>
          {DAYS_OF_WEEK.map(day => (
            <div key={day} style={{
              fontWeight: 700, color: '#2E7D32', padding: '8px 4px',
              textAlign: 'center', borderBottom: '2px solid #E0E6ED',
            }}>
              {day}
            </div>
          ))}

          {/* Lignes horaires */}
          {HOURS.map(hour => (
            <div key={`hour-${hour}`} style={{
              display: 'contents',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: '#7A8E9F', padding: '8px 4px',
                borderRight: '1px solid #E0E6ED', textAlign: 'right',
              }}>
                {hour}:00
              </div>
              {DAYS_OF_WEEK.map((_, dayIdx) => {
                const eventsForSlot = planningEvents.filter(e => {
                  const eventDay = e.day - 1; // day: 1-7, we need 0-6
                  const eventHour = e.startHour;
                  return eventDay === dayIdx && eventHour === hour;
                });

                return (
                  <div key={`${dayIdx}-${hour}`} style={{
                    minHeight: '40px', borderRight: '1px solid #E0E6ED',
                    borderBottom: '1px solid #E0E6ED', padding: '4px',
                    background: '#FAFBFC', position: 'relative',
                  }}>
                    {eventsForSlot.map(event => (
                      <div key={event.id} style={{
                        fontSize: 10, fontWeight: 600, padding: '3px 5px',
                        borderRadius: 4, color: 'white', marginBottom: '2px',
                        background: event.color, whiteSpace: 'nowrap', overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {event.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, fontSize: 11, color: '#7A8E9F', textAlign: 'right' }}>
          <Link href="/planning" style={{ color: '#2E7D32', fontWeight: 600, textDecoration: 'none' }}>
            Accéder au planning détaillé →
          </Link>
        </div>
      </div>


    </div>
  );
}
