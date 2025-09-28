-- Apply critical migrations for backend-driven progress system
-- Run this in Supabase SQL Editor

-- 1. Apply RPC functions migration
\i supabase/migrations/205_create_missing_rpc_functions.sql

-- 2. Apply missing tables migration  
\i supabase/migrations/206_fix_missing_tables.sql
