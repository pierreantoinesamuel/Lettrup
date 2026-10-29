-- Migration 007: Close the signup privilege-escalation hole
--
-- handle_new_user() previously read raw_user_meta_data->>'role' and granted
-- 'recruiter' on the spot if the signup payload asked for it. Since signup
-- metadata is fully attacker-controlled (any client can POST
-- { data: { role: 'recruiter' } } to /auth/v1/signup), this let anyone grant
-- themselves Recruteur access with zero verification. AuthPage.tsx's
-- "recruiter" account-type toggle relied on exactly this behavior.
--
-- Fix: handle_new_user() now ALWAYS inserts new profiles with
-- role = 'job_seeker', full stop. Company fields (company_name,
-- company_website, company_title, siren_number) are still captured at
-- signup so they're available for the later Recruteur application review
-- pipeline, but they no longer influence role.
--
-- Recruiter access must instead be granted by a separate, reviewed
-- application step (service-role / admin-only UPDATE), never by
-- handle_new_user at signup.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
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
        'job_seeker',
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

-- Belt-and-suspenders: the existing "users_insert_own_profile" policy only
-- checked auth.uid() = id, so a direct client-side INSERT (bypassing the
-- trigger entirely, e.g. after a future DELETE policy is added, or via a
-- service that inserts before the trigger fires) could still set an
-- arbitrary role. Force client-initiated inserts to job_seeker too; profiles
-- table already forbids client UPDATEs of role (migration 006), so this
-- closes the matching gap on INSERT.
drop policy if exists "users_insert_own_profile" on public.profiles;
create policy "users_insert_own_profile" on public.profiles
  for insert to public
  with check (auth.uid() = id and role = 'job_seeker');
