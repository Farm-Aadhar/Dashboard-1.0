import React, { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { globalThresholdService } from '@/lib/globalThresholdService';
import { SensorThreshold } from '@/components/settings/ThresholdSettings';
import { CROP_PRESETS } from '@/lib/globalThresholdService';

interface ThresholdTooltipProps {
  sensorKey: string;
  children: React.ReactNode;
  showCalibrationInfo?: boolean;
}

const ThresholdTooltip: React.FC<ThresholdTooltipProps> = ({ 
  sensorKey, 
  children, 
  showCalibrationInfo = true 
}) => {
  const [thresholds, setThresholds] = useState<Record<string, SensorThreshold>>({});
  const [currentPreset, setCurrentPreset] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = globalThresholdService.subscribe((newThresholds) => {
      setThresholds(newThresholds);
      setCurrentPreset(globalThresholdService.getCurrentPreset());
    });
    return unsubscribe;
  }, []);

  const threshold = thresholds[sensorKey];
  
  if (!threshold) {
    return <>{children}</>;
  }

  const formatValue = (value: number) => {
    return value % 1 === 0 ? value.toString() : value.toFixed(1);
  };

  const getStatusText = (value: number) => {
    if (value < threshold.low) return { text: 'CRITICAL LOW', color: 'text-red-600' };
    if (value > threshold.high) return { text: 'CRITICAL HIGH', color: 'text-red-600' };
    return { text: 'OPTIMAL', color: 'text-green-600' };
  };

  const getCurrentValue = () => {
    // This would ideally come from latest sensor data
    // For now, we'll show the midpoint as an example
    return (threshold.low + threshold.high) / 2;
  };

  const currentValue = getCurrentValue();
  const status = getStatusText(currentValue);
  const presetInfo = currentPreset ? CROP_PRESETS.find(p => p.id === currentPreset) : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          className="max-w-sm p-4 space-y-3 bg-white border border-gray-200 shadow-lg"
          side="bottom"
          sideOffset={8}
        >
          <div className="space-y-2">
            {/* Sensor Header */}
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">{threshold.label}</h4>
              <span className="text-xs text-gray-500">{threshold.unit}</span>
            </div>

            {/* Current Status */}
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-600">Current Status:</span>
              <span className={`text-sm font-medium ${status.color}`}>
                {status.text}
              </span>
            </div>

            {/* Threshold Ranges */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-red-600">Critical Low:</span>
                <span className="font-mono">&lt; {formatValue(threshold.low)}{threshold.unit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Optimal Range:</span>
                <span className="font-mono">{formatValue(threshold.low)} - {formatValue(threshold.high)}{threshold.unit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-600">Critical High:</span>
                <span className="font-mono">&gt; {formatValue(threshold.high)}{threshold.unit}</span>
              </div>
            </div>

            {/* Calibration Info */}
            {showCalibrationInfo && (
              <>
                <div className="border-t pt-2">
                  {presetInfo ? (
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Preset:</span> {presetInfo.name}
                      <br />
                      <span className="text-gray-500">{presetInfo.description}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Source:</span> Manual calibration
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-500 border-t pt-2">
                  💡 <span className="font-medium">Tip:</span> Use Global Calibration to auto-adjust all thresholds based on current readings
                </div>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ThresholdTooltip;