// Sensor Data Simulator for testing when physical sensors are offline
import { getStoredThresholds, getSelectedCrop } from '@/components/settings/ThresholdSettings';
import { POLYHOUSE_CROP_CONDITIONS } from '@/lib/polyhouseCropConditions';
import { supabase } from '@/integrations/supabase/client';
import { DatabaseCollectionController } from '@/api/database-collection-controller';

export interface SimulatedSensorData {
  timestamp: string;
  // Air sensors
  air_temperature: number;
  air_humidity: number;
  air_quality_mq135: number;
  air_alcohol_mq3: number;
  air_smoke_mq2: number;
  // Soil sensors
  soil_temperature: number;
  soil_humidity: number;
  soil_moisture: number;
  // Metadata
  device_id: string;
  location: string;
  simulation: boolean;
}

class SensorSimulator {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private dataBuffer: SimulatedSensorData[] = [];
  private readonly maxBufferSize = 100;

  // Base values around which to simulate
  private baseValues = {
    air_temperature: 26.0,
    air_humidity: 65.0,
    air_quality_mq135: 2500,
    air_alcohol_mq3: 800,
    air_smoke_mq2: 1500,
    soil_temperature: 24.0,
    soil_humidity: 70.0,
    soil_moisture: 60.0
  };

  // Simulation parameters
  private readonly variation = {
    air_temperature: 3.0,    // ±3°C variation
    air_humidity: 8.0,       // ±8% variation
    air_quality_mq135: 500,  // ±500 ppm variation
    air_alcohol_mq3: 200,    // ±200 ppm variation
    air_smoke_mq2: 300,      // ±300 ppm variation
    soil_temperature: 2.0,   // ±2°C variation
    soil_humidity: 6.0,      // ±6% variation
    soil_moisture: 10.0      // ±10% variation
  };

  constructor() {
    this.updateBaseValuesFromCrop();
  }

  // Update base values based on selected crop's ideal conditions
  private updateBaseValuesFromCrop() {
    const selectedCrop = getSelectedCrop();
    if (selectedCrop) {
      const cropData = POLYHOUSE_CROP_CONDITIONS.find(c => c.cropName === selectedCrop);
      if (cropData) {
        // Set base values to the middle of ideal ranges
        this.baseValues.air_temperature = (cropData.idealAirTemperature.min + cropData.idealAirTemperature.max) / 2;
        this.baseValues.air_humidity = (cropData.idealAirHumidity.min + cropData.idealAirHumidity.max) / 2;
        this.baseValues.soil_temperature = (cropData.idealSoilTemperature.min + cropData.idealSoilTemperature.max) / 2;
        this.baseValues.soil_humidity = (cropData.idealSoilHumidity.min + cropData.idealSoilHumidity.max) / 2;
        this.baseValues.soil_moisture = (cropData.idealSoilMoisture.min + cropData.idealSoilMoisture.max) / 2;
      }
    }
  }

  // Generate realistic sensor reading with some randomness
  private generateReading(baseValue: number, variation: number, min: number = 0, max: number = Infinity): number {
    const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
    const trend = Math.sin(Date.now() / 300000) * 0.3; // Slow trend over time
    
    let value = baseValue + (randomFactor * variation) + (trend * variation);
    
    // Add occasional spikes to test threshold alerts
    if (Math.random() < 0.05) { // 5% chance of spike
      value += (Math.random() - 0.5) * variation * 3;
    }
    
    return Math.max(min, Math.min(max, value));
  }

  // Generate a complete sensor data point
  private generateDataPoint(): SimulatedSensorData {
    this.updateBaseValuesFromCrop();

    return {
      timestamp: new Date().toISOString(),
      
      // Air sensors
      air_temperature: this.generateReading(this.baseValues.air_temperature, this.variation.air_temperature, 10, 50),
      air_humidity: this.generateReading(this.baseValues.air_humidity, this.variation.air_humidity, 20, 95),
      air_quality_mq135: this.generateReading(this.baseValues.air_quality_mq135, this.variation.air_quality_mq135, 500, 5000),
      air_alcohol_mq3: this.generateReading(this.baseValues.air_alcohol_mq3, this.variation.air_alcohol_mq3, 300, 2500),
      air_smoke_mq2: this.generateReading(this.baseValues.air_smoke_mq2, this.variation.air_smoke_mq2, 800, 4000),
      
      // Soil sensors
      soil_temperature: this.generateReading(this.baseValues.soil_temperature, this.variation.soil_temperature, 15, 40),
      soil_humidity: this.generateReading(this.baseValues.soil_humidity, this.variation.soil_humidity, 30, 90),
      soil_moisture: this.generateReading(this.baseValues.soil_moisture, this.variation.soil_moisture, 20, 90),
      
      // Metadata
      device_id: 'SIM_001',
      location: 'Simulated Polyhouse',
      simulation: true
    };
  }

  // Start the simulator
  start(intervalMs: number = 5000): void {
    if (this.isRunning) {
      console.log('Simulator is already running');
      return;
    }

    console.log('🚀 Starting sensor data simulator...');
    
    // Don't automatically enable data collection - let user control it manually
    // this.enableDataCollectionIfNeeded();
    
    this.isRunning = true;

    // Generate initial data point
    const initialData = this.generateDataPoint();
    this.dataBuffer.push(initialData);
    // Save initial data to database
    this.saveToDatabase(initialData);

    // Start generating data at intervals
    this.intervalId = setInterval(async () => {
      const dataPoint = this.generateDataPoint();
      this.dataBuffer.push(dataPoint);

      // Save to database
      await this.saveToDatabase(dataPoint);

      // Keep buffer size manageable
      if (this.dataBuffer.length > this.maxBufferSize) {
        this.dataBuffer.shift();
      }

      // Simulate real-time data by triggering events
      this.notifyDataListeners(dataPoint);
    }, intervalMs);

    console.log(`📊 Simulator generating data every ${intervalMs}ms`);
  }

  // Stop the simulator
  stop(): void {
    if (!this.isRunning) {
      console.log('Simulator is not running');
      return;
    }

    console.log('⏹️ Stopping sensor data simulator...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Get current status
  getStatus(): { running: boolean; dataPoints: number; lastUpdate: string | null } {
    return {
      running: this.isRunning,
      dataPoints: this.dataBuffer.length,
      lastUpdate: this.dataBuffer.length > 0 ? this.dataBuffer[this.dataBuffer.length - 1].timestamp : null
    };
  }

  // Get all buffered data
  getAllData(): SimulatedSensorData[] {
    return [...this.dataBuffer];
  }

  // Get latest data point
  getLatestData(): SimulatedSensorData | null {
    return this.dataBuffer.length > 0 ? this.dataBuffer[this.dataBuffer.length - 1] : null;
  }

  // Get last N data points
  getRecentData(count: number): SimulatedSensorData[] {
    return this.dataBuffer.slice(-count);
  }

  // Clear all data
  clearData(): void {
    this.dataBuffer = [];
    console.log('🗑️ Simulator data buffer cleared');
  }

  // Save simulated data to database using correct column names
  private async saveToDatabase(data: SimulatedSensorData): Promise<void> {
    try {
      // Map simulator data to database column names
      const dbData = {
        node_id: 'SIMULATOR_NODE',
        temperature: data.air_temperature,
        humidity: data.air_humidity,
        soil_moisture: data.soil_moisture,
        air_quality_mq135: Math.round(data.air_quality_mq135),
        alcohol_mq3: Math.round(data.air_alcohol_mq3),
        smoke_mq2: Math.round(data.air_smoke_mq2),
        timestamp: data.timestamp
      };

      const { error } = await supabase
        .from('sensor_readings')
        .insert([dbData]);

      if (error) {
        // Only log error if it's not the "data collection disabled" message
        if (!error.message.includes('Data collection is currently disabled')) {
          console.error('Error saving simulator data to database:', error);
        }
      } else {
        console.log('📊 Simulator data saved to database');
      }
    } catch (error) {
      console.error('Error in saveToDatabase:', error);
    }
  }

  // Enable data collection if needed
  private async enableDataCollectionIfNeeded(): Promise<void> {
    try {
      const isEnabled = await DatabaseCollectionController.isCollectionEnabled();
      if (!isEnabled) {
        console.log('🔧 Data collection is disabled. Enabling it for simulator...');
        const success = await DatabaseCollectionController.enableCollection('continuous');
        if (success) {
          console.log('✅ Data collection enabled successfully');
        } else {
          console.error('❌ Failed to enable data collection');
        }
      } else {
        console.log('✅ Data collection is already enabled');
      }
    } catch (error) {
      console.error('Error checking/enabling data collection:', error);
    }
  }

  // Manually trigger specific scenarios for testing
  simulateScenario(scenario: 'normal' | 'high_temp' | 'low_humidity' | 'poor_air_quality' | 'critical_all'): void {
    let dataPoint: SimulatedSensorData;

    switch (scenario) {
      case 'high_temp':
        dataPoint = {
          ...this.generateDataPoint(),
          air_temperature: 38.0,
          soil_temperature: 35.0,
          timestamp: new Date().toISOString()
        };
        break;

      case 'low_humidity':
        dataPoint = {
          ...this.generateDataPoint(),
          air_humidity: 25.0,
          soil_humidity: 20.0,
          timestamp: new Date().toISOString()
        };
        break;

      case 'poor_air_quality':
        dataPoint = {
          ...this.generateDataPoint(),
          air_quality_mq135: 4500,
          air_smoke_mq2: 3800,
          timestamp: new Date().toISOString()
        };
        break;

      case 'critical_all':
        dataPoint = {
          ...this.generateDataPoint(),
          air_temperature: 42.0,
          air_humidity: 15.0,
          air_quality_mq135: 4800,
          soil_temperature: 38.0,
          soil_humidity: 18.0,
          soil_moisture: 10.0,
          timestamp: new Date().toISOString()
        };
        break;

      default:
        dataPoint = this.generateDataPoint();
    }

    this.dataBuffer.push(dataPoint);
    this.notifyDataListeners(dataPoint);
    console.log(`🧪 Simulated scenario: ${scenario}`);
  }

  // Notify data listeners (can be extended for real-time updates)
  private notifyDataListeners(dataPoint: SimulatedSensorData): void {
    // Dispatch custom event for components to listen to
    const event = new CustomEvent('simulatedSensorData', {
      detail: dataPoint
    });
    window.dispatchEvent(event);
  }
}

// Global simulator instance
export const sensorSimulator = new SensorSimulator();

// Utility functions for easy integration
export const startSimulation = (intervalMs: number = 5000) => sensorSimulator.start(intervalMs);
export const stopSimulation = () => sensorSimulator.stop();
export const getSimulationStatus = () => sensorSimulator.getStatus();
export const getSimulatedData = () => sensorSimulator.getAllData();
export const getLatestSimulatedData = () => sensorSimulator.getLatestData();
export const clearSimulatedData = () => sensorSimulator.clearData();
export const simulateScenario = (scenario: Parameters<typeof sensorSimulator.simulateScenario>[0]) => 
  sensorSimulator.simulateScenario(scenario);

// Auto-start simulator in development mode - DISABLED for manual control
// if (import.meta.env.DEV) {
//   console.log('🔧 Development mode detected - Auto-start disabled for manual control');
// }
