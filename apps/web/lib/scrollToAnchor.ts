/**
 * Défile jusqu'à un élément (par id) et le met brièvement en surbrillance.
 * Réessaie quelques fois car l'élément peut être rendu après hydratation.
 * Appelé DIRECTEMENT au clic (pas seulement via hashchange) pour que recliquer
 * la même alerte re-scrolle même si le hash n'a pas changé.
 */
export function scrollToAnchor(anchor: string | null | undefined): void {
  if (typeof window === 'undefined' || !anchor) return;
  const id = anchor.replace(/^#/, '');
  let tries = 0;
  const attempt = () => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('avra-alert-highlight');
      window.setTimeout(() => el.classList.remove('avra-alert-highlight'), 2400);
    } else if (tries++ < 12) {
      window.setTimeout(attempt, 160);
    }
  };
  attempt();
}
