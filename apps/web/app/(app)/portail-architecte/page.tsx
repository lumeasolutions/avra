'use client';

import Link from 'next/link';
import { useDossierStore, useFacturationStore, usePlanningStore, useHistoryStore } from '@/store';
import { useAuthStore } from '@/store/useAuthStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { useMemo } from 'react';
import { usePortailGuard } from '@/hooks/usePortailGuard';
import { ChevronRight, AlertTriangle, CheckSquare, Bell, FileWarning, Clock, Package, CalendarCog } from 'lucide-react';

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
  const storeLogs = useHistoryStore(s => s.historyLogs);
  const user = useAuthStore(s => s.user);

  const today = new Date();
  const todayDayIndex = (today.getDay() + 6) % 7;
  const todayEvents = planningEvents.filter(ev => ev.day === todayDayIndex && (ev.weekOffset ?? 0) === 0);
  const recentLogs = storeLogs.slice(0, 6);

  const actionsAFaire = useMemo(() => {
    const actions: { id: string; type: 'devis'|'facture'|'confirmation'; label: string; detail: string; href: string; priority: 'high'|'medium'|'low' }[] = [];
    devis.filter(d => d.statut === 'ENVOYÉ').forEach(d => {
      actions.push({ id: 'dv-'+d.id, type: 'devis', label: `Devis ${d.ref} en attente`, detail: `${d.client} · ${d.dateCreation}`, href: '/facturation', priority: 'medium' });
    });
    devis.filter(d => d.signatureStatus === 'EN_ATTENTE_SIGNATURE').forEach(d => {
      actions.push({ id: 'sg-'+d.id, type: 'devis', label: `Signature en attente — ${d.ref}`, detail: d.client, href: '/facturation', priority: 'high' });
    });
    invoices.filter(i => i.statut === 'RETARD').forEach(inv => {
      actions.push({ id: 'fr-'+inv.id, type: 'facture', label: `Facture en retard — ${inv.ref}`, detail: inv.client, href: '/facturation', priority: 'high' });
    });
    dossiersSignes.forEach(d => {
      const pending = (d.confirmations ?? []).filter(c => !c.validee);
      if (pending.length > 0) actions.push({ id: 'cf-'+d.id, type: 'confirmation', label: `${pending.length} confirmation(s) en attente`, detail: d.name, href: '/dossiers-signes', priority: 'medium' });
    });
    return actions.sort((a, b) => (a.priority === 'high' ? -1 : b.priority === 'high' ? 1 : 0));
  }, [devis, invoices, dossiersSignes]);

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
    <div style={{ padding: '16px 20px 16px 0', fontFamily: "'Segoe UI', Arial, sans-serif", display: 'flex', flexDirection: 'column', height: '100%' }}>

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
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0F2540' }}>📅 PLANNING CHANTIERS</h3>
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

      {/* ── SECTION TABLEAU DE BORD ── */}
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ACTIONS À FAIRE + URGENTS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          {/* Actions à faire */}
          <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0F2540' }}><CheckSquare size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />ACTIONS À FAIRE</h3>
              <span style={{ fontSize: 10, background: actionsAFaire.length > 0 ? '#FFF0F0' : '#E8F5E9', color: actionsAFaire.length > 0 ? '#C0392B' : '#2E7D32', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>{actionsAFaire.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
              {actionsAFaire.length === 0 && (
                <p style={{ color: '#4A6A8A', fontSize: 12, textAlign: 'center', padding: '12px 0', margin: 0 }}>Aucune action en attente ✓</p>
              )}
              {actionsAFaire.map(action => (
                <Link key={action.id} href={action.href} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                  borderRadius: 8, background: action.priority === 'high' ? '#FFF5F5' : '#FAFBFC',
                  textDecoration: 'none', borderLeft: `3px solid ${action.priority === 'high' ? '#C0392B' : '#E07B00'}`,
                }}>
                  {action.priority === 'high' ? <AlertTriangle size={13} color="#C0392B" /> : <Bell size={13} color="#E07B00" />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#0F2540', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{action.label}</div>
                    <div style={{ fontSize: 9, color: '#7A8E9F' }}>{action.detail}</div>
                  </div>
                  <ChevronRight size={12} color="#B0BEC5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Urgents & Alertes */}
          <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0F2540' }}><AlertTriangle size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />URGENTS & ALERTES</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
              {dossiers.filter(d => d.status === 'URGENT').length === 0 && invoices.filter(i => i.statut === 'RETARD').length === 0 && (
                <p style={{ color: '#4A6A8A', fontSize: 12, textAlign: 'center', padding: '12px 0', margin: 0 }}>Aucune alerte active ✓</p>
              )}
              {dossiers.filter(d => d.status === 'URGENT').map(d => (
                <Link key={d.id} href={`/dossiers/${d.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                  borderRadius: 8, background: '#FFF5F5', textDecoration: 'none', borderLeft: '3px solid #C0392B',
                }}>
                  <FileWarning size={13} color="#C0392B" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#0F2540', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                    <div style={{ fontSize: 9, color: '#C0392B', fontWeight: 600 }}>URGENT</div>
                  </div>
                  <ChevronRight size={12} color="#B0BEC5" />
                </Link>
              ))}
              {invoices.filter(i => i.statut === 'RETARD').map(inv => (
                <Link key={inv.id} href="/facturation" style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                  borderRadius: 8, background: '#FFF0F0', textDecoration: 'none', borderLeft: '3px solid #E07B00',
                }}>
                  <Clock size={13} color="#E07B00" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#0F2540', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Facture {inv.ref} en retard</div>
                    <div style={{ fontSize: 9, color: '#7A8E9F' }}>{inv.client}</div>
                  </div>
                  <ChevronRight size={12} color="#B0BEC5" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Activité récente */}
        <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, color: '#0F2540' }}>
            <CalendarCog size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />ACTIVITÉ RÉCENTE
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {recentLogs.length === 0 && (
              <p style={{ color: '#4A6A8A', fontSize: 12, textAlign: 'center', padding: '12px 0', margin: 0, gridColumn: '1/-1' }}>Aucune activité récente</p>
            )}
            {recentLogs.map((log, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px',
                borderRadius: 8, background: '#F8FAFB',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3D5449', marginTop: 4, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#0F2540', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.action}</div>
                  <div style={{ fontSize: 9, color: '#7A8E9F' }}>{log.entity} · {log.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
