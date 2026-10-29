-- Migration 013: One-time export entitlements (download paywall)
--
-- Backs the download-time paywall: a paid subscriber (profiles.plan !=
-- 'free_trial', checked client-side from the already-live AuthContext) gets
-- unlimited exports for free; everyone else can buy a single-document export
-- credit here instead of subscribing. Rows are granted only by the Stripe
-- webhook (mode: 'payment' checkout.session.completed) and consumed only by
-- the export-consume server route — never by the client directly, same
-- protection model as profiles.plan / the stripe_* columns (migration 012).

create table if not exists public.export_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('cv', 'cover_letter')),
  status text not null default 'available' check (status in ('available', 'consumed')),
  stripe_checkout_session_id text not null unique,
  document_id uuid,
  format_used text check (format_used in ('pdf', 'docx')),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_export_entitlements_lookup
  on public.export_entitlements (user_id, document_type, status);

alter table public.export_entitlements enable row level security;

-- Read-only for the owner (e.g. a future "you have 1 credit left" UI); all
-- writes go through the service-role webhook/consume routes, so there are
-- deliberately no insert/update/delete policies for authenticated/anon.
create policy "users_select_own_export_entitlements"
  on public.export_entitlements for select
  to authenticated
  using (auth.uid() = user_id);
