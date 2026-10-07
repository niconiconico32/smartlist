-- Migration: align the ios_store_url column default with the live value
--
-- 20261007040000 corrected the stored value on the row the forced-update flow
-- reads, but the column default still carried the previous App Store id. Any
-- environment that inserts into public.app_config without naming
-- ios_store_url would have reintroduced the dead link, which is how a fresh
-- database or a restore would end up wrong again.
--
-- This changes only the default of that one column. It rewrites no rows, so
-- the existing configuration row keeps the value it already has, and Android,
-- min_version, force_update_message and updated_at are not involved.
--
-- Idempotent: setting a column default to the expression it already holds is
-- a no-op. The historical 20260502 migration stays frozen and keeps its own
-- value; this is the corrective statement that supersedes it.

ALTER TABLE public.app_config
ALTER COLUMN ios_store_url
SET DEFAULT 'https://apps.apple.com/app/id6761862417';