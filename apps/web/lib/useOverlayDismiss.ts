'use client';

import { useRef, useCallback } from 'react';

/**
 * Fermeture au clic sur le fond d'une modale — sans perdre la saisie en cours.
 *
 * LE BUG QUE ÇA CORRIGE (retour cofondatrice, sept. 2026) :
 * « quand je modifie le titre de la demande ça revient à l'écran du dossier,
 *   et il faut recommencer à chaque fois ».
 *
 * Pour remplacer un titre, on sélectionne d'abord le texte existant à la souris.
 * Si le geste démarre dans le champ et se termine sur le fond (le panneau ne fait
 * que 620 px, le fond occupe tout le reste de l'écran), le navigateur émet un
 * `click` dont la cible est l'ancêtre commun — c'est-à-dire le fond. Le
 * `stopPropagation()` posé sur le panneau ne sert à rien : l'évènement n'y passe
 * jamais. Résultat : la modale se ferme et toute la saisie est perdue.
 *
 * La correction consiste à ne fermer que si le geste a COMMENCÉ sur le fond,
 * pas seulement s'il s'y est terminé.
 *
 * Usage :
 *   const dismiss = useOverlayDismiss(onClose);
 *   <div {...dismiss}>            // le fond
 *     <div onClick={(e) => e.stopPropagation()}>…</div>
 *   </div>
 */
export function useOverlayDismiss(onClose: () => void, enabled = true) {
  // true uniquement si le pointeur a été pressé sur le fond lui-même.
  const startedOnOverlay = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    startedOnOverlay.current = e.target === e.currentTarget;
  }, []);

  // Un geste tactile qui part du panneau ne doit pas fermer non plus.
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startedOnOverlay.current = e.target === e.currentTarget;
  }, []);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      const wasOnOverlay = startedOnOverlay.current;
      startedOnOverlay.current = false;
      if (!enabled) return;
      // Les deux conditions sont nécessaires : le geste doit avoir commencé ET
      // fini sur le fond.
      if (wasOnOverlay && e.target === e.currentTarget) onClose();
    },
    [onClose, enabled],
  );

  return { onMouseDown, onTouchStart, onClick };
}
