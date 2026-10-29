-- Migration 008: Real data for the core recruiting loop
--
-- Admin panel and RH (Recruiter) panel were entirely mock: admin views ran on
-- localStorage (adminStore.ts/adminData.ts), and the recruiter "post a job"
-- flow persisted to an in-memory server Map (JobPostingRepository), not
-- Supabase. This migration adds the columns/tables/RLS needed so those
-- panels can be wired to the real jobs/applications/profiles tables instead.

-- 1. profiles: account status (ban/suspend) + employer verification status
alter table public.profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists verification_status text not null default 'pending';

alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('active', 'suspended', 'banned'));

alter table public.profiles
  add constraint profiles_verification_status_check
  check (verification_status in ('pending', 'approved', 'rejected'));

-- 2. jobs: moderation/flagging fields + fields the recruiter form collects
--    that had nowhere to persist, and canonicalize the status enum.
alter table public.jobs
  add column if not exists flag_status text not null default 'normal',
  add column if not exists flag_reason text,
  add column if not exists experience_level text,
  add column if not exists required_skills text[] not null default '{}',
  add column if not exists remote_policy text;

alter table public.jobs
  add constraint jobs_flag_status_check
  check (flag_status in ('normal', 'suspicious', 'spam'));

update public.jobs set status = 'active' where status in ('published', 'approved');
update public.jobs set status = 'pending_review' where status in ('draft');
update public.jobs set status = 'suspended' where status not in
  ('pending_review', 'active', 'rejected', 'suspended', 'filled');

alter table public.jobs alter column status set default 'pending_review';
alter table public.jobs
  add constraint jobs_status_check
  check (status in ('pending_review', 'active', 'rejected', 'suspended', 'filled'));

-- Retire the 'published' status value from the public-read policy.
drop policy if exists "public_select_published_jobs" on public.jobs;
create policy "public_select_published_jobs" on public.jobs
  for select to public
  using (status = 'active' or auth.uid() = employer_id);

-- 3. applications: moderation review state + recruiter's own pipeline stage
--    (two distinct dimensions: `status` is the ATS/moderation decision,
--    `pipeline_status` is the recruiter's manual hiring-stage tracking).
alter table public.applications
  add column if not exists review_status text not null default 'pending_human',
  add column if not exists auto_rejected boolean not null default false,
  add column if not exists auto_rejection_reason text,
  add column if not exists pipeline_status text not null default 'nouveau';

alter table public.applications
  add constraint applications_review_status_check
  check (review_status in ('pending_human', 'approved', 'overridden'));

alter table public.applications
  add constraint applications_pipeline_status_check
  check (pipeline_status in ('nouveau', 'en_revision', 'entretien_planifie', 'offre_envoyee', 'engage', 'refuse'));

-- 4. Real admin audit log, replacing the localStorage AdminStore.logAction
--    trail for the four entities being made real (candidates/employers/jobs/applications).
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id),
  admin_name text not null,
  admin_role text not null,
  action_type text not null,
  target_type text not null,
  target_id text not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

create policy "admins_select_audit_log" on public.admin_audit_log
  for select to public using (is_admin());

create policy "admins_insert_audit_log" on public.admin_audit_log
  for insert to public with check (is_admin());

-- 5. Admin read/write access across all rows (mirrors admins_select_all_profiles).
--    Safe on profiles: `role` is already column-level REVOKEd from
--    authenticated/anon (migrations 006/007), so this broad USING/WITH CHECK
--    cannot be used to grant admin/recruiter role from the client.
create policy "admins_select_all_jobs" on public.jobs
  for select to public using (is_admin());

create policy "admins_update_any_job" on public.jobs
  for update to public using (is_admin()) with check (is_admin());

create policy "admins_select_all_applications" on public.applications
  for select to public using (is_admin());

create policy "admins_update_any_application" on public.applications
  for update to public using (is_admin()) with check (is_admin());

create policy "admins_update_moderation_fields" on public.profiles
  for update to public using (is_admin()) with check (is_admin());
