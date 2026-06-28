// Wrapper SERVEUR : force le rendu dynamique de /ia-studio pour empecher la
// mise en cache statique de Vercel (qui servait une ancienne version de la page).
// Le vrai composant (client) est dans ./IaStudioClient.
export const dynamic = 'force-dynamic';

import IaStudioClient from './IaStudioClient';

export default function Page() {
  return <IaStudioClient />;
}