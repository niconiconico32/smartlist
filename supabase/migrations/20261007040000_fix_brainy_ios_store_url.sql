-- Migration: correct the iOS store link in public.app_config
--
-- Why: the configuration row the forced-update screen reads still pointed at
-- the App Store id the app had before its current listing. Same host, same
-- /app/id shape, same digit count, so nothing looked wrong in review.
-- src/services/updateService.ts selects ios_store_url with the anon key and
-- hands it straight to Linking.openURL in ForceUpdateScreen, so any build
-- gated by min_version would have been opened on a dead store page. The live
-- id is the one EAS submits production builds under (ios.ascAppId in
-- eas.json).
--
-- History: this version was originally written as a plpgsql DO block with
-- guards and post-conditions. The statement below is what was actually
-- applied to production, and it is kept verbatim on purpose. The DO block
-- was correct but could not be delivered as one command, and an exit code of
-- zero without a re-read of the row is not evidence that anything was
-- written. Production had already been updated by hand when this file was
-- corrected, and the remote history was repaired with
-- `supabase migration repair 20261007040000 --status applied`. It must not
-- be re-applied or repaired again. Fresh environments replay this file from
-- scratch and get the same result, which is why it stays: the repository has
-- to describe the schema that production actually has.
--
-- The UPDATE is idempotent by construction: it is keyed by id and by the
-- exact previous value, so on an environment that is already correct it
-- matches zero rows and writes nothing.
--
-- Scope: one column, one row. Android, min_version, force_update_message and
-- updated_at are untouched. The column default is corrected separately in
-- 20261007050000_fix_brainy_ios_store_url_default.sql.

UPDATE public.app_config
SET ios_store_url = 'https://apps.apple.com/app/id6761862417'
WHERE id = 1
  AND ios_store_url = 'https://apps.apple.com/app/id6747673851';