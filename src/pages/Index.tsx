import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { SensorCard } from '@/components/dashboard/SensorCard';
import { SensorChart } from '@/components/dashboard/SensorChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PastRecordsTable } from '@/components/dashboard/PastRecordsTable';
import {
  Thermometer,
  Droplets,
  TreePine,
  Wind,
  TrendingUp,
  AlertTriangle,
  FlaskConical,
  CloudDrizzle
} from 'lucide-react';
import { toast } from 'sonner';

interface SensorReading {
  id: string;
  timestamp: string;
  air_temperature?: number;
  air_humidity?: number;
  air_air_quality_mq135?: number;
  air_alcohol_mq3?: number;
  air_smoke_mq2?: number;
  soil_temperature?: number;
  soil_humidity?: number;
  soil_moisture?: number;
  // fallback for old fields
  temperature?: number;
  humidity?: number;
  air_quality_mq135?: number;
  alcohol_mq3?: number;
  smoke_mq2?: number;
}

const Index = () => {
  const { t } = useLanguage();
  const [latestData, setLatestData] = useState<SensorReading | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGraph, setSelectedGraph] = useState('ppm');

  const fetchSensorData = async () => {
    try {
      // Fetch latest reading
      const { data: latest } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (latest) {
        setLatestData(latest);
      }

      // Fetch last 20 readings for chart
      const { data: readings } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);

      if (readings && readings.length > 0) {
        const chartData = readings.reverse().map(reading => ({
          time: new Date(reading.timestamp).toLocaleTimeString(),
          temperature: ((reading as any).soil_temperature ?? reading.temperature) ?? 0,
          humidity: ((reading as any).soil_humidity ?? reading.humidity) ?? 0,
          soilMoisture: reading.soil_moisture ?? null,
          airTemperature: ((reading as any).air_temperature ?? reading.temperature) ?? 0,
          airHumidity: ((reading as any).air_humidity ?? reading.humidity) ?? 0,
          airQuality: ((reading as any).air_air_quality_mq135 ?? reading.air_quality_mq135) ?? 0,
          alcohol: ((reading as any).air_alcohol_mq3 ?? reading.alcohol_mq3) ?? 0,
          smoke: ((reading as any).air_smoke_mq2 ?? reading.smoke_mq2) ?? 0
        }));
        setChartData(chartData);
      } else {
        setChartData([]);
      }
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      toast.error('Failed to fetch sensor data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensorData();
    // Set up real-time subscription
    const channel = supabase
      .channel('sensor-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_readings'
        },
        (payload) => {
          const newReading = payload.new as SensorReading;
          setLatestData(newReading);
          setChartData(prev => {
            const newData = [...prev];
            newData.push({
              time: new Date(newReading.timestamp).toLocaleTimeString(),
              temperature: newReading.soil_temperature ?? newReading.temperature ?? 0,
              humidity: newReading.soil_humidity ?? newReading.humidity ?? 0,
              soilMoisture: newReading.soil_moisture ?? null,
              airTemperature: newReading.air_temperature ?? null,
              airHumidity: newReading.air_humidity ?? null,
              airQuality: newReading.air_air_quality_mq135 ?? newReading.air_quality_mq135 ?? 0,
              alcohol: newReading.air_alcohol_mq3 ?? newReading.alcohol_mq3 ?? 0,
              smoke: newReading.air_smoke_mq2 ?? newReading.smoke_mq2 ?? 0
            });
            return newData.slice(-20);
          });
          toast.success('New sensor data received!');
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatus = (value: number, type: 'temperature' | 'humidity' | 'soil' | 'air') => {
    switch (type) {
      case 'temperature':
        if (value < 18 || value > 32) return 'critical';
        if (value < 20 || value > 30) return 'warning';
        return 'healthy';
      case 'humidity':
        if (value < 40 || value > 80) return 'critical';
        if (value < 50 || value > 70) return 'warning';
        return 'healthy';
      case 'soil':
        if (value < 20 || value > 80) return 'critical';
        if (value < 30 || value > 70) return 'warning';
        return 'healthy';
      case 'air':
        if (value > 200) return 'critical';
        if (value > 100) return 'warning';
        return 'healthy';
      default:
        return 'healthy';
    }
  };
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Responsive KPI Cards */}
      <div className="flex flex-wrap gap-4 mb-4 justify-center items-stretch">
        <div className="flex flex-col gap-4 w-full sm:w-1/2 lg:w-1/4 min-w-[220px]">
          <SensorCard
            title="Soil Level Temp"
            value={((latestData as any)?.soil_temperature ?? latestData?.temperature ?? 0).toFixed(1)}
            unit="°C"
            icon={<Thermometer className="h-5 w-5" />}
            status={getStatus((latestData as any)?.soil_temperature ?? latestData?.temperature ?? 0, 'temperature')}
            trend={{ value: 5, type: 'up' }}
          />
        </div>
        <div className="flex flex-col gap-4 w-full sm:w-1/2 lg:w-1/4 min-w-[220px]">
          <SensorCard
            title="Soil Moisture"
            value={latestData?.soil_moisture?.toFixed(1) || '0.0'}
            unit="%"
            icon={<TreePine className="h-5 w-5" />}
            status={getStatus(latestData?.soil_moisture ?? 0, 'soil')}
            trend={{ value: 8, type: 'up' }}
          />
        </div>
        <div className="flex flex-col gap-4 w-full sm:w-1/2 lg:w-1/4 min-w-[220px]">
          <SensorCard
            title="Soil Level Humidity"
            value={((latestData as any)?.soil_humidity ?? latestData?.humidity ?? 0).toFixed(1)}
            unit="%"
            icon={<Droplets className="h-5 w-5" />}
            status={getStatus((latestData as any)?.soil_humidity ?? latestData?.humidity ?? 0, 'humidity')}
            trend={{ value: 2, type: 'down' }}
          />
        </div>
        <div className="flex flex-col gap-4 w-full sm:w-1/2 lg:w-1/4 min-w-[220px]">
          <SensorCard
            title="Air Temp"
            value={((latestData as any)?.air_temperature ?? 0).toFixed(1)}
            unit="°C"
            icon={<Thermometer className="h-5 w-5" />}
            status={getStatus((latestData as any)?.air_temperature ?? 0, 'temperature')}
            trend={{ value: 4, type: 'up' }}
          />
        </div>
        <div className="flex flex-col gap-4 w-full sm:w-1/2 lg:w-1/4 min-w-[220px]">
          <SensorCard
            title="Air Humidity"
            value={((latestData as any)?.air_humidity ?? 0).toFixed(1)}
            unit="%"
            icon={<CloudDrizzle className="h-5 w-5" />}
            status={getStatus((latestData as any)?.air_humidity ?? 0, 'humidity')}
            trend={{ value: 3, type: 'down' }}
          />
        </div>
        <div className="flex flex-col gap-4 w-full sm:w-1/2 lg:w-1/4 min-w-[220px]">
          <SensorCard
            title="Smoke"
            value={((latestData as any)?.air_smoke_mq2 ?? latestData?.smoke_mq2 ?? 0)}
            unit="ppm"
            icon={<AlertTriangle className="h-5 w-5" />}
            status={getStatus((latestData as any)?.air_smoke_mq2 ?? latestData?.smoke_mq2 ?? 0, 'air')}
            trend={{ value: 1, type: 'up' }}
          />
        </div>
        <div className="flex flex-col gap-4 w-full sm:w-1/2 lg:w-1/4 min-w-[220px]">
          <SensorCard
            title="Alcohol"
            value={((latestData as any)?.air_alcohol_mq3 ?? latestData?.alcohol_mq3 ?? 0)}
            unit="ppm"
            icon={<FlaskConical className="h-5 w-5" />}
            status={getStatus((latestData as any)?.air_alcohol_mq3 ?? latestData?.alcohol_mq3 ?? 0, 'air')}
            trend={{ value: 2, type: 'down' }}
          />
        </div>
        <div className="flex flex-col gap-4 w-full sm:w-1/2 lg:w-1/4 min-w-[220px]">
          <SensorCard
            title="Air Quality"
            value={((latestData as any)?.air_air_quality_mq135 ?? latestData?.air_quality_mq135 ?? 0)}
            unit="ppm"
            icon={<Wind className="h-5 w-5" />}
            status={getStatus((latestData as any)?.air_air_quality_mq135 ?? latestData?.air_quality_mq135 ?? 0, 'air')}
            trend={{ value: 3, type: 'down' }}
          />
        </div>
      </div>
      {/* Trend Analysis Widget */}
      <Card className="sensor-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm">Temperature is 10% higher than last week's average</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-sm">Humidity levels require monitoring</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Graph Selector Tabs */}
      <div className="my-8">
        <div className="flex border-b border-border mb-6">
          {[
            { key: 'soil', label: 'Soil Values' },
            { key: 'ppm', label: 'Air Values' },
            { key: 'compare', label: 'Soil vs Air' }
          ].map(tab => (
            <button
              key={tab.key}
              className={`px-6 py-2 font-medium focus:outline-none transition-colors duration-150
                ${selectedGraph === tab.key
                  ? 'border-b-2 border-primary text-primary bg-card'
                  : 'text-muted-foreground hover:text-primary'}
              `}
              style={{
                backgroundColor: selectedGraph === tab.key ? 'hsl(var(--card))' : 'transparent',
                borderColor: selectedGraph === tab.key ? 'hsl(var(--primary))' : 'transparent',
                color: selectedGraph === tab.key ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
              }}
              onClick={() => setSelectedGraph(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {selectedGraph === 'ppm' && (
          <SensorChart
            data={chartData}
            title="PPM Values (Air Quality, Alcohol, Smoke)"
            lines={["airQuality", "alcohol", "smoke"]}
          />
        )}
        {selectedGraph === 'soil' && (
          <SensorChart
            data={chartData}
            title="Soil Values (Moisture, Temp, Humidity)"
            lines={["soilMoisture", "temperature", "humidity"]}
          />
        )}
        {selectedGraph === 'compare' && (
          <SensorChart
            data={chartData}
            title="Soil vs Air Humidity & Temp"
            lines={["airTemperature", "airHumidity", "temperature", "humidity"]}
          />
        )}
      </div>
      {/* Past Records Table */}
      <PastRecordsTable />
    </div>
  );
}

export default Index;
