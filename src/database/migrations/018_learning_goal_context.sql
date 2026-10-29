-- Migration 018: Learning Hub persistence and learner-specific context
create table if not exists public.learning_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_role text not null,
  current_role text,
  field_of_study text,
  competencies text[] not null default '{}',
  context text,
  seniority text check (seniority in ('junior', 'mid', 'senior', 'lead')),
  timeframe_months integer not null check (timeframe_months in (3, 6, 12)),
  hours_per_week integer not null check (hours_per_week between 1 and 40),
  strategy_id text,
  is_active boolean not null default true,
  lang text not null default 'fr' check (lang in ('fr', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_gap_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null references public.learning_goals(id) on delete cascade,
  report jsonb not null,
  source text not null,
  generated_at timestamptz not null default now()
);

create table if not exists public.learning_roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null references public.learning_goals(id) on delete cascade,
  roadmap jsonb not null,
  estimated_weeks integer not null default 0,
  generated_at timestamptz not null default now()
);

create table if not exists public.learning_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null references public.learning_goals(id) on delete cascade,
  week_number integer not null,
  skill text not null,
  description text not null,
  resource jsonb,
  status text not null default 'todo' check (status in ('todo', 'done')),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null references public.learning_goals(id) on delete cascade,
  skill text not null,
  state text not null check (state in ('identified', 'learning', 'practiced', 'validated')),
  hours_logged numeric not null default 0,
  validated_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, goal_id, skill)
);

create table if not exists public.learning_resource_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill text not null,
  provider text not null,
  title text not null,
  rating smallint not null check (rating in (-1, 1)),
  created_at timestamptz not null default now()
);

create index if not exists learning_goals_user_created_idx on public.learning_goals(user_id, created_at desc);
create index if not exists learning_reports_goal_generated_idx on public.learning_gap_reports(goal_id, generated_at desc);
create index if not exists learning_roadmaps_goal_generated_idx on public.learning_roadmaps(goal_id, generated_at desc);

alter table public.learning_goals enable row level security;
alter table public.learning_gap_reports enable row level security;
alter table public.learning_roadmaps enable row level security;
alter table public.learning_tasks enable row level security;
alter table public.learning_progress enable row level security;
alter table public.learning_resource_feedback enable row level security;

create policy "users manage own learning goals" on public.learning_goals for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own learning reports" on public.learning_gap_reports for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own learning roadmaps" on public.learning_roadmaps for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own learning tasks" on public.learning_tasks for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own learning progress" on public.learning_progress for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own learning feedback" on public.learning_resource_feedback for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.learning_goals
  add column if not exists current_role text,
  add column if not exists field_of_study text,
  add column if not exists competencies text[] not null default '{}',
  add column if not exists context text;