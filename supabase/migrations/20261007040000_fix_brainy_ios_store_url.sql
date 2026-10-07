-- Migration: correct the iOS store link in public.app_config
--
-- Why: the seeded configuration row still pointed at the App Store id the app
-- had before its current listing. Same host, same /app/id shape, same digit
-- count, so nothing looked wrong. src/services/updateService.ts hands
-- ios_store_url straight to Linking.openURL in the forced-update screen, so
-- any build gated by min_version would have been sent to a dead store page.
-- The live id is the one EAS submits production builds under (ios.ascAppId
-- in eas.json).
--
-- Schema this was derived from (verified against production, not assumed):
--   public.app_config
--     id                integer      PRIMARY KEY (app_config_pkey)
--     min_version       text         NOT NULL
--     ios_store_url     text         NOT NULL
--     android_store_url text         NOT NULL
--     force_update_message text      NULL
--     updated_at        timestamptz  NOT NULL   (no trigger: INSERT-time only)
--
-- Scope: one UPDATE on one row, keyed by id and by the exact previous value.
-- No insert, no delete, no schema change, no touch of Android or min_version.
-- updated_at is deliberately left alone: the table has no trigger to maintain
-- it and no client reads it, so writing it by hand would only add an
-- unverifiable claim.
--
-- Idempotent: re-running after the fix reports and exits without writing.
-- Strict: aborts on any state other than exactly one row still holding the
-- old link, rather than guessing.

DO $$
DECLARE
  old_url CONSTANT text := 'https://apps.apple.com/app/id6747673851';
  new_url CONSTANT text := 'https://apps.apple.com/app/id6761862417';

  v_rows        integer;
  v_old         integer;
  v_new         integer;
  v_target_id   integer;
  v_android     text;
  v_others_json jsonb;
  v_updated     integer;
BEGIN
  -- Structure: the corrective path only makes sense on a single-row table.
  SELECT count(*) INTO v_rows FROM public.app_config;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION
      'ABORT app_config ios link fix: expected exactly 1 row in public.app_config, found %',
      v_rows;
  END IF;

  SELECT count(*) INTO v_old FROM public.app_config WHERE ios_store_url = old_url;
  SELECT count(*) INTO v_new FROM public.app_config WHERE ios_store_url = new_url;

  -- Already correct: nothing to write, and that is a success.
  IF v_old = 0 AND v_new = 1 THEN
    RAISE NOTICE 'app_config ios link already correct, no change applied';
    RETURN;
  END IF;

  IF v_old <> 1 OR v_new <> 0 THEN
    RAISE EXCEPTION
      'ABORT app_config ios link fix: unexpected state (rows with old link: %, rows with new link: %)',
      v_old, v_new;
  END IF;

  -- Pin the exact row and remember everything that must not move.
  SELECT id INTO v_target_id
    FROM public.app_config
   WHERE ios_store_url = old_url;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'ABORT app_config ios link fix: could not resolve the target row';
  END IF;

  SELECT android_store_url INTO v_android
    FROM public.app_config
   WHERE id = v_target_id;

  SELECT to_jsonb(c) - 'ios_store_url' INTO v_others_json
    FROM public.app_config c
   WHERE c.id = v_target_id;

  UPDATE public.app_config
     SET ios_store_url = new_url
   WHERE id = v_target_id
     AND ios_store_url = old_url;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION
      'ABORT app_config ios link fix: UPDATE touched % rows, expected exactly 1', v_updated;
  END IF;

  -- Post-conditions. Any failure rolls the whole DO block back.
  IF (SELECT count(*) FROM public.app_config) <> v_rows THEN
    RAISE EXCEPTION 'ABORT app_config ios link fix: row count changed';
  END IF;

  IF (SELECT count(*) FROM public.app_config WHERE ios_store_url = new_url) <> 1 THEN
    RAISE EXCEPTION 'ABORT app_config ios link fix: new link not present exactly once';
  END IF;

  IF (SELECT count(*) FROM public.app_config WHERE ios_store_url = old_url) <> 0 THEN
    RAISE EXCEPTION 'ABORT app_config ios link fix: old link still present';
  END IF;

  IF (SELECT android_store_url FROM public.app_config WHERE id = v_target_id) <> v_android THEN
    RAISE EXCEPTION 'ABORT app_config ios link fix: android_store_url changed';
  END IF;

  IF (SELECT to_jsonb(c) - 'ios_store_url' FROM public.app_config c WHERE c.id = v_target_id)
     <> v_others_json THEN
    RAISE EXCEPTION
      'ABORT app_config ios link fix: a column other than ios_store_url changed';
  END IF;

  RAISE NOTICE 'app_config ios link updated on row %', v_target_id;
END $$;