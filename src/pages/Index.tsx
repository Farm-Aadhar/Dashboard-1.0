import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { SensorCard } from '@/components/dashboard/SensorCard';
import { SensorChart } from '@/components/dashboard/SensorChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  node_id: string;
  temperature: number;
  humidity: number;
  soil_moisture: number;
  air_quality_mq135: number;
  alcohol_mq3: number;
  smoke_mq2: number;
  timestamp: string;
}

const Index = () => {
  const { t } = useLanguage();
  const [latestData, setLatestData] = useState<SensorReading | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGraph, setSelectedGraph] = useState('ppm');

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
          
          // Add to chart data
          setChartData(prev => {
            const newData = [...prev];
            newData.push({
              time: new Date(newReading.timestamp).toLocaleTimeString(),
              temperature: newReading.temperature,
              humidity: newReading.humidity,
              soilMoisture: newReading.soil_moisture || 0
            });
            
            // Keep only last 20 data points
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
          temperature: reading.temperature ?? 0,
          humidity: reading.humidity ?? 0,
          soilMoisture: reading.soil_moisture ?? 0,
          airQuality: reading.air_quality_mq135 ?? 0,
          alcohol: reading.alcohol_mq3 ?? 0,
          smoke: reading.smoke_mq2 ?? 0
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
      {/* Sensor Status Cards - Soil Node */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
        <SensorCard
          title="Soil Level Temp"
          value={latestData?.temperature?.toFixed(1) || '0.0'}
          unit="°C"
          icon={<Thermometer className="h-5 w-5" />}
          status={getStatus(latestData?.temperature || 0, 'temperature')}
          trend={{ value: 5, type: 'up' }}
        />
        <SensorCard
          title="Soil Moisture"
          value={latestData?.soil_moisture?.toFixed(1) || '0.0'}
          unit="%"
          icon={<TreePine className="h-5 w-5" />}
          status={getStatus(latestData?.soil_moisture || 0, 'soil')}
          trend={{ value: 8, type: 'up' }}
        />
        <SensorCard
          title="Soil Level Humidity"
          value={latestData?.humidity?.toFixed(1) || '0.0'}
          unit="%"
          icon={<Droplets className="h-5 w-5" />}
          status={getStatus(latestData?.humidity || 0, 'humidity')}
          trend={{ value: 2, type: 'down' }}
        />
      </div>
      {/* Sensor Status Cards - Air Node */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-4">
        <SensorCard
          title="Air Temp"
          value={latestData?.temperature?.toFixed(1) || '0.0'}
          unit="°C"
          icon={<Thermometer className="h-5 w-5" />}
          status={getStatus(latestData?.temperature || 0, 'temperature')}
          trend={{ value: 4, type: 'up' }}
        />
        <SensorCard
          title="Air Humidity"
          value={latestData?.humidity?.toFixed(1) || '0.0'}
          unit="%"
          icon={<CloudDrizzle className="h-5 w-5" />}
          status={getStatus(latestData?.humidity || 0, 'humidity')}
          trend={{ value: 3, type: 'down' }}
        />
        <SensorCard
          title="Smoke"
          value={latestData?.smoke_mq2 || '0'}
          unit="ppm"
          icon={<AlertTriangle className="h-5 w-5" />}
          status={getStatus(latestData?.smoke_mq2 || 0, 'air')}
          trend={{ value: 1, type: 'up' }}
        />
        <SensorCard
          title="Alcohol"
          value={latestData?.alcohol_mq3 || '0'}
          unit="ppm"
          icon={<FlaskConical className="h-5 w-5" />}
          status={getStatus(latestData?.alcohol_mq3 || 0, 'air')}
          trend={{ value: 2, type: 'down' }}
        />
        <SensorCard
          title="Air Quality"
          value={latestData?.air_quality_mq135 || '0'}
          unit="ppm"
          icon={<Wind className="h-5 w-5" />}
          status={getStatus(latestData?.air_quality_mq135 || 0, 'air')}
          trend={{ value: 3, type: 'down' }}
        />
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
            lines={["temperature", "humidity"]}
          />
        )}
      </div>
    </div>
  );
}

export default Index;
