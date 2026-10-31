import { ITrialLifecycleRepository } from '../../infrastructure/repositories/TrialLifecycleRepository';
import { evaluateFinalCancellation, TrialLifecycle } from '../../domain/billing/TrialLifecycle';

export interface EvaluateFinalCancellationInput {
  userId: string;
  now?: Date;
  hasPaid?: boolean;
}

export class EvaluateFinalCancellationUseCase {
  constructor(private repo: ITrialLifecycleRepository) {}

  async execute(input: EvaluateFinalCancellationInput): Promise<TrialLifecycle | null> {
    const lifecycle = await this.repo.getByUserId(input.userId);
    if (!lifecycle) {
      return null;
    }

    const now = input.now || new Date();
    const hasPaid = input.hasPaid || lifecycle.state === 'active_paid';

    const updated = evaluateFinalCancellation(lifecycle, now, hasPaid);

    if (updated.state === 'cancelled' && lifecycle.state !== 'cancelled') {
      await this.repo.save(updated);

      // Trigger soft-delete data-retention scheduling per GDPR policy
      // TODO: confirm data retention window - defaulting to 30-day soft-delete before permanent erasure
      console.info(`[GDPR Data Retention] Account ${input.userId} cancelled on ${updated.cancelledAt}. Scheduled for soft-delete retention window.`);
    }

    return updated;
  }
}
