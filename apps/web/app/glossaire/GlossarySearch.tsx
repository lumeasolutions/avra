'use client';

/**
 * GlossarySearch — composant interactif de recherche dans le glossaire.
 *
 * Recherche client-side instantanee sur term + definition (insensible
 * a la casse et aux accents). Pas de backend, pas de framework lourd —
 * un useMemo suffit pour 80 termes.
 *
 * Affiche aussi le sommaire alphabetique sticky avec ancres et le
 * filtre par categorie. Quand l'utilisateur tape, on bascule en mode
 * "resultats" (categories cachees, termes filtres en grille plate).
 */

import { useState, useMemo } from 'react';
import { Search, X, BookOpen } from 'lucide-react';
import type { GlossaryCategory, GlossaryTerm } from './data';

interface GlossarySearchProps {
  glossary: GlossaryCategory[];
  alphaIndex: Record<string, GlossaryTerm[]>;
  availableLetters: string[];
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export default function GlossarySearch({ glossary, alphaIndex, availableLetters }: GlossarySearchProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Recherche normalisee (sans accents, lower)
  const queryNorm = normalize(query.trim());

  // Liste plate filtree
  const filtered = useMemo(() => {
    if (!queryNorm) return null;
    const all = glossary.flatMap((c) => c.terms.map((t) => ({ ...t, categoryId: c.id, categoryLabel: c.label })));
    return all.filter((t) => normalize(t.term).includes(queryNorm) || normalize(t.definition).includes(queryNorm));
  }, [queryNorm, glossary]);

  const visibleCategories = useMemo(() => {
    if (!activeCategory) return glossary;
    return glossary.filter((c) => c.id === activeCategory);
  }, [glossary, activeCategory]);

  return (
    <>
      {/* ─── Barre de recherche + filtres categories ───────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: 24,
          marginBottom: 32,
          boxShadow: '0 4px 20px -8px rgba(30,43,34,0.12)',
          border: '1px solid rgba(201,169,110,0.2)',
        }}
      >
        <label
          htmlFor="glossary-search"
          style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8c7a4e', marginBottom: 8 }}
        >
          Rechercher un terme
        </label>
        <div style={{ position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6b7c70' }} aria-hidden />
          <input
            id="glossary-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex : caisson, blumotion, e-facture..."
            aria-label="Rechercher un terme dans le glossaire"
            style={{
              width: '100%',
              padding: '14px 44px 14px 46px',
              fontSize: '1rem',
              border: '1px solid rgba(30,43,34,0.18)',
              borderRadius: 10,
              outline: 'none',
              background: '#fbfaf6',
              color: '#1e2b22',
              fontFamily: 'inherit',
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Effacer la recherche"
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7c70',
                padding: 6,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Filtres categories (caches en mode recherche) */}
        {!queryNorm && (
          <div role="toolbar" aria-label="Filtrer par categorie" style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              aria-pressed={activeCategory === null}
              style={pillStyle(activeCategory === null, true)}
            >
              Toutes les categories
            </button>
            {glossary.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(activeCategory === c.id ? null : c.id)}
                aria-pressed={activeCategory === c.id}
                style={pillStyle(activeCategory === c.id, false)}
              >
                {c.label} <span style={{ opacity: 0.6, marginLeft: 4 }}>({c.terms.length})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Resultats de recherche (mode plat) ─────────────────────────────── */}
      {queryNorm && filtered && (
        <section aria-live="polite" style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: 'var(--font-playfair-display, Playfair Display), Georgia, serif', fontSize: '1.6rem', color: '#1e2b22', marginBottom: 8 }}>
            {filtered.length === 0 ? 'Aucun resultat' : `${filtered.length} resultat${filtered.length > 1 ? 's' : ''}`}
          </h2>
          <p style={{ color: '#6b7c70', marginBottom: 24 }}>
            pour "{query}"{filtered.length === 0 ? ' — essayez un autre terme.' : ''}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {filtered.map((t) => (
              <article
                key={t.id}
                id={t.id}
                style={{
                  padding: 20,
                  background: '#ffffff',
                  borderRadius: 12,
                  border: '1px solid rgba(201,169,110,0.18)',
                  boxShadow: '0 2px 12px -6px rgba(30,43,34,0.08)',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 6 }}>
                  {(t as any).categoryLabel}
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e2b22', margin: '0 0 10px' }}>
                  {t.term}
                </h3>
                <p style={{ color: '#3a4a40', fontSize: '0.96rem', lineHeight: 1.6, margin: 0 }}>
                  {t.definition}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ─── Mode normal : sommaire alphabetique + categories ──────────────── */}
      {!queryNorm && (
        <>
          {/* Sommaire alphabetique */}
          <nav aria-label="Index alphabetique" style={{ marginBottom: 40, padding: 20, background: '#ffffff', borderRadius: 14, border: '1px solid rgba(201,169,110,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color: '#8c7a4e', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <BookOpen size={14} aria-hidden /> Index alphabetique
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {availableLetters.map((l) => (
                <a
                  key={l}
                  href={`#letter-${l}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: 'rgba(201,169,110,0.1)',
                    color: '#8c7a4e',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    border: '1px solid rgba(201,169,110,0.2)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {l}
                </a>
              ))}
            </div>
          </nav>

          {/* Categories filtrees */}
          {visibleCategories.map((cat) => (
            <section key={cat.id} id={`cat-${cat.id}`} style={{ marginBottom: 56 }}>
              <h2
                style={{
                  fontFamily: 'var(--font-playfair-display, Playfair Display), Georgia, serif',
                  fontSize: 'clamp(1.6rem, 2.4vw, 2rem)',
                  color: '#1e2b22',
                  margin: '0 0 8px',
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                }}
              >
                {cat.label}
              </h2>
              <p style={{ color: '#6b7c70', fontSize: '0.98rem', marginBottom: 24 }}>
                {cat.description} · {cat.terms.length} termes
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
                {cat.terms.map((t) => {
                  const firstLetter = t.term.charAt(0).toUpperCase();
                  const sameLetter = alphaIndex[firstLetter] || [];
                  const isFirstOfLetter = sameLetter[0]?.id === t.id;
                  return (
                    <article
                      key={t.id}
                      id={t.id}
                      style={{
                        position: 'relative',
                        padding: 20,
                        background: '#ffffff',
                        borderRadius: 12,
                        border: '1px solid rgba(201,169,110,0.18)',
                        boxShadow: '0 2px 12px -6px rgba(30,43,34,0.08)',
                      }}
                    >
                      {isFirstOfLetter && <span id={`letter-${firstLetter}`} style={{ position: 'absolute', top: -120 }} />}
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e2b22', margin: '0 0 10px' }}>
                        {t.term}
                      </h3>
                      <p style={{ color: '#3a4a40', fontSize: '0.96rem', lineHeight: 1.6, margin: 0 }}>
                        {t.definition}
                      </p>
                      {t.related && t.related.length > 0 && (
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #ede5dd', fontSize: '0.85rem' }}>
                          <span style={{ color: '#8c7a4e', fontWeight: 600, marginRight: 6 }}>A lire :</span>
                          {t.related.map((r, i) => (
                            <span key={r.href}>
                              <a href={r.href} style={{ color: '#c9a96e', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                                {r.label}
                              </a>
                              {i < t.related!.length - 1 && <span style={{ color: '#6b7c70' }}> · </span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}
    </>
  );
}

function pillStyle(active: boolean, isAll: boolean): React.CSSProperties {
  if (active) {
    return {
      padding: '8px 16px',
      borderRadius: 999,
      border: `1px solid ${isAll ? '#1e2b22' : '#c9a96e'}`,
      background: isAll ? '#1e2b22' : 'rgba(201,169,110,0.18)',
      color: isAll ? '#f9f6f0' : '#8c7a4e',
      fontSize: '0.88rem',
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: 'inherit',
    };
  }
  return {
    padding: '8px 16px',
    borderRadius: 999,
    border: '1px solid rgba(30,43,34,0.18)',
    background: '#ffffff',
    color: '#3a4a40',
    fontSize: '0.88rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };
}
