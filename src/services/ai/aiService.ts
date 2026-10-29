import { generateCoverLetterAdvanced as generateCoverLetterAdvancedRemote } from '../geminiService';
import { ResumeProfile } from '../../types';

export async function generateOutreachMessage(
  resume: ResumeProfile,
  recruiter: string,
  company: string,
  context: string,
  _style?: string,
  _lang: string = 'fr'
): Promise<string> {
  const resumeSummary = `${resume.fullName}\n${resume.summary}\nCompétences: ${resume.skills.join(', ')}`;
  return generateCoverLetterAdvancedRemote(resumeSummary, context, company, recruiter);
}

export async function generateCoverLetterAdvanced(
  resume: ResumeProfile,
  jobDescription: string,
  options: {
    tone?: string;
    length?: string;
    company?: string;
    lang?: string;
  }
): Promise<string> {
  const resumeSummary = `${resume.fullName}\n${resume.summary}\nCompétences: ${resume.skills.join(', ')}`;
  return generateCoverLetterAdvancedRemote(
    resumeSummary,
    jobDescription,
    options.company || '',
    options.tone || 'professionnel'
  );
}
