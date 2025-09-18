import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Thermometer, Droplets, Wind, Flame, TreePine, Activity, Settings, Zap } from "lucide-react";
import { thresholdService, ThresholdPreset, CalibrationResult } from "@/api/threshold-service";

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
  const [presets, setPresets] = useState<ThresholdPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationResults, setCalibrationResults] = useState<CalibrationResult[]>([]);
  const { toast } = useToast();

  // Load saved thresholds and presets on component mount
  useEffect(() => {
    loadThresholds();
    loadPresets();
  }, []);

  const loadThresholds = async () => {
    try {
      const currentThresholds = await thresholdService.getCurrentThresholds();
      setThresholds(currentThresholds);
    } catch (error) {
      console.error("Error loading thresholds:", error);
      // Fallback to localStorage
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
          
          setThresholds(merged);
        }
      } catch (localError) {
        console.error("Error loading from localStorage:", localError);
      }
    }
  };

  const loadPresets = async () => {
    try {
      const availablePresets = await thresholdService.getThresholdPresets();
      setPresets(availablePresets);
    } catch (error) {
      console.error("Error loading presets:", error);
    }
  };

  const applyPreset = async (presetId: string) => {
    if (!presetId) return;
    
    try {
      await thresholdService.applyPreset(presetId);
      const newThresholds = await thresholdService.getCurrentThresholds();
      setThresholds(newThresholds);
      setHasChanges(false);
      
      const presetName = presets.find(p => p.id === presetId)?.name || presetId;
      toast({
        title: "Preset Applied",
        description: `${presetName} threshold preset has been applied successfully.`,
        variant: "default"
      });
      
      onThresholdsChange?.(newThresholds);
    } catch (error) {
      console.error("Error applying preset:", error);
      toast({
        title: "Error Applying Preset",
        description: "Failed to apply the selected preset. Please try again.",
        variant: "destructive"
      });
    }
  };

  const calibrateThresholds = async () => {
    setIsCalibrating(true);
    try {
      const results = await thresholdService.calibrateThresholds(3, 5);
      setCalibrationResults(results);
      
      // Load the updated thresholds
      const newThresholds = await thresholdService.getCurrentThresholds();
      setThresholds(newThresholds);
      setHasChanges(false);
      
      toast({
        title: "Calibration Complete",
        description: `Thresholds calibrated based on ${results.length} sensor readings with 3-5% tolerance.`,
        variant: "default"
      });
      
      onThresholdsChange?.(newThresholds);
    } catch (error) {
      console.error("Error calibrating thresholds:", error);
      toast({
        title: "Calibration Failed",
        description: error instanceof Error ? error.message : "Failed to calibrate thresholds.",
        variant: "destructive"
      });
    } finally {
      setIsCalibrating(false);
    }
  };

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

  const saveThresholds = async () => {
    try {
      await thresholdService.updateThresholds(thresholds);
      setHasChanges(false);
      onThresholdsChange?.(thresholds);
      
      toast({
        title: "Settings Saved",
        description: "Sensor threshold values have been updated successfully.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error saving thresholds:", error);
      // Fallback to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds));
        setHasChanges(false);
        onThresholdsChange?.(thresholds);
        
        toast({
          title: "Settings Saved",
          description: "Sensor threshold values have been updated successfully.",
          variant: "default"
        });
      } catch (localError) {
        toast({
          title: "Error Saving Settings",
          description: "Failed to save threshold settings. Please try again.",
          variant: "destructive"
        });
      }
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

      {/* Preset Selection and Calibration */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-4 w-4" />
          <h3 className="font-medium text-foreground">Quick Setup</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Preset Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Apply Preset</Label>
            <Select value={selectedPreset} onValueChange={(value) => {
              setSelectedPreset(value);
              applyPreset(value);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a threshold preset..." />
              </SelectTrigger>
              <SelectContent>
                {presets.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id!}>
                    <div className="flex flex-col">
                      <span className="font-medium">{preset.name}</span>
                      {preset.description && (
                        <span className="text-xs text-muted-foreground">{preset.description}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Pre-configured thresholds for different farming environments
            </p>
          </div>

          {/* Calibration */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Auto-Calibrate</Label>
            <Button 
              onClick={calibrateThresholds}
              disabled={isCalibrating}
              variant="outline"
              className="w-full"
            >
              <Zap className="h-4 w-4 mr-2" />
              {isCalibrating ? "Calibrating..." : "Calibrate from Current"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Set thresholds based on latest sensor readings (±3-5% tolerance)
            </p>
          </div>
        </div>

        {/* Calibration Results */}
        {calibrationResults.length > 0 && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200 font-medium mb-2">
              ✅ Calibration Results:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {calibrationResults.map((result) => (
                <div key={result.sensor_type} className="flex justify-between">
                  <span className="text-green-700 dark:text-green-300">
                    {result.sensor_type.replace('_', ' ')}:
                  </span>
                  <span className="text-green-600 dark:text-green-400 font-mono">
                    {result.calculated_low.toFixed(1)} - {result.calculated_high.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

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
