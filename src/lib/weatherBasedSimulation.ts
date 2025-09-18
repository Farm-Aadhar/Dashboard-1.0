// Enhanced simulation service that starts from real weather data
import { weatherService, getUserLocation, WeatherData } from '@/lib/weatherService';
import { globalThresholdService } from '@/lib/globalThresholdService';

interface SimulationState {
  air_temperature: number;
  air_humidity: number;
  air_air_quality_mq135: number;
  air_alcohol_mq3: number;
  air_smoke_mq2: number;
  soil_temperature: number;
  soil_humidity: number;
  soil_moisture: number;
}

interface Sensitivity {
  air_temperature: number;
  air_humidity: number;
  air_air_quality_mq135: number;
  air_alcohol_mq3: number;
  air_smoke_mq2: number;
  soil_temperature: number;
  soil_humidity: number;
  soil_moisture: number;
}

class WeatherBasedSimulationService {
  private currentState: SimulationState | null = null;
  private baseWeatherData: WeatherData | null = null;
  private sensitivity: Sensitivity = {
    air_temperature: 1,
    air_humidity: 1,
    air_air_quality_mq135: 1,
    air_alcohol_mq3: 1,
    air_smoke_mq2: 1,
    soil_temperature: 1,
    soil_humidity: 1,
    soil_moisture: 1,
  };

  // Initialize simulation with current weather data
  async initializeFromWeather(): Promise<SimulationState> {
    try {
      // Get user location and weather data
      const location = await getUserLocation();
      this.baseWeatherData = await weatherService.getCurrentWeather(location.lat, location.lon);
      
      // Initialize simulation state based on actual weather
      this.currentState = {
        air_temperature: this.baseWeatherData.temperature,
        air_humidity: this.baseWeatherData.humidity,
        // Estimate other sensors based on weather conditions
        air_air_quality_mq135: this.estimateAirQuality(this.baseWeatherData),
        air_alcohol_mq3: this.estimateAlcohol(this.baseWeatherData),
        air_smoke_mq2: this.estimateSmoke(this.baseWeatherData),
        // Soil sensors typically lag behind air temperature
        soil_temperature: this.baseWeatherData.temperature - 2,
        soil_humidity: Math.min(this.baseWeatherData.humidity + 10, 95),
        soil_moisture: this.estimateSoilMoisture(this.baseWeatherData),
      };

      console.log('🌤️ Simulation initialized from weather:', {
        location: this.baseWeatherData.location.name,
        weather: this.baseWeatherData.description,
        temperature: this.baseWeatherData.temperature,
        humidity: this.baseWeatherData.humidity,
        initialState: this.currentState
      });

      return this.currentState;
    } catch (error) {
      console.warn('⚠️ Failed to initialize from weather, using fallback values:', error);
      return this.getFallbackInitialState();
    }
  }

  // Generate next simulation data point
  generateNext(timeInSeconds: number, spikeChance: number = 0.05, spikeIntensity: number = 1.5): SimulationState {
    if (!this.currentState) {
      console.warn('⚠️ Simulation not initialized, using fallback');
      this.currentState = this.getFallbackInitialState();
    }

    // Time-based cycles for natural variation
    const tempCycle = Math.sin((timeInSeconds * Math.PI) / 3600) * 0.3; // ~2 hour cycle
    const humidityCycle = Math.cos((timeInSeconds * Math.PI) / 7200) * 0.2; // ~4 hour cycle
    const airQualityCycle = Math.sin((timeInSeconds * Math.PI) / 5400) * 0.4; // ~3 hour cycle
    const alcoholCycle = Math.sin((timeInSeconds * Math.PI) / 1800) * 0.15; // ~1 hour cycle  
    const smokeCycle = Math.cos((timeInSeconds * Math.PI) / 2700) * 0.25; // ~1.5 hour cycle

    // Get global thresholds for realistic ranges
    const thresholds = globalThresholdService.getCurrentThresholds();

    const updateValue = (
      key: keyof SimulationState, 
      currentValue: number, 
      cycle: number, 
      baseValue?: number
    ): number => {
      const threshold = thresholds[key];
      const sensitivityMult = this.sensitivity[key];
      
      // Use weather-based base or threshold midpoint
      const referenceBase = baseValue || (threshold ? (threshold.low + threshold.high) / 2 : currentValue);
      const range = threshold ? (threshold.high - threshold.low) : 20;
      
      // Calculate target with cycle influence and sensitivity
      const targetValue = referenceBase + (cycle * range * 0.3 * sensitivityMult);
      
      // Add small random fluctuation
      const fluctuation = (Math.random() - 0.5) * range * 0.1;
      
      // Smooth transition with inertia
      const inertia = 0.85;
      const newValue = currentValue * inertia + targetValue * (1 - inertia) + fluctuation;
      
      // Apply bounds from thresholds or reasonable defaults
      const min = threshold ? Math.max(0, threshold.low - range * 0.5) : 0;
      const max = threshold ? threshold.high + range * 0.5 : newValue * 2;
      
      return Math.max(min, Math.min(max, newValue));
    };

    // Update each sensor value
    const newState: SimulationState = {
      air_temperature: updateValue(
        'air_temperature', 
        this.currentState.air_temperature, 
        tempCycle,
        this.baseWeatherData?.temperature
      ),
      air_humidity: updateValue(
        'air_humidity', 
        this.currentState.air_humidity, 
        humidityCycle,
        this.baseWeatherData?.humidity
      ),
      air_air_quality_mq135: updateValue(
        'air_air_quality_mq135', 
        this.currentState.air_air_quality_mq135, 
        airQualityCycle
      ),
      air_alcohol_mq3: updateValue(
        'air_alcohol_mq3', 
        this.currentState.air_alcohol_mq3, 
        alcoholCycle
      ),
      air_smoke_mq2: updateValue(
        'air_smoke_mq2', 
        this.currentState.air_smoke_mq2, 
        smokeCycle
      ),
      soil_temperature: updateValue(
        'soil_temperature', 
        this.currentState.soil_temperature, 
        tempCycle * 0.7, // Soil temperature changes slower
        this.baseWeatherData ? this.baseWeatherData.temperature - 2 : undefined
      ),
      soil_humidity: updateValue(
        'soil_humidity', 
        this.currentState.soil_humidity, 
        humidityCycle * 0.8
      ),
      soil_moisture: updateValue(
        'soil_moisture', 
        this.currentState.soil_moisture, 
        humidityCycle * 0.6
      ),
    };

    // Apply random spikes
    if (Math.random() < spikeChance) {
      const spikeKeys = Object.keys(newState) as (keyof SimulationState)[];
      const randomKey = spikeKeys[Math.floor(Math.random() * spikeKeys.length)];
      
      const threshold = thresholds[randomKey];
      if (threshold) {
        // Spike towards threshold boundaries
        const isHighSpike = Math.random() > 0.5;
        const spikeTarget = isHighSpike ? threshold.high * 1.2 : threshold.low * 0.8;
        newState[randomKey] = newState[randomKey] * 0.3 + spikeTarget * 0.7;
      } else {
        newState[randomKey] *= spikeIntensity;
      }
      
      console.log(`🔥 Spike applied to ${randomKey}: ${newState[randomKey].toFixed(2)}`);
    }

    this.currentState = newState;
    return { ...newState };
  }

  // Estimate air quality based on weather conditions
  private estimateAirQuality(weather: WeatherData): number {
    // Higher wind speed = better air quality, cloud cover affects it
    const baseAQ = 2000;
    const windFactor = Math.max(0.5, 2 - weather.windSpeed / 10); // Lower with higher wind
    const cloudFactor = 1 + (weather.cloudCover / 100) * 0.3; // Higher with more clouds
    return baseAQ * windFactor * cloudFactor;
  }

  // Estimate alcohol sensor based on weather
  private estimateAlcohol(weather: WeatherData): number {
    // Generally low, slightly affected by humidity
    return 800 + (weather.humidity - 50) * 5;
  }

  // Estimate smoke sensor based on weather
  private estimateSmoke(weather: WeatherData): number {
    // Affected by wind and pressure
    const baseSmokeP = 1500;
    const windFactor = Math.max(0.7, 1.5 - weather.windSpeed / 15);
    return baseSmokeP * windFactor;
  }

  // Estimate soil moisture based on weather
  private estimateSoilMoisture(weather: WeatherData): number {
    // Higher humidity generally means higher soil moisture
    return Math.min(85, 30 + (weather.humidity * 0.7));
  }

  // Fallback initial state when weather data is unavailable
  private getFallbackInitialState(): SimulationState {
    const thresholds = globalThresholdService.getCurrentThresholds();
    
    return {
      air_temperature: this.getThresholdMidpoint('air_temperature', 25, thresholds),
      air_humidity: this.getThresholdMidpoint('air_humidity', 65, thresholds),
      air_air_quality_mq135: this.getThresholdMidpoint('air_air_quality_mq135', 2000, thresholds),
      air_alcohol_mq3: this.getThresholdMidpoint('air_alcohol_mq3', 800, thresholds),
      air_smoke_mq2: this.getThresholdMidpoint('air_smoke_mq2', 1500, thresholds),
      soil_temperature: this.getThresholdMidpoint('soil_temperature', 23, thresholds),
      soil_humidity: this.getThresholdMidpoint('soil_humidity', 70, thresholds),
      soil_moisture: this.getThresholdMidpoint('soil_moisture', 45, thresholds),
    };
  }

  private getThresholdMidpoint(key: string, fallback: number, thresholds: any): number {
    const threshold = thresholds[key];
    return threshold ? (threshold.low + threshold.high) / 2 : fallback;
  }

  // Update sensitivity settings
  setSensitivity(newSensitivity: Partial<Sensitivity>): void {
    this.sensitivity = { ...this.sensitivity, ...newSensitivity };
  }

  // Get current simulation state
  getCurrentState(): SimulationState | null {
    return this.currentState ? { ...this.currentState } : null;
  }

  // Get base weather data for reference
  getBaseWeatherData(): WeatherData | null {
    return this.baseWeatherData;
  }

  // Reset simulation (will reinitialize from weather on next generate)
  reset(): void {
    this.currentState = null;
    this.baseWeatherData = null;
  }
}

export const weatherBasedSimulation = new WeatherBasedSimulationService();