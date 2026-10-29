import { JobPosting } from '../../domain/job-posting/JobPosting';
import { IJobPostingRepository, JobPostingRepository } from '../../infrastructure/repositories/JobPostingRepository';

export class GetPublishedJobPostingsUseCase {
  constructor(private jobPostingRepo: IJobPostingRepository = new JobPostingRepository()) {}

  async execute(): Promise<JobPosting[]> {
    return this.jobPostingRepo.getPublished();
  }
}
