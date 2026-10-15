#include <WiFi.h>
#include <WebServer.h>
#include <esp_now.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BMP280.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// --- HOTSPOT SETTINGS ---
const char* ssid = "NF-07-STATS";
#ifndef SURGE_SENSOR_PASSWORD
#define SURGE_SENSOR_PASSWORD "change-before-use"
#endif
const char* password = SURGE_SENSOR_PASSWORD;

WebServer server(80);

// --- PIN MAPPING ---
const int trigPin = 32;
const int echoPin = 34;

// --- OLED SETTINGS ---
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

Adafruit_BMP280 bmp;
Adafruit_MPU6050 mpu;
bool bmpReady = false, mpuReady = false;

// --- GLOBAL VARIABLES ---
float bmpTemp = 25.0, bmpPressure = 0.0, bmpAltitude = 0.0;
float currentDistance = 0.0;
float accelX = 0.0, accelY = 0.0, accelZ = 0.0;
float gyroX = 0.0, gyroY = 0.0, gyroZ = 0.0;

unsigned long lastFastRead = 0;

uint8_t broadcastAddress[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
esp_now_peer_info_t peerInfo;

// --- PRECISION ULTRASONIC READ ---
float getAccurateDistance(float tempC) {
  float soundSpeed_cm_us = (331.3 + 0.606 * tempC) / 10000.0;
  float samples[3];
  int validCount = 0;

  for (int i = 0; i < 3; i++) {
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);

    long duration = pulseIn(echoPin, HIGH, 15000);
    if (duration > 0) samples[validCount++] = (duration * soundSpeed_cm_us) / 2.0;
    delayMicroseconds(500);
  }

  if (validCount == 0) return 0.0;
  if (validCount == 1) return samples[0];
  if (validCount == 2) return (samples[0] + samples[1]) / 2.0;

  if (samples[0] > samples[1]) { float t = samples[0]; samples[0] = samples[1]; samples[1] = t; }
  if (samples[1] > samples[2]) { float t = samples[1]; samples[1] = samples[2]; samples[2] = t; }
  if (samples[0] > samples[1]) { float t = samples[0]; samples[0] = samples[1]; samples[1] = t; }

  return samples[1];
}

// --- FRONTEND UI (100ms Refresh) ---
const char INDEX_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Precision Scale & Sentry</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; background-color: #121212; color: #ffffff; margin: 0; padding: 20px; }
    .card { background: #1e1e1e; padding: 20px; margin: 0 auto 20px auto; width: 100%; max-width: 450px; border-radius: 12px; box-shadow: 0 8px 16px rgba(0,0,0,0.6); }
    h1 { color: #00ffcc; font-size: 22px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; }
    h2 { color: #fff; font-size: 15px; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px; text-align: left; text-transform: uppercase; color: #888; margin-top: 25px; }
    .row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #2a2a2a; }
    .row:last-child { border-bottom: none; }
    .label-group { text-align: left; }
    .label { font-size: 15px; color: #dddddd; }
    .sensor { font-size: 11px; color: #777777; margin-left: 5px; }
    .value { font-size: 18px; font-weight: bold; color: #00ffcc; }
    .highlight .value { color: #ffd32a; font-size: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Precision Sentry Node</h1>

    <h2>Live High-Speed Data (100ms)</h2>
    <div class="row highlight"><div class="label-group"><span class="label">Distance</span><span class="sensor">(HC-SR04)</span></div><div class="value"><span id="dist">--</span> cm</div></div>

    <div class="row"><div class="label-group"><span class="label">X-Axis Accel</span><span class="sensor">(MPU6050)</span></div><div class="value"><span id="tiltX">--</span> g</div></div>
    <div class="row"><div class="label-group"><span class="label">Y-Axis Accel</span><span class="sensor">(MPU6050)</span></div><div class="value"><span id="tiltY">--</span> g</div></div>
    <div class="row"><div class="label-group"><span class="label">Z-Axis Accel</span><span class="sensor">(MPU6050)</span></div><div class="value"><span id="tiltZ">--</span> g</div></div>

    <div class="row"><div class="label-group"><span class="label">X-Axis Gyro</span><span class="sensor">(MPU6050)</span></div><div class="value"><span id="gyroX">--</span> &deg;/s</div></div>
    <div class="row"><div class="label-group"><span class="label">Y-Axis Gyro</span><span class="sensor">(MPU6050)</span></div><div class="value"><span id="gyroY">--</span> &deg;/s</div></div>
    <div class="row"><div class="label-group"><span class="label">Z-Axis Gyro</span><span class="sensor">(MPU6050)</span></div><div class="value"><span id="gyroZ">--</span> &deg;/s</div></div>

    <div class="row"><div class="label-group"><span class="label">Micro-Temp</span><span class="sensor">(BMP280)</span></div><div class="value"><span id="bmpT">--</span> &deg;C</div></div>
    <div class="row"><div class="label-group"><span class="label">Pressure</span><span class="sensor">(BMP280)</span></div><div class="value"><span id="bmpP">--</span> hPa</div></div>
    <div class="row"><div class="label-group"><span class="label">Altitude</span><span class="sensor">(BMP280)</span></div><div class="value"><span id="bmpA">--</span> m</div></div>
  </div>

  <script>
    setInterval(function() {
      fetch('/data')
        .then(response => response.json())
        .then(data => {
          document.getElementById('dist').innerText = data.dist.toFixed(1);
          document.getElementById('tiltX').innerText = data.tiltX.toFixed(2);
          document.getElementById('tiltY').innerText = data.tiltY.toFixed(2);
          document.getElementById('tiltZ').innerText = data.tiltZ.toFixed(2);

          document.getElementById('gyroX').innerText = data.gyroX.toFixed(1);
          document.getElementById('gyroY').innerText = data.gyroY.toFixed(1);
          document.getElementById('gyroZ').innerText = data.gyroZ.toFixed(1);

          document.getElementById('bmpT').innerText = data.bmpT.toFixed(2);
          document.getElementById('bmpP').innerText = data.bmpP.toFixed(1);
          document.getElementById('bmpA').innerText = data.bmpA.toFixed(1);
        }).catch(err => {});
    }, 100);
  </script>
</body>
</html>
)rawliteral";

void handleRoot() { server.send(200, "text/html", INDEX_HTML); }

void handleData() {
  String json = "{";
  json += "\"dist\":" + String(currentDistance, 1) + ",";
  json += "\"tiltX\":" + String(accelX) + ",";
  json += "\"tiltY\":" + String(accelY) + ",";
  json += "\"tiltZ\":" + String(accelZ) + ",";
  json += "\"gyroX\":" + String(gyroX) + ",";
  json += "\"gyroY\":" + String(gyroY) + ",";
  json += "\"gyroZ\":" + String(gyroZ) + ",";
  json += "\"bmpT\":" + String(bmpTemp) + ",";
  json += "\"bmpP\":" + String(bmpPressure) + ",";
  json += "\"bmpA\":" + String(bmpAltitude);
  json += "}";
  server.send(200, "application/json", json);
}

void setup() {
  Serial.begin(115200);

  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

  // Standard ESP32 I2C Pins (SDA=21, SCL=22)
  Wire.begin();
  Wire.setClock(100000); // Standard Mode (Fixes freezing on MPU6050 clones)

  // Initialize OLED
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
  }
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("Scanning I2C Bus...");

  int foundCount = 0;
  int yPos = 10;
  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    if (Wire.endTransmission() == 0) {
      display.setCursor(0, yPos);
      display.print("Found: 0x");
      display.println(address, HEX);
      yPos += 10;
      foundCount++;
    }
  }
  if (foundCount == 0) {
    display.setCursor(0, yPos);
    display.println("No I2C devices found!");
  }
  display.display();
  delay(5000); // Hold the scan results on screen for 5 seconds

  display.clearDisplay();
  display.setCursor(0, 10);
  display.println("Booting Sentry Node...");
  display.display();

  // Initialize BMP280
  bmpReady = bmp.begin(0x76) || bmp.begin(0x77);
  if (bmpReady) {
    bmp.setSampling(Adafruit_BMP280::MODE_NORMAL, Adafruit_BMP280::SAMPLING_X2, Adafruit_BMP280::SAMPLING_X16, Adafruit_BMP280::FILTER_X16, Adafruit_BMP280::STANDBY_MS_63);
  } else {
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("BMP280 I2C FAILED!");
    display.display();
    delay(2000);
  }

  // Initialize MPU6050 (Try both common addresses)
  mpuReady = mpu.begin(0x68) || mpu.begin(0x69);
  if (mpuReady) {
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  } else {
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("MPU6050 I2C FAILED!");
    display.println("Check SDA/SCL wires");
    display.display();
    delay(3000);
  }

  // Setup WiFi AP + Station (Allows both SoftAP Web UI and ESP-NOW)
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(ssid, password);

  // Setup ESP-NOW Broadcasting
  if (esp_now_init() == ESP_OK) {
    memcpy(peerInfo.peer_addr, broadcastAddress, 6);
    peerInfo.channel = 1;
    peerInfo.encrypt = false;
    esp_now_add_peer(&peerInfo);
  }

  server.on("/", handleRoot);
  server.on("/data", handleData);
  server.begin();
}

void loop() {
  server.handleClient();
  unsigned long currentMillis = millis();

  // --- MAX SPEED LOOP (100ms) ---
  if (currentMillis - lastFastRead >= 100) {
    // 1. Compensated Ultrasonic Read
    currentDistance = getAccurateDistance(bmpTemp);

    // 2. Accelerometer Read (MPU6050)
    sensors_event_t a, g, temp_mpu;
    if (mpuReady) {
    mpu.getEvent(&a, &g, &temp_mpu);
    // Convert m/s^2 to G's
    accelX = a.acceleration.x / 9.81;
    accelY = a.acceleration.y / 9.81;
    accelZ = a.acceleration.z / 9.81;

    // Convert rad/s to Degrees/sec for Gyro
    gyroX = g.gyro.x * 57.2958;
    gyroY = g.gyro.y * 57.2958;
    gyroZ = g.gyro.z * 57.2958;
    }

    // 3. BMP280 Fast Read
    if (bmpReady) {
    bmpTemp = bmp.readTemperature();
    bmpPressure = bmp.readPressure() / 100.0;
    bmpAltitude = bmp.readAltitude(1013.25);
    }

    // 4. ESP-NOW Broadcast
    char payload[150];
    snprintf(payload, sizeof(payload), "T:%.1f P:%.1f D:%.1f X:%.1f Y:%.1f Z:%.1f BMP:%d MPU:%d",
             bmpTemp, bmpPressure, currentDistance, accelX, accelY, accelZ, bmpReady, mpuReady);
    esp_now_send(broadcastAddress, (uint8_t *)payload, strlen(payload));

    // 5. Update OLED (Max Data Design)
    display.clearDisplay();
    display.setTextSize(1);

    // Line 1: Temp & Distance
    display.setCursor(0, 0);
    display.print("T:"); display.print(bmpTemp, 1); display.print("C  ");
    display.print("D:"); display.print(currentDistance, 1); display.print("cm");

    // Line 2: Press & Alt
    display.setCursor(0, 10);
    display.print("P:"); display.print(bmpPressure, 1); display.print("hPa ");
    display.print("A:"); display.print(bmpAltitude, 1); display.print("m");

    // Divider
    display.drawLine(0, 20, 128, 20, SSD1306_WHITE);

    // Line 3: Accel
    display.setCursor(0, 24);
    display.print("Accl(G):");
    display.setCursor(0, 34);
    display.print("X:"); display.print(accelX, 1);
    display.print(" Y:"); display.print(accelY, 1);
    display.print(" Z:"); display.print(accelZ, 1);

    // Line 4: Gyro
    display.setCursor(0, 44);
    display.print("Gyro(d/s):");
    display.print("X:"); display.print(gyroX, 0);

    display.setCursor(0, 54);
    display.print("Y:"); display.print(gyroY, 0);
    display.print(" Z:"); display.print(gyroZ, 0);

    display.display();

    lastFastRead = currentMillis;
  }
}
