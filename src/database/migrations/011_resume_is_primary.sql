-- Adds the Primary Resume concept: a candidate designates at most one of their
-- Resumes as authoritative for Cover Letter / Portfolio generation. See CONTEXT.md.

alter table public.user_resumes
  add column if not exists is_primary boolean not null default false;

-- Backfill: mark each candidate's most-recently-updated resume as primary, which
-- matches today's de-facto behavior (CoverLetterGenerator/PortfolioBuilder both
-- read listUserResumes()[0], already sorted by updated_at desc) so this ships
-- without changing what any existing candidate currently sees.
with ranked as (
  select id,
         row_number() over (
           partition by user_id
           order by updated_at desc nulls last, created_at desc nulls last, id desc
         ) as rn
  from public.user_resumes
)
update public.user_resumes ur
set is_primary = true
from ranked
where ranked.id = ur.id
  and ranked.rn = 1;

-- Enforce the invariant at the database level: at most one primary resume per
-- candidate. The index only covers rows where is_primary is true, so the many
-- non-primary rows never collide with each other.
create unique index if not exists user_resumes_one_primary_per_user
  on public.user_resumes (user_id)
  where is_primary;
