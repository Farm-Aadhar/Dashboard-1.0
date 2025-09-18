import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getStoredThresholds } from '@/components/settings/ThresholdSettings';

interface SensorCardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: ReactNode;
  status: 'healthy' | 'warning' | 'critical';
  sensorType?: 'air_temperature' | 'air_humidity' | 'air_quality_mq135' | 'alcohol_mq3' | 'smoke_mq2' | 'soil_temperature' | 'soil_humidity' | 'soil_moisture';
  trend?: {
    value: number;
    type: 'up' | 'down';
  };
  className?: string;
  currentThresholds?: any; // Pass current thresholds from parent
}

const statusConfig = {
  healthy: {
    badge: 'status-healthy',
    text: 'Healthy',
    color: 'text-success'
  },
  warning: {
    badge: 'status-warning',
    text: 'Warning',
    color: 'text-warning'
  },
  critical: {
    badge: 'status-critical',
    text: 'Critical',
    color: 'text-destructive'
  }
};

// Helper function to get unit for sensor type
function getUnitForSensorType(sensorType: string): string {
  const unitMap = {
    'air_temperature': '°C',
    'air_humidity': '%',
    'smoke_mq2': 'ppm',
    'alcohol_mq3': 'ppm',
    'air_quality_mq135': 'ppm',
    'temperature': '°C',
    'humidity': '%'
  };
  return unitMap[sensorType as keyof typeof unitMap] || '';
}

// Function to determine threshold status text (High/Normal/Low)
function getThresholdStatus(value: number, sensorType: string, currentThresholds: any): { 
  text: string; 
  color: string; 
  icon: string;
  range: string;
  source: string;
} {
  // Try current thresholds first (from database)
  let threshold = currentThresholds?.[sensorType];
  let source = 'Database';
  
  // Fallback to stored thresholds (localStorage)
  if (!threshold) {
    const storedThresholds = getStoredThresholds();
    threshold = storedThresholds[sensorType];
    source = 'Local';
  }
  
  // Fallback to system defaults if no stored thresholds
  if (!threshold) {
    const systemDefaults = {
      'air_temperature': { low: 15, high: 35 },
      'air_humidity': { low: 40, high: 80 },
      'smoke_mq2': { low: 0, high: 1000 },
      'alcohol_mq3': { low: 0, high: 500 },
      'air_quality_mq135': { low: 0, high: 1000 },
      'temperature': { low: 15, high: 35 },
      'humidity': { low: 40, high: 80 }
    };
    threshold = systemDefaults[sensorType as keyof typeof systemDefaults];
    source = 'System Default';
  }
  
  if (!threshold) {
    return { 
      text: 'No Threshold', 
      color: 'text-muted-foreground', 
      icon: '?', 
      range: 'Not set',
      source: 'None'
    };
  }
  
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  const low = threshold.low?.toFixed(1) || '0';
  const high = threshold.high?.toFixed(1) || '0';
  const thresholdUnit = getUnitForSensorType(sensorType);
  const range = `${low}${thresholdUnit} - ${high}${thresholdUnit}`;
  
  if (numericValue < (threshold.low || 0)) {
    return { 
      text: range, 
      color: 'text-blue-600', 
      icon: '↓', 
      range,
      source
    };
  } else if (numericValue > (threshold.high || 999999)) {
    return { 
      text: range, 
      color: 'text-red-600', 
      icon: '↑', 
      range,
      source
    };
  } else {
    return { 
      text: range, 
      color: 'text-green-600', 
      icon: '○', 
      range,
      source
    };
  }
}

export function SensorCard({ 
  title, 
  value, 
  unit, 
  icon, 
  status, 
  sensorType,
  trend, 
  className,
  currentThresholds
}: SensorCardProps) {
  const statusInfo = statusConfig[status];
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Get threshold status if sensorType is provided
  const thresholdStatus = sensorType ? getThresholdStatus(numericValue, sensorType, currentThresholds) : null;

  return (
    <TooltipProvider>
      <Card className={cn("sensor-card-glow hover-scale cursor-pointer", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
            <Badge className={cn("px-2 py-1 text-xs font-medium", statusInfo.badge)}>
              {statusInfo.text}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{value}</span>
              <span className="text-sm text-muted-foreground">{unit}</span>
            </div>
            
            {/* Show threshold status with detailed tooltip */}
            {thresholdStatus && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-medium cursor-help",
                    thresholdStatus.color
                  )}>
                    <span>{thresholdStatus.icon}</span>
                    <span>{thresholdStatus.text}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs space-y-1">
                    <div><strong>Current:</strong> {value}{unit}</div>
                    <div><strong>Range:</strong> {thresholdStatus.range}</div>
                    <div><strong>Source:</strong> {thresholdStatus.source}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
            
            {/* Fallback to trend if no sensorType provided */}
            {!thresholdStatus && trend && (
              <div className={cn(
                "flex items-center gap-1 text-xs",
                trend.type === 'up' ? 'text-success' : 'text-destructive'
              )}>
                <span>{trend.type === 'up' ? '↗' : '↘'}</span>
                <span>{Math.abs(trend.value)}% from last week</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}