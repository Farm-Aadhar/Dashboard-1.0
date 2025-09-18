import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Sprout, 
  Wrench, 
  History, 
  AlertTriangle, 
  CheckCircle,
  RotateCcw,
  Save
} from 'lucide-react';
import { globalThresholdService, CROP_PRESETS, ThresholdPreset, ThresholdChangeLog } from '@/lib/globalThresholdService';
import { SensorThreshold } from '@/components/settings/ThresholdSettings';
import ThresholdSlider from '@/components/settings/ThresholdSlider';

interface GlobalThresholdManagerProps {
  latestSensorData?: any;
}

const GlobalThresholdManager: React.FC<GlobalThresholdManagerProps> = ({ latestSensorData }) => {
  const [currentThresholds, setCurrentThresholds] = useState<Record<string, SensorThreshold>>({});
  const [currentPreset, setCurrentPreset] = useState<string | null>(null);
  const [changeHistory, setChangeHistory] = useState<ThresholdChangeLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Subscribe to threshold changes
  useEffect(() => {
    const unsubscribe = globalThresholdService.subscribe((thresholds) => {
      setCurrentThresholds(thresholds);
      setCurrentPreset(globalThresholdService.getCurrentPreset());
    });

    // Load change history
    loadChangeHistory();

    return unsubscribe;
  }, []);

  const loadChangeHistory = async () => {
    try {
      const history = await globalThresholdService.getChangeHistory(20);
      setChangeHistory(history);
    } catch (error) {
      console.error('Failed to load change history:', error);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handlePresetChange = async (presetId: string) => {
    if (presetId === currentPreset) return;

    setIsLoading(true);
    try {
      await globalThresholdService.applyPreset(presetId);
      showNotification('success', `Applied ${CROP_PRESETS.find(p => p.id === presetId)?.name} preset successfully`);
      await loadChangeHistory();
    } catch (error) {
      showNotification('error', 'Failed to apply preset');
      console.error('Error applying preset:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualUpdate = async (updatedThresholds: Record<string, SensorThreshold>) => {
    setIsLoading(true);
    try {
      await globalThresholdService.updateThresholds(updatedThresholds);
      showNotification('success', 'Thresholds updated successfully');
      await loadChangeHistory();
    } catch (error) {
      showNotification('error', 'Failed to update thresholds');
      console.error('Error updating thresholds:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalibration = async () => {
    if (!latestSensorData) {
      showNotification('error', 'No sensor data available for calibration');
      return;
    }

    setIsLoading(true);
    try {
      await globalThresholdService.calibrateFromCurrentReadings(latestSensorData);
      showNotification('success', 'Thresholds calibrated from current sensor readings');
      await loadChangeHistory();
    } catch (error) {
      showNotification('error', 'Failed to calibrate thresholds');
      console.error('Error calibrating thresholds:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleThresholdChange = (sensorKey: string, newThreshold: SensorThreshold) => {
    const updatedThresholds = {
      ...currentThresholds,
      [sensorKey]: newThreshold
    };
    handleManualUpdate(updatedThresholds);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case 'preset': return <Sprout className="h-4 w-4" />;
      case 'calibration': return <Wrench className="h-4 w-4" />;
      case 'manual': return <Settings className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'preset': return 'bg-green-100 text-green-800';
      case 'calibration': return 'bg-blue-100 text-blue-800';
      case 'manual': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <Alert className={notification.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={notification.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {notification.message}
            </AlertDescription>
          </div>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Threshold Management
            </CardTitle>
            {/* Global Calibration Button */}
            {latestSensorData && (
              <Button
                onClick={handleCalibration}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                title="Calibrate all thresholds globally from current sensor readings"
              >
                <Wrench className="h-4 w-4 mr-2" />
                🌡️ Global Calibration
              </Button>
            )}
          </div>
          {currentPreset && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Sprout className="h-3 w-3" />
                Active: {CROP_PRESETS.find(p => p.id === currentPreset)?.name}
              </Badge>
              <span className="text-sm text-muted-foreground">
                • All components use these thresholds
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="presets" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="presets">Crop Presets</TabsTrigger>
              <TabsTrigger value="manual">Manual Settings</TabsTrigger>
              <TabsTrigger value="history">Change History</TabsTrigger>
            </TabsList>

            {/* Crop Presets Tab */}
            <TabsContent value="presets" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Choose Crop Preset</h3>
                    <p className="text-sm text-muted-foreground">
                      Select optimized thresholds for your crop type
                    </p>
                  </div>
                  {latestSensorData && (
                    <Button
                      variant="outline"
                      onClick={handleCalibration}
                      disabled={isLoading}
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Auto-Calibrate
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {CROP_PRESETS.map((preset) => (
                    <Card
                      key={preset.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        currentPreset === preset.id ? 'ring-2 ring-primary border-primary' : ''
                      }`}
                      onClick={() => handlePresetChange(preset.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium flex items-center gap-2">
                            <Sprout className="h-4 w-4" />
                            {preset.name}
                          </h4>
                          {currentPreset === preset.id && (
                            <Badge variant="default">Active</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{preset.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {currentPreset && (
                  <Alert>
                    <Sprout className="h-4 w-4" />
                    <AlertDescription>
                      Currently using <strong>{CROP_PRESETS.find(p => p.id === currentPreset)?.name}</strong> preset. 
                      All dashboard components will use these optimized thresholds.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            {/* Manual Settings Tab */}
            <TabsContent value="manual" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Manual Threshold Configuration</h3>
                    <p className="text-sm text-muted-foreground">
                      Fine-tune individual sensor thresholds
                    </p>
                  </div>
                  {currentPreset && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Settings className="h-3 w-3" />
                      Modified from {CROP_PRESETS.find(p => p.id === currentPreset)?.name}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {Object.entries(currentThresholds).map(([sensorKey, threshold]) => (
                    <ThresholdSlider
                      key={sensorKey}
                      sensorKey={sensorKey}
                      threshold={threshold}
                      onChange={(newThreshold) => handleThresholdChange(sensorKey, newThreshold)}
                      disabled={isLoading}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Change History Tab */}
            <TabsContent value="history" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Threshold Change History</h3>
                  <p className="text-sm text-muted-foreground">
                    Track all threshold modifications and their sources
                  </p>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {changeHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No threshold changes recorded yet</p>
                    </div>
                  ) : (
                    changeHistory.map((change) => (
                      <Card key={change.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="mt-1">
                                {getChangeTypeIcon(change.changeType)}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge className={getChangeTypeColor(change.changeType)}>
                                    {change.changeType}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {formatTimestamp(change.timestamp)}
                                  </span>
                                </div>
                                {change.notes && (
                                  <p className="text-sm">{change.notes}</p>
                                )}
                                {change.presetUsed && (
                                  <p className="text-sm text-muted-foreground">
                                    Applied preset: <strong>{CROP_PRESETS.find(p => p.id === change.presetUsed)?.name}</strong>
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalThresholdManager;