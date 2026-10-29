export type FeatureName =
  | 'resume-builder'
  | 'ats-engine'
  | 'cover-letter'
  | 'interview'
  | 'linkedin'
  | 'career-roadmap'
  | 'ai-coach'
  | 'job-matching'
  | 'salary'
  | 'learning-hub'
  | 'outreach';

export interface AIRequest {
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  responseMimeType?: 'application/json' | 'text/plain';
  feature?: FeatureName;
  modelOverride?: string;
  /** Per-request override of the adapter's 30 s timeout (long generations). */
  timeoutMs?: number;
  /** Per-request override of the adapter's retry count (default 3). */
  maxAttempts?: number;
}

export interface AIResponse {
  text: string;
  tokensUsed?: number;
  model: string;
  provider: string;
}

export class AIError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code?: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'AIError';
  }
}
