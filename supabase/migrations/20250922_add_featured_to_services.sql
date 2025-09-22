-- Add missing featured column to services
-- Safe to run multiple times due to IF NOT EXISTS

alter table if exists public.services
  add column if not exists featured boolean not null default false;

-- Optional: backfill can be customized; default false is sufficient


