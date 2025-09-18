import { useState } from "react";
import { toast } from 'sonner';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { Download, FileBarChart, TrendingUp, Activity, CheckCircle2, AlertCircle } from "lucide-react";

export default function Reports() {
  // Clear all sensor records
  const clearAllRecords = async () => {
    if (!window.confirm('Are you sure you want to delete all sensor records? This action cannot be undone.')) return;
    
    try {
      console.log('🗑️ Starting delete all records...');
      
      // First check how many records exist
      const { count } = await supabase
        .from('sensor_readings')
        .select('*', { count: 'exact', head: true });
      
      console.log('📊 Total records found:', count);
      
      if (count === 0) {
        toast.info('No records to delete');
        return;
      }
      
      // Try multiple delete approaches
      console.log('🔄 Attempting bulk delete...');
      
      // Method 1: Delete in batches
      let deletedCount = 0;
      const batchSize = 1000;
      let hasMoreRecords = true;
      
      while (hasMoreRecords) {
        const { data: batch, error: fetchError } = await supabase
          .from('sensor_readings')
          .select('id')
          .limit(batchSize);
        
        if (fetchError) {
          console.error('Fetch error:', fetchError);
          break;
        }
        
        if (!batch || batch.length === 0) {
          hasMoreRecords = false;
          break;
        }
        
        const ids = batch.map(record => record.id);
        
        const { error: deleteError } = await supabase
          .from('sensor_readings')
          .delete()
          .in('id', ids);
        
        if (deleteError) {
          console.error('Batch delete error:', deleteError);
          toast.error('Failed to delete records: ' + deleteError.message);
          return;
        }
        
        deletedCount += batch.length;
        console.log(`✅ Deleted batch of ${batch.length} records (Total: ${deletedCount})`);
        
        // If we got less than batchSize, we're done
        if (batch.length < batchSize) {
          hasMoreRecords = false;
        }
      }
      
      console.log('✅ Delete completed');
      toast.success(`Successfully deleted ${deletedCount} sensor records`);
      
      // Force refresh the page to update all components
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (err) {
      console.error('Delete operation failed:', err);
      toast.error('Failed to delete records');
    }
  };
  const { user } = useAuth();
  const { t } = useLanguage();
  const [selectedPeriod, setSelectedPeriod] = useState("7");
  const [selectedMetric, setSelectedMetric] = useState("mixed");

  // Fetch sensor data for reports
  const { data: sensorData = [] } = useQuery({
    queryKey: ['sensor-reports', selectedPeriod],
    queryFn: async () => {
      const days = parseInt(selectedPeriod);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch tasks data for reports
  const { data: tasksData = [] } = useQuery({
    queryKey: ['task-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('farm_tasks')
        .select('*')
        .eq('user_id', user?.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Fetch alerts data
  const { data: alertsData = [] } = useQuery({
    queryKey: ['alert-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user?.id)
        .order('timestamp', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Process sensor data for charts
  const processedSensorData = sensorData.map(reading => ({
    timestamp: new Date(reading.timestamp).toLocaleDateString(),
    air_temperature: (reading as any).air_temperature ?? reading.temperature ?? null,
    air_humidity: (reading as any).air_humidity ?? reading.humidity ?? null,
    soil_moisture: reading.soil_moisture ?? null,
    air_air_quality_mq135: (reading as any).air_air_quality_mq135 ?? reading.air_quality_mq135 ?? null,
    air_alcohol_mq3: (reading as any).air_alcohol_mq3 ?? reading.alcohol_mq3 ?? null,
    air_smoke_mq2: (reading as any).air_smoke_mq2 ?? reading.smoke_mq2 ?? null,
    soil_temperature: (reading as any).soil_temperature ?? reading.temperature ?? null,
    soil_humidity: (reading as any).soil_humidity ?? reading.humidity ?? null,
  }));

  // Task completion data
  const taskStats = {
    completed: tasksData.filter(task => task.is_completed).length,
    pending: tasksData.filter(task => !task.is_completed).length,
    overdue: tasksData.filter(task => 
      !task.is_completed && task.due_date && new Date(task.due_date) < new Date()
    ).length
  };

  const taskChartData = [
    { name: t('Completed'), value: taskStats.completed, color: '#10b981' },
    { name: t('Pending'), value: taskStats.pending, color: '#f59e0b' },
    { name: t('Overdue'), value: taskStats.overdue, color: '#ef4444' }
  ];

  // Alert severity distribution
  const alertSeverityData = alertsData.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const alertChartData = Object.entries(alertSeverityData).map(([severity, count]) => ({
    name: severity.charAt(0).toUpperCase() + severity.slice(1),
    value: count,
    color: severity === 'critical' ? '#ef4444' : severity === 'warning' ? '#f59e0b' : '#10b981'
  }));

  const exportData = () => {
    const reportData = {
      period: selectedPeriod,
      sensorReadings: sensorData.length,
      taskStats,
      alertsCount: alertsData.length,
      generatedAt: new Date().toISOString()
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `farm-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileBarChart className="h-6 w-6" />
          <h1 className="text-2xl font-bold">{t('Reports & Analytics')}</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {t('Export Report')}
          </Button>
          <Button onClick={clearAllRecords} variant="destructive">
            Clear All Records
          </Button>
        </div>
      </div>

      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Report Settings')}</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('Time Period')}</label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{t('7 Days')}</SelectItem>
                <SelectItem value="30">{t('30 Days')}</SelectItem>
                <SelectItem value="90">{t('90 Days')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('Primary Metric')}</label>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mixed">{t('Mixed (All Metrics)')}</SelectItem>
                <SelectItem value="air_temperature">{t('Air Temperature')}</SelectItem>
                <SelectItem value="air_humidity">{t('Air Humidity')}</SelectItem>
                <SelectItem value="soil_moisture">{t('Soil Moisture')}</SelectItem>
                <SelectItem value="air_air_quality_mq135">{t('Air Quality')}</SelectItem>
                <SelectItem value="air_alcohol_mq3">{t('Alcohol')}</SelectItem>
                <SelectItem value="air_smoke_mq2">{t('Smoke')}</SelectItem>
                <SelectItem value="soil_temperature">{t('Soil Temperature')}</SelectItem>
                <SelectItem value="soil_humidity">{t('Soil Humidity')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('Sensor Readings')}</p>
                <p className="text-2xl font-bold">{sensorData.length}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('Tasks Completed')}</p>
                <p className="text-2xl font-bold text-green-600">{taskStats.completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('Active Alerts')}</p>
                <p className="text-2xl font-bold text-red-600">{alertsData.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('Efficiency')}</p>
                <p className="text-2xl font-bold text-purple-600">
                  {tasksData.length > 0 ? Math.round((taskStats.completed / tasksData.length) * 100) : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sensor Data Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Sensor Data Trends')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processedSensorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                {selectedMetric === "mixed" ? (
                  // Show multiple lines for mixed view
                  <>
                    <Line 
                      type="monotone" 
                      dataKey="air_temperature" 
                      stroke="#e74c3c" 
                      strokeWidth={2}
                      dot={{ fill: '#e74c3c', strokeWidth: 2 }}
                      name="Air Temperature (°C)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="air_humidity" 
                      stroke="#3498db" 
                      strokeWidth={2}
                      dot={{ fill: '#3498db', strokeWidth: 2 }}
                      name="Air Humidity (%)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="soil_moisture" 
                      stroke="#2ecc71" 
                      strokeWidth={2}
                      dot={{ fill: '#2ecc71', strokeWidth: 2 }}
                      name="Soil Moisture (%)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="soil_temperature" 
                      stroke="#f39c12" 
                      strokeWidth={2}
                      dot={{ fill: '#f39c12', strokeWidth: 2 }}
                      name="Soil Temperature (°C)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="air_air_quality_mq135" 
                      stroke="#9b59b6" 
                      strokeWidth={2}
                      dot={{ fill: '#9b59b6', strokeWidth: 2 }}
                      name="Air Quality (ppm)"
                    />
                  </>
                ) : (
                  // Show single line for specific metric
                  <Line 
                    type="monotone" 
                    dataKey={selectedMetric} 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981' }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Current Values Display */}
          {processedSensorData.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">{t('Current Values')}</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {selectedMetric === "mixed" ? (
                  // Show current values for all metrics in mixed view
                  <>
                    {processedSensorData[processedSensorData.length - 1]?.air_temperature !== null && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#e74c3c' }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground truncate">{t('Air Temperature')}</p>
                          <p className="text-sm font-semibold">
                            {processedSensorData[processedSensorData.length - 1]?.air_temperature?.toFixed(1) || '0.0'} 
                            <span className="text-xs text-muted-foreground ml-1">°C</span>
                          </p>
                        </div>
                      </div>
                    )}
                    {processedSensorData[processedSensorData.length - 1]?.air_humidity !== null && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#3498db' }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground truncate">{t('Air Humidity')}</p>
                          <p className="text-sm font-semibold">
                            {processedSensorData[processedSensorData.length - 1]?.air_humidity?.toFixed(1) || '0.0'} 
                            <span className="text-xs text-muted-foreground ml-1">%</span>
                          </p>
                        </div>
                      </div>
                    )}
                    {processedSensorData[processedSensorData.length - 1]?.soil_moisture !== null && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#2ecc71' }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground truncate">{t('Soil Moisture')}</p>
                          <p className="text-sm font-semibold">
                            {processedSensorData[processedSensorData.length - 1]?.soil_moisture?.toFixed(1) || '0.0'} 
                            <span className="text-xs text-muted-foreground ml-1">%</span>
                          </p>
                        </div>
                      </div>
                    )}
                    {processedSensorData[processedSensorData.length - 1]?.soil_temperature !== null && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#f39c12' }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground truncate">{t('Soil Temperature')}</p>
                          <p className="text-sm font-semibold">
                            {processedSensorData[processedSensorData.length - 1]?.soil_temperature?.toFixed(1) || '0.0'} 
                            <span className="text-xs text-muted-foreground ml-1">°C</span>
                          </p>
                        </div>
                      </div>
                    )}
                    {processedSensorData[processedSensorData.length - 1]?.air_air_quality_mq135 !== null && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#9b59b6' }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground truncate">{t('Air Quality')}</p>
                          <p className="text-sm font-semibold">
                            {processedSensorData[processedSensorData.length - 1]?.air_air_quality_mq135?.toFixed(0) || '0'} 
                            <span className="text-xs text-muted-foreground ml-1">ppm</span>
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  // Show current value for selected metric
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#10b981' }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground truncate">
                        {selectedMetric === 'air_temperature' && t('Air Temperature')}
                        {selectedMetric === 'air_humidity' && t('Air Humidity')}
                        {selectedMetric === 'soil_moisture' && t('Soil Moisture')}
                        {selectedMetric === 'air_air_quality_mq135' && t('Air Quality')}
                        {selectedMetric === 'air_alcohol_mq3' && t('Alcohol')}
                        {selectedMetric === 'air_smoke_mq2' && t('Smoke')}
                        {selectedMetric === 'soil_temperature' && t('Soil Temperature')}
                        {selectedMetric === 'soil_humidity' && t('Soil Humidity')}
                      </p>
                      <p className="text-sm font-semibold">
                        {processedSensorData[processedSensorData.length - 1]?.[selectedMetric]?.toFixed(1) || '0.0'} 
                        <span className="text-xs text-muted-foreground ml-1">
                          {(selectedMetric.includes('temperature')) ? '°C' : 
                           (selectedMetric.includes('humidity') || selectedMetric.includes('moisture')) ? '%' : 'ppm'}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Completion Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Task Distribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {taskChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Recent Alerts')}</CardTitle>
          </CardHeader>
          <CardContent>
            {alertsData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {t('No alerts to display')}
              </p>
            ) : (
              <div className="space-y-3">
                {alertsData.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Badge 
                      variant={alert.severity === 'critical' ? 'destructive' : 
                              alert.severity === 'warning' ? 'default' : 'secondary'}
                    >
                      {alert.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Export Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Report Summary')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium">{t('Data Collection Period')}</p>
              <p className="text-muted-foreground">{t('Last')} {selectedPeriod} {t('days')}</p>
            </div>
            <div>
              <p className="font-medium">{t('Total Data Points')}</p>
              <p className="text-muted-foreground">{sensorData.length} {t('sensor readings')}</p>
            </div>
            <div>
              <p className="font-medium">{t('Report Generated')}</p>
              <p className="text-muted-foreground">{new Date().toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}