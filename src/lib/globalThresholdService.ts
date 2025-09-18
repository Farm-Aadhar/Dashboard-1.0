// Global Threshold Management Service
import { SensorThreshold } from '@/components/settings/ThresholdSettings';

export interface ThresholdPreset {
  id: string;
  name: string;
  description: string;
  thresholds: Record<string, SensorThreshold>;
  category: 'crop' | 'custom' | 'calibrated';
}

export interface ThresholdChangeLog {
  id: string;
  userId: string;
  timestamp: string;
  changeType: 'manual' | 'preset' | 'calibration';
  previousValues: Record<string, SensorThreshold>;
  newValues: Record<string, SensorThreshold>;
  presetUsed?: string;
  notes?: string;
}

// Crop-specific threshold presets
export const CROP_PRESETS: ThresholdPreset[] = [
  {
    id: 'tomato',
    name: 'Tomato',
    description: 'Optimized for tomato cultivation',
    category: 'crop',
    thresholds: {
      air_temperature: { low: 18, high: 28, unit: '°C', label: 'Air Temperature', icon: 'thermometer', min: 0, max: 50, step: 0.5 },
      air_humidity: { low: 60, high: 85, unit: '%', label: 'Air Humidity', icon: 'droplets', min: 0, max: 100, step: 1 },
      soil_temperature: { low: 16, high: 25, unit: '°C', label: 'Soil Temperature', icon: 'thermometer', min: 0, max: 50, step: 0.5 },
      soil_humidity: { low: 70, high: 90, unit: '%', label: 'Soil Humidity', icon: 'droplets', min: 0, max: 100, step: 1 },
      soil_moisture: { low: 65, high: 85, unit: '%', label: 'Soil Moisture', icon: 'droplets', min: 0, max: 100, step: 1 },
      air_quality_mq135: { low: 50, high: 800, unit: 'ppm', label: 'Air Quality (MQ135)', icon: 'wind', min: 0, max: 2000, step: 10 },
      alcohol_mq3: { low: 50, high: 400, unit: 'ppm', label: 'Alcohol (MQ3)', icon: 'flame', min: 0, max: 1000, step: 10 },
      smoke_mq2: { low: 100, high: 500, unit: 'ppm', label: 'Smoke (MQ2)', icon: 'flame', min: 0, max: 2000, step: 10 },
    }
  },
  {
    id: 'lettuce',
    name: 'Lettuce',
    description: 'Ideal for lettuce and leafy greens',
    category: 'crop',
    thresholds: {
      air_temperature: { low: 15, high: 24, unit: '°C', label: 'Air Temperature', icon: 'thermometer', min: 0, max: 50, step: 0.5 },
      air_humidity: { low: 65, high: 85, unit: '%', label: 'Air Humidity', icon: 'droplets', min: 0, max: 100, step: 1 },
      soil_temperature: { low: 14, high: 22, unit: '°C', label: 'Soil Temperature', icon: 'thermometer', min: 0, max: 50, step: 0.5 },
      soil_humidity: { low: 75, high: 90, unit: '%', label: 'Soil Humidity', icon: 'droplets', min: 0, max: 100, step: 1 },
      soil_moisture: { low: 70, high: 90, unit: '%', label: 'Soil Moisture', icon: 'droplets', min: 0, max: 100, step: 1 },
      air_quality_mq135: { low: 50, high: 700, unit: 'ppm', label: 'Air Quality (MQ135)', icon: 'wind', min: 0, max: 2000, step: 10 },
      alcohol_mq3: { low: 50, high: 350, unit: 'ppm', label: 'Alcohol (MQ3)', icon: 'flame', min: 0, max: 1000, step: 10 },
      smoke_mq2: { low: 100, high: 450, unit: 'ppm', label: 'Smoke (MQ2)', icon: 'flame', min: 0, max: 2000, step: 10 },
    }
  },
  {
    id: 'mushroom',
    name: 'Mushroom',
    description: 'Specialized for mushroom cultivation',
    category: 'crop',
    thresholds: {
      air_temperature: { low: 18, high: 25, unit: '°C', label: 'Air Temperature', icon: 'thermometer', min: 0, max: 50, step: 0.5 },
      air_humidity: { low: 80, high: 95, unit: '%', label: 'Air Humidity', icon: 'droplets', min: 0, max: 100, step: 1 },
      soil_temperature: { low: 16, high: 23, unit: '°C', label: 'Soil Temperature', icon: 'thermometer', min: 0, max: 50, step: 0.5 },
      soil_humidity: { low: 85, high: 95, unit: '%', label: 'Soil Humidity', icon: 'droplets', min: 0, max: 100, step: 1 },
      soil_moisture: { low: 80, high: 95, unit: '%', label: 'Soil Moisture', icon: 'droplets', min: 0, max: 100, step: 1 },
      air_quality_mq135: { low: 50, high: 600, unit: 'ppm', label: 'Air Quality (MQ135)', icon: 'wind', min: 0, max: 2000, step: 10 },
      alcohol_mq3: { low: 50, high: 300, unit: 'ppm', label: 'Alcohol (MQ3)', icon: 'flame', min: 0, max: 1000, step: 10 },
      smoke_mq2: { low: 100, high: 400, unit: 'ppm', label: 'Smoke (MQ2)', icon: 'flame', min: 0, max: 2000, step: 10 },
    }
  },
  {
    id: 'cucumber',
    name: 'Cucumber',
    description: 'Optimized for cucumber growing',
    category: 'crop',
    thresholds: {
      air_temperature: { low: 20, high: 30, unit: '°C', label: 'Air Temperature', icon: 'thermometer', min: 0, max: 50, step: 0.5 },
      air_humidity: { low: 65, high: 85, unit: '%', label: 'Air Humidity', icon: 'droplets', min: 0, max: 100, step: 1 },
      soil_temperature: { low: 18, high: 28, unit: '°C', label: 'Soil Temperature', icon: 'thermometer', min: 0, max: 50, step: 0.5 },
      soil_humidity: { low: 70, high: 85, unit: '%', label: 'Soil Humidity', icon: 'droplets', min: 0, max: 100, step: 1 },
      soil_moisture: { low: 65, high: 85, unit: '%', label: 'Soil Moisture', icon: 'droplets', min: 0, max: 100, step: 1 },
      air_quality_mq135: { low: 50, high: 750, unit: 'ppm', label: 'Air Quality (MQ135)', icon: 'wind', min: 0, max: 2000, step: 10 },
      alcohol_mq3: { low: 50, high: 380, unit: 'ppm', label: 'Alcohol (MQ3)', icon: 'flame', min: 0, max: 1000, step: 10 },
      smoke_mq2: { low: 100, high: 480, unit: 'ppm', label: 'Smoke (MQ2)', icon: 'flame', min: 0, max: 2000, step: 10 },
    }
  }
];

class GlobalThresholdService {
  private currentThresholds: Record<string, SensorThreshold> = {};
  private currentPreset: string | null = null;
  private listeners: Array<(thresholds: Record<string, SensorThreshold>) => void> = [];

  constructor() {
    this.loadThresholds();
  }

  // Load thresholds from localStorage 
  private async loadThresholds(): Promise<void> {
    // Load from localStorage
    const stored = localStorage.getItem('global_thresholds');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.currentThresholds = parsed.thresholds || {};
        this.currentPreset = parsed.preset || null;
      } catch (error) {
        console.error('Failed to parse stored thresholds');
      }
    }

    // If no thresholds found, use default crop (tomato)
    if (Object.keys(this.currentThresholds).length === 0) {
      this.applyPreset('tomato');
    }

    this.notifyListeners();
  }

  // Subscribe to threshold changes
  subscribe(callback: (thresholds: Record<string, SensorThreshold>) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentThresholds); // Immediate callback with current state
    
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Notify all listeners of threshold changes
  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.currentThresholds));
  }

  // Get current thresholds
  getCurrentThresholds(): Record<string, SensorThreshold> {
    return { ...this.currentThresholds };
  }

  // Get current preset
  getCurrentPreset(): string | null {
    return this.currentPreset;
  }

  // Apply a crop preset
  async applyPreset(presetId: string): Promise<void> {
    const preset = CROP_PRESETS.find(p => p.id === presetId);
    if (!preset) {
      throw new Error(`Preset ${presetId} not found`);
    }

    const previousThresholds = { ...this.currentThresholds };
    this.currentThresholds = { ...preset.thresholds };
    this.currentPreset = presetId;

    await this.saveThresholds('preset', previousThresholds, `Applied ${preset.name} preset`);
    this.notifyListeners();
  }

  // Update manual thresholds
  async updateThresholds(newThresholds: Record<string, SensorThreshold>): Promise<void> {
    const previousThresholds = { ...this.currentThresholds };
    this.currentThresholds = { ...newThresholds };
    this.currentPreset = null; // Clear preset when manually updating

    await this.saveThresholds('manual', previousThresholds, 'Manual threshold update');
    this.notifyListeners();
  }

  // Enhanced global calibration that affects the entire system
  async calibrateFromCurrentReadings(sensorData: any): Promise<void> {
    const previousThresholds = { ...this.currentThresholds };
    const calibratedThresholds = { ...this.currentThresholds };

    // Extract current sensor values with more comprehensive mapping
    const currentValues = {
      air_temperature: sensorData.air_temperature || sensorData.temperature,
      air_humidity: sensorData.air_humidity || sensorData.humidity,
      soil_temperature: sensorData.soil_temperature,
      soil_humidity: sensorData.soil_humidity,
      soil_moisture: sensorData.soil_moisture,
      air_quality_mq135: sensorData.air_quality_mq135,
      alcohol_mq3: sensorData.alcohol_mq3,
      smoke_mq2: sensorData.smoke_mq2,
    };

    let calibratedCount = 0;
    const calibrationDetails = [];

    // Calibrate each sensor with intelligent margin calculation
    Object.entries(currentValues).forEach(([key, value]) => {
      if (value !== null && value !== undefined && calibratedThresholds[key]) {
        const threshold = calibratedThresholds[key];
        
        // Intelligent margin based on sensor type and current value
        let marginPercent = 0.15; // Default 15%
        let minMargin = 2;
        let maxMargin = 50;
        
        // Sensor-specific margin adjustments
        switch (key) {
          case 'air_temperature':
          case 'soil_temperature':
            marginPercent = 0.12; // ±12% for temperature
            minMargin = 3;
            maxMargin = 8;
            break;
          case 'air_humidity':
          case 'soil_humidity':
          case 'soil_moisture':
            marginPercent = 0.18; // ±18% for humidity/moisture
            minMargin = 5;
            maxMargin = 15;
            break;
          case 'air_quality_mq135':
          case 'alcohol_mq3':
          case 'smoke_mq2':
            marginPercent = 0.25; // ±25% for gas sensors (more variable)
            minMargin = 50;
            maxMargin = 500;
            break;
        }
        
        const margin = Math.max(minMargin, Math.min(maxMargin, Math.abs(value * marginPercent)));
        const newLow = Math.max(threshold.min || 0, value - margin);
        const newHigh = Math.min(threshold.max || value * 3, value + margin);
        
        calibratedThresholds[key] = {
          ...threshold,
          low: Math.round(newLow * 10) / 10,
          high: Math.round(newHigh * 10) / 10,
        };

        calibratedCount++;
        calibrationDetails.push(`${threshold.label}: ${newLow.toFixed(1)}-${newHigh.toFixed(1)}${threshold.unit}`);
      }
    });

    this.currentThresholds = calibratedThresholds;
    this.currentPreset = null; // Clear preset when globally calibrating

    // Enhanced logging with details
    console.log('🔧 Global Calibration Applied:', {
      sensorsCalibrated: calibratedCount,
      baseReadings: currentValues,
      newThresholds: calibrationDetails,
      timestamp: new Date().toISOString()
    });

    await this.saveThresholds(
      'calibration', 
      previousThresholds, 
      `Global calibration: ${calibratedCount} sensors calibrated from live readings. New ranges: ${calibrationDetails.slice(0, 3).join(', ')}${calibratedCount > 3 ? ` and ${calibratedCount - 3} more` : ''}.`
    );
    
    this.notifyListeners();
  }

  // Save thresholds to localStorage
  private async saveThresholds(
    changeType: 'manual' | 'preset' | 'calibration',
    previousValues: Record<string, SensorThreshold>,
    notes?: string
  ): Promise<void> {
    // Save to localStorage
    localStorage.setItem('global_thresholds', JSON.stringify({
      thresholds: this.currentThresholds,
      preset: this.currentPreset,
      updatedAt: new Date().toISOString()
    }));

    // Save change log to localStorage
    const existingLogs = this.getLocalChangeHistory();
    const newLog: ThresholdChangeLog = {
      id: Date.now().toString(),
      userId: 'local_user',
      timestamp: new Date().toISOString(),
      changeType,
      previousValues,
      newValues: { ...this.currentThresholds },
      presetUsed: this.currentPreset,
      notes
    };

    const updatedLogs = [newLog, ...existingLogs].slice(0, 50); // Keep last 50 changes
    localStorage.setItem('threshold_change_logs', JSON.stringify(updatedLogs));
  }

  // Get threshold change history from localStorage
  private getLocalChangeHistory(): ThresholdChangeLog[] {
    try {
      const stored = localStorage.getItem('threshold_change_logs');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to parse change history');
      return [];
    }
  }

  // Get threshold change history
  async getChangeHistory(limit: number = 50): Promise<ThresholdChangeLog[]> {
    return this.getLocalChangeHistory().slice(0, limit);
  }

  // Get available presets
  getAvailablePresets(): ThresholdPreset[] {
    return CROP_PRESETS;
  }
}

export const globalThresholdService = new GlobalThresholdService();