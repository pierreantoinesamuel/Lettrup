/**
 * Infrastructure Layer: API Route Handler for France Travail Job Search
 * Route: POST /api/france-travail/search
 *
 * All France Travail OAuth credentials stay server-side. The browser never stores
 * or reads the developer client secret. This route acts as the backend boundary and
 * validates/normalizes the filters before forwarding them to the upstream API.
 */

import { z } from 'zod';
import { createHash } from 'node:crypto';
import { Redis } from '@upstash/redis';
import {
  FRANCE_TRAVAIL_MAX_PAGES,
  FRANCE_TRAVAIL_MAX_RESULTS,
  FRANCE_TRAVAIL_PAGE_SIZE,
  getFranceTravailPageRange,
} from '../../domain/constants/franceTravailPagination';

const searchRequestSchema = z.object({
  keywords: z.string().trim().max(200).optional(),
  location: z.string().trim().max(100).optional(),
  contractType: z.string().trim().max(50).optional(),
  salaryRange: z.string().trim().max(20).optional(),
  educationLevel: z.string().trim().max(50).optional(),
  datePosted: z.string().trim().max(10).optional(),
  page: z.number().int().min(1).max(FRANCE_TRAVAIL_MAX_PAGES).optional(),
});

export interface FranceTravailSearchApiRequest {
  keywords?: string;
  location?: string;
  contractType?: string;
  salaryRange?: string;
  educationLevel?: string;
  datePosted?: string;
  page?: number;
}

const FRANCE_TRAVAIL_LOCATION_ALIASES: Record<string, { type: 'commune' | 'departement'; value: string; label: string }> = {
  paris: { type: 'commune', value: '75056', label: 'Paris' },
  'ile-de-france': { type: 'departement', value: '75', label: 'Île-de-France' },
  lyon: { type: 'commune', value: '69123', label: 'Lyon' },
  marseille: { type: 'commune', value: '13055', label: 'Marseille' },
  lille: { type: 'commune', value: '59350', label: 'Lille' },
  nantes: { type: 'commune', value: '44109', label: 'Nantes' },
  toulouse: { type: 'commune', value: '31555', label: 'Toulouse' },
  strasbourg: { type: 'commune', value: '67482', label: 'Strasbourg' },
  montpellier: { type: 'commune', value: '34172', label: 'Montpellier' },
  bordeaux: { type: 'commune', value: '33063', label: 'Bordeaux' },
  rennes: { type: 'commune', value: '35238', label: 'Rennes' },
  'lyon-metropole': { type: 'commune', value: '69123', label: 'Lyon' },
  'sainte-marie': { type: 'commune', value: '97411', label: 'Saint-Pierre' },
  'saint-denis': { type: 'commune', value: '97411', label: 'Saint-Denis' },
};

const VALID_DATE_FILTERS = new Set(['1', '3', '7', '14', '30']);
const SALARY_RANGE_MIN_MONTHLY: Record<string, number> = {
  '20-30': Math.round(20000 / 12),
  '30-40': Math.round(30000 / 12),
  '40-50': Math.round(40000 / 12),
  '50-60': Math.round(50000 / 12),
  '60-80': Math.round(60000 / 12),
  '80+': Math.round(80000 / 12),
};
const MAX_PAGES_PER_REQUEST = 1;
const FRANCE_TRAVAIL_CACHE_TTL_SECONDS = 600;

interface CachedFranceTravailPage {
  jobs: FranceTravailSearchApiJob[];
  rawCount: number;
  total?: number;
}

let franceTravailTokenCache: { token: string; expiresAt: number } | null = null;
let franceTravailRedis: Redis | null | undefined;

function getFranceTravailCache(): Redis | null {
  if (franceTravailRedis !== undefined) return franceTravailRedis;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  franceTravailRedis = url && token ? new Redis({ url, token }) : null;
  return franceTravailRedis;
}

export function createFranceTravailPageCacheKey(searchUrl: URL, rangeStart: number): string {
  const filters = Array.from(searchUrl.searchParams.entries())
    .filter(([name]) => name !== 'range')
    .sort(([leftName, leftValue], [rightName, rightValue]) =>
      leftName.localeCompare(rightName) || leftValue.localeCompare(rightValue));
  const filterHash = createHash('sha256')
    .update(JSON.stringify([filters, rangeStart, FRANCE_TRAVAIL_PAGE_SIZE]))
    .digest('hex');
  return `cvpilot:france-travail:page:v3:${filterHash}`;
}

async function getCachedFranceTravailPage(cacheKey: string): Promise<CachedFranceTravailPage | null> {
  const cache = getFranceTravailCache();
  if (!cache) return null;

  try {
    const value = await cache.get<CachedFranceTravailPage>(cacheKey);
    if (!value || !Array.isArray(value.jobs) || !Number.isSafeInteger(value.rawCount) || value.rawCount < 0) {
      return null;
    }
    return value;
  } catch {
    console.warn('[France Travail cache] Read failed; fetching live results.');
    return null;
  }
}

async function setCachedFranceTravailPage(cacheKey: string, page: CachedFranceTravailPage): Promise<void> {
  const cache = getFranceTravailCache();
  if (!cache) return;

  try {
    await cache.set(cacheKey, page, { ex: FRANCE_TRAVAIL_CACHE_TTL_SECONDS });
  } catch {
    console.warn('[France Travail cache] Write failed; returning live results without caching.');
  }
}

export function normalizeFranceTravailDateFilter(datePosted?: string): string | undefined {
  const normalized = (datePosted || '').trim();
  if (!normalized) return undefined;
  if (normalized === '31') return '30';
  if (VALID_DATE_FILTERS.has(normalized)) return normalized;
  return undefined;
}

export function resolveFranceTravailLocation(location?: string): { type: 'commune' | 'departement'; value: string; label: string } | null {
  const normalized = (location || '').trim();
  if (!normalized) return null;

  if (/^\d{2,5}$/.test(normalized)) {
    return {
      type: normalized.length === 5 ? 'commune' : 'departement',
      value: normalized,
      label: normalized,
    };
  }

  const normalizedKey = normalized.toLowerCase();
  const directMatch = FRANCE_TRAVAIL_LOCATION_ALIASES[normalizedKey];
  if (directMatch) return directMatch;

  const partialMatch = Object.entries(FRANCE_TRAVAIL_LOCATION_ALIASES).find(([key]) => normalizedKey.includes(key));
  return partialMatch ? partialMatch[1] : null;
}

export function deduplicateFranceTravailJobs<T extends { id?: string | null }>(jobs: T[]): T[] {
  const seen = new Map<string, T>();
  for (const job of jobs) {
    const id = String(job?.id ?? '').trim();
    if (!id) continue;
    if (!seen.has(id)) seen.set(id, job);
  }
  return Array.from(seen.values());
}

export function parseFranceTravailTotalCount(contentRange: string | null): number | undefined {
  const match = contentRange?.match(/\/(\d+)\s*$/);
  if (!match) return undefined;

  const total = Number(match[1]);
  return Number.isSafeInteger(total) ? total : undefined;
}

export async function getFranceTravailAccessToken(): Promise<string | null> {
  const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID?.trim();
  const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) return null;

  const now = Date.now();
  if (franceTravailTokenCache && franceTravailTokenCache.expiresAt > now + 60_000) {
    return franceTravailTokenCache.token;
  }

  const bodyParams = new URLSearchParams();
  bodyParams.append('grant_type', 'client_credentials');
  bodyParams.append('client_id', clientId);
  bodyParams.append('client_secret', clientSecret);
  bodyParams.append('scope', 'api_offresdemploiv2 o2dsoffre');

  const tokenUrl = 'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire';
  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: bodyParams,
    signal: AbortSignal.timeout(10_000),
  });

  if (!tokenRes.ok) {
    throw new Error(`France Travail auth failed (${tokenRes.status})`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = typeof tokenData.access_token === 'string' ? tokenData.access_token : '';
  const expiresInSeconds = Number(tokenData.expires_in || 3600);

  if (!accessToken) {
    throw new Error('France Travail token response was invalid');
  }

  franceTravailTokenCache = {
    token: accessToken,
    expiresAt: Date.now() + Math.max(60, expiresInSeconds - 60) * 1000,
  };

  return accessToken;
}

export interface FranceTravailSearchApiJob {
  id: string;
  title: string;
  company: string;
  location: string;
  department?: string;
  contractType: string;
  salary: string;
  description: string;
  requirements: string[];
  publicationDate: string;
  url: string;
  isLiveApi: true;
  experienceLevel?: string;
}

export interface FranceTravailSearchApiResponse {
  success: boolean;
  jobs?: FranceTravailSearchApiJob[];
  total?: number;
  error?: string;
  code?: string;
  retryAfter?: number;
  message?: string;
}

function normalizeFranceTravailJob(item: any): FranceTravailSearchApiJob | null {
  const id = String(item?.id || '').trim();
  if (!id) return null;

  return {
    id,
    title: String(item?.intitule || "Offre d'emploi"),
    company: String(item?.entreprise?.nom || 'Entreprise partenaire'),
    location: String(item?.lieuTravail?.libelle || 'France'),
    department: item?.lieuTravail?.codePostal ? String(item.lieuTravail.codePostal) : undefined,
    contractType: String(item?.typeContratLibelle || item?.typeContrat || 'CDI'),
    salary: String(item?.salaire?.libelle || 'Selon profil'),
    description: String(item?.description || "Voir les détails de l'offre sur France Travail."),
    requirements: Array.isArray(item?.competences)
      ? item.competences.map((competence: any) => String(competence?.libelle || competence)).filter(Boolean)
      : ['Expérience équivalente exigée'],
    publicationDate: item?.dateCreation ? new Date(item.dateCreation).toLocaleDateString('fr-FR') : 'Récente',
    url: String(item?.origineOffre?.urlOrigine || `https://candidat.francetravail.fr/offres/recherche/detail/${id}`),
    isLiveApi: true,
    experienceLevel: item?.experienceLibelle ? String(item.experienceLibelle) : undefined,
  };
}

export async function handleFranceTravailSearchRoute(reqBody: FranceTravailSearchApiRequest): Promise<FranceTravailSearchApiResponse> {
  const parsedBody = searchRequestSchema.safeParse(reqBody);
  if (!parsedBody.success) {
    return { success: false, code: 'FRANCE_TRAVAIL_INVALID_REQUEST', message: 'Paramètres de recherche invalides.', error: 'Paramètres de recherche invalides.' };
  }

  const validatedBody: FranceTravailSearchApiRequest = parsedBody.data;
  const datePosted = normalizeFranceTravailDateFilter(validatedBody.datePosted);
  const normalizedBody = { ...validatedBody, datePosted };
  const locationValue = resolveFranceTravailLocation(normalizedBody.location);

  try {
    const searchUrl = new URL('https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search');
    if (normalizedBody.keywords) searchUrl.searchParams.append('motsCles', normalizedBody.keywords);
    if (locationValue) searchUrl.searchParams.append(locationValue.type, locationValue.value);
    if (normalizedBody.contractType && normalizedBody.contractType !== 'Tous') {
      searchUrl.searchParams.append('typeContrat', normalizedBody.contractType);
    }
    if (normalizedBody.salaryRange && SALARY_RANGE_MIN_MONTHLY[normalizedBody.salaryRange]) {
      searchUrl.searchParams.append('salaireMin', String(SALARY_RANGE_MIN_MONTHLY[normalizedBody.salaryRange]));
    }
    if (normalizedBody.datePosted) {
      searchUrl.searchParams.append('publieeDepuis', normalizedBody.datePosted);
    }

    const dedupedJobs = new Map<string, FranceTravailSearchApiJob>();
    let totalFetched = 0;
    let totalAvailable: number | undefined;
    let accessToken: string | null = null;

    const requestedPage = normalizedBody.page || 1;
    for (let pageOffset = 0; pageOffset < MAX_PAGES_PER_REQUEST; pageOffset += 1) {
      const range = getFranceTravailPageRange(requestedPage + pageOffset);
      if (!range || range.start >= FRANCE_TRAVAIL_MAX_RESULTS) break;
      const rangeStart = range.start;
      searchUrl.searchParams.set('range', `${range.start}-${range.end}`);

      const cacheKey = createFranceTravailPageCacheKey(searchUrl, rangeStart);
      const cachedPage = await getCachedFranceTravailPage(cacheKey);
      let pageJobs: FranceTravailSearchApiJob[];
      let pageRawCount: number;
      let pageTotal: number | undefined;

      if (cachedPage) {
        pageJobs = cachedPage.jobs;
        pageRawCount = cachedPage.rawCount;
        pageTotal = cachedPage.total;
      } else {
        const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID?.trim();
        const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET?.trim();
        if (!clientId || !clientSecret) {
          return {
            success: false,
            code: 'FRANCE_TRAVAIL_MISSING_CREDENTIALS',
            message: 'Les offres France Travail sont temporairement indisponibles.',
            error: 'France Travail credentials not configured',
          };
        }

        if (!accessToken) {
          accessToken = await getFranceTravailAccessToken();
          if (!accessToken) {
            return {
              success: false,
              code: 'FRANCE_TRAVAIL_AUTH_ERROR',
              message: 'Les offres France Travail sont temporairement indisponibles.',
              error: 'France Travail token was not created',
            };
          }
        }

        let apiResponse = await fetch(searchUrl.toString(), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(15_000),
        });

        if (apiResponse.status === 401 && pageOffset === 0) {
          franceTravailTokenCache = null;
          accessToken = (await getFranceTravailAccessToken()) || accessToken;
          apiResponse = await fetch(searchUrl.toString(), {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(15_000),
          });
        }

        if (apiResponse.status === 429) {
          const retryAfter = Number(apiResponse.headers.get('retry-after') || 0) || 30;
          return {
            success: false,
            code: 'FRANCE_TRAVAIL_RATE_LIMIT',
            message: 'Le service France Travail est temporairement saturé. Veuillez réessayer plus tard.',
            retryAfter,
            error: 'France Travail rate limit reached',
          };
        }

        if (apiResponse.status >= 500) {
          return {
            success: false,
            code: 'FRANCE_TRAVAIL_SERVER_ERROR',
            message: 'Les offres France Travail sont temporairement indisponibles.',
            error: `France Travail server error (${apiResponse.status})`,
          };
        }

        if (!apiResponse.ok) {
          return {
            success: false,
            code: 'FRANCE_TRAVAIL_API_ERROR',
            message: 'Les offres France Travail sont temporairement indisponibles.',
            error: `France Travail request failed (${apiResponse.status})`,
          };
        }

        pageTotal = parseFranceTravailTotalCount(apiResponse.headers.get('content-range'));
        const data = await apiResponse.json();
        const rawJobs = Array.isArray(data?.resultats) ? data.resultats : [];
        pageRawCount = rawJobs.length;
        pageJobs = rawJobs
          .map(normalizeFranceTravailJob)
          .filter((job: FranceTravailSearchApiJob | null): job is FranceTravailSearchApiJob => job !== null);

        await setCachedFranceTravailPage(cacheKey, {
          jobs: pageJobs,
          rawCount: pageRawCount,
          total: pageTotal,
        });
      }

      totalAvailable = pageTotal ?? totalAvailable;
      if (pageRawCount === 0) break;

      for (const job of pageJobs) {
        if (!dedupedJobs.has(job.id)) dedupedJobs.set(job.id, job);
      }

      totalFetched += pageRawCount;
      if (totalAvailable !== undefined && totalFetched >= totalAvailable) break;
      if (pageRawCount < FRANCE_TRAVAIL_PAGE_SIZE) break;
    }

    const jobs = deduplicateFranceTravailJobs(Array.from(dedupedJobs.values()));
    return {
      success: true,
      jobs,
      total: totalAvailable ?? jobs.length,
    };
  } catch (error: any) {
    const msg = error?.message || 'France Travail API error';
    return {
      success: false,
      code: 'FRANCE_TRAVAIL_API_ERROR',
      message: 'Les offres France Travail sont temporairement indisponibles.',
      error: msg,
    };
  }
}
