import { IAIProvider } from './IAIProvider';
import { AIRequest, AIResponse, AIError } from './types';

export abstract class BaseAIAdapter implements IAIProvider {
  abstract readonly name: string;
  abstract readonly model: string;

  protected maxRetries = 3;
  protected timeoutMs = 30000;

  abstract executeCompletion(request: AIRequest): Promise<string>;
  abstract executeStream(request: AIRequest): AsyncGenerator<string>;
  abstract checkAvailability(): Promise<boolean>;

  async complete(request: AIRequest): Promise<AIResponse> {
    let attempts = 0;
    let lastError: unknown;
    // Long generations (a full CV pack) need more than the default 30 s and must
    // not be retried blindly: each aborted attempt is still billed by the provider.
    const maxAttempts = request.maxAttempts ?? this.maxRetries;
    const timeoutMs = request.timeoutMs ?? this.timeoutMs;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        const text = await this.withTimeout(
          this.executeCompletion(request),
          timeoutMs
        );
        return {
          text,
          model: this.model,
          provider: this.name,
        };
      } catch (err: any) {
        lastError = err;
        if (attempts >= maxAttempts) break;
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempts) * 500));
      }
    }

    throw new AIError(
      `Provider ${this.name} failed after ${attempts} attempts: ${(lastError as any)?.message || lastError}`,
      this.name,
      'MAX_RETRIES_EXCEEDED',
      lastError
    );
  }

  async *stream(request: AIRequest): AsyncGenerator<string> {
    try {
      const generator = this.executeStream(request);
      for await (const chunk of generator) {
        yield chunk;
      }
    } catch (err: any) {
      throw new AIError(
        `Streaming failed for ${this.name}: ${err.message || err}`,
        this.name,
        'STREAMING_ERROR',
        err
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      return await this.checkAvailability();
    } catch {
      return false;
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${ms}ms`));
      }, ms);

      promise
        .then((res) => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }
}
