'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Send, Search, AlertCircle, Calendar, FileText, ChevronDown, Folder, Check, Image as ImageIcon, Mail, UserPlus, CheckCircle2, Paperclip, Trash2, Bookmark } from 'lucide-react';
import { api, apiUpload } from '@/lib/api';
import { displayName as folderDisplayName, depthOf, isDescendant } from '@/lib/folderTree';
import { useDemandeTemplatesStore } from '@/store/useDemandeTemplatesStore';
import {
  DEMANDE_TYPE_LABELS,
  DemandeType,
  IntervenantInvitation,
  createDemande as apiCreateDemande,
  createInvitation as apiCreateInvitation,
} from '@/lib/demandes-api';
import { useDemandesStore } from '@/store/useDemandesStore';

/**
 * Drawer universel "Envoyer a un intervenant".
 *
 * Reutilisable depuis n'importe quel ecran cote pro :
 *  - dossier detail
 *  - dossier signe
 *  - modal document
 *  - SAV
 *  - planning event
 *  - APD/version
 *  - sidebar
 *
 * Props : on peut pre-remplir le contexte (projectId, eventId, attachments, etc.)
 * pour que le pro n'ait qu'a choisir le destinataire et le type.
 */

export interface IntervenantOption {
  id: string;
  type: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  /** L'intervenant a-t-il un compte AVRA lie ? */
  userId: string | null;
}

export interface SendToIntervenantPrefill {
  type?: DemandeType;
  title?: string;
  notes?: string;
  projectId?: string;
  /**
   * Restreint le sélecteur de pièces à UN seul sous-dossier (+ ses sous-dossiers).
   * Utilisé par le bouton « avion » d'une ligne de sous-dossier : on ne propose
   * QUE ce sous-dossier (pas les autres) et ses documents sont pré-cochés.
   * Absent → tout le dossier est proposé (sélection multiple, ex. bouton « Nouvelle »).
   */
  subfolderLabel?: string;
  eventId?: string;
  scheduledFor?: string;
  attachments?: Array<{
    dossierDocumentId?: string;
    documentId?: string;
    displayName: string;
    mimeType?: string;
  }>;
  /** Pre-selectionne un intervenant (skippe l'etape choix). */
  intervenantId?: string;
  /**
   * Contexte dossier : restreint les types de demande proposes.
   * - false (dossier en cours)  → seulement « Devis »
   * - true  (dossier signe)     → « Devis », « Compte rendu chantier », « Confirmation de commande »
   * - undefined (hors dossier)  → tous les types
   */
  dossierSigned?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-remplir le formulaire selon le contexte. */
  prefill?: SendToIntervenantPrefill;
  /** Callback apres envoi reussi (pour fermer modal parent, refresh, etc.). */
  onSent?: (demandeId: string) => void;
}

// Pastille colorée selon le type de fichier (plus lisible / ludique).
function fileBadge(name?: string, mime?: string | null): { bg: string; fg: string; image: boolean } {
  const n = (name || '').toLowerCase();
  const m = (mime || '').toLowerCase();
  if (m.includes('pdf') || n.endsWith('.pdf')) return { bg: '#fbecec', fg: '#b91c1c', image: false };
  if (m.startsWith('image/') || /\.(jpe?g|png|gif|webp|heic|bmp|tiff?)$/.test(n)) return { bg: '#e8efe6', fg: '#3b6d4a', image: true };
  if (/\.(docx?|odt|rtf)$/.test(n) || m.includes('word') || m.includes('officedocument.wordprocessing')) return { bg: '#e6f1fb', fg: '#2563eb', image: false };
  if (/\.(xlsx?|csv|ods)$/.test(n) || m.includes('sheet') || m.includes('excel')) return { bg: '#eaf3de', fg: '#3b6d11', image: false };
  return { bg: '#f1efe8', fg: '#7c6c58', image: false };
}

const TYPE_OPTIONS: DemandeType[] = [
  'POSE', 'LIVRAISON', 'SAV', 'MESURE', 'DEVIS',
  'CONFIRMATION_COMMANDE', 'COMPLEMENT', 'AUTRE',
];

export function SendToIntervenantDrawer({ open, onClose, prefill, onSent }: Props) {
  const [step, setStep] = useState<'choose' | 'compose' | 'sent'>('choose');
  const [intervenants, setIntervenants] = useState<IntervenantOption[] | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(prefill?.intervenantId ?? null);
  // F6 : Broadcast a plusieurs intervenants
  const [broadcastMode, setBroadcastMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sentCount, setSentCount] = useState(0);

  const [type, setType] = useState<DemandeType>(
    prefill?.type ?? (prefill?.dossierSigned !== undefined ? 'DEVIS' : 'POSE'),
  );

  // Types de demande proposes selon le contexte du dossier.
  const typeOptions: Array<{ type: DemandeType; label: string; titlePrefix?: string }> =
    prefill?.dossierSigned === false
      ? [{ type: 'DEVIS', label: DEMANDE_TYPE_LABELS.DEVIS }]
      : prefill?.dossierSigned === true
      ? [
          { type: 'DEVIS', label: DEMANDE_TYPE_LABELS.DEVIS },
          { type: 'AUTRE', label: 'Compte rendu chantier', titlePrefix: 'Compte rendu chantier — ' },
          { type: 'CONFIRMATION_COMMANDE', label: DEMANDE_TYPE_LABELS.CONFIRMATION_COMMANDE },
          { type: 'COMPLEMENT', label: 'Envoi document', titlePrefix: 'Envoi document — ' },
        ]
      : TYPE_OPTIONS.map((t) => ({ type: t, label: DEMANDE_TYPE_LABELS[t] }));
  const [title, setTitle] = useState(prefill?.title ?? '');
  const [notes, setNotes] = useState(prefill?.notes ?? '');
  const [scheduledFor, setScheduledFor] = useState(prefill?.scheduledFor ?? '');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentDemandeId, setSentDemandeId] = useState<string | null>(null);

  // Invitation inline si l'intervenant n'a pas encore de compte
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [invitations, setInvitations] = useState<Record<string, IntervenantInvitation>>({});

  // Phase B-fix : Upload de fichiers ad-hoc (uniquement si projectId fourni)
  const [uploads, setUploads] = useState<Array<{
    dossierDocumentId?: string; documentId?: string;
    displayName: string; mimeType?: string;
    uploading?: boolean; error?: string;
  }>>(prefill?.attachments ?? []);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  // Sélecteur de pièces : dossiers repliés (par défaut tout est déplié).
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  // SECURITE F-009 : selecteur de pieces du dossier client a inclure dans la
  // demande. Avant : pas de selecteur, le pro pouvait sciemment ou par
  // distraction laisser le champ "pieces jointes" vide et envoyer les notes
  // seules — l'intervenant ne voyait rien des pieces du dossier (good) MAIS
  // il pouvait deviner que tout est accessible. Apres : on liste explicitement
  // les pieces du dossier groupees par sous-dossier, le pro coche celles a
  // partager. Aucun fichier n'est envoye automatiquement.
  type ProjectDoc = {
    id: string;
    subfolderLabel: string;
    originalName: string;
    mimeType: string | null;
    sizeBytes: number | null;
  };
  const [projectDocs, setProjectDocs] = useState<ProjectDoc[] | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  // Set des dossierDocumentId deja inclus dans uploads (pour cocher les checkboxes)
  const includedDocIds = new Set(uploads.map((u) => u.dossierDocumentId).filter(Boolean) as string[]);

  // Restriction a UN sous-dossier (bouton avion). Absent → tout le dossier.
  const restrictSubfolder = prefill?.subfolderLabel?.trim() || null;
  // Pieces effectivement proposees : si restreint, uniquement le sous-dossier
  // cible + ses descendants ; sinon tout le dossier (selection multiple libre).
  const visibleDocs = useMemo<ProjectDoc[] | null>(() => {
    if (!projectDocs) return null;
    // Exclut partout les boîtes système « Reçu de l'intervenant » et
    // « Dossier - Documents Intervenants » (jamais proposées au partage).
    const base = projectDocs.filter((d) => {
      const low = (d.subfolderLabel || '').trim().toLowerCase();
      return low !== "reçu de l'intervenant" && !low.includes('documents intervenants');
    });
    if (!restrictSubfolder) return base;
    return base.filter((d) => {
      const label = d.subfolderLabel || 'Autres';
      return label === restrictSubfolder || isDescendant(label, restrictSubfolder);
    });
  }, [projectDocs, restrictSubfolder]);

  // Mode restreint : on pre-coche les documents du sous-dossier cible (une fois,
  // au chargement). L'utilisateur reste libre de decocher ensuite.
  useEffect(() => {
    if (!open || !restrictSubfolder || !visibleDocs || visibleDocs.length === 0) return;
    setUploads((u) => {
      const have = new Set(u.map((x) => x.dossierDocumentId).filter(Boolean) as string[]);
      const toAdd = visibleDocs.filter((d) => !have.has(d.id));
      if (toAdd.length === 0) return u;
      return [
        ...u,
        ...toAdd.map((d) => ({ dossierDocumentId: d.id, displayName: d.originalName, mimeType: d.mimeType ?? undefined })),
      ];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, restrictSubfolder, visibleDocs]);

  const createInvitationStore = useDemandesStore((s) => s.createInvitation);

  // Charge la liste des intervenants du workspace
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingList(true);
    setError(null);

    // L'endpoint /intervenants peut renvoyer soit un array soit { data, total, page, pageSize }.
    // On normalise dans tous les cas pour eviter un crash useMemo en aval.
    const toArray = <T,>(x: any): T[] => Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [];

    Promise.all([
      api<any>('/intervenants').catch(() => [] as any),
      api<any>('/demandes/invitations/all').catch(() => [] as any),
    ])
      .then(([rawList, rawInvs]) => {
        if (cancelled) return;
        const list = toArray<IntervenantOption>(rawList);
        const invs = toArray<IntervenantInvitation>(rawInvs);
        setIntervenants(list);
        // Map invitations PENDING par intervenantId
        const m: Record<string, IntervenantInvitation> = {};
        for (const i of invs) if (i.status === 'PENDING') m[i.intervenantId] = i;
        setInvitations(m);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? 'Erreur chargement intervenants');
      })
      .finally(() => { if (!cancelled) setLoadingList(false); });

    return () => { cancelled = true; };
  }, [open]);

  // Charge les pieces du dossier client (pour permettre au pro de selectionner
  // les pieces a partager — pas d'envoi automatique du dossier complet).
  useEffect(() => {
    if (!open || !prefill?.projectId) {
      setProjectDocs(null);
      return;
    }
    let cancelled = false;
    setLoadingDocs(true);
    api<any>(`/dossiers/${encodeURIComponent(prefill.projectId)}/documents`)
      .then((rawDocs) => {
        if (cancelled) return;
        const arr: ProjectDoc[] = Array.isArray(rawDocs) ? rawDocs : [];
        setProjectDocs(arr);
      })
      .catch(() => {
        if (!cancelled) setProjectDocs([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDocs(false);
      });
    return () => { cancelled = true; };
  }, [open, prefill?.projectId]);

  // Reset au close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('choose');
        setSelectedId(prefill?.intervenantId ?? null);
        setType(prefill?.type ?? 'POSE');
        setTitle(prefill?.title ?? '');
        setNotes(prefill?.notes ?? '');
        setScheduledFor(prefill?.scheduledFor ?? '');
        setSentDemandeId(null);
        setError(null);
        setShowInviteForm(false);
        setInviteEmail('');
        setInviteMessage('');
      }, 250);
    }
  }, [open, prefill]);

  // Si prefill.intervenantId : on saute directement à compose
  useEffect(() => {
    if (open && prefill?.intervenantId && Array.isArray(intervenants)) {
      const i = intervenants.find((x) => x.id === prefill.intervenantId);
      if (i) { setSelectedId(i.id); setStep('compose'); }
    }
  }, [open, prefill, intervenants]);

  // Empêche scroll body
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [open]);

  const filtered = useMemo(() => {
    if (!Array.isArray(intervenants)) return [];
    const q = search.trim().toLowerCase();
    if (!q) return intervenants;
    return intervenants.filter((i) =>
      (i.companyName ?? '').toLowerCase().includes(q) ||
      (i.firstName ?? '').toLowerCase().includes(q) ||
      (i.lastName ?? '').toLowerCase().includes(q) ||
      (i.email ?? '').toLowerCase().includes(q) ||
      (i.type ?? '').toLowerCase().includes(q)
    );
  }, [intervenants, search]);

  const selectedIntervenant = useMemo(
    () => Array.isArray(intervenants) ? intervenants.find((i) => i.id === selectedId) ?? null : null,
    [intervenants, selectedId],
  );

  const handleSelect = (i: IntervenantOption) => {
    setSelectedId(i.id);
    if (!title) {
      // Suggérer un titre par défaut basé sur le type
      setTitle(DEMANDE_TYPE_LABELS[type]);
    }
    setStep('compose');
  };

  const handleSend = async () => {
    // En mode broadcast : envoyer a tous les selectedIds
    // Sinon : envoyer au selectedId unique
    const targets = broadcastMode ? selectedIds : (selectedId ? [selectedId] : []);
    if (targets.length === 0 || !title.trim()) {
      setError('Destinataire et titre requis');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const cleanAttachments = uploads
        .filter((a) => !a.uploading && !a.error && (a.dossierDocumentId || a.documentId))
        .map((a) => ({
          dossierDocumentId: a.dossierDocumentId,
          documentId: a.documentId,
          displayName: a.displayName,
          mimeType: a.mimeType,
        }));

      const results = await Promise.allSettled(
        targets.map((tid) => apiCreateDemande({
          intervenantId: tid,
          type,
          title: title.trim(),
          notes: notes.trim() || undefined,
          projectId: prefill?.projectId,
          eventId: prefill?.eventId,
          scheduledFor: scheduledFor || undefined,
          attachments: cleanAttachments.length > 0 ? cleanAttachments : undefined,
        }))
      );
      const successful = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');
      setSentCount(successful.length);

      if (successful.length === 0) {
        setError(`Echec d'envoi pour tous les destinataires (${failed.length}).`);
      } else {
        const firstId = (successful[0] as PromiseFulfilledResult<any>).value?.id;
        if (firstId) {
          setSentDemandeId(firstId);
          onSent?.(firstId);
        }
        setStep('sent');
        if (failed.length > 0) {
          setError(`${successful.length} envoyes, ${failed.length} en echec.`);
        }
      }
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInvite = async () => {
    if (!selectedId) return;
    const inv = await createInvitationStore({
      intervenantId: selectedId,
      email: inviteEmail.trim() || undefined,
      message: inviteMessage.trim() || undefined,
      expiresInDays: 14,
    });
    if (inv) {
      setInvitations((prev) => ({ ...prev, [inv.intervenantId]: inv }));
      setShowInviteForm(false);
      setInviteEmail('');
      setInviteMessage('');
    } else {
      setError('Impossible de créer l\'invitation');
    }
  };

  if (!open) return null;

  const intervenantHasAccount = !!selectedIntervenant?.userId;
  const intervenantHasPendingInvite = !!selectedIntervenant && !!invitations[selectedIntervenant.id];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15, 23, 18, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 80,
        display: 'flex', justifyContent: 'flex-end',
        animation: 'sti-overlay-in 0.18s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          height: '100%',
          background: '#fff',
          boxShadow: '-12px 0 40px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'sti-drawer-in 0.22s ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid #ece7df',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', fontWeight: 700, color: '#7c6c58', textTransform: 'uppercase' }}>
              Envoyer une demande
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1a2a1e', marginTop: 2 }}>
              {step === 'choose' && 'Choisir un intervenant'}
              {step === 'compose' && (selectedIntervenant?.companyName || `${selectedIntervenant?.firstName ?? ''} ${selectedIntervenant?.lastName ?? ''}`.trim() || 'Composer')}
              {step === 'sent' && 'Envoyée ✓'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: 8, borderRadius: 8,
              color: '#7c6c58',
            }}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
          {/* ── STEP CHOOSE ────────────────────────────────────────── */}
          {step === 'choose' && (
            <>
              {/* Toggle multi-select pour broadcast */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 12, padding: '8px 12px',
                background: broadcastMode ? '#f0fdf4' : 'transparent',
                border: `1px solid ${broadcastMode ? '#bbf7d0' : '#ece7df'}`,
                borderRadius: 10,
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={broadcastMode}
                    onChange={(e) => {
                      setBroadcastMode(e.target.checked);
                      if (!e.target.checked) setSelectedIds([]);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1a2a1e' }}>
                    Envoyer a plusieurs intervenants
                  </span>
                </label>
                {broadcastMode && selectedIds.length > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    background: '#15803d', color: '#fff',
                    padding: '3px 9px', borderRadius: 999,
                  }}>
                    {selectedIds.length} selectionne{selectedIds.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div style={{ position: 'relative', marginBottom: 14 }}>
                <Search size={16} style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: '#7c6c58',
                }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher par nom, type, email…"
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    border: '1px solid #ddd5c7',
                    borderRadius: 10,
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              {loadingList && !intervenants ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} style={{ height: 60, background: '#f5eee8', borderRadius: 10 }} />
                  ))}
                </div>
              ) : !intervenants || filtered.length === 0 ? (
                <EmptyIntervenants />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filtered.map((i) => (
                    <IntervenantCard
                      key={i.id}
                      intervenant={i}
                      hasInvitation={!!invitations[i.id]}
                      multiSelect={broadcastMode}
                      isSelected={broadcastMode && selectedIds.includes(i.id)}
                      onClick={() => {
                        if (broadcastMode) {
                          setSelectedIds(prev =>
                            prev.includes(i.id) ? prev.filter(x => x !== i.id) : [...prev, i.id]
                          );
                        } else {
                          handleSelect(i);
                        }
                      }}
                    />
                  ))}
                </div>
              )}

              {broadcastMode && selectedIds.length > 0 && (
                <button
                  onClick={() => {
                    if (!title) setTitle(DEMANDE_TYPE_LABELS[type]);
                    setStep('compose');
                  }}
                  style={{
                    marginTop: 14, width: '100%',
                    padding: '12px 18px',
                    background: '#1a2a1e', color: '#cbb98a',
                    border: 'none', borderRadius: 10,
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  Composer pour {selectedIds.length} intervenant{selectedIds.length > 1 ? 's' : ''} →
                </button>
              )}
            </>
          )}

          {/* ── STEP COMPOSE ───────────────────────────────────────── */}
          {step === 'compose' && (selectedIntervenant || (broadcastMode && selectedIds.length > 0)) && (
            <>


              {intervenantHasPendingInvite && (
                <div style={{
                  padding: '10px 14px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 10,
                  marginBottom: 14,
                  fontSize: 12,
                  color: '#1e3a8a',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Mail size={14} />
                  Invitation en attente — l'intervenant doit l'accepter pour voir la demande.
                </div>
              )}

              {/* Type */}
              <Label>Type de demande</Label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: 6,
                marginBottom: 14,
              }}>
                {typeOptions.map((opt) => {
                  const active = type === opt.type;
                  return (
                  <button
                    key={opt.label}
                    onClick={() => { setType(opt.type); if (opt.titlePrefix) setTitle(opt.titlePrefix); }}
                    style={{
                      padding: '8px 10px',
                      border: active ? '2px solid #1a2a1e' : '1px solid #ddd5c7',
                      borderRadius: 10,
                      background: active ? '#1a2a1e' : '#fff',
                      color: active ? '#cbb98a' : '#1a2a1e',
                      fontSize: 12, fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                    }}
                  >
                    {opt.label}
                  </button>
                  );
                })}
              </div>

              {/* Title */}
              <Label>Titre</Label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Pose cuisine M. Dupont"
                maxLength={200}
                style={inputStyle()}
              />

              {/* Notes */}
              <Label style={{ marginTop: 14, marginBottom: 6 }}>Notes / instructions</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Détails, adresse, contraintes…"
                style={{ ...inputStyle(), resize: 'vertical' }}
              />

              {/* Scheduled — pour un DEVIS, c'est la date de réception attendue du
                  devis : si dépassée sans devis reçu → alerte "devis en retard". */}
              <Label style={{ marginTop: 14 }}>
                {type === 'DEVIS' ? 'Date de réception du devis' : 'Date / heure (optionnelle)'}
              </Label>
              <input
                // DEVIS : date seule (la réception se juge au jour près — pas d'heure
                // trompeuse). Autres types : date + heure de planification.
                type={type === 'DEVIS' ? 'date' : 'datetime-local'}
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                style={inputStyle()}
              />
              {type === 'DEVIS' && (
                <p style={{ margin: '4px 2px 0', fontSize: 11, color: 'rgba(48,64,53,0.5)' }}>
                  Si le devis n'est pas reçu le lendemain de cette date, une alerte apparaîtra (assistant + dossier).
                </p>
              )}

              {/* SECURITE : Selecteur des pieces du dossier client a partager.
                  Le pro choisit explicitement quels fichiers transmettre —
                  jamais le dossier entier (qui contiendrait des infos
                  confidentielles type prix de vente). */}
              {prefill?.projectId && visibleDocs && visibleDocs.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <Label style={{ marginBottom: 0 }}>
                      {restrictSubfolder ? 'Pièces du sous-dossier' : 'Pièces à partager'}
                    </Label>
                    <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '3px 10px', background: includedDocIds.size > 0 ? '#e8f3ec' : '#f1efe8', color: includedDocIds.size > 0 ? '#1f7a46' : '#7c6c58', whiteSpace: 'nowrap' }}>
                      {includedDocIds.size} sélectionnée{includedDocIds.size > 1 ? 's' : ''}
                    </span>
                  </div>
                  {restrictSubfolder && (
                    <p style={{ margin: '0 2px 8px', fontSize: 11, color: '#7c6c58' }}>
                      Limité au sous-dossier <strong style={{ color: '#3D5449' }}>{folderDisplayName(restrictSubfolder)}</strong>. Pour envoyer plusieurs sous-dossiers, utilisez « Nouvelle » depuis le dossier.
                    </p>
                  )}
                  <div
                    role="group"
                    aria-label="Selecteur de pieces du dossier"
                    style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}
                  >
                    {Object.entries(visibleDocs.reduce<Record<string, ProjectDoc[]>>((acc, d) => {
                      const k = d.subfolderLabel || 'Autres';
                      if (!acc[k]) acc[k] = [];
                      acc[k].push(d);
                      return acc;
                    }, {}))
                      .sort((a, b) => {
                        const da = depthOf(a[0]), db = depthOf(b[0]);
                        return da !== db ? da - db : a[0].localeCompare(b[0], 'fr', { sensitivity: 'base' });
                      })
                      .map(([subfolder, docs]) => {
                        const allChecked = docs.every((d) => includedDocIds.has(d.id));
                        const recursiveDocs = subfolder === 'Autres'
                          ? docs
                          : visibleDocs.filter((d) => (d.subfolderLabel || 'Autres') === subfolder || isDescendant(d.subfolderLabel || '', subfolder));
                        const hasNested = recursiveDocs.length > docs.length;
                        const nested = depthOf(subfolder) > 1;
                        const indent = nested ? (depthOf(subfolder) - 1) * 12 : 0;
                        const collapsed = collapsedFolders.has(subfolder);
                        const selectRecursive = () => setUploads((u) => {
                          const have = new Set(u.map((x) => x.dossierDocumentId));
                          const toAdd = recursiveDocs.filter((d) => !have.has(d.id));
                          return [...u, ...toAdd.map((d) => ({ dossierDocumentId: d.id, displayName: d.originalName, mimeType: d.mimeType ?? undefined }))];
                        });
                        const toggleFolderAll = () => setUploads((u) => {
                          if (allChecked) {
                            const ids = new Set(docs.map((d) => d.id));
                            return u.filter((x) => !x.dossierDocumentId || !ids.has(x.dossierDocumentId));
                          }
                          const toAdd = docs.filter((d) => !u.some((x) => x.dossierDocumentId === d.id));
                          return [...u, ...toAdd.map((d) => ({ dossierDocumentId: d.id, displayName: d.originalName, mimeType: d.mimeType ?? undefined }))];
                        });
                        return (
                          <div key={subfolder} style={{ marginLeft: indent, border: '1px solid #f0eae0', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                            {/* En-tête pliable du dossier */}
                            <div
                              onClick={() => setCollapsedFolders((prev) => { const n = new Set(prev); if (n.has(subfolder)) n.delete(subfolder); else n.add(subfolder); return n; })}
                              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 11px', background: '#faf6ef', cursor: 'pointer' }}
                            >
                              <ChevronDown size={15} style={{ color: '#9a8c7a', flexShrink: 0, transition: 'transform .2s', transform: collapsed ? 'rotate(-90deg)' : 'none' }} />
                              <Folder size={16} style={{ color: '#a67749', flexShrink: 0 }} />
                              <span title={subfolder} style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 700, color: '#3D5449', textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.3, wordBreak: 'break-word' }}>
                                {nested ? '↳ ' : ''}{subfolder === 'Autres' ? 'Autres' : folderDisplayName(subfolder)}
                              </span>
                              <span style={{ fontSize: 11, color: '#9a8c7a', flexShrink: 0 }}>{docs.length}</span>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleFolderAll(); }}
                                title={allChecked ? 'Tout retirer de ce dossier' : 'Tout sélectionner dans ce dossier'}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: `1px solid ${allChecked ? '#1f8f4e' : '#e7dcc8'}`, background: allChecked ? '#1f8f4e' : '#fff', color: allChecked ? '#fff' : '#7a5327', borderRadius: 999, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                              >
                                {allChecked ? <Check size={13} /> : <Folder size={13} />} Tout
                              </button>
                            </div>
                            {!collapsed && (
                              <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {hasNested && (
                                  <button
                                    type="button"
                                    onClick={selectRecursive}
                                    title="Joindre ce dossier ET ses sous-dossiers"
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 10.5, fontWeight: 700, color: '#a67749', background: '#fff8ef', border: '1px solid #e7dcc8', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                  >
                                    <Folder size={12} /> Tout le dossier + sous-dossiers ({recursiveDocs.length})
                                  </button>
                                )}
                                {docs.map((d) => {
                                  const on = includedDocIds.has(d.id);
                                  const badge = fileBadge(d.originalName, d.mimeType);
                                  const toggleDoc = () => setUploads((u) => (
                                    u.some((x) => x.dossierDocumentId === d.id)
                                      ? u.filter((x) => x.dossierDocumentId !== d.id)
                                      : [...u, { dossierDocumentId: d.id, displayName: d.originalName, mimeType: d.mimeType ?? undefined }]
                                  ));
                                  return (
                                    <div
                                      key={d.id}
                                      role="button"
                                      aria-pressed={on}
                                      onClick={toggleDoc}
                                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 9px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${on ? '#bfe0cb' : 'transparent'}`, background: on ? '#eef6f0' : 'transparent', transition: 'background .12s, border-color .12s' }}
                                    >
                                      <span style={{ width: 28, height: 28, borderRadius: 8, background: badge.bg, color: badge.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {badge.image ? <ImageIcon size={15} /> : <FileText size={15} />}
                                      </span>
                                      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1a2a1e' }}>
                                        {d.originalName}
                                      </span>
                                      <span style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${on ? '#1f8f4e' : '#cfc8ba'}`, background: on ? '#1f8f4e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .12s' }}>
                                        {on && <Check size={12} style={{ color: '#fff' }} />}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
              {prefill?.projectId && loadingDocs && (
                <div style={{ marginTop: 14, fontSize: 12, color: '#7c6c58', fontStyle: 'italic' }}>
                  Chargement des pieces du dossier…
                </div>
              )}
              {prefill?.projectId && projectDocs && projectDocs.length === 0 && !loadingDocs && (
                <div style={{ marginTop: 14, fontSize: 12, color: '#7c6c58', fontStyle: 'italic' }}>
                  Ce dossier ne contient encore aucune piece. Vous pouvez ajouter des fichiers ci-dessous.
                </div>
              )}

              {/* Attachments — upload + liste */}
              <div style={{ marginTop: 14 }}>
                <Label>Pièces jointes sélectionnées {uploads.length > 0 && `(${uploads.length})`}</Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {uploads.map((a, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 12px',
                        background: a.error ? '#fff5f5' : a.uploading ? '#eff6ff' : '#fafaf8',
                        border: `1px solid ${a.error ? '#fecaca' : a.uploading ? '#bfdbfe' : '#ece7df'}`,
                        borderRadius: 8,
                        fontSize: 12,
                        display: 'flex', alignItems: 'center', gap: 8,
                        color: a.error ? '#991b1b' : '#1a2a1e',
                      }}
                    >
                      <FileText size={14} style={{ color: a.error ? '#b91c1c' : '#3D5449' }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.displayName}
                        {a.uploading && <span style={{ color: '#1d4ed8', marginLeft: 6 }}>· upload…</span>}
                        {a.error && <span style={{ color: '#b91c1c', marginLeft: 6 }}>· {a.error}</span>}
                      </span>
                      {!a.uploading && (
                        <button
                          onClick={() => setUploads(u => u.filter((_, i) => i !== idx))}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#7c6c58', padding: 2 }}
                          aria-label="Retirer"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Bouton upload — uniquement si projectId fourni (les attachments
                    sont stockes via DossierDocument qui necessite un projet). */}
                {prefill?.projectId ? (
                  <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 12px', marginTop: 8,
                    background: 'transparent', border: '1px dashed #ddd5c7',
                    borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#3D5449',
                    cursor: uploadingFiles ? 'wait' : 'pointer',
                  }}>
                    <Paperclip size={13} />
                    {uploadingFiles ? 'Upload en cours…' : 'Ajouter des fichiers'}
                    <input
                      type="file"
                      multiple
                      style={{ display: 'none' }}
                      disabled={uploadingFiles}
                      onChange={async (e) => {
                        const files = Array.from(e.target.files ?? []);
                        e.target.value = '';
                        if (files.length === 0 || !prefill.projectId) return;
                        setUploadingFiles(true);
                        for (const f of files) {
                          // Push placeholder loading
                          setUploads(u => [...u, { displayName: f.name, mimeType: f.type, uploading: true }]);
                          try {
                            const fd = new FormData();
                            fd.append('file', f);
                            fd.append('subfolderLabel', 'Dossier - Documents Intervenants');
                            const doc = await apiUpload<any>(`/dossiers/${encodeURIComponent(prefill.projectId)}/documents`, fd);
                            setUploads(u => u.map((x) =>
                              x.displayName === f.name && x.uploading
                                ? { displayName: f.name, mimeType: f.type, dossierDocumentId: doc.id }
                                : x
                            ));
                          } catch (err: any) {
                            setUploads(u => u.map((x) =>
                              x.displayName === f.name && x.uploading
                                ? { displayName: f.name, mimeType: f.type, error: err?.message ?? 'echec upload', uploading: false }
                                : x
                            ));
                          }
                        }
                        setUploadingFiles(false);
                      }}
                    />
                  </label>
                ) : (
                  <p style={{ fontSize: 11, color: '#7c6c58', marginTop: 8, fontStyle: 'italic' }}>
                    Pour ajouter des fichiers, ouvrez ce drawer depuis un dossier client (les pièces jointes sont stockées avec ce dossier).
                  </p>
                )}
              </div>


              {error && (
                <div style={{
                  marginTop: 12,
                  padding: '10px 14px',
                  background: '#fff5f5',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  color: '#991b1b',
                  fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <AlertCircle size={15} /> {error}
                </div>
              )}
            </>
          )}

          {/* ── STEP SENT ──────────────────────────────────────────── */}
          {step === 'sent' && (
            <div style={{
              textAlign: 'center', padding: 32,
            }}>
              <CheckCircle2 size={56} style={{ color: '#15803d', margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
                {sentCount > 1 ? `${sentCount} demandes envoyees` : 'Demande envoyée'}
              </h2>
              <p style={{ fontSize: 14, color: '#5b5045', lineHeight: 1.5 }}>
                {sentCount > 1
                  ? `${sentCount} intervenant${sentCount > 1 ? 's ont' : ' a'} été notifié${sentCount > 1 ? 's' : ''}·e.`
                  : `${selectedIntervenant?.companyName ?? selectedIntervenant?.firstName ?? "L'intervenant"} a été notifié·e.`}
                {sentCount === 1 && !intervenantHasAccount && intervenantHasPendingInvite && (
                  <><br />Il pourra consulter la demande après acceptation de l'invitation.</>
                )}
              </p>
              <div style={{ marginTop: 22, display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button onClick={onClose} style={btnStyle('secondary')}>
                  Fermer
                </button>
                {sentDemandeId && (
                  <button
                    onClick={() => {
                      window.location.href = `/intervenants?demande=${sentDemandeId}`;
                    }}
                    style={btnStyle('primary')}
                  >
                    Voir la demande
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer (only on compose step) */}
        {step === 'compose' && (
          <div style={{
            padding: '14px 22px',
            borderTop: '1px solid #ece7df',
            background: '#fafaf8',
            display: 'flex', gap: 10, justifyContent: 'flex-end',
          }}>
            <button onClick={() => setStep('choose')} style={btnStyle('secondary')}>
              ← Changer
            </button>
            <button
              onClick={handleSend}
              disabled={submitting || !title.trim()}
              style={{
                ...btnStyle('primary'),
                opacity: submitting || !title.trim() ? 0.6 : 1,
                cursor: submitting || !title.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              <Send size={14} />
              {submitting ? 'Envoi…' : 'Envoyer la demande'}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes sti-overlay-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sti-drawer-in { from { transform: translateX(100%) } to { transform: translateX(0) } }
      `}</style>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function IntervenantCard({
  intervenant: i, hasInvitation, onClick, multiSelect, isSelected,
}: {
  intervenant: IntervenantOption;
  hasInvitation: boolean;
  onClick: () => void;
  multiSelect?: boolean;
  isSelected?: boolean;
}) {
  const fullName =
    i.companyName ??
    [i.firstName, i.lastName].filter(Boolean).join(' ') ??
    '—';
  const hasAccount = !!i.userId;

  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: '12px 14px',
        background: isSelected ? '#f0fdf4' : '#fff',
        border: `1px solid ${isSelected ? '#15803d' : '#ece7df'}`,
        borderRadius: 12,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12,
        transition: 'all 0.15s',
      }}
    >
      {multiSelect && (
        <input
          type="checkbox"
          checked={!!isSelected}
          onChange={() => {/* parent gere via onClick */}}
          onClick={(e) => e.stopPropagation()}
          style={{ flexShrink: 0, cursor: 'pointer' }}
        />
      )}
      <div style={{
        width: 38, height: 38, borderRadius: '50%',
        background: 'linear-gradient(135deg, #cbb98a 0%, #a08654 100%)',
        color: '#1a2a1e',
        fontWeight: 800, fontSize: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {(fullName[0] ?? '?').toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: '#1a2a1e',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {fullName}
        </div>
        <div style={{
          fontSize: 11, color: '#7c6c58', marginTop: 2,
          display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
        }}>
          <span>{i.type}</span>
          {i.email && <span>· {i.email}</span>}
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>
        {hasAccount ? (
          <span style={pillStyle('#f0fdf4', '#15803d', '#bbf7d0')}>● Compte actif</span>
        ) : hasInvitation ? (
          <span style={pillStyle('#eff6ff', '#1e3a8a', '#bfdbfe')}>Invité</span>
        ) : (
          <span style={pillStyle('#fff7ed', '#7c2d12', '#fed7aa')}>Pas de compte</span>
        )}
      </div>
    </button>
  );
}

function EmptyIntervenants() {
  return (
    <div style={{
      padding: 28, textAlign: 'center',
      background: '#fafaf8', borderRadius: 12,
      border: '1px dashed #ddd5c7',
      color: '#7c6c58',
    }}>
      <UserPlus size={28} style={{ color: '#cbb98a', marginBottom: 10 }} />
      <div style={{ fontWeight: 700, color: '#1a2a1e', marginBottom: 4 }}>
        Aucun intervenant trouvé
      </div>
      <div style={{ fontSize: 13 }}>
        Ajoutez un intervenant à votre annuaire pour pouvoir lui envoyer des demandes.
      </div>
    </div>
  );
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: '#7c6c58',
      textTransform: 'uppercase', letterSpacing: '0.06em',
      marginBottom: 6,
      ...style,
    }}>
      {children}
    </div>
  );
}

function pillStyle(bg: string, fg: string, border: string): React.CSSProperties {
  return {
    fontSize: 10, fontWeight: 700,
    padding: '3px 8px',
    background: bg, color: fg,
    border: `1px solid ${border}`,
    borderRadius: 999,
    whiteSpace: 'nowrap',
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd5c7',
    borderRadius: 10,
    fontSize: 14, fontFamily: 'inherit',
    outline: 'none',
    background: '#fff',
  };
}

function btnStyle(variant: 'primary' | 'secondary'): React.CSSProperties {
  return variant === 'primary'
    ? {
        padding: '10px 16px',
        background: '#1a2a1e', color: '#cbb98a',
        border: 'none', borderRadius: 10,
        fontSize: 13, fontWeight: 700,
        cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }
    : {
        padding: '10px 16px',
        background: 'transparent', color: '#5b5045',
        border: '1px solid #ddd5c7', borderRadius: 10,
        fontSize: 13, fontWeight: 600,
        cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 6,
      };
}

// ─── Templates picker ─────────────────────────────────────────────────────

function TemplatesPicker({
  onApply, onSave, currentValid,
}: {
  onApply: (t: { type: any; title: string; notes?: string }) => void;
  onSave: () => { name: string; type: any; title: string; notes?: string };
  currentValid: boolean;
}) {
  const templates = useDemandeTemplatesStore((s) => s.templates);
  const addTemplate = useDemandeTemplatesStore((s) => s.addTemplate);
  const removeTemplate = useDemandeTemplatesStore((s) => s.removeTemplate);
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginBottom: 14, padding: 10, background: "#fafaf8", border: "1px solid #ece7df", borderRadius: 10 }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 6,
          background: "transparent", border: "none", cursor: "pointer",
          fontSize: 12, fontWeight: 700, color: "#3D5449",
          padding: 0,
        }}
      >
        <Bookmark size={13} />
        Templates ({templates.length})
        <ChevronDown size={13} style={{ marginLeft: "auto", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>

      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {templates.map((t) => (
            <div key={t.id} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 10px",
              background: "#fff", borderRadius: 6,
              border: "1px solid #ece7df",
            }}>
              <button
                type="button"
                onClick={() => onApply({ type: t.type, title: t.title, notes: t.notes })}
                style={{
                  flex: 1, textAlign: "left",
                  background: "transparent", border: "none", cursor: "pointer",
                  fontSize: 12, color: "#1a2a1e",
                }}
              >
                <div style={{ fontWeight: 700 }}>{t.name}</div>
                <div style={{ fontSize: 10, color: "#7c6c58", marginTop: 1 }}>
                  {t.type}{t.builtin ? " · par defaut" : ""}
                </div>
              </button>
              {!t.builtin && (
                <button
                  type="button"
                  onClick={() => removeTemplate(t.id)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "#7c6c58", padding: 2 }}
                  title="Supprimer ce template"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}

          {currentValid && (
            <button
              type="button"
              onClick={() => {
                const data = onSave();
                addTemplate({ name: data.name.slice(0, 60), type: data.type, title: data.title, notes: data.notes });
              }}
              style={{
                marginTop: 4, padding: "6px 10px",
                background: "#1a2a1e", color: "#cbb98a",
                border: "none", borderRadius: 6,
                fontSize: 11, fontWeight: 700, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 4, alignSelf: "flex-start",
              }}
            >
              + Sauvegarder le brouillon comme template
            </button>
          )}
        </div>
      )}
    </div>
  );
}

