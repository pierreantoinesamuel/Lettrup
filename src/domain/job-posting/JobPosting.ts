export type JobPostingSource = 'recruiter_submitted' | 'user_pasted';
export type JobPostingStatus = 'pending_review' | 'published' | 'rejected';

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  location?: string;
  descriptionText: string;
  salaryRange?: string;
  source: JobPostingSource;
  postedByUserId?: string | null;
  status: JobPostingStatus;
  createdAt: string;
}

export interface JobPostingInput {
  title: string;
  company: string;
  location?: string;
  descriptionText: string;
  salaryRange?: string;
}
