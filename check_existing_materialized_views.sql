-- Check which materialized views actually exist in the database
SELECT 
  schemaname, 
  matviewname, 
  hasindexes,
  ispopulated,
  definition
FROM pg_matviews 
WHERE schemaname = 'public'
ORDER BY matviewname;
