import { UserRole, UserProfileDomain } from '../../domain/user/UserRole';

export interface IUserProfileRepository {
  getProfile(userId: string): Promise<UserProfileDomain | null>;
  saveProfile(profile: UserProfileDomain): Promise<void>;
  updateRole(
    userId: string,
    role: UserRole,
    companyDetails?: { companyName?: string; companyWebsite?: string; companyTitle?: string }
  ): Promise<void>;
}

const userProfileStore = new Map<string, UserProfileDomain>();

export class UserProfileRepository implements IUserProfileRepository {
  async getProfile(userId: string): Promise<UserProfileDomain | null> {
    return userProfileStore.get(userId) || null;
  }

  async saveProfile(profile: UserProfileDomain): Promise<void> {
    userProfileStore.set(profile.id, { ...profile });
  }

  async updateRole(
    userId: string,
    role: UserRole,
    companyDetails?: { companyName?: string; companyWebsite?: string; companyTitle?: string }
  ): Promise<void> {
    const existing = userProfileStore.get(userId) || {
      id: userId,
      email: `${userId}@example.com`,
      role: 'job_seeker' as UserRole,
    };

    userProfileStore.set(userId, {
      ...existing,
      role,
      companyName: companyDetails?.companyName || existing.companyName,
      companyWebsite: companyDetails?.companyWebsite || existing.companyWebsite,
      companyTitle: companyDetails?.companyTitle || existing.companyTitle,
    });
  }
}
