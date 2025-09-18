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
  TrendingUp,
  Thermometer,
  CloudDrizzle,
  Wind,
  FlaskConical,
  AlertTriangle,
  Heart
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
          temperature: reading.temperature ?? 0, // Use fallback temperature field
          humidity: reading.humidity ?? 0, // Use fallback humidity field
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
        temperature: newReading.temperature ?? 0, // Use fallback temperature field
        humidity: newReading.humidity ?? 0, // Use fallback humidity field
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

    // Set up real-time subscription for instant updates
    const channel = supabase
      .channel('sensor_readings_kpi')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'sensor_readings' }, 
        (payload) => {
          // Instantly update KPI cards with new data
          console.log('🚀 Real-time KPI update:', payload.new);
          setLatestData(payload.new as any);
        }
      )
      .subscribe();

    // Initial fetch for current data
    const fetchInitialData = async () => {
      try {
        const { data: latest, error } = await supabase
          .from('sensor_readings')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(1);

        if (latest && latest.length > 0 && !error) {
          setLatestData(latest[0]);
        }
      } catch (error) {
        console.error('Error fetching initial KPI data:', error);
      }
    };

    fetchInitialData();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, authLoading]);

  const getStatus = useCallback((value: number, type: 'air_temperature' | 'air_humidity' | 'air_quality_mq135' | 'alcohol_mq3' | 'smoke_mq2' | 'temperature' | 'humidity' | 'air' | 'alcohol' | 'smoke' | 'airquality') => {
    // Map legacy types to new threshold types
    const thresholdTypeMap = {
      'temperature': 'air_temperature',
      'humidity': 'air_humidity', 
      'air': 'air_quality_mq135',
      'alcohol': 'alcohol_mq3',
      'smoke': 'smoke_mq2',
      'airquality': 'air_quality_mq135'
    } as const;

    const mappedType = thresholdTypeMap[type as keyof typeof thresholdTypeMap] || type;
    
    // Use the dynamic threshold system if available
    if (['air_temperature', 'air_humidity', 'air_quality_mq135', 'alcohol_mq3', 'smoke_mq2'].includes(mappedType)) {
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

  // Calculate overall air health index based on all air sensor readings
  const calculateAirHealthIndex = useCallback(() => {
    if (!latestData) return { score: 0, status: 'healthy', label: 'No Data' };

    const airTemp = latestData.air_temperature ?? latestData.temperature ?? 0;
    const airHumidity = latestData.air_humidity ?? latestData.humidity ?? 0;
    const airQuality = latestData.air_air_quality_mq135 ?? latestData.air_quality_mq135 ?? 0;
    const alcohol = latestData.air_alcohol_mq3 ?? latestData.alcohol_mq3 ?? 0;
    const smoke = latestData.air_smoke_mq2 ?? latestData.smoke_mq2 ?? 0;

    // Get status for each sensor
    const tempStatus = getStatus(airTemp, 'air_temperature');
    const humidityStatus = getStatus(airHumidity, 'air_humidity');
    const qualityStatus = getStatus(airQuality, 'air_quality_mq135');
    const alcoholStatus = getStatus(alcohol, 'alcohol_mq3');
    const smokeStatus = getStatus(smoke, 'smoke_mq2');

    // Convert status to score (healthy=100, warning=60, critical=20)
    const statusScore = (status: string) => {
      switch (status) {
        case 'healthy': return 100;
        case 'warning': return 60;
        case 'critical': return 20;
        default: return 50;
      }
    };

    // Calculate weighted average (air quality and smoke are more critical)
    const scores = [
      statusScore(tempStatus) * 0.15,     // 15% weight
      statusScore(humidityStatus) * 0.15, // 15% weight
      statusScore(qualityStatus) * 0.3,   // 30% weight - most important
      statusScore(alcoholStatus) * 0.2,   // 20% weight
      statusScore(smokeStatus) * 0.2      // 20% weight - safety critical
    ];

    const totalScore = Math.round(scores.reduce((sum, score) => sum + score, 0));
    
    let status, label;
    if (totalScore >= 85) {
      status = 'healthy';
      label = 'Excellent';
    } else if (totalScore >= 70) {
      status = 'healthy';
      label = 'Good';
    } else if (totalScore >= 50) {
      status = 'warning';
      label = 'Moderate';
    } else if (totalScore >= 30) {
      status = 'warning';
      label = 'Poor';
    } else {
      status = 'critical';
      label = 'Hazardous';
    }

    return { score: totalScore, status, label };
  }, [latestData, getStatus]);

  // Memoize chart props to prevent unnecessary re-renders
  const chartProps = useMemo(() => ({
    ppm: {
      data: chartData,
      title: "Air Values (Temperature, Humidity, Air Quality, Alcohol, Smoke)",
      lines: ["airTemperature", "airHumidity", "airQuality", "alcohol", "smoke"]
    },
    general: {
      data: chartData,
      title: "General Environmental Values (Temperature, Humidity)",
      lines: ["temperature", "humidity"]
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
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
      {/* Air Quality KPI Cards - 5 air sensors + 1 health index */}
      <div className="grid grid-cols-2 gap-4 mb-4 justify-center items-stretch md:grid-cols-3 lg:grid-cols-3">
        <div className="flex flex-col gap-4 w-full min-w-[180px]">
          <SensorCard
            title="Air Temperature"
            value={((latestData as any)?.air_temperature ?? latestData?.temperature ?? 0).toFixed(1)}
            unit="°C"
            icon={<Thermometer className="h-5 w-5" />}
            status={getStatus((latestData as any)?.air_temperature ?? latestData?.temperature ?? 0, 'air_temperature')}
            sensorType="air_temperature"
            trend={{ value: 4, type: 'up' }}
          />
        </div>
        <div className="flex flex-col gap-4 w-full min-w-[180px]">
          <SensorCard
            title="Air Humidity"
            value={((latestData as any)?.air_humidity ?? latestData?.humidity ?? 0).toFixed(1)}
            unit="%"
            icon={<CloudDrizzle className="h-5 w-5" />}
            status={getStatus((latestData as any)?.air_humidity ?? latestData?.humidity ?? 0, 'air_humidity')}
            sensorType="air_humidity"
            trend={{ value: 3, type: 'down' }}
          />
        </div>
        <div className="flex flex-col gap-4 w-full min-w-[180px]">
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
        <div className="flex flex-col gap-4 w-full min-w-[180px]">
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
        <div className="flex flex-col gap-4 w-full min-w-[180px]">
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
        <div className="flex flex-col gap-4 w-full min-w-[180px]">
          <SensorCard
            title="Air Health Index"
            value={calculateAirHealthIndex().score.toString()}
            unit="AHI"
            icon={<Heart className="h-5 w-5" />}
            status={calculateAirHealthIndex().status}
            trend={{ value: calculateAirHealthIndex().score >= 70 ? 5 : 2, type: calculateAirHealthIndex().score >= 70 ? 'up' : 'down' }}
          />
        </div>
      </div>
      
      {/* Trend Analysis Widget */}
        <TrendAnalysis farmData={chartData.slice(-10)} />

      {/* Graph Selector Tabs */}
      <div className="my-8">
        <div className="flex border-b border-border mb-6">
          {[
            { key: 'general', label: 'General Values' },
            { key: 'ppm', label: 'Air Quality Values' },
            { key: 'compare', label: 'Temperature & Humidity Comparison' }
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
        {selectedGraph === 'general' && (
          <SensorChart {...chartProps.general} />
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
