import {
  OutreachChannel,
  OutreachMessage,
  enforceOutreachChannelConstraints,
  LINKEDIN_CONNECTION_NOTE_MAX_LENGTH,
} from '../../domain/outreach/OutreachMessage';
import { IAIProvider } from '../../shared/ai/IAIProvider';
import { AIProviderRegistry } from '../../shared/ai/AIProviderRegistry';
import { EntitlementService } from '../billing/EntitlementGate';
import { TrialLifecycleRepository } from '../../infrastructure/repositories/TrialLifecycleRepository';

export interface GenerateOutreachOptions {
  cvId?: string;
  cvSummary?: string;
  jobOfferInput: string;
  channel: OutreachChannel;
  language?: 'fr' | 'en';
}

export class GenerateOutreachMessageUseCase {
  private entitlementService: EntitlementService;

  constructor(private aiProviderOverride?: IAIProvider, entitlementService?: EntitlementService) {
    this.entitlementService = entitlementService || new EntitlementService(new TrialLifecycleRepository());
  }

  async execute(options: GenerateOutreachOptions, callerId: string): Promise<OutreachMessage> {
    const entitlement = await this.entitlementService.checkEntitlement(callerId);
    if (!entitlement.allowed) {
      throw new Error(
        entitlement.reason === 'payment_required'
          ? 'Votre période d\'essai est terminée. Veuillez souscrire à un abonnement pour générer des messages de prise de contact.'
          : 'Votre compte est bloqué ou suspendu.'
      );
    }

    const channel = options.channel;
    const language = options.language || 'fr';
    const provider =
      this.aiProviderOverride || (await AIProviderRegistry.getInstance().getFor('outreach'));

    const isConnectionNote = channel === 'linkedin_connection_note';
    const maxLenGuide = isConnectionNote ? `STRICT LENGTH LIMIT: Maximum ${LINKEDIN_CONNECTION_NOTE_MAX_LENGTH} characters.` : 'Keep it concise and impactful.';

    const systemPrompt = `You are a career strategist specializing in recruiter outreach.
Write a personalized cold outreach message for a job seeker reaching out to a recruiter or hiring manager.
Channel: ${channel}
Language: ${language === 'fr' ? 'French (formal "vous", professional tone, no unncessary anglicisms)' : 'English'}
${maxLenGuide}

Guidelines:
1. Tailor the message to the job position/company and candidate profile.
2. Be polite, direct, and focused on value.
3. ${isConnectionNote ? 'Do NOT include subject lines, formal email greetings/closings, or markdown. Output ONLY the raw text under 300 characters.' : 'Keep paragraphs short and easy to read.'}`;

    const prompt = `Candidate Background Summary:
${options.cvSummary || 'Experienced professional looking for new challenges.'}

Job Offer / Company Info:
${options.jobOfferInput}

Generate the ${channel} outreach message now.`;

    const response = await provider.complete({
      system: systemPrompt,
      prompt,
      temperature: 0.7,
    });

    const rawContent = response.text || '';
    const finalContent = enforceOutreachChannelConstraints(channel, rawContent);

    return {
      id: `outreach_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      cvId: options.cvId,
      jobOfferRef: options.jobOfferInput.slice(0, 100),
      channel,
      content: finalContent,
      createdAt: new Date().toISOString(),
    };
  }
}
