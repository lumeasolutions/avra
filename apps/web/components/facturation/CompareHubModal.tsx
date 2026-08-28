'use client';

/**
 * CompareHubModal — point d'entrée de l'outil « Comparer » d'un dossier.
 * Quatre modes : 2 DEVIS natifs (déterministe), 2 DEVIS PDF (assisté IA —
 * extraction puis même diff déterministe), 2 PHOTOS (assisté IA) ou 2 PLANS
 * (assisté IA — cotes/cloisons/implantation). Ouvert depuis le bouton
 * « Comparer » du dossier. Photos et plans partagent ComparePhotosModal
 * (prop `variant`) + la route /api/ia/compare-photos (champ `mode`) ; les 2
 * modes devis partagent la logique de diff `lib/devisDiff`.
 */
import { useState } from 'react';
import { GitCompare, X, FileText, FileStack, Images, Ruler, ArrowRight, Sparkles } from 'lucide-react';
import { CompareDevisModal } from './CompareDevisModal';
import { ComparePhotosModal } from './ComparePhotosModal';
import { CompareDevisPdfModal } from './CompareDevisPdfModal';

export function CompareHubModal({ dossierId, onClose }: { dossierId?: string; onClose: () => void }) {
  const [mode, setMode] = useState<'menu' | 'devis' | 'devispdf' | 'photos' | 'plans'>('menu');

  if (mode === 'devis') return <CompareDevisModal dossierId={dossierId} onClose={() => setMode('menu')} />;
  if (mode === 'devispdf') return <CompareDevisPdfModal onClose={() => setMode('menu')} />;
  if (mode === 'photos') return <ComparePhotosModal variant="photos" onClose={() => setMode('menu')} />;
  if (mode === 'plans') return <ComparePhotosModal variant="plans" onClose={() => setMode('menu')} />;

  const cards = [
    { key: 'devis' as const, Icon: FileText, title: 'Comparer 2 devis', desc: 'Devis créés dans AVRA — écarts ligne par ligne et totaux.', tag: 'Précis', tagColor: '#16a34a' },
    { key: 'devispdf' as const, Icon: FileStack, title: 'Comparer 2 devis PDF', desc: 'Deux devis en PDF — l\'IA les lit, vous validez les écarts.', tag: 'Assisté IA', tagColor: '#a67749' },
    { key: 'photos' as const, Icon: Images, title: 'Comparer 2 photos', desc: 'État des lieux avant / après — l\'IA repère, vous validez.', tag: 'Assisté IA', tagColor: '#a67749' },
    { key: 'plans' as const, Icon: Ruler, title: 'Comparer 2 plans', desc: 'Deux versions d\'un plan — cotes, cloisons et implantation.', tag: 'Assisté IA', tagColor: '#a67749' },
  ];

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,20,17,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(48,64,53,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'linear-gradient(135deg, #2a3a30 0%, #3d5244 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(217,179,138,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GitCompare size={18} color="#d9b38a" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>Comparer</h2>
              <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'rgba(255,255,255,0.6)' }}>Que voulez-vous comparer ?</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ padding: 7, borderRadius: 9, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex' }}>
            <X size={17} />
          </button>
        </div>

        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cards.map(({ key, Icon, title, desc, tag, tagColor }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', padding: '16px 16px', borderRadius: 14, border: '1px solid rgba(48,64,53,0.12)', background: '#fff', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(166,119,73,0.45)'; e.currentTarget.style.background = 'rgba(166,119,73,0.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(48,64,53,0.12)'; e.currentTarget.style.background = '#fff'; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(48,64,53,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} color="#304035" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#304035' }}>{title}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 800, color: tagColor, background: `${tagColor}14`, borderRadius: 999, padding: '2px 7px' }}>
                    {key !== 'devis' && <Sparkles size={9} />}{tag}
                  </span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(48,64,53,0.55)' }}>{desc}</p>
              </div>
              <ArrowRight size={18} color="rgba(48,64,53,0.3)" style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
