import type { Metadata } from 'next';

// La page est un composant client : elle ne peut pas exporter de `metadata`.
// Ce layout n'existe que pour porter le `noindex` (cf. app/login/layout.tsx).
export const metadata: Metadata = {
  title: 'Mot de passe oublié — AVRA',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
