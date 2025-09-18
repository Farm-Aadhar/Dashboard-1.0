import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Play, 
  Square, 
  RefreshCw, 
  Trash2, 
  Settings, 
  Activity,
  TestTube,
  Database
} from "lucide-react";
import { 
  sensorSimulator, 
  getSimulationStatus, 
  startSimulation, 
  stopSimulation, 
  clearSimulatedData,
  simulateScenario,
  getSimulatedData
} from "@/lib/sensorSimulator";

export function SimulatorControlPanel() {
  const [status, setStatus] = useState(getSimulationStatus());
  const [interval, setInterval] = useState(3000);
  const [selectedScenario, setSelectedScenario] = useState<string>("");

  // Update status every second
  useEffect(() => {
    const updateStatus = () => {
      setStatus(getSimulationStatus());
    };

    const statusInterval = window.setInterval(updateStatus, 5000); // Update every 5 seconds instead of 1
    return () => window.clearInterval(statusInterval);
  }, []);

  const handleStart = () => {
    startSimulation(interval);
    setStatus(getSimulationStatus());
  };

  const handleStop = () => {
    stopSimulation();
    setStatus(getSimulationStatus());
  };

  const handleClear = () => {
    clearSimulatedData();
    setStatus(getSimulationStatus());
  };

  const handleScenario = () => {
    if (selectedScenario) {
      simulateScenario(selectedScenario as any);
    }
  };

  const exportData = () => {
    const data = getSimulatedData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sensor_simulation_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-orange-200 dark:border-orange-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-600">
          <Settings className="h-5 w-5" />
          Sensor Simulator Controls
          <Badge variant={status.running ? "default" : "secondary"} className="ml-auto">
            {status.running ? (
              <>
                <Activity className="h-3 w-3 mr-1 animate-pulse" />
                RUNNING
              </>
            ) : (
              "STOPPED"
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Compact Status Info */}
        <div className="grid grid-cols-2 gap-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-xs">
          <div>
            <div className="font-medium">Data Points</div>
            <div className="font-mono text-sm">{status.dataPoints}</div>
          </div>
          <div>
            <div className="font-medium">Last Update</div>
            <div className="font-mono text-xs">
              {status.lastUpdate ? new Date(status.lastUpdate).toLocaleTimeString() : 'Never'}
            </div>
          </div>
        </div>

        {/* Compact Controls */}
        <div className="flex gap-1">
          <Button 
            onClick={handleStart} 
            disabled={status.running}
            className="flex-1 h-8"
            size="sm"
            variant={status.running ? "secondary" : "default"}
          >
            <Play className="h-3 w-3 mr-1" />
            Start
          </Button>
          <Button 
            onClick={handleStop} 
            disabled={!status.running}
            variant="outline"
            className="flex-1 h-8"
            size="sm"
          >
            <Square className="h-3 w-3 mr-1" />
            Stop
          </Button>
          <Button 
            onClick={handleClear} 
            variant="outline"
            className="text-red-600 hover:text-red-700 h-8 px-2"
            size="sm"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Compact Interval Setting */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">Generation Interval</Label>
          <div className="flex gap-1">
            <Input
              type="number"
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              min={1000}
              max={30000}
              step={1000}
              className="flex-1 h-8 text-xs"
              disabled={status.running}
            />
            <span className="text-xs text-muted-foreground flex items-center px-2">ms</span>
          </div>
        </div>

        {/* Compact Test Scenarios */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">Test Scenarios</Label>
          <div className="flex gap-1">
            <Select value={selectedScenario} onValueChange={setSelectedScenario}>
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue placeholder="Choose scenario..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high_temp">High Temp</SelectItem>
                <SelectItem value="low_humidity">Low Humidity</SelectItem>
                <SelectItem value="poor_air_quality">Poor Air</SelectItem>
                <SelectItem value="critical_all">Critical All</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleScenario}
              disabled={!selectedScenario}
              variant="outline"
              size="sm"
              className="h-8 px-2"
            >
              <TestTube className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Compact Export */}
        <Button 
          onClick={exportData}
          variant="outline"
          className="w-full h-8 text-xs"
          disabled={status.dataPoints === 0}
          size="sm"
        >
          <Database className="h-3 w-3 mr-1" />
          Export Data
        </Button>

        {/* Compact Info */}
        <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
          💡 Simulator generates realistic data based on selected crop conditions.
        </div>
      </CardContent>
    </Card>
  );
}
