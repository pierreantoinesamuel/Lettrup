-- Migration 003: Outreach Messages table for storing candidate-recruiter cold outreach drafts
create table if not exists outreach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  cv_id uuid references cv_versions(id),
  job_offer_ref text,
  channel text not null check (channel in ('linkedin_connection_note','linkedin_message','cold_email')),
  content text not null,
  created_at timestamptz not null default now()
);
