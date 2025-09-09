import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SensorCard } from '@/components/dashboard/SensorCard';
import { SensorChart } from '@/components/dashboard/SensorChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PastRecordsTable } from '@/components/dashboard/PastRecordsTable';
import { getStatusWithThresholds } from '@/components/settings/ThresholdSettings';
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
import TrendAnalysis from '@/components/dashboard/TrendAnalysis';

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
  const { user, loading: authLoading } = useAuth();
  const [latestData, setLatestData] = useState<SensorReading | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGraph, setSelectedGraph] = useState('ppm');

  const fetchSensorData = useCallback(async () => {
    try {
      // Fetch latest reading
      const { data: latest, error: latestError } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1);

      if (latest && latest.length > 0) {
        setLatestData(latest[0]);
      }

      // Fetch last 20 readings for chart
      const { data: readings, error: readingsError } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);

      if (readings && readings.length > 0) {
        const chartData = readings.reverse().map(reading => ({
          time: new Date(reading.timestamp).toLocaleTimeString(),
          temperature: ((reading as any).soil_temperature ?? reading.temperature) ?? 0,
          humidity: ((reading as any).soil_humidity ?? reading.humidity) ?? 0,
          soilMoisture: reading.soil_moisture ?? 0,
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
      
      if (latestError) {
        console.error('Error fetching latest data:', latestError);
      }
      if (readingsError) {
        console.error('Error fetching readings:', readingsError);
      }
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      toast.error('Failed to fetch sensor data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Optimized real-time data update callback
  const updateChartData = useCallback((newReading: SensorReading) => {
    setChartData(prev => {
      const newDataPoint = {
        time: new Date(newReading.timestamp).toLocaleTimeString(),
        temperature: newReading.soil_temperature ?? newReading.temperature ?? 0,
        humidity: newReading.soil_humidity ?? newReading.humidity ?? 0,
        soilMoisture: newReading.soil_moisture ?? 0,
        airTemperature: newReading.air_temperature ?? newReading.temperature ?? 0,
        airHumidity: newReading.air_humidity ?? newReading.humidity ?? 0,
        airQuality: newReading.air_air_quality_mq135 ?? newReading.air_quality_mq135 ?? 0,
        alcohol: newReading.air_alcohol_mq3 ?? newReading.alcohol_mq3 ?? 0,
        smoke: newReading.air_smoke_mq2 ?? newReading.smoke_mq2 ?? 0
      };
      
      // Only update if this is actually new data (avoid duplicate updates)
      const lastTime = prev[prev.length - 1]?.time;
      if (lastTime === newDataPoint.time) {
        return prev; // No change if same timestamp
      }
      
      const newData = [...prev, newDataPoint];
      return newData.slice(-20); // Keep only last 20 points
    });
  }, []);

  useEffect(() => {
    // Don't fetch data if authentication is still loading or user is not authenticated
    if (authLoading || !user) {
      return;
    }

    let mounted = true;
    
    const setupRealtimeAndFetch = async () => {
      // Fetch initial data
      await fetchSensorData();
      
      if (!mounted) return;
      
      // Set up real-time subscription with unique channel name
      const channel = supabase
        .channel('index-kpi-updates', {
          config: {
            presence: {
              key: `user-${Date.now()}`
            }
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'sensor_readings'
          },
          (payload) => {
            if (!mounted) return;
            console.log('Real-time update received in Index:', payload);
            const newReading = payload.new as SensorReading;
            setLatestData(newReading);
            updateChartData(newReading);
            toast.success('New sensor data received!');
          }
        )
        .subscribe();
        
      return () => {
        mounted = false;
        console.log('Cleaning up Index subscription');
        if (channel) {
          supabase.removeChannel(channel);
        }
      };
    };
    
    const cleanup = setupRealtimeAndFetch();
    
    return () => {
      mounted = false;
      cleanup.then(cleanupFn => cleanupFn && cleanupFn());
    };
  }, [user, authLoading, fetchSensorData, updateChartData]);

  // Optimistic reload effect for KPI cards - refresh every 5 seconds (reduced frequency)
  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    const kpiRefreshInterval = setInterval(async () => {
      try {
        // Fetch only the latest reading for KPI cards optimization
        const { data: latest, error } = await supabase
          .from('sensor_readings')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(1);

        if (latest && latest.length > 0 && !error) {
          // Only update if the timestamp is different (avoid unnecessary updates)
          setLatestData(prev => {
            if (prev && prev.timestamp === latest[0].timestamp) {
              return prev; // No change
            }
            console.log('KPI cards optimistically updated');
            return latest[0];
          });
        }
      } catch (error) {
        console.error('Error in optimistic KPI refresh:', error);
      }
    }, 5000); // Refresh every 5 seconds (reduced from 2 seconds)

    return () => {
      clearInterval(kpiRefreshInterval);
    };
  }, [user, authLoading]);

  const getStatus = useCallback((value: number, type: 'air_temperature' | 'air_humidity' | 'air_quality_mq135' | 'alcohol_mq3' | 'smoke_mq2' | 'soil_temperature' | 'soil_humidity' | 'soil_moisture' | 'temperature' | 'humidity' | 'soil' | 'air' | 'alcohol' | 'smoke' | 'airquality') => {
    // Map legacy types to new threshold types
    const thresholdTypeMap = {
      'temperature': 'air_temperature',
      'humidity': 'air_humidity', 
      'soil': 'soil_moisture',
      'air': 'air_quality_mq135',
      'alcohol': 'alcohol_mq3',
      'smoke': 'smoke_mq2',
      'airquality': 'air_quality_mq135'
    } as const;

    const mappedType = thresholdTypeMap[type as keyof typeof thresholdTypeMap] || type;
    
    // Use the dynamic threshold system if available
    if (['air_temperature', 'air_humidity', 'air_quality_mq135', 'alcohol_mq3', 'smoke_mq2', 'soil_temperature', 'soil_humidity', 'soil_moisture'].includes(mappedType)) {
      return getStatusWithThresholds(value, mappedType as any);
    }
    
    // Fallback to hardcoded values for any unmapped types
    switch (type) {
      case 'temperature':
        if (value < 18 || value > 35) return 'critical';
        if (value < 20 || value > 32) return 'warning';
        return 'healthy';
      case 'humidity':
        if (value < 30 || value > 85) return 'critical';
        if (value < 40 || value > 80) return 'warning';
        return 'healthy';
      case 'soil':
        if (value < 15 || value > 85) return 'critical';
        if (value < 25 || value > 75) return 'warning';
        return 'healthy';
      case 'airquality':
        if (value > 3500) return 'critical';
        if (value > 3000) return 'warning';
        return 'healthy';
      case 'alcohol':
        if (value > 1500) return 'critical';
        if (value > 1200) return 'warning';
        return 'healthy';
      case 'smoke':
        if (value > 2500) return 'critical';
        if (value > 2200) return 'warning';
        return 'healthy';
      case 'air':
        if (value > 3500) return 'critical';
        if (value > 3000) return 'warning';
        return 'healthy';
      default:
        return 'healthy';
    }
  }, []);

  // Memoize chart props to prevent unnecessary re-renders
  const chartProps = useMemo(() => ({
    ppm: {
      data: chartData,
      title: "Air Values (Temperature, Humidity, Air Quality, Alcohol, Smoke)",
      lines: ["airTemperature", "airHumidity", "airQuality", "alcohol", "smoke"]
    },
    soil: {
      data: chartData,
      title: "Soil Values (Moisture, Temperature, Humidity)",
      lines: ["soilMoisture", "temperature", "humidity"]
    },
    compare: {
      data: chartData,
      title: "Air vs Soil Comparison (Temperature & Humidity)",
      lines: ["airTemperature", "airHumidity", "temperature", "humidity"],
      colorScheme: "blue-orange" as const
    }
  }), [chartData]);
  if (authLoading || loading) {
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
      <div className="
  grid grid-cols-2 gap-4 mb-4 justify-center items-stretch 
  md:flex md:flex-wrap
">
        <div className="flex flex-col gap-4 w-full sm:w-1/2 lg:w-1/4 min-w-[220px]">
          <SensorCard
            title="Soil Level Temp"
            value={((latestData as any)?.soil_temperature ?? latestData?.temperature ?? 0).toFixed(1)}
            unit="°C"
            icon={<Thermometer className="h-5 w-5" />}
            status={getStatus((latestData as any)?.soil_temperature ?? latestData?.temperature ?? 0, 'soil_temperature')}
            sensorType="soil_temperature"
            trend={{ value: 5, type: 'up' }}
          />
        </div>
        <div className="flex flex-col gap-4 w-full sm:w-1/2 lg:w-1/4 min-w-[220px]">
          <SensorCard
            title="Soil Moisture"
            value={latestData?.soil_moisture?.toFixed(1) || '0.0'}
            unit="%"
            icon={<TreePine className="h-5 w-5" />}
            status={getStatus(latestData?.soil_moisture ?? 0, 'soil_moisture')}
            sensorType="soil_moisture"
            trend={{ value: 8, type: 'up' }}
          />
        </div>
        <div className="flex flex-col gap-4 w-full sm:w-1/2 lg:w-1/4 min-w-[220px]">
          <SensorCard
            title="Soil Level Humidity"
            value={((latestData as any)?.soil_humidity ?? latestData?.humidity ?? 0).toFixed(1)}
            unit="%"
            icon={<Droplets className="h-5 w-5" />}
            status={getStatus((latestData as any)?.soil_humidity ?? latestData?.humidity ?? 0, 'soil_humidity')}
            sensorType="soil_humidity"
            trend={{ value: 2, type: 'down' }}
          />
        </div>
        <div className="flex flex-col gap-4 w-full sm:w-1/2 lg:w-1/4 min-w-[220px]">
          <SensorCard
            title="Air Temp"
            value={((latestData as any)?.air_temperature ?? 0).toFixed(1)}
            unit="°C"
            icon={<Thermometer className="h-5 w-5" />}
            status={getStatus((latestData as any)?.air_temperature ?? 0, 'air_temperature')}
            sensorType="air_temperature"
            trend={{ value: 4, type: 'up' }}
          />
        </div>
        <div className="flex flex-col gap-4 w-full sm:w-1/2 lg:w-1/4 min-w-[220px]">
          <SensorCard
            title="Air Humidity"
            value={((latestData as any)?.air_humidity ?? 0).toFixed(1)}
            unit="%"
            icon={<CloudDrizzle className="h-5 w-5" />}
            status={getStatus((latestData as any)?.air_humidity ?? 0, 'air_humidity')}
            sensorType="air_humidity"
            trend={{ value: 3, type: 'down' }}
          />
        </div>
        <div className="flex flex-col gap-4 w-full sm:w-1/2 lg:w-1/4 min-w-[220px]">
          <SensorCard
            title="Smoke"
            value={((latestData as any)?.air_smoke_mq2 ?? latestData?.smoke_mq2 ?? 0)}
            unit="ppm"
            icon={<AlertTriangle className="h-5 w-5" />}
            status={getStatus((latestData as any)?.air_smoke_mq2 ?? latestData?.smoke_mq2 ?? 0, 'smoke_mq2')}
            sensorType="smoke_mq2"
            trend={{ value: 1, type: 'up' }}
          />
        </div>
        <div className="flex flex-col gap-4 w-full sm:w-1/2 lg:w-1/4 min-w-[220px]">
          <SensorCard
            title="Alcohol"
            value={((latestData as any)?.air_alcohol_mq3 ?? latestData?.alcohol_mq3 ?? 0)}
            unit="ppm"
            icon={<FlaskConical className="h-5 w-5" />}
            status={getStatus((latestData as any)?.air_alcohol_mq3 ?? latestData?.alcohol_mq3 ?? 0, 'alcohol_mq3')}
            sensorType="alcohol_mq3"
            trend={{ value: 2, type: 'down' }}
          />
        </div>
        <div className="flex flex-col gap-4 w-full sm:w-1/2 lg:w-1/4 min-w-[220px]">
          <SensorCard
            title="Air Quality"
            value={((latestData as any)?.air_air_quality_mq135 ?? latestData?.air_quality_mq135 ?? 0)}
            unit="ppm"
            icon={<Wind className="h-5 w-5" />}
            status={getStatus((latestData as any)?.air_air_quality_mq135 ?? latestData?.air_quality_mq135 ?? 0, 'air_quality_mq135')}
            sensorType="air_quality_mq135"
            trend={{ value: 3, type: 'down' }}
          />
        </div>
      </div>
      {/* Trend Analysis Widget */}
        <TrendAnalysis farmData={chartData.slice(-10)} />

      {/* Graph Selector Tabs */}
      <div className="my-8">
        <div className="flex border-b border-border mb-6">
          {[
            { key: 'soil', label: 'Soil Values' },
            { key: 'ppm', label: 'Air Values' },
            { key: 'compare', label: 'Air vs Soil' }
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
          <SensorChart {...chartProps.ppm} />
        )}
        {selectedGraph === 'soil' && (
          <SensorChart {...chartProps.soil} />
        )}
        {selectedGraph === 'compare' && (
          <SensorChart {...chartProps.compare} />
        )}
      </div>
      {/* Past Records Table */}
      <PastRecordsTable />
    </div>
  );
}

export default Index;
