-- Migration 006: Real auth role security
--
-- 1. Standardizes public.profiles.role naming on job_seeker/recruiter/admin
--    (previously candidate/employer/admin with no CHECK constraint).
-- 2. Adds the onboarding-wizard profile columns the app already collects
--    but that were never persisted.
-- 3. Locks the role column down so it can only ever be changed by a
--    direct SQL edit (Supabase dashboard / service role), never by an
--    authenticated client request. This is the fix for a real privilege-
--    escalation hole: previously any logged-in user could run
--    `update profiles set role='admin' where id=auth.uid()` and succeed.

-- 1. Remap existing role values to the new naming
update public.profiles set role = 'job_seeker' where role = 'candidate';
update public.profiles set role = 'recruiter' where role = 'employer';
update public.profiles set role = 'job_seeker'
  where role is null or role not in ('job_seeker', 'recruiter', 'admin');

alter table public.profiles alter column role set default 'job_seeker';
alter table public.profiles add constraint profiles_role_check
  check (role in ('job_seeker', 'recruiter', 'admin'));

-- 2. Onboarding-wizard columns collected by AuthPage.tsx but not yet stored
alter table public.profiles
  add column if not exists company_name text,
  add column if not exists company_website text,
  add column if not exists company_title text,
  add column if not exists siren_number text,
  add column if not exists target_title text,
  add column if not exists experience_level text,
  add column if not exists skills text[];

-- 3. Anti-escalation trigger: block role changes made through a normal
--    client request. auth.role() is NULL for the SQL editor / postgres
--    superuser session (no JWT claims set) and 'service_role' for
--    service-role-key calls, so a developer's manual
--    `UPDATE profiles SET role='admin' ...` still works; only
--    'authenticated'/'anon' requests are blocked.
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.role is distinct from OLD.role then
    if auth.role() = 'authenticated' or auth.role() = 'anon' then
      raise exception 'Role changes are not permitted through the client API.';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_prevent_role_self_escalation on public.profiles;
create trigger trg_prevent_role_self_escalation
  before update on public.profiles
  for each row
  execute function public.prevent_role_self_escalation();

-- Belt-and-suspenders: reject any client query whose SET clause even
-- mentions role, independent of the trigger.
revoke update (role) on public.profiles from authenticated, anon;

-- 4. handle_new_user(): new naming, still never accepts an 'admin' claim
--    from signup metadata, and now persists the onboarding fields
--    atomically at signup time.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
    requested_role text;
    final_role text;
begin
    requested_role := NEW.raw_user_meta_data->>'role';

    if requested_role = 'recruiter' then
        final_role := 'recruiter';
    else
        final_role := 'job_seeker';
    end if;

    insert into public.profiles (
        id, email, name, plan, role,
        company_name, company_website, company_title, siren_number,
        target_title, experience_level, skills
    )
    values (
        NEW.id,
        NEW.email,
        coalesce(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        'free_trial',
        final_role,
        NEW.raw_user_meta_data->>'company_name',
        NEW.raw_user_meta_data->>'company_website',
        NEW.raw_user_meta_data->>'company_title',
        NEW.raw_user_meta_data->>'siren_number',
        NEW.raw_user_meta_data->>'target_title',
        NEW.raw_user_meta_data->>'experience_level',
        case when NEW.raw_user_meta_data->'skills' is not null
             then array(select jsonb_array_elements_text(NEW.raw_user_meta_data->'skills'))
             else null end
    )
    on conflict (id) do update set
        email = excluded.email,
        name = coalesce(excluded.name, public.profiles.name);

    return NEW;
end;
$function$;
