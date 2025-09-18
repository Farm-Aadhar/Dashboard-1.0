/**
 * Script to set up default threshold presets in the database
 * Run this after the database migration to populate initial presets
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

const defaultPresets = [
  {
    id: 'system-default',
    name: 'System Default',
    description: 'Default safe threshold values',
    category: 'system_default',
    is_active: true,
    is_system_default: true,
    thresholds: [
      { sensor_type: 'air_temperature', low_value: 15, high_value: 35, unit: '°C', label: 'Air Temperature', icon: 'thermometer', min_value: 0, max_value: 50, step_value: 0.5 },
      { sensor_type: 'air_humidity', low_value: 30, high_value: 80, unit: '%', label: 'Air Humidity', icon: 'droplets', min_value: 0, max_value: 100, step_value: 1 },
      // Gas sensors use relative values - will be set dynamically based on current readings
      { sensor_type: 'air_quality_mq135', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Air Quality (MQ135)', icon: 'wind', min_value: 0, max_value: 5000, step_value: 50 },
      { sensor_type: 'alcohol_mq3', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Alcohol (MQ3)', icon: 'activity', min_value: 0, max_value: 3000, step_value: 50 },
      { sensor_type: 'smoke_mq2', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Smoke (MQ2)', icon: 'flame', min_value: 0, max_value: 4000, step_value: 50 }
    ]
  },
  {
    id: 'tomato-cultivation',
    name: 'Tomato Cultivation',
    description: 'Optimized for tomato cultivation',
    category: 'crop',
    is_active: true,
    is_system_default: false,
    thresholds: [
      { sensor_type: 'air_temperature', low_value: 18, high_value: 26, unit: '°C', label: 'Air Temperature', icon: 'thermometer', min_value: 0, max_value: 50, step_value: 0.5 },
      { sensor_type: 'air_humidity', low_value: 65, high_value: 85, unit: '%', label: 'Air Humidity', icon: 'droplets', min_value: 0, max_value: 100, step_value: 1 },
      { sensor_type: 'air_quality_mq135', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Air Quality (MQ135)', icon: 'wind', min_value: 0, max_value: 5000, step_value: 50 },
      { sensor_type: 'alcohol_mq3', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Alcohol (MQ3)', icon: 'activity', min_value: 0, max_value: 3000, step_value: 50 },
      { sensor_type: 'smoke_mq2', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Smoke (MQ2)', icon: 'flame', min_value: 0, max_value: 4000, step_value: 50 }
    ]
  },
  {
    id: 'lettuce-cultivation',
    name: 'Lettuce Cultivation',
    description: 'Ideal for lettuce and leafy greens',
    category: 'crop',
    is_active: true,
    is_system_default: false,
    thresholds: [
      { sensor_type: 'air_temperature', low_value: 15, high_value: 22, unit: '°C', label: 'Air Temperature', icon: 'thermometer', min_value: 0, max_value: 50, step_value: 0.5 },
      { sensor_type: 'air_humidity', low_value: 50, high_value: 70, unit: '%', label: 'Air Humidity', icon: 'droplets', min_value: 0, max_value: 100, step_value: 1 },
      { sensor_type: 'air_quality_mq135', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Air Quality (MQ135)', icon: 'wind', min_value: 0, max_value: 5000, step_value: 50 },
      { sensor_type: 'alcohol_mq3', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Alcohol (MQ3)', icon: 'activity', min_value: 0, max_value: 3000, step_value: 50 },
      { sensor_type: 'smoke_mq2', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Smoke (MQ2)', icon: 'flame', min_value: 0, max_value: 4000, step_value: 50 }
    ]
  },
  {
    id: 'mushroom-cultivation',
    name: 'Mushroom Cultivation',
    description: 'Specialized for mushroom cultivation',
    category: 'crop',
    is_active: true,
    is_system_default: false,
    thresholds: [
      { sensor_type: 'air_temperature', low_value: 12, high_value: 18, unit: '°C', label: 'Air Temperature', icon: 'thermometer', min_value: 0, max_value: 50, step_value: 0.5 },
      { sensor_type: 'air_humidity', low_value: 80, high_value: 95, unit: '%', label: 'Air Humidity', icon: 'droplets', min_value: 0, max_value: 100, step_value: 1 },
      { sensor_type: 'air_quality_mq135', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Air Quality (MQ135)', icon: 'wind', min_value: 0, max_value: 5000, step_value: 50 },
      { sensor_type: 'alcohol_mq3', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Alcohol (MQ3)', icon: 'activity', min_value: 0, max_value: 3000, step_value: 50 },
      { sensor_type: 'smoke_mq2', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Smoke (MQ2)', icon: 'flame', min_value: 0, max_value: 4000, step_value: 50 }
    ]
  },
  {
    id: 'capsicum-cultivation',
    name: 'Capsicum Cultivation',
    description: 'Optimized for colored capsicum/bell peppers',
    category: 'crop',
    is_active: true,
    is_system_default: false,
    thresholds: [
      { sensor_type: 'air_temperature', low_value: 20, high_value: 28, unit: '°C', label: 'Air Temperature', icon: 'thermometer', min_value: 0, max_value: 50, step_value: 0.5 },
      { sensor_type: 'air_humidity', low_value: 60, high_value: 80, unit: '%', label: 'Air Humidity', icon: 'droplets', min_value: 0, max_value: 100, step_value: 1 },
      { sensor_type: 'air_quality_mq135', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Air Quality (MQ135)', icon: 'wind', min_value: 0, max_value: 5000, step_value: 50 },
      { sensor_type: 'alcohol_mq3', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Alcohol (MQ3)', icon: 'activity', min_value: 0, max_value: 3000, step_value: 50 },
      { sensor_type: 'smoke_mq2', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Smoke (MQ2)', icon: 'flame', min_value: 0, max_value: 4000, step_value: 50 }
    ]
  },
  {
    id: 'cucumber-cultivation',
    name: 'Cucumber Cultivation',
    description: 'Ideal for cucumber and vine crops',
    category: 'crop',
    is_active: true,
    is_system_default: false,
    thresholds: [
      { sensor_type: 'air_temperature', low_value: 22, high_value: 30, unit: '°C', label: 'Air Temperature', icon: 'thermometer', min_value: 0, max_value: 50, step_value: 0.5 },
      { sensor_type: 'air_humidity', low_value: 70, high_value: 90, unit: '%', label: 'Air Humidity', icon: 'droplets', min_value: 0, max_value: 100, step_value: 1 },
      { sensor_type: 'air_quality_mq135', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Air Quality (MQ135)', icon: 'wind', min_value: 0, max_value: 5000, step_value: 50 },
      { sensor_type: 'alcohol_mq3', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Alcohol (MQ3)', icon: 'activity', min_value: 0, max_value: 3000, step_value: 50 },
      { sensor_type: 'smoke_mq2', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Smoke (MQ2)', icon: 'flame', min_value: 0, max_value: 4000, step_value: 50 }
    ]
  },
  {
    id: 'spinach-cultivation',
    name: 'Spinach Cultivation',
    description: 'Perfect for spinach and leafy greens',
    category: 'crop',
    is_active: true,
    is_system_default: false,
    thresholds: [
      { sensor_type: 'air_temperature', low_value: 10, high_value: 20, unit: '°C', label: 'Air Temperature', icon: 'thermometer', min_value: 0, max_value: 50, step_value: 0.5 },
      { sensor_type: 'air_humidity', low_value: 45, high_value: 65, unit: '%', label: 'Air Humidity', icon: 'droplets', min_value: 0, max_value: 100, step_value: 1 },
      { sensor_type: 'air_quality_mq135', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Air Quality (MQ135)', icon: 'wind', min_value: 0, max_value: 5000, step_value: 50 },
      { sensor_type: 'alcohol_mq3', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Alcohol (MQ3)', icon: 'activity', min_value: 0, max_value: 3000, step_value: 50 },
      { sensor_type: 'smoke_mq2', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Smoke (MQ2)', icon: 'flame', min_value: 0, max_value: 4000, step_value: 50 }
    ]
  },
  {
    id: 'rose-cultivation',
    name: 'Rose Cultivation',
    description: 'Specialized for rose floriculture',
    category: 'crop',
    is_active: true,
    is_system_default: false,
    thresholds: [
      { sensor_type: 'air_temperature', low_value: 16, high_value: 24, unit: '°C', label: 'Air Temperature', icon: 'thermometer', min_value: 0, max_value: 50, step_value: 0.5 },
      { sensor_type: 'air_humidity', low_value: 60, high_value: 75, unit: '%', label: 'Air Humidity', icon: 'droplets', min_value: 0, max_value: 100, step_value: 1 },
      { sensor_type: 'air_quality_mq135', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Air Quality (MQ135)', icon: 'wind', min_value: 0, max_value: 5000, step_value: 50 },
      { sensor_type: 'alcohol_mq3', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Alcohol (MQ3)', icon: 'activity', min_value: 0, max_value: 3000, step_value: 50 },
      { sensor_type: 'smoke_mq2', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Smoke (MQ2)', icon: 'flame', min_value: 0, max_value: 4000, step_value: 50 }
    ]
  },
  {
    id: 'gerbera-cultivation',
    name: 'Gerbera Cultivation',
    description: 'Optimized for gerbera flowers',
    category: 'crop',
    is_active: true,
    is_system_default: false,
    thresholds: [
      { sensor_type: 'air_temperature', low_value: 18, high_value: 25, unit: '°C', label: 'Air Temperature', icon: 'thermometer', min_value: 0, max_value: 50, step_value: 0.5 },
      { sensor_type: 'air_humidity', low_value: 65, high_value: 80, unit: '%', label: 'Air Humidity', icon: 'droplets', min_value: 0, max_value: 100, step_value: 1 },
      { sensor_type: 'air_quality_mq135', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Air Quality (MQ135)', icon: 'wind', min_value: 0, max_value: 5000, step_value: 50 },
      { sensor_type: 'alcohol_mq3', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Alcohol (MQ3)', icon: 'activity', min_value: 0, max_value: 3000, step_value: 50 },
      { sensor_type: 'smoke_mq2', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Smoke (MQ2)', icon: 'flame', min_value: 0, max_value: 4000, step_value: 50 }
    ]
  },
  {
    id: 'carnation-cultivation',
    name: 'Carnation Cultivation',
    description: 'Ideal for carnation floriculture',
    category: 'crop',
    is_active: true,
    is_system_default: false,
    thresholds: [
      { sensor_type: 'air_temperature', low_value: 14, high_value: 22, unit: '°C', label: 'Air Temperature', icon: 'thermometer', min_value: 0, max_value: 50, step_value: 0.5 },
      { sensor_type: 'air_humidity', low_value: 55, high_value: 75, unit: '%', label: 'Air Humidity', icon: 'droplets', min_value: 0, max_value: 100, step_value: 1 },
      { sensor_type: 'air_quality_mq135', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Air Quality (MQ135)', icon: 'wind', min_value: 0, max_value: 5000, step_value: 50 },
      { sensor_type: 'alcohol_mq3', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Alcohol (MQ3)', icon: 'activity', min_value: 0, max_value: 3000, step_value: 50 },
      { sensor_type: 'smoke_mq2', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Smoke (MQ2)', icon: 'flame', min_value: 0, max_value: 4000, step_value: 50 }
    ]
  },
  {
    id: 'strawberry-cultivation',
    name: 'Strawberry Cultivation',
    description: 'Perfect for strawberry fruit production',
    category: 'crop',
    is_active: true,
    is_system_default: false,
    thresholds: [
      { sensor_type: 'air_temperature', low_value: 15, high_value: 25, unit: '°C', label: 'Air Temperature', icon: 'thermometer', min_value: 0, max_value: 50, step_value: 0.5 },
      { sensor_type: 'air_humidity', low_value: 60, high_value: 80, unit: '%', label: 'Air Humidity', icon: 'droplets', min_value: 0, max_value: 100, step_value: 1 },
      { sensor_type: 'air_quality_mq135', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Air Quality (MQ135)', icon: 'wind', min_value: 0, max_value: 5000, step_value: 50 },
      { sensor_type: 'alcohol_mq3', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Alcohol (MQ3)', icon: 'activity', min_value: 0, max_value: 3000, step_value: 50 },
      { sensor_type: 'smoke_mq2', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Smoke (MQ2)', icon: 'flame', min_value: 0, max_value: 4000, step_value: 50 }
    ]
  },
  {
    id: 'papaya-cultivation',
    name: 'Papaya Cultivation',
    description: 'Optimized for papaya fruit growing',
    category: 'crop',
    is_active: true,
    is_system_default: false,
    thresholds: [
      { sensor_type: 'air_temperature', low_value: 25, high_value: 35, unit: '°C', label: 'Air Temperature', icon: 'thermometer', min_value: 0, max_value: 50, step_value: 0.5 },
      { sensor_type: 'air_humidity', low_value: 70, high_value: 90, unit: '%', label: 'Air Humidity', icon: 'droplets', min_value: 0, max_value: 100, step_value: 1 },
      { sensor_type: 'air_quality_mq135', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Air Quality (MQ135)', icon: 'wind', min_value: 0, max_value: 5000, step_value: 50 },
      { sensor_type: 'alcohol_mq3', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Alcohol (MQ3)', icon: 'activity', min_value: 0, max_value: 3000, step_value: 50 },
      { sensor_type: 'smoke_mq2', low_value: 0, high_value: 999999, unit: 'ppm', label: 'Smoke (MQ2)', icon: 'flame', min_value: 0, max_value: 4000, step_value: 50 }
    ]
  }
];

async function setupThresholdPresets() {
  try {
    console.log('Setting up threshold presets...');

    for (const preset of defaultPresets) {
      // Insert the preset
      const { data: presetData, error: presetError } = await supabase
        .from('threshold_presets')
        .upsert({
          id: preset.id,
          name: preset.name,
          description: preset.description,
          category: preset.category,
          is_active: preset.is_active,
          is_system_default: preset.is_system_default,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })
        .select('id')
        .single();

      if (presetError) {
        console.error('Error inserting preset:', preset.name, presetError);
        continue;
      }

      console.log(`✅ Preset "${preset.name}" created/updated`);

      // Insert threshold values for the preset
      const thresholdValues = preset.thresholds.map(threshold => ({
        ...threshold,
        preset_id: presetData.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: thresholdError } = await supabase
        .from('threshold_values')
        .upsert(thresholdValues, { onConflict: 'preset_id,sensor_type' });

      if (thresholdError) {
        console.error('Error inserting threshold values for preset:', preset.name, thresholdError);
      } else {
        console.log(`✅ Threshold values for "${preset.name}" created/updated`);
      }
    }

    // Set up default current thresholds (system default preset as default)
    const defaultCurrentThresholds = defaultPresets[0].thresholds.map(threshold => ({
      sensor_type: threshold.sensor_type,
      low_value: threshold.low_value,
      high_value: threshold.high_value,
      unit: threshold.unit,
      label: threshold.label,
      icon: threshold.icon,
      min_value: threshold.min_value,
      max_value: threshold.max_value,
      step_value: threshold.step_value,
      source_preset_id: defaultPresets[0].id,
      source_type: 'preset_change',
      last_updated: new Date().toISOString()
    }));

    const { error: currentError } = await supabase
      .from('current_thresholds')
      .upsert(defaultCurrentThresholds, { onConflict: 'sensor_type' });

    if (currentError) {
      console.error('Error setting up current thresholds:', currentError);
    } else {
      console.log('✅ Default current thresholds set up');
    }

    console.log('🎉 Threshold preset setup complete!');
  } catch (error) {
    console.error('Error setting up threshold presets:', error);
  }
}

// Run the setup
setupThresholdPresets();