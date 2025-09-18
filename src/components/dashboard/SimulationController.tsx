import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Database, Play, Square, Cloud } from "lucide-react";
import { ThresholdSettings } from "@/components/settings/ThresholdSettings";
import { supabase } from "@/integrations/supabase/client";
import { weatherBasedSimulation } from "@/lib/weatherBasedSimulation";

// =========================
// ⚠️ Replace this in production: call your own /api endpoint instead.
// Never expose service role key to the browser.
// =========================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://dlmqiqhwnxbffawfblrz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbXFpcWh3bnhiZmZhd2ZibHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2NjY5NTUsImV4cCI6MjA3MTI0Mjk1NX0.sBWR6-vYMPorGxSGx9eCgcDyRipwgUGg_B6svIltS5c";

const API_ENDPOINT = `${SUPABASE_URL}/rest/v1/sensor_readings`;
const API_HEADERS = {
  "Content-Type": "application/json",
  apikey: SUPABASE_PUBLISHABLE_KEY,
  Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
};

// ---------- Helper function ----------
const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, value));
};

// ---------- Types & defaults ----------
type Sensitivity = {
  air_temperature: number;
  air_humidity: number;
  air_air_quality_mq135: number;
  air_alcohol_mq3: number;
  air_smoke_mq2: number;
  soil_temperature: number;
  soil_humidity: number;
  soil_moisture: number;
};

const DEFAULT_SENSITIVITY: Sensitivity = {
  air_temperature: 1,
  air_humidity: 1,
  air_air_quality_mq135: 1,
  air_alcohol_mq3: 1,
  air_smoke_mq2: 1,
  soil_temperature: 1,
  soil_humidity: 1,
  soil_moisture: 1,
};

const LS_SENS_KEY = "simulation_sensitivity_v2";
const LS_SPIKE_KEY = "simulation_spike_cfg_v2";

// ---------- Global mutable state ----------
let sensitivity: Sensitivity = { ...DEFAULT_SENSITIVITY };

// ---------- Weather-based Mock data generation ----------
async function generateMockDataWithTrend(timeInSeconds: number, spikeChance: number, spikeIntensity: number) {
  // Update sensitivity in the weather-based simulation service
  weatherBasedSimulation.setSensitivity(sensitivity);
  
  // Initialize simulation if not already done
  const currentState = weatherBasedSimulation.getCurrentState();
  if (!currentState) {
    await weatherBasedSimulation.initializeFromWeather();
  }

  // Generate next data point
  const data = weatherBasedSimulation.generateNext(timeInSeconds, spikeChance, spikeIntensity);
  
  return {
    node_id: 'MANUAL_SIM_NODE',
    temperature: Math.round(data.air_temperature * 10) / 10,
    humidity: Math.round(data.air_humidity * 10) / 10,
    air_quality_mq135: Math.round(data.air_air_quality_mq135),
    alcohol_mq3: Math.round(data.air_alcohol_mq3),
    smoke_mq2: Math.round(data.air_smoke_mq2),
    soil_moisture: Math.round(data.soil_moisture * 10) / 10,
    timestamp: new Date().toISOString(),
  };
}

// ---------- Component ----------
export function SimulationController() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [running, setRunning] = useState(false);
  const [espConnectionEnabled, setEspConnectionEnabled] = useState(false);
  const [isCollectionActive, setIsCollectionActive] = useState(false); // Simplified to boolean
  const [weatherData, setWeatherData] = useState<any>(null);
  const timeRef = useRef(0);
  const { toast } = useToast();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempSensitivity, setTempSensitivity] = useState<Sensitivity>(sensitivity);
  const [spikeChance, setSpikeChance] = useState(0.05);
  const [spikeIntensity, setSpikeIntensity] = useState(1);

  useEffect(() => {
    try {
      const s = localStorage.getItem(LS_SENS_KEY);
      if (s) {
        const parsed = JSON.parse(s);
        sensitivity = { ...DEFAULT_SENSITIVITY, ...parsed };
        setTempSensitivity(sensitivity);
      }
    } catch {}
    try {
      const sp = localStorage.getItem(LS_SPIKE_KEY);
      if (sp) {
        const parsed = JSON.parse(sp);
        if (parsed?.chance) setSpikeChance(parsed.chance);
        if (parsed?.intensity) setSpikeIntensity(parsed.intensity);
      }
    } catch {}
    
    // Load ESP connection state
    try {
      const espState = localStorage.getItem('esp_connection_enabled');
      if (espState) {
        setEspConnectionEnabled(JSON.parse(espState));
      }
    } catch {}
    
    // Load data collection mode
    try {
      const collectionMode = localStorage.getItem('data_collection_mode');
      if (collectionMode) {
        setIsCollectionActive(collectionMode === 'collecting' || collectionMode === 'continuous');
      }
    } catch {}
    
    // Load simulation running state
    try {
      const simulationState = localStorage.getItem('simulation_running');
      if (simulationState) {
        setRunning(simulationState === 'true');
      }
    } catch {}
  }, []);

  const sendData = async (timeInSeconds: number) => {
    // Check if data collection is stopped - don't send simulation data either
    if (!isCollectionActive) {
      console.log('Simulation data blocked - collection is stopped');
      return;
    }
    
    const mockData = await generateMockDataWithTrend(timeInSeconds, spikeChance, spikeIntensity);
    try {
      const { error } = await supabase
        .from('sensor_readings')
        .insert([mockData]);
      
      if (error) {
        console.error('Manual simulation error:', error);
        toast({
          title: "Simulation Error",
          description: "Failed to push sensor data: " + error.message,
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Manual simulation exception:', err);
      toast({
        title: "Simulation Error",
        description: "Failed to push sensor data.",
        variant: "destructive"
      });
    }
  };

  const toggleDataCollection = async () => {
    try {
      const newState = !isCollectionActive;
      setIsCollectionActive(newState);
      
      // Convert boolean to database mode
      const mode = newState ? 'collecting' : 'stopped';
      localStorage.setItem('data_collection_mode', mode);
      
      // Call the database function to update collection mode
      // @ts-ignore - Function will be available after running database migration
      const { data, error } = await supabase.rpc('update_collection_mode', {
        new_mode: mode,
        user_notes: `Collection ${newState ? 'enabled' : 'disabled'} via dashboard toggle`
      });

      if (error) {
        console.error('Database collection control error:', error);
        throw error;
      }

      // Show user feedback
      const message = newState
        ? {
            title: "✅ Data Collection ACTIVE",
            description: "Database is accepting ESP sensor data",
            variant: "default" as const
          }
        : {
            title: "� Data Collection STOPPED",
            description: "Database will reject all incoming ESP sensor data",
            variant: "destructive" as const
          };
      
      toast(message);
      
      console.log(`Database collection ${newState ? 'enabled' : 'disabled'}`);
      console.log(`Database function returned:`, data);
      
    } catch (error) {
      console.error('Failed to update database collection mode:', error);
      toast({
        title: "Error",
        description: "Failed to update database collection settings",
        variant: "destructive"
      });
    }
  };

  const testDatabaseCollection = async () => {
    try {
      // Get current collection status from database
      // @ts-ignore - Function will be available after running database migration
      const { data, error } = await supabase.rpc('get_collection_status');
      
      if (error) {
        throw error;
      }
      
      // @ts-ignore - Data structure will be defined after migration
      const status = data?.[0];
      if (!status) {
        throw new Error('No collection status found');
      }
      
      const statusMessage = status.collection_enabled 
        ? `✅ Database Collection: ENABLED (${status.collection_mode})`
        : `❌ Database Collection: DISABLED (${status.collection_mode})`;
        
      toast({
        title: "Database Collection Status",
        description: statusMessage,
        variant: status.collection_enabled ? "default" : "destructive"
      });
      
      console.log('Current database collection status:', status);
      
    } catch (error) {
      console.error('Failed to check database collection status:', error);
      toast({
        title: "Error",
        description: "Failed to check database collection status",
        variant: "destructive"
      });
    }
  };

  const toggleEspConnection = async () => {
    // Legacy function - now redirects to the new toggle system
    await toggleDataCollection();
  };

  const toggleSimulation = async () => {
    if (!running) {
      try {
        toast({
          title: "Initializing Simulation",
          description: "Fetching weather data for realistic starting values...",
        });

        await weatherBasedSimulation.initializeFromWeather();
        const baseWeather = weatherBasedSimulation.getBaseWeatherData();
        setWeatherData(baseWeather);

        setRunning(true);
        localStorage.setItem('simulation_running', 'true');
        
        toast({
          title: "Simulation Started",
          description: baseWeather 
            ? `Started with weather data from ${baseWeather.location.name} (${baseWeather.temperature}°C, ${baseWeather.humidity}%)`
            : "Started with fallback values (weather data unavailable)",
        });

        intervalRef.current = setInterval(async () => {
          await sendData(timeRef.current);
          timeRef.current++;
        }, 2000);
      } catch (error) {
        toast({
          title: "Simulation Error",
          description: "Failed to initialize with weather data. Using fallback values.",
          variant: "destructive"
        });
        setRunning(true);
        intervalRef.current = setInterval(async () => {
          await sendData(timeRef.current);
          timeRef.current++;
        }, 2000);
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setRunning(false);
      localStorage.setItem('simulation_running', 'false');
      
      weatherBasedSimulation.reset(); // Reset for next run
      setWeatherData(null);
      toast({
        title: "Simulation Stopped",
        description: "Sensor data simulation has stopped.",
        variant: "default"
      });
    }
  };

  const handleApplySettings = () => {
    sensitivity = { ...tempSensitivity };
    localStorage.setItem(LS_SENS_KEY, JSON.stringify(sensitivity));
    localStorage.setItem(LS_SPIKE_KEY, JSON.stringify({ chance: spikeChance, intensity: spikeIntensity }));
    setSettingsOpen(false);
  };

  const renderSlider = (
    key: keyof Sensitivity,
    label: string,
    value: number,
    setter: (val: number) => void,
    min = 0.1,
    max = 3,
    step = 0.1
  ) => (
    <div className="flex flex-col gap-1 p-3 rounded-lg border bg-muted/20">
      <div className="text-sm font-medium">{label}</div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(val) => setter(val[0])}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{value.toFixed(1)}x</span>
        <span>{getUnitSuffix(key)}</span>
      </div>
    </div>
  );

  const getUnitSuffix = (key: keyof Sensitivity) => {
    switch (key) {
      case "air_temperature":
      case "soil_temperature":
        return "°C";
      case "air_humidity":
      case "soil_humidity":
      case "soil_moisture":
        return "%";
      default:
        return " ppm";
    }
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <Button variant="outline" size="sm" onClick={toggleSimulation}>
        {running ? "Stop Simulation" : "Start Simulation"}
      </Button>

      {/* Weather Status Indicator */}
      {running && weatherData && (
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-md text-sm">
          <Cloud className="h-4 w-4 text-blue-600" />
          <span className="text-blue-800">
            {weatherData.location.name}: {weatherData.temperature}°C, {weatherData.humidity}%
          </span>
        </div>
      )}

      {running && !weatherData && (
        <div className="flex items-center gap-2 px-3 py-1 bg-orange-50 border border-orange-200 rounded-md text-sm">
          <Cloud className="h-4 w-4 text-orange-600" />
          <span className="text-orange-800">Using fallback values</span>
        </div>
      )}

      {/* Data Collection Toggle Button */}
      <Button 
        variant={isCollectionActive ? "destructive" : "default"} 
        size="sm" 
        onClick={toggleDataCollection}
        className="min-w-[160px]"
      >
        <Database className="h-4 w-4 mr-2" />
        {isCollectionActive ? "Stop Collection" : "Start Collection"}
      </Button>

      <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
        <Settings className="h-4 w-4" />
      </Button>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Farm Settings</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="simulation" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="simulation">Simulation Settings</TabsTrigger>
              <TabsTrigger value="thresholds">Sensor Thresholds</TabsTrigger>
              <TabsTrigger value="database">Database Control</TabsTrigger>
            </TabsList>
            
            <TabsContent value="simulation" className="space-y-4 mt-6">
              <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                <p className="font-medium mb-1">How simulation works:</p>
                <ul className="text-xs space-y-1">
                  <li>• <strong>1x = Normal</strong> polyhouse conditions with natural fluctuations</li>
                  <li>• <strong>0.5x = Half</strong> the normal values (e.g., cooler temperature)</li>
                  <li>• <strong>2x = Double</strong> the normal values (e.g., hotter temperature)</li>
                  <li>• Values include daily cycles and small random variations</li>
                </ul>
              </div>

              {/* Air */}
              <div className="mt-4">
                <h3 className="text-sm font-semibold mb-2">Air Sensors</h3>
                <div className="grid grid-cols-2 gap-3">
                  {renderSlider("air_temperature", "Temperature", tempSensitivity.air_temperature, (v) =>
                    setTempSensitivity({ ...tempSensitivity, air_temperature: v })
                  )}
                  {renderSlider("air_humidity", "Humidity", tempSensitivity.air_humidity, (v) =>
                    setTempSensitivity({ ...tempSensitivity, air_humidity: v })
                  )}
                  {renderSlider("air_air_quality_mq135", "Air Quality (MQ135)", tempSensitivity.air_air_quality_mq135, (v) =>
                    setTempSensitivity({ ...tempSensitivity, air_air_quality_mq135: v })
                  )}
                  {renderSlider("air_alcohol_mq3", "Alcohol (MQ3)", tempSensitivity.air_alcohol_mq3, (v) =>
                    setTempSensitivity({ ...tempSensitivity, air_alcohol_mq3: v })
                  )}
                  {renderSlider("air_smoke_mq2", "Smoke (MQ2)", tempSensitivity.air_smoke_mq2, (v) =>
                    setTempSensitivity({ ...tempSensitivity, air_smoke_mq2: v })
                  )}
                </div>
              </div>

              {/* Soil */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold mb-2">Soil Sensors</h3>
                <div className="grid grid-cols-2 gap-3">
                  {renderSlider("soil_temperature", "Temperature", tempSensitivity.soil_temperature, (v) =>
                    setTempSensitivity({ ...tempSensitivity, soil_temperature: v })
                  )}
                  {renderSlider("soil_humidity", "Humidity", tempSensitivity.soil_humidity, (v) =>
                    setTempSensitivity({ ...tempSensitivity, soil_humidity: v })
                  )}
                  {renderSlider("soil_moisture", "Moisture", tempSensitivity.soil_moisture, (v) =>
                    setTempSensitivity({ ...tempSensitivity, soil_moisture: v })
                  )}
                </div>
              </div>

              {/* Spikes */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold mb-2">Random Spikes</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 p-3 rounded-lg border bg-muted/20">
                    <div className="text-sm font-medium">Chance</div>
                    <Slider
                      min={0}
                      max={0.3}
                      step={0.01}
                      value={[spikeChance]}
                      onValueChange={(val) => setSpikeChance(val[0])}
                    />
                    <span className="text-xs text-muted-foreground">
                      {(spikeChance * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 p-3 rounded-lg border bg-muted/20">
                    <div className="text-sm font-medium">Intensity</div>
                    <Slider
                      min={0}
                      max={3}
                      step={0.1}
                      value={[spikeIntensity]}
                      onValueChange={(val) => setSpikeIntensity(val[0])}
                    />
                    <span className="text-xs text-muted-foreground">
                      {spikeIntensity.toFixed(1)}x
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleApplySettings}>Apply Simulation Settings</Button>
              </DialogFooter>
            </TabsContent>
            
            <TabsContent value="thresholds" className="space-y-4 mt-6">
              <ThresholdSettings 
                onThresholdsChange={() => {
                  // Optional: Add any additional logic when thresholds change
                }}
              />
            </TabsContent>
            
            <TabsContent value="database" className="space-y-4 mt-6">
              <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                <p className="font-medium mb-1">Database Collection Control:</p>
                <p className="text-xs">
                  Control whether ESP nodes send data to the database. This affects storage usage and data collection.
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Data Collection Control</h3>
                  
                  <div className="grid gap-3">
                    <div 
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        !isCollectionActive 
                          ? 'border-red-300 bg-red-50 dark:bg-red-900/20' 
                          : 'border-border hover:border-red-300'
                      }`}
                      onClick={() => toggleDataCollection()}
                    >
                      <div className="flex items-center gap-3">
                        <Square className="h-5 w-5 text-red-600" />
                        <div>
                          <h4 className="font-medium text-red-700 dark:text-red-300">
                            {isCollectionActive ? "Stop Collection" : "✅ Collection Stopped"}
                          </h4>
                          <p className="text-xs text-red-600 dark:text-red-400">
                            ESP nodes will not send any data to database. Saves storage space.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div 
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        isCollectionActive 
                          ? 'border-green-300 bg-green-50 dark:bg-green-900/20' 
                          : 'border-border hover:border-green-300'
                      }`}
                      onClick={() => toggleDataCollection()}
                    >
                      <div className="flex items-center gap-3">
                        <Play className="h-5 w-5 text-green-600" />
                        <div>
                          <h4 className="font-medium text-green-700 dark:text-green-300">
                            {!isCollectionActive ? "Start Collection" : "✅ Collection Active"}
                          </h4>
                          <p className="text-xs text-green-600 dark:text-green-400">
                            ESP nodes will send data to database normally for monitoring.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3">Current Status</h3>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                    <Database className="h-5 w-5" />
                    <div>
                      <p className="font-medium">
                        {isCollectionActive ? "Data collection is active" : "Data collection is stopped"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ESP nodes will {isCollectionActive ? 'send' : 'not send'} data to the database
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3">Collection Status Test</h3>
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Check the current collection status and verify simulation respects the setting
                    </p>
                    <Button 
                      onClick={testDatabaseCollection}
                      variant="outline"
                      size="sm"
                    >
                      Check Collection Status
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3">ESP Node Communication</h3>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• ESP nodes check the status every 30 seconds</p>
                    <p>• Changes take effect within 30 seconds on ESP nodes</p>
                    <p>• Database trigger blocks inserts immediately when stopped</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
