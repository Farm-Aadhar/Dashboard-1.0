import { useEffect, useRef, useState } from "react";
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
  "YOUR_SERVICE_ROLE_KEY";

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

// ---------- Generator ----------
const generateMockDataWithTrend = (
  timeInSeconds: number,
  spikeChance: number,
  spikeIntensity: number
) => {
  const trendFactor = Math.sin(timeInSeconds / 10) * 2;
  const noisy = (base: number, range: number, key: keyof Sensitivity) => {
    const prev = prevValues?.[key] ?? base;
    const delta = (Math.random() - 0.5) * range * 2 * sensitivity[key];
    return prev + delta;
  };

  let air_temperature = noisy(25 + trendFactor, 6, "air_temperature");
  let air_humidity = noisy(60 - trendFactor, 12, "air_humidity");
  let air_air_quality_mq135 = noisy(150, 120, "air_air_quality_mq135");
  let air_alcohol_mq3 = noisy(400, 180, "air_alcohol_mq3");
  let air_smoke_mq2 = noisy(1200, 300, "air_smoke_mq2");

  let soil_temperature = noisy(23 + trendFactor, 6, "soil_temperature");
  let soil_humidity = noisy(58 - trendFactor, 12, "soil_humidity");
  let soil_moisture = noisy(45 + trendFactor * 1.5, 24, "soil_moisture");

  if (Math.random() < spikeChance) {
    air_temperature += 6 * spikeIntensity;
    air_air_quality_mq135 += 250 * spikeIntensity;
  }

  soil_moisture = clamp(soil_moisture, 0, 100);

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
    } catch {}
  };

  const toggleSimulation = () => {
    if (!running) {
      setRunning(true);
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
    min = 0.5,
    max = 2,
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
      <span className="text-xs text-muted-foreground">x{value.toFixed(1)}</span>
    </div>
  );

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={toggleSimulation}>
        {running ? "Stop Simulation" : "Start Simulation"}
      </Button>

      <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
        <Settings/>
      </Button>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-3xl  overflow-y-scroll h-screen custom-scroll">
          <DialogHeader>
            <DialogTitle>Simulation Settings</DialogTitle>
          </DialogHeader>

          {/* Air */}
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">Air</h3>
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
            <h3 className="text-sm font-semibold mb-2">Soil</h3>
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
