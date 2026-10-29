import { JobPostingStatus } from '../../domain/job-posting/JobPosting';
import { IUserProfileRepository, UserProfileRepository } from '../../infrastructure/repositories/UserProfileRepository';
import { IJobPostingRepository, JobPostingRepository } from '../../infrastructure/repositories/JobPostingRepository';

export interface ReviewJobPostingInput {
  adminUserId: string;
  jobPostingId: string;
  decision: 'approve' | 'reject';
}

export class ReviewJobPostingUseCase {
  constructor(
    private profileRepo: IUserProfileRepository = new UserProfileRepository(),
    private jobPostingRepo: IJobPostingRepository = new JobPostingRepository()
  ) {}

  async execute(input: ReviewJobPostingInput): Promise<void> {
    const adminProfile = await this.profileRepo.getProfile(input.adminUserId);
    if (!adminProfile || adminProfile.role !== 'admin') {
      throw new Error('Unauthorized: Only admin users can review job postings.');
    }

    const posting = await this.jobPostingRepo.getById(input.jobPostingId);
    if (!posting) {
      throw new Error(`Job posting with id ${input.jobPostingId} not found.`);
    }

    const newStatus: JobPostingStatus = input.decision === 'approve' ? 'published' : 'rejected';
    await this.jobPostingRepo.updateStatus(input.jobPostingId, newStatus);
  }
}
