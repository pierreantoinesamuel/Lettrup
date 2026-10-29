# Migrations

This directory is the canonical, applied schema — not `supabase_schema.sql`
at the repo root or under `src/database/`, both of which are one-time
snapshots that have drifted and are kept only for git history (see the
deprecation notice at the top of each).

## Applying to a clean project

Run every file in ascending numeric order, starting from
`000_full_supabase_schema.sql`:

```
000_full_supabase_schema.sql
001_job_posting_cache.sql
003_outreach_messages.sql
004_trial_lifecycle.sql
005_roles_and_job_postings.sql
006_real_auth_role_security.sql
007_fix_signup_role_escalation.sql
008_core_admin_recruiter_real_data.sql
009_candidate_career_profile.sql
010_learning_goals_lang.sql
011_resume_is_primary.sql
012_stripe_billing.sql
013_export_entitlements.sql
014_super_admin_promotion.sql
015_profile_payment_method.sql
016_stripe_webhook_events.sql
017_plan_restructure_pricing.sql
018_learning_goal_context.sql
019_signup_trigger_consistency.sql
```

Via the Supabase CLI: `supabase db push`, or paste each file's contents into
the SQL Editor in order. There is no `002_*` file — that number was skipped
during development and is not a gap to fill.

## Rollback

These migrations are additive (new tables/columns/policies) and were not
written with paired `down` scripts. To roll back:

- **Before applying to production**: just don't run the later files: a
  migration `NNN` can be applied without any migration numbered above it.
- **After applying to production**: write a new migration (e.g.
  `017_revert_x.sql`) that undoes the specific change (`drop column`,
  `drop policy`, etc.) rather than editing or deleting a numbered file
  already applied elsewhere — the numbered files are the historical record
  of what ran, in what order, on every environment.
- Restoring from a Supabase point-in-time backup is the only way to undo a
  destructive change (a dropped column/table) that already ran against data
  you need back.

## Adding a new migration

Use the next integer, a short snake_case description, and a comment header
explaining *why* (not just what) — see any existing file for the pattern.
