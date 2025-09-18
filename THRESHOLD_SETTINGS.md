# Threshold Settings Feature

## Overview
A comprehensive threshold management system for sensor values that allows users to configure custom warning and critical thresholds for all sensor types in the farm monitoring system.

## Features

### 🎛️ Configurable Thresholds
- **Air Node Sensors**: Temperature, Humidity, Air Quality (MQ135), Alcohol (MQ3), Smoke (MQ2)
- **Individual Control**: Each sensor has separate low and high threshold sliders
- **Real-time Preview**: Live status zones showing Critical → Healthy → Critical ranges

### 🎯 Smart Status System
- **Dynamic Calculation**: Replaces hardcoded threshold values with user-configured ones
- **Backward Compatibility**: Maintains support for legacy sensor type mappings
- **Intelligent Mapping**: Automatically maps old sensor types to new threshold types

### 🔄 Live Updates
- **Dashboard Integration**: KPI cards immediately reflect new threshold settings
- **AI Analysis**: Gemini AI uses current thresholds for farm health analysis
- **Reports**: All reporting features use dynamic thresholds

### 💾 Persistent Storage
- **Local Storage**: Settings saved automatically in browser storage
- **Default Fallbacks**: Sensible defaults based on polyhouse conditions
- **Reset Option**: One-click reset to factory defaults

## Usage

### Accessing Threshold Settings
1. Navigate to **Settings** page
2. Scroll to the **Threshold Settings** section
3. Configure thresholds for Air Node Sensors

### Configuring Thresholds
1. **Low Threshold (Orange)**: Values below this trigger warnings/critical status
2. **High Threshold (Red)**: Values above this trigger warnings/critical status
3. **Healthy Range**: Values between low and high thresholds
4. **Real-time Preview**: See critical/healthy zones as you adjust sliders

### Saving Changes
1. Adjust any threshold sliders
2. Click **"Save Thresholds"** button
3. Settings are immediately applied across the entire application
4. Warning shown if there are unsaved changes

## Technical Implementation

### Files Modified/Created
- `src/components/settings/ThresholdSettings.tsx` - Main threshold configuration component
- `src/utils/thresholds.ts` - Utility functions for threshold operations
- `src/pages/Settings.tsx` - Updated to include threshold settings
- `src/pages/Index.tsx` - Updated to use dynamic thresholds
- `src/components/GeminiAnalysis.ts` - AI analysis uses dynamic thresholds

### Key Functions
```typescript
// Get current threshold settings
getStoredThresholds(): Record<string, SensorThreshold>

// Calculate status using thresholds
getStatusWithThresholds(value: number, type: SensorType): 'healthy' | 'warning' | 'critical'

// Backward compatibility helper
getSensorStatus(value: number, sensorType: string): 'healthy' | 'warning' | 'critical'
```

### Default Threshold Values
```typescript
{
  air_temperature: { low: 20, high: 32, unit: "°C" },
  air_humidity: { low: 40, high: 80, unit: "%" },
  air_quality_mq135: { low: 1000, high: 3000, unit: "ppm" },
  alcohol_mq3: { low: 500, high: 1200, unit: "ppm" },
  smoke_mq2: { low: 1000, high: 2200, unit: "ppm" }
}
```

## Benefits

### For Users
- **Customization**: Tailor alerts to specific crop requirements
- **Flexibility**: Different thresholds for different growing seasons
- **Ease of Use**: Intuitive slider interface with visual feedback
- **Real-time Updates**: Immediate effect across all system components

### For System
- **Consistency**: Single source of truth for all threshold logic
- **Maintainability**: Centralized threshold management
- **Scalability**: Easy to add new sensor types
- **Integration**: Works seamlessly with existing dashboard, AI, and reporting features

## Future Enhancements
- **Crop-specific Presets**: Pre-configured thresholds for different crops
- **Time-based Thresholds**: Different thresholds for different times of day/season
- **Advanced Rules**: Complex threshold logic with multiple conditions
- **Export/Import**: Save and share threshold configurations
- **API Integration**: Sync thresholds with external farm management systems

## Troubleshooting

### Thresholds Not Saving
- Check browser localStorage permissions
- Ensure JavaScript is enabled
- Try refreshing the page and reconfiguring

### Dashboard Not Updating
- Verify thresholds were saved (no warning message)
- Refresh the dashboard page
- Check browser console for errors

### AI Analysis Not Using New Thresholds
- Ensure thresholds are saved in settings
- AI analysis uses thresholds from the next analysis request
- Previous analysis results may still show old thresholds
