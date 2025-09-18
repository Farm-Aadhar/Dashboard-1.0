import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Thermometer, Droplets, Wind, Flame, TreePine, Activity, Leaf } from "lucide-react";
import { POLYHOUSE_CROP_CONDITIONS, CropCondition } from "@/lib/polyhouseCropConditions";

// Threshold types
export interface SensorThreshold {
  low: number;
  high: number;
  unit: string;
  label: string;
  icon: string; // Changed from React.ReactNode to string
  min: number;
  max: number;
  step: number;
}

// Helper function to render icons
const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'thermometer':
      return <Thermometer className="h-4 w-4" />;
    case 'droplets':
      return <Droplets className="h-4 w-4" />;
    case 'wind':
      return <Wind className="h-4 w-4" />;
    case 'flame':
      return <Flame className="h-4 w-4" />;
    case 'treepine':
      return <TreePine className="h-4 w-4" />;
    case 'activity':
      return <Activity className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

// Default threshold values centered around typical current readings with ±150 range
export const DEFAULT_THRESHOLDS = {
  temperature: {
    low: 18,
    high: 28,
    unit: "°C",
    label: "Air Temperature",
    icon: "thermometer",
    min: 0,
    max: 50,
    step: 0.5
  },
  humidity: {
    low: 40,
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
    high: 500,
    unit: "ppm",
    label: "Air Quality (MQ135)",
    icon: "wind",
    min: 0,
    max: 5000,
    step: 50
  },
  alcohol_mq3: {
    low: 30,
    high: 300,
    unit: "ppm",
    label: "Alcohol (MQ3)",
    icon: "activity",
    min: 0,
    max: 3000,
    step: 50
  },
  smoke_mq2: {
    low: 50,
    high: 400,
    unit: "ppm",
    label: "Smoke (MQ2)",
    icon: "flame",
    min: 0,
    max: 4000,
    step: 50
  },
  soil_temperature: {
    low: 15,
    high: 45,
    unit: "°C",
    label: "Soil Temperature",
    icon: "thermometer",
    min: 0,
    max: 50,
    step: 0.5
  },
  soil_humidity: {
    low: 25,
    high: 85,
    unit: "%",
    label: "Soil Humidity",
    icon: "droplets",
    min: 0,
    max: 100,
    step: 1
  },
  soil_moisture: {
    low: 25,
    high: 75,
    unit: "%",
    label: "Soil Moisture",
    icon: "treepine",
    min: 0,
    max: 100,
    step: 1
  }
};

const STORAGE_KEY = "sensor_thresholds_v1";
const CROP_STORAGE_KEY = "selected_crop_v1";

export interface ThresholdSettingsProps {
  onThresholdsChange?: (thresholds: Record<string, SensorThreshold>) => void;
}

export function ThresholdSettings({ onThresholdsChange }: ThresholdSettingsProps) {
  const [thresholds, setThresholds] = useState<Record<string, SensorThreshold>>(DEFAULT_THRESHOLDS);
  const [selectedCrop, setSelectedCrop] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  // Load saved thresholds and selected crop on component mount
  useEffect(() => {
    try {
      // Load thresholds
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = { ...DEFAULT_THRESHOLDS };
        
        // Merge saved values with defaults to ensure all fields exist
        Object.keys(merged).forEach(key => {
          if (parsed[key]) {
            merged[key] = { ...merged[key], ...parsed[key] };
          }
        });
        
        setThresholds(merged);
      }

      // Load selected crop
      const savedCrop = localStorage.getItem(CROP_STORAGE_KEY);
      if (savedCrop) {
        setSelectedCrop(savedCrop);
      }
    } catch (error) {
      console.error("Error loading thresholds:", error);
    }
  }, []);

  const updateThreshold = (sensorKey: string, type: 'low' | 'high', value: number) => {
    setThresholds(prev => {
      const newThresholds = {
        ...prev,
        [sensorKey]: {
          ...prev[sensorKey],
          [type]: value
        }
      };
      
      // Ensure low is always less than high
      if (type === 'low' && value >= newThresholds[sensorKey].high) {
        newThresholds[sensorKey].high = value + (newThresholds[sensorKey].step || 1);
      } else if (type === 'high' && value <= newThresholds[sensorKey].low) {
        newThresholds[sensorKey].low = value - (newThresholds[sensorKey].step || 1);
      }
      
      setHasChanges(true);
      return newThresholds;
    });
  };

  const saveThresholds = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds));
      localStorage.setItem(CROP_STORAGE_KEY, selectedCrop);
      setHasChanges(false);
      onThresholdsChange?.(thresholds);
      
      toast({
        title: "Thresholds Saved",
        description: "Threshold values have been updated successfully.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error Saving Thresholds",
        description: "Failed to save threshold settings. Please try again.",
        variant: "destructive"
      });
    }
  };

  const applyCropThresholds = (cropName: string) => {
    const crop = POLYHOUSE_CROP_CONDITIONS.find(c => c.cropName === cropName);
    if (!crop) return;

    const newThresholds = { ...thresholds };
    
    // Map crop conditions to thresholds
    newThresholds.temperature = {
      ...newThresholds.temperature,
      low: crop.idealAirTemperature.min,
      high: crop.idealAirTemperature.max
    };
    
    newThresholds.humidity = {
      ...newThresholds.humidity,
      low: crop.idealAirHumidity.min,
      high: crop.idealAirHumidity.max
    };
    
    newThresholds.soil_temperature = {
      ...newThresholds.soil_temperature,
      low: crop.idealSoilTemperature.min,
      high: crop.idealSoilTemperature.max
    };
    
    newThresholds.soil_humidity = {
      ...newThresholds.soil_humidity,
      low: crop.idealSoilHumidity.min,
      high: crop.idealSoilHumidity.max
    };
    
    newThresholds.soil_moisture = {
      ...newThresholds.soil_moisture,
      low: crop.idealSoilMoisture.min,
      high: crop.idealSoilMoisture.max
    };

    setThresholds(newThresholds);
    setSelectedCrop(cropName);
    setHasChanges(true);
    
    toast({
      title: "Crop Thresholds Applied",
      description: `Thresholds set for ${cropName}. Remember to save changes.`,
      variant: "default"
    });
  };

  const resetToDefaults = () => {
    setThresholds(DEFAULT_THRESHOLDS);
    setHasChanges(true);
    toast({
      title: "Reset to Defaults",
      description: "All thresholds have been reset to default values.",
      variant: "default"
    });
  };

  const getStatusColor = (value: number, threshold: SensorThreshold) => {
    if (value < threshold.low || value > threshold.high) return "destructive";
    return "secondary";
  };

  const renderThresholdSlider = (sensorKey: string, threshold: SensorThreshold) => {
    return (
      <div key={sensorKey} className="p-3 border rounded-lg bg-card">
        {/* Compact header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getIcon(threshold.icon)}
            <Label className="text-sm font-medium">{threshold.label}</Label>
          </div>
          <Badge variant="outline" className="text-xs px-2 py-1">
            {threshold.unit}
          </Badge>
        </div>

        {/* Compact thresholds in grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Low threshold - compact */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-orange-600">Low</span>
              <span className="font-mono">{threshold.low}{threshold.unit}</span>
            </div>
            <Slider
              value={[threshold.low]}
              onValueChange={([value]) => updateThreshold(sensorKey, 'low', value)}
              min={threshold.min}
              max={threshold.max}
              step={threshold.step}
              className="h-2"
            />
          </div>

          {/* High threshold - compact */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-red-600">High</span>
              <span className="font-mono">{threshold.high}{threshold.unit}</span>
            </div>
            <Slider
              value={[threshold.high]}
              onValueChange={([value]) => updateThreshold(sensorKey, 'high', value)}
              min={threshold.min}
              max={threshold.max}
              step={threshold.step}
              className="h-2"
            />
          </div>
        </div>

        {/* Compact status bar */}
        <div className="flex justify-between mt-3 text-xs">
          <span className="text-red-600">Crit: &lt;{threshold.low}</span>
          <span className="text-green-600">OK: {threshold.low}-{threshold.high}</span>
          <span className="text-red-600">Crit: &gt;{threshold.high}</span>
        </div>
      </div>
    );
  };

  const airSensors = ['temperature', 'humidity', 'air_quality_mq135', 'alcohol_mq3', 'smoke_mq2'];
  const soilSensors = ['soil_temperature', 'soil_humidity', 'soil_moisture'];

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
        <p>Set warning and critical thresholds for all sensors. Values outside these ranges trigger alerts.</p>
      </div>

      {/* Compact Crop Selection */}
      <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-green-600" />
            <h3 className="text-sm font-medium">Current Crop</h3>
          </div>
          {selectedCrop && (
            <Badge variant="secondary" className="text-xs">
              {selectedCrop}
            </Badge>
          )}
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedCrop} onValueChange={setSelectedCrop}>
            <SelectTrigger className="flex-1 h-8">
              <SelectValue placeholder="Select crop..." />
            </SelectTrigger>
            <SelectContent>
              {POLYHOUSE_CROP_CONDITIONS.map((crop) => (
                <SelectItem key={crop.cropName} value={crop.cropName}>
                  {crop.cropName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            size="sm"
            variant="outline" 
            onClick={() => selectedCrop && applyCropThresholds(selectedCrop)}
            disabled={!selectedCrop}
            className="h-8 px-3 text-xs"
          >
            Apply
          </Button>
        </div>
        
        {/* Compact ideal conditions */}
        {selectedCrop && (() => {
          const cropData = POLYHOUSE_CROP_CONDITIONS.find(c => c.cropName === selectedCrop);
          if (!cropData) return null;
          
          return (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                <div>Air: {cropData.idealAirTemperature.min}-{cropData.idealAirTemperature.max}°C</div>
                <div>Humidity: {cropData.idealAirHumidity.min}-{cropData.idealAirHumidity.max}%</div>
                <div>Soil: {cropData.idealSoilTemperature.min}-{cropData.idealSoilTemperature.max}°C</div>
              </div>
              {cropData.notes && (
                <div className="mt-1 text-blue-600 dark:text-blue-400 text-xs">{cropData.notes}</div>
              )}
            </div>
          );
        })()}
      </Card>

      {/* Compact Thresholds */}
      <Tabs defaultValue="air" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-9">
          <TabsTrigger value="air" className="flex items-center gap-2 text-sm">
            <Wind className="h-3 w-3" />
            Air Sensors
          </TabsTrigger>
          <TabsTrigger value="soil" className="flex items-center gap-2 text-sm">
            <TreePine className="h-3 w-3" />
            Soil Sensors
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="air" className="mt-4">
          <div className="grid gap-3">
            {airSensors.map(sensorKey => 
              renderThresholdSlider(sensorKey, thresholds[sensorKey])
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="soil" className="mt-4">
          <div className="grid gap-3">
            {soilSensors.map(sensorKey => 
              renderThresholdSlider(sensorKey, thresholds[sensorKey])
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Compact Action Buttons */}
      <div className="flex gap-2 pt-3 border-t">
        <Button 
          onClick={saveThresholds} 
          disabled={!hasChanges}
          className="flex-1 h-9"
          size="sm"
        >
          Save Thresholds
        </Button>
        <Button 
          variant="outline" 
          onClick={resetToDefaults}
          size="sm"
          className="h-9"
        >
          Reset
        </Button>
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-2">
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            ⚠️ Unsaved changes. Click "Save Thresholds" to apply.
          </p>
        </div>
      )}
    </div>
  );
}

// Export function to get current selected crop
export function getSelectedCrop(): string {
  try {
    return localStorage.getItem(CROP_STORAGE_KEY) || "";
  } catch (error) {
    console.error("Error loading selected crop:", error);
    return "";
  }
}

// Export function to get current thresholds for use in other components
export function getStoredThresholds(): Record<string, SensorThreshold> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const merged = { ...DEFAULT_THRESHOLDS };
      
      Object.keys(merged).forEach(key => {
        if (parsed[key]) {
          merged[key] = { ...merged[key], ...parsed[key] };
        }
      });
      
      return merged;
    }
  } catch (error) {
    console.error("Error loading stored thresholds:", error);
  }
  
  return DEFAULT_THRESHOLDS;
}

// Export function for status calculation using stored thresholds
export function getStatusWithThresholds(
  value: number, 
  type: 'temperature' | 'humidity' | 'air_quality_mq135' | 'alcohol_mq3' | 'smoke_mq2' | 'air_temperature' | 'air_humidity' | 'soil_temperature' | 'soil_humidity' | 'soil_moisture'
): 'healthy' | 'warning' | 'critical' {
  const thresholds = getStoredThresholds();
  
  // Map air sensor types to the threshold keys
  const typeMap: Record<string, string> = {
    'air_temperature': 'temperature',
    'air_humidity': 'humidity'
  };
  
  const thresholdKey = typeMap[type] || type;
  const threshold = thresholds[thresholdKey];
  
  if (!threshold) return 'healthy';
  
  // Critical if outside the low-high range
  if (value < threshold.low || value > threshold.high) {
    return 'critical';
  }
  
  // For a more nuanced warning system, we can add warning zones
  // Warning if close to the thresholds (within 10% of the range)
  const range = threshold.high - threshold.low;
  const warningMargin = range * 0.1;
  
  if (value <= threshold.low + warningMargin || value >= threshold.high - warningMargin) {
    return 'warning';
  }
  
  return 'healthy';
}
