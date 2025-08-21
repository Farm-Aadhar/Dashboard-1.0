-- Temporary: Make sensor readings publicly accessible for testing
-- This should be removed in production and proper authentication should be implemented

-- Drop existing RLS policies for sensor_readings
DROP POLICY IF EXISTS "Authenticated users can view sensor data" ON public.sensor_readings;
DROP POLICY IF EXISTS "System can insert sensor data" ON public.sensor_readings;

-- Create new policies that allow public access
CREATE POLICY "Public can view sensor data" ON public.sensor_readings
  FOR SELECT USING (true);

CREATE POLICY "Public can insert sensor data" ON public.sensor_readings
  FOR INSERT WITH CHECK (true);

-- Note: In production, you should:
-- 1. Implement proper authentication in your app
-- 2. Restore the original authenticated-only policies
-- 3. Remove this migration
