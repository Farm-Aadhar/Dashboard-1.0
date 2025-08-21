import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { memo, useMemo } from 'react';

interface ChartDataPoint {
  time: string;
  temperature: number;
  humidity: number;
  soilMoisture: number;
  airTemperature: number;
  airHumidity: number;
  airQuality: number;
  alcohol: number;
  smoke: number;
}

interface SensorChartProps {
  data: ChartDataPoint[];
  title: string;
  lines?: string[];
  colorScheme?: 'mixed' | 'blue-orange';
}

export const SensorChart = memo(function SensorChart({ data, title, lines, colorScheme = 'mixed' }: SensorChartProps) {
  const hasData = Array.isArray(data) && data.length > 0;
  
  // Memoize color configurations to prevent unnecessary recalculations
  const colorConfig = useMemo(() => {
    // Mixed color palette (default)
    const mixedColors = [
      { key: "temperature", color: "#e74c3c", name: "Soil Temperature (°C)" },
      { key: "humidity", color: "#3498db", name: "Soil Humidity (%)" },
      { key: "soilMoisture", color: "#2ecc71", name: "Soil Moisture (%)" },
      { key: "airTemperature", color: "#f39c12", name: "Air Temperature (°C)" },
      { key: "airHumidity", color: "#9b59b6", name: "Air Humidity (%)" },
      { key: "airQuality", color: "#1abc9c", name: "Air Quality (ppm)" },
      { key: "alcohol", color: "#e67e22", name: "Alcohol (ppm)" },
      { key: "smoke", color: "#34495e", name: "Smoke (ppm)" }
    ];

    // Blue-Orange color palette for Air vs Soil comparison
    const blueOrangeColors = [
      { key: "temperature", color: "#ff7300", name: "Soil Temperature (°C)" },
      { key: "humidity", color: "#ff9500", name: "Soil Humidity (%)" },
      { key: "soilMoisture", color: "#ffb347", name: "Soil Moisture (%)" },
      { key: "airTemperature", color: "#2196f3", name: "Air Temperature (°C)" },
      { key: "airHumidity", color: "#1976d2", name: "Air Humidity (%)" },
      { key: "airQuality", color: "#3f51b5", name: "Air Quality (ppm)" },
      { key: "alcohol", color: "#5c6bc0", name: "Alcohol (ppm)" },
      { key: "smoke", color: "#7986cb", name: "Smoke (ppm)" }
    ];

    // Select color scheme
    const allLines = colorScheme === 'blue-orange' ? blueOrangeColors : mixedColors;
    return (lines && lines.length > 0)
      ? allLines.filter(l => lines.includes(l.key))
      : allLines;
  }, [lines, colorScheme]);

  // Memoize tooltip style to prevent recreation on each render
  const tooltipStyle = useMemo(() => ({
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--foreground))'
  }), []);

  // Memoize chart lines to prevent unnecessary recreations
  const chartLines = useMemo(() => 
    colorConfig.map(l => (
      <Line
        key={l.key}
        type="monotone"
        dataKey={l.key}
        stroke={l.color}
        strokeWidth={2}
        dot={{ fill: l.color, strokeWidth: 2 }}
        name={l.name}
        isAnimationActive={false}
      />
    )), [colorConfig]);

  // Get current values (latest data point) for display
  const currentValues = useMemo(() => {
    if (!hasData || data.length === 0) return [];
    
    const latestData = data[data.length - 1];
    return colorConfig.map(config => {
      const value = latestData[config.key as keyof ChartDataPoint];
      const numericValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
      
      // Extract unit from name (everything after the last parenthesis)
      const unitMatch = config.name.match(/\(([^)]+)\)$/);
      const unit = unitMatch ? unitMatch[1] : '';
      
      // Extract label (everything before the last parenthesis)
      const label = config.name.replace(/\s*\([^)]+\)$/, '');
      
      return {
        key: config.key,
        label,
        value: numericValue.toFixed(1),
        unit,
        color: config.color
      };
    });
  }, [hasData, data, colorConfig]);

  return (
    <Card className="sensor-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="time" 
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={tooltipStyle}
                  isAnimationActive={false}
                />
                {chartLines}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-lg text-muted-foreground">No Data Received</div>
          )}
        </div>
        
        {/* Current Values Display */}
        {hasData && currentValues.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Current Values</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {currentValues.map(item => (
                <div key={item.key} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground truncate">{item.label}</p>
                    <p className="text-sm font-semibold">
                      {item.value} <span className="text-xs text-muted-foreground">{item.unit}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
