# Database Collection Control System

## Overview

This system provides **database-level control** over sensor data collection. When collection is "stopped", the database will not accept new sensor data, providing a more robust control mechanism than just relying on ESP nodes.

## How It Works

### 1. Configuration Storage
- Collection status is stored in the `sensor_readings` table using special configuration records
- These records have `node_id` starting with `__CONFIG_COLLECTION_` and `air_quality_mq135` = -888
- `temperature` field: 1 = enabled, 0 = disabled
- `alcohol_mq3` field: 0 = stopped, 1 = collecting, 2 = continuous

### 2. Frontend Control
- Use the dropdown in the SimulationController to change collection mode
- Options: Stopped, Collecting, Continuous
- Status is immediately saved to localStorage and database

### 3. Database Protection
- ESP nodes should check collection status before inserting data
- Use the `ESPCollectionMiddleware.shouldCollectData()` function
- If disabled, ESP nodes should not attempt database inserts

## Usage

### For Frontend (Dashboard)
```typescript
// Collection status is controlled via the dropdown in SimulationController
// Test database collection with the "Test Database Insert" button
```

### For ESP Nodes
```cpp
// Before sending data, check collection status:
// GET request to /api/esp-collection-status
// Or implement the middleware logic in ESP code

// Example ESP logic:
if (collectionEnabled) {
  sendDataToDatabase(sensorData);
} else {
  Serial.println("Collection disabled - not sending data");
}
```

### For Backend/Middleware
```typescript
import ESPCollectionMiddleware from '@/api/esp-collection-middleware';

// Check if collection is enabled
const status = await ESPCollectionMiddleware.shouldCollectData();
if (status.enabled) {
  // Proceed with data insertion
}

// Or use the wrapper function
const result = await ESPCollectionMiddleware.insertSensorData(sensorData);
```

## Key Features

1. **Immediate Effect**: Changes take effect immediately for new requests
2. **Persistent Storage**: Collection status persists in database
3. **Fallback Safe**: Defaults to enabled if status cannot be determined
4. **ESP Integration**: Works with existing ESP status file system
5. **Testing**: Built-in test function to verify database protection

## Files Modified

- `src/components/dashboard/SimulationController.tsx` - Main control interface
- `src/api/esp-collection-middleware.ts` - Middleware for ESP integration
- `scripts/update-esp-status.js` - ESP status file management
- `public/esp-connection-status.json` - ESP status file

## Testing

1. Set collection to "Stopped" via dropdown
2. Click "Test Database Insert" button
3. Verify that inserts are blocked/allowed based on status
4. Check console logs for status updates

## ESP Integration Required

ESP nodes need to:
1. Check collection status before sending data
2. Respect the `data_collection_enabled` flag
3. Poll status every 30 seconds or implement webhook

The system now provides true database-level protection against unwanted data collection!
