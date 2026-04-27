'use client';

import { useEffect, useState } from 'react';
import { Mail, User as UserIcon, Building2, Phone, AtSign, ShieldCheck, Save, AlertCircle, CheckCircle2, Calendar, Copy, Download } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';

interface IntervenantProfile {
  id: string;
  type: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
}

/**
 * Page profil intervenant.
 *
 * Affiche les liens Intervenant (peut être plusieurs si lié à plusieurs workspaces)
 * + infos compte utilisateur. Pour la modification fine du compte
 * (mot de passe, email principal), on renvoie vers /parametres existant.
 */
export default function ProfilPage() {
  const user = useAuthStore((s) => s.user);
  const [profiles, setProfiles] = useState<IntervenantProfile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Endpoint qui retourne tous les Intervenant.where(userId = me).
        // Si pas encore exposé côté backend, le catch silencieux empêche l'écran
        // d'erreur. On affichera juste les infos compte du store.
        const data = await api<IntervenantProfile[]>('/intervenant-portal/profile');
        if (!cancelled) setProfiles(data);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? 'Erreur chargement profil');
          setProfiles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: '#1a2a1e', letterSpacing: '-0.02em' }}>
          Mon profil
        </h1>
        <p style={{ fontSize: 13, color: '#7c6c58', margin: '4px 0 0' }}>
          Vos informations personnelles et liens avec vos clients.
        </p>
      </div>

      {/* Compte */}
      <Section icon={<UserIcon size={16} />} title="Compte AVRA">
        <Field label="Nom" value={[user?.firstName, user?.lastName].filter(Boolean).join(' ') || '—'} />
        <Field label="Email" value={user?.email ?? '—'} />
        <Field label="Rôle" value={user?.role ?? '—'} />
        <p style={{ fontSize: 11, color: '#7c6c58', margin: '12px 0 0' }}>
          Pour modifier votre mot de passe ou ces informations, rendez-vous dans les paramètres.
        </p>
      </Section>

      {/* Liens Intervenant */}
      <Section icon={<Building2 size={16} />} title="Vos clients">
        {loading ? (
          <div style={{ height: 80, background: '#f5eee8', borderRadius: 10 }} />
        ) : !profiles || profiles.length === 0 ? (
          <div style={{
            padding: '20px 16px',
            background: '#fafaf8',
            borderRadius: 10,
            color: '#7c6c58',
            fontSize: 13,
            textAlign: 'center',
            border: '1px dashed #ddd5c7',
          }}>
            <AlertCircle size={20} style={{ color: '#cbb98a', marginBottom: 8 }} />
            <div>
              {error
                ? 'Impossible de charger les liens. Si vous venez de recevoir une invitation, ouvrez le lien reçu par email.'
                : 'Vous n\'êtes lié à aucun client pour le moment. Demandez à votre client de vous envoyer un lien d\'invitation.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {profiles.map((p) => (
              <ProfileCard key={p.id} profile={p} />
            ))}
          </div>
        )}
      </Section>

      {/* Phase D : Planning iCal — URL publique HMAC (compatible Google/Apple Calendar) */}
      <PlanningIcalSection />


      {/* Sécurité */}
      <Section icon={<ShieldCheck size={16} />} title="Sécurité">
        <div style={{
          padding: '14px 16px',
          background: '#f0fdf4',
          borderRadius: 10,
          border: '1px solid #bbf7d0',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <CheckCircle2 size={18} style={{ color: '#15803d', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13, color: '#14532d' }}>
            <div style={{ fontWeight: 600 }}>Connexion sécurisée</div>
            <div style={{ marginTop: 2, color: '#166534' }}>
              Vos identifiants sont protégés via cookies HttpOnly et chiffrement TLS.
              Aucune donnée bancaire n'est stockée sur votre compte intervenant.
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function PlanningIcalSection() {
  const [icalUrl, setIcalUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<{ path: string }>('/intervenant-portal/ical-url')
      .then((r) => {
        if (cancelled) return;
        // Construire URL absolue
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        setIcalUrl(`${origin}${r.path}`);
      })
      .catch(() => { if (!cancelled) setIcalUrl(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const copy = async () => {
    if (!icalUrl) return;
    try {
      await navigator.clipboard.writeText(icalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {/* noop */}
  };

  return (
    <Section icon={<Calendar size={16} />} title="Planning iCal">
      <p style={{ fontSize: 13, color: '#5b5045', lineHeight: 1.5, marginBottom: 12 }}>
        Synchronisez automatiquement vos interventions AVRA avec Google Calendar,
        Apple Calendar ou Outlook. Toutes les demandes planifiees apparaissent sur
        votre agenda habituel et se mettent a jour en temps reel.
      </p>
      {loading ? (
        <div style={{ height: 60, background: '#f5eee8', borderRadius: 10 }} />
      ) : !icalUrl ? (
        <div style={{ padding: 16, textAlign: 'center', color: '#7c6c58', fontSize: 13 }}>
          Lien indisponible.
        </div>
      ) : (
        <>
          <div style={{
            padding: '10px 14px', background: '#fafaf8',
            border: '1px solid #ece7df', borderRadius: 10,
            fontSize: 11, fontFamily: 'monospace',
            color: '#3D5449',
            marginBottom: 10,
            wordBreak: 'break-all',
          }}>
            {icalUrl}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a
              href={icalUrl}
              download="avra-planning.ics"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 16px',
                background: '#1a2a1e', color: '#cbb98a',
                borderRadius: 10, fontSize: 13, fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <Download size={14} /> Telecharger maintenant
            </a>
            <button
              onClick={copy}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 16px',
                background: copied ? '#15803d' : 'transparent',
                color: copied ? '#fff' : '#5b5045',
                border: copied ? 'none' : '1px solid #ddd5c7', borderRadius: 10,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Copy size={14} /> {copied ? 'Copie !' : 'Copier le lien'}
            </button>
          </div>
          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#3D5449' }}>
              Comment l'ajouter a votre calendrier ?
            </summary>
            <div style={{ marginTop: 8, fontSize: 12, color: '#5b5045', lineHeight: 1.5 }}>
              <p style={{ marginBottom: 6 }}><strong>Google Calendar :</strong> "Autres agendas" + "À partir de l'URL" → coller le lien.</p>
              <p style={{ marginBottom: 6 }}><strong>Apple Calendar :</strong> Fichier → "Nouvel abonnement à un calendrier" → coller le lien.</p>
              <p><strong>Outlook :</strong> "Ajouter un calendrier" → "Souscrire à partir du Web" → coller le lien.</p>
            </div>
          </details>
        </>
      )}
    </Section>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: '#fff',
      borderRadius: 18,
      padding: '20px 24px',
      marginBottom: 16,
      boxShadow: '0 2px 12px rgba(26,42,30,0.06)',
    }}>
      <h2 style={{
        fontSize: 13,
        fontWeight: 700,
        margin: '0 0 14px',
        color: '#3D5449',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '120px 1fr',
      padding: '10px 0',
      borderBottom: '1px solid #f5eee8',
      gap: 12,
      fontSize: 14,
    }}>
      <div style={{ color: '#7c6c58', fontSize: 12, fontWeight: 600, paddingTop: 1 }}>
        {label}
      </div>
      <div style={{ color: '#1a2a1e', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function ProfileCard({ profile }: { profile: IntervenantProfile }) {
  return (
    <div style={{
      padding: '14px 18px',
      background: '#fafaf8',
      borderRadius: 12,
      border: '1px solid #ece7df',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: '#7c6c58',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 6,
      }}>
        {profile.type}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2a1e', marginBottom: 4 }}>
        {profile.companyName || `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || '—'}
      </div>
      <div style={{ fontSize: 12, color: '#5b5045', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {profile.email && <span>📧 {profile.email}</span>}
        {profile.phone && <span>📞 {profile.phone}</span>}
      </div>
    </div>
  );
}
