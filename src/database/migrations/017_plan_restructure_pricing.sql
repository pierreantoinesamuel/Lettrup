-- Migration 017: Pricing restructure — Free/Pro quota + Max unlimited + one-time bundle
--
-- Backs two changes from the pricing restructure (free tier gets 1 free CV
-- download/month, no free cover letters; Pro merged with the retired Plus
-- tier at 9.99€ with a 10 CV / 10 cover-letter monthly download quota; Max
-- dropped to 39€ with unlimited downloads; the one-time purchase became a
-- single 1.99€ bundle granting a CV credit AND a cover-letter credit
-- together instead of two separate per-document SKUs):
--
--   1. plan_export_usage — a monthly download counter shared by every
--      capped plan (free_trial: 1 CV/month via FREE_MONTHLY_CV_QUOTA in
--      exportEntitlementApi.ts; pro/plus: 10 of each/month). Max stays
--      uncapped and never touches this table. Calendar month (UTC,
--      'YYYY-MM') is the reset boundary rather than each user's actual
--      Stripe billing-period boundary, which varies by signup date and by
--      monthly/yearly interval — simpler, and "X / mois" reads as
--      calendar-month to a user anyway.
--
--   2. export_entitlements.stripe_checkout_session_id's uniqueness is
--      relaxed to (session_id, document_type) so a single bundle Checkout
--      session can grant two credit rows (cv + cover_letter) instead of
--      just one.
--
-- Note: this repo has no tracked migration defining profiles.plan's live
-- CHECK constraint (confirmed absent from every migration file in this
-- directory). Verify directly against the live Supabase project that it
-- still accepts 'pro' / 'max' / 'plus' before relying on plan writes
-- succeeding — this migration does not touch that constraint because its
-- current definition isn't recorded anywhere in the repo.

create table if not exists public.plan_export_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('cv', 'cover_letter')),
  period_key text not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, document_type, period_key)
);

create index if not exists idx_plan_export_usage_lookup
  on public.plan_export_usage (user_id, document_type, period_key);

alter table public.plan_export_usage enable row level security;

-- Read-only for the owner (e.g. a "7/10 downloads used this month" UI);
-- all writes go through consume_plan_export_credit() below, same
-- protection model as export_entitlements (migration 013).
create policy "users_select_own_plan_export_usage"
  on public.plan_export_usage for select
  to authenticated
  using (auth.uid() = user_id);

-- Atomically increments the counter for (user, document_type, period) and
-- returns true, unless it's already at p_limit, in which case it makes no
-- change and returns false — the caller (exportEntitlementApi.ts) uses
-- that to fall through to the one-time-credit path instead of hard-failing.
-- security definer + execute revoked from public/authenticated so only the
-- service-role export-consume route can call it, same trusted-write model
-- as protect_profile_billing_columns() (migration 012).
create or replace function public.consume_plan_export_credit(
  p_user_id uuid,
  p_document_type text,
  p_period_key text,
  p_limit integer default 10
)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_updated boolean;
begin
  insert into plan_export_usage (user_id, document_type, period_key, count)
  values (p_user_id, p_document_type, p_period_key, 1)
  on conflict (user_id, document_type, period_key)
  do update set count = plan_export_usage.count + 1, updated_at = now()
  where plan_export_usage.count < p_limit
  returning true into v_updated;

  return coalesce(v_updated, false);
end;
$function$;

revoke all on function public.consume_plan_export_credit(uuid, text, text, integer) from public;
revoke all on function public.consume_plan_export_credit(uuid, text, text, integer) from authenticated;
grant execute on function public.consume_plan_export_credit(uuid, text, text, integer) to service_role;

-- One-time export bundle purchases now grant two credit rows (cv +
-- cover_letter) from a single Checkout session — replace the plain
-- per-session uniqueness with a per-(session, document_type) one.
alter table public.export_entitlements
  drop constraint if exists export_entitlements_stripe_checkout_session_id_key;

alter table public.export_entitlements
  add constraint export_entitlements_session_document_key
  unique (stripe_checkout_session_id, document_type);
