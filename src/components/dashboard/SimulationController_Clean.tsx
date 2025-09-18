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
import { Settings, Database } from "lucide-react";
import { ThresholdSettings } from "@/components/settings/ThresholdSettings";
import { supabase } from "@/integrations/supabase/client";

// =========================
// ⚠️ Replace this in production: call your own /api endpoint instead.
// Never expose service role key to the browser.
// =========================
const SUPABASE_URL = "https://dlmqiqhwnxbffawfblrz.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdoa2NmZ2N5emh0d3VmaXp4dXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDYzMiwiZXhwIjoyMDcxMjYwNjMyfQ.romU2eJK__vtjLXOz6Au79vcFJo3Ia87xnARodpr3Ho";

const API_ENDPOINT = `${SUPABASE_URL}/rest/v1/sensor_readings`;
const API_HEADERS = {
  "Content-Type": "application/json",
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
};

const LS_SENS_KEY = "simulation_sensitivity";
const LS_SPIKE_KEY = "simulation_spike";

interface Sensitivity {
  air_temperature: number;
  air_humidity: number;
  air_air_quality_mq135: number;
  air_alcohol_mq3: number;
  air_smoke_mq2: number;
  soil_temperature: number;
  soil_humidity: number;
  soil_moisture: number;
}

let sensitivity: Sensitivity = {
  air_temperature: 1,
  air_humidity: 1,
  air_air_quality_mq135: 1,
  air_alcohol_mq3: 1,
  air_smoke_mq2: 1,
  soil_temperature: 1,
  soil_humidity: 1,
  soil_moisture: 1,
};

// Base values for realistic sensor readings
const baseValues = {
  air_temperature: 25, // °C
  air_humidity: 60, // %
  air_air_quality_mq135: 3000, // PPM
  air_alcohol_mq3: 800, // PPM
  air_smoke_mq2: 1500, // PPM
  soil_temperature: 22, // °C
  soil_humidity: 45, // %
  soil_moisture: 2000, // Raw value
};

// Function to generate realistic sensor data
function generateSensorData(timeInSeconds: number, spikeChance: number, spikeIntensity: number) {
  const generateValue = (key: keyof Sensitivity) => {
    const base = baseValues[key];
    const sens = sensitivity[key];
    const timeVariation = Math.sin(timeInSeconds * 0.01) * 0.1;
    const randomNoise = (Math.random() - 0.5) * 0.2;
    return base + (base * timeVariation + base * randomNoise) * sens;
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
  const [collectionEnabled, setCollectionEnabled] = useState(true);
  const timeRef = useRef(0);
  const { toast } = useToast();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempSensitivity, setTempSensitivity] = useState<Sensitivity>(sensitivity);
  const [spikeChance, setSpikeChance] = useState(0.05);
  const [spikeIntensity, setSpikeIntensity] = useState(1);

  useEffect(() => {
    // Load sensitivity settings
    try {
      const storedSens = localStorage.getItem(LS_SENS_KEY);
      if (storedSens) {
        const parsed = JSON.parse(storedSens);
        sensitivity = parsed;
        setTempSensitivity(parsed);
      }
    } catch {}

    // Load spike settings
    try {
      const sp = localStorage.getItem(LS_SPIKE_KEY);
      if (sp) {
        const parsed = JSON.parse(sp);
        if (parsed?.chance) setSpikeChance(parsed.chance);
        if (parsed?.intensity) setSpikeIntensity(parsed.intensity);
      }
    } catch {}
    
    // Load collection state
    try {
      const collectionState = localStorage.getItem('collection_enabled');
      if (collectionState) {
        setCollectionEnabled(JSON.parse(collectionState));
      }
    } catch {}
  }, []);

  const sendData = async (timeInSeconds: number) => {
    // Check if data collection is stopped - don't send simulation data either
    if (!collectionEnabled) {
      console.log('Simulation data blocked - collection is disabled');
      return;
    }

    const sensorData = generateSensorData(timeInSeconds, spikeChance, spikeIntensity);

    try {
      const response = await axios.post(API_ENDPOINT, sensorData, {
        headers: API_HEADERS,
      });

      console.log(`✅ Simulated sensor data sent (time: ${timeInSeconds}s):`, sensorData);
    } catch (error) {
      console.error("❌ Failed to send simulated sensor data:", error);
      toast({
        title: "Error",
        description: "Failed to send simulated sensor data.",
        variant: "destructive"
      });
    }
  };

  const toggleCollectionStatus = async () => {
    try {
      const newStatus = !collectionEnabled;
      setCollectionEnabled(newStatus);
      localStorage.setItem('collection_enabled', JSON.stringify(newStatus));
      
      // Call the database function to update collection status
      const { data, error } = await supabase.rpc('toggle_collection_mode', {
        enable_collection: newStatus,
        user_notes: `Collection ${newStatus ? 'enabled' : 'disabled'} via dashboard`
      });

      if (error) {
        console.error('Database collection control error:', error);
        throw error;
      }

      // Show user feedback
      const message = newStatus 
        ? {
            title: "✅ Data Collection ENABLED",
            description: "Database is now accepting all ESP sensor data",
            variant: "default" as const
          }
        : {
            title: "🚫 Data Collection STOPPED",
            description: "Database will reject all incoming ESP sensor data",
            variant: "destructive" as const
          };
      
      toast(message);
      
      console.log(`Database collection ${newStatus ? 'enabled' : 'disabled'}`);
      console.log(`Database function returned:`, data);
      
    } catch (error) {
      console.error('Failed to update database collection status:', error);
      // Revert the state if database update failed
      setCollectionEnabled(!collectionEnabled);
      localStorage.setItem('collection_enabled', JSON.stringify(!collectionEnabled));
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
      const { data, error } = await supabase.rpc('get_collection_status');
      
      if (error) {
        throw error;
      }
      
      const status = data?.[0];
      if (!status) {
        throw new Error('No collection status found');
      }
      
      const statusMessage = status.collection_enabled 
        ? `✅ Database Collection: ENABLED`
        : `❌ Database Collection: DISABLED`;
        
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
        onValueChange={(vals) => setter(vals[0])}
        className="flex-1"
      />
      <div className="text-xs text-muted-foreground">Value: {value.toFixed(1)}</div>
    </div>
  );

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="sm" onClick={toggleSimulation}>
        {running ? "Stop Simulation" : "Start Simulation"}
      </Button>

      {/* Data Collection Toggle Button */}
      <Button 
        variant={collectionEnabled ? "default" : "destructive"} 
        size="sm" 
        onClick={toggleCollectionStatus}
      >
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          {collectionEnabled ? "Stop Collection" : "Start Collection"}
        </div>
      </Button>

      <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
        <Settings className="h-4 w-4 mr-2" />
        Settings
      </Button>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Simulation Sensitivity</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Tabs defaultValue="sensitivity" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="sensitivity">Sensitivity</TabsTrigger>
                <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
                <TabsTrigger value="collection">Collection</TabsTrigger>
              </TabsList>

              <TabsContent value="sensitivity" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Sensor Sensitivity</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {renderSlider("air_temperature", "Air Temperature", tempSensitivity.air_temperature, (val) => setTempSensitivity({...tempSensitivity, air_temperature: val}))}
                    {renderSlider("air_humidity", "Air Humidity", tempSensitivity.air_humidity, (val) => setTempSensitivity({...tempSensitivity, air_humidity: val}))}
                    {renderSlider("air_air_quality_mq135", "Air Quality (MQ135)", tempSensitivity.air_air_quality_mq135, (val) => setTempSensitivity({...tempSensitivity, air_air_quality_mq135: val}))}
                    {renderSlider("air_alcohol_mq3", "Alcohol (MQ3)", tempSensitivity.air_alcohol_mq3, (val) => setTempSensitivity({...tempSensitivity, air_alcohol_mq3: val}))}
                    {renderSlider("air_smoke_mq2", "Smoke (MQ2)", tempSensitivity.air_smoke_mq2, (val) => setTempSensitivity({...tempSensitivity, air_smoke_mq2: val}))}
                    {renderSlider("soil_temperature", "Soil Temperature", tempSensitivity.soil_temperature, (val) => setTempSensitivity({...tempSensitivity, soil_temperature: val}))}
                    {renderSlider("soil_humidity", "Soil Humidity", tempSensitivity.soil_humidity, (val) => setTempSensitivity({...tempSensitivity, soil_humidity: val}))}
                    {renderSlider("soil_moisture", "Soil Moisture", tempSensitivity.soil_moisture, (val) => setTempSensitivity({...tempSensitivity, soil_moisture: val}))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3">Spike Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Spike Chance</label>
                      <Slider
                        min={0}
                        max={0.2}
                        step={0.01}
                        value={[spikeChance]}
                        onValueChange={(vals) => setSpikeChance(vals[0])}
                      />
                      <div className="text-xs text-muted-foreground">{(spikeChance * 100).toFixed(1)}% chance</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Spike Intensity</label>
                      <Slider
                        min={1}
                        max={3}
                        step={0.1}
                        value={[spikeIntensity]}
                        onValueChange={(vals) => setSpikeIntensity(vals[0])}
                      />
                      <div className="text-xs text-muted-foreground">{spikeIntensity.toFixed(1)}x multiplier</div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="thresholds" className="space-y-4">
                <ThresholdSettings />
              </TabsContent>

              <TabsContent value="collection" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Data Collection Control</h3>
                  
                  <div className="p-4 rounded-lg border bg-muted/20">
                    <h4 className="font-medium mb-2">Current Status</h4>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${collectionEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm">
                        Data collection is currently {collectionEnabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      ESP nodes will {collectionEnabled ? 'send' : 'not send'} data to the database
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border">
                    <h4 className="font-medium mb-3">Time-Based Collection (Future Feature)</h4>
                    <div className="space-y-3 opacity-50">
                      <div>
                        <label className="text-xs font-medium">Auto Start Time</label>
                        <input type="time" className="w-full mt-1 p-2 border rounded text-sm" defaultValue="06:00" disabled />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Auto Stop Time</label>
                        <input type="time" className="w-full mt-1 p-2 border rounded text-sm" defaultValue="18:00" disabled />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Collection Duration (minutes)</label>
                        <input type="number" className="w-full mt-1 p-2 border rounded text-sm" defaultValue="60" disabled />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Collection Interval (minutes)</label>
                        <input type="number" className="w-full mt-1 p-2 border rounded text-sm" defaultValue="5" disabled />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        🚧 Advanced scheduling features will be available in future updates
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold mb-3">Test Collection Status</h3>
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Check the current database collection status and verify the system is working
                      </p>
                      <Button 
                        onClick={testDatabaseCollection}
                        variant="outline"
                        size="sm"
                      >
                        Check Database Status
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplySettings}>
              Apply Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
