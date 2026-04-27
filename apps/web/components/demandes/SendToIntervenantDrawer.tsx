'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Send, Search, AlertCircle, Calendar, FileText, ChevronDown, Mail, UserPlus, CheckCircle2, Paperclip, Trash2, Bookmark } from 'lucide-react';
import { api, apiUpload } from '@/lib/api';
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
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-remplir le formulaire selon le contexte. */
  prefill?: SendToIntervenantPrefill;
  /** Callback apres envoi reussi (pour fermer modal parent, refresh, etc.). */
  onSent?: (demandeId: string) => void;
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

  const [type, setType] = useState<DemandeType>(prefill?.type ?? 'POSE');
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
    if (!selectedId || !title.trim()) {
      setError('Destinataire et titre requis');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Filtre uploads finis (pas en cours / pas en erreur) avant envoi
      const cleanAttachments = uploads
        .filter((a) => !a.uploading && !a.error && (a.dossierDocumentId || a.documentId))
        .map((a) => ({
          dossierDocumentId: a.dossierDocumentId,
          documentId: a.documentId,
          displayName: a.displayName,
          mimeType: a.mimeType,
        }));

      const created = await apiCreateDemande({
        intervenantId: selectedId,
        type,
        title: title.trim(),
        notes: notes.trim() || undefined,
        projectId: prefill?.projectId,
        eventId: prefill?.eventId,
        scheduledFor: scheduledFor || undefined,
        attachments: cleanAttachments.length > 0 ? cleanAttachments : undefined,
      });
      setSentDemandeId(created.id);
      setStep('sent');
      onSent?.(created.id);
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
                      onClick={() => handleSelect(i)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── STEP COMPOSE ───────────────────────────────────────── */}
          {step === 'compose' && selectedIntervenant && (
            <>
              {/* Statut compte intervenant */}
              {!intervenantHasAccount && !intervenantHasPendingInvite && (
                <div style={{
                  padding: '12px 14px',
                  background: '#fff7ed',
                  border: '1px solid #fed7aa',
                  borderRadius: 10,
                  marginBottom: 14,
                  fontSize: 12,
                  color: '#7c2d12',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>
                      Cet intervenant n'a pas encore de compte AVRA
                    </div>
                    <div>
                      Vous pouvez quand même envoyer la demande, mais il devra accepter
                      une invitation pour la consulter.
                    </div>
                    <button
                      onClick={() => setShowInviteForm(!showInviteForm)}
                      style={{
                        marginTop: 8,
                        background: '#1a2a1e', color: '#cbb98a',
                        border: 'none', borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: 12, fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <UserPlus size={13} /> Envoyer une invitation
                    </button>
                  </div>
                </div>
              )}

              {showInviteForm && (
                <div style={{
                  padding: 14,
                  background: '#fafaf8',
                  borderRadius: 12,
                  marginBottom: 14,
                  border: '1px solid #ece7df',
                }}>
                  <Label>Email d'invitation</Label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder={selectedIntervenant.email ?? 'exemple@email.com'}
                    style={inputStyle()}
                  />
                  <Label style={{ marginTop: 10 }}>Message personnalisé (optionnel)</Label>
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    rows={2}
                    style={{ ...inputStyle(), resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button onClick={handleInvite} style={btnStyle('primary')}>
                      <Mail size={13} /> Envoyer l'invitation
                    </button>
                    <button onClick={() => setShowInviteForm(false)} style={btnStyle('secondary')}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}

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

              {/* Templates rapides */}
              <TemplatesPicker
                onApply={(tpl) => {
                  setType(tpl.type);
                  setTitle(tpl.title);
                  if (tpl.notes) setNotes(tpl.notes);
                }}
                onSave={() => ({ name: title || 'Nouveau template', type, title, notes })}
                currentValid={!!title.trim()}
              />

              {/* Type */}
              <Label>Type de demande</Label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: 6,
                marginBottom: 14,
              }}>
                {TYPE_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    style={{
                      padding: '8px 10px',
                      border: type === t ? '2px solid #1a2a1e' : '1px solid #ddd5c7',
                      borderRadius: 10,
                      background: type === t ? '#1a2a1e' : '#fff',
                      color: type === t ? '#cbb98a' : '#1a2a1e',
                      fontSize: 12, fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                    }}
                  >
                    {DEMANDE_TYPE_LABELS[t]}
                  </button>
                ))}
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
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Label style={{ marginBottom: 0 }}>Notes / instructions</Label>
                <button
                  type="button"
                  onClick={() => {
                    // Demande au store assistant d'ouvrir avec un prompt
                    // structure pour rediger la demande.
                    if (typeof window !== 'undefined') {
                      const inter = selectedIntervenant?.companyName
                        ?? [selectedIntervenant?.firstName, selectedIntervenant?.lastName].filter(Boolean).join(' ')
                        ?? 'l\'intervenant';
                      const prompt = `Aide-moi a rediger une demande "${DEMANDE_TYPE_LABELS[type]}" pour ${inter}${selectedIntervenant?.type ? ` (${selectedIntervenant.type})` : ''}. Titre actuel : "${title || '(vide)'}". Notes actuelles : "${notes || '(vides)'}". Propose un titre clair et des instructions concises et professionnelles.`;
                      window.dispatchEvent(new CustomEvent('avra:assistant-seed', { detail: { prompt } }));
                    }
                  }}
                  style={{
                    background: 'transparent', border: '1px solid #ddd5c7',
                    borderRadius: 6, padding: '3px 10px',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    color: '#3D5449',
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}
                  title="Demander a l'assistant AVRA de rediger pour vous"
                >
                  ✨ Suggerer
                </button>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Détails, adresse, contraintes…"
                style={{ ...inputStyle(), resize: 'vertical' }}
              />

              {/* Scheduled */}
              <Label style={{ marginTop: 14 }}>Date / heure (optionnelle)</Label>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                style={inputStyle()}
              />

              {/* Attachments — upload + liste */}
              <div style={{ marginTop: 14 }}>
                <Label>Pièces jointes {uploads.length > 0 && `(${uploads.length})`}</Label>
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
                            fd.append('subfolderLabel', 'Demandes — pièces jointes');
                            const doc = await apiUpload<any>(`/projects/${encodeURIComponent(prefill.projectId)}/dossier-documents`, fd);
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
                Demande envoyée
              </h2>
              <p style={{ fontSize: 14, color: '#5b5045', lineHeight: 1.5 }}>
                {selectedIntervenant?.companyName ?? selectedIntervenant?.firstName ?? "L'intervenant"} a été notifié·e.
                {!intervenantHasAccount && intervenantHasPendingInvite && (
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
  intervenant: i, hasInvitation, onClick,
}: { intervenant: IntervenantOption; hasInvitation: boolean; onClick: () => void }) {
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
        background: '#fff',
        border: '1px solid #ece7df',
        borderRadius: 12,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12,
        transition: 'all 0.15s',
      }}
    >
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

