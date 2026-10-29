import { ResumeProfile, ExperienceItem, EducationItem, ProjectItem } from '../types';
import { RawResumeData } from './resumeStore';

function decodeHtmlEntities(value: string): string {
  if (typeof document === 'undefined') {
    return value
      .replace(/&nbsp;/gi, ' ')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&quot;/gi, '"')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>');
  }

  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

function toPlainText(value: unknown): string {
  return decodeHtmlEntities(String(value || '').replace(/<[^>]*>?/gm, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

// Converts a `user_resumes.resume_data` row (ResumeBuilder's `coordonnees`/`profil`/
// `competences` shape) into the `ResumeProfile` shape used by CoverLetterGenerator
// and PortfolioBuilder, so those views show the signed-in user's real CV instead of
// the built-in placeholder profile.
export function adaptResumeDataToProfile(resumeData: RawResumeData): ResumeProfile | null {
  if (!resumeData || typeof resumeData !== 'object') return null;
  const c = resumeData.coordonnees || {};
  if (!c.name && !resumeData.profil) return null;

  const experience: ExperienceItem[] = Array.isArray(resumeData.experience)
    ? resumeData.experience.map((exp: any, i: number) => ({
        id: exp.id || String(i + 1),
        company: exp.company || '',
        role: exp.jobTitle || '',
        startDate: exp.startDate || '',
        endDate: exp.current ? 'Présent' : (exp.endDate || ''),
        current: Boolean(exp.current),
        description: toPlainText(exp.description),
      }))
    : [];

  const education: EducationItem[] = Array.isArray(resumeData.education)
    ? resumeData.education.map((edu: any, i: number) => ({
        id: edu.id || String(i + 1),
        institution: edu.institution || '',
        degree: edu.degree || '',
        startDate: edu.date || '',
      }))
    : [];

  const projects: ProjectItem[] = Array.isArray(resumeData.projets)
    ? resumeData.projets.map((p: any, i: number) => ({
        id: p.id || String(i + 1),
        name: p.name || '',
        description: toPlainText(p.description),
      }))
    : [];

  const skills: string[] = typeof resumeData.competences === 'string'
    ? resumeData.competences.split(/[\n,]/).map((s: string) => s.trim()).filter(Boolean)
    : [];

  return {
    fullName: c.name || '',
    email: c.email || '',
    phone: c.phone || '',
    location: c.location || '',
    drivingLicense: c.drivingLicense || '',
    website: c.website || '',
    linkedin: c.linkedin || '',
    github: c.github || '',
    photoUrl: c.photoUrl || '',
    summary: resumeData.profil || '',
    skills,
    experience,
    projects,
    education,
  };
}
