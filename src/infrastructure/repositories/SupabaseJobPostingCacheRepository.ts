/**
 * Infrastructure Layer: SupabaseJobPostingCacheRepository
 * Manages exact-match semantic caching for parsed job postings.
 */

import { ParsedJobPosting } from '../../domain/job-posting/JobPostingCache';

export interface IJobPostingCacheRepository {
  getByHash(hash: string): Promise<ParsedJobPosting | null>;
  save(entry: ParsedJobPosting): Promise<void>;
  incrementHitCount(hash: string): Promise<void>;
}

export class SupabaseJobPostingCacheRepository implements IJobPostingCacheRepository {
  // In-memory backing store for local preview / mock environment
  private static cacheStore = new Map<string, ParsedJobPosting>();

  async getByHash(hash: string): Promise<ParsedJobPosting | null> {
    const cached = SupabaseJobPostingCacheRepository.cacheStore.get(hash);
    if (cached) {
      return { ...cached };
    }
    return null;
  }

  async save(entry: ParsedJobPosting): Promise<void> {
    SupabaseJobPostingCacheRepository.cacheStore.set(entry.contentHash, { ...entry });
  }

  async incrementHitCount(hash: string): Promise<void> {
    const cached = SupabaseJobPostingCacheRepository.cacheStore.get(hash);
    if (cached) {
      cached.hitCount = (cached.hitCount || 0) + 1;
      cached.lastHitAt = new Date().toISOString();
    }
  }

  /**
   * Helper to clear cache store (useful for testing)
   */
  static clearStore(): void {
    SupabaseJobPostingCacheRepository.cacheStore.clear();
  }
}
