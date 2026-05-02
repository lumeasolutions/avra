'use client';

/**
 * ArticleBlocks — composants visuels reutilisables pour les articles longs.
 *
 * Tous purement presentationnels, sans state metier. Vise un rendu
 * "magazine premium" coherent avec le branding AVRA (vert profond + or).
 */

import Link from 'next/link';
import {
  AlertTriangle, CheckCircle2, Info, Lightbulb, Sparkles, ArrowRight,
  ChevronDown, ChevronUp, Star,
} from 'lucide-react';
import { useState } from 'react';

// ─── Callout ──────────────────────────────────────────────────────────────────
type CalloutVariant = 'tip' | 'warning' | 'info' | 'insight';

const calloutStyles: Record<CalloutVariant, { bg: string; border: string; color: string; icon: React.ReactNode; label: string }> = {
  tip: { bg: 'linear-gradient(135deg, rgba(201,169,110,0.12), rgba(201,169,110,0.04))', border: 'rgba(201,169,110,0.4)', color: '#8c7a4e', icon: <Lightbulb size={20} aria-hidden />, label: 'Conseil pratique' },
  warning: { bg: 'linear-gradient(135deg, rgba(255,193,7,0.10), rgba(255,193,7,0.03))', border: 'rgba(255,193,7,0.45)', color: '#856404', icon: <AlertTriangle size={20} aria-hidden />, label: 'Attention' },
  info: { bg: 'linear-gradient(135deg, rgba(56,108,176,0.08), rgba(56,108,176,0.02))', border: 'rgba(56,108,176,0.35)', color: '#1e3a5f', icon: <Info size={20} aria-hidden />, label: 'À savoir' },
  insight: { bg: 'linear-gradient(135deg, rgba(30,43,34,0.06), rgba(30,43,34,0.02))', border: 'rgba(30,43,34,0.25)', color: '#1e2b22', icon: <Sparkles size={20} aria-hidden />, label: 'Insight AVRA' },
};

export function Callout({ variant = 'tip', title, children }: { variant?: CalloutVariant; title?: string; children: React.ReactNode }) {
  const s = calloutStyles[variant];
  return (
    <aside
      role="note"
      style={{
        margin: '32px 0',
        padding: '20px 24px',
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: '14px',
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-start',
      }}
    >
      <div style={{ color: s.color, marginTop: '2px', flexShrink: 0 }}>{s.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: s.color, marginBottom: '6px' }}>
          {title || s.label}
        </div>
        <div style={{ color: '#1e2b22', fontSize: '1rem', lineHeight: 1.65 }}>{children}</div>
      </div>
    </aside>
  );
}

// ─── KeyTakeaways ─────────────────────────────────────────────────────────────
export function KeyTakeaways({ items }: { items: string[] }) {
  return (
    <section
      aria-labelledby="key-takeaways"
      style={{
        margin: '32px 0 48px',
        padding: '28px 32px',
        background: 'linear-gradient(135deg, #1e2b22, #15201a)',
        color: '#f9f6f0',
        borderRadius: '18px',
        boxShadow: '0 20px 50px -20px rgba(30,43,34,0.45)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div aria-hidden style={{ position: 'absolute', right: '-60px', top: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,0.22), transparent 70%)', filter: 'blur(20px)' }} />
      <h3 id="key-takeaways" style={{ fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#e8c97a', margin: '0 0 18px', fontWeight: 700, position: 'relative' }}>
        Ce qu'il faut retenir
      </h3>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
        {items.map((it, i) => (
          <li key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', fontSize: '1.02rem', lineHeight: 1.55, color: 'rgba(249,246,240,0.92)' }}>
            <CheckCircle2 size={20} style={{ color: '#e8c97a', flexShrink: 0, marginTop: '3px' }} aria-hidden />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── StatGrid ─────────────────────────────────────────────────────────────────
export function StatGrid({ stats }: { stats: { value: string; label: string; sub?: string }[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, minmax(0, 1fr))`,
        gap: '16px',
        margin: '32px 0',
      }}
    >
      {stats.map((s, i) => (
        <div
          key={i}
          style={{
            padding: '24px 20px',
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid rgba(201,169,110,0.18)',
            boxShadow: '0 4px 16px -8px rgba(30,43,34,0.08)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontFamily: 'var(--font-playfair-display, Playfair Display), Georgia, serif', fontSize: '2rem', fontWeight: 800, color: '#c9a96e', lineHeight: 1, marginBottom: '8px' }}>{s.value}</div>
          <div style={{ fontSize: '0.92rem', color: '#1e2b22', fontWeight: 600, marginBottom: s.sub ? '4px' : 0 }}>{s.label}</div>
          {s.sub && <div style={{ fontSize: '0.78rem', color: '#6b7c70' }}>{s.sub}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── ChecklistCard ────────────────────────────────────────────────────────────
export function ChecklistCard({ title, items }: { title: string; items: { label: string; help?: string }[] }) {
  return (
    <div
      style={{
        margin: '32px 0',
        padding: '28px 32px',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid rgba(201,169,110,0.22)',
        boxShadow: '0 6px 24px -12px rgba(30,43,34,0.1)',
      }}
    >
      <h3 style={{ margin: '0 0 18px', fontSize: '1.15rem', color: '#1e2b22', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700 }}>
        <Star size={18} style={{ color: '#c9a96e' }} aria-hidden /> {title}
      </h3>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {items.map((it, i) => (
          <li key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <CheckCircle2 size={18} style={{ color: '#c9a96e', flexShrink: 0, marginTop: '4px' }} aria-hidden />
            <div>
              <div style={{ color: '#1e2b22', fontWeight: 600, fontSize: '1rem' }}>{it.label}</div>
              {it.help && <div style={{ color: '#6b7c70', fontSize: '0.92rem', marginTop: '2px' }}>{it.help}</div>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── ComparisonTable ──────────────────────────────────────────────────────────
export function ComparisonTable({ headers, rows, highlightCol }: { headers: string[]; rows: (string | React.ReactNode)[][]; highlightCol?: number }) {
  return (
    <div style={{ margin: '32px 0', overflowX: 'auto', borderRadius: '14px', border: '1px solid #ede5dd' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px', fontSize: '0.95rem' }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                style={{
                  textAlign: 'left',
                  padding: '14px 16px',
                  background: highlightCol === i ? 'linear-gradient(135deg, #1e2b22, #15201a)' : '#f9f6f0',
                  color: highlightCol === i ? '#e8c97a' : '#1e2b22',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  borderBottom: '1px solid #ede5dd',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? '#ffffff' : '#fbfaf6' }}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: '14px 16px',
                    color: highlightCol === ci ? '#1e2b22' : '#3a4a40',
                    fontWeight: highlightCol === ci ? 600 : 400,
                    background: highlightCol === ci ? 'rgba(201,169,110,0.07)' : 'transparent',
                    borderBottom: ri === rows.length - 1 ? 'none' : '1px solid #f0eae0',
                    verticalAlign: 'top',
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
export function FAQ({ items }: { items: { q: string; a: React.ReactNode }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div style={{ margin: '24px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            background: '#ffffff',
            border: '1px solid rgba(201,169,110,0.18)',
            borderRadius: '12px',
            overflow: 'hidden',
            transition: 'border-color 0.2s ease',
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
            style={{
              width: '100%',
              padding: '18px 22px',
              background: 'transparent',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              fontFamily: 'inherit',
              fontSize: '1.02rem',
              fontWeight: 600,
              color: '#1e2b22',
            }}
          >
            <span>{it.q}</span>
            {open === i ? <ChevronUp size={20} style={{ color: '#c9a96e', flexShrink: 0 }} /> : <ChevronDown size={20} style={{ color: '#c9a96e', flexShrink: 0 }} />}
          </button>
          {open === i && (
            <div
              style={{
                padding: '0 22px 22px',
                color: '#3a4a40',
                fontSize: '1rem',
                lineHeight: 1.7,
                borderTop: '1px solid #f0eae0',
                paddingTop: '16px',
              }}
            >
              {it.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── FinalCTA ─────────────────────────────────────────────────────────────────
export function FinalCTA({
  title = 'Prêt à transformer votre activité ?',
  subtitle = 'Rejoignez la bêta privée AVRA et soyez parmi les premiers à utiliser le seul ERP avec IA pensé pour votre métier.',
  primary = { href: '/rejoindre', label: 'Rejoindre la liste d\'attente' },
  secondary = { href: '/demo', label: 'Demander une démo' },
}: {
  title?: string;
  subtitle?: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section
      style={{
        margin: '64px 0 16px',
        padding: '40px',
        background: 'linear-gradient(135deg, #1e2b22 0%, #15201a 70%, #1e2b22 100%)',
        borderRadius: '20px',
        color: '#f9f6f0',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 30px 60px -25px rgba(30,43,34,0.5)',
      }}
    >
      <div aria-hidden style={{ position: 'absolute', right: '-100px', top: '-100px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,0.22), transparent 70%)', filter: 'blur(40px)' }} />
      <div aria-hidden style={{ position: 'absolute', left: '-80px', bottom: '-80px', width: '240px', height: '240px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,201,122,0.12), transparent 70%)', filter: 'blur(30px)' }} />
      <div style={{ position: 'relative', textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#e8c97a', marginBottom: '16px', fontWeight: 700 }}>
          <Sparkles size={14} aria-hidden /> Bêta privée · Lancement juillet 2026
        </div>
        <h2 style={{ fontFamily: 'var(--font-playfair-display, Playfair Display), Georgia, serif', fontSize: 'clamp(1.6rem, 3vw, 2.3rem)', margin: '0 0 14px', fontWeight: 800, lineHeight: 1.15 }}>
          {title}
        </h2>
        <p style={{ fontSize: '1.08rem', color: 'rgba(249,246,240,0.85)', lineHeight: 1.6, margin: '0 0 28px' }}>
          {subtitle}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href={primary.href}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 28px',
              background: 'linear-gradient(135deg, #e8c97a, #c9a96e)',
              color: '#1e2b22',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '1rem',
              boxShadow: '0 10px 30px -10px rgba(201,169,110,0.5)',
            }}
          >
            {primary.label} <ArrowRight size={18} />
          </Link>
          <Link
            href={secondary.href}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '14px 28px',
              background: 'transparent',
              color: '#f9f6f0',
              border: '1px solid rgba(249,246,240,0.3)',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '1rem',
            }}
          >
            {secondary.label}
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── PullQuote ────────────────────────────────────────────────────────────────
export function PullQuote({ children, author }: { children: React.ReactNode; author?: string }) {
  return (
    <figure style={{ margin: '40px 0', textAlign: 'center', borderTop: '1px solid #ede5dd', borderBottom: '1px solid #ede5dd', padding: '32px 16px' }}>
      <blockquote style={{ margin: 0, padding: 0, background: 'transparent', border: 'none', borderRadius: 0, fontFamily: 'var(--font-playfair-display, Playfair Display), Georgia, serif', fontSize: 'clamp(1.3rem, 2.4vw, 1.7rem)', color: '#1e2b22', fontStyle: 'italic', lineHeight: 1.4, fontWeight: 500 }}>
        « {children} »
      </blockquote>
      {author && <figcaption style={{ marginTop: '14px', fontSize: '0.85rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8c7a4e', fontWeight: 600 }}>{author}</figcaption>}
    </figure>
  );
}

// ─── RelatedArticles ──────────────────────────────────────────────────────────
export function RelatedArticles({ items }: { items: { href: string; title: string; description: string; tag?: string }[] }) {
  return (
    <section style={{ margin: '64px 0 0', borderTop: '1px solid #ede5dd', paddingTop: '40px' }}>
      <h3 style={{ fontFamily: 'var(--font-playfair-display, Playfair Display), Georgia, serif', fontSize: '1.5rem', marginBottom: '20px', color: '#1e2b22' }}>
        Pour aller plus loin
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {items.map((it, i) => (
          <Link
            key={i}
            href={it.href}
            style={{
              display: 'block',
              padding: '20px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid rgba(201,169,110,0.18)',
              textDecoration: 'none',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
          >
            {it.tag && <div style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#c9a96e', fontWeight: 700, marginBottom: '8px' }}>{it.tag}</div>}
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e2b22', marginBottom: '6px', lineHeight: 1.3 }}>{it.title}</div>
            <div style={{ fontSize: '0.92rem', color: '#6b7c70', lineHeight: 1.5 }}>{it.description}</div>
            <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#c9a96e', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              Lire l'article <ArrowRight size={14} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
