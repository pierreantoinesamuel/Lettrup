import { ITrialLifecycleRepository } from '../../infrastructure/repositories/TrialLifecycleRepository';
import { ResendEmailAdapter } from '../../infrastructure/email/ResendEmailAdapter';

export interface SendUpgradeReminderInput {
  userId: string;
  email: string;
  reminderNumber: 1 | 2 | 3;
}

export class SendUpgradeReminderUseCase {
  constructor(
    private repo: ITrialLifecycleRepository,
    private emailAdapter: ResendEmailAdapter = new ResendEmailAdapter()
  ) {}

  async execute(input: SendUpgradeReminderInput): Promise<{ sent: boolean; reason?: string }> {
    const lifecycle = await this.repo.getByUserId(input.userId);
    if (!lifecycle) {
      return { sent: false, reason: 'user_not_found' };
    }

    // Guard: skip if user has already upgraded to active_paid or account is cancelled
    if (lifecycle.state === 'active_paid' || lifecycle.state === 'cancelled') {
      return { sent: false, reason: 'account_paid_or_cancelled' };
    }

    const reminderKey = `reminder${input.reminderNumber}` as 'reminder1' | 'reminder2' | 'reminder3';
    const sentFlagKey = `reminder_${input.reminderNumber}` as keyof typeof lifecycle.remindersSent;

    if (lifecycle.remindersSent[sentFlagKey]) {
      return { sent: false, reason: 'already_sent' };
    }

    const cancelDateFormatted = new Date(lifecycle.scheduledCancellationAt).toLocaleDateString('fr-FR');

    const res = await this.emailAdapter.sendTrialLifecycleEmail({
      to: input.email,
      templateType: reminderKey,
      context: { cancellationDate: cancelDateFormatted },
    });

    if (res.success) {
      (lifecycle.remindersSent as any)[sentFlagKey] = true;
      await this.repo.save(lifecycle);
      return { sent: true };
    }

    return { sent: false, reason: res.error || 'email_send_failed' };
  }
}
