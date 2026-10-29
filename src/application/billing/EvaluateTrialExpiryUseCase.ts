import { ITrialLifecycleRepository } from '../../infrastructure/repositories/TrialLifecycleRepository';
import { evaluateTrialExpiry, TrialLifecycle } from '../../domain/billing/TrialLifecycle';

export interface EvaluateTrialExpiryInput {
  userId: string;
}

export class EvaluateTrialExpiryUseCase {
  constructor(private repo: ITrialLifecycleRepository) {}

  async execute(input: EvaluateTrialExpiryInput): Promise<TrialLifecycle | null> {
    const lifecycle = await this.repo.getByUserId(input.userId);
    if (!lifecycle) {
      return null;
    }

    const engagement = await this.repo.getEngagement(input.userId);
    const updated = evaluateTrialExpiry(lifecycle, engagement);

    if (updated.state !== lifecycle.state) {
      await this.repo.save(updated);
    }

    return updated;
  }
}
