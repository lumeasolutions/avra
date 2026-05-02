'use client';

/**
 * ArticleShell — squelette premium pour les articles de blog AVRA.
 *
 * Hero gradient sombre + or, sommaire sticky desktop, mobile collapsible,
 * reading progress bar, conteneur typographique optimisé.
 *
 * Le CSS global est injecté via une balise <style> standard avec
 * dangerouslySetInnerHTML (et non styled-jsx) pour éviter les soucis swc
 * que styled-jsx peut introduire avec :global() dans certains contextes
 * Next.js 14 / RSC.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Calendar, Clock, ArrowLeft, ChevronRight, Menu, X } from 'lucide-react';
import Nav from '../../(marketing)/components/Nav';
import Footer from '../../(marketing)/components/Footer';
import ScrollReveal from '../../(marketing)/components/ScrollReveal';

const ARTICLE_SHELL_CSS = `
.avra-shell-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.avra-article-grid {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 56px;
  align-items: start;
}
.avra-toc-inner {
  position: sticky;
  top: 96px;
  padding: 24px;
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid rgba(201,169,110,0.18);
  box-shadow: 0 8px 30px -10px rgba(30,43,34,0.08);
}
.avra-article-body {
  font-size: 1.07rem;
  line-height: 1.78;
  color: #1e2b22;
  max-width: 720px;
}
.avra-article-body h2 {
  font-family: var(--font-playfair-display, Playfair Display), Georgia, serif;
  font-size: clamp(1.6rem, 2.4vw, 2rem);
  line-height: 1.2;
  margin: 56px 0 16px;
  color: #1e2b22;
  font-weight: 800;
  letter-spacing: -0.01em;
}
.avra-article-body h2:first-child { margin-top: 0; }
.avra-article-body h3 {
  font-size: 1.3rem;
  line-height: 1.35;
  margin: 32px 0 12px;
  color: #1e2b22;
  font-weight: 700;
}
.avra-article-body p { margin: 0 0 18px; }
.avra-article-body p strong { color: #1e2b22; font-weight: 700; }
.avra-article-body a { color: #c9a96e; text-decoration: underline; text-underline-offset: 3px; }
.avra-article-body a:hover { color: #b18f50; }
.avra-article-body ul,
.avra-article-body ol { padding-left: 24px; margin: 0 0 22px; }
.avra-article-body li { margin-bottom: 10px; }
.avra-article-body li::marker { color: #c9a96e; }
.avra-article-body blockquote {
  margin: 32px 0;
  padding: 24px 28px;
  background: linear-gradient(135deg, rgba(201,169,110,0.08), rgba(201,169,110,0.02));
  border-left: 4px solid #c9a96e;
  border-radius: 0 12px 12px 0;
  font-style: italic;
  color: #1e2b22;
  font-size: 1.1rem;
  line-height: 1.6;
}
.avra-article-body blockquote cite {
  display: block;
  margin-top: 12px;
  font-size: 0.88rem;
  color: #6b7c70;
  font-style: normal;
  font-weight: 600;
}
.avra-toc-mobile-toggle-show { display: none; }

@media (max-width: 960px) {
  .avra-article-grid { grid-template-columns: 1fr; gap: 24px; }
  .avra-toc {
    position: fixed;
    inset: 0;
    background: rgba(15,24,16,0.55);
    backdrop-filter: blur(4px);
    z-index: 50;
    padding: 80px 24px 24px;
    display: none;
    overflow-y: auto;
  }
  .avra-toc--open { display: block; }
  .avra-toc-inner {
    position: static;
    max-width: 540px;
    margin: 0 auto;
  }
  .avra-toc-mobile-toggle-show { display: inline-flex !important; }
}
`;

export type TocItem = { id: string; label: string; sub?: { id: string; label: string }[] };

export interface ArticleShellProps {
  category: string;
  title: string;
  subtitle: string;
  date: string;
  readTime: string;
  author?: { name: string; role: string };
  toc: TocItem[];
  children: React.ReactNode;
}

export default function ArticleShell({
  category,
  title,
  subtitle,
  date,
  readTime,
  author = { name: 'L\'equipe AVRA', role: 'Pros de l\'agencement' },
  toc,
  children,
}: ArticleShellProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);

  useEffect(() => {
    const ids = toc.flatMap((item) => [item.id, ...(item.sub?.map((s) => s.id) || [])]);
    const handler = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setReadingProgress(docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0);

      let current = '';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120) current = id;
      }
      setActiveId(current);
    };
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [toc]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ARTICLE_SHELL_CSS }} />
      <ScrollReveal />
      <Nav />

      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'rgba(201, 169, 110, 0.12)',
          zIndex: 60,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${readingProgress}%`,
            background: 'linear-gradient(90deg, #c9a96e, #e8c97a)',
            transition: 'width 80ms linear',
          }}
        />
      </div>

      <header
        style={{
          background:
            'radial-gradient(120% 100% at 50% 0%, rgba(201,169,110,0.18), transparent 60%), linear-gradient(180deg, #1e2b22 0%, #15201a 100%)',
          color: '#f9f6f0',
          paddingTop: '88px',
          paddingBottom: '72px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div className="avra-shell-container" style={{ position: 'relative', zIndex: 2 }}>
          <nav
            aria-label="Fil d'Ariane"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'rgba(249,246,240,0.65)', marginBottom: '24px' }}
          >
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Accueil</Link>
            <ChevronRight size={14} aria-hidden />
            <Link href="/blog" style={{ color: 'inherit', textDecoration: 'none' }}>Blog</Link>
            <ChevronRight size={14} aria-hidden />
            <span style={{ color: '#c9a96e' }}>{category}</span>
          </nav>

          <span
            style={{
              display: 'inline-block',
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'rgba(201,169,110,0.14)',
              border: '1px solid rgba(201,169,110,0.35)',
              color: '#e8c97a',
              fontSize: '0.78rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '24px',
            }}
          >
            {category}
          </span>

          <h1
            style={{
              fontFamily: 'var(--font-playfair-display, Playfair Display), Georgia, serif',
              fontSize: 'clamp(2.2rem, 5.6vw, 4rem)',
              lineHeight: 1.08,
              fontWeight: 800,
              margin: '0 0 20px 0',
              letterSpacing: '-0.02em',
              maxWidth: '900px',
            }}
          >
            {title}
          </h1>

          <p
            style={{
              fontSize: 'clamp(1.05rem, 1.8vw, 1.3rem)',
              lineHeight: 1.55,
              color: 'rgba(249,246,240,0.78)',
              maxWidth: '760px',
              margin: '0 0 32px 0',
            }}
          >
            {subtitle}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', color: 'rgba(249,246,240,0.7)', fontSize: '0.95rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} aria-hidden /> <time>{date}</time>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} aria-hidden /> {readTime}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #c9a96e, #8c7a4e)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: '#1e2b22',
                  fontSize: '0.85rem',
                }}
                aria-hidden
              >
                {author.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
              </div>
              <span><strong style={{ color: '#f9f6f0' }}>{author.name}</strong> · {author.role}</span>
            </div>
          </div>
        </div>

        <div
          aria-hidden
          style={{
            position: 'absolute',
            right: '-120px',
            top: '-120px',
            width: '420px',
            height: '420px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201,169,110,0.18), transparent 70%)',
            filter: 'blur(40px)',
            zIndex: 1,
          }}
        />
      </header>

      <div style={{ background: '#f9f6f0', borderBottom: '1px solid #ede5dd' }}>
        <div className="avra-shell-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
          <Link
            href="/blog"
            style={{ color: '#6b7c70', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: 500 }}
          >
            <ArrowLeft size={18} aria-hidden /> Retour au blog
          </Link>
          <button
            type="button"
            onClick={() => setMobileTocOpen((v) => !v)}
            className="avra-toc-mobile-toggle-show"
            style={{
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(201,169,110,0.4)',
              background: '#fff',
              borderRadius: '999px',
              padding: '6px 12px',
              fontSize: '0.85rem',
              color: '#1e2b22',
              cursor: 'pointer',
            }}
            aria-expanded={mobileTocOpen}
          >
            {mobileTocOpen ? <X size={16} /> : <Menu size={16} />} Sommaire
          </button>
        </div>
      </div>

      <div style={{ background: '#f9f6f0' }}>
        <div className="avra-shell-container avra-article-grid" style={{ paddingTop: '48px', paddingBottom: '64px' }}>
          <aside className={`avra-toc${mobileTocOpen ? ' avra-toc--open' : ''}`} aria-label="Sommaire">
            <div className="avra-toc-inner">
              <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8c7a4e', marginBottom: '16px' }}>
                Sommaire
              </div>
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {toc.map((item, i) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      onClick={() => setMobileTocOpen(false)}
                      style={{
                        display: 'block',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '0.92rem',
                        color: activeId === item.id ? '#1e2b22' : '#4f5e54',
                        background: activeId === item.id ? 'rgba(201,169,110,0.18)' : 'transparent',
                        fontWeight: activeId === item.id ? 600 : 500,
                        borderLeft: `2px solid ${activeId === item.id ? '#c9a96e' : 'transparent'}`,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ color: '#c9a96e', marginRight: '8px', fontFamily: 'Georgia, serif' }}>{String(i + 1).padStart(2, '0')}</span>
                      {item.label}
                    </a>
                    {item.sub && (
                      <ul style={{ listStyle: 'none', margin: '4px 0 4px 20px', padding: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {item.sub.map((s) => (
                          <li key={s.id}>
                            <a
                              href={`#${s.id}`}
                              onClick={() => setMobileTocOpen(false)}
                              style={{
                                display: 'block',
                                padding: '4px 10px',
                                fontSize: '0.85rem',
                                textDecoration: 'none',
                                color: activeId === s.id ? '#c9a96e' : '#6b7c70',
                                fontWeight: activeId === s.id ? 600 : 400,
                              }}
                            >
                              {s.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </aside>

          <article className="avra-article-body">
            {children}
          </article>
        </div>
      </div>

      <Footer />
    </>
  );
}
