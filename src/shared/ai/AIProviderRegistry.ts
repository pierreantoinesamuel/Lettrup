import { IAIProvider } from './IAIProvider';
import { FeatureName, AIRequest, AIResponse } from './types';
import { OpenRouterAdapter } from './adapters/OpenRouterAdapter';
import { GeminiAdapter } from './adapters/GeminiAdapter';

const PROVIDER_CONFIG: Record<FeatureName, string[]> = {
  'resume-builder': ['openrouter', 'gemini'],
  'interview': ['openrouter', 'gemini'],
  'cover-letter': ['openrouter', 'gemini'],
  'ats-engine': ['openrouter', 'gemini'],
  'linkedin': ['openrouter', 'gemini'],
  'career-roadmap': ['openrouter', 'gemini'],
  'ai-coach': ['openrouter', 'gemini'],
  'job-matching': ['openrouter', 'gemini'],
  'salary': ['openrouter', 'gemini'],
  'learning-hub': ['openrouter', 'gemini'],
  'outreach': ['openrouter', 'gemini'],
};

class FallbackAIProvider implements IAIProvider {
  readonly name = 'fallback-chain';
  readonly model = 'auto';

  constructor(
    private chain: string[],
    private providers: Map<string, IAIProvider>,
    private featureName?: FeatureName
  ) {}

  async isAvailable(): Promise<boolean> {
    for (const name of this.chain) {
      const p = this.providers.get(name);
      if (p && (await p.isAvailable())) {
        return true;
      }
    }
    return false;
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    const req = { ...request, feature: request.feature || this.featureName };
    const errors: string[] = [];
    for (const name of this.chain) {
      const p = this.providers.get(name);
      if (!p) continue;

      const isAvail = await p.isAvailable();
      if (!isAvail) continue;

      try {
        return await p.complete(req);
      } catch (err: any) {
        console.warn(`[AIProviderRegistry] Provider '${name}' failed execution: ${err.message || err}. Attempting fallback...`);
        errors.push(`${name}: ${err.message || err}`);
      }
    }

    throw new Error(
      `All AI providers in fallback chain [${this.chain.join(', ')}] failed. Details: ${errors.join('; ')}`
    );
  }

  async *stream(request: AIRequest): AsyncGenerator<string> {
    const req = { ...request, feature: request.feature || this.featureName };
    for (const name of this.chain) {
      const p = this.providers.get(name);
      if (!p) continue;

      const isAvail = await p.isAvailable();
      if (!isAvail) continue;

      try {
        for await (const chunk of p.stream(req)) {
          yield chunk;
        }
        return;
      } catch (err: any) {
        console.warn(`[AIProviderRegistry] Stream for provider '${name}' failed: ${err.message || err}. Attempting fallback...`);
      }
    }

    throw new Error(`All AI providers in streaming fallback chain [${this.chain.join(', ')}] failed.`);
  }
}

export class AIProviderRegistry {
  private static instance: AIProviderRegistry;
  private providers: Map<string, IAIProvider>;

  constructor(providers: IAIProvider[]) {
    this.providers = new Map(providers.map((p) => [p.name, p]));
  }

  public static getInstance(): AIProviderRegistry {
    if (!AIProviderRegistry.instance) {
      AIProviderRegistry.instance = new AIProviderRegistry([
        new OpenRouterAdapter(),
        new GeminiAdapter(),
      ]);
    }
    return AIProviderRegistry.instance;
  }

  async getFor(feature: FeatureName): Promise<IAIProvider> {
    const chain = PROVIDER_CONFIG[feature] || ['openrouter', 'gemini'];
    return new FallbackAIProvider(chain, this.providers, feature);
  }
}

