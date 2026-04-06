'use client';

/**
 * Page portail e-facturation publique
 * Accessible via /e-facturation/[token] sans authentification
 * Permet au client de consulter son devis ou sa facture + accepter/refuser
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

// ─── Types locaux (pas d'import store côté portail public) ─────────────────

interface LigneDoc {
  id: string;
  description: string;
  quantite: number;
  unite: string;
  prixUnitaireHT: number;
  tva: number;
  remise: number;
}

interface DocumentPublic {
  type: 'devis' | 'facture';
  ref: string;
  statut: string;
  client: string;
  clientEmail?: string;
  clientAddress?: string;
  dateCreation: string;
  dateValidite?: string;
  dateEcheance?: string;
  conditionsPaiement?: string;
  notes?: string;
  lignes: LigneDoc[];
  totalHT: number;
  totalTTC: number;
  societe: {
    nom: string;
    adresse: string;
    codePostal: string;
    ville: string;
    siret: string;
    tva: string;
    phone: string;
    email: string;
  };
}

// ─── Calcul lignes ─────────────────────────────────────────────────────────

function calcLigne(l: LigneDoc) {
  const base = l.quantite * l.prixUnitaireHT * (1 - l.remise / 100);
  return { ht: base, tva: base * (l.tva / 100), ttc: base * (1 + l.tva / 100) };
}

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

// ─── Badge statut ──────────────────────────────────────────────────────────

function StatusBadge({ statut }: { statut: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    BROUILLON: { bg: '#f3f4f6', text: '#6b7280', label: 'Brouillon' },
    ENVOYÉ:    { bg: '#eff6ff', text: '#3b82f6', label: 'En attente de réponse' },
    ACCEPTÉ:   { bg: '#f0fdf4', text: '#16a34a', label: 'Accepté' },
    REFUSÉ:    { bg: '#fef2f2', text: '#dc2626', label: 'Refusé' },
    EXPIRÉ:    { bg: '#fefce8', text: '#ca8a04', label: 'Expiré' },
    'EN ATTENTE': { bg: '#eff6ff', text: '#3b82f6', label: 'En attente de paiement' },
    PAYÉE:     { bg: '#f0fdf4', text: '#16a34a', label: 'Payée' },
    RETARD:    { bg: '#fef2f2', text: '#dc2626', label: 'En retard' },
    ACOMPTE:   { bg: '#fdf4ff', text: '#9333ea', label: 'Acompte reçu' },
  };
  const s = map[statut] ?? { bg: '#f3f4f6', text: '#6b7280', label: statut };
  return (
    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold" style={{
      background: s.bg, color: s.text,
      fontSize: 13, fontWeight: 600, display: 'inline-block',
    }}>
      {s.label}
    </span>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────

export default function EFacturationPortal() {
  const params = useParams();
  const token = params?.token as string;

  const [doc, setDoc] = useState<DocumentPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionDone, setActionDone] = useState<'accepted' | 'refused' | null>(null);
  const [showPrintHint, setShowPrintHint] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [showSignModal, setShowSignModal] = useState(false);

  useEffect(() => {
    if (!token) return;

    // Lecture depuis localStorage (store Zustand persisté)
    try {
      const raw = localStorage.getItem('avra-store');
      if (!raw) { setNotFound(true); setLoading(false); return; }
      const parsed = JSON.parse(raw);
      const state = parsed?.state ?? parsed;

      const societe = state.societe ?? {
        nom: 'AVRA Studio',
        adresse: '12 rue de la Paix',
        codePostal: '75001',
        ville: 'Paris',
        siret: '123 456 789 00012',
        tva: 'FR12345678901',
        phone: '01 23 45 67 89',
        email: 'contact@avra.fr',
      };

      // Chercher dans devis
      const allDevis: any[] = state.devis ?? [];
      const devisTrouve = allDevis.find((d: any) => d.token === token);
      if (devisTrouve) {
        setDoc({
          type: 'devis',
          ref: devisTrouve.ref,
          statut: devisTrouve.statut,
          client: devisTrouve.client,
          clientEmail: devisTrouve.clientEmail,
          clientAddress: devisTrouve.clientAddress,
          dateCreation: devisTrouve.dateCreation,
          dateValidite: devisTrouve.dateValidite,
          conditionsPaiement: devisTrouve.conditionsPaiement,
          notes: devisTrouve.notes,
          lignes: devisTrouve.lignes ?? [],
          totalHT: devisTrouve.totalHT,
          totalTTC: devisTrouve.totalTTC,
          societe,
        });
        setLoading(false);
        return;
      }

      // Chercher dans invoiceDetails
      const details: Record<string, any> = state.invoiceDetails ?? {};
      const factureTrouvee = Object.values(details).find((f: any) => f.token === token);
      if (factureTrouvee) {
        const f = factureTrouvee as any;
        setDoc({
          type: 'facture',
          ref: f.ref,
          statut: f.statut,
          client: f.client,
          clientEmail: f.clientEmail,
          clientAddress: f.clientAddress,
          dateCreation: f.date,
          dateEcheance: f.dateEcheance,
          conditionsPaiement: f.conditionsPaiement,
          notes: f.notes,
          lignes: f.lignes ?? [],
          totalHT: f.montantHT,
          totalTTC: f.montantHT * (1 + (f.tva ?? 20) / 100),
          societe,
        });
        setLoading(false);
        return;
      }

      setNotFound(true);
      setLoading(false);
    } catch {
      setNotFound(true);
      setLoading(false);
    }
  }, [token]);

  function handleAccept() {
    if (!token || !doc) return;
    setShowSignModal(true);
  }

  function confirmAccept() {
    if (!token || !doc) return;
    try {
      const raw = localStorage.getItem('avra-store');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const state = parsed?.state ?? parsed;
      const allDevis: any[] = state.devis ?? [];
      const idx = allDevis.findIndex((d: any) => d.token === token);
      if (idx >= 0) {
        allDevis[idx] = { ...allDevis[idx], statut: 'ACCEPTÉ' };
        state.devis = allDevis;
        if (parsed.state) parsed.state = state;
        else Object.assign(parsed, state);
        localStorage.setItem('avra-store', JSON.stringify(parsed));
      }
    } catch {}
    setActionDone('accepted');
    setShowSignModal(false);
  }

  function handleRefuse() {
    if (!token || !doc) return;
    try {
      const raw = localStorage.getItem('avra-store');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const state = parsed?.state ?? parsed;
      const allDevis: any[] = state.devis ?? [];
      const idx = allDevis.findIndex((d: any) => d.token === token);
      if (idx >= 0) {
        allDevis[idx] = { ...allDevis[idx], statut: 'REFUSÉ' };
        state.devis = allDevis;
        if (parsed.state) parsed.state = state;
        else Object.assign(parsed, state);
        localStorage.setItem('avra-store', JSON.stringify(parsed));
      }
    } catch {}
    setActionDone('refused');
  }

  function handlePrint() {
    window.print();
  }

  // ── Écrans d'état ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]" style={{ fontFamily: 'system-ui, sans-serif' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#e2e8f0] border-t-[#6366f1] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#64748b] text-[15px]">Chargement du document…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (notFound || !doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]" style={{ fontFamily: 'system-ui, sans-serif' }}>
        <div className="text-center max-w-[480px] px-6">
          <div className="text-[64px] mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-[#1e293b] mb-2">Document introuvable</h1>
          <p className="text-[#64748b] leading-[1.6] mb-6">
            Ce lien est invalide ou a expiré. Contactez votre interlocuteur pour obtenir un nouveau lien d'accès.
          </p>
          <div className="bg-[#f1f5f9] rounded-lg p-3 text-[13px] text-[#94a3b8] break-all">
            Token : {token}
          </div>
        </div>
      </div>
    );
  }

  if (actionDone === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0fdf4]" style={{ fontFamily: 'system-ui, sans-serif' }}>
        <div className="text-center max-w-[480px] px-6">
          <div className="text-[72px] mb-4">✅</div>
          <h1 className="text-3xl font-bold text-[#15803d] mb-2">Devis accepté !</h1>
          <p className="text-[#166534] leading-[1.6] mb-2">
            Votre acceptation du devis <strong>{doc.ref}</strong> a bien été enregistrée.
          </p>
          {signerName && (
            <p className="text-[#166534] mb-4 text-sm">
              Signé par : <strong>{signerName}</strong>
            </p>
          )}
          <p className="text-[#16a34a] text-sm">
            Vous allez recevoir une confirmation par email. Notre équipe vous contactera sous 48h.
          </p>
        </div>
      </div>
    );
  }

  if (actionDone === 'refused') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fff5f5]" style={{ fontFamily: 'system-ui, sans-serif' }}>
        <div className="text-center max-w-[480px] px-6">
          <div className="text-[72px] mb-4">❌</div>
          <h1 className="text-3xl font-bold text-[#dc2626] mb-2">Devis refusé</h1>
          <p className="text-[#991b1b] leading-[1.6]">
            Votre refus du devis <strong>{doc.ref}</strong> a été enregistré. Merci de nous avoir contacté.
          </p>
          <p className="text-[#dc2626] text-sm mt-3">
            N'hésitez pas à nous recontacter si vous souhaitez renégocier ou obtenir un nouveau devis.
          </p>
        </div>
      </div>
    );
  }

  // ── Calcul totaux ─────────────────────────────────────────────────────

  const totalHT = doc.lignes.reduce((s, l) => s + calcLigne(l).ht, 0);
  const totalTVA = doc.lignes.reduce((s, l) => s + calcLigne(l).tva, 0);
  const totalTTC = totalHT + totalTVA;

  const isDevis = doc.type === 'devis';
  const canAcceptRefuse = isDevis && (doc.statut === 'ENVOYÉ' || doc.statut === 'BROUILLON');

  // ── Grouper TVA ───────────────────────────────────────────────────────

  const tvaGroups: Record<number, number> = {};
  doc.lignes.forEach(l => {
    const ht = calcLigne(l).ht;
    const tvaAmt = ht * (l.tva / 100);
    tvaGroups[l.tva] = (tvaGroups[l.tva] ?? 0) + tvaAmt;
  });

  // ── Rendu principal ───────────────────────────────────────────────────

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f1f5f9; font-family: system-ui, -apple-system, sans-serif; }
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .page-wrapper { padding: 0; max-width: 100%; }
          .doc-card { box-shadow: none; border-radius: 0; }
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Header portail */}
      <div className="no-print bg-[#1e293b] text-white py-[14px] px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] rounded-lg flex items-center justify-center text-base font-black text-white">A</div>
          <div>
            <div className="font-bold text-sm">AVRA Studio</div>
            <div className="text-[11px] text-[#94a3b8]">Portail documents client</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="py-[7px] px-[14px] bg-[#334155] text-white border-none rounded text-[13px] cursor-pointer flex items-center gap-[6px]"
          >
            🖨️ Imprimer / PDF
          </button>
        </div>
      </div>

      <div className="page-wrapper max-w-[860px] mx-auto px-4 py-8 pb-20">

        {/* Bandeau info document */}
        <div className="no-print bg-white border border-[#e2e8f0] rounded-xl p-5 mb-6 flex justify-between items-center flex-wrap gap-3 animate-[fadeIn_0.3s_ease]">
          <div>
            <div className="text-[12px] text-[#94a3b8] mb-1 uppercase tracking-[0.05em]">
              {isDevis ? 'Devis commercial' : 'Facture'}
            </div>
            <div className="text-[20px] font-bold text-[#1e293b]">{doc.ref}</div>
            {doc.dateValidite && isDevis && (
              <div className="text-[13px] text-[#64748b] mt-[2px]">
                Valable jusqu'au : <strong>{new Date(doc.dateValidite).toLocaleDateString('fr-FR')}</strong>
              </div>
            )}
            {doc.dateEcheance && !isDevis && (
              <div className="text-[13px] text-[#64748b] mt-[2px]">
                Échéance : <strong>{new Date(doc.dateEcheance).toLocaleDateString('fr-FR')}</strong>
              </div>
            )}
          </div>
          <StatusBadge statut={doc.statut} />
        </div>

        {/* Corps du document */}
        <div className="doc-card bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.07)] overflow-hidden animate-[fadeIn_0.4s_ease]">

          {/* En-tête document */}
          <div className="bg-gradient-to-br from-[#1e293b] to-[#312e81] py-8 px-10 text-white">
            <div className="flex justify-between items-start flex-wrap gap-6">
              <div>
                <div className="text-[28px] font-black tracking-tight mb-1">
                  {isDevis ? 'DEVIS' : 'FACTURE'}
                </div>
                <div className="text-[18px] text-[#a5b4fc] font-semibold">{doc.ref}</div>
                <div className="text-[13px] text-[#94a3b8] mt-2">
                  Émis le {new Date(doc.dateCreation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[28px] font-black text-white">{fmt(totalTTC)}</div>
                <div className="text-[13px] text-[#a5b4fc]">TTC</div>
                <div className="text-[13px] text-[#94a3b8] mt-1">dont {fmt(totalTVA)} de TVA</div>
              </div>
            </div>
          </div>

          <div className="py-8 px-10">

            {/* Émetteur / Destinataire */}
            <div className="grid grid-cols-2 gap-6 mb-8 pb-8 border-b border-[#e2e8f0]">
              <div>
                <div className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.08em] mb-2">Émetteur</div>
                <div className="font-bold text-base text-[#1e293b] mb-1">{doc.societe.nom}</div>
                <div className="text-[13px] text-[#64748b] leading-[1.7]">
                  {doc.societe.adresse}<br />
                  {doc.societe.codePostal} {doc.societe.ville}<br />
                  {doc.societe.phone}<br />
                  {doc.societe.email}<br />
                  <span className="text-[#94a3b8]">SIRET : {doc.societe.siret}</span><br />
                  <span className="text-[#94a3b8]">TVA : {doc.societe.tva}</span>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.08em] mb-2">Destinataire</div>
                <div className="font-bold text-base text-[#1e293b] mb-1">{doc.client}</div>
                <div className="text-[13px] text-[#64748b] leading-[1.7]">
                  {doc.clientAddress && <>{doc.clientAddress}<br /></>}
                  {doc.clientEmail && <>{doc.clientEmail}<br /></>}
                </div>
              </div>
            </div>

            {/* Tableau des lignes */}
            {doc.lignes.length > 0 ? (
              <div className="mb-8">
                <div className="text-[13px] font-bold text-[#94a3b8] uppercase tracking-[0.08em] mb-4">
                  Détail des prestations
                </div>
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-[#f8fafc]">
                      <th className="p-3 text-left text-[#64748b] font-semibold border-b-2 border-b-[#e2e8f0]">Description</th>
                      <th className="p-3 text-center text-[#64748b] font-semibold border-b-2 border-b-[#e2e8f0] whitespace-nowrap">Qté</th>
                      <th className="p-3 text-center text-[#64748b] font-semibold border-b-2 border-b-[#e2e8f0] whitespace-nowrap">Unité</th>
                      <th className="p-3 text-right text-[#64748b] font-semibold border-b-2 border-b-[#e2e8f0] whitespace-nowrap">PU HT</th>
                      <th className="p-3 text-center text-[#64748b] font-semibold border-b-2 border-b-[#e2e8f0]">TVA</th>
                      {doc.lignes.some(l => l.remise > 0) && (
                        <th className="p-3 text-center text-[#64748b] font-semibold border-b-2 border-b-[#e2e8f0]">Remise</th>
                      )}
                      <th className="p-3 text-right text-[#64748b] font-semibold border-b-2 border-b-[#e2e8f0] whitespace-nowrap">Total HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.lignes.map((ligne, i) => {
                      const calc = calcLigne(ligne);
                      return (
                        <tr key={ligne.id} className={`border-b border-b-[#f1f5f9] ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`}>
                          <td className="p-3 text-[#1e293b] leading-[1.4]">
                            {ligne.description}
                          </td>
                          <td className="p-3 text-center text-[#475569]">
                            {ligne.quantite.toLocaleString('fr-FR')}
                          </td>
                          <td className="p-3 text-center text-[#94a3b8]">
                            {ligne.unite}
                          </td>
                          <td className="p-3 text-right text-[#475569] whitespace-nowrap">
                            {fmt(ligne.prixUnitaireHT)}
                          </td>
                          <td className="p-3 text-center text-[#64748b]">
                            {ligne.tva}%
                          </td>
                          {doc.lignes.some(l => l.remise > 0) && (
                            <td className={`p-3 text-center ${ligne.remise > 0 ? 'text-[#f59e0b]' : 'text-[#cbd5e1]'}`}>
                              {ligne.remise > 0 ? `-${ligne.remise}%` : '—'}
                            </td>
                          )}
                          <td className="p-3 text-right text-[#1e293b] font-semibold whitespace-nowrap">
                            {fmt(calc.ht)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-[#f8fafc] rounded-lg p-6 text-center text-[#94a3b8] mb-8 text-sm">
                Aucune ligne de prestation sur ce document
              </div>
            )}

            {/* Récap totaux */}
            <div className="flex justify-end mb-8">
              <div className="min-w-[280px] bg-[#f8fafc] rounded-xl p-6">
                <div className="flex justify-between mb-2.5 text-sm">
                  <span className="text-[#64748b]">Sous-total HT</span>
                  <span className="font-semibold text-[#1e293b]">{fmt(totalHT)}</span>
                </div>
                {Object.entries(tvaGroups).map(([rate, amt]) => (
                  <div key={rate} className="flex justify-between mb-2.5 text-sm">
                    <span className="text-[#64748b]">TVA {rate}%</span>
                    <span className="text-[#64748b]">{fmt(amt)}</span>
                  </div>
                ))}
                <div className="h-px bg-[#e2e8f0] my-3" />
                <div className="flex justify-between text-base">
                  <span className="font-bold text-[#1e293b]">Total TTC</span>
                  <span className="font-black text-[#6366f1] text-xl">{fmt(totalTTC)}</span>
                </div>
              </div>
            </div>

            {/* Conditions de paiement */}
            {doc.conditionsPaiement && (
              <div className="mb-6 p-5 bg-[#f0f9ff] rounded-lg border-l-4 border-l-[#3b82f6]">
                <div className="text-[12px] font-bold text-[#2563eb] uppercase tracking-[0.06em] mb-1.5">
                  Conditions de règlement
                </div>
                <div className="text-sm text-[#1e40af]">{doc.conditionsPaiement}</div>
              </div>
            )}

            {/* Notes */}
            {doc.notes && (
              <div className="mb-6 p-5 bg-[#fffbeb] rounded-lg border-l-4 border-l-[#f59e0b]">
                <div className="text-[12px] font-bold text-[#d97706] uppercase tracking-[0.06em] mb-1.5">Notes</div>
                <div className="text-sm text-[#78350f] whitespace-pre-wrap">{doc.notes}</div>
              </div>
            )}

            {/* Mentions légales */}
            <div className="border-t border-t-[#e2e8f0] pt-5 text-[11px] text-[#94a3b8] leading-[1.7]">
              <p>En cas de retard de paiement, une pénalité de 3x le taux d'intérêt légal sera appliquée, ainsi qu'une indemnité forfaitaire de 40€ pour frais de recouvrement (art. L.441-10 et L.441-11 du Code de commerce).</p>
              <p className="mt-1.5">
                {doc.societe.nom} — SIRET {doc.societe.siret} — N° TVA intracommunautaire : {doc.societe.tva}
              </p>
            </div>

          </div>
        </div>

        {/* Actions client (accepter/refuser) — visible uniquement pour devis ENVOYÉ */}
        {canAcceptRefuse && (
          <div className="no-print mt-6 bg-white rounded-2xl py-6 px-8 shadow-[0_4px_16px_rgba(0,0,0,0.07)] animate-[fadeIn_0.5s_ease] flex justify-between items-center flex-wrap gap-4">
            <div>
              <div className="text-base font-bold text-[#1e293b] mb-1">Votre réponse</div>
              <div className="text-sm text-[#64748b]">Acceptez-vous ce devis ? Votre réponse sera enregistrée immédiatement.</div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRefuse}
                className="py-[10px] px-5 bg-[#fee2e2] text-[#dc2626] border-none rounded text-sm font-semibold cursor-pointer"
              >
                ✕ Refuser le devis
              </button>
              <button
                onClick={handleAccept}
                className="py-[10px] px-5 bg-[#6366f1] text-white border-none rounded text-sm font-semibold cursor-pointer shadow-[0_2px_8px_rgba(99,102,241,0.4)]"
              >
                ✓ Accepter le devis
              </button>
            </div>
          </div>
        )}

        {/* Info facture — pas de bouton action */}
        {!isDevis && (
          <div className="no-print mt-6 bg-[#f0fdf4] rounded-2xl py-5 px-7 border border-[#bbf7d0] flex items-center gap-[14px]">
            <span className="text-2xl">💳</span>
            <div>
              <div className="text-[15px] font-semibold text-[#15803d] mb-[2px]">Règlement de la facture</div>
              <div className="text-[13px] text-[#166534]">
                {doc.conditionsPaiement || 'Merci d\'effectuer votre règlement selon les conditions convenues.'}
              </div>
            </div>
          </div>
        )}

        {/* Devis déjà traité */}
        {isDevis && !canAcceptRefuse && (
          <div className="no-print mt-6 rounded-2xl py-5 px-7 border flex items-center gap-[14px]" style={{ background: doc.statut === 'ACCEPTÉ' ? '#f0fdf4' : '#f8fafc', borderColor: doc.statut === 'ACCEPTÉ' ? '#bbf7d0' : '#e2e8f0' }}>
            <span className="text-2xl">{doc.statut === 'ACCEPTÉ' ? '✅' : doc.statut === 'REFUSÉ' ? '❌' : 'ℹ️'}</span>
            <div>
              <div className="text-[15px] font-semibold text-[#1e293b] mb-[2px]">
                {doc.statut === 'ACCEPTÉ' ? 'Devis accepté' : doc.statut === 'REFUSÉ' ? 'Devis refusé' : `Statut : ${doc.statut}`}
              </div>
              <div className="text-[13px] text-[#64748b]">
                {doc.statut === 'ACCEPTÉ' ? 'Ce devis a déjà été accepté. Notre équipe vous contactera pour la suite.' :
                 doc.statut === 'REFUSÉ' ? 'Ce devis a été refusé. Contactez-nous pour renégocier.' :
                 'Ce document est en cours de traitement.'}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Modal signature */}
      {showSignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Confirmation d'acceptation</h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
              En acceptant ce devis <strong>{doc.ref}</strong> d'un montant de <strong>{fmt(totalTTC)} TTC</strong>, vous engagez votre commande auprès de {doc.societe.nom}.
            </p>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                Votre nom complet *
              </label>
              <input
                type="text"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder="Prénom Nom"
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none' }}
              />
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                Fait office de signature électronique simple
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSignModal(false)}
                style={{ padding: '10px 18px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                onClick={confirmAccept}
                disabled={!signerName.trim()}
                style={{
                  padding: '10px 20px', background: signerName.trim() ? '#6366f1' : '#c7d2fe',
                  color: 'white', border: 'none', borderRadius: 8, fontSize: 14,
                  fontWeight: 600, cursor: signerName.trim() ? 'pointer' : 'not-allowed',
                  boxShadow: signerName.trim() ? '0 2px 8px rgba(99,102,241,0.4)' : 'none'
                }}
              >
                ✓ Confirmer l'acceptation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
