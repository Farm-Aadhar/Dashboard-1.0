import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Database, Play, Square } from "lucide-react";
import { ThresholdSettings } from "@/components/settings/ThresholdSettings";
import { supabase } from "@/integrations/supabase/client";

// Helper function
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

// ---------- Mock data generation ----------
function generateMockDataWithTrend(timeInSeconds: number, spikeChance: number, spikeIntensity: number) {
  // Time-based cycles for natural variation
  const tempCycle = Math.sin((timeInSeconds * Math.PI) / 3600) * 0.3; // ~2 hour cycle
  const humidityCycle = Math.cos((timeInSeconds * Math.PI) / 7200) * 0.2; // ~4 hour cycle
  const airQualityCycle = Math.sin((timeInSeconds * Math.PI) / 5400) * 0.4; // ~3 hour cycle
  const alcoholCycle = Math.sin((timeInSeconds * Math.PI) / 1800) * 0.15; // ~1 hour cycle  
  const smokeCycle = Math.cos((timeInSeconds * Math.PI) / 2700) * 0.25; // ~1.5 hour cycle

  // Sensitivity multipliers
  const sensitivityMultiplier = {
    air_temperature: sensitivity.air_temperature,
    air_humidity: sensitivity.air_humidity,
    air_air_quality_mq135: sensitivity.air_air_quality_mq135,
    air_alcohol_mq3: sensitivity.air_alcohol_mq3,
    air_smoke_mq2: sensitivity.air_smoke_mq2,
    soil_temperature: sensitivity.soil_temperature,
    soil_humidity: sensitivity.soil_humidity,
    soil_moisture: sensitivity.soil_moisture,
  };

  // Value configurations with broader ranges and more realistic values
  const valueConfigs = {
    air_temperature: { base: 26, normalRange: 8, min: 5, max: 50 },
    air_humidity: { base: 65, normalRange: 25, min: 10, max: 95 },
    air_air_quality_mq135: { base: 2800, normalRange: 1200, min: 100, max: 5000 },
    air_alcohol_mq3: { base: 1050, normalRange: 600, min: 50, max: 3000 },
    air_smoke_mq2: { base: 2000, normalRange: 800, min: 100, max: 4000 },
    soil_temperature: { base: 24, normalRange: 6, min: 5, max: 45 },
    soil_humidity: { base: 70, normalRange: 20, min: 20, max: 90 },
    soil_moisture: { base: 45, normalRange: 25, min: 10, max: 80 },
  };

  const generateValue = (key: keyof typeof valueConfigs, prevValue?: number) => {
    const config = valueConfigs[key];
    const sensitivityMult = sensitivityMultiplier[key];
    
    // Select appropriate cycle
    let cycleInfluence = tempCycle;
    switch (key) {
      case "air_humidity":
      case "soil_humidity":
        cycleInfluence = humidityCycle;
        break;
      case "air_air_quality_mq135":
        cycleInfluence = airQualityCycle;
        break;
      case "air_alcohol_mq3":
        cycleInfluence = alcoholCycle;
        break;
      case "air_smoke_mq2":
        cycleInfluence = smokeCycle;
        break;
    }
    
    // Calculate target value with independent cycle and sensitivity
    const targetBase = config.base + (cycleInfluence * config.normalRange);
    const targetValue = targetBase * sensitivityMult;
    
    // Add small random fluctuation (±3% of normal range, reduced from 5%)
    const fluctuation = (Math.random() - 0.5) * config.normalRange * 0.06;
    
    // Gradually move towards target with some inertia (smooth transitions)
    const inertia = 0.8; // How much of previous value to keep
    const newValue = (prevValue || targetValue) * inertia + (targetValue * (1 - inertia)) + fluctuation;
    
    // Apply bounds
    return clamp(newValue, config.min, config.max);
  };

  let air_temperature = generateValue("air_temperature");
  let air_humidity = generateValue("air_humidity");
  let air_air_quality_mq135 = generateValue("air_air_quality_mq135");
  let air_alcohol_mq3 = generateValue("air_alcohol_mq3");
  let air_smoke_mq2 = generateValue("air_smoke_mq2");
  let soil_temperature = generateValue("soil_temperature");
  let soil_humidity = generateValue("soil_humidity");
  let soil_moisture = generateValue("soil_moisture");

  // Random spikes
  if (Math.random() < spikeChance) {
    const spikeTargets = [
      { key: 'air_temperature', ref: () => air_temperature *= spikeIntensity },
      { key: 'air_humidity', ref: () => air_humidity *= spikeIntensity },
      { key: 'air_air_quality_mq135', ref: () => air_air_quality_mq135 *= spikeIntensity },
      { key: 'air_alcohol_mq3', ref: () => air_alcohol_mq3 *= spikeIntensity },
      { key: 'air_smoke_mq2', ref: () => air_smoke_mq2 *= spikeIntensity },
      { key: 'soil_temperature', ref: () => soil_temperature *= spikeIntensity },
      { key: 'soil_humidity', ref: () => soil_humidity *= spikeIntensity },
      { key: 'soil_moisture', ref: () => soil_moisture *= spikeIntensity },
    ];
    
    const randomSpike = spikeTargets[Math.floor(Math.random() * spikeTargets.length)];
    randomSpike.ref();
  }

  return {
    air_temperature: Math.round(air_temperature * 10) / 10,
    air_humidity: Math.round(air_humidity * 10) / 10,
    air_air_quality_mq135: Math.round(air_air_quality_mq135),
    air_alcohol_mq3: Math.round(air_alcohol_mq3),
    air_smoke_mq2: Math.round(air_smoke_mq2),
    soil_temperature: Math.round(soil_temperature * 10) / 10,
    soil_humidity: Math.round(soil_humidity * 10) / 10,
    soil_moisture: Math.round(soil_moisture * 10) / 10,
    timestamp: new Date().toISOString(),
  };
}

// ---------- Component ----------
export function SimulationController() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [running, setRunning] = useState(false);
  const [espConnectionEnabled, setEspConnectionEnabled] = useState(false);
  const [isCollectionActive, setIsCollectionActive] = useState(false); // Simplified to boolean
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
  }, []);

  const sendData = async (timeInSeconds: number) => {
    // Check if data collection is stopped - don't send simulation data either
    if (!isCollectionActive) {
      console.log('Simulation data blocked - collection is stopped');
      return;
    }
    
    const mockData = generateMockDataWithTrend(timeInSeconds, spikeChance, spikeIntensity);
    
    // Transform mock data to match database schema
    const dbData = {
      node_id: 'simulation-node',
      temperature: mockData.air_temperature,
      humidity: mockData.air_humidity,
      air_quality_mq135: mockData.air_air_quality_mq135,
      alcohol_mq3: mockData.air_alcohol_mq3,
      smoke_mq2: mockData.air_smoke_mq2,
      timestamp: mockData.timestamp
    };
    
    try {
      const { error } = await supabase
        .from('sensor_readings')
        .insert(dbData);
      
      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
      
      console.log('✅ Sensor data inserted successfully:', dbData);
    } catch (err) {
      console.error('Database insert failed:', err);
      toast({
        title: "Simulation Error",
        description: "Failed to push sensor data to database.",
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

  const toggleSimulation = () => {
    if (!running) {
      setRunning(true);
      toast({
        title: "Simulation Started",
        description: "Sensor data simulation is now running.",
        variant: "default"
      });
      intervalRef.current = setInterval(async () => {
        await sendData(timeRef.current);
        timeRef.current++;
      }, 2000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setRunning(false);
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
            <DialogDescription>
              Configure simulation parameters and threshold settings for your farm monitoring system.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="simulation" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="simulation">Simulation Sensitivity</TabsTrigger>
              <TabsTrigger value="thresholds">Threshold Settings</TabsTrigger>
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
                <Button onClick={handleApplySettings}>Apply Simulation Sensitivity</Button>
              </DialogFooter>
            </TabsContent>
            
            <TabsContent value="thresholds" className="space-y-4 mt-6">
              <ThresholdSettings 
                onThresholdsChange={() => {
                  // Optional: Add any additional logic when thresholds change
                }}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
