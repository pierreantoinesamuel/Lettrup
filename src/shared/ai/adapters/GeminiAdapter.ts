import { GoogleGenAI } from '@google/genai';
import { BaseAIAdapter } from '../BaseAIAdapter';
import { AIRequest } from '../types';

export class GeminiAdapter extends BaseAIAdapter {
  readonly name = 'gemini';
  readonly model = 'gemini-flash-latest';

  // Server-only: this adapter must never run in the browser, so it only
  // ever reads process.env. A client-readable fallback (import.meta.env.VITE_*
  // or window.*) would get bundled into the shipped JS and leak the key.
  private getApiKey(): string | undefined {
    if (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) {
      return process.env.GEMINI_API_KEY;
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
      throw new Error('Gemini API key is not configured');
    }

    const ai = new GoogleGenAI({ apiKey });
    
    let contents = request.prompt;
    if (request.system) {
      contents = `System: ${request.system}\n\nUser Request: ${request.prompt}`;
    }

    const config: Record<string, any> = {};
    if (request.temperature !== undefined) config.temperature = request.temperature;
    if (request.maxTokens !== undefined) config.maxOutputTokens = request.maxTokens;
    if (request.responseMimeType) config.responseMimeType = request.responseMimeType;

    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      this.model,
      'gemini-flash-lite-latest',
    ];

    let lastError: any = null;
    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: Object.keys(config).length > 0 ? config : undefined,
        });
        return response.text || '';
      } catch (err: any) {
        lastError = err;
        console.warn(`[GeminiAdapter] generateContent failed with model ${model}, trying next:`, err?.message || err);
      }
    }

    throw lastError || new Error('Failed to generate completion from Gemini models.');
  }

  async *executeStream(request: AIRequest): AsyncGenerator<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Gemini API key is not configured');
    }

    const ai = new GoogleGenAI({ apiKey });

    let contents = request.prompt;
    if (request.system) {
      contents = `System: ${request.system}\n\nUser Request: ${request.prompt}`;
    }

    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      this.model,
      'gemini-flash-lite-latest',
    ];

    for (const model of candidateModels) {
      try {
        const responseStream = await ai.models.generateContentStream({
          model,
          contents,
        });

        for await (const chunk of responseStream) {
          if (chunk.text) {
            yield chunk.text;
          }
        }
        return;
      } catch (err: any) {
        console.warn(`[GeminiAdapter] executeStream failed with model ${model}, trying next:`, err?.message || err);
      }
    }
  }
}
