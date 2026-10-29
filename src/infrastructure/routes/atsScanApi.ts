/**
 * Infrastructure Layer: API Route Handler for ATS Scan
 * Route: POST /api/ats/scan
 *
 * callerId comes from server.ts's requireAuth — used to scope the CV fetch
 * and the saved scan history to the caller's own account.
 */

import { AnalyzeAtsMatchUseCase, AnalyzeAtsInput } from '../../application/ats-engine/AnalyzeAtsMatch';
import { AtsScanReport } from '../../domain/ats-engine/AtsScanReport';
import { SupabaseAtsRepository } from '../repositories/SupabaseAtsRepository';
import { SupabaseCvRepository } from '../repositories/SupabaseCvRepository';
import { z } from 'zod';

const atsScanRequestSchema = z.object({
  cvId: z.string().uuid(),
  jobOfferText: z.string().trim().min(20).max(20_000),
  jobOfferTitle: z.string().trim().max(160).optional(),
  companyName: z.string().trim().max(160).optional(),
  resumeName: z.string().trim().max(160).optional(),
  resumeText: z.string().trim().min(1).max(20_000),
});

export interface AtsScanApiRequest {
  cvId: string;
  jobOfferText: string;
  jobOfferTitle?: string;
  companyName?: string;
  resumeName?: string;
  resumeText: string;
}

export interface AtsScanApiResponse {
  success: boolean;
  report?: AtsScanReport;
  error?: string;
}

export async function handleAtsScanRoute(
  reqBody: AtsScanApiRequest,
  callerId: string
): Promise<AtsScanApiResponse> {
  try {
    const parsedRequest = atsScanRequestSchema.safeParse(reqBody);
    if (!parsedRequest.success) {
      return { success: false, error: 'Vérifiez le CV sélectionné et le contenu de l’offre.' };
    }

    const input = parsedRequest.data;
    const cvRepository = new SupabaseCvRepository();
    const atsRepository = new SupabaseAtsRepository();
    const useCase = new AnalyzeAtsMatchUseCase();

    const cv = await cvRepository.getCvById(input.cvId, callerId);
    if (!cv) {
      return { success: false, error: 'CV introuvable ou accès refusé.' };
    }

    const report = await useCase.execute(
      input as AnalyzeAtsInput,
      cv,
      callerId,
      (rep) => atsRepository.saveAtsScanReport(rep, callerId, {
        companyName: input.companyName,
        resumeName: input.resumeName || cv.name,
        resumeText: input.resumeText,
        jobDescription: input.jobOfferText,
      })
    );

    return {
      success: true,
      report,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Une erreur est survenue lors de l\'analyse ATS.',
    };
  }
}
