/**
 * Application Use Case: ParseJobPostingUseCase
 * Handles job posting parsing with exact-match semantic caching (SHA-256).
 */

import { computeJobPostingHash, ParsedJobPosting } from '../../domain/job-posting/JobPostingCache';
import {
  IJobPostingCacheRepository,
  SupabaseJobPostingCacheRepository,
} from '../../infrastructure/repositories/SupabaseJobPostingCacheRepository';
import { AIProviderRegistry } from '../../shared/ai/AIProviderRegistry';
import { IAIProvider } from '../../shared/ai/IAIProvider';

export interface ParseJobPostingInput {
  jobOfferText: string;
}

export interface ParseJobPostingResult {
  contentHash: string;
  extractedKeywords: string[];
  extractedRequirements: string[];
  modelUsed: string;
  fromCache: boolean;
}

export class ParseJobPostingUseCase {
  constructor(
    private cacheRepository: IJobPostingCacheRepository = new SupabaseJobPostingCacheRepository(),
    private aiProviderOverride?: IAIProvider
  ) {}

  async execute(input: ParseJobPostingInput): Promise<ParseJobPostingResult> {
    const rawText = input.jobOfferText || '';
    const contentHash = computeJobPostingHash(rawText);

    // 1. Check job_posting_cache for exact-match hash
    const cachedHit = await this.cacheRepository.getByHash(contentHash);

    if (cachedHit) {
      // ON HIT: increment hit_count, update last_hit_at, return cached result without AI call
      await this.cacheRepository.incrementHitCount(contentHash);
      return {
        contentHash: cachedHit.contentHash,
        extractedKeywords: cachedHit.extractedKeywords,
        extractedRequirements: cachedHit.extractedRequirements,
        modelUsed: cachedHit.modelUsed,
        fromCache: true,
      };
    }

    // ON MISS: Call AI provider to extract keywords & requirements
    const provider =
      this.aiProviderOverride || (await AIProviderRegistry.getInstance().getFor('ats-engine'));

    const systemPrompt = `You are an expert job description analyzer. Extract key skills/keywords and job requirements from the job offer text.
Return strict JSON with schema:
{
  "extractedKeywords": ["string"],
  "extractedRequirements": ["string"]
}`;

    const userPrompt = `Job Offer Text:\n${rawText}`;

    const aiResponse = await provider.complete({
      prompt: `${systemPrompt}\n\n${userPrompt}`,
      responseMimeType: 'application/json',
    });

    const modelName = aiResponse.model || provider.model || 'gemini-1.5-flash';

    let parsedOutput: { extractedKeywords?: string[]; extractedRequirements?: string[] } | null = null;

    try {
      const json = JSON.parse(aiResponse.text);
      if (json && (Array.isArray(json.extractedKeywords) || Array.isArray(json.extractedRequirements))) {
        parsedOutput = {
          extractedKeywords: Array.isArray(json.extractedKeywords) ? json.extractedKeywords : [],
          extractedRequirements: Array.isArray(json.extractedRequirements) ? json.extractedRequirements : [],
        };
      }
    } catch (err) {
      console.warn('[ParseJobPosting] Failed to parse AI JSON response. Skipping cache write.');
    }

    if (!parsedOutput) {
      // Fallback path: return degraded line-split result without saving to cache
      const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      return {
        contentHash,
        extractedKeywords: lines.slice(0, 5),
        extractedRequirements: lines.slice(0, 5),
        modelUsed: modelName,
        fromCache: false,
      };
    }

    const newEntry: ParsedJobPosting = {
      contentHash,
      extractedKeywords: parsedOutput.extractedKeywords || [],
      extractedRequirements: parsedOutput.extractedRequirements || [],
      modelUsed: modelName,
      hitCount: 0,
      createdAt: new Date().toISOString(),
      lastHitAt: null,
    };

    // Write new entry to cache ONLY on verified JSON success path
    await this.cacheRepository.save(newEntry);

    return {
      contentHash,
      extractedKeywords: newEntry.extractedKeywords,
      extractedRequirements: newEntry.extractedRequirements,
      modelUsed: newEntry.modelUsed,
      fromCache: false,
    };
  }
}
