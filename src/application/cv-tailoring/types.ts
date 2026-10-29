export type PipelineTask = 'full_pipeline' | 'extract_only' | 'analyze_only' | 'generate_only';

export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Internship' | 'Freelance';
export type Seniority = 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Executive';
export type JobTone = 'formal' | 'casual' | 'mission-driven' | 'technical' | 'creative';
export type GapSeverity = 'low' | 'medium' | 'high';

export interface Task1Extraction {
  job_title: string;
  company_name: string;
  company_logo_url: string | null;
  location: string;
  employment_type: EmploymentType | null;
  seniority: Seniority | null;
  salary_range: string | null;
  posted_date: string | null;
  language: 'fr' | 'en' | 'other';
  description_summary: string;
  responsibilities: string[];
  requirements: string[];
  nice_to_have: string[];
  keywords: string[];
  company_values: string[];
  tone: JobTone;
  red_flags: string[];
}

export interface StrongestExperience {
  experience_id: string;
  why: string;
}

export interface AnalysisGap {
  requirement: string;
  severity: GapSeverity;
  suggestion: string;
}

export interface Task2Analysis {
  match_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  strongest_experiences: StrongestExperience[];
  weakest_experiences: string[];
  transferable_skills: string[];
  gaps: AnalysisGap[];
  recommended_cv_order: string[];
}

export interface TailoredExperience {
  title: string;
  company: string;
  dates: string;
  bullets: string[];
}

export interface TailoredEducation {
  degree: string;
  institution: string;
  dates?: string;
}

export interface TailoredCvOutput {
  headline: string;
  summary: string;
  experience: TailoredExperience[];
  skills: string[];
  education: TailoredEducation[];
  ats_score_estimate: number;
}

export interface CoverLetterOutput {
  subject_line: string;
  body: string;
  tone_used: string;
  word_count: number;
}

export interface Task3Generation {
  tailored_cv: TailoredCvOutput;
  cover_letter: CoverLetterOutput;
  change_log: string[];
}

export interface FullPipelineOutput {
  task_1_extraction?: Task1Extraction;
  task_2_analysis?: Task2Analysis;
  task_3_generation?: Task3Generation;
}

export interface PipelineError {
  error: 'missing_cv' | 'not_a_job_posting' | 'unsupported_language' | 'insufficient_data' | string;
  missing?: string[];
}
