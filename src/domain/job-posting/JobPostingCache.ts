/**
 * Domain Entity & Helper Functions: JobPostingCache
 */

export interface ParsedJobPosting {
  contentHash: string;
  extractedKeywords: string[];
  extractedRequirements: string[];
  modelUsed: string;
  hitCount: number;
  createdAt: string;
  lastHitAt?: string | null;
}

/**
 * Normalizes job posting text before hashing:
 * 1. Strips HTML tags
 * 2. Collapses whitespace
 * 3. Lowercases text for hashing ONLY
 */
export function normalizeJobPostingText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ') // Strip HTML tags
    .replace(/\s+/g, ' ')    // Collapse multiple whitespace to single space
    .trim()
    .toLowerCase();          // Lowercase for exact hash matching
}

/**
 * Computes a browser-compatible hash of normalized job posting text.
 */
export function computeJobPostingHash(rawText: string): string {
  const normalized = normalizeJobPostingText(rawText);
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'jp_' + Math.abs(hash).toString(36) + '_' + normalized.length;
}
