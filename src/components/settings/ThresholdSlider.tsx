import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Flame,
  Gauge
} from 'lucide-react';
import { SensorThreshold } from '@/components/settings/ThresholdSettings';

interface ThresholdSliderProps {
  sensorKey: string;
  threshold: SensorThreshold;
  onChange: (newThreshold: SensorThreshold) => void;
  disabled?: boolean;
}

const ThresholdSlider: React.FC<ThresholdSliderProps> = ({ 
  sensorKey, 
  threshold, 
  onChange, 
  disabled = false 
}) => {
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
      default:
        return <Gauge className="h-4 w-4" />;
    }
  };

  const updateThreshold = (field: 'low' | 'high', value: number) => {
    if (disabled) return;
    
    const newThreshold = {
      ...threshold,
      [field]: value
    };
    onChange(newThreshold);
  };

  return (
    <div className="p-3 border rounded-lg bg-card">
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
            onValueChange={([value]) => updateThreshold('low', value)}
            min={threshold.min}
            max={threshold.max}
            step={threshold.step}
            className="h-2"
            disabled={disabled}
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
            onValueChange={([value]) => updateThreshold('high', value)}
            min={threshold.min}
            max={threshold.max}
            step={threshold.step}
            className="h-2"
            disabled={disabled}
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

export default ThresholdSlider;