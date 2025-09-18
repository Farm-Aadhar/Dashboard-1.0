-- Test if current_thresholds table exists and is accessible
-- Run this in Supabase SQL Editor to debug the issue

-- Check if table exists
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'current_thresholds';

-- Check if data exists
SELECT COUNT(*) as row_count FROM public.current_thresholds;

-- Try to select all data
SELECT * FROM public.current_thresholds ORDER BY sensor_type;

-- Check table permissions
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'current_thresholds';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'current_thresholds';