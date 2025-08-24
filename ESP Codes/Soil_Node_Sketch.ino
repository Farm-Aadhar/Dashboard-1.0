#include <Wire.h>              // Required for I2C communication (for LCD)
#include <LiquidCrystal_I2C.h> // For I2C LCD
#include <WiFi.h>              // For Wi-Fi connectivity
#include <WebServer.h>         // For creating the web server

// --- Includes for DHT Sensor ---
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <DHT_U.h>
// -----------------------------------

// --- Wi-Fi Configuration ---
const char* ssid = "Anistark Moto";
const char* password = "Aniket1014";

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
int mq135RawValue = 0; // Instantaneous value for web server
int mq3RawValue = 0;   // Instantaneous value for web server
int mq2RawValue = 0;   // Instantaneous value for web server

// Variables for THROTTLED display on Serial/LCD
int displayMq135Value = 0;
int displayMq3Value = 0;
int displayMq2Value = 0;

// --- LCD Display Cycle ---
unsigned long lastDisplaySwitchMillis = 0;
const long displayCycleInterval = 10000; // Switch LCD display every 10 seconds
int currentDisplayScreen = 0; // 0: DHT, 1: MQ-135, 2: MQ-3/MQ-2

// --- MQ Display Update Interval for Serial/LCD ---
unsigned long lastMQDisplayMillis = 0;
const long mqDisplayInterval = 2000; // Update MQ values on Serial/LCD every 2 seconds

// --- Web Server Object ---
WebServer server(80); // Create a web server on port 80

// --- Timestamp for "Updated X seconds ago" on web page ---
unsigned long lastServedMillis = 0; // Time when the last page was served

// --- Function to read all sensors ---
void readAllSensors(); // Defined below setup/loop

// --- Web Server Request Handlers ---
void handleRoot() {
  lastServedMillis = millis(); // Record time when this page is served

  String html = "<!DOCTYPE html>";
  html += "<html>";
  html += "<head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">";
  html += "<title>Farm Aadhar AIR Node</title>";
  html += "<meta http-equiv=\"refresh\" content=\"1\">"; // Auto-refresh page every 1 second for near real-time
  html += "<style>";
  html += "body { font-family: Arial, sans-serif; background-color: #f0f0f0; margin: 20px; }";
  html += ".container { background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 600px; margin: auto; }";
  html += "h1 { color: #333; text-align: center; }";
  html += "p { font-size: 1.1em; color: #555; }";
  html += ".sensor-value { font-weight: bold; color: #007bff; }";
  html += ".status-good { color: green; font-weight: bold; }";
  html += ".status-moderate { color: orange; font-weight: bold; }";
  html += ".status-poor { color: red; font-weight: bold; }";
  html += "</style>";
  html += "</head>";
  html += "<body>";
  html += "<div class=\"container\">";
  html += "<h1>Farm Aadhar AIR Node Data</h1>";

  // DHT Data
  html += "<p><strong>Temperature:</strong> <span class=\"sensor-value\">";
  if (dhtReadSuccess) html += String(currentTemperature, 1) + " &deg;C";
  else html += "N/A";
  html += "</span></p>";

  html += "<p><strong>Humidity:</strong> <span class=\"sensor-value\">";
  if (!isnan(currentHumidity)) html += String(currentHumidity, 0) + " %";
  else html += "N/A";
  html += "</span></p>";

  // MQ-135 (Air Quality) Data
  html += "<p><strong>Air Quality (MQ-135):</strong> Raw <span class=\"sensor-value\">" + String(mq135RawValue) + "</span> (";
  // UPDATED Threshold for MQ-135 to 1500 for "GOOD"
  if (mq135RawValue < 1500) html += "<span class=\"status-good\">GOOD</span>";
  else if (mq135RawValue < 2000) html += "<span class=\"status-moderate\">MODERATE</span>"; // Example for moderate range
  else html += "<span class=\"status-poor\">POOR</span>";
  html += ")</p>";

  // MQ-3 (Alcohol) Data
  html += "<p><strong>Alcohol (MQ-3):</strong> Raw <span class=\"sensor-value\">" + String(mq3RawValue) + "</span> (";
  // UPDATED Threshold for MQ-3 to 800
  if (mq3RawValue < 800) html += "<span class=\"status-good\">SAFE</span>"; // Threshold updated to 800
  else html += "<span class=\"status-poor\">HIGH</span>";
  html += ")</p>";

  // MQ-2 (Smoke) Data
  html += "<p><strong>Smoke (MQ-2):</strong> Raw <span class=\"sensor-value\">" + String(mq2RawValue) + "</span> (";
  // Thresholds for MQ-2 (Normal around ~1100-1150)
  if (mq2RawValue < 1200) html += "<span class=\"status-good\">SAFE</span>";
  else html += "<span class=\"status-poor\">HIGH</span>";
  html += ")</p>";

  html += "<p style=\"font-size: 0.8em; color: #888; text-align: center;\">Updated ";
  html += String((millis() - lastServedMillis) / 1000); // Calculate seconds since last update
  html += "s ago</p>";
  html += "</div>";
  html += "</body>";
  html += "</html>";

  server.send(200, "text/html", html);
}

void handleNotFound() {
  String message = "File Not Found\n\n";
  message += "URI: ";
  message += server.uri();
  message += "\nMethod: ";
  message += (server.method() == HTTP_GET) ? "GET" : "POST";
  message += "\nArguments: ";
  message += server.args();
  message += "\n";
  for (uint8_t i = 0; i < server.args(); i++) {
    message += " " + server.argName(i) + ": " + server.arg(i) + "\n";
  }
  server.send(404, "text/plain", message);
}

void setup() {
  Serial.begin(115200);
  Serial.println("\nBooting ESP32 AIR Node - All Sensors Test + Web Server...");

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

  // --- Display IP on LCD for 5 seconds ---
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Web Server IP:");
  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP());
  delay(5000); // Display IP for 5 seconds

  // --- Initialize DHT Sensor ---
  Serial.println("Initializing DHT sensor...");
  dht.begin();
  Serial.println("DHT sensor initialized.");

  // --- Configure MQ Sensor Pins ---
  pinMode(MQ135_ANALOG_PIN, INPUT);
  pinMode(MQ3_ANALOG_PIN, INPUT);
  pinMode(MQ2_ANALOG_PIN, INPUT);
  Serial.println("MQ sensor pins configured.");

  lastDisplaySwitchMillis = millis(); // Initialize display timer

  // --- Web Server Setup ---
  server.on("/", handleRoot);          // Handle requests to the root URL "/"
  server.onNotFound(handleNotFound); // Handle requests for unknown URLs

  server.begin(); // Start the server
  Serial.println("HTTP server started.");
  Serial.print("Access server at: http://");
  Serial.println(WiFi.localIP()); // Print the full URL for easy access
}

void loop() {
  // Read all sensors continuously to keep global variables current for web server
  readAllSensors();

  // Handle incoming web client requests as fast as possible
  server.handleClient();

  // Update LCD Display based on throttled values
  updateLCDDisplay();

  // Very small delay to allow ESP32 to handle other background tasks
  delay(1);
}

// --- Function to read all sensors ---
void readAllSensors() {
  // Read DHT Sensor Data (add a delay here to respect DHT timing)
  static unsigned long lastDHTReadMillis = 0;
  const long dhtReadInterval = 2000; // DHT requires 2 seconds between reads

  if (millis() - lastDHTReadMillis >= dhtReadInterval) {
    sensors_event_t event;
    dht.temperature().getEvent(&event);
    if (isnan(event.temperature)) {
      Serial.println(F("Error reading temperature from DHT!"));
      currentTemperature = NAN;
      dhtReadSuccess = false;
    } else {
      currentTemperature = event.temperature;
      Serial.print(F("Temperature: "));
      Serial.print(currentTemperature);
      Serial.println(F(" *C"));
      dhtReadSuccess = true;
    }

    dht.humidity().getEvent(&event);
    if (isnan(event.relative_humidity)) {
      Serial.println(F("Error reading humidity from DHT!"));
      currentHumidity = NAN;
    } else {
      currentHumidity = event.relative_humidity;
      Serial.print(F("Humidity:    "));
      Serial.print(currentHumidity);
      Serial.println(F(" %"));
    }
    lastDHTReadMillis = millis(); // Reset timer for DHT
  }

  // --- Read MQ Sensor Data (instantaneous values for web server) ---
  mq135RawValue = analogRead(MQ135_ANALOG_PIN);
  mq3RawValue = analogRead(MQ3_ANALOG_PIN);
  mq2RawValue = analogRead(MQ2_ANALOG_PIN);

  // --- Update values for Serial Monitor and LCD display (throttled) ---
  if (millis() - lastMQDisplayMillis >= mqDisplayInterval) {
    displayMq135Value = mq135RawValue;
    displayMq3Value = mq3RawValue;
    displayMq2Value = mq2RawValue;

    Serial.print(F("MQ-135 (Air Quality) Raw: "));
    Serial.println(displayMq135Value);
    Serial.print(F("MQ-3 (Alcohol) Raw:       "));
    Serial.println(displayMq3Value);
    Serial.print(F("MQ-2 (Smoke) Raw:         "));
    Serial.println(displayMq2Value);
    Serial.println("------------------------------------");
    lastMQDisplayMillis = millis(); // Reset timer for MQ display
  }
}

void updateLCDDisplay() {
  if (millis() - lastDisplaySwitchMillis >= displayCycleInterval) {
    currentDisplayScreen = (currentDisplayScreen + 1) % 3; // Cycle through 0, 1, 2
    lastDisplaySwitchMillis = millis(); // Reset timer
    lcd.clear(); // Clear LCD for new screen
  }

  switch (currentDisplayScreen) {
    case 0: // DHT Sensor Data
      lcd.setCursor(0, 0);
      if (dhtReadSuccess) {
        lcd.print("Temp: "); lcd.print(currentTemperature, 1); lcd.print((char)223); lcd.print("C");
      } else {
        lcd.print("Temp: N/A      ");
      }
      lcd.setCursor(0, 1);
      if (!isnan(currentHumidity)) {
        lcd.print("Hum: "); lcd.print(currentHumidity, 0); lcd.print("%");
      } else {
        lcd.print("Hum: N/A       ");
      }
      break;

    case 1: // MQ-135 Air Quality Sensor Data
      lcd.setCursor(0, 0);
      lcd.print("Air Quality (MQ135)");
      lcd.setCursor(0, 1);
      // Use throttled value for LCD display
      lcd.print("Raw: "); lcd.print(displayMq135Value);
      // UPDATED Thresholds for MQ-135 for LCD
      if (displayMq135Value < 1500) { // New GOOD threshold: 1500
        lcd.print(" GOOD");
      } else if (displayMq135Value < 2000) { // Example for moderate range on LCD
        lcd.print(" MODERATE");
      } else {
        lcd.print(" POOR");
      }
      break;

    case 2: // MQ-3 Alcohol and MQ-2 Smoke Sensor Data
      lcd.setCursor(0, 0);
      // Use throttled values for LCD display
      lcd.print("Alc:"); lcd.print(displayMq3Value); lcd.print(" ");
      lcd.print("Smoke:"); lcd.print(displayMq2Value);
      lcd.setCursor(0, 1);
      // UPDATED Thresholds for MQ-3 Alcohol on LCD
      if (displayMq3Value < 800) { // THRESHOLD UPDATED TO 800
        lcd.print("Alc:Safe");
      } else {
        lcd.print("Alc:High");
      }
      // Adjusted Thresholds for MQ-2 Smoke
      if (displayMq2Value < 1200) { // Normal Air: ~1100-1150 -> SAFE
        lcd.print(" Smoke:Safe");
      } else { // Detectable smoke/combustible gas
        lcd.print(" Smoke:High");
      }
      break;
  }
}