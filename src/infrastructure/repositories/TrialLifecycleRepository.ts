import { TrialLifecycle } from '../../domain/billing/TrialLifecycle';
import { EngagementRecord } from '../../domain/billing/EngagementRecord';

export interface ITrialLifecycleRepository {
  save(lifecycle: TrialLifecycle): Promise<void>;
  getByUserId(userId: string): Promise<TrialLifecycle | null>;
  getEngagement(userId: string): Promise<EngagementRecord>;
  recordActivity(userId: string, timestamp?: Date): Promise<void>;
  getLifecyclesDueForExpiry(now?: Date): Promise<TrialLifecycle[]>;
  getLifecyclesDueForCancellation(now?: Date): Promise<TrialLifecycle[]>;
}

// In-Memory fallback store for dev/testing when Supabase client is offline
const memoryStore = new Map<string, TrialLifecycle>();
const engagementStore = new Map<string, Date>();

export class TrialLifecycleRepository implements ITrialLifecycleRepository {
  async save(lifecycle: TrialLifecycle): Promise<void> {
    memoryStore.set(lifecycle.userId, { ...lifecycle });
  }

  async getByUserId(userId: string): Promise<TrialLifecycle | null> {
    return memoryStore.get(userId) || null;
  }

  async recordActivity(userId: string, timestamp: Date = new Date()): Promise<void> {
    engagementStore.set(userId, timestamp);
  }

  async getEngagement(userId: string): Promise<EngagementRecord> {
    const lastActive = engagementStore.get(userId) || null;
    return {
      userId,
      lastActiveAt: lastActive ? lastActive.toISOString() : null,
    };
  }

  async getLifecyclesDueForExpiry(now: Date = new Date()): Promise<TrialLifecycle[]> {
    const results: TrialLifecycle[] = [];
    const nowMs = now.getTime();
    for (const lc of memoryStore.values()) {
      if (lc.state === 'trialing' && new Date(lc.trialEndsAt).getTime() <= nowMs) {
        results.push(lc);
      }
    }
    return results;
  }

  async getLifecyclesDueForCancellation(now: Date = new Date()): Promise<TrialLifecycle[]> {
    const results: TrialLifecycle[] = [];
    const nowMs = now.getTime();
    for (const lc of memoryStore.values()) {
      if (
        (lc.state === 'active_unpaid_locked' || lc.state === 'blocked') &&
        new Date(lc.scheduledCancellationAt).getTime() <= nowMs
      ) {
        results.push(lc);
      }
    }
    return results;
  }
}
