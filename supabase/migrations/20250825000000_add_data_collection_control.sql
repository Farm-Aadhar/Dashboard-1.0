-- Migration: Add data collection control system
-- This creates a database-level control to prevent data insertion when collection is disabled

-- Create a table to store collection status
CREATE TABLE IF NOT EXISTS public.data_collection_status (
  id SERIAL PRIMARY KEY,
  collection_enabled BOOLEAN NOT NULL DEFAULT true,
  collection_mode TEXT NOT NULL DEFAULT 'continuous',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT DEFAULT 'system'
);

-- Insert initial status
INSERT INTO public.data_collection_status (collection_enabled, collection_mode, updated_by) 
VALUES (false, 'stopped', 'migration')
ON CONFLICT DO NOTHING;

-- Create a function to check if data collection is enabled
CREATE OR REPLACE FUNCTION check_data_collection_enabled()
RETURNS BOOLEAN AS $$
DECLARE
  is_enabled BOOLEAN;
BEGIN
  SELECT collection_enabled INTO is_enabled
  FROM public.data_collection_status
  ORDER BY updated_at DESC
  LIMIT 1;
  
  -- Default to true if no record exists
  RETURN COALESCE(is_enabled, true);
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to prevent inserts when collection is disabled
CREATE OR REPLACE FUNCTION prevent_sensor_insert_when_disabled()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if data collection is enabled
  IF NOT check_data_collection_enabled() THEN
    RAISE EXCEPTION 'Data collection is currently disabled. Cannot insert sensor readings.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on sensor_readings table
DROP TRIGGER IF EXISTS trigger_prevent_sensor_insert ON public.sensor_readings;
CREATE TRIGGER trigger_prevent_sensor_insert
  BEFORE INSERT ON public.sensor_readings
  FOR EACH ROW
  EXECUTE FUNCTION prevent_sensor_insert_when_disabled();

-- Create a function to update collection status
CREATE OR REPLACE FUNCTION update_data_collection_status(
  enabled BOOLEAN,
  mode TEXT DEFAULT 'continuous'
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.data_collection_status (collection_enabled, collection_mode, updated_by)
  VALUES (enabled, mode, 'api');
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT ON public.data_collection_status TO authenticated;
GRANT SELECT ON public.data_collection_status TO anon;
GRANT EXECUTE ON FUNCTION check_data_collection_enabled() TO authenticated;
GRANT EXECUTE ON FUNCTION check_data_collection_enabled() TO anon;
GRANT EXECUTE ON FUNCTION update_data_collection_status(BOOLEAN, TEXT) TO authenticated;
