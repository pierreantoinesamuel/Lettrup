-- Migration 024: Enforce Database-Level Resume Quotas via Trigger
--
-- Defense in depth: Guarantees that clients cannot bypass frontend checks
-- (e.g. by querying Supabase PostgREST API directly with a valid JWT) to
-- create more resumes than permitted by their billing tier.
--
-- Quota limits:
--   - Free tier (plan NOT IN ('pro', 'plus', 'max')): Max 1 total resume.
--   - Pro / Plus tier (plan IN ('pro', 'plus')): Max 10 resumes created per calendar month (UTC).
--   - Max tier (plan = 'max'): Unlimited resumes.
--
-- Service role operations (administrative maintenance / imports) bypass quota checks.

CREATE OR REPLACE FUNCTION public.enforce_user_resume_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role text;
  v_user_plan text;
  v_existing_count integer;
  v_monthly_count integer;
BEGIN
  -- 1. Check if caller is executing as service_role (trusted backend operations)
  BEGIN
    v_user_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN
    v_user_role := NULL;
  END;

  IF v_user_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- 2. Lookup candidate's current plan in public.profiles
  SELECT COALESCE(plan, 'free_trial')
  INTO v_user_plan
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF v_user_plan IS NULL THEN
    v_user_plan := 'free_trial';
  END IF;

  -- 3. Max tier: Unlimited creation
  IF v_user_plan = 'max' THEN
    RETURN NEW;
  END IF;

  -- 4. Pro / Plus tier: Max 10 resumes created in current UTC calendar month
  IF v_user_plan IN ('pro', 'plus') THEN
    SELECT COUNT(*)
    INTO v_monthly_count
    FROM public.user_resumes
    WHERE user_id = NEW.user_id
      AND created_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC');

    IF v_monthly_count >= 10 THEN
      RAISE EXCEPTION 'Monthly Pro quota reached: La formule Pro est limitée à 10 créations de CV par mois. Passez à la formule Max pour un volume illimité.'
        USING ERRCODE = '23514'; -- check_violation
    END IF;

    RETURN NEW;
  END IF;

  -- 5. Free tier: Max 1 resume in total
  SELECT COUNT(*)
  INTO v_existing_count
  FROM public.user_resumes
  WHERE user_id = NEW.user_id;

  IF v_existing_count >= 1 THEN
    RAISE EXCEPTION 'Free tier quota reached: La formule Gratuite est limitée à 1 CV au total. Passez à la formule Pro pour créer plusieurs CV.'
      USING ERRCODE = '23514'; -- check_violation
  END IF;

  RETURN NEW;
END;
$$;

-- Revoke execute from public and grant to authenticated / service_role
REVOKE ALL ON FUNCTION public.enforce_user_resume_quota() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_user_resume_quota() TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_user_resume_quota() TO service_role;

-- Attach trigger to public.user_resumes
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_resumes') THEN
    DROP TRIGGER IF EXISTS trg_enforce_user_resume_quota ON public.user_resumes;
    CREATE TRIGGER trg_enforce_user_resume_quota
      BEFORE INSERT ON public.user_resumes
      FOR EACH ROW
      EXECUTE FUNCTION public.enforce_user_resume_quota();
  END IF;
END $$;
