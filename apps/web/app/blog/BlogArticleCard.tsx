'use client';

import Link from 'next/link';
import { Calendar, Clock, Tag } from 'lucide-react';

interface BlogArticleCardProps {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  tags: string[];
  variant?: 'featured' | 'list';
}

export default function BlogArticleCard({
  slug,
  title,
  excerpt,
  date,
  readTime,
  tags,
  variant = 'list'
}: BlogArticleCardProps) {
  if (variant === 'featured') {
    return (
      <Link href={`/blog/${slug}`} style={{ textDecoration: 'none' }}>
        <div
          className="reveal"
          style={{
            padding: '32px',
            background: '#f9f6f0',
            borderRadius: '12px',
            border: '2px solid rgba(201,169,110,0.25)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#c9a96e';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(201,169,110,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(201,169,110,0.25)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <h3 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px', lineHeight: 1.4 }}>
            {title}
          </h3>

          <p style={{ fontSize: '1rem', color: '#6b7c70', marginBottom: '16px', flex: 1, lineHeight: 1.6 }}>
            {excerpt}
          </p>

          <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem', color: '#6b7c70', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(201,169,110,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={16} />
              {date}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={16} />
              {readTime}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // List variant
  return (
    <Link href={`/blog/${slug}`} style={{ textDecoration: 'none' }}>
      <div
        className="reveal"
        style={{
          padding: '24px',
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid rgba(201,169,110,0.15)',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 24px rgba(30,43,34,0.12)'}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
      >
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e2b22', marginBottom: '12px' }}>
          {title}
        </h3>

        <p style={{ fontSize: '0.95rem', color: '#6b7c70', marginBottom: '12px', flex: 1 }}>
          {excerpt}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                background: 'rgba(201,169,110,0.1)',
                color: '#c9a96e',
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: 500
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', color: '#6b7c70', paddingTop: '12px', borderTop: '1px solid rgba(201,169,110,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Calendar size={14} />
            {date}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Clock size={14} />
            {readTime}
          </div>
        </div>
      </div>
    </Link>
  );
}
