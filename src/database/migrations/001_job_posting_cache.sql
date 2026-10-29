-- Migration: Create job_posting_cache table for exact-match semantic caching
create table if not exists job_posting_cache (
  content_hash text primary key,
  extracted_keywords jsonb not null,
  extracted_requirements jsonb not null,
  model_used text not null,
  hit_count integer not null default 0,
  created_at timestamptz not null default now(),
  last_hit_at timestamptz
);
