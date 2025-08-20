import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SensorCardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: ReactNode;
  status: 'healthy' | 'warning' | 'critical';
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

export function SensorCard({ 
  title, 
  value, 
  unit, 
  icon, 
  status, 
  trend, 
  className 
}: SensorCardProps) {
  const statusInfo = statusConfig[status];

  return (
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
          
          {trend && (
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
}