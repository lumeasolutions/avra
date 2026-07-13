'use client';

import { useState } from 'react';
import { Mail, BookOpen, HelpCircle } from 'lucide-react';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

export default function ContactClient() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    subject: 'support',
    message: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "L'envoi a échoué. Réessayez.");
      }
      setIsSubmitted(true);
      setFormData({ firstName: '', lastName: '', email: '', subject: 'support', message: '' });
      setTimeout(() => setIsSubmitted(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Nav />
      <div style={{ background: '#ffffff', color: '#1e2b22', minHeight: '100vh', fontFamily: 'var(--font-dm-sans, "DM Sans"), system-ui, sans-serif' }}>
        {/* HERO */}
        <section style={{ background: 'linear-gradient(135deg, #1e2b22 0%, #304035 100%)', color: '#ffffff', padding: '120px 20px 60px', textAlign: 'center' }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <h1 style={{ fontSize: '48px', fontWeight: 700, marginBottom: 20, fontFamily: 'var(--font-playfair-display)', letterSpacing: '-1px' }}>
              On est là pour vous aider
            </h1>
            <p style={{ fontSize: '18px', color: '#f9f6f0', margin: 0 }}>
              Des questions ? Un problème technique ? Contactez-nous directement.
            </p>
          </div>
        </section>

        {/* MAIN CONTENT */}
        <section style={{ padding: '80px 20px', background: '#ffffff' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'start' }}>
              {/* FORMULAIRE GAUCHE */}
              <div>
                <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 30, color: '#1e2b22' }}>Envoyez-nous un message</h2>

                {isSubmitted ? (
                  <div style={{ background: '#f0f8f5', border: '1px solid #1e2b22', borderRadius: 12, padding: 30, textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 20 }}>✓</div>
                    <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>Message reçu !</h3>
                    <p style={{ fontSize: 16, color: '#666' }}>Nous vous répondons sous 24h. Merci !</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#1e2b22' }}>Prénom</label>
                        <input aria-label="Jean" type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Jean" required style={{ width: '100%', padding: '12px 16px', border: '1px solid #ddd', borderRadius: 8, fontSize: 16, fontFamily: 'inherit' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#1e2b22' }}>Nom</label>
                        <input aria-label="Dupont" type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Dupont" required style={{ width: '100%', padding: '12px 16px', border: '1px solid #ddd', borderRadius: 8, fontSize: 16, fontFamily: 'inherit' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#1e2b22' }}>Email</label>
                      <input aria-label="jean@entreprise.com" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="jean@entreprise.com" required style={{ width: '100%', padding: '12px 16px', border: '1px solid #ddd', borderRadius: 8, fontSize: 16, fontFamily: 'inherit' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#1e2b22' }}>Sujet</label>
                      <select name="subject" value={formData.subject} onChange={handleChange} style={{ width: '100%', padding: '12px 16px', border: '1px solid #ddd', borderRadius: 8, fontSize: 16, fontFamily: 'inherit', cursor: 'pointer' }}>
                        <option value="support">Support technique</option>
                        <option value="commercial">Questions commerciales</option>
                        <option value="partnership">Partenariat</option>
                        <option value="feedback">Retour / Suggestion</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#1e2b22' }}>Message</label>
                      <textarea aria-label="Décrivez votre question ou problème..." name="message" value={formData.message} onChange={handleChange} placeholder="Décrivez votre question ou problème..." rows={5} required style={{ width: '100%', padding: '12px 16px', border: '1px solid #ddd', borderRadius: 8, fontSize: 16, fontFamily: 'inherit', resize: 'none' }} />
                    </div>
                    {error && (
                      <p role="alert" style={{ color: '#b3261e', fontSize: 14, margin: 0 }}>{error}</p>
                    )}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{ background: '#1e2b22', color: '#ffffff', border: 'none', padding: '16px 32px', borderRadius: 8, fontSize: 18, fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, transition: 'background 0.2s' }}
                      onMouseOver={(e) => { if (!isSubmitting) (e.target as HTMLElement).style.background = '#304035'; }}
                      onMouseOut={(e) => { (e.target as HTMLElement).style.background = '#1e2b22'; }}
                    >
                      {isSubmitting ? 'Envoi…' : 'Envoyer le message'}
                    </button>
                  </form>
                )}
              </div>

              {/* INFORMATIONS DROITE */}
              <div>
                <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 30, color: '#1e2b22' }}>Informations de contact</h2>
                {[
                  { icon: Mail, title: 'Email', content: <><a href="mailto:contact@avra-app.fr" style={{ color: '#1e2b22', textDecoration: 'none' }}>contact@avra-app.fr</a><p style={{ fontSize: 14, color: '#999', marginTop: 8, marginBottom: 0 }}>Réponse sous 24h</p></> },
                  { icon: BookOpen, title: 'Documentation', content: <><p style={{ fontSize: 16, color: '#666', margin: 0 }}>Consultez notre centre d&apos;aide pour trouver des réponses rapidement</p><p style={{ fontSize: 14, color: '#999', marginTop: 8, marginBottom: 0 }}><a href="/comment-ca-marche" style={{ color: '#1e2b22', textDecoration: 'underline' }}>Visiter le centre d&apos;aide</a></p></> },
                  { icon: HelpCircle, title: 'FAQ', content: <><p style={{ fontSize: 16, color: '#666', margin: 0 }}>Posez vos questions les plus courantes</p><p style={{ fontSize: 14, color: '#999', marginTop: 8, marginBottom: 0 }}><a href="/blog" style={{ color: '#1e2b22', textDecoration: 'underline' }}>Lire la FAQ</a></p></> },
                ].map(({ icon: Icon, title, content }) => (
                  <div key={title} style={{ background: '#f9f9f9', padding: 24, borderRadius: 12, marginBottom: 24 }}>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ color: '#c9a96e', marginTop: 2 }}><Icon size={24} /></div>
                      <div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#1e2b22' }}>{title}</h3>
                        {content}
                      </div>
                    </div>
                  </div>
                ))}

                <div style={{ background: 'linear-gradient(135deg, #1e2b22 0%, #304035 100%)', padding: 24, borderRadius: 12, color: '#ffffff', marginTop: 40 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#c9a96e' }}>Horaires de support</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 14 }}>
                    <li style={{ marginBottom: 8 }}>Lundi - Vendredi : 9h - 18h</li>
                    <li style={{ marginBottom: 8 }}>Samedi : 10h - 14h</li>
                    <li>Dimanche : Fermé</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
