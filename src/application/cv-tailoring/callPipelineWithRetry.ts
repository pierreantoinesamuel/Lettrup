import { IAIProvider } from '../../shared/ai/IAIProvider';
import { FullPipelineOutput, PipelineError } from './types';

export async function callPipelineWithRetry(
  provider: IAIProvider,
  system: string,
  prompt: string,
  maxRetries = 2,
  callOptions: { timeoutMs?: number; maxAttempts?: number } = {}
): Promise<FullPipelineOutput> {
  let currentPrompt = prompt;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await provider.complete({
      system,
      prompt: currentPrompt,
      responseMimeType: 'application/json',
      maxTokens: 8000,
      temperature: 0.5,
      ...callOptions,
    });

    let parsed: FullPipelineOutput | PipelineError;
    try {
      parsed = JSON.parse(res.text);
    } catch {
      if (attempt >= maxRetries) {
        throw new Error('PIPELINE_JSON_INVALID');
      }
      currentPrompt =
        prompt +
        '\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY valid JSON with no markdown, no prose.';
      continue;
    }

    // Surface pipeline-level errors thrown by the LLM
    if ('error' in parsed) {
      throw new Error(`PIPELINE_ERROR:${(parsed as PipelineError).error}`);
    }

    return parsed as FullPipelineOutput;
  }

  throw new Error('PIPELINE_JSON_INVALID');
}
