// Client-side reads of published blog posts from the real blog_posts CMS
// table (replacing the old AdminStore/localStorage mock — see BlogPage.tsx
// and the security/SEO audit item 3.2). Relies on the "blog_posts_public_read"
// RLS policy, so the anon key is sufficient.

import { supabase } from '../lib/supabase';
import { Article, Section } from '../components/admin/adminData';

interface BlogPostRow {
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  content: { quote?: string; sections?: Section[] } | null;
  featured_image: string | null;
  reading_time_minutes: number | null;
  featured: boolean;
  published_at: string | null;
  author: { display_name: string; role_title: string | null; photo_url: string | null; bio: string | null } | { display_name: string; role_title: string | null; photo_url: string | null; bio: string | null }[] | null;
  category: { name: string } | { name: string }[] | null;
  tags: { tag: { name: string } | { name: string }[] | null }[] | null;
}

function firstOf<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapRowToArticle(row: BlogPostRow): Article {
  const author = firstOf(row.author);
  const category = firstOf(row.category);
  const tagNames = (row.tags || [])
    .map((t) => firstOf(t.tag)?.name)
    .filter((name): name is string => Boolean(name));

  return {
    id: row.slug,
    category: category?.name || 'Général',
    date: row.published_at ? row.published_at.slice(0, 10) : '',
    readTime: row.reading_time_minutes ? `${row.reading_time_minutes} min de lecture` : '',
    featured: row.featured,
    title: row.title,
    subtitle: row.subtitle || '',
    excerpt: row.excerpt || '',
    image: row.featured_image || '',
    quote: row.content?.quote || '',
    author: {
      name: author?.display_name || 'Lettrup',
      role: author?.role_title || '',
      avatar: author?.photo_url || '',
      bio: author?.bio || '',
    },
    tags: tagNames,
    sections: row.content?.sections || [],
  };
}

export async function listPublishedBlogPosts(): Promise<Article[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('blog_posts')
    .select(
      'slug, title, subtitle, excerpt, content, featured_image, reading_time_minutes, featured, published_at, author:blog_authors(display_name, role_title, photo_url, bio), category:blog_categories(name), tags:blog_post_tags(tag:blog_tags(name))'
    )
    .eq('status', 'published')
    .eq('visibility', 'public')
    .is('deleted_at', null)
    .order('published_at', { ascending: false });

  if (error || !data) {
    console.error('[blogService] Failed to load published posts:', error?.message);
    return [];
  }

  return (data as unknown as BlogPostRow[]).map(mapRowToArticle);
}
