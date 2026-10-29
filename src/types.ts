export type JobStatus = 'Saved' | 'Applied' | 'Interview' | 'Offer' | 'Rejected';

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  location?: string;
  salary?: string;
  status: JobStatus;
  dateAdded: string;
  url?: string;
  logo?: string;
  notes?: string;
  is_internal?: boolean;
  job_id?: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  current?: boolean;
  description: string;
}

export interface ProjectItem {
  id?: string;
  name: string;
  description: string;
  link?: string;
}

export interface EducationItem {
  id?: string;
  institution: string;
  degree: string;
  startDate?: string;
  endDate?: string;
}

export type CoverLetterTemplate = 
  | 'formelle' | 'professionnelle' | 'type' | 'rafraichissant' | 'dynamique' | 'contemporain'
  | 'structure' | 'neutre' | 'moderne-minimaliste' | 'impactant' | 'moderne' | 'elegant'
  | 'chic' | 'audacieux' | 'sobre' | 'harmonieux' | 'sophistique' | 'graphique'
  | 'minimal-blue' | 'modern-slate' | 'classic-serif' | 'creative-violet';

export type ResumeTemplate = 'classique-paris' | 'moderne-amsterdam' | 'elegant-lyon' | 'creative-bold' | 'tech-sanfrancisco';

export interface SavedResume {
  id: string;
  name: string;
  jobTitle?: string;
  data: ResumeProfile;
  lastModified?: string;
}

export interface ResumeProfile {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  drivingLicense?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  photoUrl?: string;
  summary: string;
  skills: string[];
  experience: ExperienceItem[];
  projects?: ProjectItem[];
  education?: EducationItem[];
  template?: ResumeTemplate;
}

