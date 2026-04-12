'use client';

import Link from 'next/link';
import { useDossierStore, useFacturationStore, usePlanningStore } from '@/store';
import { useAuthStore } from '@/store/useAuthStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { useMemo } from 'react';
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

export default function PortailArchitectePage() {
  usePortailGuard('architecte');
  const dossiers = useDossierStore(s => s.dossiers);
  const dossiersSignes = useDossierStore(s => s.dossiersSignes);
  const invoices = useFacturationStore(s => s.invoices);
  const devis = useFacturationStore(s => s.devis);
  const planningEvents = usePlanningStore(s => s.planningEvents);
  const user = useAuthStore(s => s.user);

  const stats = useMemo(() => {
    const ca = invoices.filter(i => i.statut === 'PAYÉE').reduce((s, i) => s + i.montantHT, 0);
    const projetsEnCours = dossiers.filter(d => d.status === 'EN COURS').length;
    const dceEnAttente = devis.filter(d => d.statut === 'ENVOYÉ').length;
    const chantiersActifs = dossiers.filter(d => d.status === 'FINITION').length;
    return { ca, projetsEnCours, dceEnAttente, chantiersActifs };
  }, [dossiers, dossiersSignes, invoices, devis]);

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
          background: 'linear-gradient(135deg, #3D5449, #2C3E2F)',
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
    <div style={{ padding: '4px 20px 16px 0', fontFamily: "'Segoe UI', Arial, sans-serif", display: 'flex', flexDirection: 'column', height: '100%' }}>

      <PageHeader
        icon={<span style={{ fontSize: 20 }}>🏛️</span>}
        title={'Bonjour' + (user?.firstName ? ', ' + user.firstName : '') + ' 👋'}
        subtitle="Vue d'ensemble de vos projets d'architecture et planning"
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'CA encaissé', value: fmt(stats.ca), color: '#3D5449', bg: '#EAF0EC', icon: '💰' },
          { label: 'Projets en cours', value: stats.projetsEnCours.toString(), color: '#E07B00', bg: '#FFF3E0', icon: '📐' },
          { label: 'DCE en attente', value: stats.dceEnAttente.toString(), color: '#1A3A5C', bg: '#E5EDF5', icon: '📋' },
          { label: 'Chantiers actifs', value: stats.chantiersActifs.toString(), color: '#2E7D32', bg: '#E8F5E9', icon: '🏗️' },
        ].map(k => (
          <div key={k.label} style={{
            background: k.bg, borderRadius: 12, padding: '10px 14px',
            border: `1px solid ${k.color}22`, display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 22 }}>{k.icon}</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: 10, color: '#6B7B6F', fontWeight: 600, marginTop: 2 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* PROJETS EN COURS / PROJETS SIGNÉS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

        <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0F2540' }}>📋 PROJETS EN COURS</h3>
            <Link href="/dossiers" style={{ fontSize: 11, color: '#3D5449', fontWeight: 600, textDecoration: 'none' }}>Voir tous →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
            {dossiers.slice(0, 4).map(d => renderDossierItem(d))}
            {dossiers.length === 0 && (
              <p style={{ color: '#4A6A8A', fontSize: 12, textAlign: 'center', padding: '12px 0', margin: 0 }}>Aucun projet en cours</p>
            )}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0F2540' }}>✅ PROJETS SIGNÉS</h3>
            <Link href="/dossiers-signes" style={{ fontSize: 11, color: '#3D5449', fontWeight: 600, textDecoration: 'none' }}>Voir tous →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
            {dossiersSignes.slice(0, 4).map(d => renderDossierItem(d as any))}
            {dossiersSignes.length === 0 && (
              <p style={{ color: '#4A6A8A', fontSize: 12, textAlign: 'center', padding: '12px 0', margin: 0 }}>Aucun projet signé</p>
            )}
          </div>
        </div>
      </div>

      {/* PLANNING */}
      <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0F2540' }}>📅 PLANNING</h3>
          <Link href="/planning" style={{ fontSize: 11, color: '#3D5449', fontWeight: 600, textDecoration: 'none' }}>Planning détaillé →</Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(7, 1fr)', gap: 0, fontSize: 11, overflowY: 'auto', flex: 1 }}>
          <div style={{ fontWeight: 700, color: '#0F2540', padding: '5px 4px', borderBottom: '2px solid #E0E6ED' }}></div>
          {DAYS_OF_WEEK.map(day => (
            <div key={day} style={{
              fontWeight: 700, color: '#3D5449', padding: '5px 4px',
              textAlign: 'center', borderBottom: '2px solid #E0E6ED', fontSize: 11,
            }}>
              {day}
            </div>
          ))}

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
  );
}
