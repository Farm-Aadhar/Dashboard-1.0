import React, { useState, memo, useCallback } from "react";
import { AlertTriangle, TrendingUp, CheckCircle2, Activity, CloudSun, Gauge, BarChart3, Target, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAnalysis } from "../GeminiAnalysis";
import { TIME_RANGES } from '@/lib/geminiService';

// Type for the response
type AnalysisResponse = {
  farm_health: { score: number; status: string; tags: string[] };
  alerts: { type: string; message: string; recommendation: string }[];
  trends: string[];
  recommendations: string[];
  forecast: {
    soil_moisture_next_3h: { label: string; icon: string; value: string };
    air_temp_next_3h: { label: string; icon: string; value: string };
  };
  indices: {
    heat_stress_index: { label: string; value: string; unit?: string };
    irrigation_need_score: { label: string; value: number; unit?: string };
    air_quality_risk: { label: string; value: string };
    sensor_reliability: { label: string; value: string; unit?: string };
  };
};

type TrendAnalysisProps = {
  farmData?: any[];
};

const TrendAnalysis = memo(function TrendAnalysis({ farmData = [{ id: 1, sensor: 'test', value: 50 }] }: TrendAnalysisProps) {
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1hr');

  const handleAnalysis = useCallback(async () => {
    if (!farmData || farmData.length === 0) return;
    setLoading(true);

    try {
      const result = await getAnalysis(farmData, selectedTimeRange);
      if (result) setAnalysis(result);
    } catch (err) {
      console.error("Analysis failed:", err);
    }

    setLoading(false);
  }, [farmData, selectedTimeRange]);

  // Helper function to determine color based on index value and type
  const getIndexColor = useCallback((value: any, type: string) => {
    const valueStr = String(value).toLowerCase();
    
    switch (type) {
      case 'heat_stress':
        if (valueStr.includes('low') || valueStr.includes('good')) {
          return 'bg-success/10 border-success/20 text-success';
        } else if (valueStr.includes('high') || valueStr.includes('critical')) {
          return 'bg-destructive/10 border-destructive/20 text-destructive';
        } else {
          return 'bg-warning/10 border-warning/20 text-warning';
        }
      
      case 'irrigation':
        const numValue = typeof value === 'number' ? value : parseInt(valueStr);
        if (numValue <= 3) {
          return 'bg-success/10 border-success/20 text-success';
        } else if (numValue >= 7) {
          return 'bg-destructive/10 border-destructive/20 text-destructive';
        } else {
          return 'bg-warning/10 border-warning/20 text-warning';
        }
      
      case 'air_quality':
        if (valueStr.includes('excellent') || valueStr.includes('good')) {
          return 'bg-success/10 border-success/20 text-success';
        } else if (valueStr.includes('poor') || valueStr.includes('critical')) {
          return 'bg-destructive/10 border-destructive/20 text-destructive';
        } else {
          return 'bg-warning/10 border-warning/20 text-warning';
        }
      
      case 'reliability':
        if (valueStr.includes('high') || valueStr.includes('good')) {
          return 'bg-success/10 border-success/20 text-success';
        } else if (valueStr.includes('low') || valueStr.includes('poor')) {
          return 'bg-destructive/10 border-destructive/20 text-destructive';
        } else {
          return 'bg-warning/10 border-warning/20 text-warning';
        }
      
      default:
        return 'bg-secondary/5 border-secondary/10';
    }
  }, []);

  const SpeedometerGauge = ({ score }: { score: number }) => {
    const radius = 80;
    const strokeWidth = 12;
    const normalizedRadius = radius - strokeWidth * 2;
    const circumference = normalizedRadius * Math.PI; // Half circle
    const strokeDasharray = `${circumference} ${circumference}`;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const getScoreStatus = (score: number) => {
      if (score >= 85) return { text: "Excellent", color: "text-success", bgColor: "bg-success/10" };
      if (score >= 70) return { text: "Good", color: "text-success", bgColor: "bg-success/10" };
      if (score >= 50) return { text: "Fair", color: "text-warning", bgColor: "bg-warning/10" };
      if (score >= 30) return { text: "Poor", color: "text-warning", bgColor: "bg-warning/10" };
      return { text: "Critical", color: "text-destructive", bgColor: "bg-destructive/10" };
    };

    const status = getScoreStatus(score);

    return (
      <div className="relative flex flex-col items-center">
        <div className="relative">
          <svg height={radius + 20} width={radius * 2 + 20}>
            <path
              d={`M 20 ${radius + 10} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2} ${radius + 10}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-muted/20"
            />
            <defs>
              <linearGradient id="speedometer-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--destructive))" />
                <stop offset="30%" stopColor="hsl(var(--warning))" />
                <stop offset="70%" stopColor="hsl(var(--success))" />
                <stop offset="100%" stopColor="hsl(var(--success))" />
              </linearGradient>
            </defs>
            <path
              d={`M 20 ${radius + 10} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2} ${radius + 10}`}
              fill="none"
              stroke="url(#speedometer-gradient)"
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute mt-8 inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">{score}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
        </div>
        <div className={`mt-4 px-4 py-2 rounded-full ${status.bgColor} ${status.color} font-medium text-sm`}>
          {status.text}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-primary">Farm Analysis Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                  Comprehensive insights for data-driven farming decisions
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Time Range Selector */}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_RANGES.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Generate Analysis Button */}
              <Button
                onClick={handleAnalysis}
                disabled={loading || !farmData}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 font-medium"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    Analyzing...
                  </div>
                ) : (
                  "Generate Analysis"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!analysis && !loading && (
        <div className="border border-muted rounded-lg">
          <div className="text-center py-12 px-6">
            <div className="rounded-full bg-muted/50 p-4 w-fit mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Ready to Analyze Your Farm Data</h3>
            <p className="text-muted-foreground">
              Select a time range and click "Generate Analysis" to get detailed insights about your farm's performance and recommendations for the selected period.
            </p>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-8">
          {/* Farm Health + Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-shrink-0">
                    <SpeedometerGauge score={analysis.farm_health.score} />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-bold text-primary mb-2">Farm Health Assessment</h2>
                    <p className="text-muted-foreground text-lg leading-relaxed">{analysis.farm_health.status}</p>
                    <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
                      {analysis.farm_health.tags.map((tag, idx) => (
                        <span key={idx} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              <div className="border border-accent/20 bg-accent/5 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="h-4 w-4 text-accent-foreground" />
                  <span className="font-medium text-sm">{analysis.indices.irrigation_need_score.label}</span>
                </div>
                <div className="text-2xl font-bold">{analysis.indices.irrigation_need_score.value}</div>
                <div className="text-xs text-muted-foreground">{analysis.indices.irrigation_need_score.unit}</div>
              </div>

              <div className="border border-secondary/20 bg-secondary/5 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CloudSun className="h-4 w-4 text-secondary-foreground" />
                  <span className="font-medium text-sm">{analysis.indices.heat_stress_index.label}</span>
                </div>
                <div className="text-lg font-semibold">{analysis.indices.heat_stress_index.value}</div>
                <div className="text-xs text-muted-foreground">{analysis.indices.heat_stress_index.unit}</div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {analysis.alerts.length > 0 && (
            <div className="border border-destructive/20 rounded-lg">
              <div className="p-4 pb-3 border-b border-destructive/10">
                <h3 className="flex items-center gap-2 text-destructive font-semibold">
                  <AlertTriangle className="h-5 w-5" />
                  Active Alerts
                  <span className="ml-auto bg-destructive/10 text-destructive px-2 py-1 rounded-md text-sm">
                    {analysis.alerts.length}
                  </span>
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {analysis.alerts.map((alert, idx) => (
                  <div key={idx} className="border-l-4 border-destructive bg-destructive/5 p-4 rounded-r-lg">
                    <h4 className="font-medium text-destructive mb-1">{alert.type}</h4>
                    <p className="text-sm text-foreground mb-2">{alert.message}</p>
                    <div className="bg-background/50 rounded p-2">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Recommendation:</span> {alert.recommendation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trends + Recommendations */}
          <div className="grid lg:grid-cols-2 gap-6">
            {analysis.trends.length > 0 && (
              <div className="border border-info/20 rounded-lg">
                <div className="p-4 pb-3 border-b border-info/10">
                  <h3 className="flex items-center gap-2 text-info font-semibold">
                    <TrendingUp className="h-5 w-5" />
                    Current Trends
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {analysis.trends.map((trend, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-info/5 border border-info/10">
                      <div className="rounded-full bg-info/20 p-1 mt-1">
                        <div className="w-2 h-2 bg-info rounded-full"></div>
                      </div>
                      <p className="text-sm">{trend}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.recommendations.length > 0 && (
              <div className="border border-success/20 rounded-lg">
                <div className="p-4 pb-3 border-b border-success/10">
                  <h3 className="flex items-center gap-2 text-success font-semibold">
                    <Target className="h-5 w-5" />
                    Recommendations
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {analysis.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-success/5 border border-success/10">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Forecast + Indices */}
          <div className="grid grid-cols-2 gap-6">
            <Card className="border-accent/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-accent-foreground">
                  <CloudSun className="h-5 w-5" />
                  3-Hour Forecast
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-accent/5 rounded-lg">
                  <span className="text-lg">{analysis.forecast.soil_moisture_next_3h.icon}</span>
                  <div>
                    <p className="font-medium">{analysis.forecast.soil_moisture_next_3h.label}</p>
                    <p className="text-sm text-muted-foreground">{analysis.forecast.soil_moisture_next_3h.value}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-accent/5 rounded-lg">
                  <span className="text-lg">{analysis.forecast.air_temp_next_3h.icon}</span>
                  <div>
                    <p className="font-medium">{analysis.forecast.air_temp_next_3h.label}</p>
                    <p className="text-sm text-muted-foreground">{analysis.forecast.air_temp_next_3h.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-secondary/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-secondary-foreground">
                  <Gauge className="h-5 w-5" />
                  Farm Indices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-lg border ${getIndexColor(analysis.indices.heat_stress_index.value, 'heat_stress')}`}>
                    <p className="text-sm font-medium">{analysis.indices.heat_stress_index.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {analysis.indices.heat_stress_index.value} {analysis.indices.heat_stress_index.unit ?? ""}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg border ${getIndexColor(analysis.indices.irrigation_need_score.value, 'irrigation')}`}>
                    <p className="text-sm font-medium">{analysis.indices.irrigation_need_score.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {analysis.indices.irrigation_need_score.value} {analysis.indices.irrigation_need_score.unit ?? ""}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg border ${getIndexColor(analysis.indices.air_quality_risk.value, 'air_quality')}`}>
                    <p className="text-sm font-medium">{analysis.indices.air_quality_risk.label}</p>
                    <p className="text-sm text-muted-foreground">{analysis.indices.air_quality_risk.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg border ${getIndexColor(analysis.indices.sensor_reliability.value, 'reliability')}`}>
                    <p className="text-sm font-medium">{analysis.indices.sensor_reliability.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {analysis.indices.sensor_reliability.value} {analysis.indices.sensor_reliability.unit ?? ""}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
});

export default TrendAnalysis;
