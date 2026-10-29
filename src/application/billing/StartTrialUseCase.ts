import { TrialLifecycle } from '../../domain/billing/TrialLifecycle';
import { ITrialLifecycleRepository } from '../../infrastructure/repositories/TrialLifecycleRepository';

export interface StartTrialInput {
  userId: string;
  now?: Date;
}

export class StartTrialUseCase {
  constructor(private repo: ITrialLifecycleRepository) {}

  async execute(input: StartTrialInput): Promise<TrialLifecycle> {
    const now = input.now || new Date();
    const trialStartedAt = now.toISOString();

    const endsMs = now.getTime() + 7 * 24 * 60 * 60 * 1000; // + 7 days
    const trialEndsAt = new Date(endsMs).toISOString();

    const cancelMs = endsMs + 45 * 24 * 60 * 60 * 1000; // + 45 days after trial end
    const scheduledCancellationAt = new Date(cancelMs).toISOString();

    const lifecycle: TrialLifecycle = {
      userId: input.userId,
      trialStartedAt,
      trialEndsAt,
      scheduledCancellationAt,
      state: 'trialing',
      remindersSent: {
        day2: false,
        reminder1: false,
        reminder2: false,
        reminder3: false,
      },
      cancelledAt: null,
      createdAt: trialStartedAt,
    };

    await this.repo.save(lifecycle);
    return lifecycle;
  }
}
