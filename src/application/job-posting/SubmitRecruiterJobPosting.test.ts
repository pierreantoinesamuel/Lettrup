import { SubmitRecruiterJobPostingUseCase } from './SubmitRecruiterJobPosting';
import { UserProfileRepository } from '../../infrastructure/repositories/UserProfileRepository';
import { JobPostingRepository } from '../../infrastructure/repositories/JobPostingRepository';
import { OnboardingBranchUseCase } from '../user/OnboardingBranch';

export async function runSubmitRecruiterJobPostingTests() {
  console.log('--- Testing SubmitRecruiterJobPostingUseCase ---');
  let testCount = 0;

  const profileRepo = new UserProfileRepository();
  const jobPostingRepo = new JobPostingRepository();
  const onboardingUseCase = new OnboardingBranchUseCase(profileRepo);

  // Setup user accounts
  const recruiterId = 'recruiter-123';
  const seekerId = 'seeker-456';

  await onboardingUseCase.execute({
    userId: recruiterId,
    selectedRole: 'recruiter',
    companyName: 'Acme Talent',
    companyTitle: 'Lead Recruiter',
  });

  await onboardingUseCase.execute({
    userId: seekerId,
    selectedRole: 'job_seeker',
  });

  // Mock ParseJobPostingUseCase tracking
  let parseCalledWithText: string | null = null;
  const mockParseUseCase = {
    execute: async (input: { jobOfferText: string }) => {
      parseCalledWithText = input.jobOfferText;
      return {
        contentHash: 'mock-hash',
        extractedKeywords: ['React', 'TypeScript'],
        extractedRequirements: ['5 ans d\'expérience'],
        modelUsed: 'mock-model',
        fromCache: false,
      };
    },
  } as any;

  const submitUseCase = new SubmitRecruiterJobPostingUseCase(
    profileRepo,
    jobPostingRepo,
    mockParseUseCase
  );

  // 1. Rejects non-recruiter caller (job_seeker)
  try {
    await submitUseCase.execute(seekerId, {
      title: 'Senior Frontend Engineer',
      company: 'Tech Corp',
      descriptionText: 'a'.repeat(150),
    });
    throw new Error('Test 1 failed: Should have thrown for non-recruiter caller');
  } catch (err: any) {
    if (!err.message.includes('Unauthorized')) {
      throw new Error(`Test 1 failed with unexpected error: ${err.message}`);
    }
  }
  testCount++;

  // 2. Accepts valid recruiter submission, creates status='pending_review', calls ParseJobPostingUseCase
  const validDesc =
    'Nous recherchons un développeur senior React et Node.js pour rejoindre notre équipe produit à Paris. Expérience requise: 5 ans en TypeScript, Architecture Cloud, Microservices, CI/CD, Jest et Docker.';
  
  const createdPosting = await submitUseCase.execute(recruiterId, {
    title: 'Senior Frontend Engineer',
    company: 'Acme Talent',
    descriptionText: validDesc,
    location: 'Paris, FR',
  });

  if (createdPosting.status !== 'pending_review') {
    throw new Error('Test 2 failed: Created posting status should be pending_review');
  }
  if (createdPosting.source !== 'recruiter_submitted') {
    throw new Error('Test 2 failed: Created posting source should be recruiter_submitted');
  }
  if (parseCalledWithText !== validDesc) {
    throw new Error('Test 2 failed: ParseJobPostingUseCase was not invoked with descriptionText');
  }
  testCount++;

  return { testCount };
}
