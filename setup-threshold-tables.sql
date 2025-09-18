-- Create threshold management tables for Farm Aadhar Dashboard
-- Run this SQL in your Supabase SQL Editor

-- First, create the enum for sensor types if it doesn't exist
DO $$ BEGIN
    CREATE TYPE sensor_type_enum AS ENUM (
        'air_temperature',
        'air_humidity',
        'air_quality_mq135',
        'alcohol_mq3',
        'smoke_mq2'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create or update the current_thresholds table (single row that gets updated)
CREATE TABLE IF NOT EXISTS public.current_thresholds (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    sensor_type sensor_type_enum NOT NULL,
    low_value numeric(10, 2) NOT NULL,
    high_value numeric(10, 2) NOT NULL,
    unit text NOT NULL,
    label text NOT NULL,
    icon text NULL,
    min_value numeric(10, 2) NULL DEFAULT 0,
    max_value numeric(10, 2) NULL DEFAULT 1000,
    step_value numeric(10, 4) NULL DEFAULT 1,
    source_preset_id uuid NULL,
    source_type text NOT NULL DEFAULT 'manual',
    last_updated timestamp with time zone NULL DEFAULT now(),
    updated_by uuid NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    
    CONSTRAINT current_thresholds_pkey PRIMARY KEY (id),
    CONSTRAINT current_thresholds_sensor_type_unique UNIQUE (sensor_type)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_current_thresholds_sensor_type 
ON public.current_thresholds USING btree (sensor_type);

-- Create trigger to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_current_thresholds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_current_thresholds_updated_at ON current_thresholds;
CREATE TRIGGER update_current_thresholds_updated_at
    BEFORE UPDATE ON current_thresholds
    FOR EACH ROW
    EXECUTE FUNCTION update_current_thresholds_updated_at();

-- Insert default threshold values (only if table is empty)
INSERT INTO public.current_thresholds (sensor_type, low_value, high_value, unit, label, icon, min_value, max_value, step_value, source_type)
SELECT * FROM (VALUES
    ('air_temperature'::sensor_type_enum, 15.0, 35.0, '°C', 'Air Temperature', 'thermometer', 0.0, 50.0, 0.5, 'system_default'),
    ('air_humidity'::sensor_type_enum, 30.0, 80.0, '%', 'Air Humidity', 'droplets', 0.0, 100.0, 1.0, 'system_default'),
    ('air_quality_mq135'::sensor_type_enum, 50.0, 1000.0, 'ppm', 'Air Quality (MQ135)', 'wind', 0.0, 5000.0, 50.0, 'system_default'),
    ('alcohol_mq3'::sensor_type_enum, 10.0, 500.0, 'ppm', 'Alcohol (MQ3)', 'activity', 0.0, 3000.0, 50.0, 'system_default'),
    ('smoke_mq2'::sensor_type_enum, 20.0, 800.0, 'ppm', 'Smoke (MQ2)', 'flame', 0.0, 4000.0, 50.0, 'system_default')
) AS v(sensor_type, low_value, high_value, unit, label, icon, min_value, max_value, step_value, source_type)
WHERE NOT EXISTS (SELECT 1 FROM public.current_thresholds LIMIT 1);

-- Enable RLS (Row Level Security) if needed
ALTER TABLE public.current_thresholds ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.current_thresholds;
CREATE POLICY "Allow all operations for authenticated users"
ON public.current_thresholds
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON public.current_thresholds TO authenticated;
GRANT ALL ON public.current_thresholds TO service_role;

-- Verify the table was created and populated
SELECT 'Current thresholds table created successfully!' as status;
SELECT sensor_type, low_value, high_value, unit, label FROM public.current_thresholds ORDER BY sensor_type;