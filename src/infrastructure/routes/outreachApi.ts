/**
 * Infrastructure Layer: API Route Handler for Recruiter Cold Outreach
 * Route: POST /api/outreach/generate
 */

import { GenerateOutreachMessageUseCase } from '../../application/outreach/GenerateOutreachMessage';
import { OutreachChannel } from '../../domain/outreach/OutreachMessage';

export interface GenerateOutreachApiRequest {
  cvId?: string;
  cvSummary?: string;
  jobOfferRef?: string;
  jobOfferInput: string;
  channel: OutreachChannel;
  language?: 'fr' | 'en';
}

export interface GenerateOutreachApiResponse {
  success: boolean;
  id?: string;
  channel?: OutreachChannel;
  content?: string;
  error?: string;
}

export async function handleGenerateOutreachRoute(
  reqBody: GenerateOutreachApiRequest,
  callerId: string
): Promise<GenerateOutreachApiResponse> {
  try {
    const useCase = new GenerateOutreachMessageUseCase();
    const result = await useCase.execute({
      cvId: reqBody.cvId,
      cvSummary: reqBody.cvSummary,
      jobOfferInput: reqBody.jobOfferInput,
      channel: reqBody.channel,
      language: reqBody.language || 'fr',
    }, callerId);

    return {
      success: true,
      id: result.id,
      channel: result.channel,
      content: result.content,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Une erreur est survenue lors de la génération du message.',
    };
  }
}
