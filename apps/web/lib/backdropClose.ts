/**
 * Fermeture d'une fenêtre par clic sur le FOND — sans fermeture accidentelle.
 *
 * Bug remonté par la cofondatrice (22/09/2026, Stock) : « quand je remplis les
 * infos et que je veux modifier, la fenêtre s'enlève ». En sélectionnant le
 * texte d'un champ à la souris, on relâche souvent le bouton un peu en dehors
 * de la carte : le navigateur envoie alors le `click` à l'ancêtre commun (le
 * fond) → `onClick={close}` fermait la fenêtre et le formulaire était perdu.
 *
 * Ici on ne ferme que si l'appui ET le relâchement ont eu lieu sur le fond
 * lui-même. Usage : `<div className="fixed inset-0 …" {...backdropClose(close)}>`
 * (la carte intérieure peut garder son `onClick={e => e.stopPropagation()}`).
 */
import type { MouseEvent } from 'react';

// L'état « appui commencé sur le fond » est stocké sur l'élément DOM lui-même
// (et non dans une variable de rendu) : un re-rendu entre l'appui et le
// relâchement (focus d'un champ, frappe…) ne doit pas le perdre.
const downOn = new WeakSet<EventTarget>();

export function backdropClose(close: () => void) {
  return {
    onMouseDown: (e: MouseEvent<HTMLElement>) => {
      if (e.target === e.currentTarget) downOn.add(e.currentTarget);
      else downOn.delete(e.currentTarget);
    },
    onClick: (e: MouseEvent<HTMLElement>) => {
      const ok = downOn.has(e.currentTarget) && e.target === e.currentTarget;
      downOn.delete(e.currentTarget);
      if (ok) close();
    },
  };
}
