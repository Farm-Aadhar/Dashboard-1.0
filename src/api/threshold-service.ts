import { supabase } from '../integrations/supabase/client';
import { Database, SensorType, PresetCategory, ChangeType } from '../../supabase';

// Types for threshold management
export interface ThresholdValue {
  id?: string;
  sensor_type: SensorType;
  low_value: number;
  high_value: number;
  unit: string;
  label: string;
  icon?: string | null;
  min_value?: number | null;
  max_value?: number | null;
  step_value?: number | null;
  source_preset_id?: string | null;
  source_type?: ChangeType;
  last_updated?: string | null;
  updated_by?: string | null;
}

export interface ThresholdPreset {
  id?: string;
  name: string;
  description?: string | null;
  category: PresetCategory;
  is_active?: boolean | null;
  is_system_default?: boolean | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  threshold_values?: ThresholdValue[];
}

export interface SensorReading {
  id: string;
  node_id: string;
  // Legacy fields
  temperature: number | null;
  humidity: number | null;
  air_quality_mq135: number | null;
  alcohol_mq3: number | null;
  smoke_mq2: number | null;
  // New air sensor fields
  air_temperature?: number | null;
  air_humidity?: number | null;
  air_air_quality_mq135?: number | null;
  air_alcohol_mq3?: number | null;
  air_smoke_mq2?: number | null;
  timestamp: string | null;
}

export interface CalibrationResult {
  sensor_type: SensorType;
  current_value: number;
  calculated_low: number;
  calculated_high: number;
  percentage_used: number;
}

// Legacy threshold interface for compatibility
export interface LegacySensorThreshold {
  low: number;
  high: number;
  unit: string;
  label: string;
  icon: string;
  min: number;
  max: number;
  step: number;
}

class ThresholdService {
  
  /**
   * Get all available threshold presets (mock for now)
   */
  async getThresholdPresets(): Promise<ThresholdPreset[]> {
    try {
      console.log('Fetching threshold presets from database...');
      const { data, error } = await supabase
        .from('threshold_presets')
        .select('*')
        .eq('is_active', true)
        .order('is_system_default', { ascending: false })
        .order('name');

      if (error) {
        console.error('Error fetching threshold presets:', error);
        throw error;
      }

      console.log('Found database presets:', data);
      return (data || []) as ThresholdPreset[];
    } catch (error) {
      console.error('Error loading threshold presets from database:', error);
      
      // Fallback to hardcoded presets if database fails
      return [
        {
          id: 'system-default',
          name: 'System Default',
          description: 'Default safe threshold values',
          category: 'system_default' as PresetCategory,
          is_active: true,
          is_system_default: true
        },
        {
          id: 'tomato-cultivation',
          name: 'Tomato Cultivation',
          description: 'Specialized for mushroom cultivation',
          category: 'crop' as PresetCategory,
          is_active: true,
          is_system_default: false
        },
        {
          id: 'capsicum-cultivation',
          name: 'Capsicum Cultivation',
          description: 'Optimized for colored capsicum/bell peppers',
          category: 'crop' as PresetCategory,
          is_active: true,
          is_system_default: false
        },
        {
          id: 'cucumber-cultivation',
          name: 'Cucumber Cultivation',
          description: 'Ideal for cucumber and vine crops',
          category: 'crop' as PresetCategory,
          is_active: true,
          is_system_default: false
        },
        {
          id: 'spinach-cultivation',
          name: 'Spinach Cultivation',
          description: 'Perfect for spinach and leafy greens',
          category: 'crop' as PresetCategory,
          is_active: true,
          is_system_default: false
        },
        {
          id: 'rose-cultivation',
          name: 'Rose Cultivation',
          description: 'Specialized for rose floriculture',
          category: 'crop' as PresetCategory,
          is_active: true,
          is_system_default: false
        },
        {
          id: 'gerbera-cultivation',
          name: 'Gerbera Cultivation',
          description: 'Optimized for gerbera flowers',
          category: 'crop' as PresetCategory,
          is_active: true,
          is_system_default: false
        },
        {
          id: 'carnation-cultivation',
          name: 'Carnation Cultivation',
          description: 'Ideal for carnation floriculture',
          category: 'crop' as PresetCategory,
          is_active: true,
          is_system_default: false
        },
        {
          id: 'strawberry-cultivation',
          name: 'Strawberry Cultivation',
          description: 'Perfect for strawberry fruit production',
          category: 'crop' as PresetCategory,
          is_active: true,
          is_system_default: false
        },
        {
          id: 'papaya-cultivation',
          name: 'Papaya Cultivation',
          description: 'Optimized for papaya fruit growing',
          category: 'crop' as PresetCategory,
          is_active: true,
          is_system_default: false
        }
      ];
    }
  }

  /**
   * Get current active thresholds from database with localStorage fallback
   */
  async getCurrentThresholds(): Promise<Record<string, LegacySensorThreshold>> {
    try {
      console.log('Loading current thresholds from database...');
      
      // Try to get current thresholds from database
      const { data, error } = await (supabase as any)
        .from('current_thresholds')
        .select('*');

      if (error) {
        console.warn('Error fetching current thresholds from database:', error);
      } else if (data && data.length > 0) {
        console.log('Found current thresholds in database:', data);
        
        // Convert database format to legacy format
        const thresholds: Record<string, LegacySensorThreshold> = {};
        
        for (const threshold of data as any[]) {
          // Map sensor types back to legacy keys
          const legacyKeyMap: Record<SensorType, string> = {
            'air_temperature': 'temperature',
            'air_humidity': 'humidity',
            'air_quality_mq135': 'air_quality_mq135',
            'alcohol_mq3': 'alcohol_mq3',
            'smoke_mq2': 'smoke_mq2'
          };
          
          const legacyKey = legacyKeyMap[threshold.sensor_type] || threshold.sensor_type;
          
          thresholds[legacyKey] = {
            low: Number(threshold.low_value),
            high: Number(threshold.high_value),
            unit: threshold.unit,
            label: threshold.label,
            icon: threshold.icon || 'thermometer',
            min: Number(threshold.min_value) || 0,
            max: Number(threshold.max_value) || 1000,
            step: Number(threshold.step_value) || 1
          };
        }
        
        console.log('Converted thresholds for legacy format:', thresholds);
        return thresholds;
      }
      
      // Fallback to localStorage
      console.log('No database thresholds found, checking localStorage...');
      const STORAGE_KEY = "sensor_thresholds_v1";
      const saved = localStorage.getItem(STORAGE_KEY);
      
      if (saved) {
        console.log('Found thresholds in localStorage');
        return JSON.parse(saved);
      }
      
      // Return default thresholds
      console.log('No thresholds found, using defaults');
      return {
        temperature: {
          low: 15,
          high: 35,
          unit: "°C",
          label: "Air Temperature",
          icon: "thermometer",
          min: 0,
          max: 50,
          step: 0.5
        },
        humidity: {
          low: 30,
          high: 80,
          unit: "%",
          label: "Air Humidity",
          icon: "droplets",
          min: 0,
          max: 100,
          step: 1
        },
        air_quality_mq135: {
          low: 50,
          high: 1000,
          unit: "ppm",
          label: "Air Quality (MQ135)",
          icon: "wind",
          min: 0,
          max: 5000,
          step: 50
        },
        alcohol_mq3: {
          low: 10,
          high: 500,
          unit: "ppm",
          label: "Alcohol (MQ3)",
          icon: "activity",
          min: 0,
          max: 3000,
          step: 50
        },
        smoke_mq2: {
          low: 20,
          high: 800,
          unit: "ppm",
          label: "Smoke (MQ2)",
          icon: "flame",
          min: 0,
          max: 4000,
          step: 50
        }
      };
    } catch (error) {
      console.error('Error loading current thresholds:', error);
      
      // Fallback to localStorage
      const STORAGE_KEY = "sensor_thresholds_v1";
      const saved = localStorage.getItem(STORAGE_KEY);
      
      if (saved) {
        return JSON.parse(saved);
      }
      
      // Return empty object if all fails
      return {};
    }
  }

  /**
   * Get preset threshold values
   */
  /**
   * Get preset threshold values from database
   */
  async getPresetThresholdValues(presetId: string): Promise<Record<string, LegacySensorThreshold> | null> {
    try {
      console.log('Fetching preset threshold values for:', presetId);
      
      const { data, error } = await (supabase as any)
        .from('threshold_presets')
        .select('*')
        .eq('id', presetId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching preset:', error);
        return null;
      }

      if (!data) {
        console.warn('No preset found for ID:', presetId);
        return null;
      }

      console.log('Found preset data:', data);

      // Convert database preset to legacy threshold format
      const presetThresholds: Record<string, LegacySensorThreshold> = {
        temperature: {
          low: parseFloat(data.ideal_daytime_temp_min || '15'),
          high: parseFloat(data.ideal_daytime_temp_max || '35'),
          unit: "°C",
          label: "Air Temperature",
          icon: "thermometer",
          min: 0,
          max: 50,
          step: 0.5
        },
        humidity: {
          low: parseFloat(data.ideal_humidity_min || '30'),
          high: parseFloat(data.ideal_humidity_max || '80'),
          unit: "%",
          label: "Air Humidity",
          icon: "droplets",
          min: 0,
          max: 100,
          step: 1
        },
        air_quality_mq135: {
          low: 0,
          high: 999999, // Will be calibrated based on current readings
          unit: "ppm",
          label: "Air Quality (MQ135)",
          icon: "wind",
          min: 0,
          max: 5000,
          step: 50
        },
        alcohol_mq3: {
          low: 0,
          high: 999999, // Will be calibrated based on current readings
          unit: "ppm",
          label: "Alcohol (MQ3)",
          icon: "activity",
          min: 0,
          max: 3000,
          step: 50
        },
        smoke_mq2: {
          low: 0,
          high: 999999, // Will be calibrated based on current readings
          unit: "ppm",
          label: "Smoke (MQ2)",
          icon: "flame",
          min: 0,
          max: 4000,
          step: 50
        }
      };

      return presetThresholds;
    } catch (error) {
      console.error('Error fetching preset threshold values:', error);
      return null;
    }
  }

  getPresetThresholds(presetId: string): Record<string, LegacySensorThreshold> {
    const presets: Record<string, Record<string, LegacySensorThreshold>> = {
      'system-default': {
        temperature: { low: 15, high: 35, unit: "°C", label: "Air Temperature", icon: "thermometer", min: 0, max: 50, step: 0.5 },
        humidity: { low: 30, high: 80, unit: "%", label: "Air Humidity", icon: "droplets", min: 0, max: 100, step: 1 },
        air_quality_mq135: { low: 0, high: 999999, unit: "ppm", label: "Air Quality (MQ135)", icon: "wind", min: 0, max: 5000, step: 50 },
        alcohol_mq3: { low: 0, high: 999999, unit: "ppm", label: "Alcohol (MQ3)", icon: "activity", min: 0, max: 3000, step: 50 },
        smoke_mq2: { low: 0, high: 999999, unit: "ppm", label: "Smoke (MQ2)", icon: "flame", min: 0, max: 4000, step: 50 }
      },
      'tomato-cultivation': {
        temperature: { low: 18, high: 26, unit: "°C", label: "Air Temperature", icon: "thermometer", min: 0, max: 50, step: 0.5 },
        humidity: { low: 65, high: 85, unit: "%", label: "Air Humidity", icon: "droplets", min: 0, max: 100, step: 1 },
        air_quality_mq135: { low: 0, high: 999999, unit: "ppm", label: "Air Quality (MQ135)", icon: "wind", min: 0, max: 5000, step: 50 },
        alcohol_mq3: { low: 0, high: 999999, unit: "ppm", label: "Alcohol (MQ3)", icon: "activity", min: 0, max: 3000, step: 50 },
        smoke_mq2: { low: 0, high: 999999, unit: "ppm", label: "Smoke (MQ2)", icon: "flame", min: 0, max: 4000, step: 50 }
      },
      'lettuce-cultivation': {
        temperature: { low: 15, high: 22, unit: "°C", label: "Air Temperature", icon: "thermometer", min: 0, max: 50, step: 0.5 },
        humidity: { low: 50, high: 70, unit: "%", label: "Air Humidity", icon: "droplets", min: 0, max: 100, step: 1 },
        air_quality_mq135: { low: 0, high: 999999, unit: "ppm", label: "Air Quality (MQ135)", icon: "wind", min: 0, max: 5000, step: 50 },
        alcohol_mq3: { low: 0, high: 999999, unit: "ppm", label: "Alcohol (MQ3)", icon: "activity", min: 0, max: 3000, step: 50 },
        smoke_mq2: { low: 0, high: 999999, unit: "ppm", label: "Smoke (MQ2)", icon: "flame", min: 0, max: 4000, step: 50 }
      },
      'mushroom-cultivation': {
        temperature: { low: 12, high: 18, unit: "°C", label: "Air Temperature", icon: "thermometer", min: 0, max: 50, step: 0.5 },
        humidity: { low: 80, high: 95, unit: "%", label: "Air Humidity", icon: "droplets", min: 0, max: 100, step: 1 },
        air_quality_mq135: { low: 0, high: 999999, unit: "ppm", label: "Air Quality (MQ135)", icon: "wind", min: 0, max: 5000, step: 50 },
        alcohol_mq3: { low: 0, high: 999999, unit: "ppm", label: "Alcohol (MQ3)", icon: "activity", min: 0, max: 3000, step: 50 },
        smoke_mq2: { low: 0, high: 999999, unit: "ppm", label: "Smoke (MQ2)", icon: "flame", min: 0, max: 4000, step: 50 }
      },
      'capsicum-cultivation': {
        temperature: { low: 20, high: 28, unit: "°C", label: "Air Temperature", icon: "thermometer", min: 0, max: 50, step: 0.5 },
        humidity: { low: 60, high: 80, unit: "%", label: "Air Humidity", icon: "droplets", min: 0, max: 100, step: 1 },
        air_quality_mq135: { low: 0, high: 999999, unit: "ppm", label: "Air Quality (MQ135)", icon: "wind", min: 0, max: 5000, step: 50 },
        alcohol_mq3: { low: 0, high: 999999, unit: "ppm", label: "Alcohol (MQ3)", icon: "activity", min: 0, max: 3000, step: 50 },
        smoke_mq2: { low: 0, high: 999999, unit: "ppm", label: "Smoke (MQ2)", icon: "flame", min: 0, max: 4000, step: 50 }
      },
      'cucumber-cultivation': {
        temperature: { low: 22, high: 30, unit: "°C", label: "Air Temperature", icon: "thermometer", min: 0, max: 50, step: 0.5 },
        humidity: { low: 70, high: 90, unit: "%", label: "Air Humidity", icon: "droplets", min: 0, max: 100, step: 1 },
        air_quality_mq135: { low: 0, high: 999999, unit: "ppm", label: "Air Quality (MQ135)", icon: "wind", min: 0, max: 5000, step: 50 },
        alcohol_mq3: { low: 0, high: 999999, unit: "ppm", label: "Alcohol (MQ3)", icon: "activity", min: 0, max: 3000, step: 50 },
        smoke_mq2: { low: 0, high: 999999, unit: "ppm", label: "Smoke (MQ2)", icon: "flame", min: 0, max: 4000, step: 50 }
      },
      'spinach-cultivation': {
        temperature: { low: 10, high: 20, unit: "°C", label: "Air Temperature", icon: "thermometer", min: 0, max: 50, step: 0.5 },
        humidity: { low: 45, high: 65, unit: "%", label: "Air Humidity", icon: "droplets", min: 0, max: 100, step: 1 },
        air_quality_mq135: { low: 0, high: 999999, unit: "ppm", label: "Air Quality (MQ135)", icon: "wind", min: 0, max: 5000, step: 50 },
        alcohol_mq3: { low: 0, high: 999999, unit: "ppm", label: "Alcohol (MQ3)", icon: "activity", min: 0, max: 3000, step: 50 },
        smoke_mq2: { low: 0, high: 999999, unit: "ppm", label: "Smoke (MQ2)", icon: "flame", min: 0, max: 4000, step: 50 }
      },
      'rose-cultivation': {
        temperature: { low: 16, high: 24, unit: "°C", label: "Air Temperature", icon: "thermometer", min: 0, max: 50, step: 0.5 },
        humidity: { low: 60, high: 75, unit: "%", label: "Air Humidity", icon: "droplets", min: 0, max: 100, step: 1 },
        air_quality_mq135: { low: 0, high: 999999, unit: "ppm", label: "Air Quality (MQ135)", icon: "wind", min: 0, max: 5000, step: 50 },
        alcohol_mq3: { low: 0, high: 999999, unit: "ppm", label: "Alcohol (MQ3)", icon: "activity", min: 0, max: 3000, step: 50 },
        smoke_mq2: { low: 0, high: 999999, unit: "ppm", label: "Smoke (MQ2)", icon: "flame", min: 0, max: 4000, step: 50 }
      },
      'gerbera-cultivation': {
        temperature: { low: 18, high: 25, unit: "°C", label: "Air Temperature", icon: "thermometer", min: 0, max: 50, step: 0.5 },
        humidity: { low: 65, high: 80, unit: "%", label: "Air Humidity", icon: "droplets", min: 0, max: 100, step: 1 },
        air_quality_mq135: { low: 0, high: 999999, unit: "ppm", label: "Air Quality (MQ135)", icon: "wind", min: 0, max: 5000, step: 50 },
        alcohol_mq3: { low: 0, high: 999999, unit: "ppm", label: "Alcohol (MQ3)", icon: "activity", min: 0, max: 3000, step: 50 },
        smoke_mq2: { low: 0, high: 999999, unit: "ppm", label: "Smoke (MQ2)", icon: "flame", min: 0, max: 4000, step: 50 }
      },
      'carnation-cultivation': {
        temperature: { low: 14, high: 22, unit: "°C", label: "Air Temperature", icon: "thermometer", min: 0, max: 50, step: 0.5 },
        humidity: { low: 55, high: 75, unit: "%", label: "Air Humidity", icon: "droplets", min: 0, max: 100, step: 1 },
        air_quality_mq135: { low: 0, high: 999999, unit: "ppm", label: "Air Quality (MQ135)", icon: "wind", min: 0, max: 5000, step: 50 },
        alcohol_mq3: { low: 0, high: 999999, unit: "ppm", label: "Alcohol (MQ3)", icon: "activity", min: 0, max: 3000, step: 50 },
        smoke_mq2: { low: 0, high: 999999, unit: "ppm", label: "Smoke (MQ2)", icon: "flame", min: 0, max: 4000, step: 50 }
      },
      'strawberry-cultivation': {
        temperature: { low: 15, high: 25, unit: "°C", label: "Air Temperature", icon: "thermometer", min: 0, max: 50, step: 0.5 },
        humidity: { low: 60, high: 80, unit: "%", label: "Air Humidity", icon: "droplets", min: 0, max: 100, step: 1 },
        air_quality_mq135: { low: 0, high: 999999, unit: "ppm", label: "Air Quality (MQ135)", icon: "wind", min: 0, max: 5000, step: 50 },
        alcohol_mq3: { low: 0, high: 999999, unit: "ppm", label: "Alcohol (MQ3)", icon: "activity", min: 0, max: 3000, step: 50 },
        smoke_mq2: { low: 0, high: 999999, unit: "ppm", label: "Smoke (MQ2)", icon: "flame", min: 0, max: 4000, step: 50 }
      },
      'papaya-cultivation': {
        temperature: { low: 25, high: 35, unit: "°C", label: "Air Temperature", icon: "thermometer", min: 0, max: 50, step: 0.5 },
        humidity: { low: 70, high: 90, unit: "%", label: "Air Humidity", icon: "droplets", min: 0, max: 100, step: 1 },
        air_quality_mq135: { low: 0, high: 999999, unit: "ppm", label: "Air Quality (MQ135)", icon: "wind", min: 0, max: 5000, step: 50 },
        alcohol_mq3: { low: 0, high: 999999, unit: "ppm", label: "Alcohol (MQ3)", icon: "activity", min: 0, max: 3000, step: 50 },
        smoke_mq2: { low: 0, high: 999999, unit: "ppm", label: "Smoke (MQ2)", icon: "flame", min: 0, max: 4000, step: 50 }
      }
    };

    return presets[presetId] || presets['system-default'];
  }

  /**
   * Apply a preset to current thresholds - Simple approach
   */
  async applyPreset(presetId: string): Promise<void> {
    try {
      console.log('Applying preset to current_thresholds table:', presetId);
      
      // 1. Get preset data from database
      const { data: preset, error: presetError } = await (supabase as any)
        .from('threshold_presets')
        .select('*')
        .eq('id', presetId)
        .eq('is_active', true)
        .single();

      if (presetError || !preset) {
        throw new Error(`Preset not found: ${presetId}`);
      }

      console.log('Found preset:', preset);

      // 2. Get last sensor reading for missing values
      const lastReading = await this.getLatestSensorReadings();
      console.log('Last sensor reading:', lastReading);

      // 3. Define what values to update in current_thresholds
      const updates = [];

      // Temperature (from preset)
      if (preset.ideal_daytime_temp_min && preset.ideal_daytime_temp_max) {
        updates.push({
          sensor_type: 'air_temperature' as SensorType,
          low_value: parseFloat(preset.ideal_daytime_temp_min),
          high_value: parseFloat(preset.ideal_daytime_temp_max),
          unit: '°C',
          label: 'Air Temperature',
          icon: 'thermometer',
          min_value: 0,
          max_value: 50,
          step_value: 0.5
        });
      }

      // Humidity (from preset) 
      if (preset.ideal_humidity_min && preset.ideal_humidity_max) {
        updates.push({
          sensor_type: 'air_humidity' as SensorType,
          low_value: parseFloat(preset.ideal_humidity_min),
          high_value: parseFloat(preset.ideal_humidity_max),
          unit: '%',
          label: 'Air Humidity',
          icon: 'droplets',
          min_value: 0,
          max_value: 100,
          step_value: 1
        });
      }

      // Air Quality (±3% of last reading)
      if (lastReading?.air_quality_mq135) {
        const reading = lastReading.air_quality_mq135;
        const margin = reading * 0.03; // 3%
        updates.push({
          sensor_type: 'air_quality_mq135' as SensorType,
          low_value: Math.max(0, reading - margin),
          high_value: reading + margin,
          unit: 'ppm',
          label: 'Air Quality (MQ135)',
          icon: 'wind',
          min_value: 0,
          max_value: 5000,
          step_value: 50
        });
      }

      // Alcohol (±3% of last reading)
      if (lastReading?.alcohol_mq3) {
        const reading = lastReading.alcohol_mq3;
        const margin = reading * 0.03; // 3%
        updates.push({
          sensor_type: 'alcohol_mq3' as SensorType,
          low_value: Math.max(0, reading - margin),
          high_value: reading + margin,
          unit: 'ppm',
          label: 'Alcohol (MQ3)',
          icon: 'activity',
          min_value: 0,
          max_value: 3000,
          step_value: 50
        });
      }

      // Smoke (±3% of last reading)
      if (lastReading?.smoke_mq2) {
        const reading = lastReading.smoke_mq2;
        const margin = reading * 0.03; // 3%
        updates.push({
          sensor_type: 'smoke_mq2' as SensorType,
          low_value: Math.max(0, reading - margin),
          high_value: reading + margin,
          unit: 'ppm',
          label: 'Smoke (MQ2)',
          icon: 'flame',
          min_value: 0,
          max_value: 4000,
          step_value: 50
        });
      }

      console.log('Updating current_thresholds with:', updates);

      // 4. Update current_thresholds table for each sensor
      for (const update of updates) {
        const { error: updateError } = await (supabase as any)
          .from('current_thresholds')
          .upsert({
            sensor_type: update.sensor_type,
            low_value: update.low_value,
            high_value: update.high_value,
            unit: update.unit,
            label: update.label,
            icon: update.icon,
            min_value: update.min_value,
            max_value: update.max_value,
            step_value: update.step_value,
            source_type: 'preset'
          }, {
            onConflict: 'sensor_type'
          });

        if (updateError) {
          console.error(`Error updating ${update.sensor_type}:`, updateError);
          throw updateError;
        }
      }

      console.log(`✅ Preset "${preset.name}" applied successfully to current_thresholds!`);
      
    } catch (error) {
      console.error('Error applying preset:', error);
      throw error;
    }
  }

  /**
   * Update thresholds manually
   */
  async updateThresholds(thresholds: Record<string, LegacySensorThreshold>): Promise<void> {
    try {
      console.log('Updating thresholds to database:', thresholds);
      
      // Update each sensor threshold individually using UPSERT
      for (const [key, threshold] of Object.entries(thresholds)) {
        // Map legacy keys to proper sensor types
        const sensorTypeMap: Record<string, SensorType> = {
          'temperature': 'air_temperature',
          'humidity': 'air_humidity',
          'air_quality_mq135': 'air_quality_mq135',
          'alcohol_mq3': 'alcohol_mq3',
          'smoke_mq2': 'smoke_mq2'
        };
        
        const sensorType = sensorTypeMap[key] || key as SensorType;
        
        const thresholdData = {
          sensor_type: sensorType,
          low_value: threshold.low,
          high_value: threshold.high,
          unit: threshold.unit,
          label: threshold.label,
          icon: threshold.icon,
          min_value: threshold.min,
          max_value: threshold.max,
          step_value: threshold.step,
          source_type: 'manual'
        };

        console.log(`Upserting threshold for ${sensorType}:`, thresholdData);

        // Use upsert to insert or update
        const { error } = await (supabase as any)
          .from('current_thresholds')
          .upsert(thresholdData, {
            onConflict: 'sensor_type'
          });

        if (error) {
          console.error(`Error upserting threshold for ${sensorType}:`, error);
          throw error;
        }
      }

      // Also save to localStorage as backup
      const STORAGE_KEY = "sensor_thresholds_v1";
      localStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds));
      
      console.log('Successfully updated thresholds in database and localStorage');
    } catch (error) {
      console.error('Error updating thresholds:', error);
      // Fallback to localStorage only
      const STORAGE_KEY = "sensor_thresholds_v1";
      localStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds));
      throw error;
    }
  }

  /**
   * Get latest sensor readings for calibration
   */
  async getLatestSensorReadings(): Promise<SensorReading | null> {
    try {
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error fetching latest sensor readings:', error);
      throw error;
    }
  }

  /**
   * Calibrate thresholds based on latest sensor readings
   */
  async calibrateThresholds(
    percentageLow: number = 3, 
    percentageHigh: number = 5
  ): Promise<CalibrationResult[]> {
    try {
      const latestReading = await this.getLatestSensorReadings();
      
      console.log('Calibration - Latest reading:', latestReading);
      
      if (!latestReading) {
        throw new Error('No sensor readings available for calibration');
      }

      const results: CalibrationResult[] = [];
      const currentThresholds = await this.getCurrentThresholds();
      const newThresholds = { ...currentThresholds };

      console.log('Calibration - Current thresholds:', currentThresholds);

      // Define sensor mappings with fallback to legacy fields
      const sensorMappings: { type: SensorType; value: number | null; key: string }[] = [
        { 
          type: 'air_temperature', 
          value: latestReading.air_temperature ?? latestReading.temperature ?? null, 
          key: 'temperature' 
        },
        { 
          type: 'air_humidity', 
          value: latestReading.air_humidity ?? latestReading.humidity ?? null, 
          key: 'humidity' 
        },
        { 
          type: 'air_quality_mq135', 
          value: latestReading.air_air_quality_mq135 ?? latestReading.air_quality_mq135 ?? null, 
          key: 'air_quality_mq135' 
        },
        { 
          type: 'alcohol_mq3', 
          value: latestReading.air_alcohol_mq3 ?? latestReading.alcohol_mq3 ?? null, 
          key: 'alcohol_mq3' 
        },
        { 
          type: 'smoke_mq2', 
          value: latestReading.air_smoke_mq2 ?? latestReading.smoke_mq2 ?? null, 
          key: 'smoke_mq2' 
        }
      ];

      for (const sensor of sensorMappings) {
        console.log(`Calibration - Processing sensor ${sensor.type}: value=${sensor.value}, key=${sensor.key}`);
        
        if (sensor.value !== null && sensor.value !== undefined && !isNaN(sensor.value) && newThresholds[sensor.key]) {
          const currentValue = sensor.value;
          const threshold = newThresholds[sensor.key];
          
          console.log(`Calibration - Threshold for ${sensor.key}:`, threshold);
          
          const lowMargin = (currentValue * percentageLow) / 100;
          const highMargin = (currentValue * percentageHigh) / 100;
          
          const calculatedLow = Math.max(threshold.min, currentValue - lowMargin);
          const calculatedHigh = Math.min(threshold.max, currentValue + highMargin);

          console.log(`Calibration - ${sensor.type}: current=${currentValue}, low=${calculatedLow}, high=${calculatedHigh}`);

          results.push({
            sensor_type: sensor.type,
            current_value: currentValue,
            calculated_low: calculatedLow,
            calculated_high: calculatedHigh,
            percentage_used: Math.max(percentageLow, percentageHigh)
          });

          // Update the threshold
          newThresholds[sensor.key] = {
            ...threshold,
            low: calculatedLow,
            high: calculatedHigh
          };
        } else {
          console.log(`Calibration - Skipping ${sensor.type}: value=${sensor.value}, hasThreshold=${!!newThresholds[sensor.key]}`);
        }
      }

      // Apply the calibrated thresholds
      if (results.length > 0) {
        await this.updateThresholds(newThresholds);
      }

      return results;
    } catch (error) {
      console.error('Error calibrating thresholds:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const thresholdService = new ThresholdService();
export default thresholdService;