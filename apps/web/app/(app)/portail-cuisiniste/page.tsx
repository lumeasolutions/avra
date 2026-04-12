'use client';

import Link from 'next/link';
import { useDossierStore, useFacturationStore, usePlanningStore, useHistoryStore } from '@/store';
import { useAuthStore } from '@/store/useAuthStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { useMemo } from 'react';
import { usePortailGuard } from '@/hooks/usePortailGuard';
import { ChevronRight, AlertTriangle, CheckSquare, Bell, FileWarning, Clock, CalendarCog } from 'lucide-react';

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
  const devis = useFacturationStore(s => s.devis);
  const planningEvents = usePlanningStore(s => s.planningEvents);
  const storeLogs = useHistoryStore(s => s.historyLogs);
  const user = useAuthStore(s => s.user);

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
    <div className="py-7 pl-6 pr-0" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>

      {/* En-tête portail */}
      <PageHeader
        icon={<span className="text-2xl">🍳</span>}
        title={'Bonjour' + (user?.firstName ? ', ' + user.firstName : '') + ' 👋'}
        subtitle="Vue d'ensemble de vos dossiers, planning et alertes"
      />

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-[14px] mb-7">
        {[
          { label: 'CA encaissé', value: fmt(stats.ca), color: '#1A3A5C', bg: '#E5EDF5', icon: '💰' },
          { label: 'Poses urgentes', value: stats.urgents.toString(), color: '#C0392B', bg: '#FFF0F0', icon: '⚠️' },
          { label: 'En cours de pose', value: stats.enPose.toString(), color: '#E07B00', bg: '#FFF3E0', icon: '🔧' },
          { label: 'SAV ouverts', value: stats.savOuverts.toString(), color: '#0F2540', bg: '#D5E2EF', icon: '🔔' },
        ].map(k => (
          <div key={k.label} className="rounded-[14px] py-4 px-[18px]" style={{ background: k.bg, border: `1px solid ${k.color}22` }}>
            <div className="text-[20px] mb-1.5">{k.icon}</div>
            <div className="text-[22px] font-black" style={{ color: k.color }}>{k.value}</div>
            <div className="text-[11px] text-[#4A6A8A] font-semibold">{k.label}</div>
          </div>
        ))}
      </div>

      {/* DOSSIERS EN COURS / DOSSIERS SIGNÉS */}
      <div className="grid grid-cols-2 gap-5 mb-7">

        {/* DOSSIERS EN COURS */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="m-0 text-[15px] font-bold text-[#0F2540]">📋 DOSSIERS EN COURS</h3>
            <Link href="/dossiers" className="text-[12px] text-[#2E7D32] font-semibold no-underline">Voir tous →</Link>
          </div>
          <div className="flex flex-col gap-[10px]">
            {dossiers.slice(0, 6).map(d => renderDossierItem(d))}
            {dossiers.length === 0 && (
              <p className="text-[#4A6A8A] text-[13px] text-center py-5">Aucun dossier en cours</p>
            )}
          </div>
        </div>

        {/* DOSSIERS SIGNÉS */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="m-0 text-[15px] font-bold text-[#0F2540]">✅ DOSSIERS SIGNÉS</h3>
            <Link href="/dossiers-signes" className="text-[12px] text-[#2E7D32] font-semibold no-underline">Voir tous →</Link>
          </div>
          <div className="flex flex-col gap-[10px]">
            {dossiersSignes.slice(0, 6).map(d => renderDossierItem(d as any))}
            {dossiersSignes.length === 0 && (
              <p className="text-[#4A6A8A] text-[13px] text-center py-5">Aucun dossier signé</p>
            )}
          </div>
        </div>
      </div>

      {/* PLANNING */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] mb-7">
        <h3 className="m-0 mb-4 text-[15px] font-bold text-[#0F2540]">📅 PLANNING</h3>

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

      {/* ── SECTION TABLEAU DE BORD ── */}
      <div className="flex flex-col gap-[14px]">

        {/* Actions à faire + Urgents */}
        <div className="grid grid-cols-2 gap-5">

          {/* Actions à faire */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="m-0 text-[15px] font-bold text-[#0F2540] flex items-center gap-2"><CheckSquare size={14} />ACTIONS À FAIRE</h3>
              <span style={{ fontSize: 10, background: actionsAFaire.length > 0 ? '#FFF0F0' : '#E8F5E9', color: actionsAFaire.length > 0 ? '#C0392B' : '#2E7D32', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>{actionsAFaire.length}</span>
            </div>
            <div className="flex flex-col gap-[10px] max-h-[160px] overflow-y-auto">
              {actionsAFaire.length === 0 && (
                <p className="text-[#4A6A8A] text-[13px] text-center py-5 m-0">Aucune action en attente ✓</p>
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
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="m-0 text-[15px] font-bold text-[#0F2540] flex items-center gap-2"><AlertTriangle size={14} />URGENTS & ALERTES</h3>
            </div>
            <div className="flex flex-col gap-[10px] max-h-[160px] overflow-y-auto">
              {dossiers.filter(d => d.status === 'URGENT').length === 0 && invoices.filter(i => i.statut === 'RETARD').length === 0 && (
                <p className="text-[#4A6A8A] text-[13px] text-center py-5 m-0">Aucune alerte active ✓</p>
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
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <h3 className="m-0 mb-4 text-[15px] font-bold text-[#0F2540] flex items-center gap-2"><CalendarCog size={14} />ACTIVITÉ RÉCENTE</h3>
          <div className="grid grid-cols-3 gap-[10px]">
            {recentLogs.length === 0 && (
              <p className="text-[#4A6A8A] text-[13px] text-center py-5 m-0 col-span-3">Aucune activité récente</p>
            )}
            {recentLogs.map((log, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px',
                borderRadius: 8, background: '#F8FAFB',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2E7D32', marginTop: 4, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#0F2540', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.action}</div>
                  <div style={{ fontSize: 9, color: '#7A8E9F' }}>{log.target} · {log.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
