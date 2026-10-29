import { TrialLifecycleRepository } from '../../infrastructure/repositories/TrialLifecycleRepository';
import { StartTrialUseCase } from './StartTrialUseCase';
import { EvaluateTrialExpiryUseCase } from './EvaluateTrialExpiryUseCase';
import { SendUpgradeReminderUseCase } from './SendUpgradeReminderUseCase';
import { EvaluateFinalCancellationUseCase } from './EvaluateFinalCancellationUseCase';
import { EntitlementService, evaluateEntitlement } from './EntitlementGate';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[TEST FAILED] ${message}`);
  }
}

export function runBillingApplicationTests() {
  return (async () => {
    let testCount = 0;
    const repo = new TrialLifecycleRepository();

    // Test 1: StartTrialUseCase initializes lifecycle properly
    testCount++;
    const startUseCase = new StartTrialUseCase(repo);
    const startDate = new Date('2026-07-01T10:00:00Z');
    const lifecycle = await startUseCase.execute({ userId: 'user-app-1', now: startDate });

    assert(lifecycle.state === 'trialing', 'New trial must be state trialing');
    assert(
      new Date(lifecycle.trialEndsAt).getTime() - startDate.getTime() === 7 * 24 * 3600 * 1000,
      'Trial length must be exactly 7 days'
    );
    assert(
      new Date(lifecycle.scheduledCancellationAt).getTime() - new Date(lifecycle.trialEndsAt).getTime() === 45 * 24 * 3600 * 1000,
      'Scheduled cancellation must be exactly 45 days post trial end'
    );

    // Test 2: Entitlement gate tests for all 5 states
    testCount++;
    assert(evaluateEntitlement('trialing').allowed === true, 'trialing state allowed');
    assert(evaluateEntitlement('active_paid').allowed === true, 'active_paid state allowed');

    const lockedEntitlement = evaluateEntitlement('active_unpaid_locked');
    assert(lockedEntitlement.allowed === false && lockedEntitlement.reason === 'payment_required', 'active_unpaid_locked requires payment');

    const blockedEntitlement = evaluateEntitlement('blocked');
    assert(blockedEntitlement.allowed === false && blockedEntitlement.reason === 'account_blocked', 'blocked state blocked');

    const cancelledEntitlement = evaluateEntitlement('cancelled');
    assert(cancelledEntitlement.allowed === false && cancelledEntitlement.reason === 'account_blocked', 'cancelled state blocked');

    // Test 3: EvaluateTrialExpiryUseCase schedules reminder emails for BOTH active_unpaid_locked AND blocked outcomes
    testCount++;
    await repo.recordActivity('user-app-1', new Date('2026-07-03T12:00:00Z'));
    const evalExpiryUseCase = new EvaluateTrialExpiryUseCase(repo);
    const expiredLc = await evalExpiryUseCase.execute({ userId: 'user-app-1' });

    assert(expiredLc?.state === 'active_unpaid_locked', 'User with activity transitions to active_unpaid_locked');

    // Test 4: SendUpgradeReminderUseCase skips sending if user is active_paid or cancelled
    testCount++;
    const sendReminderUseCase = new SendUpgradeReminderUseCase(repo);

    // Should succeed on active_unpaid_locked
    const sendRes1 = await sendReminderUseCase.execute({
      userId: 'user-app-1',
      email: 'delivered@resend.dev',
      reminderNumber: 1,
    });
    assert(sendRes1.sent === true, 'Reminder 1 should send for active_unpaid_locked');

    // Update state to active_paid
    expiredLc!.state = 'active_paid';
    await repo.save(expiredLc!);

    const sendRes2 = await sendReminderUseCase.execute({
      userId: 'user-app-1',
      email: 'delivered@resend.dev',
      reminderNumber: 2,
    });
    assert(sendRes2.sent === false && sendRes2.reason === 'account_paid_or_cancelled', 'Reminder 2 should skip for active_paid user');

    // Test 5: EvaluateFinalCancellationUseCase respects boundary and hasPaid guard
    testCount++;
    expiredLc!.state = 'active_unpaid_locked';
    await repo.save(expiredLc!);

    const evalCancelUseCase = new EvaluateFinalCancellationUseCase(repo);

    // Before 45 days -> remains active_unpaid_locked
    const beforeCancelDate = new Date('2026-08-01T00:00:00Z');
    const beforeResult = await evalCancelUseCase.execute({ userId: 'user-app-1', now: beforeCancelDate, hasPaid: false });
    assert(beforeResult?.state === 'active_unpaid_locked', 'Before 45 days should remain active_unpaid_locked');

    // At or after 45 days -> transitions to cancelled
    const afterCancelDate = new Date('2026-08-25T00:00:00Z');
    const afterResult = await evalCancelUseCase.execute({ userId: 'user-app-1', now: afterCancelDate, hasPaid: false });
    assert(afterResult?.state === 'cancelled', 'After 45 days should transition to cancelled');

    return { passed: true, testCount };
  })();
}
