export default function Footer() {
  return (
    <footer>
      <div className="footer-grid container">
        <div className="footer-brand">
          <span className="nav-logo-text">AVRA</span>
          <p>L&apos;ERP intelligent conçu pour les professionnels de l&apos;agencement intérieur. Cuisinistes, menuisiers, architectes — tout en un.</p>
        </div>
        <div className="footer-col">
          <h5>Produit</h5>
          <a href="/fonctionnalites">Fonctionnalités</a>
          <a href="/tarifs">Tarifs</a>
          <a href="/comment-ca-marche">Comment ça marche</a>
          <a href="/temoignages">Témoignages</a>
        </div>
        <div className="footer-col">
          <h5>Métiers</h5>
          <a href="/metiers#cuisiniste">Cuisiniste</a>
          <a href="/metiers#menuisier">Menuisier</a>
          <a href="/metiers#architecte">Architecte d&apos;intérieur</a>
          <a href="/metiers#agenceur">Agenceur</a>
        </div>
        <div className="footer-col">
          <h5>Légal</h5>
          <a href="/mentions-legales">Mentions légales</a>
          <a href="/confidentialite">Confidentialité</a>
          <a href="/cgv">CGV</a>
          <a href="mailto:contact@avra.fr">contact@avra.fr</a>
        </div>
      </div>
      <div className="footer-bottom container">
        <span>© 2025 AVRA by Luméa — Tous droits réservés</span>
        <div className="footer-bottom-links">
          <a href="/mentions-legales">Mentions légales</a>
          <a href="/confidentialite">Politique de confidentialité</a>
        </div>
      </div>
    </footer>
  );
}
