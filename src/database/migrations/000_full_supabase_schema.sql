-- Migration 000: Complete Master Supabase Schema
-- Includes all core tables: profiles, resumes, cv_versions, job_applications,
-- ats_scans, job_posting_cache, outreach_messages, trial_lifecycle, job_postings

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'job_seeker' CHECK (role IN ('job_seeker', 'recruiter', 'admin')),
  company_name TEXT,
  company_website TEXT,
  company_title TEXT,
  siren_number TEXT,
  target_title TEXT,
  experience_level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  job_title VARCHAR(255),
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cv_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_cv_id UUID REFERENCES public.cv_versions(id) ON DELETE SET NULL,
  is_tailored BOOLEAN DEFAULT FALSE,
  job_offer_ref TEXT,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  change_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'Saved',
  salary VARCHAR(100),
  location VARCHAR(255),
  job_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ats_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cv_id UUID REFERENCES public.cv_versions(id) ON DELETE SET NULL,
  company_name VARCHAR(255),
  job_title VARCHAR(255) NOT NULL,
  ats_score INT NOT NULL,
  breakdown_json JSONB,
  scan_data JSONB,
  found_keywords TEXT[],
  missing_keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.job_posting_cache (
  content_hash TEXT PRIMARY KEY,
  extracted_keywords JSONB NOT NULL,
  extracted_requirements JSONB NOT NULL,
  model_used TEXT NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_hit_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cv_id UUID REFERENCES public.cv_versions(id) ON DELETE SET NULL,
  job_offer_ref TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('linkedin_connection_note','linkedin_message','cold_email')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trial_lifecycle (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ NOT NULL,
  scheduled_cancellation_at TIMESTAMPTZ NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('trialing','active_paid','active_unpaid_locked','blocked','cancelled')) DEFAULT 'trialing',
  last_active_at TIMESTAMPTZ,
  reminder_day2_sent BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_1_sent BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_2_sent BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_3_sent BOOLEAN NOT NULL DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  description_text TEXT NOT NULL,
  salary_range TEXT,
  source TEXT NOT NULL CHECK (source IN ('recruiter_submitted', 'user_pasted')),
  posted_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'published', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
