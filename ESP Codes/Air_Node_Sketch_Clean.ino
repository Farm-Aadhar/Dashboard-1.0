/*
 * Farm Insight Garden - Air Quality Monitoring Node
 * 
 * This ESP32 node monitors:
 * - Air Temperature & Humidity (DHT11)
 * - Air Quality (MQ-135)
 * - Alcohol Detection (MQ-3)
 * - Smoke Detection (MQ-2)
 * 
 * Features:
 * - WiFi connectivity with fallback networks
 * - Web server for local access
 * - Database collection control via dashboard
 * - Optional LCD display
 * - Data caching when offline
 * 
 * Dashboard URLs for collection control:
 * - Development: http://192.168.1.156:8081/esp-connection-status.json
 * - Production: https://lootoo.in/esp-connection-status.json
 */

// ============================================================================
// INCLUDES & CONFIGURATION
// ============================================================================

// Enable/disable LCD display
#define USE_LCD

#ifdef USE_LCD
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#endif

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESPmDNS.h>
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <DHT_U.h>
#include <SPIFFS.h>

// ============================================================================
// NETWORK CONFIGURATION
// ============================================================================

const char* WIFI_NETWORKS[][2] = {
  {"Anistark Moto", "123123123"},
  {"Anushka", "123123123"}
};
const int WIFI_NETWORK_COUNT = 2;

// ============================================================================
// SUPABASE DATABASE CONFIGURATION
// ============================================================================

const char* SUPABASE_URL = "https://ghkcfgcyzhtwufizxuyo.supabase.co";
const char* SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdoa2NmZ2N5emh0d3VmaXp4dXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDYzMiwiZXhwIjoyMDcxMjYwNjMyfQ.romU2eJK__vtjLXOz6Au79vcFJo3Ia87xnARodpr3Ho";
const char* SUPABASE_ENDPOINT = "/rest/v1/sensor_readings";

// ============================================================================
// HARDWARE CONFIGURATION
// ============================================================================

// Pin Definitions
#define LED_PIN 2              // Onboard LED
#define DHTPIN 4               // DHT11 Temperature/Humidity
#define MQ135_PIN 35           // Air Quality Sensor
#define MQ3_PIN 34             // Alcohol Sensor
#define MQ2_PIN 36             // Smoke Sensor

// DHT Sensor
#define DHTTYPE DHT11
DHT_Unified dht(DHTPIN, DHTTYPE);

// LCD Configuration
#ifdef USE_LCD
const int LCD_ADDRESS = 0x27;
const int LCD_COLS = 16;
const int LCD_ROWS = 2;
LiquidCrystal_I2C lcd(LCD_ADDRESS, LCD_COLS, LCD_ROWS);
#endif

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

// Sensor Data
struct SensorData {
  float temperature = 0.0;
  float humidity = 0.0;
  int airQuality = 0;
  int alcohol = 0;
  int smoke = 0;
  bool dhtValid = false;
};

SensorData currentSensors;
SensorData displaySensors; // For stable LCD display

// Timing Variables
unsigned long lastSensorRead = 0;
unsigned long lastDataSend = 0;
unsigned long lastDisplayUpdate = 0;
unsigned long lastStatusCheck = 0;
unsigned long lastLEDBlink = 0;

// Intervals (milliseconds)
const long SENSOR_READ_INTERVAL = 500;    // Read sensors every 500 milliseconds
const long DATA_SEND_INTERVAL = 500;      // Send data every 500 milliseconds
const long DISPLAY_CYCLE_INTERVAL = 10000; // Switch display every 10 seconds
const long STATUS_CHECK_INTERVAL = 30000;  // Check dashboard status every 30 seconds

// Control Flags
bool isLoggingEnabled = true;
bool dashboardCollectionEnabled = true;
int currentDisplayScreen = 0;

// Web Server
WebServer server(80);

// ============================================================================
// FUNCTION DECLARATIONS
// ============================================================================

void connectToWiFi();
void setupHardware();
void setupWebServer();
void readSensors();
void sendSensorData();
void updateDisplay();
void checkDashboardStatus();
void blinkLED(int times = 1, int delayMs = 100);

// Web server handlers
void handleRoot();
void handleToggleLogging();
void handleEnableLogging();
void handleDisableLogging();
void handleNotFound();

// ============================================================================
// SETUP FUNCTION
// ============================================================================

void setup() {
  Serial.begin(115200);
  Serial.println("\n" + String("=").repeat(50));
  Serial.println("🌱 Farm Insight Garden - Air Quality Node");
  Serial.println("Starting up...");
  Serial.println(String("=").repeat(50));

  setupHardware();
  connectToWiFi();
  setupWebServer();

  Serial.println("✅ Setup completed successfully!");
  Serial.println("📡 Web interface: http://air-node.local");
  Serial.println("🔄 Starting main loop...\n");
}

// ============================================================================
// MAIN LOOP
// ============================================================================

void loop() {
  // Handle web server requests
  server.handleClient();

  // Read sensors periodically
  if (millis() - lastSensorRead >= SENSOR_READ_INTERVAL) {
    readSensors();
    lastSensorRead = millis();
  }

  // Update display periodically
  if (millis() - lastDisplayUpdate >= DISPLAY_CYCLE_INTERVAL) {
    updateDisplay();
    lastDisplayUpdate = millis();
  }

  // Check dashboard collection status periodically
  if (millis() - lastStatusCheck >= STATUS_CHECK_INTERVAL) {
    checkDashboardStatus();
    lastStatusCheck = millis();
  }

  // Send data if both local logging and dashboard collection are enabled
  if (millis() - lastDataSend >= DATA_SEND_INTERVAL) {
    if (isLoggingEnabled && dashboardCollectionEnabled) {
      sendSensorData();
      blinkLED(1, 50); // Quick blink on data send
    } else if (isLoggingEnabled && !dashboardCollectionEnabled) {
      // Cache data locally when dashboard collection is disabled
      Serial.println("📦 Caching data locally (dashboard collection disabled)");
    }
    lastDataSend = millis();
  }

  // Alive indicator - slow blink when not sending data
  if (!isLoggingEnabled || !dashboardCollectionEnabled) {
    if (millis() - lastLEDBlink >= 3000) {
      blinkLED(1, 100);
      lastLEDBlink = millis();
    }
  }

  delay(10); // Small delay to prevent watchdog issues
}

// ============================================================================
// HARDWARE SETUP
// ============================================================================

void setupHardware() {
  // LED Setup
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // LCD Setup
#ifdef USE_LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Starting...");
  lcd.setCursor(0, 1);
  lcd.print("Air Quality Node");
#endif

  // DHT Sensor Setup
  dht.begin();
  
  // MQ Sensor Pins
  pinMode(MQ135_PIN, INPUT);
  pinMode(MQ3_PIN, INPUT);
  pinMode(MQ2_PIN, INPUT);

  // SPIFFS for data caching
  if (!SPIFFS.begin(true)) {
    Serial.println("⚠️  SPIFFS mount failed");
  } else {
    Serial.println("💾 SPIFFS mounted successfully");
  }

  Serial.println("🔧 Hardware initialized");
}

// ============================================================================
// WIFI CONNECTION
// ============================================================================

void connectToWiFi() {
  Serial.println("📶 Connecting to WiFi...");
  
#ifdef USE_LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");
#endif

  bool connected = false;
  
  for (int networkIndex = 0; networkIndex < WIFI_NETWORK_COUNT && !connected; networkIndex++) {
    const char* ssid = WIFI_NETWORKS[networkIndex][0];
    const char* password = WIFI_NETWORKS[networkIndex][1];
    
    Serial.printf("🔗 Trying network: %s\n", ssid);
    
#ifdef USE_LCD
    lcd.setCursor(0, 1);
    lcd.print(ssid);
#endif

    WiFi.begin(ssid, password);
    
    // Try to connect for 20 seconds
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 40) {
      delay(500);
      Serial.print(".");
      blinkLED(1, 200);
      attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      connected = true;
      Serial.printf("\n✅ Connected to %s\n", ssid);
      Serial.printf("📍 IP Address: %s\n", WiFi.localIP().toString().c_str());
      
#ifdef USE_LCD
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("WiFi Connected");
      lcd.setCursor(0, 1);
      lcd.print(WiFi.localIP().toString());
      delay(3000);
#endif
    } else {
      Serial.printf("\n❌ Failed to connect to %s\n", ssid);
    }
  }
  
  if (!connected) {
    Serial.println("🚫 Could not connect to any WiFi network");
    Serial.println("♻️  Restarting in 5 seconds...");
    
#ifdef USE_LCD
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Failed!");
    lcd.setCursor(0, 1);
    lcd.print("Restarting...");
#endif
    
    delay(5000);
    ESP.restart();
  }
}

// ============================================================================
// WEB SERVER SETUP
// ============================================================================

void setupWebServer() {
  // mDNS setup
  if (!MDNS.begin("air-node")) {
    Serial.println("❌ mDNS setup failed");
  } else {
    Serial.println("🌐 mDNS started: air-node.local");
    MDNS.addService("http", "tcp", 80);
  }

  // Route handlers
  server.on("/", handleRoot);
  server.on("/toggle-logging", handleToggleLogging);
  server.on("/enable-logging", handleEnableLogging);
  server.on("/disable-logging", handleDisableLogging);
  server.onNotFound(handleNotFound);
  
  server.begin();
  Serial.println("🌐 Web server started on port 80");
}

// ============================================================================
// SENSOR READING
// ============================================================================

void readSensors() {
  // Read DHT sensor
  sensors_event_t event;
  
  dht.temperature().getEvent(&event);
  if (!isnan(event.temperature)) {
    currentSensors.temperature = event.temperature;
    currentSensors.dhtValid = true;
  } else {
    currentSensors.dhtValid = false;
  }

  dht.humidity().getEvent(&event);
  if (!isnan(event.relative_humidity)) {
    currentSensors.humidity = event.relative_humidity;
  }

  // Read MQ sensors
  currentSensors.airQuality = analogRead(MQ135_PIN);
  currentSensors.alcohol = analogRead(MQ3_PIN);
  currentSensors.smoke = analogRead(MQ2_PIN);

  // Update display values (for stable LCD display)
  displaySensors = currentSensors;

  // Serial output for debugging
  Serial.printf("🌡️  Temp: %.1f°C | 💧 Humidity: %.0f%% | 🌬️  Air: %d | 🍷 Alcohol: %d | 🚭 Smoke: %d\n",
    currentSensors.temperature, currentSensors.humidity, currentSensors.airQuality, 
    currentSensors.alcohol, currentSensors.smoke);
}

// ============================================================================
// DATA TRANSMISSION
// ============================================================================

void sendSensorData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected, skipping data send");
    return;
  }

  HTTPClient http;
  String serverPath = String(SUPABASE_URL) + String(SUPABASE_ENDPOINT);

  // Create JSON payload
  StaticJsonDocument<512> doc;
  doc["air_temperature"] = currentSensors.temperature;
  doc["air_humidity"] = currentSensors.humidity;
  doc["air_air_quality_mq135"] = currentSensors.airQuality;
  doc["air_alcohol_mq3"] = currentSensors.alcohol;
  doc["air_smoke_mq2"] = currentSensors.smoke;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // Send HTTP POST request
  http.begin(serverPath);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);

  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode > 0) {
    if (httpResponseCode == 200 || httpResponseCode == 201) {
      Serial.printf("✅ Data sent successfully (HTTP %d)\n", httpResponseCode);
    } else {
      Serial.printf("⚠️  Unexpected response (HTTP %d)\n", httpResponseCode);
    }
  } else {
    Serial.printf("❌ HTTP error: %s\n", http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}

// ============================================================================
// DASHBOARD STATUS CHECKING
// ============================================================================

void checkDashboardStatus() {
  if (WiFi.status() != WL_CONNECTED) {
    dashboardCollectionEnabled = false;
    return;
  }

  HTTPClient http;
  
  // Dashboard URLs to check (development first, then production)
  String dashboardURLs[] = {
    "http://192.168.1.156:8081/esp-connection-status.json",  // Development
    "http://192.168.1.156:8080/esp-connection-status.json",  // Alt development
    "https://lootoo.in/esp-connection-status.json",          // Production
    "http://localhost:8081/esp-connection-status.json"       // Local fallback
  };
  
  bool statusFound = false;
  
  for (int i = 0; i < 4 && !statusFound; i++) {
    Serial.printf("📡 Checking dashboard status: %s\n", dashboardURLs[i].c_str());
    
    http.begin(dashboardURLs[i]);
    http.setTimeout(5000);
    
    int httpResponseCode = http.GET();
    
    if (httpResponseCode == 200) {
      String payload = http.getString();
      Serial.printf("📥 Status payload: %s\n", payload.c_str());
      
      // Check for collection enabled/disabled
      if (payload.indexOf("\"data_collection_enabled\":true") != -1) {
        dashboardCollectionEnabled = true;
        statusFound = true;
        Serial.println("✅ Dashboard: DATA COLLECTION ENABLED");
      } else if (payload.indexOf("\"data_collection_enabled\":false") != -1) {
        dashboardCollectionEnabled = false;
        statusFound = true;
        Serial.println("🛑 Dashboard: DATA COLLECTION DISABLED");
      }
    } else {
      Serial.printf("❌ HTTP request failed: %d\n", httpResponseCode);
    }
    
    http.end();
  }
  
  if (!statusFound) {
    // Default to enabled if can't reach dashboard
    dashboardCollectionEnabled = true;
    Serial.println("⚠️  Dashboard unreachable, defaulting to ENABLED");
  }
}

// ============================================================================
// DISPLAY UPDATE
// ============================================================================

void updateDisplay() {
#ifdef USE_LCD
  // Cycle through different screens
  currentDisplayScreen = (currentDisplayScreen + 1) % 3;
  lcd.clear();

  switch (currentDisplayScreen) {
    case 0: // Temperature & Humidity
      lcd.setCursor(0, 0);
      if (displaySensors.dhtValid) {
        lcd.printf("Temp: %.1f°C", displaySensors.temperature);
      } else {
        lcd.print("Temp: Error");
      }
      
      lcd.setCursor(0, 1);
      if (!isnan(displaySensors.humidity)) {
        lcd.printf("Humidity: %.0f%%", displaySensors.humidity);
      } else {
        lcd.print("Humidity: Error");
      }
      break;

    case 1: // Air Quality
      lcd.setCursor(0, 0);
      lcd.print("Air Quality");
      lcd.setCursor(0, 1);
      lcd.printf("MQ135: %d", displaySensors.airQuality);
      if (displaySensors.airQuality < 3000) lcd.print(" GOOD");
      else if (displaySensors.airQuality < 3500) lcd.print(" MID");
      else lcd.print(" POOR");
      break;

    case 2: // Gas Sensors
      lcd.setCursor(0, 0);
      lcd.printf("Alc:%d Smoke:%d", displaySensors.alcohol, displaySensors.smoke);
      lcd.setCursor(0, 1);
      lcd.print((displaySensors.alcohol < 1200) ? "Alc:OK " : "Alc:HIGH ");
      lcd.print((displaySensors.smoke < 2200) ? "Smoke:OK" : "Smoke:HIGH");
      break;
  }
#endif
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    if (i < times - 1) delay(delayMs);
  }
}

// ============================================================================
// WEB SERVER HANDLERS
// ============================================================================

void handleRoot() {
  String html = R"(
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>🌱 Farm Insight Garden - Air Quality Node</title>
  <meta http-equiv="refresh" content="5">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 20px; }
    .container { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: auto; }
    h1 { color: #2c3e50; text-align: center; margin-bottom: 30px; }
    .sensor-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
    .sensor-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db; }
    .sensor-value { font-size: 1.5em; font-weight: bold; color: #2c3e50; }
    .sensor-label { color: #7f8c8d; font-size: 0.9em; margin-bottom: 5px; }
    .status { text-align: center; margin: 20px 0; padding: 15px; border-radius: 8px; }
    .status.active { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
    .status.inactive { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
    .good { color: #27ae60; }
    .warning { color: #f39c12; }
    .danger { color: #e74c3c; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🌱 Farm Insight Garden<br>Air Quality Monitoring Node</h1>
    
    <div class="status )" + String(isLoggingEnabled ? "active" : "inactive") + R"(">
      <strong>Logging Status:</strong> )" + String(isLoggingEnabled ? "🟢 ACTIVE" : "🔴 INACTIVE") + R"(
    </div>

    <div class="sensor-grid">
      <div class="sensor-card">
        <div class="sensor-label">🌡️ Air Temperature</div>
        <div class="sensor-value">)" + 
          (currentSensors.dhtValid ? String(currentSensors.temperature, 1) + "°C" : "Error") + R"(</div>
      </div>
      
      <div class="sensor-card">
        <div class="sensor-label">💧 Air Humidity</div>
        <div class="sensor-value">)" + 
          (!isnan(currentSensors.humidity) ? String(currentSensors.humidity, 0) + "%" : "Error") + R"(</div>
      </div>
      
      <div class="sensor-card">
        <div class="sensor-label">🌬️ Air Quality (MQ-135)</div>
        <div class="sensor-value )" + 
          String(currentSensors.airQuality < 3000 ? "good" : currentSensors.airQuality < 3500 ? "warning" : "danger") + R"(">
          )" + String(currentSensors.airQuality) + R"(
        </div>
      </div>
      
      <div class="sensor-card">
        <div class="sensor-label">🍷 Alcohol Level (MQ-3)</div>
        <div class="sensor-value )" + 
          String(currentSensors.alcohol < 1200 ? "good" : "danger") + R"(">
          )" + String(currentSensors.alcohol) + R"(
        </div>
      </div>
      
      <div class="sensor-card">
        <div class="sensor-label">🚭 Smoke Level (MQ-2)</div>
        <div class="sensor-value )" + 
          String(currentSensors.smoke < 2200 ? "good" : "danger") + R"(">
          )" + String(currentSensors.smoke) + R"(
        </div>
      </div>
    </div>
    
    <div style="text-align: center; margin-top: 30px; font-size: 0.9em; color: #7f8c8d;">
      <p>📡 Network: )" + WiFi.SSID() + R" | 📍 IP: )" + WiFi.localIP().toString() + R"(</p>
      <p>⚡ Uptime: )" + String(millis() / 1000) + R"( seconds</p>
    </div>
  </div>
</body>
</html>)";

  server.send(200, "text/html", html);
}

void handleToggleLogging() {
  isLoggingEnabled = !isLoggingEnabled;
  
#ifdef USE_LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Logging:");
  lcd.setCursor(0, 1);
  lcd.print(isLoggingEnabled ? "ON" : "OFF");
#endif

  Serial.printf("🔄 Logging %s\n", isLoggingEnabled ? "ENABLED" : "DISABLED");
  server.send(200, "text/plain", isLoggingEnabled ? "Logging Enabled" : "Logging Disabled");
}

void handleEnableLogging() {
  isLoggingEnabled = true;
  Serial.println("✅ Logging ENABLED via web request");
  server.send(200, "text/plain", "Logging Enabled");
}

void handleDisableLogging() {
  isLoggingEnabled = false;
  Serial.println("🛑 Logging DISABLED via web request");
  server.send(200, "text/plain", "Logging Disabled");
}

void handleNotFound() {
  server.send(404, "text/plain", "404: Page Not Found");
}
