-- Fix permissions for current_thresholds table
-- Run this SQL in your Supabase SQL Editor to allow anonymous access

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.current_thresholds;
DROP POLICY IF EXISTS "Allow read access for everyone" ON public.current_thresholds;
DROP POLICY IF EXISTS "Allow write access for authenticated users" ON public.current_thresholds;

-- Create policy to allow read access for everyone (including anonymous users)
CREATE POLICY "Allow read access for everyone"
ON public.current_thresholds
FOR SELECT
USING (true);

-- Create policy to allow write access for authenticated users only
CREATE POLICY "Allow write access for authenticated users"
ON public.current_thresholds
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant read permissions to anonymous users
GRANT SELECT ON public.current_thresholds TO anon;
GRANT ALL ON public.current_thresholds TO authenticated;
GRANT ALL ON public.current_thresholds TO service_role;

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'current_thresholds';