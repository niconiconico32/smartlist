-- Migration: create app_config table for force update system
-- Run this in your Supabase SQL editor or add it to supabase/migrations/

CREATE TABLE IF NOT EXISTS public.app_config (
  id              SERIAL PRIMARY KEY,
  min_version     TEXT NOT NULL DEFAULT '0.0.0',
  ios_store_url   TEXT NOT NULL DEFAULT 'https://apps.apple.com/app/id6747673851',
  android_store_url TEXT NOT NULL DEFAULT 'https://play.google.com/store/apps/details?id=com.brainyahdh.app',
  force_update_message TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial row (min_version '0.0.0' = reviewer bypass / no force update)
INSERT INTO public.app_config (min_version, ios_store_url, android_store_url, force_update_message)
VALUES (
  '0.0.0',
  'https://apps.apple.com/app/id6747673851',
  'https://play.google.com/store/apps/details?id=com.brainyahdh.app',
  'Estamos actualizando tu mundo para que sea más estable y divertido.'
)
ON CONFLICT DO NOTHING;

-- RLS: allow anon reads so unauthenticated users can be gated too
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_config_public_read"
  ON public.app_config FOR SELECT
  USING (true);
