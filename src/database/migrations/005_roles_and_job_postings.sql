-- Migration 005: User Roles and Recruiter Job Postings

-- 1. Create or alter public.profiles safely
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  role text not null default 'job_seeker' check (role in ('job_seeker', 'recruiter', 'admin')),
  company_name text,
  company_website text,
  company_title text,
  created_at timestamptz not null default now()
);

-- Safely add columns if public.profiles already existed
alter table public.profiles
  add column if not exists role text not null default 'job_seeker' check (role in ('job_seeker', 'recruiter', 'admin')),
  add column if not exists company_name text,
  add column if not exists company_website text,
  add column if not exists company_title text;

-- Ensure existing rows are set to default 'job_seeker' if role is null
update public.profiles set role = 'job_seeker' where role is null;

-- 2. Recruiter Job Postings Table
create table if not exists job_postings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  location text,
  description_text text not null,
  salary_range text,
  source text not null check (source in ('recruiter_submitted', 'user_pasted')),
  posted_by_user_id uuid references auth.users(id),
  status text not null default 'pending_review' check (status in ('pending_review', 'published', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists idx_job_postings_status on job_postings (status);
create index if not exists idx_job_postings_posted_by on job_postings (posted_by_user_id);

-- Enable RLS on job_postings
alter table job_postings enable row level security;

-- 3. RLS Policies for job_postings

-- Policy 1: Recruiter Insert Policy
create policy "Recruiters can insert job postings"
  on job_postings
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where public.profiles.id = auth.uid()
      and public.profiles.role = 'recruiter'
    )
  );

-- Policy 2: Candidate Read Policy (for published job postings)
create policy "Anyone can read published job postings"
  on job_postings
  for select
  to authenticated
  using (status = 'published');

-- Policy 3: Recruiter Self-Read Policy
create policy "Recruiters can view own job postings"
  on job_postings
  for select
  to authenticated
  using (posted_by_user_id = auth.uid());

-- Policy 4: Admin Manage Policy
create policy "Admins can manage all job postings"
  on job_postings
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where public.profiles.id = auth.uid()
      and public.profiles.role = 'admin'
    )
  );
