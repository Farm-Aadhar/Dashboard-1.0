// Re-export threshold utilities for easy importing
export { 
  getStoredThresholds, 
  getStatusWithThresholds, 
  DEFAULT_THRESHOLDS,
  type SensorThreshold 
} from '../components/settings/ThresholdSettings';

import { getStoredThresholds, getStatusWithThresholds } from '../components/settings/ThresholdSettings';

// Helper function to get status for any sensor type (backward compatibility)
export function getSensorStatus(
  value: number, 
  sensorType: string
): 'healthy' | 'warning' | 'critical' {
  // Map common sensor types to threshold types
  const typeMapping: Record<string, string> = {
    'temperature': 'air_temperature',
    'humidity': 'air_humidity',
    'air_quality': 'air_quality_mq135',
    'alcohol': 'alcohol_mq3',
    'smoke': 'smoke_mq2'
  };

  const mappedType = typeMapping[sensorType] || sensorType;
  
  // Use threshold-based status if available
  if (['air_temperature', 'air_humidity', 'air_quality_mq135', 'alcohol_mq3', 'smoke_mq2'].includes(mappedType)) {
    return getStatusWithThresholds(value, mappedType as any);
  }
  
  // Fallback to healthy for unknown types
  return 'healthy';
}

// Export threshold validation functions
export function validateThresholdValue(value: number, sensorType: string): boolean {
  const thresholds = getStoredThresholds();
  const threshold = thresholds[sensorType];
  
  if (!threshold) return true; // Unknown sensor, consider valid
  
  return value >= threshold.min && value <= threshold.max;
}

export function getThresholdRange(sensorType: string): { min: number; max: number; unit: string } | null {
  const thresholds = getStoredThresholds();
  const threshold = thresholds[sensorType];
  
  if (!threshold) return null;
  
  return {
    min: threshold.low,
    max: threshold.high,
    unit: threshold.unit
  };
}
