-- Fix sensor_readings table permissions for simulation data
-- This script allows anonymous users to insert simulation data

-- First, let's check current RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'sensor_readings';

-- Allow anonymous users to insert sensor readings (for simulation)
-- This policy allows INSERT operations from anonymous users
CREATE POLICY "Allow anonymous sensor data insertion" ON "public"."sensor_readings"
AS PERMISSIVE FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to read sensor readings (for dashboard)
CREATE POLICY "Allow anonymous sensor data reading" ON "public"."sensor_readings"
AS PERMISSIVE FOR SELECT
TO anon
USING (true);

-- If the policies already exist, we need to drop and recreate them
-- DROP POLICY IF EXISTS "Allow anonymous sensor data insertion" ON "public"."sensor_readings";
-- DROP POLICY IF EXISTS "Allow anonymous sensor data reading" ON "public"."sensor_readings";

-- Alternative: Temporarily disable RLS for testing (NOT recommended for production)
-- ALTER TABLE "public"."sensor_readings" DISABLE ROW LEVEL SECURITY;

-- Check if RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'sensor_readings';

-- Enable RLS if not already enabled
-- ALTER TABLE "public"."sensor_readings" ENABLE ROW LEVEL SECURITY;

COMMIT;