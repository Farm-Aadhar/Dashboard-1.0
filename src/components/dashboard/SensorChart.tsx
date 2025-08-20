import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartDataPoint {
  time: string;
  temperature: number;
  humidity: number;
  soilMoisture: number;
  airQuality: number;
  alcohol: number;
  smoke: number;
}

interface SensorChartProps {
  data: ChartDataPoint[];
  title: string;
  lines?: string[];
}

export function SensorChart({ data, title, lines }: SensorChartProps) {
  const hasData = Array.isArray(data) && data.length > 0;
  // Default lines to all if not provided
  const allLines = [
    { key: "temperature", color: "hsl(var(--temperature))", name: "Temperature (°C)" },
    { key: "humidity", color: "hsl(var(--humidity))", name: "Humidity (%)" },
    { key: "soilMoisture", color: "hsl(var(--soil))", name: "Soil Moisture (%)" },
    { key: "airQuality", color: "#6c63ff", name: "Air Quality (ppm)" },
    { key: "alcohol", color: "#ffb347", name: "Alcohol (ppm)" },
    { key: "smoke", color: "#ff6f61", name: "Smoke (ppm)" }
  ];
  const selectedLines = (lines && lines.length > 0)
    ? allLines.filter(l => lines.includes(l.key))
    : allLines;
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
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                />
                {selectedLines.map(l => (
                  <Line
                    key={l.key}
                    type="monotone"
                    dataKey={l.key}
                    stroke={l.color}
                    strokeWidth={2}
                    dot={{ fill: l.color, strokeWidth: 2 }}
                    name={l.name}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-lg text-muted-foreground">No Data Received</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
