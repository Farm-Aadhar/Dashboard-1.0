-- Simple Database Collection Control
-- This creates a trigger that checks for a special status record before allowing inserts

-- Function to check if data collection is enabled
CREATE OR REPLACE FUNCTION check_collection_status()
RETURNS BOOLEAN AS $$
DECLARE
  status_record RECORD;
  is_enabled BOOLEAN DEFAULT true;
BEGIN
  -- Look for the special control record
  SELECT temperature INTO is_enabled
  FROM sensor_readings 
  WHERE node_id = '__COLLECTION_STATUS__'
    AND air_quality_mq135 = -999  -- Special marker
  ORDER BY timestamp DESC
  LIMIT 1;
  
  -- If no control record found, default to enabled
  IF is_enabled IS NULL THEN
    RETURN true;
  END IF;
  
  -- temperature field: 1 = enabled, 0 = disabled
  RETURN (is_enabled = 1);
END;
$$ LANGUAGE plpgsql;

-- Function to prevent inserts when collection is disabled
CREATE OR REPLACE FUNCTION prevent_sensor_insert_when_disabled()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip the check for control records (they need to be inserted to update status)
  IF NEW.node_id = '__COLLECTION_STATUS__' AND NEW.air_quality_mq135 = -999 THEN
    RETURN NEW;  -- Allow control records
  END IF;
  
  -- Check if data collection is enabled for regular sensor data
  IF NOT check_collection_status() THEN
    RAISE EXCEPTION 'Data collection is currently disabled. Cannot insert sensor readings. Enable collection via dashboard to allow data insertion.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_check_collection_status ON sensor_readings;
CREATE TRIGGER trigger_check_collection_status
  BEFORE INSERT ON sensor_readings
  FOR EACH ROW
  EXECUTE FUNCTION prevent_sensor_insert_when_disabled();

-- Insert initial control record (collection disabled)
INSERT INTO sensor_readings (
  node_id, 
  temperature, 
  humidity, 
  air_quality_mq135, 
  alcohol_mq3, 
  smoke_mq2, 
  soil_moisture,
  timestamp
) VALUES (
  '__COLLECTION_STATUS__',
  0,  -- 0 = disabled
  0,  -- 0 = stopped mode
  -999,  -- Special marker
  -999,  -- Special marker
  -999,  -- Special marker
  -999,  -- Special marker
  NOW()
) ON CONFLICT DO NOTHING;
