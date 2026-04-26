'use client';

import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { ArrowRight, Inbox, Clock, CheckCircle2, AlertCircle, Hammer, MessageSquare } from 'lucide-react';
import { useDemandesStore } from '@/store/useDemandesStore';
import { useAuthStore } from '@/store/useAuthStore';
import { StatusBadge } from './components/StatusBadge';
import { TypeBadge } from './components/TypeBadge';
import { Demande } from '@/lib/demandes-api';

function formatDateRel(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h}h`;
  const j = Math.round(h / 24);
  if (j < 7) return `il y a ${j}j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatScheduled(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function IntervenantHomePage() {
  const user = useAuthStore((s) => s.user);
  const myDemandes = useDemandesStore((s) => s.myDemandes);
  const myStats = useDemandesStore((s) => s.myStats);
  const loadingMyList = useDemandesStore((s) => s.loadingMyList);
  const fetchMyDemandes = useDemandesStore((s) => s.fetchMyDemandes);
  const fetchMyStats = useDemandesStore((s) => s.fetchMyStats);

  useEffect(() => {
    fetchMyDemandes();
    fetchMyStats();
  }, [fetchMyDemandes, fetchMyStats]);

  // Tri : à traiter d'abord (ENVOYEE, VUE), puis EN_COURS, puis le reste
  const ordered = useMemo(() => {
    const order: Record<string, number> = {
      ENVOYEE: 0, VUE: 1, EN_COURS: 2, ACCEPTEE: 3,
      TERMINEE: 4, REFUSEE: 5, ANNULEE: 6,
    };
    return [...myDemandes].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  }, [myDemandes]);

  const aTraiter = ordered.filter((d) => d.status === 'ENVOYEE' || d.status === 'VUE').slice(0, 5);
  const enCours = ordered.filter((d) => d.status === 'EN_COURS' || d.status === 'ACCEPTEE').slice(0, 5);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 6) return 'Bonsoir';
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }, []);

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1a2a1e 0%, #3D5449 60%, #4a6951 100%)',
        borderRadius: 22,
        padding: '32px 36px',
        color: '#f5eee8',
        marginBottom: 24,
        boxShadow: '0 8px 32px rgba(26,42,30,0.18)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: -40, top: -40, width: 220, height: 220,
          background: 'radial-gradient(circle, rgba(203,185,138,0.18) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Hammer size={18} style={{ color: '#cbb98a' }} />
          <span style={{ fontSize: 12, letterSpacing: '0.16em', fontWeight: 600, color: '#cbb98a', textTransform: 'uppercase' }}>
            Tableau de bord intervenant
          </span>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '4px 0 8px', letterSpacing: '-0.02em' }}>
          {greeting}{user?.firstName ? `, ${user.firstName}` : ''}
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(245,238,232,0.78)', margin: 0, maxWidth: 560 }}>
          Retrouvez ici toutes les demandes que vos clients vous ont envoyées : poses, livraisons, prises de mesure, SAV.
        </p>

        {/* KPIs intégrés */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 14,
          marginTop: 22,
        }}>
          <KpiCard label="À traiter" value={myStats?.actionRequiredCount ?? 0} icon={<AlertCircle size={18} />} accent="#fde68a" />
          <KpiCard label="En cours" value={myStats?.byStatus?.EN_COURS ?? 0} icon={<Clock size={18} />} accent="#bfdbfe" />
          <KpiCard label="Terminées" value={myStats?.byStatus?.TERMINEE ?? 0} icon={<CheckCircle2 size={18} />} accent="#bbf7d0" />
          <KpiCard label="Total" value={myStats?.total ?? 0} icon={<Inbox size={18} />} accent="#cbb98a" />
        </div>
      </div>

      {/* À traiter */}
      <Section
        title="Demandes à traiter"
        icon={<AlertCircle size={18} style={{ color: '#c2410c' }} />}
        action={<Link href="/intervenant/demandes?status=ENVOYEE" style={linkStyle}>Voir tout <ArrowRight size={14} /></Link>}
      >
        {loadingMyList && aTraiter.length === 0 ? (
          <SkeletonList />
        ) : aTraiter.length === 0 ? (
          <EmptyState message="Aucune demande à traiter pour le moment. Bravo !" tone="success" />
        ) : (
          aTraiter.map((d) => <DemandeRow key={d.id} demande={d} />)
        )}
      </Section>

      {/* En cours */}
      <Section
        title="En cours"
        icon={<Clock size={18} style={{ color: '#1d4ed8' }} />}
        action={<Link href="/intervenant/demandes?status=EN_COURS" style={linkStyle}>Voir tout <ArrowRight size={14} /></Link>}
      >
        {enCours.length === 0 ? (
          <EmptyState message="Aucune intervention démarrée." />
        ) : (
          enCours.map((d) => <DemandeRow key={d.id} demande={d} />)
        )}
      </Section>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  fontSize: 13, fontWeight: 600, color: '#3D5449',
  textDecoration: 'none',
};

function KpiCard({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 14,
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 6,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: accent, fontSize: 12, fontWeight: 600 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#f5eee8', letterSpacing: '-0.02em' }}>
        {value}
      </div>
    </div>
  );
}

function Section({
  title, icon, action, children,
}: { title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{
      background: '#fff',
      borderRadius: 18,
      padding: '20px 24px',
      marginBottom: 18,
      boxShadow: '0 2px 12px rgba(26,42,30,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{
          fontSize: 17, fontWeight: 700, margin: 0,
          display: 'flex', alignItems: 'center', gap: 8, color: '#1a2a1e',
        }}>
          {icon} {title}
        </h2>
        {action}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </section>
  );
}

function DemandeRow({ demande }: { demande: Demande }) {
  const msgCount = demande.messages?.length ?? 0;
  return (
    <Link
      href={`/intervenant/demandes/${demande.id}`}
      style={{
        display: 'block',
        padding: '14px 16px',
        background: '#fafaf8',
        borderRadius: 12,
        border: '1px solid #ece7df',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <TypeBadge type={demande.type} size="sm" />
        <StatusBadge status={demande.status} size="sm" />
        <span style={{ fontSize: 11, color: '#7c6c58', marginLeft: 'auto' }}>
          {formatDateRel(demande.createdAt)}
        </span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2a1e', marginBottom: 4 }}>
        {demande.title}
      </div>
      <div style={{ fontSize: 12, color: '#5b5045', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {demande.project && (
          <span>📂 {demande.project.name}{demande.project.reference ? ` · ${demande.project.reference}` : ''}</span>
        )}
        {demande.scheduledFor && (
          <span style={{ color: '#7c4f1d', fontWeight: 600 }}>
            🗓 {formatScheduled(demande.scheduledFor)}
          </span>
        )}
        {msgCount > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <MessageSquare size={12} /> {msgCount}
          </span>
        )}
      </div>
    </Link>
  );
}

function SkeletonList() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{
          height: 64,
          background: 'linear-gradient(90deg, #f3ede4 25%, #ece7df 50%, #f3ede4 75%)',
          backgroundSize: '200% 100%',
          animation: 'pulse 1.4s ease-in-out infinite',
          borderRadius: 12,
        }} />
      ))}
      <style>{`@keyframes pulse { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </>
  );
}

function EmptyState({ message, tone = 'neutral' }: { message: string; tone?: 'neutral' | 'success' }) {
  return (
    <div style={{
      padding: '24px',
      textAlign: 'center',
      color: tone === 'success' ? '#15803d' : '#7c6c58',
      fontSize: 13,
      background: tone === 'success' ? '#f0fdf4' : '#fafaf8',
      borderRadius: 10,
      border: `1px dashed ${tone === 'success' ? '#bbf7d0' : '#ddd5c7'}`,
    }}>
      {message}
    </div>
  );
}
