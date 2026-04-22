'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

type Metier = 'architecte' | 'cuisiniste' | 'menuisier' | 'agenceur' | 'decorateur' | 'autre' | '';

export default function RejoindreClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [metier, setMetier] = useState<Metier>('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('L\'email est requis.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          company: company || undefined,
          metier: metier || undefined,
          message: message || undefined,
          source: typeof window !== 'undefined' ? window.location.pathname : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue.');
      } else {
        // Redirect vers la page de confirmation dédiée
        router.push('/rejoindre/merci');
      }
    } catch (err) {
      setError('Erreur réseau. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Nav />
      <main style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0e1810 0%, #0a110c 100%)',
        paddingTop: '120px',
        paddingBottom: '80px',
        color: '#fff',
      }}>
        <div style={{
          maxWidth: '640px',
          margin: '0 auto',
          padding: '0 5%',
        }}>
          {/* Badge bêta */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '999px',
            background: 'rgba(201, 169, 110, 0.1)',
            border: '1px solid rgba(201, 169, 110, 0.3)',
            color: '#e8c97a',
            fontSize: '0.8rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '24px',
          }}>
            <span>🌱</span>
            <span>Bêta privée · Lancement juillet 2026</span>
          </div>

          <>
              <h1 style={{
                fontSize: 'clamp(2rem, 5vw, 3rem)',
                fontWeight: 700,
                lineHeight: 1.1,
                marginBottom: '20px',
                background: 'linear-gradient(135deg, #fff 0%, #e8c97a 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Rejoignez la liste d&apos;attente AVRA
              </h1>
              <p style={{
                fontSize: '1.05rem',
                lineHeight: 1.6,
                color: 'rgba(255,255,255,0.75)',
                marginBottom: '40px',
              }}>
                AVRA est actuellement en bêta privée. Le lancement public est prévu en <strong style={{ color: '#e8c97a' }}>juillet 2026</strong>. Laissez-nous votre email pour être prévenu(e) en priorité et bénéficier d&apos;un accès anticipé.
              </p>

              <form onSubmit={handleSubmit} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                }}>
                  <input
                    type="text"
                    placeholder="Prénom"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    placeholder="Nom"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <input
                  type="email"
                  placeholder="Email professionnel *"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                />

                <input
                  type="text"
                  placeholder="Société / atelier"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  style={inputStyle}
                />

                <select
                  value={metier}
                  onChange={(e) => setMetier(e.target.value as Metier)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="" style={{ background: '#0e1810' }}>Votre métier (optionnel)</option>
                  <option value="architecte" style={{ background: '#0e1810' }}>Architecte d&apos;intérieur</option>
                  <option value="cuisiniste" style={{ background: '#0e1810' }}>Cuisiniste</option>
                  <option value="menuisier" style={{ background: '#0e1810' }}>Menuisier</option>
                  <option value="agenceur" style={{ background: '#0e1810' }}>Agenceur</option>
                  <option value="decorateur" style={{ background: '#0e1810' }}>Décorateur</option>
                  <option value="autre" style={{ background: '#0e1810' }}>Autre</option>
                </select>

                <textarea
                  placeholder="Votre message (optionnel)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
                />

                {error && (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#fca5a5',
                    fontSize: '0.875rem',
                  }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: '12px',
                    padding: '16px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: loading
                      ? 'rgba(201, 169, 110, 0.5)'
                      : 'linear-gradient(135deg, #e8c97a, #C9A96E)',
                    color: '#0e1810',
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: loading ? 'wait' : 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 20px rgba(201, 169, 110, 0.4)',
                    letterSpacing: '0.01em',
                  }}
                >
                  {loading ? 'Inscription en cours…' : "Rejoindre la liste d'attente"}
                </button>

                <p style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.5)',
                  textAlign: 'center',
                  marginTop: '8px',
                }}>
                  En vous inscrivant, vous acceptez de recevoir des emails relatifs au lancement d&apos;AVRA. Vos données sont traitées conformément à notre <Link href="/confidentialite" style={{ color: '#C9A96E', textDecoration: 'underline' }}>politique de confidentialité</Link>.
                </p>
              </form>

              {/* Liens secondaires */}
              <div style={{
                marginTop: '48px',
                paddingTop: '32px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                  Vous êtes déjà partenaire bêta ?
                </p>
                <Link href="/login" style={{
                  color: '#e8c97a',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}>
                  Se connecter →
                </Link>
              </div>
            </>
        </div>
      </main>
      <Footer />
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 18px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  fontSize: '0.95rem',
  outline: 'none',
  transition: 'all 0.2s ease',
  boxSizing: 'border-box',
};
