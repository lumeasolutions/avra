/**
 * /register — Désactivé pendant la bêta privée.
 *
 * La création de compte publique n'est pas ouverte avant le lancement officiel
 * en juillet 2026. Les visiteurs sont redirigés vers la page de liste d'attente.
 *
 * Pour réactiver : renommer `page.disabled.tsx.bak` en `page.tsx` et supprimer
 * ce fichier (ou commenter le `redirect()`).
 */

import { redirect } from 'next/navigation';

export default function RegisterPage() {
  redirect('/rejoindre');
}
