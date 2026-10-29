import { createHash } from 'node:crypto';
import { Redis } from '@upstash/redis';
import { z } from 'zod';
import { ResourceRef } from '../../features/learning-hub/domain/types';

const requestSchema = z.object({
  skill: z.string().trim().min(1).max(100),
  targetLevel: z.number().int().min(1).max(5),
  lang: z.enum(['fr', 'en']).default('fr'),
});

const CACHE_TTL_SECONDS = 6 * 60 * 60;
let resourceRedis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (resourceRedis !== undefined) return resourceRedis;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  resourceRedis = url && token ? new Redis({ url, token }) : null;
  return resourceRedis;
}

function createCacheKey(skill: string, targetLevel: number, lang: string): string {
  const hash = createHash('sha256').update(JSON.stringify([skill.toLowerCase(), targetLevel, lang])).digest('hex');
  return `cvpilot:learning:youtube:v1:${hash}`;
}

export interface LearningResourcesResponse {
  success: boolean;
  resources?: ResourceRef[];
  error?: string;
}

export function mapYouTubeSearchItems(items: unknown[], skill: string): ResourceRef[] {
  return items.flatMap((value) => {
    if (!value || typeof value !== 'object') return [];
    const item = value as any;
    const videoId = item.id?.videoId;
    const snippet = item.snippet;
    if (typeof videoId !== 'string' || typeof snippet?.title !== 'string') return [];

    return [{
      provider: 'youtube',
      title: snippet.title,
      why: String(snippet.description || snippet.channelTitle || `Ressource pour ${skill}.`),
      searchUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
      skill,
      channelName: String(snippet.channelTitle || ''),
      thumbnailUrl: String(snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || ''),
      publishedAt: String(snippet.publishedAt || ''),
    }];
  });
}

export async function handleLearningResourcesRoute(body: unknown): Promise<LearningResourcesResponse> {
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return { success: false, error: 'Compétence ou niveau invalide.' };

  const { skill, targetLevel, lang } = parsed.data;
  const cacheKey = createCacheKey(skill, targetLevel, lang);
  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get<ResourceRef[]>(cacheKey);
      if (Array.isArray(cached)) return { success: true, resources: cached };
    } catch {
      console.warn('[Learning resources] Cache read failed; querying YouTube.');
    }
  }

  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) return { success: false, error: 'La recherche de ressources vidéo est temporairement indisponible.' };

  try {
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('videoEmbeddable', 'true');
    searchUrl.searchParams.set('maxResults', '8');
    searchUrl.searchParams.set('order', 'relevance');
    searchUrl.searchParams.set('safeSearch', 'strict');
    searchUrl.searchParams.set('relevanceLanguage', lang);
    searchUrl.searchParams.set('q', `${skill} formation niveau ${targetLevel}`);
    searchUrl.searchParams.set('key', apiKey);

    const response = await fetch(searchUrl, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      return { success: false, error: 'YouTube ne peut pas fournir de ressources pour le moment.' };
    }

    const data = await response.json();
    const resources = mapYouTubeSearchItems(Array.isArray(data.items) ? data.items : [], skill);

    if (redis) {
      try {
        await redis.set(cacheKey, resources, { ex: CACHE_TTL_SECONDS });
      } catch {
        console.warn('[Learning resources] Cache write failed; returning live results.');
      }
    }

    return { success: true, resources };
  } catch {
    return { success: false, error: 'La recherche YouTube est temporairement indisponible.' };
  }
}