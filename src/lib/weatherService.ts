// Weather API integration for data validation and external weather data
export interface WeatherData {
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  uvIndex: number;
  cloudCover: number;
  description: string;
  icon: string;
  timestamp: string;
  location: {
    name: string;
    country: string;
    lat: number;
    lon: number;
  };
}

export interface WeatherValidation {
  sensorReliability: 'high' | 'medium' | 'low';
  temperatureDiff: number;
  humidityDiff: number;
  outliers: string[];
  recommendations: string[];
}

interface CachedWeatherData {
  data: WeatherData;
  cachedAt: number;
  expiresAt: number;
}

interface ApiCallTracker {
  count: number;
  resetTime: number;
  lastCallTime: number;
}

class WeatherService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openweathermap.org/data/2.5';
  private readonly maxCallsPerDay: number;
  private readonly cacheTimeout: number;
  private readonly minCallInterval: number;
  
  private weatherCache = new Map<string, CachedWeatherData>();
  private apiCallTracker: ApiCallTracker;
  private pendingRequests = new Map<string, Promise<WeatherData>>();
  
  constructor() {
    this.apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY || '';
    this.maxCallsPerDay = parseInt(import.meta.env.VITE_WEATHER_MAX_CALLS_PER_DAY) || 500;
    this.cacheTimeout = parseInt(import.meta.env.VITE_WEATHER_CACHE_TIMEOUT) || (30 * 60 * 1000); // 30 minutes
    this.minCallInterval = parseInt(import.meta.env.VITE_WEATHER_MIN_CALL_INTERVAL) || (5 * 60 * 1000); // 5 minutes
    this.apiCallTracker = this.loadApiCallTracker();
    this.loadCacheFromStorage();
  }

  // Load API call tracker from localStorage
  private loadApiCallTracker(): ApiCallTracker {
    try {
      const stored = localStorage.getItem('weather_api_calls');
      if (stored) {
        const tracker = JSON.parse(stored) as ApiCallTracker;
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        // Reset counter if it's been more than 24 hours
        if (now > tracker.resetTime) {
          return {
            count: 0,
            resetTime: now + oneDayMs,
            lastCallTime: 0
          };
        }
        return tracker;
      }
    } catch (error) {
      console.error('Failed to load API call tracker:', error);
    }
    
    // Default tracker
    return {
      count: 0,
      resetTime: Date.now() + (24 * 60 * 60 * 1000),
      lastCallTime: 0
    };
  }

  // Load cache from localStorage
  private loadCacheFromStorage(): void {
    try {
      const stored = localStorage.getItem('weather_cache');
      if (stored) {
        const cacheData = JSON.parse(stored);
        const now = Date.now();
        
        // Only load non-expired cache entries
        for (const [key, data] of Object.entries(cacheData)) {
          const cachedItem = data as CachedWeatherData;
          if (cachedItem.expiresAt > now) {
            this.weatherCache.set(key, cachedItem);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load weather cache:', error);
    }
  }

  // Save cache to localStorage
  private saveCacheToStorage(): void {
    try {
      const cacheData: Record<string, CachedWeatherData> = {};
      for (const [key, data] of this.weatherCache.entries()) {
        cacheData[key] = data;
      }
      localStorage.setItem('weather_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.error('Failed to save weather cache:', error);
    }
  }

  // Save API call tracker to localStorage
  private saveApiCallTracker(): void {
    try {
      localStorage.setItem('weather_api_calls', JSON.stringify(this.apiCallTracker));
    } catch (error) {
      console.error('Failed to save API call tracker:', error);
    }
  }

  // Check if we can make an API call
  private canMakeApiCall(): { allowed: boolean; reason?: string; waitTime?: number } {
    const now = Date.now();
    
    // Check daily limit
    if (this.apiCallTracker.count >= this.maxCallsPerDay) {
      const resetIn = this.apiCallTracker.resetTime - now;
      return {
        allowed: false,
        reason: `Daily API limit reached (${this.maxCallsPerDay} calls)`,
        waitTime: resetIn
      };
    }
    
    // Check minimum interval between calls
    const timeSinceLastCall = now - this.apiCallTracker.lastCallTime;
    if (timeSinceLastCall < this.minCallInterval) {
      return {
        allowed: false,
        reason: 'Rate limit: too frequent calls',
        waitTime: this.minCallInterval - timeSinceLastCall
      };
    }
    
    return { allowed: true };
  }

  // Get mock weather data as fallback
  private getMockWeatherData(): WeatherData {
    return {
      temperature: 25.5,
      humidity: 65,
      pressure: 1013,
      windSpeed: 2.5,
      windDirection: 180,
      visibility: 10000,
      uvIndex: 5,
      cloudCover: 40,
      description: 'partly cloudy',
      icon: '02d',
      timestamp: new Date().toISOString(),
      location: {
        name: 'Farm Location',
        country: 'IN',
        lat: 28.6139,
        lon: 77.2090
      }
    };
  }

  // Record an API call
  private recordApiCall(): void {
    this.apiCallTracker.count++;
    this.apiCallTracker.lastCallTime = Date.now();
    this.saveApiCallTracker();
  }

  // Generate cache key
  private getCacheKey(lat: number, lon: number, type: string = 'current'): string {
    return `${type}_${lat.toFixed(2)}_${lon.toFixed(2)}`;
  }

  // Get cached data if valid
  private getCachedData(key: string): WeatherData | null {
    const cached = this.weatherCache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
    
    // Remove expired cache
    if (cached) {
      this.weatherCache.delete(key);
    }
    
    return null;
  }

  // Cache weather data
  private cacheData(key: string, data: WeatherData): void {
    this.weatherCache.set(key, {
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + this.cacheTimeout
    });
    this.saveCacheToStorage();
  }

  // Get API call statistics
  public getApiCallStats(): {
    callsUsed: number;
    callsRemaining: number;
    dailyLimit: number;
    resetTime: string;
    cacheSize: number;
  } {
    return {
      callsUsed: this.apiCallTracker.count,
      callsRemaining: this.maxCallsPerDay - this.apiCallTracker.count,
      dailyLimit: this.maxCallsPerDay,
      resetTime: new Date(this.apiCallTracker.resetTime).toLocaleString(),
      cacheSize: this.weatherCache.size
    };
  }

  // Get current weather data with intelligent caching and request deduplication
  async getCurrentWeather(lat: number, lon: number): Promise<WeatherData> {
    if (!this.apiKey) {
      return this.getMockWeatherData();
    }

    // Check cache first
    const cacheKey = this.getCacheKey(lat, lon, 'current');
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Check if there's already a pending request for this location
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    // Check if we can make API call
    const callCheck = this.canMakeApiCall();
    if (!callCheck.allowed) {
      // If we have expired cache data, return it instead of failing
      const expiredCache = this.weatherCache.get(cacheKey);
      if (expiredCache) {
        return expiredCache.data;
      }
      
      // Fallback to mock data if no cache available
      return this.getMockWeatherData();
    }

    // Create and store the pending request
    const requestPromise = this.makeWeatherRequest(lat, lon, cacheKey);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } catch (error) {
      // On any error, try expired cache first, then mock data
      const expiredCache = this.weatherCache.get(cacheKey);
      if (expiredCache) {
        return expiredCache.data;
      }
      
      return this.getMockWeatherData();
    } finally {
      // Clean up the pending request
      this.pendingRequests.delete(cacheKey);
    }
  }

  // Make the actual weather API request
  private async makeWeatherRequest(lat: number, lon: number, cacheKey: string): Promise<WeatherData> {
    try {
      const response = await fetch(
        `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
      );

      if (!response.ok) {
        // Handle rate limit specifically
        if (response.status === 429) {
          // Try to use expired cache if available
          const expiredCache = this.weatherCache.get(cacheKey);
          if (expiredCache) {
            return expiredCache.data;
          }
          throw new Error('API call not allowed: Rate limit exceeded');
        }
        
        throw new Error(`Weather API error: ${response.status} - ${response.statusText}`);
      }

      this.recordApiCall();
      
      const data = await response.json();
      
      const weatherData: WeatherData = {
        temperature: data.main.temp,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: data.wind?.speed || 0,
        windDirection: data.wind?.deg || 0,
        visibility: data.visibility || 10000,
        uvIndex: 0, // UV index requires separate API call
        cloudCover: data.clouds?.all || 0,
        description: data.weather[0]?.description || '',
        icon: data.weather[0]?.icon || '',
        timestamp: new Date().toISOString(),
        location: {
          name: data.name,
          country: data.sys.country,
          lat: data.coord.lat,
          lon: data.coord.lon
        }
      };

      // Cache the result
      this.cacheData(cacheKey, weatherData);
      
      return weatherData;
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      throw error;
    }
  }

  // Get weather forecast (5 day / 3 hour) - Limited use due to API constraints
  async getWeatherForecast(lat: number, lon: number): Promise<WeatherData[]> {
    if (!this.apiKey) {
      throw new Error('OpenWeather API key not configured');
    }

    // Check cache first
    const cacheKey = this.getCacheKey(lat, lon, 'forecast');
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      // For forecast, we store the first item but this needs special handling
      // For now, we'll implement a simpler approach
    }

    // Forecast uses more API calls, so be more restrictive
    const callCheck = this.canMakeApiCall();
    if (!callCheck.allowed) {
      throw new Error(`Forecast unavailable: ${callCheck.reason}. Try again later.`);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric&cnt=8`
      );

      if (!response.ok) {
        // Handle rate limit specifically
        if (response.status === 429) {
          console.warn('🚫 Weather API rate limit exceeded for forecast');
          throw new Error('Forecast unavailable: Rate limit exceeded. Please wait.');
        }
        
        throw new Error(`Weather API error: ${response.status} - ${response.statusText}`);
      }

      this.recordApiCall();
      
      const data = await response.json();
      
      const forecastData = data.list.map((item: any) => ({
        temperature: item.main.temp,
        humidity: item.main.humidity,
        pressure: item.main.pressure,
        windSpeed: item.wind?.speed || 0,
        windDirection: item.wind?.deg || 0,
        visibility: item.visibility || 10000,
        uvIndex: 0,
        cloudCover: item.clouds?.all || 0,
        description: item.weather[0]?.description || '',
        icon: item.weather[0]?.icon || '',
        timestamp: item.dt_txt,
        location: {
          name: data.city.name,
          country: data.city.country,
          lat: data.city.coord.lat,
          lon: data.city.coord.lon
        }
      }));

      return forecastData;
    } catch (error) {
      console.error('Failed to fetch weather forecast:', error);
      throw error;
    }
  }

  // Validate sensor data against weather API (uses current weather)
  async validateSensorData(
    sensorData: { temperature: number; humidity: number },
    lat: number,
    lon: number
  ): Promise<WeatherValidation> {
    try {
      const weatherData = await this.getCurrentWeather(lat, lon);
      
      const temperatureDiff = Math.abs(sensorData.temperature - weatherData.temperature);
      const humidityDiff = Math.abs(sensorData.humidity - weatherData.humidity);
      
      const outliers: string[] = [];
      const recommendations: string[] = [];
      
      // Temperature validation (allowing for greenhouse effect)
      if (temperatureDiff > 10) {
        outliers.push(`Temperature difference: ${temperatureDiff.toFixed(1)}°C`);
        recommendations.push('Check air temperature sensor calibration');
      }
      
      // Humidity validation
      if (humidityDiff > 25) {
        outliers.push(`Humidity difference: ${humidityDiff.toFixed(1)}%`);
        recommendations.push('Check air humidity sensor calibration');
      }
      
      // Determine reliability
      let sensorReliability: 'high' | 'medium' | 'low' = 'high';
      if (outliers.length > 1 || temperatureDiff > 15 || humidityDiff > 30) {
        sensorReliability = 'low';
      } else if (outliers.length > 0 || temperatureDiff > 7 || humidityDiff > 15) {
        sensorReliability = 'medium';
      }
      
      if (sensorReliability === 'high') {
        recommendations.push('Sensor data appears reliable');
      }
      
      return {
        sensorReliability,
        temperatureDiff,
        humidityDiff,
        outliers,
        recommendations
      };
    } catch (error) {
      console.error('Weather validation failed:', error);
      return {
        sensorReliability: 'low',
        temperatureDiff: 0,
        humidityDiff: 0,
        outliers: ['Weather API unavailable'],
        recommendations: ['Cannot validate sensor data - using cached data or check connection']
      };
    }
  }

  // Clear cache manually (useful for testing)
  public clearCache(): void {
    this.weatherCache.clear();
    this.pendingRequests.clear();
    try {
      localStorage.removeItem('weather_cache');
    } catch (error) {
      console.error('Failed to clear weather cache from storage:', error);
    }
  }

  // Reset API call counter (admin function)
  public resetApiCallCounter(): void {
    this.apiCallTracker = {
      count: 0,
      resetTime: Date.now() + (24 * 60 * 60 * 1000),
      lastCallTime: 0
    };
    this.saveApiCallTracker();
  }
}

// Default coordinates (can be updated based on user location)
export const DEFAULT_LOCATION = {
  lat: 28.6139, // New Delhi
  lon: 77.2090
};

export const weatherService = new WeatherService();

// Get user location (with fallback)
export async function getUserLocation(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(DEFAULT_LOCATION);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      () => {
        // Fallback to default location if permission denied
        resolve(DEFAULT_LOCATION);
      },
      { timeout: 5000 }
    );
  });
}
