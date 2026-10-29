-- Migration 004: Trial Lifecycle & Dunning Sequence Table
create table if not exists trial_lifecycle (
  user_id uuid primary key references auth.users(id),
  trial_started_at timestamptz not null,
  trial_ends_at timestamptz not null,
  scheduled_cancellation_at timestamptz not null,
  state text not null check (state in ('trialing','active_paid','active_unpaid_locked','blocked','cancelled')) default 'trialing',
  last_active_at timestamptz,
  reminder_day2_sent boolean not null default false,
  reminder_1_sent boolean not null default false,
  reminder_2_sent boolean not null default false,
  reminder_3_sent boolean not null default false,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_trial_lifecycle_due_check
  on trial_lifecycle (state, trial_ends_at, scheduled_cancellation_at);

-- Optional pg_cron automated schedule for hourly evaluation on Supabase Postgres
-- create extension if not exists pg_cron;
-- select cron.schedule('eval-trial-lifecycle-hourly', '0 * * * *', $$
--   update trial_lifecycle
--   set state = case
--     when last_active_at is not null and last_active_at >= trial_started_at and last_active_at <= trial_ends_at then 'active_unpaid_locked'
--     else 'blocked'
--   end
--   where state = 'trialing' and now() >= trial_ends_at;
-- $$);
