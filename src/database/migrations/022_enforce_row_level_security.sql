-- Migration 022: Enforce Strict Row-Level Security (RLS) Across All User Data Tables
--
-- This migration guarantees that every table storing personal candidate data,
-- resumes, job applications, career plans, and billing entitlements strictly
-- enforces Row-Level Security (RLS) in PostgreSQL.
--
-- Direct queries like `select * from resumes` or `select * from user_resumes`
-- automatically scope to `auth.uid() = user_id`, preventing any cross-user data leakage.
-- Service-role calls (server-side administrative tools & webhooks) retain bypass capabilities.

DO $$
BEGIN

  -- 1. Table: public.user_resumes
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_resumes') THEN
    ALTER TABLE public.user_resumes ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "user_resumes_select_own" ON public.user_resumes;
    CREATE POLICY "user_resumes_select_own" ON public.user_resumes
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "user_resumes_insert_own" ON public.user_resumes;
    CREATE POLICY "user_resumes_insert_own" ON public.user_resumes
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "user_resumes_update_own" ON public.user_resumes;
    CREATE POLICY "user_resumes_update_own" ON public.user_resumes
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "user_resumes_delete_own" ON public.user_resumes;
    CREATE POLICY "user_resumes_delete_own" ON public.user_resumes
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "user_resumes_service_role" ON public.user_resumes;
    CREATE POLICY "user_resumes_service_role" ON public.user_resumes
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  -- 2. Table: public.resumes (legacy / mirror schema)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'resumes') THEN
    ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "resumes_select_own" ON public.resumes;
    CREATE POLICY "resumes_select_own" ON public.resumes
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "resumes_insert_own" ON public.resumes;
    CREATE POLICY "resumes_insert_own" ON public.resumes
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "resumes_update_own" ON public.resumes;
    CREATE POLICY "resumes_update_own" ON public.resumes
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "resumes_delete_own" ON public.resumes;
    CREATE POLICY "resumes_delete_own" ON public.resumes
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "resumes_service_role" ON public.resumes;
    CREATE POLICY "resumes_service_role" ON public.resumes
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  -- 3. Table: public.cv_versions
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cv_versions') THEN
    ALTER TABLE public.cv_versions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "cv_versions_select_own" ON public.cv_versions;
    CREATE POLICY "cv_versions_select_own" ON public.cv_versions
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "cv_versions_insert_own" ON public.cv_versions;
    CREATE POLICY "cv_versions_insert_own" ON public.cv_versions
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "cv_versions_update_own" ON public.cv_versions;
    CREATE POLICY "cv_versions_update_own" ON public.cv_versions
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "cv_versions_delete_own" ON public.cv_versions;
    CREATE POLICY "cv_versions_delete_own" ON public.cv_versions
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "cv_versions_service_role" ON public.cv_versions;
    CREATE POLICY "cv_versions_service_role" ON public.cv_versions
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  -- 4. Table: public.job_applications
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'job_applications') THEN
    ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "job_applications_select_own" ON public.job_applications;
    CREATE POLICY "job_applications_select_own" ON public.job_applications
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "job_applications_insert_own" ON public.job_applications;
    CREATE POLICY "job_applications_insert_own" ON public.job_applications
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "job_applications_update_own" ON public.job_applications;
    CREATE POLICY "job_applications_update_own" ON public.job_applications
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "job_applications_delete_own" ON public.job_applications;
    CREATE POLICY "job_applications_delete_own" ON public.job_applications
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "job_applications_service_role" ON public.job_applications;
    CREATE POLICY "job_applications_service_role" ON public.job_applications
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  -- 5. Table: public.ats_scans
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ats_scans') THEN
    ALTER TABLE public.ats_scans ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "ats_scans_select_own" ON public.ats_scans;
    CREATE POLICY "ats_scans_select_own" ON public.ats_scans
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "ats_scans_insert_own" ON public.ats_scans;
    CREATE POLICY "ats_scans_insert_own" ON public.ats_scans
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "ats_scans_service_role" ON public.ats_scans;
    CREATE POLICY "ats_scans_service_role" ON public.ats_scans
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  -- 6. Table: public.outreach_messages
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'outreach_messages') THEN
    ALTER TABLE public.outreach_messages ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "outreach_messages_select_own" ON public.outreach_messages;
    CREATE POLICY "outreach_messages_select_own" ON public.outreach_messages
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "outreach_messages_insert_own" ON public.outreach_messages;
    CREATE POLICY "outreach_messages_insert_own" ON public.outreach_messages
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "outreach_messages_service_role" ON public.outreach_messages;
    CREATE POLICY "outreach_messages_service_role" ON public.outreach_messages
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  -- 7. Table: public.trial_lifecycle
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trial_lifecycle') THEN
    ALTER TABLE public.trial_lifecycle ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "trial_lifecycle_select_own" ON public.trial_lifecycle;
    CREATE POLICY "trial_lifecycle_select_own" ON public.trial_lifecycle
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "trial_lifecycle_service_role" ON public.trial_lifecycle;
    CREATE POLICY "trial_lifecycle_service_role" ON public.trial_lifecycle
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  -- 8. Table: public.profiles
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
    CREATE POLICY "profiles_select_own" ON public.profiles
      FOR SELECT TO authenticated
      USING (auth.uid() = id);

    DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
    CREATE POLICY "profiles_update_own" ON public.profiles
      FOR UPDATE TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);

    DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
    CREATE POLICY "profiles_insert_own" ON public.profiles
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = id);

    DROP POLICY IF EXISTS "profiles_service_role" ON public.profiles;
    CREATE POLICY "profiles_service_role" ON public.profiles
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

END $$;
