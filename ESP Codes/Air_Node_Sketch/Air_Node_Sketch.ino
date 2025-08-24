// Uncomment the next line to enable LCD display functionality
#define USE_LCD
#ifdef USE_LCD
#include <Wire.h>               // Required for I2C communication (for LCD)
#include <LiquidCrystal_I2C.h>  // For I2C LCD
#endif
#include <WiFi.h>               // For Wi-Fi connectivity
#include <WebServer.h>          // For creating the web server
#include <HTTPClient.h>         // For sending HTTP requests to the backend
#include <ArduinoJson.h>        // For building JSON payloads
#include <ESPmDNS.h>            // For easy hostname access (e.g., http://air-node.local)
#include <Adafruit_Sensor.h>    // Includes for DHT Sensor
#include <DHT.h>
#include <DHT_U.h>
#include <SPIFFS.h>             // For local file system to cache data

// --- Wi-Fi Configuration ---
// Define multiple SSIDs and passwords
const char* ssid1 = "Anistark Moto";
const char* password1 = "123123123";

const char* ssid2 = "Anushka";
const char* password2 = "123123123";

// --- Supabase Server Configuration ---
// IMPORTANT: Replace with your actual Supabase credentials
const char* SUPABASE_URL = "https://ghkcfgcyzhtwufizxuyo.supabase.co";
const char* SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdoa2NmZ2N5emh0d3VmaXp4dXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDYzMiwiZXhwIjoyMDcxMjYwNjMyfQ.romU2eJK__vtjLXOz6Au79vcFJo3Ia87xnARodpr3Ho";
const char* SUPABASE_DATA_ENDPOINT = "/rest/v1/sensor_readings";

// --- LCD Configuration ---
#ifdef USE_LCD
const int LCD_I2C_ADDRESS = 0x27;
const int LCD_COLUMNS = 16;
const int LCD_ROWS = 2;
LiquidCrystal_I2C lcd(LCD_I2C_ADDRESS, LCD_COLUMNS, LCD_ROWS);
#endif
// --- LED Pin Configuration ---
#define LED_PIN 2 // Onboard LED for ESP32


// --- DHT Sensor Configuration ---
#define DHTPIN 4
#define DHTTYPE DHT11
DHT_Unified dht(DHTPIN, DHTTYPE);

// --- MQ Sensor Pin Definitions ---
#define MQ135_ANALOG_PIN 35
#define MQ3_ANALOG_PIN   34
#define MQ2_ANALOG_PIN   36

// --- Global Sensor Data Variables ---
float currentHumidity = 0.0;
float currentTemperature = 0.0;
bool dhtReadSuccess = false;
int mq135RawValue = 0;
int mq3RawValue = 0;
int mq2RawValue = 0;
int displayMq135Value = 0;
int displayMq3Value = 0;
int displayMq2Value = 0;

// --- Timers & Control Flags ---
unsigned long lastDisplaySwitchMillis = 0;
const long displayCycleInterval = 10000;
int currentDisplayScreen = 0;
unsigned long lastMQDisplayMillis = 0;
const long mqDisplayInterval = 2000;
unsigned long lastDataSendMillis = 0;
const long dataSendInterval = 500; // Send data every 0.5 second
unsigned long lastStatusCheckMillis = 0;
const long statusCheckInterval = 30000; // Check connection status every 30 seconds

bool isLoggingEnabled = true;
bool dashboardConnectionEnabled = true; // Status from dashboard

WebServer server(80);

// --- Function Declarations ---
void readAllSensors();
void sendSensorData();
void updateLCDDisplay();
void handleRoot();
void handleNotFound();
void handleToggleLogging();
void handleEnableLogging();
void handleDisableLogging();
void cacheSensorData();
void connectToWiFi(); // NEW: Function to handle multiple Wi-Fi networks
void checkDashboardConnectionStatus(); // NEW: Function to check dashboard status

// --- Setup Function ---
void setup() {
  Serial.begin(115200);
  Serial.println("\nBooting ESP32 AIR Node...");

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW); // LED off initially

#ifdef USE_LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");
  lcd.setCursor(0, 1);
  lcd.print("...");
#endif

  connectToWiFi(); // Call the new function to connect to Wi-Fi

  if (!MDNS.begin("air-node")) {
    Serial.println("Error setting up MDNS responder!");
    while (1) { delay(1000); }
  }
  Serial.println("mDNS responder started");
  Serial.println("Access server at: http://air-node.local");

#ifdef USE_LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Logging: ON");
  lcd.setCursor(0, 1);
  lcd.print("air-node.local");
  delay(5000);
#endif

  dht.begin();
  pinMode(MQ135_ANALOG_PIN, INPUT);
  pinMode(MQ3_ANALOG_PIN, INPUT);
  pinMode(MQ2_ANALOG_PIN, INPUT);

  lastDisplaySwitchMillis = millis();

  if (!SPIFFS.begin(true)) {
    Serial.println("An Error has occurred while mounting SPIFFS");
    return;
  }

  // --- Web Server Setup with new endpoint ---
  server.on("/", handleRoot);
  server.on("/toggle-logging", handleToggleLogging);
  server.on("/enable-logging", handleEnableLogging);
  server.on("/disable-logging", handleDisableLogging);
  server.onNotFound(handleNotFound);
  server.begin();
  Serial.println("HTTP server started.");
  MDNS.addService("http", "tcp", 80);
}

// --- Main Loop ---
// --- LED Blinking State Variables ---
unsigned long lastLEDBlinkMillis = 0;
bool ledBlinkState = false;
unsigned long lastAliveBlinkMillis = 0;

void loop() {
  readAllSensors();
  server.handleClient();
  updateLCDDisplay();

  // Check dashboard connection status periodically
  if (millis() - lastStatusCheckMillis >= statusCheckInterval) {
    checkDashboardConnectionStatus();
    lastStatusCheckMillis = millis();
  }

  // Wi-Fi connection LED blinking (handled in connectToWiFi)
  // Data sending LED logic - only send if both local logging and dashboard connection are enabled
  if (isLoggingEnabled && dashboardConnectionEnabled) {
    if (millis() - lastDataSendMillis >= 1000) { // Send data every 1 sec
      sendSensorData();
      // Blink LED once after successful data send
      digitalWrite(LED_PIN, HIGH);
      delay(100);
      digitalWrite(LED_PIN, LOW);
      lastDataSendMillis = millis();
    }
  } else {
    // If logging is disabled, blink LED every 3 sec to show device is alive
    if (millis() - lastAliveBlinkMillis >= 3000) {
      digitalWrite(LED_PIN, HIGH);
      delay(100);
      digitalWrite(LED_PIN, LOW);
      lastAliveBlinkMillis = millis();
    }
    // Cache data locally if dashboard connection is disabled but local logging is enabled
    if (isLoggingEnabled && !dashboardConnectionEnabled) {
      if (millis() - lastDataSendMillis >= 1000) {
        cacheSensorData();
        lastDataSendMillis = millis();
      }
    }
  }
  delay(1);
}

// NEW: Function to connect to Wi-Fi
void connectToWiFi() {
  WiFi.begin(ssid1, password1);
  Serial.printf("Connecting to WiFi: %s\n", ssid1);
  int i = 0;
  while (WiFi.status() != WL_CONNECTED && i < 20) {
    delay(500);
    Serial.print(".");
#ifdef USE_LCD
    lcd.print(".");
#endif
    // Blink LED while connecting
    digitalWrite(LED_PIN, ledBlinkState ? HIGH : LOW);
    ledBlinkState = !ledBlinkState;
    delay(200);
    i++;
  }
  digitalWrite(LED_PIN, LOW); // Stop blinking

  if (WiFi.status() != WL_CONNECTED) {
    Serial.printf("\nFailed to connect to %s, trying %s\n", ssid1, ssid2);
#ifdef USE_LCD
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Connecting WiFi");
    lcd.setCursor(0, 1);
    lcd.print(ssid2);
#endif
    WiFi.begin(ssid2, password2);
    i = 0;
    while (WiFi.status() != WL_CONNECTED && i < 20) {
      delay(500);
      Serial.print(".");
#ifdef USE_LCD
      lcd.print(".");
#endif
      // Blink LED while connecting
      digitalWrite(LED_PIN, ledBlinkState ? HIGH : LOW);
      ledBlinkState = !ledBlinkState;
      delay(200);
      i++;
    }
    digitalWrite(LED_PIN, LOW); // Stop blinking
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    digitalWrite(LED_PIN, LOW); // LED off when connected
  } else {
    Serial.println("\nFailed to connect to both networks.");
#ifdef USE_LCD
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Failed!");
    lcd.setCursor(0, 1);
    lcd.print("Reboot ESP");
#endif
    while(1) { delay(1000); }
  }
}

// --- Function to send sensor data to Supabase ---
void sendSensorData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping data send.");
    return;
  }

  HTTPClient http;
  String serverPath = String(SUPABASE_URL) + String(SUPABASE_DATA_ENDPOINT);

  StaticJsonDocument<512> doc;
  doc["air_temperature"] = currentTemperature;
  doc["air_humidity"] = currentHumidity;
  doc["air_air_quality_mq135"] = mq135RawValue;
  doc["air_alcohol_mq3"] = mq3RawValue;
  doc["air_smoke_mq2"] = mq2RawValue;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  http.begin(serverPath);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);

  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode > 0) {
    Serial.printf("[HTTP] POST... code: %d\n", httpResponseCode);
  } else {
    Serial.printf("[HTTP] POST... failed, error: %s\n", http.errorToString(httpResponseCode).c_str());
  }
  http.end();
}

// --- Web Server Request Handler for the root page ---
void handleRoot() {
  String html = "<!DOCTYPE html><html><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">";
  html += "<title>Farm Aadhar AIR Node</title><meta http-equiv=\"refresh\" content=\"5\">";
  html += "<style>body{font-family:Arial,sans-serif;background-color:#f0f0f0;margin:20px;}.container{background-color:#fff;padding:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);max-width:600px;margin:auto;}h1{color:#333;text-align:center;}p{font-size:1.1em;color:#555;}.sensor-value{font-weight:bold;color:#007bff;}.status-good{color:green;}.status-moderate{color:orange;}.status-poor{color:red;}</style>";
  html += "</head><body><div class=\"container\"><h1>Farm Aadhar AIR Node Data</h1>";
  html += "<p><strong>Logging Status:</strong> <span class=\"sensor-value\">" + String(isLoggingEnabled ? "ON" : "OFF") + "</span></p>";
  
  // DHT Data
  html += "<p><strong>Temperature:</strong> <span class=\"sensor-value\">";
  if (dhtReadSuccess) html += String(currentTemperature, 1) + " &deg;C"; else html += "N/A";
  html += "</span></p><p><strong>Humidity:</strong> <span class=\"sensor-value\">";
  if (!isnan(currentHumidity)) html += String(currentHumidity, 0) + " %"; else html += "N/A";
  html += "</span></p>";

  // MQ-135 (Air Quality) Data
  html += "<p><strong>Air Quality (MQ-135):</strong> Raw <span class=\"sensor-value\">" + String(mq135RawValue) + "</span> (";
  if (mq135RawValue < 3000) html += "<span class=\"status-good\">GOOD</span>";
  else if (mq135RawValue < 3500) html += "<span class=\"status-moderate\">MODERATE</span>";
  else html += "<span class=\"status-poor\">POOR</span>";
  html += ")</p>";

  // MQ-3 (Alcohol) Data
  html += "<p><strong>Alcohol (MQ-3):</strong> Raw <span class=\"sensor-value\">" + String(mq3RawValue) + "</span> (";
  if (mq3RawValue < 1200) html += "<span class=\"status-good\">SAFE</span>";
  else html += "<span class=\"status-poor\">HIGH</span>";
  html += ")</p>";

  // MQ-2 (Smoke) Data
  html += "<p><strong>Smoke (MQ-2):</strong> Raw <span class=\"sensor-value\">" + String(mq2RawValue) + "</span> (";
  if (mq2RawValue < 2200) html += "<span class=\"status-good\">SAFE</span>";
  else html += "<span class=\"status-poor\">HIGH</span>";
  html += ")</p>";

  html += "</div></body></html>";
  server.send(200, "text/html", html);
}

// NEW: Function to handle a web server request to toggle the logging state
void handleToggleLogging() {
  isLoggingEnabled = !isLoggingEnabled;
#ifdef USE_LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Logging:");
  lcd.setCursor(0, 1);
  if (isLoggingEnabled) {
    lcd.print("ON");
    Serial.println("Data logging enabled.");
  } else {
    lcd.print("OFF");
    Serial.println("Data logging disabled.");
  }
#else
  if (isLoggingEnabled) {
    Serial.println("Data logging enabled.");
  } else {
    Serial.println("Data logging disabled.");
  }
#endif
  server.send(200, "text/plain", isLoggingEnabled ? "Logging Enabled" : "Logging Disabled");
}

// NEW: Function to enable logging via dashboard request
void handleEnableLogging() {
  isLoggingEnabled = true;
#ifdef USE_LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Logging: ON");
  lcd.setCursor(0, 1);
  lcd.print("(Dashboard)");
#endif
  Serial.println("Data logging enabled via dashboard.");
  server.send(200, "text/plain", "Logging Enabled");
}

// NEW: Function to disable logging via dashboard request
void handleDisableLogging() {
  isLoggingEnabled = false;
#ifdef USE_LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Logging: OFF");
  lcd.setCursor(0, 1);
  lcd.print("(Dashboard)");
#endif
  Serial.println("Data logging disabled via dashboard.");
  server.send(200, "text/plain", "Logging Disabled");
}

// NEW: Function to check dashboard connection status
void checkDashboardConnectionStatus() {
  if (WiFi.status() != WL_CONNECTED) {
    dashboardConnectionEnabled = false;
    return;
  }

  HTTPClient http;
  // Try multiple possible dashboard URLs
  String dashboardURLs[] = {
    "http://192.168.1.100:5173/esp-connection-status.json",  // Adjust IP as needed
    "http://localhost:5173/esp-connection-status.json",
    "http://farm-dashboard.local:5173/esp-connection-status.json"
  };
  
  bool statusFound = false;
  
  for (int i = 0; i < 3 && !statusFound; i++) {
    http.begin(dashboardURLs[i]);
    http.setTimeout(3000); // 3 second timeout
    
    int httpResponseCode = http.GET();
    
    if (httpResponseCode == 200) {
      String payload = http.getString();
      
      // Simple JSON parsing - look for "esp_connection_enabled":true/false
      if (payload.indexOf("\"esp_connection_enabled\":true") != -1) {
        dashboardConnectionEnabled = true;
        statusFound = true;
        Serial.println("Dashboard connection status: ENABLED");
      } else if (payload.indexOf("\"esp_connection_enabled\":false") != -1) {
        dashboardConnectionEnabled = false;
        statusFound = true;
        Serial.println("Dashboard connection status: DISABLED");
      }
    }
    
    http.end();
  }
  
  if (!statusFound) {
    // If we can't reach any dashboard, assume connection is enabled (fail-safe)
    dashboardConnectionEnabled = true;
    Serial.println("Failed to check dashboard status, defaulting to ENABLED");
  }
}

// NEW: Placeholder function for caching data to a local file
void cacheSensorData() {
    // TODO: Implement file system logic to save data to a local JSON file.
    Serial.println("Caching data locally (function not yet implemented).");
}


// --- Web Server Request Handler for the root page ---
void handleNotFound() {
  server.send(404, "text/plain", "404: Not Found");
}

// --- Function to read all sensors ---
void readAllSensors() {
  static unsigned long lastDHTReadMillis = 0;
  const long dhtReadInterval = 2000;

  if (millis() - lastDHTReadMillis >= dhtReadInterval) {
    sensors_event_t event;
    dht.temperature().getEvent(&event);
    if (isnan(event.temperature)) {
      dhtReadSuccess = false;
    } else {
      currentTemperature = event.temperature;
      dhtReadSuccess = true;
    }

    dht.humidity().getEvent(&event);
    if (!isnan(event.relative_humidity)) {
      currentHumidity = event.relative_humidity;
    }
    lastDHTReadMillis = millis();
  }

  mq135RawValue = analogRead(MQ135_ANALOG_PIN);
  mq3RawValue = analogRead(MQ3_ANALOG_PIN);
  mq2RawValue = analogRead(MQ2_ANALOG_PIN);

  if (millis() - lastMQDisplayMillis >= mqDisplayInterval) {
    displayMq135Value = mq135RawValue;
    displayMq3Value = mq3RawValue;
    displayMq2Value = mq2RawValue;

    Serial.printf("Temp: %.1f C, Hum: %.0f %%, MQ135: %d, MQ3: %d, MQ2: %d\n",
                  currentTemperature, currentHumidity, displayMq135Value, displayMq3Value, displayMq2Value);

    lastMQDisplayMillis = millis();
  }
}

// --- Function to update LCD Display ---
#ifdef USE_LCD
void updateLCDDisplay() {
  if (millis() - lastDisplaySwitchMillis >= displayCycleInterval) {
    currentDisplayScreen = (currentDisplayScreen + 1) % 3;
    lastDisplaySwitchMillis = millis();
    lcd.clear();
  }

  switch (currentDisplayScreen) {
    case 0: // DHT Sensor Data
      lcd.setCursor(0, 0);
      if (dhtReadSuccess) {
        lcd.print("Temp: "); lcd.print(currentTemperature, 1); lcd.print((char)223); lcd.print("C");
      } else {
        lcd.print("Temp: N/A");
      }
      lcd.setCursor(0, 1);
      if (!isnan(currentHumidity)) {
        lcd.print("Hum: "); lcd.print(currentHumidity, 0); lcd.print("%");
      } else {
        lcd.print("Hum: N/A");
      }
      break;

    case 1: // MQ-135 Air Quality Sensor Data
      lcd.setCursor(0, 0);
      lcd.print("Air Quality");
      lcd.setCursor(0, 1);
      lcd.print("Raw: "); lcd.print(displayMq135Value);
      if (displayMq135Value < 3000) lcd.print(" GOOD");
      else if (displayMq135Value < 3500) lcd.print(" MODERATE");
      else lcd.print(" POOR");
      break;

    case 2: // MQ-3 Alcohol and MQ-2 Smoke Sensor Data
      lcd.setCursor(0, 0);
      lcd.print("Alc:"); lcd.print(displayMq3Value);
      lcd.setCursor(8, 0);
      lcd.print("Smoke:"); lcd.print(displayMq2Value);
      lcd.setCursor(0, 1);
      if (displayMq3Value < 1200) lcd.print("Alc:Safe ");
      else lcd.print("Alc:High ");
      if (displayMq2Value < 2200) lcd.print("Smoke:Safe");
      else lcd.print("Smoke:High");
      break;
  }
}
#else
void updateLCDDisplay() {
  // LCD not used
}
#endif
