import { TrialLifecycleState } from '../../domain/billing/TrialLifecycleState';
import { ITrialLifecycleRepository } from '../../infrastructure/repositories/TrialLifecycleRepository';

export interface EntitlementCheckResult {
  allowed: boolean;
  reason?: 'payment_required' | 'account_blocked' | 'not_found';
}

/**
 * Pure entitlement evaluation logic based on TrialLifecycleState:
 * - 'trialing' | 'active_paid' -> allowed
 * - 'active_unpaid_locked' -> allowed: false, reason: 'payment_required'
 * - 'blocked' | 'cancelled' -> allowed: false, reason: 'account_blocked'
 */
export function evaluateEntitlement(state: TrialLifecycleState): EntitlementCheckResult {
  switch (state) {
    case 'trialing':
    case 'active_paid':
      return { allowed: true };
    case 'active_unpaid_locked':
      return { allowed: false, reason: 'payment_required' };
    case 'blocked':
    case 'cancelled':
      return { allowed: false, reason: 'account_blocked' };
    default:
      return { allowed: false, reason: 'account_blocked' };
  }
}

export class EntitlementService {
  constructor(private repo: ITrialLifecycleRepository) {}

  async checkEntitlement(userId: string): Promise<EntitlementCheckResult> {
    const lifecycle = await this.repo.getByUserId(userId);
    if (!lifecycle) {
      return { allowed: false, reason: 'not_found' };
    }
    return evaluateEntitlement(lifecycle.state);
  }
}
