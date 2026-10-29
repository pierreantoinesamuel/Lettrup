-- Migration 015: saved payment method columns on profiles
--
-- Lets a free_trial user register a card via a Stripe Checkout Session in
-- mode='setup' (collects a payment method with no charge) before ever
-- subscribing. The webhook sets these once the setup session completes.

alter table public.profiles
  add column if not exists has_payment_method boolean not null default false,
  add column if not exists stripe_payment_method_id text;

-- Same protection model as protect_profile_billing_columns() (migration 012):
-- only the webhook handler (service role) may write these columns.
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
    or NEW.has_payment_method is distinct from OLD.has_payment_method
    or NEW.stripe_payment_method_id is distinct from OLD.stripe_payment_method_id
  ) and auth.role() <> 'service_role' then
    raise exception 'billing columns can only be changed by a trusted server process';
  end if;
  return NEW;
end;
$function$;
