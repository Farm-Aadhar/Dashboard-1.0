import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Cloud, 
  Database, 
  RefreshCw, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Trash2
} from "lucide-react";
import { weatherService } from "@/lib/weatherService";

export function WeatherApiMonitor() {
  const [stats, setStats] = useState({
    callsUsed: 0,
    callsRemaining: 0,
    dailyLimit: 0,
    resetTime: '',
    cacheSize: 0
  });

  const updateStats = () => {
    const apiStats = weatherService.getApiCallStats();
    setStats(apiStats);
  };

  useEffect(() => {
    updateStats();
    
    // Update every 5 minutes (reduced frequency)
    const interval = setInterval(updateStats, 300000);
    return () => clearInterval(interval);
  }, []);

  const usagePercentage = (stats.callsUsed / stats.dailyLimit) * 100;
  
  const getUsageStatus = () => {
    if (usagePercentage < 50) return { color: 'text-green-600', status: 'Good', icon: CheckCircle };
    if (usagePercentage < 80) return { color: 'text-yellow-600', status: 'Moderate', icon: AlertTriangle };
    return { color: 'text-red-600', status: 'High', icon: AlertTriangle };
  };

  const usageStatus = getUsageStatus();
  const StatusIcon = usageStatus.icon;

  const handleClearCache = () => {
    weatherService.clearCache();
    updateStats();
  };

  const handleResetCounter = () => {
    if (confirm('Are you sure you want to reset the API call counter? This should only be done for testing.')) {
      weatherService.resetApiCallCounter();
      updateStats();
    }
  };

  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-600">
          <Cloud className="h-5 w-5" />
          Weather API Usage Monitor
          <Badge variant={usagePercentage < 80 ? "default" : "destructive"} className="ml-auto">
            <StatusIcon className="h-3 w-3 mr-1" />
            {usageStatus.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Compact Usage Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>API Calls Used</span>
            <span className={usageStatus.color}>
              {stats.callsUsed} / {stats.dailyLimit}
            </span>
          </div>
          <Progress 
            value={usagePercentage} 
            className="h-2"
          />
          <div className="text-xs text-muted-foreground">
            {stats.callsRemaining} calls remaining
          </div>
        </div>

        {/* Compact Statistics Grid */}
        <div className="grid grid-cols-2 gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
          <div>
            <div className="font-medium flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Usage Rate
            </div>
            <div className="font-mono text-sm">
              {usagePercentage.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="font-medium flex items-center gap-1">
              <Database className="h-3 w-3" />
              Cache Size
            </div>
            <div className="font-mono text-sm">
              {stats.cacheSize} items
            </div>
          </div>
        </div>

        {/* Compact Reset Time */}
        <div className="flex items-center gap-2 p-1 bg-muted/30 rounded text-xs">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span>Resets: {new Date(stats.resetTime).toLocaleDateString()}</span>
        </div>

        {/* Compact Actions */}
        <div className="flex gap-1">
          <Button 
            onClick={updateStats}
            variant="outline"
            size="sm"
            className="flex-1 h-8"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
          <Button 
            onClick={handleClearCache}
            variant="outline"
            size="sm"
            className="flex-1 h-8"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>

        {/* Development Controls */}
        {process.env.NODE_ENV === 'development' && (
          <div className="border-t pt-3">
            <div className="text-xs text-muted-foreground mb-2">Development Controls</div>
            <Button 
              onClick={handleResetCounter}
              variant="outline"
              size="sm"
              className="w-full text-orange-600 hover:text-orange-700"
            >
              Reset Counter (Testing Only)
            </Button>
          </div>
        )}

        {/* Compact Smart Usage Tips */}
        <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
          💡 Data cached 15min. Min 1min between calls.
          {usagePercentage > 70 && " Consider reducing refresh frequency."}
        </div>

        {/* Compact warning at high usage */}
        {usagePercentage > 90 && (
          <div className="text-xs text-red-600 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200">
            ⚠️ Approaching daily limit! New calls will be blocked.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
