-- Create user profiles table
CREATE TABLE public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'farmer',
  preferred_language TEXT DEFAULT 'en',
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sensor readings table
CREATE TABLE public.sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id TEXT NOT NULL,
  temperature FLOAT8,
  humidity FLOAT8,
  soil_moisture FLOAT8,
  air_quality_mq135 INTEGER,
  alcohol_mq3 INTEGER,
  smoke_mq2 INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create node metadata table
CREATE TABLE public.node_metadata (
  node_id TEXT PRIMARY KEY,
  node_name TEXT NOT NULL,
  location TEXT,
  last_active_timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create AI suggestions table
CREATE TABLE public.ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  suggestion_text TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  image_url TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create farm tasks table
CREATE TABLE public.farm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  task_description TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create alerts table
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_sensor_readings_timestamp ON public.sensor_readings(timestamp DESC);
CREATE INDEX idx_sensor_readings_node_id ON public.sensor_readings(node_id);
CREATE INDEX idx_ai_suggestions_user_timestamp ON public.ai_suggestions(user_id, timestamp DESC);
CREATE INDEX idx_farm_tasks_user_id ON public.farm_tasks(user_id);
CREATE INDEX idx_alerts_user_timestamp ON public.alerts(user_id, timestamp DESC);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view and update own profile" ON public.user_profiles
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for sensor_readings (accessible to all authenticated users)
CREATE POLICY "Authenticated users can view sensor data" ON public.sensor_readings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can insert sensor data" ON public.sensor_readings
  FOR INSERT WITH CHECK (true);

-- RLS Policies for node_metadata (accessible to all authenticated users)
CREATE POLICY "Authenticated users can view nodes" ON public.node_metadata
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update nodes" ON public.node_metadata
  FOR ALL USING (auth.role() = 'authenticated');

-- RLS Policies for ai_suggestions
CREATE POLICY "Users can view own suggestions" ON public.ai_suggestions
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for farm_tasks
CREATE POLICY "Users can manage own tasks" ON public.farm_tasks
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for alerts
CREATE POLICY "Users can view own alerts" ON public.alerts
  FOR ALL USING (auth.uid() = user_id);

-- Function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_profiles updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample node metadata
INSERT INTO public.node_metadata (node_id, node_name, location) VALUES 
  ('air_node_01', 'Air Quality Monitor 1', 'Polyhouse Section A'),
  ('soil_node_01', 'Soil Monitor 1', 'Polyhouse Section B'),
  ('air_node_02', 'Air Quality Monitor 2', 'Polyhouse Section C');

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_suggestions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.farm_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;