/**
 * Infrastructure Layer: API Route Handler for ATS Job Match Analysis
 * Route: POST /api/ats/analyze
 *
 * Runs the real, live ATS scanner (ATSAIEngine) server-side so the AI
 * provider key never ships in the client bundle. This is intentionally
 * separate from atsScanApi.ts / AnalyzeAtsMatchUseCase, which back an
 * unrelated, disconnected prototype (/api/ats/scan) with a different
 * request/response shape — do not merge the two.
 *
 * Returns an ATSScanResult on success. Provider and parsing failures are
 * propagated to the Express route, which responds with a controlled 502.
 */

import { atsAIEngine, ATSScanResult } from '../../features/ats-engine/infrastructure/ai/ATSAIEngine';
import { sanitizeAiJson } from '../../shared/ai/sanitizeAiOutput';
import { z } from 'zod';

const atsAnalyzeSchema = z.object({
  jobDescription: z.string().trim().min(20).max(20_000),
  resumeText: z.string().trim().min(1).max(20_000),
});

export interface AtsAnalyzeApiRequest {
  jobDescription: string;
  resumeText: string;
}

export async function handleAtsAnalyzeRoute(
  reqBody: AtsAnalyzeApiRequest
): Promise<ATSScanResult> {
  const parsed = atsAnalyzeSchema.parse(reqBody);
  const result = await atsAIEngine.analyzeJobMatch(parsed.jobDescription, parsed.resumeText);
  return sanitizeAiJson(result);
}
