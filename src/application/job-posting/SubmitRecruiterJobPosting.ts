import { JobPosting, JobPostingInput } from '../../domain/job-posting/JobPosting';
import { validateJobPostingSubmission } from '../../domain/job-posting/JobPostingValidation';
import { IUserProfileRepository, UserProfileRepository } from '../../infrastructure/repositories/UserProfileRepository';
import { IJobPostingRepository, JobPostingRepository } from '../../infrastructure/repositories/JobPostingRepository';
import { ParseJobPostingUseCase } from './ParseJobPosting';

export class SubmitRecruiterJobPostingUseCase {
  constructor(
    private profileRepo: IUserProfileRepository = new UserProfileRepository(),
    private jobPostingRepo: IJobPostingRepository = new JobPostingRepository(),
    private parseJobPostingUseCase: ParseJobPostingUseCase = new ParseJobPostingUseCase()
  ) {}

  async execute(recruiterUserId: string, input: JobPostingInput): Promise<JobPosting> {
    // 1. Confirm caller has role = 'recruiter' (Application-layer defense in depth)
    const profile = await this.profileRepo.getProfile(recruiterUserId);
    if (!profile || profile.role !== 'recruiter') {
      throw new Error('Unauthorized: Only users with role recruiter can submit job postings.');
    }

    // 2. Pure domain validation
    const validation = validateJobPostingSubmission(input);
    if (!validation.valid) {
      throw new Error(`Invalid job posting: ${validation.errors.join(', ')}`);
    }

    // 3. Create JobPosting entity with status = 'pending_review' and source = 'recruiter_submitted'
    const posting: JobPosting = {
      id: `jp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: input.title.trim(),
      company: input.company.trim(),
      location: input.location?.trim(),
      descriptionText: input.descriptionText.trim(),
      salaryRange: input.salaryRange?.trim(),
      source: 'recruiter_submitted',
      postedByUserId: recruiterUserId,
      status: 'pending_review',
      createdAt: new Date().toISOString(),
    };

    await this.jobPostingRepo.save(posting);

    // 4. Immediately run description through ParseJobPostingUseCase to populate semantic cache
    await this.parseJobPostingUseCase.execute({
      jobOfferText: posting.descriptionText,
    });

    return posting;
  }
}
