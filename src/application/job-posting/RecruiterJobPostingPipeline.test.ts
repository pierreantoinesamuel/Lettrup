import { SubmitRecruiterJobPostingUseCase } from './SubmitRecruiterJobPosting';
import { ParseJobPostingUseCase } from './ParseJobPosting';
import { SupabaseJobPostingCacheRepository } from '../../infrastructure/repositories/SupabaseJobPostingCacheRepository';
import { UserProfileRepository } from '../../infrastructure/repositories/UserProfileRepository';
import { JobPostingRepository } from '../../infrastructure/repositories/JobPostingRepository';
import { OnboardingBranchUseCase } from '../user/OnboardingBranch';
import { computeJobPostingHash } from '../../domain/job-posting/JobPostingCache';

export async function runRecruiterJobPostingPipelineTests() {
  console.log('--- Testing Recruiter Job Posting Integration Pipeline ---');
  let testCount = 0;

  const profileRepo = new UserProfileRepository();
  const jobPostingRepo = new JobPostingRepository();
  const cacheRepo = new SupabaseJobPostingCacheRepository();
  const onboardingUseCase = new OnboardingBranchUseCase(profileRepo);

  const mockAiProvider = {
    name: 'mock-ai',
    model: 'mock-model',
    isAvailable: async () => true,
    complete: async () => ({
      text: JSON.stringify({
        extractedKeywords: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS'],
        extractedRequirements: ['5 ans d\'expérience', 'React', 'Node.js'],
      }),
      model: 'mock-model',
      provider: 'mock-provider',
    }),
    stream: async function* () {
      yield 'mock';
    },
  };

  const parseUseCase = new ParseJobPostingUseCase(cacheRepo, mockAiProvider);
  const submitUseCase = new SubmitRecruiterJobPostingUseCase(
    profileRepo,
    jobPostingRepo,
    parseUseCase
  );

  const recruiterId = 'recruiter-pipe-1';
  await onboardingUseCase.execute({
    userId: recruiterId,
    selectedRole: 'recruiter',
    companyName: 'Global Tech Corp',
  });

  const identicalJobText = `
    Nous recrutons un Développeur Fullstack Senior (React / Node.js).
    Missions:
    - Concevoir et développer des applications web haute performance.
    - Écrire du code propre en TypeScript, testé avec Jest.
    - Collaborer avec l'équipe design et produit.
    Exigences:
    - 5 ans d'expérience minimum.
    - Maîtrise de React, Node.js, PostgreSQL et AWS.
  `.trim();

  // 1. Recruiter submits job posting
  const recruiterPosting = await submitUseCase.execute(recruiterId, {
    title: 'Développeur Fullstack Senior',
    company: 'Global Tech Corp',
    descriptionText: identicalJobText,
  });

  const computedHash = computeJobPostingHash(identicalJobText);
  const cacheAfterRecruiterSubmit = await cacheRepo.getByHash(computedHash);

  if (!cacheAfterRecruiterSubmit) {
    throw new Error('Test 1 failed: Recruiter submission did not populate job_posting_cache');
  }
  testCount++;

  // 2. Job Seeker pastes identical job posting text directly in ATS Scanner or Job Tracker
  const seekerParseResult = await parseUseCase.execute({
    jobOfferText: identicalJobText,
  });

  if (!seekerParseResult.fromCache) {
    throw new Error('Test 2 failed: User-pasted job posting should hit the semantic cache populated by recruiter submission');
  }

  if (seekerParseResult.contentHash !== cacheAfterRecruiterSubmit.contentHash) {
    throw new Error('Test 2 failed: Content hashes do not match between recruiter submission and user-pasted posting');
  }

  if (
    JSON.stringify(seekerParseResult.extractedKeywords) !==
    JSON.stringify(cacheAfterRecruiterSubmit.extractedKeywords)
  ) {
    throw new Error('Test 2 failed: Extracted keywords differ between recruiter submission and user-pasted posting');
  }
  testCount++;

  return { testCount };
}
