#include <Wire.h>            // Required for I2C communication (for LCD)
#include <LiquidCrystal_I2C.h> // For I2C LCD
#include <WiFi.h>            // For Wi-Fi connectivity
#include <WebServer.h>       // For creating the web server
#include <HTTPClient.h>    // For sending HTTP requests to the Raspberry Pi
#include <ArduinoJson.h>     // For building JSON payloads
#include <ESPmDNS.h>         // NEW: For easy hostname access (e.g., http://air-node.local)

// --- Includes for DHT Sensor ---
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <DHT_U.h>
// -----------------------------------

// --- Wi-Fi Configuration ---
const char* ssid = "Pispot";
const char* password = "raspassword";

// --- Raspberry Pi Server Configuration ---
const char* RASPBERRY_PI_IP = "192.168.117.15";
const int RASPBERRY_PI_PORT = 80; // Default HTTP port
const char* RASPBERRY_PI_DATA_ENDPOINT = "/api/sensor_data"; // Endpoint on your server

// --- LCD Configuration ---
const int LCD_I2C_ADDRESS = 0x27; // Confirm your LCD's I2C address (0x27 or 0x3F)
const int LCD_COLUMNS = 16;
const int LCD_ROWS = 2;
LiquidCrystal_I2C lcd(LCD_I2C_ADDRESS, LCD_COLUMNS, LCD_ROWS);

// --- DHT Sensor Configuration ---
#define DHTPIN 4     // Digital pin connected to the DHT sensor data pin
#define DHTTYPE DHT11 // Set to DHT11
DHT_Unified dht(DHTPIN, DHTTYPE);

// --- MQ Sensor Pin Definitions ---
#define MQ135_ANALOG_PIN 35 // Analog pin for MQ-135 AOUT
#define MQ3_ANALOG_PIN   34 // Analog pin for MQ-3 (Alcohol) AOUT
#define MQ2_ANALOG_PIN   36 // Analog pin for MQ-2 (Smoke) AOUT
// ---------------------------------------

// --- Global Sensor Data Variables ---
float currentHumidity = 0.0;
float currentTemperature = 0.0;
bool dhtReadSuccess = false;
int mq135RawValue = 0;
int mq3RawValue = 0;
int mq2RawValue = 0;

// Variables for throttled display on Serial/LCD
int displayMq135Value = 0;
int displayMq3Value = 0;
int displayMq2Value = 0;

// --- Timers ---
unsigned long lastDisplaySwitchMillis = 0;
const long displayCycleInterval = 10000; // Switch LCD display every 10 seconds
int currentDisplayScreen = 0; // 0: DHT, 1: MQ-135, 2: MQ-3/MQ-2

unsigned long lastMQDisplayMillis = 0;
const long mqDisplayInterval = 2000; // Update MQ values on Serial/LCD every 2 seconds

unsigned long lastDataSendMillis = 0;
const long dataSendInterval = 15000; 

// --- Web Server Object ---
WebServer server(80); // Create a web server on port 80

// --- Function Declarations ---
void readAllSensors();
void sendSensorData();
void updateLCDDisplay();
void handleRoot();
void handleNotFound();


void setup() {
  Serial.begin(115200);
  Serial.println("\nBooting ESP32 AIR Node...");

  // --- LCD Setup ---
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");
  lcd.setCursor(0, 1);
  lcd.print("...");

  // --- Connect to Wi-Fi ---
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    lcd.print("."); // Show progress on LCD
  }
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // --- NEW: Setup mDNS ---
  if (!MDNS.begin("air-node")) {
    Serial.println("Error setting up MDNS responder!");
    while (1) { delay(1000); }
  }
  Serial.println("mDNS responder started");
  Serial.println("Access server at: http://air-node.local");

  // --- Display Hostname on LCD for 5 seconds ---
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Dashboard URL:");
  lcd.setCursor(0, 1);
  lcd.print("air-node.local");
  delay(5000);

  // --- Initialize DHT Sensor ---
  dht.begin();

  // --- Configure MQ Sensor Pins ---
  pinMode(MQ135_ANALOG_PIN, INPUT);
  pinMode(MQ3_ANALOG_PIN, INPUT);
  pinMode(MQ2_ANALOG_PIN, INPUT);

  lastDisplaySwitchMillis = millis(); // Initialize display timer

  // --- Web Server Setup ---
  server.on("/", handleRoot);
  server.onNotFound(handleNotFound);
  server.begin();
  Serial.println("HTTP server started.");
  MDNS.addService("http", "tcp", 80); // Announce the web server service
}

void loop() {
  // Read all sensors continuously
  readAllSensors();

  // Handle incoming web client requests
  server.handleClient();

  // Update the local LCD display
  updateLCDDisplay();

  // Send data to Raspberry Pi periodically
  if (millis() - lastDataSendMillis >= dataSendInterval) {
    sendSensorData();
    lastDataSendMillis = millis();
  }
  delay(1);
}

// --- Function to send sensor data to Raspberry Pi ---
void sendSensorData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping data send.");
    return;
  }

  HTTPClient http;
  String serverPath = "http://" + String(RASPBERRY_PI_IP) + ":" + String(RASPBERRY_PI_PORT) + String(RASPBERRY_PI_DATA_ENDPOINT);

  // Create JSON object
  StaticJsonDocument<256> doc;
  doc["temperature"] = currentTemperature;
  doc["humidity"] = currentHumidity;
  doc["mq135"] = mq135RawValue;
  doc["mq3"] = mq3RawValue;
  doc["mq2"] = mq2RawValue;
  doc["timestamp"] = millis();

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  http.begin(serverPath);
  http.addHeader("Content-Type", "application/json");

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

  // DHT Data
  html += "<p><strong>Temperature:</strong> <span class=\"sensor-value\">";
  if (dhtReadSuccess) html += String(currentTemperature, 1) + " &deg;C"; else html += "N/A";
  html += "</span></p><p><strong>Humidity:</strong> <span class=\"sensor-value\">";
  if (!isnan(currentHumidity)) html += String(currentHumidity, 0) + " %"; else html += "N/A";
  html += "</span></p>";

  // MQ-135 (Air Quality) Data
  html += "<p><strong>Air Quality (MQ-135):</strong> Raw <span class=\"sensor-value\">" + String(mq135RawValue) + "</span> (";
  // NEW THRESHOLD: Based on your value of 2065 being POOR
  if (mq135RawValue < 1800) html += "<span class=\"status-good\">GOOD</span>";
  else if (mq135RawValue < 2000) html += "<span class=\"status-moderate\">MODERATE</span>";
  else html += "<span class=\"status-poor\">POOR</span>";
  html += ")</p>";

  // MQ-3 (Alcohol) Data
  html += "<p><strong>Alcohol (MQ-3):</strong> Raw <span class=\"sensor-value\">" + String(mq3RawValue) + "</span> (";
  // NEW THRESHOLD: Based on your value of 848 being HIGH
  if (mq3RawValue < 840) html += "<span class=\"status-good\">SAFE</span>";
  else html += "<span class=\"status-poor\">HIGH</span>";
  html += ")</p>";

  // MQ-2 (Smoke) Data
  html += "<p><strong>Smoke (MQ-2):</strong> Raw <span class=\"sensor-value\">" + String(mq2RawValue) + "</span> (";
  if (mq2RawValue < 1200) html += "<span class=\"status-good\">SAFE</span>";
  else html += "<span class=\"status-poor\">HIGH</span>";
  html += ")</p>";

  html += "</div></body></html>";
  server.send(200, "text/html", html);
}

void handleNotFound() {
  server.send(404, "text/plain", "404: Not Found");
}

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
      // NEW THRESHOLD: Based on your value of 2065 being POOR
      if (displayMq135Value < 2000) lcd.print(" GOOD");
      else if (displayMq135Value < 2300) lcd.print(" MODERATE");
      else lcd.print(" POOR");
      break;

    case 2: // MQ-3 Alcohol and MQ-2 Smoke Sensor Data
      lcd.setCursor(0, 0);
      lcd.print("Alc:"); lcd.print(displayMq3Value);
      lcd.setCursor(8, 0); // Adjusted cursor position
      lcd.print("Smoke:"); lcd.print(displayMq2Value);
      lcd.setCursor(0, 1);
      // NEW THRESHOLD: Based on your value of 848 being HIGH
      if (displayMq3Value < 750) lcd.print("Alc:Safe ");
      else lcd.print("Alc:High ");
      
      if (displayMq2Value < 1500) lcd.print("Smoke:Safe");
      else lcd.print("Smoke:High");
      break;
  }
}
