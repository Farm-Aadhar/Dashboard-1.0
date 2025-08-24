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
// EMAIL CONFIGURATION (Using HTTP POST to email service)
// ============================================================================

// Using EmailJS or similar service to send emails
const char* EMAIL_SERVICE_URL = "https://api.emailjs.com/api/v1.0/email/send";
const char* EMAIL_SERVICE_ID = "service_farminsight";     // You'll set this up
const char* EMAIL_TEMPLATE_ID = "template_daily_data";   
const char* EMAIL_PUBLIC_KEY = "your_emailjs_public_key";
const char* RECIPIENT_EMAIL = "Aniketsadakale1014@gmail.com";

// ============================================================================
// DAILY FILE STORAGE CONFIGURATION
// ============================================================================

const char* DAILY_DATA_FILE = "/daily_sensor_data.json";
const char* SESSION_DATA_FILE = "/session_data.json";
const char* METADATA_FILE = "/file_metadata.json";
const long DATA_SAVE_INTERVAL = 300000;  // Save every 5 minutes (300,000 ms)
unsigned long lastDataSave = 0;
unsigned long lastMidnightCheck = 0;
const long MIDNIGHT_CHECK_INTERVAL = 60000;  // Check for midnight every minute
String currentDate = "";
bool emailSentOnStartup = false;
bool dailyReportSent = false;

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

// Daily file storage and email functions
void saveSensorDataToDaily();
void saveSensorDataToSession();
void sendDailyReport();
void sendLastSessionData();
void initializeDailyFile();
void initializeSessionFile();
String getCurrentDate();
String getCurrentTime();
String loadDailyFile();
String loadSessionFile();
void clearDailyFile();
void clearSessionFile();
void checkForMidnight();

// Web server handlers
void handleRoot();
void handleToggleLogging();
void handleEnableLogging();
void handleDisableLogging();
void handleNotFound();
void handleViewDailyData();    // View today's data
void handleDownloadDaily();    // Download daily file
void handleViewSessionData();  // View session data
void handleDownloadSession();  // Download session file
void handleSendDailyReport();  // Manual daily report
void handleSendSessionData();  // Manual session data email

// ============================================================================
// SETUP FUNCTION
// ============================================================================

void setup() {
  Serial.begin(115200);
  Serial.println("\n==================================================");
  Serial.println("🌱 Farm Insight Garden - Air Quality Node");
  Serial.println("Starting up...");
  Serial.println("==================================================");

  setupHardware();
  connectToWiFi();
  setupWebServer();
  
  // Initialize file systems
  initializeDailyFile();
  initializeSessionFile();
  
  // Send previous session data via email on startup
  Serial.println("📧 Sending last session data via email...");
  sendLastSessionData();

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

  // Check for midnight to send daily reports
  if (millis() - lastMidnightCheck >= MIDNIGHT_CHECK_INTERVAL) {
    checkForMidnight();
    lastMidnightCheck = millis();
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

  // Save data to both daily and session files every 5 minutes
  if (millis() - lastDataSave >= DATA_SAVE_INTERVAL) {
    if (isLoggingEnabled) {
      saveSensorDataToDaily();
      saveSensorDataToSession();
      lastDataSave = millis();
    }
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
  server.on("/daily-data", handleViewDailyData);        // View daily data
  server.on("/download-daily", handleDownloadDaily);    // Download daily file
  server.on("/session-data", handleViewSessionData);    // View session data
  server.on("/download-session", handleDownloadSession); // Download session file
  server.on("/send-daily-report", handleSendDailyReport); // Send daily report manually
  server.on("/send-session-data", handleSendSessionData); // Send session data manually
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
      <p>📡 Network: )" + WiFi.SSID() + R"( | 📍 IP: )" + WiFi.localIP().toString() + R"(</p>
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

// ============================================================================
// DAILY FILE STORAGE & EMAIL FUNCTIONS
// ============================================================================

String getCurrentDate() {
  // Simple date format: YYYY-MM-DD
  // Note: ESP32 doesn't have RTC, so this is based on uptime
  // In a real implementation, you'd sync with NTP server
  unsigned long days = millis() / (24 * 60 * 60 * 1000);
  return "2025-08-" + String(25 + days); // Starting from Aug 25, 2025
}

String getCurrentTime() {
  unsigned long totalSeconds = millis() / 1000;
  int hours = (totalSeconds / 3600) % 24;
  int minutes = (totalSeconds / 60) % 60;
  int seconds = totalSeconds % 60;
  
  char timeStr[9];
  sprintf(timeStr, "%02d:%02d:%02d", hours, minutes, seconds);
  return String(timeStr);
}

bool isMidnight() {
  // Check if it's approximately midnight (00:00:xx)
  unsigned long totalSeconds = millis() / 1000;
  int hours = (totalSeconds / 3600) % 24;
  int minutes = (totalSeconds / 60) % 60;
  return (hours == 0 && minutes == 0);
}

void checkForMidnight() {
  if (isMidnight() && !dailyReportSent) {
    Serial.println("🌙 Midnight detected! Sending daily report...");
    sendDailyReport();
    dailyReportSent = true;
    
    // Reset session data for new day
    clearSessionFile();
    initializeSessionFile();
  } else if (!isMidnight()) {
    // Reset flag when not midnight
    dailyReportSent = false;
  }
}

void initializeDailyFile() {
  Serial.println("📁 Initializing daily file system...");
  
  String today = getCurrentDate();
  
  // Check if we need to start a new daily file
  if (currentDate != today) {
    currentDate = today;
    
    // Create new daily file with header
    File file = SPIFFS.open(DAILY_DATA_FILE, "w");
    if (file) {
      StaticJsonDocument<1024> doc;
      doc["date"] = currentDate;
      doc["node_id"] = "air_node_01";
      doc["location"] = "Farm Insight Garden";
      doc["start_time"] = getCurrentTime();
      doc["readings"] = JsonArray();
      
      String jsonString;
      serializeJson(doc, jsonString);
      file.print(jsonString);
      file.close();
      
      Serial.printf("📝 Created new daily file for %s\n", currentDate.c_str());
    } else {
      Serial.println("❌ Failed to create daily file");
    }
  }
}

void initializeSessionFile() {
  Serial.println("📁 Initializing session file system...");
  
  // Check if session file exists, if not create it
  if (!SPIFFS.exists(SESSION_DATA_FILE)) {
    File file = SPIFFS.open(SESSION_DATA_FILE, "w");
    if (file) {
      StaticJsonDocument<1024> doc;
      doc["last_reset"] = getCurrentDate();
      doc["sessions"] = JsonArray();
      
      String jsonString;
      serializeJson(doc, jsonString);
      file.print(jsonString);
      file.close();
      
      Serial.println("📝 Created new session file");
    } else {
      Serial.println("❌ Failed to create session file");
    }
  }
  
  // Add new session entry
  File file = SPIFFS.open(SESSION_DATA_FILE, "r");
  if (file) {
    String fileContent = file.readString();
    file.close();
    
    DynamicJsonDocument doc(8192);
    DeserializationError error = deserializeJson(doc, fileContent);
    
    if (!error) {
      JsonObject newSession = doc["sessions"].createNestedObject();
      newSession["session_start"] = getCurrentTime();
      newSession["session_date"] = getCurrentDate();
      newSession["readings"] = JsonArray();
      
      // Write back to file
      file = SPIFFS.open(SESSION_DATA_FILE, "w");
      if (file) {
        String jsonString;
        serializeJson(doc, jsonString);
        file.print(jsonString);
        file.close();
        
        Serial.printf("📝 Started new session at %s\n", getCurrentTime().c_str());
      }
    }
  }
}

void saveSensorDataToDaily() {
  File file = SPIFFS.open(DAILY_DATA_FILE, "r");
  if (!file) {
    Serial.println("❌ Cannot open daily file for reading");
    return;
  }
  
  // Read existing data
  String fileContent = file.readString();
  file.close();
  
  DynamicJsonDocument doc(8192); // Larger buffer for daily data
  DeserializationError error = deserializeJson(doc, fileContent);
  
  if (error) {
    Serial.println("❌ Failed to parse daily file JSON");
    return;
  }
  
  // Add new reading
  JsonObject newReading = doc["readings"].createNestedObject();
  newReading["time"] = getCurrentTime();
  newReading["temp"] = currentSensors.temperature;
  newReading["humidity"] = currentSensors.humidity;
  newReading["airQuality"] = currentSensors.airQuality;
  newReading["alcohol"] = currentSensors.alcohol;
  newReading["smoke"] = currentSensors.smoke;
  newReading["uptime"] = millis() / 1000;
  
  // Update metadata
  doc["last_update"] = getCurrentTime();
  doc["total_readings"] = doc["readings"].size();
  
  // Write back to file
  file = SPIFFS.open(DAILY_DATA_FILE, "w");
  if (file) {
    String jsonString;
    serializeJson(doc, jsonString);
    file.print(jsonString);
    file.close();
    
    Serial.printf("💾 Saved reading #%d to daily file\n", (int)doc["total_readings"]);
  } else {
    Serial.println("❌ Failed to write to daily file");
  }
}

void saveSensorDataToSession() {
  File file = SPIFFS.open(SESSION_DATA_FILE, "r");
  if (!file) {
    Serial.println("❌ Cannot open session file for reading");
    return;
  }
  
  // Read existing data
  String fileContent = file.readString();
  file.close();
  
  DynamicJsonDocument doc(8192);
  DeserializationError error = deserializeJson(doc, fileContent);
  
  if (error) {
    Serial.println("❌ Failed to parse session file JSON");
    return;
  }
  
  // Get the last session (current session)
  JsonArray sessions = doc["sessions"];
  if (sessions.size() > 0) {
    JsonObject currentSession = sessions[sessions.size() - 1];
    JsonArray readings = currentSession["readings"];
    
    // Add new reading to current session
    JsonObject newReading = readings.createNestedObject();
    newReading["time"] = getCurrentTime();
    newReading["temp"] = currentSensors.temperature;
    newReading["humidity"] = currentSensors.humidity;
    newReading["airQuality"] = currentSensors.airQuality;
    newReading["alcohol"] = currentSensors.alcohol;
    newReading["smoke"] = currentSensors.smoke;
    newReading["uptime"] = millis() / 1000;
    
    // Update session metadata
    currentSession["last_update"] = getCurrentTime();
    currentSession["total_readings"] = readings.size();
    
    // Write back to file
    file = SPIFFS.open(SESSION_DATA_FILE, "w");
    if (file) {
      String jsonString;
      serializeJson(doc, jsonString);
      file.print(jsonString);
      file.close();
      
      Serial.printf("💾 Saved reading #%d to current session\n", (int)readings.size());
    } else {
      Serial.println("❌ Failed to write to session file");
    }
  }
}

void sendDailyReport() {
  // Check if daily file exists and has data
  File file = SPIFFS.open(DAILY_DATA_FILE, "r");
  if (!file) {
    Serial.println("📧 No daily file found for daily report");
    return;
  }
  
  String fileContent = file.readString();
  file.close();
  
  if (fileContent.length() < 100) {
    Serial.println("📧 Daily file too small, skipping daily report");
    return;
  }
  
  Serial.println("📧 Sending DAILY REPORT via email...");
  
  // Parse the data to get metadata
  DynamicJsonDocument doc(8192);
  DeserializationError error = deserializeJson(doc, fileContent);
  
  String emailSubject = "📊 DAILY REPORT - Farm Insight Garden";
  String emailBody = "Daily Report from your Farm Insight Garden Air Quality Node.\n\n";
  emailBody += "This is your automatic midnight daily report.\n\n";
  
  if (!error) {
    emailSubject += " (" + String(doc["date"].as<String>()) + ")";
    emailBody += "Date: " + String(doc["date"].as<String>()) + "\n";
    emailBody += "Node: " + String(doc["node_id"].as<String>()) + "\n";
    emailBody += "Total Readings: " + String(doc["total_readings"].as<int>()) + "\n";
    emailBody += "Report Time: " + getCurrentTime() + "\n\n";
    
    // Add summary statistics
    JsonArray readings = doc["readings"];
    if (readings.size() > 0) {
      float avgTemp = 0, avgHumidity = 0;
      int avgAirQuality = 0;
      
      for (JsonVariant reading : readings) {
        avgTemp += reading["temp"].as<float>();
        avgHumidity += reading["humidity"].as<float>();
        avgAirQuality += reading["airQuality"].as<int>();
      }
      
      int count = readings.size();
      avgTemp /= count;
      avgHumidity /= count;
      avgAirQuality /= count;
      
      emailBody += "📈 DAILY SUMMARY:\n";
      emailBody += "Average Temperature: " + String(avgTemp, 1) + "°C\n";
      emailBody += "Average Humidity: " + String(avgHumidity, 0) + "%\n";
      emailBody += "Average Air Quality: " + String(avgAirQuality) + "\n\n";
    }
  }
  
  emailBody += "Complete daily data is attached as JSON.\n\n";
  emailBody += "Best regards,\nFarm Insight Garden System";
  
  // Send via HTTP POST to email service
  HTTPClient http;
  http.begin("https://api.emailjs.com/api/v1.0/email/send");
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<2048> emailDoc;
  emailDoc["service_id"] = "service_farminsight";
  emailDoc["template_id"] = "template_daily_report";
  emailDoc["user_id"] = "your_emailjs_public_key";
  
  JsonObject templateParams = emailDoc.createNestedObject("template_params");
  templateParams["to_email"] = RECIPIENT_EMAIL;
  templateParams["subject"] = emailSubject;
  templateParams["message"] = emailBody;
  templateParams["json_data"] = fileContent;
  templateParams["report_type"] = "DAILY_REPORT";
  
  String emailPayload;
  serializeJson(emailDoc, emailPayload);
  
  int httpResponseCode = http.POST(emailPayload);
  
  if (httpResponseCode == 200) {
    Serial.println("✅ Daily report sent successfully!");
  } else {
    Serial.printf("❌ Daily report failed with code: %d\n", httpResponseCode);
  }
  
  http.end();
}

void sendLastSessionData() {
  // Check if session file exists and has data
  File file = SPIFFS.open(SESSION_DATA_FILE, "r");
  if (!file) {
    Serial.println("📧 No session file found for last session data");
    return;
  }
  
  String fileContent = file.readString();
  file.close();
  
  if (fileContent.length() < 100) {
    Serial.println("📧 Session file too small, skipping last session email");
    return;
  }
  
  Serial.println("📧 Sending LAST SESSION DATA via email...");
  
  // Parse the data to get metadata
  DynamicJsonDocument doc(8192);
  DeserializationError error = deserializeJson(doc, fileContent);
  
  String emailSubject = "🔄 LAST SESSION DATA - Farm Insight Garden";
  String emailBody = "Last Session Data from your Farm Insight Garden Air Quality Node.\n\n";
  emailBody += "This email contains all data collected since last midnight.\n\n";
  
  if (!error) {
    JsonArray sessions = doc["sessions"];
    emailSubject += " (Since " + String(doc["last_reset"].as<String>()) + ")";
    emailBody += "Data Since: " + String(doc["last_reset"].as<String>()) + " 00:00\n";
    emailBody += "Total Sessions: " + String(sessions.size()) + "\n";
    emailBody += "ESP Startup Time: " + getCurrentTime() + "\n\n";
    
    // Add session summary
    int totalReadings = 0;
    emailBody += "📋 SESSION SUMMARY:\n";
    
    for (int i = 0; i < sessions.size(); i++) {
      JsonObject session = sessions[i];
      JsonArray readings = session["readings"];
      totalReadings += readings.size();
      
      emailBody += "Session " + String(i + 1) + ": " + 
                   String(session["session_start"].as<String>()) + " - " +
                   String(session["last_update"].as<String>()) + 
                   " (" + String(readings.size()) + " readings)\n";
    }
    
    emailBody += "\nTotal Readings: " + String(totalReadings) + "\n\n";
  }
  
  emailBody += "Complete session data is attached as JSON.\n\n";
  emailBody += "Best regards,\nFarm Insight Garden System";
  
  // Send via HTTP POST to email service
  HTTPClient http;
  http.begin("https://api.emailjs.com/api/v1.0/email/send");
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<2048> emailDoc;
  emailDoc["service_id"] = "service_farminsight";
  emailDoc["template_id"] = "template_session_data";
  emailDoc["user_id"] = "your_emailjs_public_key";
  
  JsonObject templateParams = emailDoc.createNestedObject("template_params");
  templateParams["to_email"] = RECIPIENT_EMAIL;
  templateParams["subject"] = emailSubject;
  templateParams["message"] = emailBody;
  templateParams["json_data"] = fileContent;
  templateParams["report_type"] = "SESSION_DATA";
  
  String emailPayload;
  serializeJson(emailDoc, emailPayload);
  
  int httpResponseCode = http.POST(emailPayload);
  
  if (httpResponseCode == 200) {
    Serial.println("✅ Last session data sent successfully!");
    
    // Clear session data after successful email (keep only current session)
    clearSessionFile();
    initializeSessionFile();
  } else {
    Serial.printf("❌ Session data email failed with code: %d\n", httpResponseCode);
  }
  
  http.end();
}

String loadDailyFile() {
  File file = SPIFFS.open(DAILY_DATA_FILE, "r");
  if (!file) {
    return "{}";
  }
  
  String content = file.readString();
  file.close();
  return content;
}

String loadSessionFile() {
  File file = SPIFFS.open(SESSION_DATA_FILE, "r");
  if (!file) {
    return "{}";
  }
  
  String content = file.readString();
  file.close();
  return content;
}

void clearDailyFile() {
  if (SPIFFS.remove(DAILY_DATA_FILE)) {
    Serial.println("🗑️  Daily file cleared");
  } else {
    Serial.println("❌ Failed to clear daily file");
  }
}

void clearSessionFile() {
  if (SPIFFS.remove(SESSION_DATA_FILE)) {
    Serial.println("🗑️  Session file cleared");
  } else {
    Serial.println("❌ Failed to clear session file");
  }
}

// ============================================================================
// NEW WEB HANDLERS FOR DAILY AND SESSION DATA
// ============================================================================

void handleViewDailyData() {
  String jsonData = loadDailyFile();
  
  String html = R"(
<!DOCTYPE html>
<html>
<head>
  <title>📊 Daily Sensor Data</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { background: white; padding: 20px; border-radius: 10px; max-width: 800px; margin: auto; }
    pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
    .btn { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px; }
    .btn.daily { background: #28a745; }
    .btn.session { background: #17a2b8; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Daily Sensor Data</h1>
    <p><strong>Current Date:</strong> )" + getCurrentDate() + R"(</p>
    <p><strong>Current Time:</strong> )" + getCurrentTime() + R"(</p>
    
    <div>
      <a href="/download-daily" class="btn daily">📥 Download Daily JSON</a>
      <a href="/send-daily-report" class="btn daily">📧 Send Daily Report</a>
      <a href="/session-data" class="btn session">🔄 View Session Data</a>
      <a href="/" class="btn">🏠 Home</a>
    </div>
    
    <h3>📋 Daily JSON Data:</h3>
    <pre>)" + jsonData + R"(</pre>
  </div>
</body>
</html>)";

  server.send(200, "text/html", html);
}

void handleViewSessionData() {
  String jsonData = loadSessionFile();
  
  String html = R"(
<!DOCTYPE html>
<html>
<head>
  <title>🔄 Session Data</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { background: white; padding: 20px; border-radius: 10px; max-width: 800px; margin: auto; }
    pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
    .btn { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px; }
    .btn.daily { background: #28a745; }
    .btn.session { background: #17a2b8; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔄 Session Data (Since Last Midnight)</h1>
    <p><strong>Current Date:</strong> )" + getCurrentDate() + R"(</p>
    <p><strong>Current Time:</strong> )" + getCurrentTime() + R"(</p>
    
    <div>
      <a href="/download-session" class="btn session">📥 Download Session JSON</a>
      <a href="/send-session-data" class="btn session">📧 Send Session Data</a>
      <a href="/daily-data" class="btn daily">📊 View Daily Data</a>
      <a href="/" class="btn">🏠 Home</a>
    </div>
    
    <h3>📋 Session JSON Data:</h3>
    <pre>)" + jsonData + R"(</pre>
  </div>
</body>
</html>)";

  server.send(200, "text/html", html);
}

void handleDownloadDaily() {
  String jsonData = loadDailyFile();
  String filename = "daily_sensor_data_" + getCurrentDate() + ".json";
  
  server.sendHeader("Content-Disposition", "attachment; filename=" + filename);
  server.send(200, "application/json", jsonData);
}

void handleDownloadSession() {
  String jsonData = loadSessionFile();
  String filename = "session_data_" + getCurrentDate() + ".json";
  
  server.sendHeader("Content-Disposition", "attachment; filename=" + filename);
  server.send(200, "application/json", jsonData);
}

void handleSendDailyReport() {
  sendDailyReport();
  
  String html = R"(
<!DOCTYPE html>
<html>
<head>
  <title>📊 Daily Report Sent</title>
  <meta http-equiv="refresh" content="3;url=/daily-data">
</head>
<body>
  <h1>� Daily Report Sent!</h1>
  <p>Daily report has been sent to Aniketsadakale1014@gmail.com</p>
  <p>Redirecting to daily data in 3 seconds...</p>
</body>
</html>)";

  server.send(200, "text/html", html);
}

void handleSendSessionData() {
  sendLastSessionData();
  
  String html = R"(
<!DOCTYPE html>
<html>
<head>
  <title>🔄 Session Data Sent</title>
  <meta http-equiv="refresh" content="3;url=/session-data">
</head>
<body>
  <h1>🔄 Session Data Sent!</h1>
  <p>Last session data has been sent to Aniketsadakale1014@gmail.com</p>
  <p>Redirecting to session data in 3 seconds...</p>
</body>
</html>)";

  server.send(200, "text/html", html);
}
