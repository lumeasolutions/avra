'use client';

import { useState } from 'react';
import { Calendar, Users, MessageCircle, Lightbulb } from 'lucide-react';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

export default function DemoClient() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    profession: 'autre',
    teamSize: 'solo',
    message: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Formulaire de démo soumis:', formData);
    setIsSubmitted(true);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      profession: 'autre',
      teamSize: 'solo',
      message: '',
    });
    setTimeout(() => setIsSubmitted(false), 3000);
  };

  return (
    <>
      <Nav />
      <div style={{ background: '#ffffff', color: '#1e2b22', minHeight: '100vh', fontFamily: 'var(--font-dm-sans, "DM Sans"), system-ui, sans-serif' }}>
        {/* HERO SECTION */}
        <section style={{
          background: 'linear-gradient(135deg, #1e2b22 0%, #304035 100%)',
          color: '#ffffff',
          padding: '120px 20px 60px',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <h1 style={{ fontSize: '48px', fontWeight: 700, marginBottom: 20, fontFamily: 'var(--font-playfair-display)', letterSpacing: '-1px' }}>
              Voyez AVRA en action
            </h1>
            <p style={{ fontSize: '20px', color: '#c9a96e', fontWeight: 500, marginBottom: 30 }}>
              Démo gratuite en 30 minutes
            </p>
            <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', fontSize: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>✓</span>
                <span>Personnalisée</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>✓</span>
                <span>Sans engagement</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>✓</span>
                <span>Par un expert</span>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN CONTENT */}
        <section style={{ padding: '80px 20px', background: '#ffffff' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'start' }}>
              {/* FORMULAIRE */}
              <div>
                <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 30, color: '#1e2b22' }}>
                  Réservez votre démo
                </h2>

                {isSubmitted ? (
                  <div
                    style={{
                      background: '#f0f8f5',
                      border: '1px solid #1e2b22',
                      borderRadius: 12,
                      padding: 30,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 48, marginBottom: 20 }}>✓</div>
                    <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>
                      Demande reçue !
                    </h3>
                    <p style={{ fontSize: 16, color: '#666' }}>
                      Nous vous contactons sous 24h. Merci de votre intérêt !
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#1e2b22' }}>Prénom</label>
                        <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Jean" required style={{ width: '100%', padding: '12px 16px', border: '1px solid #ddd', borderRadius: 8, fontSize: 16, fontFamily: 'inherit' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#1e2b22' }}>Nom</label>
                        <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Dupont" required style={{ width: '100%', padding: '12px 16px', border: '1px solid #ddd', borderRadius: 8, fontSize: 16, fontFamily: 'inherit' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#1e2b22' }}>Email professionnel</label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="jean@entreprise.com" required style={{ width: '100%', padding: '12px 16px', border: '1px solid #ddd', borderRadius: 8, fontSize: 16, fontFamily: 'inherit' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#1e2b22' }}>Téléphone</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+33 6 12 34 56 78" required style={{ width: '100%', padding: '12px 16px', border: '1px solid #ddd', borderRadius: 8, fontSize: 16, fontFamily: 'inherit' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#1e2b22' }}>Votre métier</label>
                      <select name="profession" value={formData.profession} onChange={handleChange} style={{ width: '100%', padding: '12px 16px', border: '1px solid #ddd', borderRadius: 8, fontSize: 16, fontFamily: 'inherit', cursor: 'pointer' }}>
                        <option value="cuisiniste">Cuisiniste</option>
                        <option value="menuisier">Menuisier</option>
                        <option value="architecte">Architecte d&apos;intérieur</option>
                        <option value="agenceur">Agenceur</option>
                        <option value="autre">Autre</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#1e2b22' }}>Taille de votre équipe</label>
                      <select name="teamSize" value={formData.teamSize} onChange={handleChange} style={{ width: '100%', padding: '12px 16px', border: '1px solid #ddd', borderRadius: 8, fontSize: 16, fontFamily: 'inherit', cursor: 'pointer' }}>
                        <option value="solo">En solo</option>
                        <option value="2-5">2 à 5 personnes</option>
                        <option value="6-10">6 à 10 personnes</option>
                        <option value="11-20">11 à 20 personnes</option>
                        <option value="20+">Plus de 20 personnes</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: '#1e2b22' }}>Message optionnel</label>
                      <textarea name="message" value={formData.message} onChange={handleChange} placeholder="Parlez-nous de votre activité et vos besoins spécifiques..." rows={4} style={{ width: '100%', padding: '12px 16px', border: '1px solid #ddd', borderRadius: 8, fontSize: 16, fontFamily: 'inherit', resize: 'none' }} />
                    </div>
                    <button
                      type="submit"
                      style={{ background: '#1e2b22', color: '#ffffff', border: 'none', padding: '16px 32px', borderRadius: 8, fontSize: 18, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                      onMouseOver={(e) => { (e.target as HTMLElement).style.background = '#304035'; }}
                      onMouseOut={(e) => { (e.target as HTMLElement).style.background = '#1e2b22'; }}
                    >
                      Réserver ma démo
                    </button>
                  </form>
                )}

                <p style={{ fontSize: 14, color: '#666', marginTop: 20, textAlign: 'center', borderTop: '1px solid #eee', paddingTop: 20 }}>
                  Nous vous contactons sous 24h sur vos informations de contact.
                </p>
              </div>

              {/* BÉNÉFICES COLONNE DROITE */}
              <div>
                <div style={{ marginBottom: 50 }}>
                  <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>Ce que couvre la démo</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[
                      { icon: MessageCircle, title: 'Gestion des dossiers', desc: 'Créez et suivez vos dossiers clients facilement' },
                      { icon: Users, title: 'Facturation automatisée', desc: 'Générez devis et factures en quelques clics' },
                      { icon: Calendar, title: 'Planning de chantier', desc: 'Organisez vos interventions et équipes' },
                      { icon: Lightbulb, title: 'Assistant IA', desc: 'Générez des rendus photo-réalistes instantanément' },
                    ].map(({ icon: Icon, title, desc }) => (
                      <div key={title} style={{ display: 'flex', gap: 12 }}>
                        <div style={{ color: '#c9a96e', marginTop: 2 }}><Icon size={20} /></div>
                        <div>
                          <p style={{ fontWeight: 600, marginBottom: 4 }}>{title}</p>
                          <p style={{ fontSize: 14, color: '#666', margin: 0 }}>{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 50 }}>
                  <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: '#1e2b22' }}>À quoi s&apos;attendre</h3>
                  <div style={{ background: '#f5f5f5', padding: 20, borderRadius: 12 }}>
                    {[
                      { time: "5'", title: 'Présentation et questions', desc: 'Échange sur votre activité et objectifs' },
                      { time: "15'", title: 'Démonstration interactive', desc: 'Parcourez les fonctionnalités principales' },
                      { time: "10'", title: 'Plan personnalisé', desc: 'Discutez du meilleur plan pour vous' },
                    ].map(({ time, title, desc }, i) => (
                      <div key={i} style={{ marginBottom: i < 2 ? 16 : 0, display: 'flex', gap: 12 }}>
                        <div style={{ minWidth: 40, height: 40, background: '#1e2b22', color: '#ffffff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>{time}</div>
                        <div>
                          <p style={{ fontWeight: 600, margin: '0 0 4px 0' }}>{title}</p>
                          <p style={{ fontSize: 14, color: '#666', margin: 0 }}>{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section style={{ padding: '80px 20px', background: '#f9f9f9' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 40, textAlign: 'center', color: '#1e2b22' }}>Questions fréquemment posées</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { q: "C'est payant ?", a: "Non, la démo est entièrement gratuite et sans engagement. AVRA est en bêta privée : après la démo, vous pouvez être invité à rejoindre les early adopters ou être ajouté à la liste d'attente pour le lancement public en juillet 2026." },
                { q: "Je dois me préparer ?", a: "Pas du tout ! La démo est pensée pour être accessible à tous. Préparez simplement une liste de vos besoins spécifiques si possible, pour une discussion plus personnalisée." },
                { q: "Quel format ? Appel vidéo ?", a: "Oui, la démo se fait par appel vidéo ou téléphonique selon votre préférence. Nous vous enverrons un lien de réunion avant la séance." },
              ].map(({ q, a }) => (
                <div key={q} style={{ background: '#ffffff', padding: 24, borderRadius: 12, border: '1px solid #eee' }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: '#1e2b22' }}>{q}</h3>
                  <p style={{ fontSize: 16, color: '#666', margin: 0 }}>{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
