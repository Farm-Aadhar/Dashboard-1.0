import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startSimulation, stopSimulation, getSimulationStatus } from '@/lib/sensorSimulator';
import { toast } from 'sonner';

interface SensorReading {
  id: string;
  timestamp: string;
  air_temperature?: number;
  air_humidity?: number;
  air_air_quality_mq135?: number;
  air_alcohol_mq3?: number;
  air_smoke_mq2?: number;
  soil_temperature?: number;
  soil_humidity?: number;
  soil_moisture?: number;
}

export function useSimulatorIntegration() {
  const [isUsingSimulator, setIsUsingSimulator] = useState(false);

  // Check if we should use simulator (no real data in last 5 minutes)
  const checkSensorStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('timestamp')
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking sensor status:', error);
        return;
      }

      const shouldUseSimulator = (() => {
        if (!data || data.length === 0) {
          // No data at all, use simulator
          return true;
        }

        const lastReading = new Date(data[0].timestamp);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        return lastReading < fiveMinutesAgo;
      })();

      // Only update state if there's actually a change
      if (shouldUseSimulator !== isUsingSimulator) {
        setIsUsingSimulator(shouldUseSimulator);
        
        if (shouldUseSimulator) {
          toast.info('No recent sensor data detected. Switching to simulator mode for testing.');
        } else {
          toast.success('Real sensor data detected. Switching back to live mode.');
        }
      }
    } catch (error) {
      console.error('Error in sensor status check:', error);
    }
  }, [isUsingSimulator]);

  // Auto-start simulator when needed
  useEffect(() => {
    if (isUsingSimulator && process.env.NODE_ENV === 'development') {
      // Start simulator if not already running
      const startSimulatorIfNeeded = async () => {
        try {
          const status = getSimulationStatus();
          if (!status.running) {
            startSimulation();
            console.log('Simulator auto-started for development');
          }
        } catch (error) {
          console.error('Failed to auto-start simulator:', error);
        }
      };

      startSimulatorIfNeeded();
    }
    
    return () => {
      // Cleanup if needed
      if (process.env.NODE_ENV === 'development') {
        stopSimulation();
      }
    };
  }, [isUsingSimulator]);

  // Check sensor status periodically
  useEffect(() => {
    checkSensorStatus();
    
    const interval = setInterval(checkSensorStatus, 120000); // Check every 2 minutes (reduced frequency)
    
    return () => clearInterval(interval);
  }, [checkSensorStatus]);

  // Function to identify if current data is from simulator
  const checkIfSimulatedData = useCallback((data: SensorReading) => {
    // Simple heuristic: simulator data tends to have more decimal precision
    // and specific timestamp patterns. You could also add a flag to simulated data.
    const hasHighPrecision = (
      data.air_temperature?.toString().includes('.') ||
      data.soil_temperature?.toString().includes('.')
    );
    
    // In a real implementation, you might add a simulator flag to the data
    return isUsingSimulator && hasHighPrecision;
  }, [isUsingSimulator]);

  return {
    isUsingSimulator,
    checkIfSimulatedData,
    manualToggle: (enabled: boolean) => setIsUsingSimulator(enabled)
  };
}

// Hook to format simulator data for display
export function useSimulatorDataFormatting() {
  const formatSimulatedValue = useCallback((value: number, type: string): string => {
    switch (type) {
      case 'temperature':
        return `${value.toFixed(1)}°C`;
      case 'humidity':
      case 'moisture':
        return `${value.toFixed(1)}%`;
      case 'ppm':
        return `${Math.round(value)} ppm`;
      default:
        return value.toString();
    }
  }, []);

  const getSimulatorIcon = useCallback((isSimulated: boolean) => {
    return isSimulated ? '🤖' : '📡';
  }, []);

  return {
    formatSimulatedValue,
    getSimulatorIcon
  };
}
