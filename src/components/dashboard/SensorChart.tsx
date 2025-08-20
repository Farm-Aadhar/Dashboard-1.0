import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartDataPoint {
  time: string;
  temperature: number;
  humidity: number;
  soilMoisture: number;
}

interface SensorChartProps {
  data: ChartDataPoint[];
  title: string;
}

export function SensorChart({ data, title }: SensorChartProps) {
  return (
    <Card className="sensor-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
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
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="temperature" 
                stroke="hsl(var(--temperature))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--temperature))', strokeWidth: 2 }}
                name="Temperature (°C)"
              />
              <Line 
                type="monotone" 
                dataKey="humidity" 
                stroke="hsl(var(--humidity))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--humidity))', strokeWidth: 2 }}
                name="Humidity (%)"
              />
              <Line 
                type="monotone" 
                dataKey="soilMoisture" 
                stroke="hsl(var(--soil))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--soil))', strokeWidth: 2 }}
                name="Soil Moisture (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}