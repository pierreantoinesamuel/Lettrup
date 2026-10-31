-- 023_prevent_role_escalation.sql
-- Defense-in-depth: a Postgres trigger that prevents any UPDATE to
-- profiles.role unless the session is running as service_role.
-- Even if a future GRANT accidentally re-opens column access, normal
-- users (anon / authenticated) cannot promote themselves.

CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF current_setting('request.jwt.claims', true)::jsonb ->> 'role' != 'service_role'
       AND current_setting('role', true) != 'service_role' THEN
      RAISE EXCEPTION 'role changes require service_role privileges';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON profiles;

CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_escalation();
