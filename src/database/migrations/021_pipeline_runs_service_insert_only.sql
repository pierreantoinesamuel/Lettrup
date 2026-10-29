-- Migration 021: pipeline_runs — only the server may write
--
-- Why: migration 020 created the policy "Service role inserts pipeline runs"
-- with WITH CHECK (TRUE) and no role restriction, so ANY signed-in user could
-- insert rows through the public API — including rows carrying someone else's
-- user_id. pipeline_runs is now the ledger behind the monthly AI budget
-- (20% of a user's subscription, see src/application/billing/AiBudget.ts), so
-- an open insert policy would let a user burn another user's budget.
--
-- The server writes with the service-role key, which bypasses RLS, so no
-- INSERT policy is needed at all: dropping it leaves inserts impossible for
-- every other role. Reads stay limited to the owner by the existing SELECT
-- policy.
--
-- Rollback (restores the previous, unsafe behaviour — do not use in production):
--   CREATE POLICY "Service role inserts pipeline runs"
--     ON pipeline_runs FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role inserts pipeline runs" ON pipeline_runs;
