import type { Metadata } from 'next';

// Idem /forgot-password : page cliente, le `noindex` passe par le layout.
// D'autant plus important ici que l'URL porte un token en query string.
export const metadata: Metadata = {
  title: 'Réinitialiser le mot de passe — AVRA',
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
