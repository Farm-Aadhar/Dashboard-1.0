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
#include <esp_system.h>  // For reset reason debugging

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
const long DATA_SAVE_INTERVAL = 600000;  // Save every 10 minutes (600,000 ms) - reduced frequency
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

const char* SUPABASE_URL = "https://dlmqiqhwnxbffawfblrz.supabase.co";
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
const long SENSOR_READ_INTERVAL = 500;    // Read sensors every 0.5 seconds (reduced frequency)
const long DATA_SEND_INTERVAL = 500;      // Send data every 0.5 seconds (reduced frequency)
const long DISPLAY_CYCLE_INTERVAL = 5000; // Switch display every 5 seconds
const long STATUS_CHECK_INTERVAL = 300000;  // Check dashboard status every 5 minutes (reduced frequency)

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
bool sendSimpleEmail(String subject, String body);  // New simple email function
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
void handleSendCurrentData();      // New manual email trigger
void handleTestEmail();            // Test email function  
void handleRestartESP();           // Manual restart button
void handleViewDailyData();        // View today's data
void handleDownloadDaily();        // Download daily file
void handleViewSessionData();      // View session data
void handleDownloadSession();      // Download session file
void handleSendDailyReport();      // Manual daily report
void handleSendSessionData();      // Manual session data email

// ============================================================================
// SETUP FUNCTION
// ============================================================================

void setup() {
  Serial.begin(115200);
  Serial.println("\n==================================================");
  Serial.println("Farm Insight Garden - Air Quality Node");
  Serial.println("Starting up...");
  
  // Print restart reason for debugging
  esp_reset_reason_t resetReason = esp_reset_reason();
  Serial.print("🔍 Last restart reason: ");
  switch(resetReason) {
    case ESP_RST_POWERON: Serial.println("Power-on reset"); break;
    case ESP_RST_EXT: Serial.println("External reset"); break;
    case ESP_RST_SW: Serial.println("Software reset"); break;
    case ESP_RST_PANIC: Serial.println("Panic/Exception reset"); break;
    case ESP_RST_INT_WDT: Serial.println("Internal watchdog reset"); break;
    case ESP_RST_TASK_WDT: Serial.println("Task watchdog reset"); break;
    case ESP_RST_WDT: Serial.println("Other watchdog reset"); break;
    case ESP_RST_DEEPSLEEP: Serial.println("Deep sleep reset"); break;
    case ESP_RST_BROWNOUT: Serial.println("Brownout reset"); break;
    case ESP_RST_SDIO: Serial.println("SDIO reset"); break;
    default: Serial.println("Unknown reset reason"); break;
  }
  Serial.println("==================================================");

  setupHardware();
  connectToWiFi();
  setupWebServer();
  
  // Initialize file systems
  initializeDailyFile();
  initializeSessionFile();
  
  // Skip automatic session data sending to prevent memory issues on startup
  // Can be triggered manually via web interface
  Serial.println("📧 Session data can be sent manually via web interface");

  Serial.println("✅ Setup completed successfully!");
  Serial.println("📡 Web interface: http://air-node.local");
  Serial.printf("💾 Free heap: %d bytes\n", ESP.getFreeHeap());
  Serial.println("🔄 Starting main loop...\n");
}

// ============================================================================
// MAIN LOOP
// ============================================================================

void loop() {
  // Memory monitoring to prevent crashes
  static unsigned long lastMemoryCheck = 0;
  if (millis() - lastMemoryCheck >= 10000) { // Check every 10 seconds
    uint32_t freeHeap = ESP.getFreeHeap();
    if (freeHeap < 5000) { // Critical memory level
      Serial.printf("❌ CRITICAL MEMORY: %d bytes free - RESTARTING\n", freeHeap);
      delay(1000);
      ESP.restart();
    } else if (freeHeap < 10000) { // Low memory warning
      Serial.printf("⚠️ LOW MEMORY WARNING: %d bytes free\n", freeHeap);
      // Disable non-essential features temporarily
      dashboardCollectionEnabled = false;
    }
    lastMemoryCheck = millis();
  }

  // Handle web server requests
  server.handleClient();

  // Check WiFi connection and reconnect if needed
  static unsigned long lastWiFiCheck = 0;
  if (millis() - lastWiFiCheck >= 60000) { // Check every 60 seconds (reduced frequency)
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("⚠️  WiFi disconnected, attempting reconnection...");
      WiFi.reconnect();
      delay(3000); // Reduced delay
      if (WiFi.status() == WL_CONNECTED) {
        Serial.println("✅ WiFi reconnected successfully!");
      } else {
        Serial.println("❌ WiFi reconnection failed, continuing offline");
        dashboardCollectionEnabled = false;
      }
    }
    lastWiFiCheck = millis();
  }

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

  // Check dashboard collection status periodically (only if WiFi connected)
  if (millis() - lastStatusCheck >= STATUS_CHECK_INTERVAL) {
    if (WiFi.status() == WL_CONNECTED && ESP.getFreeHeap() > 15000) {
      checkDashboardStatus();
    } else {
      dashboardCollectionEnabled = false;
      if (ESP.getFreeHeap() <= 15000) {
        Serial.println("⚠️ Skipping dashboard check - low memory");
      }
    }
    lastStatusCheck = millis();
  }

  // Check for midnight to send daily reports (only if enough memory)
  if (millis() - lastMidnightCheck >= MIDNIGHT_CHECK_INTERVAL) {
    if (ESP.getFreeHeap() > 20000) {
      checkForMidnight();
    }
    lastMidnightCheck = millis();
  }

  // Send data if both local logging and dashboard collection are enabled
  if (millis() - lastDataSend >= DATA_SEND_INTERVAL) {
    if (isLoggingEnabled && dashboardCollectionEnabled && WiFi.status() == WL_CONNECTED) {
      sendSensorData();
      blinkLED(1, 50); // Quick blink on data send
    } else if (isLoggingEnabled && !dashboardCollectionEnabled) {
      // Cache data locally when dashboard collection is disabled
      // Serial.println("📦 Caching data locally (dashboard collection disabled)");
    }
    lastDataSend = millis();
  }

  // Save data to both daily and session files every 10 minutes (only if enough memory)
  if (millis() - lastDataSave >= DATA_SAVE_INTERVAL) {
    if (isLoggingEnabled && ESP.getFreeHeap() > 20000) {
      saveSensorDataToDaily();
      delay(100); // Small delay between file operations
      saveSensorDataToSession();
      lastDataSave = millis();
    } else if (ESP.getFreeHeap() <= 20000) {
      Serial.println("⚠️ Skipping file save - low memory");
      lastDataSave = millis(); // Reset timer to prevent continuous checking
    }
  }

  // Alive indicator - slow blink when not sending data
  if (!isLoggingEnabled || !dashboardCollectionEnabled) {
    if (millis() - lastLEDBlink >= 3000) {
      blinkLED(1, 100);
      lastLEDBlink = millis();
    }
  }

  // Feed the watchdog to prevent automatic restart
  yield();
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
    Serial.println("⚠️  Continuing in offline mode (no auto-restart)");
    Serial.println("💡 You can:");
    Serial.println("   - Check WiFi credentials in code");
    Serial.println("   - Use ESP32 Access Point mode");
    Serial.println("   - Manually restart when WiFi is available");
    
#ifdef USE_LCD
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Failed!");
    lcd.setCursor(0, 1);
    lcd.print("Offline Mode");
#endif
    
    // Don't restart automatically - continue in offline mode
    // User can manually restart or fix WiFi issue
    // ESP.restart(); // DISABLED - no more auto-restart!
    
    // Set flag to indicate offline mode
    dashboardCollectionEnabled = false;
    
    Serial.println("🔄 Continuing setup in offline mode...");
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
  server.on("/send-current-data", handleSendCurrentData);   // New manual email trigger
  server.on("/test-email", handleTestEmail);               // Test email function
  server.on("/restart-esp", handleRestartESP);             // Manual restart button
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

  // Serial output for debugging (only if enough memory)
  if (ESP.getFreeHeap() > 15000) {
    Serial.printf("Temp: %.1f°C | Humidity: %.0f%% | Air: %d | Alcohol: %d | Smoke: %d\n",
      currentSensors.temperature, currentSensors.humidity, currentSensors.airQuality, 
      currentSensors.alcohol, currentSensors.smoke);
  }
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
    
    HTTPClient http;  // Create new HTTPClient for each request
    http.begin(dashboardURLs[i]);
    http.setTimeout(3000);  // Reduced timeout to prevent hanging
    
    int httpResponseCode = http.GET();
    
    if (httpResponseCode == 200) {
      String payload = http.getString();
      Serial.printf("📥 Status payload (length: %d): %s\n", payload.length(), payload.c_str());
      
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
    
    http.end();  // Properly clean up HTTPClient
    
    // Add small delay between requests to prevent overwhelming the system
    if (!statusFound && i < 3) {
      delay(500);
    }
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
  String html = "<!DOCTYPE html>\n"
    "<html>\n"
    "<head>\n"
    "  <meta charset=\"UTF-8\">\n"
    "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
    "  <title>Farm Insight Garden - Air Quality Node</title>\n"
    "  <meta http-equiv=\"refresh\" content=\"5\">\n"
    "  <style>\n"
    "    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 20px; }\n"
    "    .container { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: auto; }\n"
    "    h1 { color: #2c3e50; text-align: center; margin-bottom: 30px; }\n"
    "    .sensor-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }\n"
    "    .sensor-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db; }\n"
    "    .sensor-value { font-size: 1.5em; font-weight: bold; color: #2c3e50; }\n"
    "    .sensor-label { color: #7f8c8d; font-size: 0.9em; margin-bottom: 5px; }\n"
    "    .status { text-align: center; margin: 20px 0; padding: 15px; border-radius: 8px; }\n"
    "    .status.active { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }\n"
    "    .status.inactive { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }\n"
    "    .good { color: #27ae60; }\n"
    "    .warning { color: #f39c12; }\n"
    "    .danger { color: #e74c3c; }\n"
    "    .btn { background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 5px; display: inline-block; }\n"
    "    .btn.green { background: #28a745; }\n"
    "    .btn.blue { background: #17a2b8; }\n"
    "    .btn.red { background: #dc3545; }\n"
    "  </style>\n"
    "</head>\n"
    "<body>\n"
    "  <div class=\"container\">\n"
    "    <h1>Farm Insight Garden<br>Air Quality Monitoring Node</h1>\n"
    "    \n"
    "    <div class=\"status " + String(isLoggingEnabled ? "active" : "inactive") + "\">\n"
    "      <strong>Logging Status:</strong> " + String(isLoggingEnabled ? "ACTIVE" : "INACTIVE") + "\n"
    "    </div>\n"
    "    \n"
    "    <div class=\"status " + String(WiFi.status() == WL_CONNECTED ? "active" : "inactive") + "\">\n"
    "      <strong>WiFi Status:</strong> " + String(WiFi.status() == WL_CONNECTED ? "CONNECTED" : "DISCONNECTED") + "\n"
    "    </div>\n\n"
    "    <div class=\"sensor-grid\">\n"
    "      <div class=\"sensor-card\">\n"
    "        <div class=\"sensor-label\">Air Temperature</div>\n"
    "        <div class=\"sensor-value\">" + 
          (currentSensors.dhtValid ? String(currentSensors.temperature, 1) + "°C" : "Error") + "</div>\n"
    "      </div>\n"
    "      \n"
    "      <div class=\"sensor-card\">\n"
    "        <div class=\"sensor-label\">Air Humidity</div>\n"
    "        <div class=\"sensor-value\">" + 
          (!isnan(currentSensors.humidity) ? String(currentSensors.humidity, 0) + "%" : "Error") + "</div>\n"
    "      </div>\n"
    "      \n"
    "      <div class=\"sensor-card\">\n"
    "        <div class=\"sensor-label\">Air Quality (MQ-135)</div>\n"
    "        <div class=\"sensor-value " + 
          String(currentSensors.airQuality < 3000 ? "good" : currentSensors.airQuality < 3500 ? "warning" : "danger") + "\">\n"
    "          " + String(currentSensors.airQuality) + "\n"
    "        </div>\n"
    "      </div>\n"
    "      \n"
    "      <div class=\"sensor-card\">\n"
    "        <div class=\"sensor-label\">Alcohol Level (MQ-3)</div>\n"
    "        <div class=\"sensor-value " + 
          String(currentSensors.alcohol < 1200 ? "good" : "danger") + "\">\n"
    "          " + String(currentSensors.alcohol) + "\n"
    "        </div>\n"
    "      </div>\n"
    "      \n"
    "      <div class=\"sensor-card\">\n"
    "        <div class=\"sensor-label\">Smoke Level (MQ-2)</div>\n"
    "        <div class=\"sensor-value " + 
          String(currentSensors.smoke < 2200 ? "good" : "danger") + "\">\n"
    "          " + String(currentSensors.smoke) + "\n"
    "        </div>\n"
    "      </div>\n"
    "    </div>\n"
    "    \n"
    "    <div style=\"text-align: center; margin-top: 30px;\">\n"
    "      <div style=\"margin-bottom: 20px;\">\n"
    "        <a href=\"/send-current-data\" class=\"btn green\">\n"
    "          Send Current Data via Email\n"
    "        </a>\n"
    "        <a href=\"/daily-data\" class=\"btn blue\">\n"
    "          View Data Files\n"
    "        </a>\n"
    "      </div>\n"
    "      \n"
    "      <div style=\"margin-bottom: 20px;\">\n"
    "        <a href=\"/restart-esp\" class=\"btn red\" onclick=\"return confirm('Are you sure you want to restart the ESP32?')\">\n"
    "          Manual Restart ESP32\n"
    "        </a>\n"
    "        <a href=\"/test-email\" class=\"btn\" style=\"background: #6f42c1;\">\n"
    "          Test Email (Debug)\n"
    "        </a>\n"
    "      </div>\n"
    "      \n"
    "      <div style=\"font-size: 0.9em; color: #7f8c8d;\">\n"
    "        <p>Network: " + WiFi.SSID() + " | IP: " + WiFi.localIP().toString() + "</p>\n"
    "        <p>Uptime: " + String(millis() / 1000) + " seconds</p>\n"
    "      </div>\n"
    "    </div>\n"
    "  </div>\n"
    "</body>\n"
    "</html>";

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

void handleSendCurrentData() {
  Serial.println("📧 Manual email trigger - sending current sensor data...");
  
  // Create email content with current sensor readings
  String emailSubject = "🌱 CURRENT SENSOR DATA - Farm Insight Garden";
  String emailBody = "Current Sensor Readings from your Farm Insight Garden Air Quality Node.\n\n";
  emailBody += "📅 Date: " + getCurrentDate() + "\n";
  emailBody += "🕐 Time: " + getCurrentTime() + "\n";
  emailBody += "📍 Location: Farm Insight Garden\n";
  emailBody += "🔌 Node ID: air_node_01\n\n";
  
  emailBody += "🌡️ CURRENT READINGS:\n";
  emailBody += "Temperature: " + String(currentSensors.temperature, 1) + "°C\n";
  emailBody += "Humidity: " + String(currentSensors.humidity, 0) + "%\n";
  emailBody += "Air Quality (MQ-135): " + String(currentSensors.airQuality) + " ppm\n";
  emailBody += "Alcohol Level (MQ-3): " + String(currentSensors.alcohol) + " ppm\n";
  emailBody += "Smoke Level (MQ-2): " + String(currentSensors.smoke) + " ppm\n\n";
  
  // Add status assessment
  emailBody += "📊 STATUS ASSESSMENT:\n";
  emailBody += "Air Quality: " + String(currentSensors.airQuality < 2000 ? "GOOD" : currentSensors.airQuality < 2500 ? "MODERATE" : "POOR") + "\n";
  emailBody += "Alcohol Detection: " + String(currentSensors.alcohol < 1200 ? "NORMAL" : "ELEVATED") + "\n";
  emailBody += "Smoke Detection: " + String(currentSensors.smoke < 1300 ? "NORMAL" : "ALERT") + "\n\n";
  
  emailBody += "📡 Network: " + WiFi.SSID() + "\n";
  emailBody += "📍 IP Address: " + WiFi.localIP().toString() + "\n";
  emailBody += "⚡ Uptime: " + String(millis() / 1000) + " seconds\n\n";
  emailBody += "This reading was manually requested from the web dashboard.\n\n";
  emailBody += "Best regards,\nFarm Insight Garden System";
  
  // Try to send via simple HTTP POST (you can replace this with your preferred email service)
  bool emailSent = sendSimpleEmail(emailSubject, emailBody);
  
  // Create response HTML
  String html = "<!DOCTYPE html>\n"
    "<html>\n"
    "<head>\n"
    "  <title>📧 Email Status</title>\n"
    "  <meta http-equiv=\"refresh\" content=\"5;url=/\">\n"
    "  <style>\n"
    "    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 20px; text-align: center; }\n"
    "    .container { background: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: auto; }\n"
    "    .success { color: #28a745; font-size: 1.2em; }\n"
    "    .error { color: #dc3545; font-size: 1.2em; }\n"
    "    .data { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: left; }\n"
    "  </style>\n"
    "</head>\n"
    "<body>\n"
    "  <div class=\"container\">\n"
    "    <h1>Email Notification</h1>" + 
    String(emailSent ? 
      "<div class=\"success\">Email sent successfully!</div>" :
      "<div class=\"error\">Email failed to send. Check serial monitor for details.</div>") + 
    "    <div class=\"data\">\n"
    "      <h3>Data Sent:</h3>\n"
    "      <pre>" + emailBody + "</pre>\n"
    "    </div>\n"
    "    \n"
    "    <p>Redirecting to main dashboard in 5 seconds...</p>\n"
    "    <a href=\"/\" style=\"background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;\">Back to Dashboard</a>\n"
    "  </div>\n"
    "</body>\n"
    "</html>";

  server.send(200, "text/html", html);
}

void handleRestartESP() {
  Serial.println("🔄 Manual restart requested via web interface");
  
  String html = "<!DOCTYPE html>\n"
    "<html>\n"
    "<head>\n"
    "  <title>🔄 ESP32 Restart</title>\n"
    "  <style>\n"
    "    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 20px; text-align: center; }\n"
    "    .container { background: white; padding: 30px; border-radius: 10px; max-width: 500px; margin: auto; }\n"
    "    .warning { color: #dc3545; font-size: 1.2em; margin: 20px 0; }\n"
    "  </style>\n"
    "</head>\n"
    "<body>\n"
    "  <div class=\"container\">\n"
    "    <h1>🔄 ESP32 Restart</h1>\n"
    "    <div class=\"warning\">⚠️ ESP32 is restarting...</div>\n"
    "    <p>The device will restart in 3 seconds.</p>\n"
    "    <p>Please wait and refresh the page after 10 seconds.</p>\n"
    "    <p>Dashboard will be available at: <br><strong>http://air-node.local</strong></p>\n"
    "  </div>\n"
    "</body>\n"
    "</html>";

  server.send(200, "text/html", html);
  delay(1000);
  
  Serial.println("🔄 Restarting ESP32 in 3 seconds...");
  delay(3000);
  ESP.restart();
}

void handleTestEmail() {
  Serial.println("Testing email functionality...");
  
  String testSubject = "TEST EMAIL - Farm Insight Garden";
  String testBody = "This is a test email from your ESP32 Air Quality Node.\n\n";
  testBody += "If you receive this email, the email system is working correctly.\n\n";
  testBody += "Current sensor readings:\n";
  testBody += "Temperature: " + String(currentSensors.temperature, 1) + "°C\n";
  testBody += "Humidity: " + String(currentSensors.humidity, 0) + "%\n";
  testBody += "Air Quality: " + String(currentSensors.airQuality) + "\n\n";
  testBody += "Test completed successfully!";
  
  // Try the simple email function
  bool emailResult = sendSimpleEmail(testSubject, testBody);
  
  String html = "<!DOCTYPE html>\n"
    "<html>\n"
    "<head>\n"
    "  <meta charset=\"UTF-8\">\n"
    "  <title>Email Test Results</title>\n"
    "  <meta http-equiv=\"refresh\" content=\"10;url=/\">\n"
    "  <style>\n"
    "    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 20px; text-align: center; }\n"
    "    .container { background: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: auto; }\n"
    "    .success { color: #28a745; font-size: 1.2em; }\n"
    "    .error { color: #dc3545; font-size: 1.2em; }\n"
    "    .info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: left; }\n"
    "  </style>\n"
    "</head>\n"
    "<body>\n"
    "  <div class=\"container\">\n"
    "    <h1>Email Test Results</h1>" + 
    String(emailResult ? 
      "<div class=\"success\">✅ Email test completed!</div>" :
      "<div class=\"error\">❌ Email services failed, but check Serial Monitor for email content.</div>") + 
    "    <div class=\"info\">\n"
    "      <h3>What to check:</h3>\n"
    "      <ul style=\"text-align: left;\">\n"
    "        <li><strong>Serial Monitor:</strong> Check Arduino IDE Serial Monitor (115200 baud) for email content</li>\n"
    "        <li><strong>Email Inbox:</strong> Check your email: Aniketsadakale1014@gmail.com</li>\n"
    "        <li><strong>Spam Folder:</strong> Check spam/junk folder if not in inbox</li>\n"
    "        <li><strong>Email Setup:</strong> Email services need proper configuration (see setup guide)</li>\n"
    "      </ul>\n"
    "      \n"
    "      <h3>Alternative Email Methods:</h3>\n"
    "      <p><strong>IFTTT Webhook:</strong> Set up IFTTT webhook for reliable email delivery</p>\n"
    "      <p><strong>Telegram Bot:</strong> Consider using Telegram bot for instant notifications</p>\n"
    "      <p><strong>SMS Gateway:</strong> Use SMS gateway for critical alerts</p>\n"
    "    </div>\n"
    "    \n"
    "    <p>Redirecting to main dashboard in 10 seconds...</p>\n"
    "    <a href=\"/\" style=\"background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;\">Back to Dashboard</a>\n"
    "  </div>\n"
    "</body>\n"
    "</html>";

  server.send(200, "text/html", html);
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
  // Check available memory before proceeding
  if (ESP.getFreeHeap() < 15000) {
    Serial.println("⚠️ Skipping daily save - low memory");
    return;
  }

  File file = SPIFFS.open(DAILY_DATA_FILE, "r");
  if (!file) {
    Serial.println("❌ Cannot open daily file for reading");
    return;
  }
  
  // Read existing data
  String fileContent = file.readString();
  file.close();
  
  DynamicJsonDocument doc(4096); // Reduced buffer size
  DeserializationError error = deserializeJson(doc, fileContent);
  
  if (error) {
    Serial.printf("❌ Failed to parse daily file JSON: %s\n", error.c_str());
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
  // Check available memory before proceeding
  if (ESP.getFreeHeap() < 15000) {
    Serial.println("⚠️ Skipping session save - low memory");
    return;
  }

  File file = SPIFFS.open(SESSION_DATA_FILE, "r");
  if (!file) {
    Serial.println("❌ Cannot open session file for reading");
    return;
  }
  
  // Read existing data
  String fileContent = file.readString();
  file.close();
  
  DynamicJsonDocument doc(4096); // Reduced buffer size
  DeserializationError error = deserializeJson(doc, fileContent);
  
  if (error) {
    Serial.printf("❌ Failed to parse session file JSON: %s\n", error.c_str());
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
  // Check available memory before proceeding
  if (ESP.getFreeHeap() < 20000) {
    Serial.println("⚠️ Skipping daily report - low memory");
    return;
  }

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

// Simple email function using a basic email service
bool sendSimpleEmail(String subject, String body) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, cannot send email");
    return false;
  }
  
  Serial.println("Attempting to send email...");
  Serial.println("Subject: " + subject);
  Serial.println("Body preview: " + body.substring(0, 100) + "...");
  
  // Method 1: Try using HTTPBin for testing (this will show up in their logs)
  Serial.println("Trying HTTPBin test method...");
  
  HTTPClient http;
  http.begin("https://httpbin.org/post");
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<1024> testDoc;
  testDoc["email_test"] = true;
  testDoc["to"] = RECIPIENT_EMAIL;
  testDoc["subject"] = subject;
  testDoc["body"] = body.substring(0, 300); // Truncate for test
  testDoc["from"] = "ESP32 Farm Insight Garden";
  testDoc["timestamp"] = getCurrentTime();
  
  String testPayload;
  serializeJson(testDoc, testPayload);
  
  int httpResponseCode = http.POST(testPayload);
  
  if (httpResponseCode == 200) {
    Serial.println("HTTPBin test successful!");
    Serial.println("Email data posted to test service");
  } else {
    Serial.printf("HTTPBin test failed with code: %d\n", httpResponseCode);
  }
  
  http.end();
  
  // Method 2: Try a free email service (Formspree)
  Serial.println("Trying Formspree email service...");
  
  http.begin("https://formspree.io/f/YOUR_FORM_ID"); // Replace with actual form ID
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<1024> formDoc;
  formDoc["email"] = RECIPIENT_EMAIL;
  formDoc["subject"] = subject;
  formDoc["message"] = body;
  formDoc["_replyto"] = "noreply@farminsight.com";
  
  String formPayload;
  serializeJson(formDoc, formPayload);
  
  httpResponseCode = http.POST(formPayload);
  
  if (httpResponseCode == 200) {
    Serial.println("Formspree email sent successfully!");
    http.end();
    return true;
  } else {
    Serial.printf("Formspree failed with code: %d\n", httpResponseCode);
  }
  
  http.end();
  
  // Method 3: Try IFTTT webhook (you need to set this up)
  Serial.println("Trying IFTTT webhook method...");
  
  http.begin("https://maker.ifttt.com/trigger/farm_email/with/key/YOUR_IFTTT_KEY");
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<1024> iftttDoc;
  iftttDoc["value1"] = subject;
  iftttDoc["value2"] = RECIPIENT_EMAIL;
  iftttDoc["value3"] = body.substring(0, 500); // IFTTT has limits
  
  String iftttPayload;
  serializeJson(iftttDoc, iftttPayload);
  
  httpResponseCode = http.POST(iftttPayload);
  
  if (httpResponseCode == 200) {
    Serial.println("IFTTT webhook sent successfully!");
    http.end();
    return true;
  } else {
    Serial.printf("IFTTT webhook failed with code: %d\n", httpResponseCode);
  }
  
  http.end();
  
  // Method 4: Simple webhook to your own server (if you have one)
  Serial.println("Trying direct webhook...");
  
  http.begin("https://webhook.site/YOUR_WEBHOOK_ID"); // Replace with your webhook
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<1024> webhookDoc;
  webhookDoc["type"] = "farm_sensor_email";
  webhookDoc["to"] = RECIPIENT_EMAIL;
  webhookDoc["subject"] = subject;
  webhookDoc["body"] = body;
  webhookDoc["node_id"] = "air_node_01";
  webhookDoc["timestamp"] = getCurrentTime();
  
  String webhookPayload;
  serializeJson(webhookDoc, webhookPayload);
  
  httpResponseCode = http.POST(webhookPayload);
  
  if (httpResponseCode == 200) {
    Serial.println("Direct webhook sent successfully!");
    http.end();
    return true;
  } else {
    Serial.printf("Direct webhook failed with code: %d\n", httpResponseCode);
  }
  
  http.end();
  
  // Always log to serial for debugging (this always works)
  Serial.println("=== EMAIL CONTENT (for debugging) ===");
  Serial.println("TO: " + String(RECIPIENT_EMAIL));
  Serial.println("SUBJECT: " + subject);
  Serial.println("BODY:");
  Serial.println(body);
  Serial.println("====================================");
  
  return false; // All email services failed, but data is logged
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
  
  String html = "<!DOCTYPE html>\n"
    "<html>\n"
    "<head>\n"
    "  <title>📊 Daily Sensor Data</title>\n"
    "  <style>\n"
    "    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }\n"
    "    .container { background: white; padding: 20px; border-radius: 10px; max-width: 800px; margin: auto; }\n"
    "    pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }\n"
    "    .btn { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px; }\n"
    "    .btn.daily { background: #28a745; }\n"
    "    .btn.session { background: #17a2b8; }\n"
    "  </style>\n"
    "</head>\n"
    "<body>\n"
    "  <div class=\"container\">\n"
    "    <h1>📊 Daily Sensor Data</h1>\n"
    "    <p><strong>Current Date:</strong> " + getCurrentDate() + "</p>\n"
    "    <p><strong>Current Time:</strong> " + getCurrentTime() + "</p>\n"
    "    \n"
    "    <div>\n"
    "      <a href=\"/download-daily\" class=\"btn daily\">📥 Download Daily JSON</a>\n"
    "      <a href=\"/send-daily-report\" class=\"btn daily\">📧 Send Daily Report</a>\n"
    "      <a href=\"/session-data\" class=\"btn session\">🔄 View Session Data</a>\n"
    "      <a href=\"/\" class=\"btn\">🏠 Home</a>\n"
    "    </div>\n"
    "    \n"
    "    <h3>📋 Daily JSON Data:</h3>\n"
    "    <pre>" + jsonData + "</pre>\n"
    "  </div>\n"
    "</body>\n"
    "</html>";

  server.send(200, "text/html", html);
}

void handleViewSessionData() {
  String jsonData = loadSessionFile();
  
  String html = "<!DOCTYPE html>\n"
    "<html>\n"
    "<head>\n"
    "  <title>🔄 Session Data</title>\n"
    "  <style>\n"
    "    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }\n"
    "    .container { background: white; padding: 20px; border-radius: 10px; max-width: 800px; margin: auto; }\n"
    "    pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }\n"
    "    .btn { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px; }\n"
    "    .btn.daily { background: #28a745; }\n"
    "    .btn.session { background: #17a2b8; }\n"
    "  </style>\n"
    "</head>\n"
    "<body>\n"
    "  <div class=\"container\">\n"
    "    <h1>🔄 Session Data (Since Last Midnight)</h1>\n"
    "    <p><strong>Current Date:</strong> " + getCurrentDate() + "</p>\n"
    "    <p><strong>Current Time:</strong> " + getCurrentTime() + "</p>\n"
    "    \n"
    "    <div>\n"
    "      <a href=\"/download-session\" class=\"btn session\">📥 Download Session JSON</a>\n"
    "      <a href=\"/send-session-data\" class=\"btn session\">📧 Send Session Data</a>\n"
    "      <a href=\"/daily-data\" class=\"btn daily\">📊 View Daily Data</a>\n"
    "      <a href=\"/\" class=\"btn\">🏠 Home</a>\n"
    "    </div>\n"
    "    \n"
    "    <h3>📋 Session JSON Data:</h3>\n"
    "    <pre>" + jsonData + "</pre>\n"
    "  </div>\n"
    "</body>\n"
    "</html>";

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
  
  String html = "<!DOCTYPE html>\n"
    "<html>\n"
    "<head>\n"
    "  <title>📊 Daily Report Sent</title>\n"
    "  <meta http-equiv=\"refresh\" content=\"3;url=/daily-data\">\n"
    "</head>\n"
    "<body>\n"
    "  <h1>📊 Daily Report Sent!</h1>\n"
    "  <p>Daily report has been sent to Aniketsadakale1014@gmail.com</p>\n"
    "  <p>Redirecting to daily data in 3 seconds...</p>\n"
    "</body>\n"
    "</html>";

  server.send(200, "text/html", html);
}

void handleSendSessionData() {
  sendLastSessionData();
  
  String html = "<!DOCTYPE html>\n"
    "<html>\n"
    "<head>\n"
    "  <title>🔄 Session Data Sent</title>\n"
    "  <meta http-equiv=\"refresh\" content=\"3;url=/session-data\">\n"
    "</head>\n"
    "<body>\n"
    "  <h1>🔄 Session Data Sent!</h1>\n"
    "  <p>Last session data has been sent to Aniketsadakale1014@gmail.com</p>\n"
    "  <p>Redirecting to session data in 3 seconds...</p>\n"
    "</body>\n"
    "</html>";

  server.send(200, "text/html", html);
}
