'use client';

/**
 * OngoingDossierDashboardModal — mini tableau de bord d'un dossier EN COURS.
 *
 * Affiche un aperçu rapide d'un dossier non-signé sans avoir à ouvrir la
 * page détaillée. Inclut : header (nom, statut, date création), KPIs
 * (sous-dossiers / documents / progression), liste des sous-dossiers avec
 * état (rempli / vide), et un lien vers la page complète du dossier.
 *
 * Demande asso (19/05/2026) : "Manque onglet tableau de bord par dossier".
 * Pendant qu'on a déjà un tableau de bord pour les dossiers signés
 * (TableauDeBordModal dans /dossiers-signes/page.tsx), il en manquait un
 * équivalent pour les dossiers en cours.
 */

import Link from 'next/link';
import {
  X,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  FolderOpen,
} from 'lucide-react';
import type { Dossier } from '@/store/useDossierStore';

const STATUS_COLOR: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  URGENT: { dot: '#ef4444', bg: 'rgba(239,68,68,0.08)', text: '#dc2626', label: 'URGENT' },
  'EN COURS': { dot: '#f97316', bg: 'rgba(249,115,22,0.08)', text: '#ea580c', label: 'EN COURS' },
  FINITION: { dot: '#10b981', bg: 'rgba(16,185,129,0.08)', text: '#059669', label: 'FINITION' },
  'A VALIDER': { dot: '#22c55e', bg: 'rgba(34,197,94,0.08)', text: '#16a34a', label: 'À VALIDER' },
};

interface Props {
  dossier: Dossier;
  onClose: () => void;
}

export function OngoingDossierDashboardModal({ dossier, onClose }: Props) {
  const status = STATUS_COLOR[dossier.status] ?? STATUS_COLOR['EN COURS'];

  const subfolders = dossier.subfolders ?? [];
  const totalSubfolders = subfolders.length;
  const filledSubfolders = subfolders.filter((sf) => (sf.documents?.length ?? 0) > 0).length;
  const validatedSubfolders = subfolders.filter((sf) => sf.validated).length;
  const totalDocs = subfolders.reduce((sum, sf) => sum + (sf.documents?.length ?? 0), 0);
  const progressPct = totalSubfolders > 0 ? Math.round((filledSubfolders / totalSubfolders) * 100) : 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 20,
          maxWidth: 620,
          width: '100%',
          maxHeight: '88vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid rgba(48,64,53,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #f9f6f2 0%, #fff 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart3 size={20} color="#304035" />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#304035', letterSpacing: '0.02em' }}>
              TABLEAU DE BORD
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              padding: 6,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'rgba(48,64,53,0.5)',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>

          {/* Dossier card */}
          <div
            style={{
              padding: '14px 16px',
              background: 'rgba(48,64,53,0.04)',
              borderRadius: 14,
              border: '1px solid rgba(48,64,53,0.06)',
              marginBottom: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#304035' }}>
                  {dossier.name}{dossier.firstName ? ` ${dossier.firstName}` : ''}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(48,64,53,0.5)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={11} /> Créé le {dossier.createdAt}
                </p>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: status.bg,
                  color: status.text,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: status.dot }} />
                {status.label}
              </span>
            </div>

            {/* Coordonnées rapides */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontSize: 11, color: 'rgba(48,64,53,0.6)' }}>
              {dossier.phone && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Phone size={11} color="rgba(48,64,53,0.4)" />
                  {dossier.phone}
                </span>
              )}
              {dossier.email && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Mail size={11} color="rgba(48,64,53,0.4)" />
                  {dossier.email}
                </span>
              )}
              {dossier.address && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={11} color="rgba(48,64,53,0.4)" />
                  {dossier.address}
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Progression globale
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#304035' }}>{progressPct}%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(48,64,53,0.08)', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progressPct}%`,
                  background: progressPct === 100
                    ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                    : 'linear-gradient(90deg, #a67749, #c9a96e)',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>

          {/* Liste sous-dossiers */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Sous-dossiers ({totalSubfolders})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {subfolders.length === 0 ? (
                <div style={{ padding: '14px 12px', textAlign: 'center', fontSize: 12, color: 'rgba(48,64,53,0.5)', border: '1px dashed rgba(48,64,53,0.15)', borderRadius: 10 }}>
                  Aucun sous-dossier pour l&apos;instant.
                </div>
              ) : (
                subfolders.map((sf) => {
                  const docCount = sf.documents?.length ?? 0;
                  const filled = docCount > 0;
                  const validated = !!sf.validated;
                  const bg = validated ? 'rgba(16,185,129,0.05)' : filled ? 'rgba(166,119,73,0.04)' : 'transparent';
                  const border = validated ? 'rgba(16,185,129,0.25)' : filled ? 'rgba(166,119,73,0.2)' : 'rgba(48,64,53,0.08)';
                  return (
                    <div
                      key={sf.label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        borderRadius: 10,
                        border: `1px solid ${border}`,
                        background: bg,
                      }}
                    >
                      <FolderOpen size={13} color={validated ? '#10b981' : filled ? '#a67749' : 'rgba(48,64,53,0.35)'} />
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#304035' }}>{sf.label}</span>
                      {validated && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#16a34a' }}>
                          <CheckCircle2 size={11} /> Validé
                        </span>
                      )}
                      {!validated && filled && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#a67749' }}>
                          {docCount} doc{docCount > 1 ? 's' : ''}
                        </span>
                      )}
                      {!filled && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(48,64,53,0.35)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <AlertTriangle size={11} /> Vide
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid rgba(48,64,53,0.08)',
            background: '#fafaf8',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid rgba(48,64,53,0.15)',
              background: '#fff',
              fontSize: 12,
              fontWeight: 600,
              color: '#304035',
              cursor: 'pointer',
            }}
          >
            Fermer
          </button>
          <Link
            href={`/dossiers/${dossier.id}`}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #304035, #4a6358)',
              fontSize: 12,
              fontWeight: 700,
              color: '#fff',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 14px rgba(48,64,53,0.25)',
            }}
          >
            Ouvrir le dossier <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
