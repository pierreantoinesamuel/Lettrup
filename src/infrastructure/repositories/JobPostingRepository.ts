import { JobPosting, JobPostingStatus } from '../../domain/job-posting/JobPosting';

export interface IJobPostingRepository {
  save(posting: JobPosting): Promise<void>;
  getById(id: string): Promise<JobPosting | null>;
  getPublished(): Promise<JobPosting[]>;
  getByUserId(userId: string): Promise<JobPosting[]>;
  updateStatus(id: string, status: JobPostingStatus): Promise<void>;
}

const jobPostingStore = new Map<string, JobPosting>();

export class JobPostingRepository implements IJobPostingRepository {
  async save(posting: JobPosting): Promise<void> {
    jobPostingStore.set(posting.id, { ...posting });
  }

  async getById(id: string): Promise<JobPosting | null> {
    return jobPostingStore.get(id) || null;
  }

  async getPublished(): Promise<JobPosting[]> {
    return Array.from(jobPostingStore.values()).filter((p) => p.status === 'published');
  }

  async getByUserId(userId: string): Promise<JobPosting[]> {
    return Array.from(jobPostingStore.values()).filter((p) => p.postedByUserId === userId);
  }

  async updateStatus(id: string, status: JobPostingStatus): Promise<void> {
    const existing = jobPostingStore.get(id);
    if (existing) {
      jobPostingStore.set(id, { ...existing, status });
    }
  }
}
