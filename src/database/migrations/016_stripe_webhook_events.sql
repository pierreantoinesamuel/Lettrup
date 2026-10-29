-- Migration 016: Stripe webhook idempotency
create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

alter table public.stripe_webhook_events enable row level security;

create policy "service role manages stripe webhook events"
  on public.stripe_webhook_events for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');