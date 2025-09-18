import { ReactNode, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { globalThresholdService } from '@/lib/globalThresholdService';
import { SensorThreshold } from '@/components/settings/ThresholdSettings';
import ThresholdTooltip from '@/components/ui/ThresholdTooltip';

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

// Function to determine threshold status text (High/Normal/Low)
function getThresholdStatus(value: number, sensorType: string, thresholds: Record<string, SensorThreshold>): { text: string; color: string; icon: string } {
  const threshold = thresholds[sensorType];
  
  if (!threshold) {
    return { text: 'Normal', color: 'text-muted-foreground', icon: '○' };
  }
  
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (numericValue < threshold.low) {
    return { text: 'Low', color: 'text-blue-600', icon: '↓' };
  } else if (numericValue > threshold.high) {
    return { text: 'High', color: 'text-red-600', icon: '↑' };
  } else {
    return { text: 'Normal', color: 'text-green-600', icon: '○' };
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
  className 
}: SensorCardProps) {
  const [thresholds, setThresholds] = useState<Record<string, SensorThreshold>>({});
  
  // Subscribe to global threshold changes
  useEffect(() => {
    const unsubscribe = globalThresholdService.subscribe((newThresholds) => {
      setThresholds(newThresholds);
    });
    return unsubscribe;
  }, []);

  const statusInfo = statusConfig[status];
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Get threshold status if sensorType is provided
  const thresholdStatus = sensorType ? getThresholdStatus(numericValue, sensorType, thresholds) : null;

  const sensorCard = (
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
          
          {/* Show threshold status instead of trend */}
          {thresholdStatus && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              thresholdStatus.color
            )}>
              <span>{thresholdStatus.icon}</span>
              <span>{thresholdStatus.text}</span>
            </div>
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
  );

  // Wrap with tooltip if sensorType is provided
  if (sensorType) {
    return (
      <ThresholdTooltip sensorKey={sensorType}>
        {sensorCard}
      </ThresholdTooltip>
    );
  }

  return sensorCard;
}