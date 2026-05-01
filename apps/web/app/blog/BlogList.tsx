'use client';

import { useState, useMemo } from 'react';
import BlogArticleCard from './BlogArticleCard';

export type BlogArticle = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  tags: string[];
};

interface BlogListProps {
  articles: BlogArticle[];
}

/**
 * Liste interactive du blog avec filtre par tags.
 *
 * Avec 5 articles et 12+ tags uniques, le filtre devient utile pour
 * naviguer rapidement vers une thematique. Au-dela de 10 articles,
 * envisager d'ajouter aussi une recherche full-text cote client.
 *
 * Le filtre est purement client side (pas de query string a ce stade,
 * pour eviter de complexifier la canonical SEO de /blog).
 */
export default function BlogList({ articles }: BlogListProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Tous les tags uniques, tries par frequence (les plus utilises en premier)
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of articles) {
      for (const t of a.tags) counts.set(t, (counts.get(t) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([t]) => t);
  }, [articles]);

  const filtered = useMemo(() => {
    if (!activeTag) return articles;
    return articles.filter((a) => a.tags.includes(activeTag));
  }, [articles, activeTag]);

  return (
    <>
      {/* Filtres tags */}
      <div
        role="toolbar"
        aria-label="Filtrer les articles par tag"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '40px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTag(null)}
          aria-pressed={activeTag === null}
          style={{
            padding: '8px 16px',
            borderRadius: '999px',
            border: '1px solid',
            borderColor: activeTag === null ? '#1e2b22' : 'rgba(30,43,34,0.18)',
            background: activeTag === null ? '#1e2b22' : '#ffffff',
            color: activeTag === null ? '#f9f6f0' : '#1e2b22',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Tous ({articles.length})
        </button>
        {tags.map((t) => {
          const isActive = activeTag === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTag(isActive ? null : t)}
              aria-pressed={isActive}
              style={{
                padding: '8px 16px',
                borderRadius: '999px',
                border: '1px solid',
                borderColor: isActive ? '#c9a96e' : 'rgba(201,169,110,0.35)',
                background: isActive ? 'rgba(201,169,110,0.18)' : '#ffffff',
                color: isActive ? '#8c7a4e' : '#3a4a40',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Grille resultats */}
      {filtered.length === 0 ? (
        <p style={{ color: '#6b7c70', fontSize: '1rem', padding: '32px 0' }}>
          Aucun article ne correspond a ce tag pour l'instant.
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '32px',
          }}
        >
          {filtered.map((article) => (
            <BlogArticleCard
              key={article.slug}
              slug={article.slug}
              title={article.title}
              excerpt={article.excerpt}
              date={article.date}
              readTime={article.readTime}
              tags={article.tags}
              variant="list"
            />
          ))}
        </div>
      )}
    </>
  );
}
