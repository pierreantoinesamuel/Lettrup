/**
 * Client-side facade for every AI feature. Each export used to instantiate
 * an Engine class directly (ResumeAIEngine, ATSAIEngine, ...), which pulled
 * GeminiAdapter/OpenRouterAdapter — and their provider API keys — into the
 * browser bundle. All calls now go through the authenticated server route
 * /api/ai/invoke (see src/infrastructure/routes/aiEngineApi.ts); the
 * function signatures below are unchanged so no calling component needs
 * to change.
 */

import { supabase } from '../lib/supabase';
import { mergeParsedResumeChunks, mergeResumeAuditChunks, splitResumeText } from '../utils/resumeImport';

async function invokeAI<T = any>(op: string, args: any[]): Promise<T> {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;

  const res = await fetch('/api/ai/invoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ op, args }),
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Une erreur est survenue lors de l\'appel IA.');
  }
  return data.result as T;
}

export const generateSummary = (jobTitle: string, experience: string, skills: string[]) =>
  invokeAI<string>('resume.generateSummary', [jobTitle, experience, skills]);

export const generateBullets = (role: string, company: string, description: string) =>
  invokeAI<string[]>('resume.generateBullets', [role, company, description]);

export const bulletifyText = (text: string) => invokeAI<string>('resume.bulletifyText', [text]);

export const optimizeText = (text: string, targetRole: string) =>
  invokeAI<string>('resume.optimizeText', [text, targetRole]);

export const generateResumeSection = async (sectionRequest: string, resumeText: string) => {
  const chunks = splitResumeText(resumeText);
  if (!chunks.length) throw new Error('Le texte du CV est vide.');
  const generated = await Promise.all(
    chunks.map((chunk) => invokeAI<{ title: string; items: string[] }>('resume.createSection', [sectionRequest, chunk]))
  );
  const items = [...new Set(generated.flatMap((section) => section.items).map((item) => item.trim()).filter(Boolean))];
  if (!items.length) {
    throw new Error('Votre CV ne contient pas assez d’informations pour créer cette rubrique sans inventer de faits.');
  }
  const title = generated.find((section) => section.title.trim())?.title.trim();
  if (!title) throw new Error('L’IA n’a pas proposé de titre pour cette rubrique. Veuillez réessayer.');
  return { title, items };
};

export const boostSeniority = (text: string, targetLevel: string) =>
  invokeAI<string>('resume.boostSeniority', [text, targetLevel]);

export const auditResume = async (resumeText: string, jobDescription?: string) => {
  const chunks = splitResumeText(resumeText);
  if (!chunks.length) throw new Error('Le texte du CV est vide.');
  const audits = await Promise.all(
    chunks.map((chunk) => invokeAI<{
      atsScore: number;
      summary: string;
      strengths: string[];
      improvements: string[];
      missingKeywords: string[];
    }>('resume.auditResume', [chunk, jobDescription]))
  );
  return mergeResumeAuditChunks(audits, chunks.map((chunk) => chunk.length));
};

export const autoOptimizeResume = (resumeData: any, jobDesc: string) =>
  invokeAI('resume.autoOptimizeResume', [resumeData, jobDesc]);

export const parseResumeWithAI = async (fileText: string) => {
  const chunks = splitResumeText(fileText);
  if (!chunks.length) throw new Error('Le texte du CV est vide.');
  const parsed = await Promise.all(
    chunks.map((chunk) => invokeAI('resume.parseResumeWithAI', [chunk]))
  );
  return mergeParsedResumeChunks(parsed);
};

export const analyzeJobMatch = (jobDescription: string, resumeText: string) =>
  invokeAI('ats.analyzeJobMatch', [jobDescription, resumeText]);

export const generateCoverLetter = (resumeText: string, jobDescription: string, companyName: string) =>
  invokeAI<string>('coverLetter.generateCoverLetter', [resumeText, jobDescription, companyName]);

export const generateCoverLetterAdvanced = (
  resumeText: string,
  jobDescription: string,
  companyName: string,
  tone: string
) => invokeAI<string>('coverLetter.generateCoverLetterAdvanced', [resumeText, jobDescription, companyName, tone]);

export const reformatCoverLetter = (content: string, layoutStyle: string) =>
  invokeAI<string>('coverLetter.reformatCoverLetter', [content, layoutStyle]);

export const getInterviewQuestion = (jobTitle: string, category: string, difficulty: string) =>
  invokeAI('interview.getInterviewQuestion', [jobTitle, category, difficulty]);

export const generateInterviewQuestions = (
  role: string,
  seniority: string,
  count?: number,
  jobDescription?: string,
  company?: string,
  interviewType?: string,
  language?: 'en' | 'fr'
) => invokeAI('interview.generateInterviewQuestions', [
  role,
  seniority,
  count,
  jobDescription,
  company,
  interviewType,
  language,
]);

export const analyzeInterviewSession = (transcript: { question: string; answer: string }[]) =>
  invokeAI('interview.analyzeInterviewSession', [transcript]);

export const auditLinkedinProfile = (profileText: string) =>
  invokeAI('linkedin.auditLinkedinProfile', [profileText]);

export const generateLinkedinAbout = (headline: string, summary: string, keySkills: string[]) =>
  invokeAI<string>('linkedin.generateLinkedinAbout', [headline, summary, keySkills]);

export const generateLinkedInProfileDescription = (role: string, highlights: string[]) =>
  invokeAI<string>('linkedin.generateLinkedInProfileDescription', [role, highlights]);

export const generateOutreachMessage = (targetName: string, targetRole: string, reason: string) =>
  invokeAI<string>('linkedin.generateOutreachMessage', [targetName, targetRole, reason]);

export const generateCareerPath = (currentRole: string, targetRole: string, yearsExp: number) =>
  invokeAI('careerRoadmap.generateCareerPath', [currentRole, targetRole, yearsExp]);

export const analyzeSkillGaps = (currentSkills: string[], requiredSkills: string[]) =>
  invokeAI('careerRoadmap.analyzeSkillGaps', [currentSkills, requiredSkills]);

export const generateCareerStrategyPipeline = (profileOverview: string, goals: string[]) =>
  invokeAI('aiCoach.generateCareerStrategyPipeline', [profileOverview, goals]);

export const estimateSalaryRange = (
  jobTitle: string,
  location: string,
  yearsExp: number,
  skills: string[]
) => invokeAI('salary.estimateSalaryRange', [jobTitle, location, yearsExp, skills]);
