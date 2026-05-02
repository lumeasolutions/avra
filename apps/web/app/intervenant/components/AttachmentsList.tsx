'use client';

import { FileText, Download, FileImage, FileArchive, File as FileIcon } from 'lucide-react';
import { DemandeAttachment } from '@/lib/demandes-api';
import { api } from '@/lib/api';

function iconFor(mime: string | null) {
  if (!mime) return <FileIcon size={16} />;
  if (mime.startsWith('image/')) return <FileImage size={16} />;
  if (mime.includes('pdf')) return <FileText size={16} />;
  if (mime.includes('zip') || mime.includes('archive')) return <FileArchive size={16} />;
  return <FileIcon size={16} />;
}

interface Props {
  attachments: DemandeAttachment[];
  /**
   * Si fourni, télécharge depuis cette source (DossierDocument ou Document).
   * Sinon, simple affichage informatif.
   */
  onDownload?: (att: DemandeAttachment) => void | Promise<void>;
}

export function AttachmentsList({ attachments, onDownload }: Props) {
  if (attachments.length === 0) {
    return (
      <div style={{
        padding: 16, textAlign: 'center',
        color: '#7c6c58', fontSize: 13,
        background: '#fafaf8',
        borderRadius: 12,
        border: '1px dashed #ddd5c7',
      }}>
        Aucune pièce jointe.
      </div>
    );
  }

  const handleDownload = async (att: DemandeAttachment) => {
    if (onDownload) return onDownload(att);
    // Endpoint backend qui :
    //  - 302 redirect vers Supabase signed URL (DossierDocument)
    //  - stream local FS (Document admin)
    // Le navigateur suit le redirect transparent.
    window.open(`/api/v1/intervenant-portal/attachments/${encodeURIComponent(att.id)}`, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {attachments.map((att) => (
        <button
          key={att.id}
          onClick={() => handleDownload(att)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px',
            background: '#fff',
            border: '1px solid #ece7df',
            borderRadius: 10,
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: 13,
            color: '#1a2a1e',
            transition: 'all 0.15s',
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#f5eee8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#3D5449',
            flexShrink: 0,
          }}>
            {iconFor(att.mimeType)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {att.displayName}
            </div>
            <div style={{ fontSize: 11, color: '#7c6c58' }}>
              {att.mimeType ?? 'fichier'}
              {' · '}
              {new Date(att.createdAt).toLocaleDateString('fr-FR')}
            </div>
          </div>
          <Download size={16} style={{ color: '#7c6c58', flexShrink: 0 }} />
        </button>
      ))}
    </div>
  );
}
