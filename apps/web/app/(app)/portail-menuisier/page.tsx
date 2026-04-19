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
const HOURS = Array.from({ length: 9 }, (_, i) => i + 9);

const getStatusColor = (status: string) => {
  switch (status) {
    case 'URGENT': return { bg: '#FFF0F0', text: '#C0392B' };
    case 'EN COURS': return { bg: '#FFF3E0', text: '#E07B00' };
    case 'A VALIDER': return { bg: '#FFFDE7', text: '#F9A825' };
    case 'FINITION': return { bg: '#E8F5E9', text: '#2E7D32' };
    default: return { bg: '#E5EDF5', text: '#1A3A5C' };
  }
};

export default function PortailMenuisierPage() {
  usePortailGuard('menuisier');
  const dossiers = useDossierStore(s => s.dossiers);
  const dossiersSignes = useDossierStore(s => s.dossiersSignes);
  const datesButoiresSignes = useDossierStore(s => s.datesButoiresSignes);
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
    const fabricationsEnCours = dossiers.filter(d => d.status === 'EN COURS').length;
    const livraisonsPrevues = dossiers.filter(d => d.status === 'FINITION').length;
    const chantiersBloques = dossiers.filter(d => d.status === 'URGENT').length;
    return { ca, fabricationsEnCours, livraisonsPrevues, chantiersBloques };
  }, [dossiers, dossiersSignes, invoices]);

  const renderDossierItem = (d: typeof dossiers[0]) => {
    const colors = getStatusColor(d.status);
    return (
      <Link key={d.id} href={`/dossiers/${d.id}`} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 10px', borderRadius: 8, background: '#F8FAFB',
        textDecoration: 'none', borderLeft: `3px solid ${colors.text}`,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: 'linear-gradient(135deg, #7B4F2E, #5C3820)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0,
        }}>
          {d.name.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#0F2540', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
          <div style={{ fontSize: 9, color: '#7A8E9F' }}>{d.firstName ? `${d.firstName} • ` : ''}{d.status}</div>
        </div>
        <div style={{
          fontSize: 8, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
          background: colors.bg, color: colors.text, flexShrink: 0,
        }}>{d.status}</div>
      </Link>
    );
  };

  return (
    <div className="portail-men-root" style={{ padding: '0px 20px 16px 0', fontFamily: "'Segoe UI', Arial, sans-serif", display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`
        @media (max-width: 768px) {
          .portail-men-root { padding: 0 0 16px 0 !important; padding-top: 64px !important; }
          .portail-men-grid-dos { grid-template-columns: 1fr !important; }
          .portail-men-planning-wrap { overflow-x: auto; }
          .portail-men-planning-grid { min-width: 520px; }
        }
      `}</style>

      {/* En-tête portail */}
      <PageHeader
        icon={<span style={{ fontSize: 20 }}>🪵</span>}
        title={'Bonjour' + (user?.firstName ? ', ' + user.firstName : '') + ' 👋'}
        subtitle="Vue d'ensemble de vos fabrications, livraisons et planning"
      />


      {/* FABRICATIONS / LIVRAISONS */}
      <div className="portail-men-grid-dos" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

        <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F2540' }}>📋 DOSSIERS EN COURS</h3>
            <Link href="/dossiers" style={{ fontSize: 11, color: '#7B4F2E', fontWeight: 600, textDecoration: 'none' }}>Voir tous →</Link>
          </div>
          {/* Filtres statut */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
            {dossiersFiltered.slice(0, 8).map(d => renderDossierItem(d))}
            {dossiersFiltered.length === 0 && (
              <p style={{ color: '#4A6A8A', fontSize: 12, textAlign: 'center', padding: '12px 0', margin: 0 }}>Aucun dossier</p>
            )}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F2540' }}>✅ DOSSIERS SIGNÉS</h3>
            <Link href="/dossiers-signes" style={{ fontSize: 11, color: '#7B4F2E', fontWeight: 600, textDecoration: 'none' }}>Voir tous →</Link>
          </div>
          {/* Filtres statut */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
            {dossiersSignesFiltered.slice(0, 8).map(d => renderDossierItem(d as any))}
            {dossiersSignesFiltered.length === 0 && (
              <p style={{ color: '#4A6A8A', fontSize: 12, textAlign: 'center', padding: '12px 0', margin: 0 }}>Aucun dossier</p>
            )}
          </div>
        </div>
      </div>

      {/* PLANNING */}
      <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F2540' }}>📅 PLANNING</h3>
          <Link href="/planning" style={{ fontSize: 11, color: '#7B4F2E', fontWeight: 600, textDecoration: 'none' }}>Planning détaillé →</Link>
        </div>

        <div className="portail-men-planning-wrap" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="portail-men-planning-grid" style={{ display: 'grid', gridTemplateColumns: 'auto repeat(7, 1fr)', gap: 0, fontSize: 11 }}>
          {/* Header jours */}
          <div style={{ fontWeight: 700, color: '#0F2540', padding: '5px 4px', borderBottom: '2px solid #E0E6ED' }}></div>
          {DAYS_OF_WEEK.map(day => (
            <div key={day} style={{
              fontWeight: 700, color: '#7B4F2E', padding: '5px 4px',
              textAlign: 'center', borderBottom: '2px solid #E0E6ED', fontSize: 11,
            }}>
              {day}
            </div>
          ))}

          {/* Lignes horaires */}
          {HOURS.map(hour => (
            <div key={`hour-${hour}`} style={{ display: 'contents' }}>
              <div style={{
                fontSize: 10, fontWeight: 600, color: '#7A8E9F', padding: '4px 6px',
                borderRight: '1px solid #E0E6ED', textAlign: 'right', whiteSpace: 'nowrap',
              }}>
                {hour}h
              </div>
              {DAYS_OF_WEEK.map((_, dayIdx) => {
                const eventsForSlot = planningEvents.filter(e => (e.day - 1) === dayIdx && e.startHour === hour);
                return (
                  <div key={`${dayIdx}-${hour}`} style={{
                    minHeight: 26, borderRight: '1px solid #E0E6ED',
                    borderBottom: '1px solid #F0F4F8', padding: '2px 3px',
                    background: '#FAFBFC',
                  }}>
                    {eventsForSlot.map(event => (
                      <div key={event.id} style={{
                        fontSize: 9, fontWeight: 600, padding: '2px 4px',
                        borderRadius: 3, color: 'white',
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
        </div>
      </div>


    </div>
  );
}
