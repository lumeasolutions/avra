'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Inbox, Filter, Search } from 'lucide-react';
import { useDemandesStore } from '@/store/useDemandesStore';
import { DEMANDE_STATUS_LABELS, DEMANDE_TYPE_LABELS, Demande, DemandeStatus, DemandeType } from '@/lib/demandes-api';
import { StatusBadge } from '../components/StatusBadge';
import { TypeBadge } from '../components/TypeBadge';

const STATUS_TABS: Array<{ value: DemandeStatus | 'ALL'; label: string }> = [
  { value: 'ALL',      label: 'Toutes' },
  { value: 'ENVOYEE',  label: 'À traiter' },
  { value: 'VUE',      label: 'Vues' },
  { value: 'ACCEPTEE', label: 'Acceptées' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'TERMINEE', label: 'Terminées' },
  { value: 'REFUSEE',  label: 'Refusées' },
];

function MyDemandesPageInner() {
  const router = useRouter();
  const search = useSearchParams();
  const initialStatus = (search?.get('status') ?? 'ALL') as DemandeStatus | 'ALL';

  const myDemandes = useDemandesStore((s) => s.myDemandes);
  const myTotal = useDemandesStore((s) => s.myTotal);
  const loading = useDemandesStore((s) => s.loadingMyList);
  const myFilters = useDemandesStore((s) => s.myFilters);
  const setMyFilters = useDemandesStore((s) => s.setMyFilters);
  const fetchMyDemandes = useDemandesStore((s) => s.fetchMyDemandes);

  // Phase G : recherche locale (texte libre dans titre/notes/projet)
  const [searchTerm, setSearchTerm] = useState('');

  // Sync URL → store au mount + sur changement URL
  useEffect(() => {
    if (initialStatus === 'ALL') {
      setMyFilters({ status: undefined });
    } else {
      setMyFilters({ status: initialStatus });
    }
    // setMyFilters appelle déjà fetchMyDemandes, mais on couvre le cas où le filtre est déjà identique
    fetchMyDemandes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStatus]);

  const setStatus = (s: DemandeStatus | 'ALL') => {
    const usp = new URLSearchParams();
    if (s !== 'ALL') usp.set('status', s);
    router.replace(`/intervenant/demandes${usp.toString() ? `?${usp.toString()}` : ''}`);
  };

  // Filtre recherche local (avant grouping)
  const searched = useMemo(() => {
    if (!searchTerm.trim()) return myDemandes;
    const q = searchTerm.toLowerCase();
    return myDemandes.filter((d) =>
      d.title.toLowerCase().includes(q)
      || (d.notes ?? '').toLowerCase().includes(q)
      || (d.project?.name ?? '').toLowerCase().includes(q)
      || d.type.toLowerCase().includes(q)
    );
  }, [myDemandes, searchTerm]);

  const grouped = useMemo(() => {
    const buckets: Record<string, Demande[]> = {};
    for (const d of searched) {
      const day = new Date(d.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      (buckets[day] ??= []).push(d);
    }
    return Object.entries(buckets);
  }, [searched]);

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: '#1a2a1e', letterSpacing: '-0.02em' }}>
            Mes demandes
          </h1>
          <p style={{ fontSize: 13, color: '#7c6c58', margin: '4px 0 0' }}>
            {myTotal} demande{myTotal !== 1 ? 's' : ''} {myFilters.status ? `· ${DEMANDE_STATUS_LABELS[myFilters.status]}` : ''}
          </p>
        </div>
      </div>

      {/* Filtres tabs + recherche */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 16,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <div style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          padding: 6,
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 1px 4px rgba(26,42,30,0.05)',
          flex: '1 1 auto',
        }}>
          {STATUS_TABS.map((t) => {
            const active = (myFilters.status ?? 'ALL') === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setStatus(t.value)}
                style={{
                  padding: '8px 14px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: active ? '#1a2a1e' : 'transparent',
                  color: active ? '#cbb98a' : '#5b5045',
                  borderRadius: 10, transition: 'all 0.15s',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div style={{ position: 'relative', minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7c6c58' }} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher (titre, projet, type)…"
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              border: '1px solid #ddd5c7',
              borderRadius: 12, fontSize: 13, outline: 'none',
              background: '#fff',
            }}
          />
        </div>
      </div>

      {/* Liste */}
      {loading && myDemandes.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 80, background: '#ece7df', borderRadius: 12, opacity: 0.6 }} />
          ))}
        </div>
      ) : myDemandes.length === 0 ? (
        <div style={{
          padding: 48, textAlign: 'center',
          background: '#fff', borderRadius: 18,
          color: '#7c6c58',
          boxShadow: '0 2px 12px rgba(26,42,30,0.06)',
        }}>
          <Inbox size={32} style={{ color: '#cbb98a', marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2a1e', marginBottom: 4 }}>
            Aucune demande à afficher
          </div>
          <div style={{ fontSize: 13 }}>
            Les demandes de vos clients apparaîtront ici dès qu'ils en créeront.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {grouped.map(([day, list]) => (
            <div key={day}>
              <div style={{
                fontSize: 11,
                letterSpacing: '0.14em',
                fontWeight: 700,
                color: '#7c6c58',
                textTransform: 'uppercase',
                marginBottom: 8,
                paddingLeft: 4,
              }}>
                {day}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {list.map((d) => <DemandeListItem key={d.id} demande={d} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DemandeListItem({ demande }: { demande: Demande }) {
  const isUnread = demande.status === 'ENVOYEE';
  return (
    <Link
      href={`/intervenant/demandes/${demande.id}`}
      style={{
        display: 'block',
        padding: '16px 20px',
        background: '#fff',
        borderRadius: 14,
        textDecoration: 'none',
        color: 'inherit',
        boxShadow: isUnread
          ? '0 2px 8px rgba(194,65,12,0.12), 0 0 0 1px #fed7aa'
          : '0 1px 4px rgba(26,42,30,0.05)',
        position: 'relative',
        transition: 'all 0.15s',
      }}
    >
      {isUnread && (
        <div style={{
          position: 'absolute', left: -2, top: 16, bottom: 16,
          width: 4, borderRadius: 2,
          background: 'linear-gradient(180deg, #c2410c, #ea580c)',
        }} />
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 8, flexWrap: 'wrap',
      }}>
        <TypeBadge type={demande.type} size="sm" />
        <StatusBadge status={demande.status} size="sm" />
        <span style={{ fontSize: 11, color: '#7c6c58', marginLeft: 'auto' }}>
          {new Date(demande.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div style={{
        fontSize: 15,
        fontWeight: isUnread ? 800 : 700,
        color: '#1a2a1e',
        marginBottom: 4,
      }}>
        {demande.title}
      </div>
      {demande.notes && (
        <div style={{
          fontSize: 12, color: '#5b5045',
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
        }}>
          {demande.notes}
        </div>
      )}
      <div style={{
        display: 'flex', gap: 12, marginTop: 8,
        fontSize: 11, color: '#7c6c58', flexWrap: 'wrap',
      }}>
        {demande.createdBy && (
          <span>De {demande.createdBy.firstName ?? demande.createdBy.email}</span>
        )}
        {demande.project && <span>· {demande.project.name}</span>}
        {demande.scheduledFor && (
          <span style={{ color: '#7c4f1d', fontWeight: 600 }}>
            · 🗓 {new Date(demande.scheduledFor).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function MyDemandesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Chargement…</div>}>
      <MyDemandesPageInner />
    </Suspense>
  );
}
