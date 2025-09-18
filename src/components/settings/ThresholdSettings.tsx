import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Thermometer, Droplets, Wind, Flame, TreePine, Activity } from "lucide-react";

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
    low: 0,
    high: 28.5,
    unit: "°C",
    label: "Air Temperature",
    icon: "thermometer",
    min: 0,
    max: 50,
    step: 0.5
  },
  humidity: {
    low: 0,
    high: 72.0,
    unit: "%",
    label: "Air Humidity",
    icon: "droplets",
    min: 0,
    max: 100,
    step: 1
  },
  air_quality_mq135: {
    low: 0,
    high: 3385,
    unit: "ppm",
    label: "Air Quality (MQ135)",
    icon: "wind",
    min: 0,
    max: 5000,
    step: 50
  },
  alcohol_mq3: {
    low: 0,
    high: 1410,
    unit: "ppm",
    label: "Alcohol (MQ3)",
    icon: "activity",
    min: 0,
    max: 3000,
    step: 50
  },
  smoke_mq2: {
    low: 0,
    high: 2875,
    unit: "ppm",
    label: "Smoke (MQ2)",
    icon: "flame",
    min: 0,
    max: 4000,
    step: 50
  }
};

const STORAGE_KEY = "sensor_thresholds_v1";

export interface ThresholdSettingsProps {
  onThresholdsChange?: (thresholds: Record<string, SensorThreshold>) => void;
}

export function ThresholdSettings({ onThresholdsChange }: ThresholdSettingsProps) {
  const [thresholds, setThresholds] = useState<Record<string, SensorThreshold>>(DEFAULT_THRESHOLDS);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  // Load saved thresholds on component mount
  useEffect(() => {
    try {
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
      setHasChanges(false);
      onThresholdsChange?.(thresholds);
      
      toast({
        title: "Settings Saved",
        description: "Sensor threshold values have been updated successfully.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error Saving Settings",
        description: "Failed to save threshold settings. Please try again.",
        variant: "destructive"
      });
    }
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
      <Card key={sensorKey} className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          {getIcon(threshold.icon)}
          <h3 className="font-medium text-foreground">{threshold.label}</h3>
          <Badge variant="outline" className="ml-auto border-border text-muted-foreground">
            {threshold.unit}
          </Badge>
        </div>
        
        <div className="space-y-6">
          {/* Low Threshold */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium text-orange-600">
                Low Threshold (Warning Below)
              </Label>
              <span className="text-sm font-mono bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 text-orange-800 dark:text-orange-200 px-2 py-1 rounded">
                {threshold.low}{threshold.unit}
              </span>
            </div>
            <Slider
              value={[threshold.low]}
              onValueChange={([value]) => updateThreshold(sensorKey, 'low', value)}
              min={threshold.min}
              max={threshold.max}
              step={threshold.step}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{threshold.min}{threshold.unit}</span>
              <span>Critical below this value</span>
              <span>{threshold.max}{threshold.unit}</span>
            </div>
          </div>

          {/* High Threshold */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium text-red-600">
                High Threshold (Warning Above)
              </Label>
              <span className="text-sm font-mono bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200 px-2 py-1 rounded">
                {threshold.high}{threshold.unit}
              </span>
            </div>
            <Slider
              value={[threshold.high]}
              onValueChange={([value]) => updateThreshold(sensorKey, 'high', value)}
              min={threshold.min}
              max={threshold.max}
              step={threshold.step}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{threshold.min}{threshold.unit}</span>
              <span>Critical above this value</span>
              <span>{threshold.max}{threshold.unit}</span>
            </div>
          </div>

          {/* Status Zones */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 rounded bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="font-medium text-red-700 dark:text-red-300">Critical</div>
              <div className="text-red-600 dark:text-red-400">
                &lt; {threshold.low}{threshold.unit}
              </div>
            </div>
            <div className="text-center p-2 rounded bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="font-medium text-green-700 dark:text-green-300">Healthy</div>
              <div className="text-green-600 dark:text-green-400">
                {threshold.low} - {threshold.high}{threshold.unit}
              </div>
            </div>
            <div className="text-center p-2 rounded bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="font-medium text-red-700 dark:text-red-300">Critical</div>
              <div className="text-red-600 dark:text-red-400">
                &gt; {threshold.high}{threshold.unit}
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const airSensors = ['temperature', 'humidity', 'air_quality_mq135', 'alcohol_mq3', 'smoke_mq2'];

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
        <p className="font-medium mb-1">Configure threshold settings:</p>
        <p className="text-xs">
          Set warning and critical thresholds for all sensors. Values outside these ranges will trigger alerts in the dashboard, AI analysis, and reports.
        </p>
      </div>

      <div className="space-y-6">
        <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
          <p className="font-medium mb-1">Air Node Threshold Settings:</p>
          <p className="text-xs">
            Set warning and critical thresholds for air sensors. Values outside these ranges will trigger alerts in the dashboard, AI analysis, and reports.
          </p>
        </div>

        <div className="grid gap-4">
          {airSensors.map(sensorKey => 
            renderThresholdSlider(sensorKey, thresholds[sensorKey])
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t">
        <Button 
          onClick={saveThresholds} 
          disabled={!hasChanges}
          className="flex-1"
        >
          Save Settings
        </Button>
        <Button 
          variant="outline" 
          onClick={resetToDefaults}
        >
          Reset to Defaults
        </Button>
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ You have unsaved changes. Click "Save Settings" to apply them to the dashboard, AI analysis, and reports.
          </p>
        </div>
      )}
    </div>
  );
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
  type: 'temperature' | 'humidity' | 'air_quality_mq135' | 'alcohol_mq3' | 'smoke_mq2'
): 'healthy' | 'warning' | 'critical' {
  const thresholds = getStoredThresholds();
  const threshold = thresholds[type];
  
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
