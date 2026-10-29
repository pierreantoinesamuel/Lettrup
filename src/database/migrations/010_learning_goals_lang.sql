-- Migration 010: learning_goals.lang column
--
-- SupabaseLearningRepository.ts (see the Supabase-backed rewrite of the
-- Learning Hub) needed to persist CareerGoal.lang ('fr' | 'en') but the
-- table had no matching column, so it was defaulting to 'fr' on every
-- reload instead of round-tripping the goal's real creation language.

alter table public.learning_goals
  add column if not exists lang varchar(2) not null default 'fr';
