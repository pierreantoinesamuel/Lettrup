import { BaseAIAdapter } from '../BaseAIAdapter';
import { AIRequest, FeatureName } from '../types';

export const FEATURE_OPENROUTER_MODELS: Record<string, string> = {
  'resume-builder': 'anthropic/claude-sonnet-5',
  'interview': 'anthropic/claude-sonnet-5',
  'cover-letter': 'anthropic/claude-sonnet-5',
  'ats-engine': 'anthropic/claude-3-haiku',
  'outreach': 'anthropic/claude-3-haiku',
  'job-matching': 'anthropic/claude-3-haiku',
};

export class OpenRouterAdapter extends BaseAIAdapter {
  readonly name = 'openrouter';
  readonly model = 'anthropic/claude-sonnet-5';

  // Server-only: this adapter must never run in the browser, so it only
  // ever reads process.env. A client-readable fallback (import.meta.env.VITE_*
  // or window.*) would get bundled into the shipped JS and leak the key.
  private getApiKey(): string | undefined {
    if (typeof process !== 'undefined' && process.env?.OPENROUTER_API_KEY) {
      return process.env.OPENROUTER_API_KEY;
    }
    return undefined;
  }

  async checkAvailability(): Promise<boolean> {
    const key = this.getApiKey();
    return !!key && key.trim().length > 0;
  }

  async executeCompletion(request: AIRequest): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OpenRouter API key is not configured');
    }

    const selectedModel =
      request.modelOverride ||
      (request.feature ? FEATURE_OPENROUTER_MODELS[request.feature] : undefined) ||
      this.model;

    const messages = [];
    if (request.system) {
      messages.push({ role: 'system', content: request.system });
    }
    messages.push({ role: 'user', content: request.prompt });

    const payload: Record<string, any> = {
      model: selectedModel,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens || 2048,
    };

    if (request.responseMimeType === 'application/json') {
      payload.response_format = { type: 'json_object' };
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://ai.studio',
        'X-Title': 'Lettrup',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(`OpenRouter API error (${res.status}): ${errJson.error?.message || res.statusText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async *executeStream(request: AIRequest): AsyncGenerator<string> {
    const completion = await this.executeCompletion(request);
    yield completion;
  }
}
