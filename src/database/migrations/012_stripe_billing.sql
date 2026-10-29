-- Migration 012: Stripe billing columns on profiles
--
-- Wires the live entitlement column (profiles.plan, see migration
-- "protect_profile_plan_column") to a real Stripe subscription. These columns
-- let the webhook handler find the right profile row and let the customer
-- portal / checkout routes avoid creating duplicate Stripe customers.
--
-- profiles.plan itself is left untouched (still 'free_trial' | 'starter' |
-- 'pro' | 'plus' | 'max') and remains the single source of truth the rest of
-- the app already reads (Sidebar, UserSettingsModal, admin panels).

alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists billing_interval text check (billing_interval in ('month', 'year')),
  add column if not exists subscription_status text,
  add column if not exists current_period_end timestamptz;

create unique index if not exists idx_profiles_stripe_customer_id
  on public.profiles (stripe_customer_id) where stripe_customer_id is not null;

create unique index if not exists idx_profiles_stripe_subscription_id
  on public.profiles (stripe_subscription_id) where stripe_subscription_id is not null;

-- Same protection model as protect_profile_plan(): only the webhook handler
-- (using the Supabase service role key) may write these columns. Without
-- this, the authenticated-role column grants that Postgres defaults new
-- columns to would let a signed-in user set their own subscription_status
-- via the anon client.
create or replace function public.protect_profile_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if (
    NEW.stripe_customer_id is distinct from OLD.stripe_customer_id
    or NEW.stripe_subscription_id is distinct from OLD.stripe_subscription_id
    or NEW.stripe_price_id is distinct from OLD.stripe_price_id
    or NEW.billing_interval is distinct from OLD.billing_interval
    or NEW.subscription_status is distinct from OLD.subscription_status
    or NEW.current_period_end is distinct from OLD.current_period_end
  ) and auth.role() <> 'service_role' then
    raise exception 'billing columns can only be changed by a trusted server process';
  end if;
  return NEW;
end;
$function$;

drop trigger if exists protect_profile_billing_columns_trigger on public.profiles;
create trigger protect_profile_billing_columns_trigger
  before update on public.profiles
  for each row execute function public.protect_profile_billing_columns();
