/**
 * Infrastructure Layer: API Route Handler for all client-facing AI operations
 * Route: POST /api/ai/invoke
 *
 * Every AI engine (resume builder, ATS, cover letter, interview, LinkedIn,
 * career roadmap, AI coach, salary, learning hub) previously ran client-side,
 * which meant the OpenRouter/Gemini provider keys shipped inside the browser
 * bundle (VITE_* fallbacks in GeminiAdapter/OpenRouterAdapter) and were
 * extractable by anyone. This route moves execution server-side behind auth
 * so provider keys never leave the server. geminiService.ts on the client
 * is a thin fetch wrapper calling this single endpoint by op name — no
 * calling component needed to change.
 */

import { verifySupabaseUser } from '../auth/verifySupabaseUser';
import { getSupabaseAdminClient } from '../supabase/supabaseAdminClient';
import { resumeAIEngine } from '../../features/resume-builder/infrastructure/ai/ResumeAIEngine';
import { atsAIEngine } from '../../features/ats-engine/infrastructure/ai/ATSAIEngine';
import { coverLetterAIEngine } from '../../features/cover-letter/infrastructure/ai/CoverLetterAIEngine';
import { interviewAIEngine } from '../../features/interview/infrastructure/ai/InterviewAIEngine';
import { linkedInAIEngine } from '../../features/linkedin/infrastructure/ai/LinkedInAIEngine';
import { careerRoadmapAIEngine } from '../../features/career-roadmap/infrastructure/ai/CareerRoadmapAIEngine';
import { careerCoachAIEngine } from '../../features/ai-coach/infrastructure/ai/CareerCoachAIEngine';
import { salaryAIEngine } from '../../features/salary/infrastructure/ai/SalaryAIEngine';
import { LearningAIAdapter } from '../../features/learning-hub/infrastructure/LearningAIAdapter';
import { AIProviderRegistry } from '../../shared/ai/AIProviderRegistry';
import { z } from 'zod';
import { sanitizeAiJson } from '../../shared/ai/sanitizeAiOutput';
import { getUserPlan, hasMinimumPlan, AccountPlan } from '../billing/entitlementService';

const learningAIAdapter = new LearningAIAdapter();

export const MAX_TEXT_LENGTH = 20000;
// Bounds each top-level arg's own serialized size, independent of the
// express.json({ limit: '100kb' }) cap on the whole request body — that cap
// still lets one arg alone (e.g. a pasted resume/job description) consume
// nearly all of it, which this catches with a clearer, per-field error.
function isWithinLengthLimit(value: unknown): boolean {
  if (typeof value === 'string') return value.length <= MAX_TEXT_LENGTH;
  if (value === null || typeof value !== 'object') return true;
  return JSON.stringify(value).length <= MAX_TEXT_LENGTH;
}
export const argsSchema = z
  .array(z.unknown())
  .min(1)
  .max(8)
  .refine((args) => args.every(isWithinLengthLimit), {
    message: `Un ou plusieurs paramètres dépassent la limite de ${MAX_TEXT_LENGTH} caractères.`,
  });
// Every op that used to require 'plus' now requires only 'pro' — 'plus' was
// retired as a separate tier and folded into 'pro' (see PlanAccess.ts /
// entitlementService.ts). Career Strategy uses the Learning Hub AI pipeline,
// so those operations are PRO-accessible too.
export const AI_MINIMUM_PLANS: Record<string, AccountPlan> = {
  'resume.generateSummary': 'free_trial', 'resume.generateBullets': 'free_trial',
  'resume.bulletifyText': 'free_trial', 'resume.createSection': 'free_trial', 'resume.optimizeText': 'free_trial',
  'resume.boostSeniority': 'pro', 'resume.auditResume': 'free_trial',
  'resume.autoOptimizeResume': 'pro', 'resume.parseResumeWithAI': 'free_trial',
  'ats.analyzeJobMatch': 'pro', 'coverLetter.generateCoverLetter': 'pro',
  'coverLetter.generateCoverLetterAdvanced': 'pro', 'coverLetter.reformatCoverLetter': 'pro',
  'interview.getInterviewQuestion': 'pro', 'interview.generateInterviewQuestions': 'pro',
  'interview.analyzeInterviewSession': 'pro', 'linkedin.auditLinkedinProfile': 'pro',
  'linkedin.generateLinkedinAbout': 'pro', 'linkedin.generateLinkedInProfileDescription': 'pro',
  'linkedin.generateOutreachMessage': 'pro', 'careerRoadmap.generateCareerPath': 'pro',
  'careerRoadmap.analyzeSkillGaps': 'pro', 'aiCoach.generateCareerStrategyPipeline': 'pro',
  'salary.estimateSalaryRange': 'pro', 'learningHub.analyzeSkillGap': 'pro',
  'learningHub.generateRoadmap': 'pro',
};

// Every op takes a fixed-shape args array mirroring the client function
// signature it replaces (see geminiService.ts) — never a free-form payload,
// so this stays a fixed whitelist rather than an arbitrary RPC surface.
export const AI_OPERATIONS: Record<string, (args: any[]) => Promise<any>> = {
  'resume.generateSummary': ([jobTitle, experience, skills]) =>
    resumeAIEngine.generateSummary(jobTitle, experience, skills),
  'resume.generateBullets': ([role, company, description]) =>
    resumeAIEngine.generateBullets(role, company, description),
  'resume.bulletifyText': ([text]) => resumeAIEngine.bulletifyText(text),
  'resume.createSection': ([sectionRequest, resumeText]) =>
    resumeAIEngine.generateResumeSection(sectionRequest, resumeText),
  'resume.optimizeText': ([text, targetRole]) => resumeAIEngine.optimizeText(text, targetRole),
  'resume.boostSeniority': ([text, targetLevel]) => resumeAIEngine.boostSeniority(text, targetLevel),
  'resume.auditResume': ([resumeText, jobDescription]) => resumeAIEngine.auditResume(resumeText, jobDescription),
  'resume.autoOptimizeResume': ([resumeData, jobDesc]) => resumeAIEngine.autoOptimizeResume(resumeData, jobDesc),
  'resume.parseResumeWithAI': ([fileText]) => resumeAIEngine.parseResumeWithAI(fileText),

  'ats.analyzeJobMatch': ([jobDescription, resumeText]) => atsAIEngine.analyzeJobMatch(jobDescription, resumeText),

  'coverLetter.generateCoverLetter': ([resumeText, jobDescription, companyName]) =>
    coverLetterAIEngine.generateCoverLetter(resumeText, jobDescription, companyName),
  'coverLetter.generateCoverLetterAdvanced': ([resumeText, jobDescription, companyName, tone]) =>
    coverLetterAIEngine.generateCoverLetterAdvanced(resumeText, jobDescription, companyName, tone),
  'coverLetter.reformatCoverLetter': ([content, layoutStyle]) =>
    coverLetterAIEngine.reformatCoverLetter(content, layoutStyle),

  'interview.getInterviewQuestion': ([jobTitle, category, difficulty]) =>
    interviewAIEngine.getInterviewQuestion(jobTitle, category, difficulty),
  'interview.generateInterviewQuestions': ([role, seniority, count, jobDescription, company, interviewType, language]) =>
    interviewAIEngine.generateInterviewQuestions(role, seniority, count, jobDescription, company, interviewType, language),
  'interview.analyzeInterviewSession': ([transcript]) => interviewAIEngine.analyzeInterviewSession(transcript),

  'linkedin.auditLinkedinProfile': ([profileText]) => linkedInAIEngine.auditLinkedinProfile(profileText),
  'linkedin.generateLinkedinAbout': ([headline, summary, keySkills]) =>
    linkedInAIEngine.generateLinkedinAbout(headline, summary, keySkills),
  'linkedin.generateLinkedInProfileDescription': ([role, highlights]) =>
    linkedInAIEngine.generateLinkedInProfileDescription(role, highlights),
  'linkedin.generateOutreachMessage': ([targetName, targetRole, reason]) =>
    linkedInAIEngine.generateOutreachMessage(targetName, targetRole, reason),

  'careerRoadmap.generateCareerPath': ([currentRole, targetRole, yearsExp]) =>
    careerRoadmapAIEngine.generateCareerPath(currentRole, targetRole, yearsExp),
  'careerRoadmap.analyzeSkillGaps': ([currentSkills, requiredSkills]) =>
    careerRoadmapAIEngine.analyzeSkillGaps(currentSkills, requiredSkills),

  'aiCoach.generateCareerStrategyPipeline': ([profileOverview, goals]) =>
    careerCoachAIEngine.generateCareerStrategyPipeline(profileOverview, goals),

  'salary.estimateSalaryRange': ([jobTitle, location, yearsExp, skills]) =>
    salaryAIEngine.estimateSalaryRange(jobTitle, location, yearsExp, skills),

  'learningHub.analyzeSkillGap': ([input]) => learningAIAdapter.analyzeSkillGap(input),
  'learningHub.generateRoadmap': ([input]) => learningAIAdapter.generateRoadmap(input),
};

export interface AiInvokeApiRequest {
  op: string;
  args: any[];
}

export interface AiInvokeApiResponse {
  success: boolean;
  result?: any;
  error?: string;
}

export async function handleAiInvokeRoute(
  reqBody: AiInvokeApiRequest,
  authorizationHeader: string | undefined
): Promise<AiInvokeApiResponse> {
  const user = await verifySupabaseUser(authorizationHeader);
  if (!user) {
    return { success: false, error: 'Authentification requise.' };
  }

  const handler = reqBody?.op ? AI_OPERATIONS[reqBody.op] : undefined;
  if (!handler) {
    return { success: false, error: 'Opération non reconnue.' };
  }

  const plan = await getUserPlan(user.id);
  const minimumPlan = AI_MINIMUM_PLANS[reqBody.op];
  if (!plan || !minimumPlan || !hasMinimumPlan(plan, minimumPlan)) {
    return { success: false, error: 'Cette fonctionnalité nécessite une formule supérieure.' };
  }
  const parsedArgs = argsSchema.safeParse(reqBody.args);
  if (!parsedArgs.success) {
    return { success: false, error: 'Paramètres IA invalides.' };
  }

  try {
    const result = await handler(parsedArgs.data as any[]);
    return { success: true, result: sanitizeAiJson(result) };
  } catch (err: any) {
    return { success: false, error: err?.message || "Une erreur est survenue lors de l'appel IA." };
  }
}

/**
 * Route: POST /api/admin/ai-oversight
 *
 * Admin-only platform oversight analysis. Requires profiles.role === 'admin'
 * (checked server-side via the service-role client, same pattern as
 * adminEmployerVerificationApi.ts) since this reads aggregate platform data
 * across all users, not just the caller's own account.
 */
export interface AdminAiOversightPayload {
  candidates: Array<{ id: string; name: string; email: string; status: string; plan: string }>;
  employers: Array<{ id: string; name: string; email: string; status: string }>;
  jobs: Array<{ id: string; title: string; company: string; flag: string; status: string }>;
  applications: Array<{ id: string; score: number; status: string }>;
  ai_agents: Array<{ name: string; status: string; errors: number }>;
  workflows: Array<{ name: string; status: string; failures: number }>;
}

export interface AdminAiOversightApiResponse {
  success: boolean;
  result?: {
    alerts: string[];
    suspicious_accounts: string[];
    job_posts_to_review: string[];
    workflow_issues: string[];
    ai_agent_issues: string[];
    recommended_actions: Array<{ label: string; type: string; targetId: string }>;
  };
  error?: string;
}

function buildAdminOversightPrompt(payload: AdminAiOversightPayload): string {
  return `
Tu es l'Agent IA d'Oversight (Supervision) pour l'administrateur de la plateforme Lettrup.

Analyses les données de la plateforme ci-dessous :
${JSON.stringify(payload, null, 2)}

Tes responsabilités :
1. Résumer l'activité globale.
2. Détecter les comptes ou comportements suspects.
3. Identifier les offres d'emploi à réviser ou modérer.
4. Signaler les dysfonctionnements des workflows ou des agents IA.
5. Proposer des actions administratives concrètes recommandées, en ciblant UNIQUEMENT des "id" réels présents dans les données ci-dessus (candidates[].id, employers[].id, jobs[].id) — n'invente jamais d'identifiant.

Renvoie UNIQUEMENT un objet JSON strict au format exact suivant sans texte autour :
{
  "alerts": ["string"],
  "suspicious_accounts": ["string"],
  "job_posts_to_review": ["string"],
  "workflow_issues": ["string"],
  "ai_agent_issues": ["string"],
  "recommended_actions": [
    { "label": "string (description lisible de l'action)", "type": "suspend_employer" | "approve_employer" | "ban_candidate" | "approve_job" | "reject_job", "targetId": "string (id réel exact tiré des données ci-dessus)" }
  ]
}
`;
}

export async function handleAdminAiOversightRoute(
  reqBody: AdminAiOversightPayload,
  authorizationHeader: string | undefined
): Promise<AdminAiOversightApiResponse> {
  const caller = await verifySupabaseUser(authorizationHeader);
  if (!caller) {
    return { success: false, error: 'Authentification requise.' };
  }

  const admin = getSupabaseAdminClient();
  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', caller.id).maybeSingle();
  if (callerProfile?.role !== 'admin') {
    return { success: false, error: 'Accès refusé.' };
  }

  try {
    const provider = await AIProviderRegistry.getInstance().getFor('ai-coach');
    const res = await provider.complete({
      prompt: buildAdminOversightPrompt(sanitizeAiJson(reqBody)),
      responseMimeType: 'application/json',
    });

    if (!res.text) {
      return { success: false, error: "Réponse IA vide." };
    }

    const parsed = JSON.parse(res.text);
    return { success: true, result: sanitizeAiJson(parsed) };
  } catch (err: any) {
    return { success: false, error: err?.message || "L'analyse IA a échoué." };
  }
}
