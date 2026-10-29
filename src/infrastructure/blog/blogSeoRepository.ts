/**
 * Infrastructure Layer: server-side reads of published blog posts
 *
 * Backs server.ts's per-article SSR SEO metadata (/blog/:slug) and the
 * dynamic sitemap. Relies entirely on the "blog_posts_public_read" RLS
 * policy (status='published' AND visibility='public' AND deleted_at IS
 * NULL) — the anon key is sufficient, no service-role key needed.
 */

import { getSupabaseAnonClient } from '../supabase/supabaseAnonClient';

export interface BlogPostSeoData {
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  featuredImage: string | null;
  featuredImageAlt: string | null;
  publishedAt: string | null;
  updatedAt: string;
  authorName: string | null;
  categoryName: string | null;
  contentHtml: string;
}

export interface BlogPostSitemapEntry {
  slug: string;
  updatedAt: string;
}

export async function getPublishedBlogPostForSeo(slug: string): Promise<BlogPostSeoData | null> {
  const client = getSupabaseAnonClient();
  if (!client) return null;

  const { data, error } = await client
    .from('blog_posts')
    .select(
      'slug, title, subtitle, excerpt, seo_title, seo_description, featured_image, featured_image_alt, published_at, updated_at, content_html, author:blog_authors(display_name), category:blog_categories(name)'
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('visibility', 'public')
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !data) return null;

  const author = Array.isArray(data.author) ? data.author[0] : data.author;
  const category = Array.isArray(data.category) ? data.category[0] : data.category;

  return {
    slug: data.slug,
    title: data.title,
    subtitle: data.subtitle,
    excerpt: data.excerpt,
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
    featuredImage: data.featured_image,
    featuredImageAlt: data.featured_image_alt,
    publishedAt: data.published_at,
    updatedAt: data.updated_at,
    authorName: author?.display_name ?? null,
    categoryName: category?.name ?? null,
    contentHtml: data.content_html || '',
  };
}

export async function listPublishedBlogPostsForSitemap(): Promise<BlogPostSitemapEntry[]> {
  const client = getSupabaseAnonClient();
  if (!client) return [];

  const { data, error } = await client
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('status', 'published')
    .eq('visibility', 'public')
    .is('deleted_at', null)
    .order('published_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row: { slug: string; updated_at: string }) => ({ slug: row.slug, updatedAt: row.updated_at }));
}
