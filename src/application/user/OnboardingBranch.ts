import { UserRole } from '../../domain/user/UserRole';
import { IUserProfileRepository, UserProfileRepository } from '../../infrastructure/repositories/UserProfileRepository';

export interface OnboardingBranchInput {
  userId: string;
  selectedRole: 'job_seeker' | 'recruiter';
  companyName?: string;
  companyWebsite?: string;
  companyTitle?: string;
}

export class OnboardingBranchUseCase {
  constructor(private profileRepo: IUserProfileRepository = new UserProfileRepository()) {}

  async execute(input: OnboardingBranchInput): Promise<void> {
    // Defense: Admin role cannot be self-assigned in onboarding
    if ((input.selectedRole as string) === 'admin') {
      throw new Error('Self-assignment to admin role is strictly prohibited.');
    }

    const role: UserRole = input.selectedRole === 'recruiter' ? 'recruiter' : 'job_seeker';

    await this.profileRepo.updateRole(input.userId, role, {
      companyName: input.companyName,
      companyWebsite: input.companyWebsite,
      companyTitle: input.companyTitle,
    });
  }
}
