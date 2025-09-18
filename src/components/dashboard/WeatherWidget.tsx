import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Thermometer, Droplets, Wind, Eye, Cloud, MapPin, RefreshCw } from "lucide-react";
import { weatherService, getUserLocation, WeatherData, WeatherValidation } from "@/lib/weatherService";
import { Button } from "@/components/ui/button";

interface WeatherWidgetProps {
  farmData?: any[];
  onValidationUpdate?: (validation: WeatherValidation) => void;
}

export function WeatherWidget({ farmData, onValidationUpdate }: WeatherWidgetProps) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [validation, setValidation] = useState<WeatherValidation | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchWeatherData = async () => {
    setLoading(true);

    try {
      const location = await getUserLocation();
      const weather = await weatherService.getCurrentWeather(location.lat, location.lon);
      setWeatherData(weather);

      // Validate sensor data if available
      if (farmData && farmData.length > 0) {
        const latestSensorData = farmData[farmData.length - 1];
        const weatherValidation = await weatherService.validateSensorData(
          {
            temperature: latestSensorData.temperature || latestSensorData.air_temperature,
            humidity: latestSensorData.humidity || latestSensorData.air_humidity
          },
          location.lat,
          location.lon
        );
        setValidation(weatherValidation);
        onValidationUpdate?.(weatherValidation);
      }
    } catch (err) {
      // Silent fallback - weather service handles all errors internally
      console.warn('Weather service fallback used:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherData();
  }, [farmData]);

  const getReliabilityColor = (reliability: string) => {
    switch (reliability) {
      case 'high': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'low': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Loading Weather Data...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weatherData) return null;

  return (
    <div className="space-y-4">
      {/* Weather Data Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            External Weather Data
            <Button variant="ghost" size="sm" onClick={fetchWeatherData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {weatherData.location.name}, {weatherData.location.country}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-red-500" />
              <div>
                <div className="font-medium">{weatherData.temperature}°C</div>
                <div className="text-xs text-muted-foreground">Temperature</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              <div>
                <div className="font-medium">{weatherData.humidity}%</div>
                <div className="text-xs text-muted-foreground">Humidity</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-gray-500" />
              <div>
                <div className="font-medium">{weatherData.windSpeed} m/s</div>
                <div className="text-xs text-muted-foreground">Wind Speed</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-purple-500" />
              <div>
                <div className="font-medium">{(weatherData.visibility / 1000).toFixed(1)} km</div>
                <div className="text-xs text-muted-foreground">Visibility</div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <img 
                src={`https://openweathermap.org/img/w/${weatherData.icon}.png`} 
                alt={weatherData.description}
                className="w-8 h-8"
              />
              <div>
                <div className="font-medium capitalize">{weatherData.description}</div>
                <div className="text-xs text-muted-foreground">
                  {weatherData.cloudCover}% cloud cover
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sensor Validation Card */}
      {validation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge className={getReliabilityColor(validation.sensorReliability)}>
                {validation.sensorReliability.toUpperCase()} RELIABILITY
              </Badge>
              Sensor Data Validation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium">Temperature Difference</div>
                  <div className="text-lg font-mono">
                    {validation.temperatureDiff.toFixed(1)}°C
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Humidity Difference</div>
                  <div className="text-lg font-mono">
                    {validation.humidityDiff.toFixed(1)}%
                  </div>
                </div>
              </div>
              
              {validation.outliers.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Data Outliers</div>
                  <div className="space-y-1">
                    {validation.outliers.map((outlier, index) => (
                      <div key={index} className="text-sm p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                        ⚠️ {outlier}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <div className="text-sm font-medium mb-2">Recommendations</div>
                <div className="space-y-1">
                  {validation.recommendations.map((rec, index) => (
                    <div key={index} className="text-sm p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                      💡 {rec}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
