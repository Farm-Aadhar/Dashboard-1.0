# ESP Data Collection Control Integration

## Overview
The new data collection control system provides three modes for managing ESP node data flow to the database:

## Data Collection Modes

### 1. **Stopped** 🔴
- **Purpose**: Stop all data collection to save database storage
- **ESP Behavior**: ESP nodes should NOT send any data to the database
- **Use Case**: When you want to completely stop data logging

### 2. **Collecting** 🔵  
- **Purpose**: Active data collection for immediate monitoring
- **ESP Behavior**: ESP nodes should send data to the database
- **Use Case**: Testing, debugging, or short-term monitoring

### 3. **Continuous** 🟢
- **Purpose**: Ongoing data collection for long-term monitoring  
- **ESP Behavior**: ESP nodes should continuously send data to database
- **Use Case**: Normal operation, production monitoring

## ESP Status API Endpoints

### Primary Status Check (for ESP nodes)
```
GET /esp-connection-status.json
```

**Response Format:**
```json
{
  "esp_connection_enabled": boolean,
  "data_collection_enabled": boolean,
  "collection_mode": "stopped" | "collecting" | "continuous",
  "timestamp": "2025-01-24T12:00:00.000Z",
  "message": "Status description"
}
```

### Alternative Status Check
```
GET /esp-status.html
```
Returns JSON in HTML format for simple polling.

## ESP Node Implementation Guide

### Checking Status (Every 30 seconds)
```cpp
// In your ESP code
void checkDataCollectionStatus() {
  HTTPClient http;
  http.begin("http://dashboard-host/esp-connection-status.json");
  
  int httpCode = http.GET();
  if (httpCode == 200) {
    String payload = http.getString();
    
    // Parse JSON response
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, payload);
    
    bool dataCollectionEnabled = doc["data_collection_enabled"];
    String collectionMode = doc["collection_mode"];
    
    if (!dataCollectionEnabled || collectionMode == "stopped") {
      // STOP sending data to database
      isLoggingEnabled = false;
    } else {
      // START/CONTINUE sending data to database
      isLoggingEnabled = true;
    }
  }
  
  http.end();
}
```

### Recommended ESP Loop Structure
```cpp
void loop() {
  // Read sensors as usual
  readAllSensors();
  
  // Check status every 30 seconds
  if (millis() - lastStatusCheckMillis >= 30000) {
    checkDataCollectionStatus();
    lastStatusCheckMillis = millis();
  }
  
  // Only send data if collection is enabled
  if (isLoggingEnabled && (millis() - lastDataSendMillis >= dataSendInterval)) {
    sendSensorData(); // Your existing function
    lastDataSendMillis = millis();
  }
  
  // Continue with other tasks...
}
```

## Dashboard Control Interface

### Button Controls (Header)
- **Stop Data Collection**: Red button with square icon
- **Collect Now**: Blue button with play icon  
- **Continuous**: Green button with rotate icon

### Settings Dialog
- **Database Control Tab**: Full interface with detailed explanations
- **Visual Status**: Shows current collection mode
- **One-click Mode Changes**: Click any mode to switch immediately

## Benefits

### For Database Management
- **Storage Savings**: Stop collection when not needed
- **Selective Collection**: Collect only when required
- **Cost Control**: Reduce database usage costs

### For ESP Nodes  
- **Battery Savings**: Reduce power consumption when not collecting
- **Network Savings**: Reduce WiFi usage
- **Flexible Operation**: Adapt to different monitoring needs

### For Users
- **Easy Control**: Simple button interface
- **Clear Status**: Always know what's happening
- **Immediate Effect**: Changes take effect within 30 seconds

## Status Persistence
- **Browser Storage**: Settings saved in localStorage
- **Status Files**: Updated automatically for ESP polling
- **Network Commands**: Direct ESP communication when possible

## Troubleshooting

### ESP Not Responding to Status Changes
1. Check ESP network connectivity
2. Verify ESP status polling interval (should be 30 seconds)
3. Check ESP status endpoint URL
4. Review ESP JSON parsing code

### Database Still Receiving Data After Stop
1. Wait 30 seconds for ESP status check
2. Check ESP isLoggingEnabled variable
3. Verify ESP sendSensorData() conditional logic
4. Review ESP loop structure

### Status Not Persisting
1. Check browser localStorage permissions
2. Verify status file write permissions
3. Check network connectivity for status updates
