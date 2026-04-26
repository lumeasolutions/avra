import { IntervenantSidebar } from './components/IntervenantSidebar';
import { IntervenantGuard } from './components/IntervenantGuard';

export const metadata = {
  title: 'Espace Intervenant — AVRA',
  description: 'Portail dédié aux intervenants : poseurs, électriciens, maçons, etc.',
};

export default function IntervenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <IntervenantGuard>
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#f5eee8',
      }}>
        <IntervenantSidebar />
        <main style={{
          flex: 1,
          minWidth: 0,
          padding: '24px 32px',
          overflowY: 'auto',
        }}>
          {children}
        </main>
      </div>
    </IntervenantGuard>
  );
}
