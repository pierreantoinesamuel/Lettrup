-- Migration 009: Candidate career-path onboarding profile
--
-- AuthPage.tsx's candidate onboarding questionnaire grew from 3 fields
-- (target_title, experience_level, skills) to a 10-question wizard so the
-- Coach IA / dashboard can tailor guidance to where the candidate actually
-- is in their search, not just their target title. This adds the columns
-- for the 7 new answers and threads them through handle_new_user() the same
-- way migration 007 wired the original 3.

alter table public.profiles
  add column if not exists primary_goal text,
  add column if not exists opportunity_type text,
  add column if not exists career_horizon text,
  add column if not exists has_portfolio boolean,
  add column if not exists portfolio_details text,
  add column if not exists biggest_obstacle text,
  add column if not exists weekly_time_commitment text,
  add column if not exists preferred_support text;

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
        target_title, experience_level, skills,
        primary_goal, opportunity_type, career_horizon,
        has_portfolio, portfolio_details, biggest_obstacle,
        weekly_time_commitment, preferred_support
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
             else null end,
        NEW.raw_user_meta_data->>'primary_goal',
        NEW.raw_user_meta_data->>'opportunity_type',
        NEW.raw_user_meta_data->>'career_horizon',
        (NEW.raw_user_meta_data->>'has_portfolio')::boolean,
        NEW.raw_user_meta_data->>'portfolio_details',
        NEW.raw_user_meta_data->>'biggest_obstacle',
        NEW.raw_user_meta_data->>'weekly_time_commitment',
        NEW.raw_user_meta_data->>'preferred_support'
    )
    on conflict (id) do update set
        email = excluded.email,
        name = coalesce(excluded.name, public.profiles.name);

    return NEW;
end;
$function$;
