/**
 * Unit Tests for Feature 2: Semantic Caching for Job Posting Parsing
 */

import { ParseJobPostingUseCase } from './ParseJobPosting';
import { IJobPostingCacheRepository } from '../../infrastructure/repositories/SupabaseJobPostingCacheRepository';
import { normalizeJobPostingText, computeJobPostingHash, ParsedJobPosting } from '../../domain/job-posting/JobPostingCache';
import { IAIProvider } from '../../shared/ai/IAIProvider';

import { AIRequest, AIResponse } from '../../shared/ai/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[TEST FAILED] ${message}`);
  }
}

class MockAIProvider implements IAIProvider {
  readonly name = 'mock-ai';
  readonly model = 'mock-model';
  public completeCallCount = 0;
  public lastPrompt = '';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async *stream(): AsyncGenerator<string> {
    yield '';
  }

  async complete(options: AIRequest): Promise<AIResponse> {
    this.completeCallCount++;
    this.lastPrompt = options.prompt;
    return {
      text: JSON.stringify({
        extractedKeywords: ['React', 'TypeScript', 'Node.js'],
        extractedRequirements: ['5+ ans d\'expérience', 'Excellente maîtrise de TypeScript'],
      }),
      model: 'mock-model',
      provider: 'mock-ai',
    };
  }
}

class MockJobPostingCacheRepository implements IJobPostingCacheRepository {
  public getByHashCallCount = 0;
  public saveCallCount = 0;
  public incrementHitCountCallCount = 0;
  public store = new Map<string, ParsedJobPosting>();

  async getByHash(hash: string): Promise<ParsedJobPosting | null> {
    this.getByHashCallCount++;
    const found = this.store.get(hash);
    return found ? { ...found } : null;
  }

  async save(entry: ParsedJobPosting): Promise<void> {
    this.saveCallCount++;
    this.store.set(entry.contentHash, { ...entry });
  }

  async incrementHitCount(hash: string): Promise<void> {
    this.incrementHitCountCallCount++;
    const entry = this.store.get(hash);
    if (entry) {
      entry.hitCount++;
      entry.lastHitAt = new Date().toISOString();
    }
  }
}

export function runJobPostingCacheTests(): { passed: boolean; testCount: number } {
  let testCount = 0;

  // Test 1: Normalization & SHA-256 Hashing
  {
    testCount++;
    const rawHtml = '<div>  <h1> Senior <b>React</b> Developer  </h1> \n\n <p>Must know TypeScript! </p> </div>';
    const cleanText = 'senior react developer must know typescript!';

    const normalizedHtml = normalizeJobPostingText(rawHtml);
    assert(normalizedHtml === cleanText, `Normalization failed. Expected "${cleanText}", got "${normalizedHtml}"`);

    const hash1 = computeJobPostingHash(rawHtml);
    const hash2 = computeJobPostingHash(cleanText);
    assert(hash1 === hash2, 'SHA-256 hash mismatch between HTML and clean text equivalent');
  }

  // Test 2: Cache Miss Path (invokes AI adapter and writes to cache exactly once)
  {
    testCount++;
    const mockAi = new MockAIProvider();
    const mockRepo = new MockJobPostingCacheRepository();
    const useCase = new ParseJobPostingUseCase(mockRepo, mockAi);

    const jobText = 'Recherche Développeur Senior Full Stack React & Node.js';

    const resultPromise = useCase.execute({ jobOfferText: jobText });

    // Synchronously / async await
    return (async () => {
      const result = await resultPromise;

      assert(result.fromCache === false, 'Cache miss should set fromCache=false');
      assert(mockAi.completeCallCount === 1, `AI adapter should be called once on miss, got ${mockAi.completeCallCount}`);
      assert(mockRepo.saveCallCount === 1, `Cache save should be called once on miss, got ${mockRepo.saveCallCount}`);
      assert(result.extractedKeywords.length === 3, 'Extracted keywords count mismatch');

      // Test 3: Cache Hit Path (returns cached data WITHOUT invoking AI adapter)
      testCount++;
      const cachedResult = await useCase.execute({ jobOfferText: jobText });

      assert(cachedResult.fromCache === true, 'Cache hit should set fromCache=true');
      assert(mockAi.completeCallCount === 1, `AI adapter MUST NOT be invoked on cache hit (expected 1, got ${mockAi.completeCallCount})`);
      assert(mockRepo.incrementHitCountCallCount === 1, `incrementHitCount should be called on hit, got ${mockRepo.incrementHitCountCallCount}`);
      assert(cachedResult.extractedKeywords[0] === 'React', 'Cached keywords content mismatch');

      // Test 4: Fallback path on invalid JSON skips cache write
      testCount++;
      const failingAi: IAIProvider = {
        name: 'failing-ai',
        model: 'failing-model',
        async isAvailable() { return true; },
        async *stream() { yield ''; },
        async complete() {
          return { text: 'INVALID NON-JSON TEXT', model: 'failing-model', provider: 'failing-ai' };
        }
      };

      const fallbackRepo = new MockJobPostingCacheRepository();
      const fallbackUseCase = new ParseJobPostingUseCase(fallbackRepo, failingAi);
      const fallbackResult = await fallbackUseCase.execute({ jobOfferText: 'Posting with malformed AI response' });

      assert(fallbackResult.fromCache === false, 'Fallback result must not claim fromCache');
      assert(fallbackRepo.saveCallCount === 0, 'Fallback result MUST NOT be saved to cache (prevents cache poisoning)');

      return { passed: true, testCount };
    })() as any;
  }
}
