'use client';

/**
 * TABLEAU DE BORD d'un dossier SIGNÉ — composant PARTAGÉ.
 *
 * Rendu à l'IDENTIQUE :
 *  - depuis la liste des dossiers signés (bouton « Tableau de bord » d'une carte),
 *  - depuis l'INTÉRIEUR du dossier (/dossiers/[id], bouton tableau de bord),
 * pour que la vue soit exactement la même dedans et dehors.
 *
 * Étapes profession-aware (dates butoires + Commande/Confirmations/Livraison),
 * validation par étape (bouton « Valider » = seule vérité), lignes multi-
 * fournisseurs avec statut par ligne, KPIs + progression. 100% piloté par le
 * store (echeanceStatus = source unique).
 */
import {
  BarChart3, X, Calendar, Phone, Mail, MapPin,
  CheckCircle2, Hourglass, TrendingUp, Check, Clock,
} from 'lucide-react';
import { useDossierStore, type CommandeAccessEntry } from '@/store';
import { echeanceStatus } from '@/lib/echeanceStatus';
import {
  MENUISIER_DATE_BUTOIRE_ITEMS,
  CUISINISTE_DATE_BUTOIRE_ITEMS,
  ARCHITECTE_DATE_BUTOIRE_ITEMS,
  DEFAULT_DATE_BUTOIRE_ITEMS,
  type DateButoireItem,
} from '@/components/dossiers/DateButoireValidationModal';

/** Formatage date FR (parse LOCAL pour éviter le décalage de fuseau sur les ISO). */
function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  const fmt = (dt: Date) => dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const date = new Date(+y, +m - 1, +d);
    if (!isNaN(date.getTime())) return fmt(date);
  }
  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = new Date(+iso[1], +iso[2] - 1, +iso[3]);
    if (!isNaN(date.getTime())) return fmt(date);
  }
  const d2 = new Date(dateStr);
  if (!isNaN(d2.getTime())) return fmt(d2);
  return dateStr;
}

// SAV (30/07/2026) : les 3 listes profession + la liste par défaut contiennent
// désormais NATIVEMENT un item SAV (kind 'date') — voir DateButoireValidationModal.tsx.
// Avant ce changement, SAV n'existait QUE dans ce tableau de bord (ajouté ici à
// la volée via un item dédié) ; il aurait sinon fallu le dupliquer, d'où sa
// suppression : la source unique est maintenant les listes importées ci-dessous.
function getDateButoireItemsForProfession(profession: string | null): DateButoireItem[] {
  if (profession === 'menuisier') return MENUISIER_DATE_BUTOIRE_ITEMS;
  if (profession === 'cuisiniste') return CUISINISTE_DATE_BUTOIRE_ITEMS;
  if (profession === 'architecte') return ARCHITECTE_DATE_BUTOIRE_ITEMS;
  return DEFAULT_DATE_BUTOIRE_ITEMS;
}

export function SignedDossierDashboardModal({
  dossierId, onClose, profession,
}: { dossierId: string; onClose: () => void; profession: string | null }) {
  const datesButoiresSignes = useDossierStore(s => s.datesButoiresSignes);
  const setEcheanceValidee = useDossierStore(s => s.setEcheanceValidee);
  const echeancesValidees = useDossierStore(s => s.echeancesValidees);
  const commandesAccess = useDossierStore(s => s.commandesAccess);
  const updateCommandeAccess = useDossierStore(s => s.updateCommandeAccess);
  const dossier = useDossierStore(s => s.dossiersSignes.find(d => d.id === dossierId));
  const saved = datesButoiresSignes[dossierId] ?? {};

  const getLines = (label: string): CommandeAccessEntry[] => commandesAccess[dossierId]?.[label] ?? [];
  const getLineStatus = (dateButoir: string, validee?: boolean) => echeanceStatus(dateButoir, validee === true);

  const items = getDateButoireItemsForProfession(profession);

  const findSubfolder = (label: string) => {
    const norm = label.trim().toLowerCase();
    return dossier?.signedSubfolders.find(sf => sf.label.trim().toLowerCase() === norm);
  };

  const isAccessCompleted = (label: string): boolean => {
    const lines = getLines(label);
    if (lines.length > 0) return lines.every(l => !!l.validee);
    const sf = findSubfolder(label);
    if (!sf) return false;
    if (sf.validated) return true;
    return (sf.documents?.length ?? 0) > 0;
  };

  const validateStep = (label: string) => setEcheanceValidee(dossierId, label, true);
  const unvalidateStep = (label: string) => setEcheanceValidee(dossierId, label, false);

  const isItemCompleted = (item: DateButoireItem): boolean => {
    if (item.kind === 'date') return echeancesValidees[dossierId]?.[item.label] === true;
    if (item.kind === 'access') return isAccessCompleted(item.label);
    return false;
  };

  const progressItems = items.filter(i => i.kind !== 'static');
  const completedCount = progressItems.filter(isItemCompleted).length;
  const totalCount = progressItems.length;

  const getDateStatus = (id: string) => echeanceStatus(saved[id], echeancesValidees[dossierId]?.[id] === true);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, zIndex: 50,
    }} onClick={onClose}>
      <div
        style={{
          backgroundColor: 'white', borderRadius: '1.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem', borderBottom: '1px solid rgba(48, 64, 53, 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BarChart3 style={{ width: '1.25rem', height: '1.25rem', color: '#304035' }} />
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#304035' }}>TABLEAU DE BORD</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: 'transparent',
              border: 'none', cursor: 'pointer', color: 'rgba(48, 64, 53, 0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(48, 64, 53, 0.6)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(48, 64, 53, 0.4)')}
          >
            <X style={{ width: '1.25rem', height: '1.25rem' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {dossier && (
            <div style={{
              padding: '14px 16px', background: 'rgba(48,64,53,0.04)',
              borderRadius: 14, border: '1px solid rgba(48,64,53,0.06)', marginBottom: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#304035' }}>
                    {dossier.name}{dossier.firstName ? ` ${dossier.firstName}` : ''}
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(48,64,53,0.5)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={11} /> Signé le {formatDate(dossier.signedDate)}
                  </p>
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 999,
                  background: 'rgba(16,185,129,0.12)', color: '#059669',
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.06em',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                  SIGNÉ
                </span>
              </div>
              {(dossier.phone || dossier.email || dossier.address) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontSize: 11, color: 'rgba(48,64,53,0.6)' }}>
                  {dossier.phone && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Phone size={11} color="rgba(48,64,53,0.4)" />{dossier.phone}
                    </span>
                  )}
                  {dossier.email && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Mail size={11} color="rgba(48,64,53,0.4)" />{dossier.email}
                    </span>
                  )}
                  {dossier.address && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={11} color="rgba(48,64,53,0.4)" />{dossier.address}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* KPIs */}
          {(() => {
            const validatedCount = items.filter(isItemCompleted).length;
            const pendingCount = progressItems.filter(i => !isItemCompleted(i)).length;
            const pctRound = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 10, marginBottom: 18 }}>
                <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <CheckCircle2 size={14} color="#16a34a" />
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Validés</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#16a34a', lineHeight: 1 }}>{validatedCount}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(48,64,53,0.5)' }}>sur {totalCount} étapes</p>
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.18)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Hourglass size={14} color="#ea580c" />
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>À valider</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#ea580c', lineHeight: 1 }}>{pendingCount}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(48,64,53,0.5)' }}>en attente</p>
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(166,119,73,0.06)', border: '1px solid rgba(166,119,73,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <TrendingUp size={14} color="#a67749" />
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Avancement</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#a67749', lineHeight: 1 }}>{pctRound}%</p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(48,64,53,0.5)' }}>étapes complétées</p>
                </div>
              </div>
            );
          })()}

          {/* Progression globale */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(48,64,53,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Progression globale</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#304035' }}>{completedCount}/{totalCount}</span>
            </div>
            <div style={{ height: 6, background: 'rgba(48,64,53,0.08)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                background: completedCount === totalCount ? 'linear-gradient(90deg, #16a34a, #22c55e)' : 'linear-gradient(90deg, #a67749, #c9a96e)',
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>

          {/* Status Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {items.map((item) => {
              if (item.kind === 'access') {
                const lines = getLines(item.label);
                const sf = findSubfolder(item.label);
                const docCount = sf?.documents?.length ?? 0;
                const completed = isAccessCompleted(item.label);
                const lineStatuses = lines.map(l => getLineStatus(l.dateButoir, l.validee));
                const retardCount = lineStatuses.filter(s => s === 'retard').length;
                const urgentCount = lineStatuses.filter(s => s === 'urgent').length;
                const valideeCount = lines.filter(l => !!l.validee).length;
                const headStatus: 'retard' | 'urgent' | 'done' | 'neutre' =
                  retardCount > 0 ? 'retard'
                  : urgentCount > 0 ? 'urgent'
                  : (lines.length > 0 && completed) ? 'done'
                  : 'neutre';
                const headDot = headStatus === 'retard' ? '#dc2626'
                  : headStatus === 'urgent' ? '#f97316'
                  : headStatus === 'done' ? '#10b981'
                  : (docCount > 0 ? '#10b981' : '#e5e7eb');
                const headBorder = headStatus === 'retard' ? 'rgba(220,38,38,0.22)'
                  : headStatus === 'urgent' ? 'rgba(249,115,22,0.22)'
                  : headStatus === 'done' ? 'rgba(16,185,129,0.2)'
                  : 'rgba(48,64,53,0.08)';
                const headBg = headStatus === 'retard' ? 'rgba(220,38,38,0.04)'
                  : headStatus === 'urgent' ? 'rgba(249,115,22,0.04)'
                  : headStatus === 'done' ? 'rgba(16,185,129,0.05)'
                  : 'transparent';
                return (
                  <div key={item.label} style={{ border: `1px solid ${headBorder}`, borderRadius: '0.75rem', backgroundColor: headBg, overflow: 'hidden' }}>
                    <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '0.625rem', height: '0.625rem', borderRadius: '50%', backgroundColor: headDot, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: '700', color: '#304035' }}>{item.label}</span>
                      {lines.length > 0 ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 700 }}>
                          <span style={{ color: valideeCount === lines.length ? '#16a34a' : 'rgba(48,64,53,0.55)' }}>
                            {valideeCount}/{lines.length} validée{lines.length > 1 ? 's' : ''}
                          </span>
                          {retardCount > 0 && <span style={{ color: '#dc2626' }}>· {retardCount} en retard</span>}
                          {retardCount === 0 && urgentCount > 0 && <span style={{ color: '#ea580c' }}>· {urgentCount} urgent{urgentCount > 1 ? 's' : ''}</span>}
                        </span>
                      ) : docCount > 0 ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Check style={{ width: 12, height: 12 }} />{docCount} doc{docCount > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'rgba(48,64,53,0.3)', fontStyle: 'italic' }}>Vide à compléter</span>
                      )}
                    </div>
                    {lines.length > 0 && (
                      <div style={{ borderTop: `1px solid ${headBorder}`, padding: '6px 8px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {lines.map((line) => {
                          const st = getLineStatus(line.dateButoir, line.validee);
                          const color = st === 'done' ? '#16a34a' : st === 'retard' ? '#dc2626' : st === 'urgent' ? '#ea580c' : st === 'planned' ? '#2563eb' : 'rgba(48,64,53,0.4)';
                          const label = st === 'done' ? 'Validé'
                            : st === 'retard' ? `En retard · ${formatDate(line.dateButoir)}`
                            : st === 'urgent' ? `Urgent · ${formatDate(line.dateButoir)}`
                            : st === 'planned' ? `À venir · ${formatDate(line.dateButoir)}`
                            : 'Sans date';
                          return (
                            <div key={line.id} style={{
                              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8,
                              background: st === 'retard' ? 'rgba(220,38,38,0.06)' : st === 'urgent' ? 'rgba(249,115,22,0.06)' : st === 'done' ? 'rgba(16,185,129,0.05)' : 'rgba(48,64,53,0.03)',
                            }}>
                              <button
                                type="button"
                                onClick={() => updateCommandeAccess(dossierId, item.label, line.id, { validee: !line.validee })}
                                title={line.validee ? 'Marquer comme non validé' : 'Marquer comme validé (commande passée / reçue / livrée)'}
                                style={{
                                  width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: 'pointer',
                                  border: line.validee ? 'none' : '1.5px solid rgba(48,64,53,0.25)',
                                  background: line.validee ? '#16a34a' : 'transparent',
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                                }}
                              >
                                {line.validee && <Check style={{ width: 12, height: 12, color: 'white' }} />}
                              </button>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#304035', textDecoration: line.validee ? 'line-through' : 'none', opacity: line.validee ? 0.6 : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {line.fournisseur || 'Fournisseur ?'}
                                  {line.produit ? <span style={{ fontWeight: 500, color: 'rgba(48,64,53,0.55)' }}> · {line.produit}</span> : null}
                                </div>
                                {typeof line.montant === 'number' && line.montant > 0 && (
                                  <div style={{ fontSize: '0.68rem', color: 'rgba(48,64,53,0.5)' }}>{line.montant.toLocaleString('fr-FR')} € HT</div>
                                )}
                              </div>
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                {st === 'done' ? <CheckCircle2 style={{ width: 11, height: 11 }} /> : <Clock style={{ width: 11, height: 11 }} />}
                                {label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              if (item.kind === 'static') {
                return (
                  <div key={item.label} style={{
                    padding: '0.75rem 1rem', border: '1px solid rgba(120,80,180,0.18)', borderRadius: '0.75rem',
                    display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'rgba(120,80,180,0.03)',
                  }}>
                    <div style={{ width: '0.625rem', height: '0.625rem', borderRadius: '50%', backgroundColor: '#7850b4', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: '700', color: '#304035' }}>{item.label}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'rgba(120,80,180,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Suivi continu</span>
                  </div>
                );
              }

              const status = getDateStatus(item.label);
              const val = saved[item.label];
              const dotColor = status === 'done' ? '#10b981' : status === 'retard' ? '#dc2626' : status === 'urgent' ? '#f97316' : status === 'planned' ? '#3b82f6' : '#e5e7eb';
              const bgColor = status === 'done' ? 'rgba(16,185,129,0.05)' : status === 'retard' ? 'rgba(220,38,38,0.06)' : status === 'urgent' ? 'rgba(249,115,22,0.06)' : status === 'planned' ? 'rgba(59,130,246,0.05)' : 'transparent';
              const borderColor = status === 'done' ? 'rgba(16,185,129,0.2)' : status === 'retard' ? 'rgba(220,38,38,0.2)' : status === 'urgent' ? 'rgba(249,115,22,0.2)' : status === 'planned' ? 'rgba(59,130,246,0.2)' : 'rgba(48,64,53,0.08)';
              return (
                <div key={item.label} style={{
                  padding: '0.75rem 1rem', border: `1px solid ${borderColor}`, borderRadius: '0.75rem',
                  display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: bgColor,
                }}>
                  <div style={{ width: '0.625rem', height: '0.625rem', borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: '700', color: '#304035' }}>{item.label}</span>
                  {status === 'done' ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: '700', color: '#16a34a' }}>
                        <CheckCircle2 style={{ width: 12, height: 12 }} />
                        Validé{val ? ` · ${formatDate(val)}` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => unvalidateStep(item.label)}
                        title="Annuler la validation (repasse en « à valider »)"
                        style={{ padding: 3, borderRadius: 6, border: 'none', background: 'rgba(48,64,53,0.06)', cursor: 'pointer', color: 'rgba(48,64,53,0.5)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(220,38,38,0.12)'; e.currentTarget.style.color = '#dc2626'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(48,64,53,0.06)'; e.currentTarget.style.color = 'rgba(48,64,53,0.5)'; }}
                      >
                        <X style={{ width: 11, height: 11 }} />
                      </button>
                    </div>
                  ) : val ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: '700', color: status === 'retard' ? '#dc2626' : status === 'urgent' ? '#f97316' : '#2563eb' }}>
                        <Clock style={{ width: 12, height: 12 }} />
                        {status === 'retard' ? `En retard · ${formatDate(val)}` : status === 'urgent' ? `Urgent · ${formatDate(val)}` : `À venir · ${formatDate(val)}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => validateStep(item.label)}
                        title="Marquer cette étape comme validée (éteint l'alerte)"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.1)', color: '#16a34a', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; }}
                      >
                        <Check style={{ width: 11, height: 11 }} />Valider
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => validateStep(item.label)}
                      title="Marquer cette étape comme validée"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.08)', color: '#ea580c', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.12)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)'; e.currentTarget.style.color = '#16a34a'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(249,115,22,0.08)'; e.currentTarget.style.borderColor = 'rgba(249,115,22,0.3)'; e.currentTarget.style.color = '#ea580c'; }}
                    >
                      <Hourglass style={{ width: 11, height: 11 }} />À valider
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Confirmations summary */}
          {(dossier?.confirmations?.length ?? 0) > 0 && (
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', backgroundColor: 'rgba(48,64,53,0.04)', borderRadius: '0.75rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: '700', color: 'rgba(48,64,53,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Confirmations fournisseurs</p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '1.25rem', fontWeight: '800', color: '#10b981' }}>{dossier?.confirmations?.filter(c => c.validee && c.type === 'STANDARD').length ?? 0}</p>
                  <p style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: '600' }}>Validées</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f59e0b' }}>{dossier?.confirmations?.filter(c => !c.validee).length ?? 0}</p>
                  <p style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: '600' }}>En attente</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '1.25rem', fontWeight: '800', color: '#304035' }}>{dossier?.confirmations?.length ?? 0}</p>
                  <p style={{ fontSize: '0.65rem', color: 'rgba(48,64,53,0.5)', fontWeight: '600' }}>Total</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(48, 64, 53, 0.1)', textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: '#304035', color: 'white', border: 'none', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer', transition: 'background-color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(48, 64, 53, 0.9)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#304035')}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
