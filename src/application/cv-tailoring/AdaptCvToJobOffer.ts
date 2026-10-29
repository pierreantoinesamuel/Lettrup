/**
 * Application Use Case: AdaptCvToJobOffer
 * Runs the 3-task AI pipeline (extract → analyze → generate) against a job posting.
 *
 * Pipeline boundary rule: this use case receives plain text only.
 * URL scraping and SHA-256 caching happen in the API route layer before this runs.
 */

import { TailoredCv, validateNoFabricatedFacts } from '../../domain/cv-tailoring/TailoredCv';
import { computeMatchGaps, MatchGap } from '../../domain/cv-tailoring/MatchGap';
import { AIProviderRegistry } from '../../shared/ai/AIProviderRegistry';
import { ResumeProfile, SavedResume, ExperienceItem } from '../../types';
import { EntitlementService } from '../billing/EntitlementGate';
import { TrialLifecycleRepository } from '../../infrastructure/repositories/TrialLifecycleRepository';
import { CV_PIPELINE_SYSTEM_PROMPT } from '../../domain/constants/cvPipelineSystemPrompt';
import { serializeCvToText } from './serializeCvToText';
import { callPipelineWithRetry } from './callPipelineWithRetry';
import { logPipelineRun } from './pipelineLogger';
import {
  PipelineTask,
  FullPipelineOutput,
  TailoredExperience,
} from './types';

export interface AdaptCvInput {
  cvId: string;
  jobOfferText?: string;
  jobOfferId?: string;
  sourceUrl?: string;
  task?: PipelineTask;
  userProfile?: {
    name?: string;
    targetRole?: string;
    preferredTone?: string;
    language?: string;
  };
}

export interface AdaptCvOutput {
  tailoredCv: TailoredCv;
  matchGaps: MatchGap[];
  changeSummary: string[];
  diffPreview: {
    originalSummary: string;
    tailoredSummary: string;
  };
  matchScore?: number;
  pipelineResult?: FullPipelineOutput;
}

export class AdaptCvToJobOfferUseCase {
  private aiRegistry = AIProviderRegistry.getInstance();
  private entitlementService = new EntitlementService(new TrialLifecycleRepository());

  async execute(
    input: AdaptCvInput,
    baseCv: SavedResume,
    callerId: string,
    saveRepositoryFn?: (tailoredCv: TailoredCv) => Promise<void>
  ): Promise<AdaptCvOutput> {
    await this.checkEntitlement(callerId);

    const task: PipelineTask = input.task ?? 'full_pipeline';
    const jobOfferText = input.jobOfferText || `Offre d'emploi id: ${input.jobOfferId}`;

    // Validate minimum inputs per task
    if (task === 'analyze_only' || task === 'generate_only' || task === 'full_pipeline') {
      if (!baseCv?.data) {
        throw new Error('CV_MISSING_FOR_ANALYSIS');
      }
    }

    const startMs = Date.now();
    let pipelineResult: FullPipelineOutput | undefined;
    let matchScore: number | undefined;
    let tokensUsed: number | undefined;

    try {
      const serializedCv = serializeCvToText(baseCv.data);

      const userMessage = JSON.stringify({
        task,
        job_posting_text: jobOfferText,
        master_cv: serializedCv,
        user_profile: input.userProfile ?? null,
      });

      const provider = await this.aiRegistry.getFor('resume-builder');
      pipelineResult = await callPipelineWithRetry(provider, CV_PIPELINE_SYSTEM_PROMPT, userMessage);

      matchScore = pipelineResult.task_2_analysis?.match_score;
    } catch (err: any) {
      await logPipelineRun({
        userId: callerId,
        cvId: baseCv.id,
        jobUrl: input.sourceUrl,
        task,
        durationMs: Date.now() - startMs,
        success: false,
        error: err.message,
      });
      throw err;
    }

    // Map Task 3 → ResumeProfile
    const finalProfile = this.mapGenerationToProfile(baseCv.data, pipelineResult);

    // Anti-fabrication guardrail
    const validation = validateNoFabricatedFacts(baseCv.data, finalProfile);
    const sanitized = validation.sanitizedProfile;

    // Build legacy MatchGap[] from Task 2 keywords (used by existing UI components)
    const expText = baseCv.data.experience
      .map((e) => `${e.role} ${e.company} ${e.description}`)
      .join(' ');
    const extractedRequirements =
      pipelineResult.task_1_extraction?.requirements ?? [];
    const matchGaps = computeMatchGaps(extractedRequirements, baseCv.data.skills, expText);

    const changeSummaryList = [
      ...(pipelineResult.task_3_generation?.change_log ?? [
        'Réorganisation axée sur les mots-clés de l\'offre sans modification de faits.',
      ]),
      ...validation.violations.map((v) => `[Garde-fou Sécurité] ${v}`),
    ];

    const tailoredCv: TailoredCv = {
      id: `tailored-${Date.now()}`,
      sourceCvId: baseCv.id,
      jobOfferRef:
        input.sourceUrl ||
        input.jobOfferId ||
        pipelineResult.task_1_extraction?.job_title ||
        input.jobOfferText?.slice(0, 50) ||
        'Offre D\'Emploi',
      isTailored: true,
      name: `${baseCv.name} (Adapté: ${pipelineResult.task_1_extraction?.job_title ?? input.jobOfferId ?? 'Offre'})`,
      jobTitle:
        pipelineResult.task_1_extraction?.job_title ?? baseCv.jobTitle,
      data: sanitized,
      changeSummary: changeSummaryList,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    if (saveRepositoryFn) {
      await saveRepositoryFn(tailoredCv);
    }

    await logPipelineRun({
      userId: callerId,
      cvId: baseCv.id,
      jobUrl: input.sourceUrl,
      task,
      matchScore,
      tokensUsed,
      durationMs: Date.now() - startMs,
      success: true,
    });

    return {
      tailoredCv,
      matchGaps,
      changeSummary: tailoredCv.changeSummary,
      diffPreview: {
        originalSummary: baseCv.data.summary,
        tailoredSummary: sanitized.summary,
      },
      matchScore,
      pipelineResult,
    };
  }

  private mapGenerationToProfile(
    source: ResumeProfile,
    pipeline: FullPipelineOutput
  ): ResumeProfile {
    const gen = pipeline.task_3_generation;
    if (!gen) return source;

    const tailoredCvOutput = gen.tailored_cv;

    // Map experience by company + title + dates match (not by index)
    const mappedExperience: ExperienceItem[] = source.experience.map((srcExp) => {
      const match = tailoredCvOutput.experience?.find(
        (t: TailoredExperience) =>
          t.company?.toLowerCase().trim() === srcExp.company?.toLowerCase().trim() &&
          t.title?.toLowerCase().trim() === srcExp.role?.toLowerCase().trim()
      );

      if (!match) return srcExp;

      return {
        ...srcExp,
        description: match.bullets?.join('\n') ?? srcExp.description,
      };
    });

    // Reorder experience if the pipeline specified an order
    const reorder = pipeline.task_2_analysis?.recommended_cv_order;
    let orderedExperience = mappedExperience;
    if (reorder?.length) {
      orderedExperience = [
        ...mappedExperience.filter((e) =>
          reorder.some(
            (id) =>
              id === e.id ||
              id.toLowerCase().includes(e.company.toLowerCase())
          )
        ),
        ...mappedExperience.filter(
          (e) =>
            !reorder.some(
              (id) =>
                id === e.id ||
                id.toLowerCase().includes(e.company.toLowerCase())
            )
        ),
      ];
    }

    return {
      ...source,
      summary: tailoredCvOutput.summary ?? source.summary,
      skills: Array.isArray(tailoredCvOutput.skills) && tailoredCvOutput.skills.length > 0
        ? tailoredCvOutput.skills
        : source.skills,
      experience: orderedExperience,
    };
  }

  private async checkEntitlement(callerId: string): Promise<void> {
    const res = await this.entitlementService.checkEntitlement(callerId);
    if (!res.allowed) {
      throw new Error(
        res.reason === 'payment_required'
          ? 'Votre période d\'essai est terminée. Veuillez souscrire à un abonnement pour générer des CV.'
          : 'Votre compte est bloqué ou suspendu.'
      );
    }
  }
}
