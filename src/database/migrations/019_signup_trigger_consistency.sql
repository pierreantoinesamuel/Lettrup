-- Migration 019: keep auth signup profile provisioning compatible with the app
alter table public.profiles
  add column if not exists company_name text,
  add column if not exists company_website text,
  add column if not exists company_title text,
  add column if not exists siren_number text,
  add column if not exists target_title text,
  add column if not exists experience_level text,
  add column if not exists skills text[];

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $function$
begin
  insert into public.profiles (
    id, email, name, plan, role, company_name, company_website,
    company_title, siren_number, target_title, experience_level, skills
  ) values (
    NEW.id, NEW.email,
    coalesce(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'free_trial', 'job_seeker',
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'company_website',
    NEW.raw_user_meta_data->>'company_title',
    NEW.raw_user_meta_data->>'siren_number',
    NEW.raw_user_meta_data->>'target_title',
    NEW.raw_user_meta_data->>'experience_level',
    case when jsonb_typeof(NEW.raw_user_meta_data->'skills') = 'array'
      then array(select jsonb_array_elements_text(NEW.raw_user_meta_data->'skills'))
      else null end
  ) on conflict (id) do update set
    email = excluded.email,
    name = coalesce(excluded.name, public.profiles.name);
  return NEW;
end;
$function$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();