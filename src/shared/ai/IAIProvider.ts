import { AIRequest, AIResponse } from './types';

export interface IAIProvider {
  readonly name: string;
  readonly model: string;
  complete(request: AIRequest): Promise<AIResponse>;
  stream(request: AIRequest): AsyncGenerator<string>;
  isAvailable(): Promise<boolean>;
}
