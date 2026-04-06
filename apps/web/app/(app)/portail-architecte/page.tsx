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

export default function PortailArchitectePage() {
  usePortailGuard('architecte');
  const dossiers = useDossierStore(s => s.dossiers);
  const dossiersSignes = useDossierStore(s => s.dossiersSignes);
  const invoices = useFacturationStore(s => s.invoices);
  const devis = useFacturationStore(s => s.devis);
  const planningEvents = usePlanningStore(s => s.planningEvents);
  const user = useAuthStore(s => s.user);

  const stats = useMemo(() => {
    const ca = invoices.filter(i => i.statut === 'PAYÉ').reduce((s, i) => s + i.montantHT, 0);
    const projetsEnCours = dossiers.filter(d => d.status === 'EN COURS').length;
    const dceEnAttente = devis.filter(d => d.statut === 'ENVOYÉ').length;
    const chantiersActifs = dossiers.filter(d => d.status === 'FINITION').length;
    const savOuverts = dossiersSignes.filter(d => (d.confirmations ?? []).some(c => !c.validee)).length;
    return { ca, projetsEnCours, dceEnAttente, chantiersActifs, savOuverts };
  }, [dossiers, dossiersSignes, invoices, devis]);

  // Render a dossier item with status badge
  const renderDossierItem = (d: typeof dossiers[0]) => {
    const colors = getStatusColor(d.status);
    return (
      <Link key={d.id} href={`/dossiers/${d.id}`} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 10, background: '#F8FAFB',
        textDecoration: 'none', transition: 'background 0.2s',
        borderLeft: `3px solid ${colors.text}`,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'linear-gradient(135deg, #3D5449, #2C3E2F)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0,
        }}>
          {d.name.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F2540', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
          <div style={{ fontSize: 10, color: '#7A8E9F', marginTop: 2 }}>{d.firstName ? `${d.firstName} •` : ''} {d.status}</div>
        </div>
        <div style={{
          fontSize: 9, fontWeight: 700, padding: '4px 10px', borderRadius: 12,
          background: colors.bg, color: colors.text, flexShrink: 0,
        }}>{d.status}</div>
      </Link>
    );
  };

  return (
    <div style={{ padding: '28px 24px 28px 0', fontFamily: "'Segoe UI', Arial, sans-serif" }}>

      {/* En-tête portail */}
      <PageHeader
        icon={<span style={{ fontSize: 24 }}>🏛️</span>}
        title={'Bonjour' + (user?.firstName ? ', ' + user.firstName : '') + ' 👋'}
        subtitle="Vue d'ensemble de vos projets d'architecture et planning"
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'CA encaissé', value: fmt(stats.ca), color: '#3D5449', bg: '#EAF0EC', icon: '💰' },
          { label: 'Projets en cours', value: stats.projetsEnCours.toString(), color: '#E07B00', bg: '#FFF3E0', icon: '📐' },
          { label: 'DCE en attente', value: stats.dceEnAttente.toString(), color: '#1A3A5C', bg: '#E5EDF5', icon: '📋' },
          { label: 'Chantiers actifs', value: stats.chantiersActifs.toString(), color: '#2E7D32', bg: '#E8F5E9', icon: '🏗️' },
        ].map(k => (
          <div key={k.label} style={{
            background: k.bg, borderRadius: 14, padding: '16px 18px',
            border: `1px solid ${k.color}22`,
          }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: '#6B7B6F', fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* DOSSIERS EN COURS / DOSSIERS SIGNÉS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>

        {/* DOSSIERS EN COURS */}
        <div style={{ background: 'white', borderRadius: 16, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F2540' }}>📋 PROJETS EN COURS</h3>
            <Link href="/dossiers" style={{ fontSize: 12, color: '#3D5449', fontWeight: 600, textDecoration: 'none' }}>Voir tous →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dossiers.slice(0, 6).map(d => renderDossierItem(d))}
            {dossiers.length === 0 && (
              <p style={{ color: '#4A6A8A', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Aucun projet en cours</p>
            )}
          </div>
        </div>

        {/* DOSSIERS SIGNÉS */}
        <div style={{ background: 'white', borderRadius: 16, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F2540' }}>✅ PROJETS SIGNÉS</h3>
            <Link href="/dossiers-signes" style={{ fontSize: 12, color: '#3D5449', fontWeight: 600, textDecoration: 'none' }}>Voir tous →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dossiersSignes.slice(0, 6).map(d => renderDossierItem(d as any))}
            {dossiersSignes.length === 0 && (
              <p style={{ color: '#4A6A8A', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Aucun projet signé</p>
            )}
          </div>
        </div>
      </div>

      {/* PLANNING */}
      <div style={{ background: 'white', borderRadius: 16, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 28 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0F2540' }}>📅 PLANNING CHANTIERS</h3>

        {/* Grille de planning */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(7, 1fr)', gap: 0, fontSize: 12, overflowX: 'auto' }}>
          {/* Header - Jours */}
          <div style={{ fontWeight: 700, color: '#0F2540', padding: '8px 4px', borderBottom: '2px solid #E0E6ED' }}></div>
          {DAYS_OF_WEEK.map(day => (
            <div key={day} style={{
              fontWeight: 700, color: '#3D5449', padding: '8px 4px',
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
          <Link href="/planning" style={{ color: '#3D5449', fontWeight: 600, textDecoration: 'none' }}>
            Accéder au planning détaillé →
          </Link>
        </div>
      </div>

    </div>
  );
}
