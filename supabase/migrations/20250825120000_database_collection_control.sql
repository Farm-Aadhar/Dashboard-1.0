-- Database-level data collection control system
-- This allows the dashboard to control whether ESP data should be accepted or rejected

-- Create a table to store collection control settings
CREATE TABLE public.data_collection_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  collection_enabled BOOLEAN DEFAULT true,
  collection_mode TEXT DEFAULT 'collecting' CHECK (collection_mode IN ('stopped', 'collecting', 'continuous')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Insert default settings
INSERT INTO public.data_collection_settings (collection_enabled, collection_mode, notes) 
VALUES (true, 'collecting', 'Default collection mode - ESP data accepted');

-- Enable RLS for collection settings
ALTER TABLE public.data_collection_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read and update collection settings
CREATE POLICY "Authenticated users can view collection settings" ON public.data_collection_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update collection settings" ON public.data_collection_settings
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Function to check if data collection is currently enabled
CREATE OR REPLACE FUNCTION public.is_data_collection_enabled()
RETURNS BOOLEAN AS $$
DECLARE
  collection_status BOOLEAN;
BEGIN
  SELECT collection_enabled INTO collection_status 
  FROM public.data_collection_settings 
  WHERE id = 1;
  
  RETURN COALESCE(collection_status, true); -- Default to true if no setting found
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate sensor data insertion
CREATE OR REPLACE FUNCTION public.validate_sensor_data_insertion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if data collection is enabled
  IF NOT public.is_data_collection_enabled() THEN
    -- Log the blocked attempt (optional)
    RAISE LOG 'Sensor data insertion blocked - collection disabled. Node: %, Time: %', 
      COALESCE(NEW.node_id, 'unknown'), NOW();
    
    -- Return NULL to prevent the insert
    RETURN NULL;
  END IF;
  
  -- If collection is enabled, allow the insert
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to validate sensor data insertions
CREATE TRIGGER trigger_validate_sensor_insertion
  BEFORE INSERT ON public.sensor_readings
  FOR EACH ROW EXECUTE FUNCTION public.validate_sensor_data_insertion();

-- Function to update collection settings (callable from dashboard)
CREATE OR REPLACE FUNCTION public.update_collection_mode(
  new_mode TEXT,
  user_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  is_enabled BOOLEAN;
BEGIN
  -- Validate mode
  IF new_mode NOT IN ('stopped', 'collecting', 'continuous') THEN
    RAISE EXCEPTION 'Invalid collection mode. Must be: stopped, collecting, or continuous';
  END IF;
  
  -- Determine if collection should be enabled
  is_enabled := (new_mode != 'stopped');
  
  -- Update the settings
  UPDATE public.data_collection_settings 
  SET 
    collection_enabled = is_enabled,
    collection_mode = new_mode,
    updated_at = NOW(),
    updated_by = auth.uid(),
    notes = COALESCE(user_notes, 
      CASE 
        WHEN new_mode = 'stopped' THEN 'Data collection stopped by user'
        WHEN new_mode = 'collecting' THEN 'Normal data collection enabled'
        WHEN new_mode = 'continuous' THEN 'Continuous data collection enabled'
      END
    )
  WHERE id = 1;
  
  -- Log the change
  RAISE LOG 'Collection mode changed to: % (enabled: %) by user: %', 
    new_mode, is_enabled, auth.uid();
  
  RETURN is_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current collection status (for dashboard)
CREATE OR REPLACE FUNCTION public.get_collection_status()
RETURNS TABLE(
  collection_enabled BOOLEAN,
  collection_mode TEXT,
  updated_at TIMESTAMPTZ,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dcs.collection_enabled,
    dcs.collection_mode,
    dcs.updated_at,
    dcs.notes
  FROM public.data_collection_settings dcs
  WHERE dcs.id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for better performance
CREATE INDEX idx_data_collection_settings_mode ON public.data_collection_settings(collection_mode);

-- Enable realtime for collection settings so dashboard can react to changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.data_collection_settings;

-- Update the updated_at trigger for collection settings
CREATE TRIGGER update_collection_settings_updated_at
  BEFORE UPDATE ON public.data_collection_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.data_collection_settings IS 'Controls whether ESP sensor data should be accepted by the database';
COMMENT ON FUNCTION public.update_collection_mode(TEXT, TEXT) IS 'Updates data collection mode from dashboard (stopped/collecting/continuous)';
COMMENT ON FUNCTION public.is_data_collection_enabled() IS 'Checks if sensor data collection is currently enabled';
COMMENT ON FUNCTION public.validate_sensor_data_insertion() IS 'Trigger function that blocks sensor data when collection is disabled';
