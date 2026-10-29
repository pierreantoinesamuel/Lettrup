import { z } from 'zod';
import type { Article, Section } from '../../components/admin/adminData';
import { getSupabaseAdminClient } from '../supabase/supabaseAdminClient';
import { verifySupabaseUser } from '../auth/verifySupabaseUser';

export interface AdminBlogPostsResponse {
  success: boolean;
  error?: string;
  articles?: Article[];
}

const authorSchema = z.object({
  name: z.string().trim().min(1).max(160),
  role: z.string().trim().max(160).default(''),
  avatar: z.string().trim().max(2000).default(''),
  bio: z.string().trim().max(1000).default(''),
});

const sectionSchema = z.object({
  id: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(240),
  content: z.string().trim().min(1).max(12000),
  bullets: z.array(z.string().trim().max(1000)).optional(),
});

const articleSchema = z.object({
  id: z.string().trim().max(180).default(''),
  category: z.string().trim().min(1).max(160),
  date: z.string().trim().max(40).default(''),
  readTime: z.string().trim().max(80).default(''),
  title: z.string().trim().min(1).max(220),
  subtitle: z.string().trim().max(500).default(''),
  excerpt: z.string().trim().max(700).default(''),
  image: z.string().trim().max(2000).default(''),
  quote: z.string().trim().max(1200).default(''),
  featured: z.boolean().optional(),
  author: authorSchema,
  tags: z.array(z.string().trim().max(80)).default([]),
  sections: z.array(sectionSchema).min(1).max(40),
});

const requestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('list') }),
  z.object({ action: z.literal('save'), article: articleSchema }),
  z.object({ action: z.literal('delete'), slug: z.string().trim().min(1).max(180) }),
  z.object({
    action: z.literal('set_featured'),
    slug: z.string().trim().min(1).max(180),
    featured: z.boolean(),
  }),
]);

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
  author:
    | { display_name: string; role_title: string | null; photo_url: string | null; bio: string | null }
    | { display_name: string; role_title: string | null; photo_url: string | null; bio: string | null }[]
    | null;
  category: { name: string } | { name: string }[] | null;
  tags: { tag: { name: string } | { name: string }[] | null }[] | null;
}

function firstOf<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  return slug || `article-${Date.now()}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function articleToHtml(article: Article): string {
  const blocks: string[] = [];
  if (article.quote.trim()) {
    blocks.push(`<blockquote>${escapeHtml(article.quote.trim())}</blockquote>`);
  }

  article.sections.forEach((section) => {
    blocks.push(`<h2>${escapeHtml(section.title)}</h2>`);
    blocks.push(`<p>${escapeHtml(section.content)}</p>`);
    if (section.bullets?.length) {
      const items = section.bullets
        .map((bullet) => bullet.replace(/^\s*[•*-]\s*/, '').trim())
        .filter(Boolean)
        .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
        .join('\n');
      if (items) blocks.push(`<ul>\n${items}\n</ul>`);
    }
  });

  return blocks.join('\n');
}

function readMinutes(readTime: string | undefined, sections: Section[]): number {
  const parsed = Number.parseInt(readTime || '', 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;

  const words = sections.reduce((count, section) => {
    const bulletWords = (section.bullets || []).join(' ').split(/\s+/).filter(Boolean).length;
    return count + section.title.split(/\s+/).filter(Boolean).length + section.content.split(/\s+/).filter(Boolean).length + bulletWords;
  }, 0);
  return Math.max(1, Math.ceil(words / 220));
}

function normalizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => (tag.startsWith('#') ? tag.toUpperCase() : `#${tag.toUpperCase()}`))
    )
  ).slice(0, 12);
}

function mapRowToArticle(row: BlogPostRow): Article {
  const author = firstOf(row.author);
  const category = firstOf(row.category);
  const tagNames = (row.tags || [])
    .map((item) => firstOf(item.tag)?.name)
    .filter((name): name is string => Boolean(name));

  return {
    id: row.slug,
    category: category?.name || 'General',
    date: row.published_at ? row.published_at.slice(0, 10) : '',
    readTime: row.reading_time_minutes ? `${row.reading_time_minutes} min de lecture` : '',
    featured: row.featured,
    title: row.title,
    subtitle: row.subtitle || '',
    excerpt: row.excerpt || '',
    image: row.featured_image || '',
    quote: row.content?.quote || '',
    author: {
      name: author?.display_name || 'CVPilot',
      role: author?.role_title || '',
      avatar: author?.photo_url || '',
      bio: author?.bio || '',
    },
    tags: tagNames,
    sections: row.content?.sections || [],
  };
}

async function ensureAdmin(authorizationHeader: string | undefined) {
  const caller = await verifySupabaseUser(authorizationHeader);
  if (!caller) return { ok: false as const, error: 'Authentification requise.' };

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return {
      ok: false as const,
      error: 'Configuration serveur incomplète : SUPABASE_SERVICE_ROLE_KEY est manquante.',
    };
  }

  const { data: profile } = await admin.from('profiles').select('role, name').eq('id', caller.id).maybeSingle();
  if (profile?.role !== 'admin') return { ok: false as const, error: 'Accès refusé.' };

  return { ok: true as const, admin, caller, profile };
}

async function listArticles(admin: ReturnType<typeof getSupabaseAdminClient>): Promise<Article[]> {
  const { data, error } = await admin
    .from('blog_posts')
    .select(
      'slug, title, subtitle, excerpt, content, featured_image, reading_time_minutes, featured, published_at, author:blog_authors(display_name, role_title, photo_url, bio), category:blog_categories(name), tags:blog_post_tags(tag:blog_tags(name))'
    )
    .eq('status', 'published')
    .eq('visibility', 'public')
    .is('deleted_at', null)
    .order('published_at', { ascending: false });

  if (error) throw error;
  return ((data || []) as unknown as BlogPostRow[]).map(mapRowToArticle);
}

async function saveArticle(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  article: Article
): Promise<void> {
  const slug = slugify(article.id || article.title);
  const categorySlug = slugify(article.category);
  const authorSlug = slugify(article.author.name);
  const tags = normalizeTags(article.tags);

  const { data: category, error: categoryError } = await admin
    .from('blog_categories')
    .upsert({ name: article.category, slug: categorySlug }, { onConflict: 'slug' })
    .select('id')
    .single();
  if (categoryError || !category) throw categoryError || new Error('Category upsert failed');

  const { data: author, error: authorError } = await admin
    .from('blog_authors')
    .upsert(
      {
        display_name: article.author.name,
        slug: authorSlug,
        photo_url: article.author.avatar || null,
        bio: article.author.bio || null,
        role_title: article.author.role || null,
      },
      { onConflict: 'slug' }
    )
    .select('id')
    .single();
  if (authorError || !author) throw authorError || new Error('Author upsert failed');

  const publishedAt = article.date ? new Date(`${article.date}T12:00:00.000Z`).toISOString() : new Date().toISOString();
  const content = { quote: article.quote || '', sections: article.sections };
  const { data: post, error: postError } = await admin
    .from('blog_posts')
    .upsert(
      {
        slug,
        title: article.title,
        subtitle: article.subtitle || null,
        excerpt: article.excerpt || article.subtitle || null,
        content,
        content_html: articleToHtml(article),
        featured_image: article.image || null,
        featured_image_alt: article.title,
        seo_title: article.title,
        seo_description: article.excerpt || article.subtitle || '',
        reading_time_minutes: readMinutes(article.readTime, article.sections),
        author_id: author.id,
        category_id: category.id,
        status: 'published',
        visibility: 'public',
        featured: !!article.featured,
        locale: 'fr',
        published_at: publishedAt,
        updated_at: new Date().toISOString(),
        deleted_at: null,
      },
      { onConflict: 'slug' }
    )
    .select('id')
    .single();
  if (postError || !post) throw postError || new Error('Post upsert failed');

  await admin.from('blog_post_tags').delete().eq('post_id', post.id);
  for (const tagName of tags) {
    const tagSlug = slugify(tagName.replace(/^#/, ''));
    const { data: tag, error: tagError } = await admin
      .from('blog_tags')
      .upsert({ name: tagName, slug: tagSlug }, { onConflict: 'slug' })
      .select('id')
      .single();
    if (tagError || !tag) throw tagError || new Error('Tag upsert failed');

    const { error: joinError } = await admin
      .from('blog_post_tags')
      .upsert({ post_id: post.id, tag_id: tag.id }, { onConflict: 'post_id,tag_id' });
    if (joinError) throw joinError;
  }
}

export async function handleAdminBlogPostsRoute(
  body: unknown,
  authorizationHeader: string | undefined
): Promise<AdminBlogPostsResponse> {
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return { success: false, error: 'Requête invalide.' };

  const access = await ensureAdmin(authorizationHeader);
  if (!access.ok) return { success: false, error: access.error };

  try {
    if (parsed.data.action === 'list') {
      return { success: true, articles: await listArticles(access.admin) };
    }

    if (parsed.data.action === 'save') {
      await saveArticle(access.admin, parsed.data.article);
      await access.admin.from('admin_audit_log').insert({
        admin_id: access.caller.id,
        admin_name: access.profile.name || access.caller.email,
        admin_role: 'admin',
        action_type: 'publish_blog_article',
        target_type: 'blog_posts',
        target_id: slugify(parsed.data.article.id || parsed.data.article.title),
        notes: parsed.data.article.title,
      });
      return { success: true, articles: await listArticles(access.admin) };
    }

    if (parsed.data.action === 'delete') {
      const { error } = await access.admin
        .from('blog_posts')
        .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('slug', parsed.data.slug);
      if (error) throw error;
      return { success: true, articles: await listArticles(access.admin) };
    }

    const { error } = await access.admin
      .from('blog_posts')
      .update({ featured: parsed.data.featured, updated_at: new Date().toISOString() })
      .eq('slug', parsed.data.slug);
    if (error) throw error;
    return { success: true, articles: await listArticles(access.admin) };
  } catch (error) {
    console.error('[adminBlogPostsApi] Failed to process blog admin request:', error);
    return { success: false, error: "L'article n'a pas pu être publié dans le blog." };
  }
}
