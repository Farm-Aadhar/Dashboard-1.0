import React, { useState } from "react";
import { AlertTriangle, TrendingUp, CheckCircle2, Activity, CloudSun, Gauge, BarChart3, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Mock analysis function for demonstration
function getAnalysis(farmData) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        farm_health: {
          score: 78,
          status: "Good - Farm conditions are stable with room for optimization"
        },
        alerts: [
          {
            type: "Soil Moisture Alert",
            message: "Sector 2 showing moisture levels below optimal range",
            recommendation: "Schedule irrigation within the next 6 hours to maintain crop health"
          }
        ],
        trends: [
          "Soil moisture has decreased by 8% over the past week",
          "Temperature patterns showing consistent daily variations",
          "Humidity levels remain within acceptable parameters"
        ],
        recommendations: [
          "Implement drip irrigation system for better water efficiency",
          "Monitor soil pH levels weekly during growing season",
          "Consider cover crops to improve soil moisture retention"
        ],
        forecast: {
          soil_moisture_next_3h: "Decreasing to 42%",
          air_temp_next_3h: "Rising to 26°C"
        },
        indices: {
          heat_stress_index: "Moderate",
          irrigation_need_score: 7.2,
          air_quality_risk: "Low",
          sensor_reliability: "High (98%)"
        }
      });
    }, 1500);
  });
}

// Type for the response
type AnalysisResponse = {
  farm_health: { score: number; status: string };
  alerts: { type: string; message: string; recommendation: string }[];
  trends: string[];
  recommendations: string[];
  forecast: { soil_moisture_next_3h: string; air_temp_next_3h: string };
  indices: {
    heat_stress_index: string;
    irrigation_need_score: number;
    air_quality_risk: string;
    sensor_reliability: string;
  };
};

type TrendAnalysisProps = {
  farmData?: any[];
};

function TrendAnalysis({ farmData = [{ id: 1, sensor: 'test', value: 50 }] }: TrendAnalysisProps) {
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalysis = async () => {
    if (!farmData || farmData.length === 0) return;
    setLoading(true);

    try {
      const result = await getAnalysis(farmData);
      if (result) setAnalysis(result);
    } catch (err) {
      console.error("Analysis failed:", err);
    }

    setLoading(false);
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return "border-success bg-success/5";
    if (score >= 60) return "border-warning bg-warning/5";
    return "border-destructive bg-destructive/5";
  };

  const getHealthIcon = (score: number) => {
    if (score >= 80) return <Activity className="h-5 w-5 text-success" />;
    if (score >= 60) return <BarChart3 className="h-5 w-5 text-warning" />;
    return <AlertTriangle className="h-5 w-5 text-destructive" />;
  };

  const SpeedometerGauge = ({ score }: { score: number }) => {
    const radius = 80;
    const strokeWidth = 12;
    const normalizedRadius = radius - strokeWidth * 2;
    const circumference = normalizedRadius * Math.PI; // Half circle
    const strokeDasharray = `${circumference} ${circumference}`;
    
    // Calculate stroke offset based on score (0-100)
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
          <svg
            height={radius + 20}
            width={radius * 2 + 20}
            className="transform -90"
          >
            {/* Background arc */}
            <path
              d={`M 20 ${radius + 10} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2} ${radius + 10}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-muted/20"
            />
            
            {/* Colored segments */}
            <defs>
              <linearGradient id="speedometer-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--destructive))" />
                <stop offset="30%" stopColor="hsl(var(--warning))" />
                <stop offset="70%" stopColor="hsl(var(--success))" />
                <stop offset="100%" stopColor="hsl(var(--success))" />
              </linearGradient>
            </defs>
            
            {/* Progress arc */}
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
          
          {/* Center score */}
          <div className="absolute mt-8 inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">{score}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
        </div>
        
        {/* Status indicator */}
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
            <button 
              onClick={handleAnalysis} 
              disabled={loading || !farmData}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Analyzing...
                </div>
              ) : (
                "Generate Analysis"
              )}
            </button>
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
            <h3 className="text-lg font-medium text-foreground mb-2">
              Ready to Analyze Your Farm Data
            </h3>
            <p className="text-muted-foreground">
              Click "Generate Analysis" to get detailed insights about your farm's performance and recommendations.
            </p>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-8">
          {/* Asymmetric Layout - Farm Health + Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Farm Health Score - Takes 2 columns */}
            <div className="lg:col-span-2">
              <div className="border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-shrink-0">
                    <SpeedometerGauge score={analysis.farm_health.score} />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-bold text-primary mb-2">
                      Farm Health Assessment
                    </h2>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      {analysis.farm_health.status}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
                      <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                        Real-time Analysis
                      </span>
                      <span className="px-3 py-1 bg-accent/10 text-accent-foreground rounded-full text-sm">
                        AI Powered
                      </span>
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
                  <span className="font-medium text-sm">Irrigation Need</span>
                </div>
                <div className="text-2xl font-bold">{analysis.indices.irrigation_need_score}</div>
                <div className="text-xs text-muted-foreground">out of 10</div>
              </div>
              
              <div className="border border-secondary/20 bg-secondary/5 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CloudSun className="h-4 w-4 text-secondary-foreground" />
                  <span className="font-medium text-sm">Heat Stress</span>
                </div>
                <div className="text-lg font-semibold">{analysis.indices.heat_stress_index}</div>
                <div className="text-xs text-muted-foreground">Current level</div>
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
                  <div
                    key={idx}
                    className="border-l-4 border-destructive bg-destructive/5 p-4 rounded-r-lg"
                  >
                    <h4 className="font-medium text-destructive mb-1">
                      {alert.type}
                    </h4>
                    <p className="text-sm text-foreground mb-2">
                      {alert.message}
                    </p>
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

          {/* Main Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Trends */}
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
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg bg-info/5 border border-info/10"
                    >
                      <div className="rounded-full bg-info/20 p-1 mt-1">
                        <div className="w-2 h-2 bg-info rounded-full"></div>
                      </div>
                      <p className="text-sm">{trend}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
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
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg bg-success/5 border border-success/10"
                    >
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Forecast */}
            <Card className="border-accent/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-accent-foreground">
                  <CloudSun className="h-5 w-5" />
                  3-Hour Forecast
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-accent/5 rounded-lg">
                  <span className="text-lg">🌱</span>
                  <div>
                    <p className="font-medium">Soil Moisture</p>
                    <p className="text-sm text-muted-foreground">
                      {analysis.forecast.soil_moisture_next_3h}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-accent/5 rounded-lg">
                  <span className="text-lg">🌡️</span>
                  <div>
                    <p className="font-medium">Air Temperature</p>
                    <p className="text-sm text-muted-foreground">
                      {analysis.forecast.air_temp_next_3h}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Indices */}
            <Card className="border-secondary/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-secondary-foreground">
                  <Gauge className="h-5 w-5" />
                  Farm Indices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-secondary/5 rounded-lg border border-secondary/10">
                    <p className="text-sm font-medium">Heat Stress</p>
                    <p className="text-sm text-muted-foreground">
                      {analysis.indices.heat_stress_index}
                    </p>
                  </div>
                  <div className="p-3 bg-secondary/5 rounded-lg border border-secondary/10">
                    <p className="text-sm font-medium">Irrigation Need</p>
                    <p className="text-sm text-muted-foreground">
                      {analysis.indices.irrigation_need_score}/10
                    </p>
                  </div>
                  <div className="p-3 bg-secondary/5 rounded-lg border border-secondary/10">
                    <p className="text-sm font-medium">Air Quality</p>
                    <p className="text-sm text-muted-foreground">
                      {analysis.indices.air_quality_risk}
                    </p>
                  </div>
                  <div className="p-3 bg-secondary/5 rounded-lg border border-secondary/10">
                    <p className="text-sm font-medium">Sensor Health</p>
                    <p className="text-sm text-muted-foreground">
                      {analysis.indices.sensor_reliability}
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
}

export default TrendAnalysis;