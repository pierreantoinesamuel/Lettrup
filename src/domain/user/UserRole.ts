export type UserRole = 'job_seeker' | 'recruiter' | 'admin';

export interface UserProfileDomain {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  companyName?: string;
  companyWebsite?: string;
  companyTitle?: string;
}
