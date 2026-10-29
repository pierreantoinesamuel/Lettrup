-- Migration 014: Super-admin flag for the admin-promotion pipeline
--
-- profiles.role already supports 'admin', but nothing distinguishes the one
-- account allowed to grant that role to others from any other admin. Adds
-- is_super_admin so handleAdminPromotionRoute can gate itself on a DB flag
-- instead of hardcoding an email in application code.
--
-- Same column-level lockdown as `role` (migrations 006/007/008): only a
-- service-role / direct-SQL session can ever set this, never a normal
-- client request, so an admin can't self-grant super-admin status either.

alter table public.profiles
  add column if not exists is_super_admin boolean not null default false;

revoke update (is_super_admin) on public.profiles from authenticated, anon;
