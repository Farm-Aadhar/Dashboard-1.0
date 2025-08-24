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
import { Slider } from "@/components/ui/slider";
import { Settings } from "lucide-react";

// =========================
// ⚠️ Replace this in production: call your own /api endpoint instead.
// Never expose service role key to the browser.
// =========================
const SUPABASE_URL = "https://ghkcfgcyzhtwufizxuyo.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdoa2NmZ2N5emh0d3VmaXp4dXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDYzMiwiZXhwIjoyMDcxMjYwNjMyfQ.romU2eJK__vtjLXOz6Au79vcFJo3Ia87xnARodpr3Ho";

const API_ENDPOINT = `${SUPABASE_URL}/rest/v1/sensor_readings`;
const API_HEADERS = {
  "Content-Type": "application/json",
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
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
let prevValues: any = null;

// ---------- Helpers ----------
const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

// ---------- Realistic polyhouse base values ----------
const POLYHOUSE_BASE_VALUES = {
  air_temperature: { base: 28, normalRange: 3, min: 18, max: 35 }, // °C - based on your 28.7°C reading
  air_humidity: { base: 64, normalRange: 8, min: 30, max: 85 }, // % - based on your 64% reading
  air_air_quality_mq135: { base: 2800, normalRange: 400, min: 1000, max: 3500 }, // ppm - based on your 2786 ppm
  air_alcohol_mq3: { base: 1080, normalRange: 200, min: 500, max: 1500 }, // ppm - based on your 1083 ppm
  air_smoke_mq2: { base: 2100, normalRange: 300, min: 1000, max: 2500 }, // ppm - based on your 2086 ppm
  soil_temperature: { base: 26, normalRange: 2, min: 18, max: 35 }, // °C - slightly lower than air
  soil_humidity: { base: 70, normalRange: 10, min: 30, max: 85 }, // % - typical soil humidity
  soil_moisture: { base: 60, normalRange: 15, min: 15, max: 85 }, // % - soil moisture content
};

// ---------- Generator ----------
const generateMockDataWithTrend = (
  timeInSeconds: number,
  spikeChance: number,
  spikeIntensity: number
) => {
  // Different cycle patterns for different sensor types to avoid cross-influence
  const airTempCycle = Math.sin(timeInSeconds / 100) * 0.3 + Math.sin(timeInSeconds / 20) * 0.1;
  const airHumidityCycle = Math.sin((timeInSeconds + 25) / 120) * 0.3 + Math.sin((timeInSeconds + 10) / 25) * 0.1;
  const soilTempCycle = Math.sin((timeInSeconds + 50) / 150) * 0.2 + Math.sin((timeInSeconds + 15) / 30) * 0.05;
  const soilHumidityCycle = Math.sin((timeInSeconds + 75) / 110) * 0.25 + Math.sin((timeInSeconds + 20) / 22) * 0.08;
  const soilMoistureCycle = Math.sin((timeInSeconds + 100) / 200) * 0.4 + Math.sin((timeInSeconds + 30) / 40) * 0.1;
  const airQualityCycle = Math.sin((timeInSeconds + 125) / 90) * 0.2 + Math.sin((timeInSeconds + 5) / 18) * 0.05;
  const alcoholCycle = Math.sin((timeInSeconds + 150) / 80) * 0.15 + Math.sin((timeInSeconds + 12) / 16) * 0.03;
  const smokeCycle = Math.sin((timeInSeconds + 175) / 95) * 0.18 + Math.sin((timeInSeconds + 8) / 19) * 0.04;
  
  const generateValue = (key: keyof Sensitivity) => {
    const config = POLYHOUSE_BASE_VALUES[key];
    const sensitivityMultiplier = sensitivity[key]; // 1x = normal, 0.5x = half, 2x = double
    
    // Get previous value or start with base
    const prevValue = prevValues?.[key] ?? config.base;
    
    // Select the appropriate cycle for this specific sensor
    let cycleInfluence = 0;
    switch (key) {
      case "air_temperature":
        cycleInfluence = airTempCycle;
        break;
      case "air_humidity":
        cycleInfluence = airHumidityCycle;
        break;
      case "soil_temperature":
        cycleInfluence = soilTempCycle;
        break;
      case "soil_humidity":
        cycleInfluence = soilHumidityCycle;
        break;
      case "soil_moisture":
        cycleInfluence = soilMoistureCycle;
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
    const targetValue = targetBase * sensitivityMultiplier;
    
    // Add small random fluctuation (±3% of normal range, reduced from 5%)
    const fluctuation = (Math.random() - 0.5) * config.normalRange * 0.06;
    
    // Gradually move towards target with some inertia (smooth transitions)
    const inertia = 0.8; // How much of previous value to keep
    const newValue = (prevValue * inertia) + (targetValue * (1 - inertia)) + fluctuation;
    
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

  // Apply random spikes if configured (only to specific sensors to avoid cross-influence)
  if (Math.random() < spikeChance) {
    const spikeMultiplier = 1 + (spikeIntensity * 0.5);
    
    // Randomly choose which sensor gets spiked to avoid affecting all
    const spikeTarget = Math.floor(Math.random() * 3);
    switch (spikeTarget) {
      case 0:
        air_temperature *= spikeMultiplier;
        air_temperature = clamp(air_temperature, POLYHOUSE_BASE_VALUES.air_temperature.min, POLYHOUSE_BASE_VALUES.air_temperature.max);
        break;
      case 1:
        air_air_quality_mq135 *= spikeMultiplier;
        air_air_quality_mq135 = clamp(air_air_quality_mq135, POLYHOUSE_BASE_VALUES.air_air_quality_mq135.min, POLYHOUSE_BASE_VALUES.air_air_quality_mq135.max);
        break;
      case 2:
        soil_temperature *= spikeMultiplier;
        soil_temperature = clamp(soil_temperature, POLYHOUSE_BASE_VALUES.soil_temperature.min, POLYHOUSE_BASE_VALUES.soil_temperature.max);
        break;
    }
  }

  const data = {
    timestamp: new Date().toISOString(),
    air_temperature: round1(air_temperature),
    air_humidity: round1(air_humidity),
    air_air_quality_mq135: Math.round(air_air_quality_mq135),
    air_alcohol_mq3: Math.round(air_alcohol_mq3),
    air_smoke_mq2: Math.round(air_smoke_mq2),
    soil_temperature: round1(soil_temperature),
    soil_humidity: round1(soil_humidity),
    soil_moisture: round1(soil_moisture),
  };

  prevValues = data;
  return data;
};

export function SimulationController() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [running, setRunning] = useState(false);
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
  }, []);

  const sendData = async (timeInSeconds: number) => {
    const mockData = generateMockDataWithTrend(timeInSeconds, spikeChance, spikeIntensity);
    try {
      await axios.post(API_ENDPOINT, mockData, { headers: API_HEADERS });
    } catch (err) {
      toast({
        title: "Simulation Error",
        description: "Failed to push sensor data.",
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
  ) => {
    const baseValue = POLYHOUSE_BASE_VALUES[key];
    const currentValue = Math.round(baseValue.base * value);
    
    return (
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
          <span>x{value.toFixed(1)}</span>
          <span>~{currentValue}{getUnit(key)}</span>
        </div>
        <div className="text-xs text-muted-foreground/70">
          Normal: ~{baseValue.base}{getUnit(key)}
        </div>
      </div>
    );
  };

  const getUnit = (key: keyof Sensitivity) => {
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
    <div className="flex gap-2">

      <Button variant="outline" size="sm" onClick={toggleSimulation}>
        {running ? "Stop Simulation" : "Start Simulation"}
      </Button>

      <Button variant="outline" size="sm" onClick={() => {
        toast({
          title: "Connection Started",
          description: "Attempting to connect to ESP Node...",
          variant: "default"
        });
        // TODO: Add ESP connection logic here
      }}>
        Start Connection
      </Button>

      <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
        <Settings/>
      </Button>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-3xl  overflow-y-scroll h-screen custom-scroll">
          <DialogHeader>
            <DialogTitle>Simulation Settings</DialogTitle>
            <div className="text-sm text-muted-foreground mt-2 p-3 bg-muted/30 rounded-lg">
              <p className="font-medium mb-1">How simulation works:</p>
              <ul className="text-xs space-y-1">
                <li>• <strong>1x = Normal</strong> polyhouse conditions with natural fluctuations</li>
                <li>• <strong>0.5x = Half</strong> the normal values (e.g., cooler temperature)</li>
                <li>• <strong>2x = Double</strong> the normal values (e.g., hotter temperature)</li>
                <li>• Values include daily cycles and small random variations</li>
              </ul>
            </div>
          </DialogHeader>

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
            <Button onClick={handleApplySettings}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
