/**
 * Value Object: Trial Lifecycle States
 */

export type TrialLifecycleState =
  | 'trialing'
  | 'active_paid'
  | 'active_unpaid_locked'
  | 'blocked'
  | 'cancelled';
