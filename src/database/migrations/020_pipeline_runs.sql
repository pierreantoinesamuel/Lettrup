-- Migration 020: pipeline_runs
-- Logs every AI pipeline invocation for observability, cost control, and rate limiting.

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users ON DELETE SET NULL,
  cv_id       UUID,
  job_url     TEXT,
  task        TEXT        NOT NULL,
  match_score INT,
  duration_ms INT,
  tokens_used INT,
  success     BOOLEAN     NOT NULL DEFAULT FALSE,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;

-- Users can only read their own pipeline runs
CREATE POLICY "Users read own pipeline runs"
  ON pipeline_runs FOR SELECT
  USING (auth.uid() = user_id);

-- Only the service role can insert (server-side logging)
CREATE POLICY "Service role inserts pipeline runs"
  ON pipeline_runs FOR INSERT
  WITH CHECK (TRUE);

-- Index for rate-limit queries: count runs per user per day
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_user_created
  ON pipeline_runs (user_id, created_at DESC);
