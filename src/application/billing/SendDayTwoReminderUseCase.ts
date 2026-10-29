import { ITrialLifecycleRepository } from '../../infrastructure/repositories/TrialLifecycleRepository';
import { ResendEmailAdapter } from '../../infrastructure/email/ResendEmailAdapter';

export interface SendDayTwoReminderInput {
  userId: string;
  email: string;
}

export class SendDayTwoReminderUseCase {
  constructor(
    private repo: ITrialLifecycleRepository,
    private emailAdapter: ResendEmailAdapter = new ResendEmailAdapter()
  ) {}

  async execute(input: SendDayTwoReminderInput): Promise<{ sent: boolean; reason?: string }> {
    const lifecycle = await this.repo.getByUserId(input.userId);
    if (!lifecycle) {
      return { sent: false, reason: 'user_not_found' };
    }

    // Guard: only send if state is still trialing
    if (lifecycle.state !== 'trialing') {
      return { sent: false, reason: 'trial_no_longer_active' };
    }

    if (lifecycle.remindersSent.day2) {
      return { sent: false, reason: 'already_sent' };
    }

    const res = await this.emailAdapter.sendTrialLifecycleEmail({
      to: input.email,
      templateType: 'day2',
    });

    if (res.success) {
      lifecycle.remindersSent.day2 = true;
      await this.repo.save(lifecycle);
      return { sent: true };
    }

    return { sent: false, reason: res.error || 'email_send_failed' };
  }
}
