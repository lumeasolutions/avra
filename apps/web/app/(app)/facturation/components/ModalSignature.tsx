'use client';

import React, { useState } from 'react';
import { X, Check, Clock, CheckCircle2, Pen, Send, Paperclip, AlertCircle } from 'lucide-react';
import { useFacturationStore, type Devis } from '@/store';
import { api } from '@/lib/api';

interface ModalSignatureProps {
  devis: Devis;
  onClose: () => void;
}

export const ModalSignature = React.memo(function ModalSignature({ devis, onClose }: ModalSignatureProps) {
  const sendDevisForSignature = useFacturationStore(s => s.sendDevisForSignature);
  const markDevisSigned = useFacturationStore(s => s.markDevisSigned);
  const [email, setEmail] = useState(devis.clientEmail ?? '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState(devis.client ?? '');
  const [message, setMessage] = useState(`Bonjour,\n\nVeuillez trouver ci-joint votre devis ${devis.ref} d'un montant de ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(devis.totalTTC)} TTC.\n\nMerci de bien vouloir nous retourner votre accord pour validation.\n\nCordialement,\nL'équipe AVRA`);
  const [piecesJointes, setPiecesJointes] = useState<string[]>([]);
  const [newPiece, setNewPiece] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alreadySentForSign = devis.signatureStatus === 'EN_ATTENTE_SIGNATURE';

  const handleSend = async () => {
    if (!email.trim()) return;
    if (!firstName.trim() || !lastName.trim()) {
      setError('Veuillez saisir le prénom et le nom du client');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call the backend API with YouSign details
      await api('/signature', {
        method: 'POST',
        body: JSON.stringify({
          projectId: devis.dossierId || devis.id,
          documentTitle: devis.objet || `Devis ${devis.ref}`,
          signerEmail: email,
          signerFirstName: firstName,
          signerLastName: lastName,
          message,
        }),
      });

      // Also call the local state update
      sendDevisForSignature(devis.id, email, piecesJointes);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkSigned = () => {
    markDevisSigned(devis.id);
    onClose();
  };

  const addPiece = () => {
    if (newPiece.trim()) {
      setPiecesJointes(p => [...p, newPiece.trim()]);
      setNewPiece('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#304035]/8 bg-gradient-to-r from-[#304035]/5 to-violet-50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-violet-100 flex items-center justify-center">
              <Pen className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <h2 className="font-bold text-[#304035] text-base">Signature électronique</h2>
              <p className="text-xs text-[#304035]/50">{devis.ref} · {devis.client}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-[#304035]/10 transition-colors">
            <X className="h-4 w-4 text-[#304035]/60" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Statut si déjà envoyé */}
          {alreadySentForSign && !sent && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-3">
              <Clock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-700">En attente de signature</p>
                <p className="text-xs text-amber-600 mt-0.5">Envoyé à {devis.signatureEmail} — Vous pouvez renvoyer ou marquer comme signé.</p>
              </div>
            </div>
          )}

          {sent && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-700">Demande envoyée !</p>
                <p className="text-xs text-emerald-600 mt-0.5">Le client recevra un email pour signer. Vous serez notifié dès qu'il signera.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Résumé devis */}
          <div className="rounded-xl bg-[#304035]/3 border border-[#304035]/8 px-4 py-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-[#304035]/60">Montant TTC</p>
                <p className="text-xl font-bold text-[#304035]">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(devis.totalTTC)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-[#304035]/60">Valide jusqu'au</p>
                <p className="text-sm font-bold text-[#304035]">{devis.dateValidite}</p>
              </div>
            </div>
          </div>

          {/* Prénom et Nom du client */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">Prénom du client *</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Jean"
                className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm text-[#304035] focus:outline-none focus:border-violet-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">Nom du client *</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Dupont"
                className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm text-[#304035] focus:outline-none focus:border-violet-400"
              />
            </div>
          </div>

          {/* Email client */}
          <div>
            <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">Email du client *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="client@email.fr"
              className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm text-[#304035] focus:outline-none focus:border-violet-400"
            />
          </div>

          {/* Pièces jointes */}
          <div>
            <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">
              <Paperclip className="h-3 w-3 inline mr-1" />
              Pièces jointes (plans, perspectives…)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPiece}
                onChange={e => setNewPiece(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPiece()}
                placeholder="Ex : Plan_Salon_V2.pdf, Vue3D_cuisine.jpg…"
                className="flex-1 rounded-xl border border-[#304035]/12 px-3 py-2 text-sm text-[#304035] focus:outline-none focus:border-violet-400"
              />
              <button onClick={addPiece}
                className="px-3 py-2 rounded-xl bg-violet-100 hover:bg-violet-200 text-violet-700 text-xs font-bold transition-colors">
                + Ajouter
              </button>
            </div>
            {piecesJointes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {piecesJointes.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs bg-violet-50 border border-violet-200 rounded-lg px-2 py-1 text-violet-700">
                    <Paperclip className="h-3 w-3" /> {p}
                    <button onClick={() => setPiecesJointes(prev => prev.filter((_, j) => j !== i))} className="hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-semibold text-[#304035]/60 mb-1.5">Message d'accompagnement</label>
            <textarea
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full rounded-xl border border-[#304035]/12 px-3 py-2 text-sm text-[#304035] focus:outline-none focus:border-violet-400 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#304035]/8 bg-[#304035]/2 gap-3">
          <button
            onClick={handleMarkSigned}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            <Check className="h-4 w-4" /> Marquer comme signé
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-[#304035]/60 hover:bg-[#304035]/8 transition-colors">
              Fermer
            </button>
            <button
              onClick={handleSend}
              disabled={!email.trim() || !firstName.trim() || !lastName.trim() || loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-40"
            >
              <Send className="h-4 w-4" /> {loading ? 'Envoi...' : 'Envoyer pour signature'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
