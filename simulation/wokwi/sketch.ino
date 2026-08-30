/*
  SURGE090 — Serpentine Snake Robot Controller
  ESP32 + 5x Servo + MPU6050 + HC-SR04 + SSD1306 OLED
  ------------------------------------------------------------------
  Improvements over the original:
    - All tuning lives in one CONFIG block (amplitude, speed, wave,
      turn, center, per-servo trim & direction).
    - Real serpenoid gait with selectable modes: FWD / REV / LEFT /
      RIGHT / IDLE / AUTO (autonomous obstacle avoidance).
    - Non-blocking loop (millis() scheduling) — servos, sensor and
      display each run on their own timers. No more delay(30).
    - Robust ultrasonic: pulseIn timeout + exponential smoothing,
      plus hysteresis so the robot doesn't twitch at the threshold.
    - MPU6050 flip/fall detection — stops moving if it tips over.
    - Live tuning over the Serial Monitor (115200 baud) — type ?
    - Graceful startup: a missing OLED/MPU no longer bricks the bot.
  ------------------------------------------------------------------
  Gait model (lateral undulation / serpenoid curve):
    angle_i = center + trim_i + bias + dir_i * A * sin(phase + d*i*lag)
*/

#include <Adafruit_GFX.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_Sensor.h>
#include <ESP32Servo.h>
#include <Wire.h>

// ============================================================
//  USER CONFIGURATION  — tweak everything here
// ============================================================

// ---- Display ----
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_ADDR 0x3C

// ---- Ultrasonic ----
#define TRIG_PIN 5
#define ECHO_PIN 18
#define MAX_DISTANCE_CM 400.0f // readings above this are clamped
#define OBSTACLE_CM 20.0f      // stop / avoid below this
#define CLEAR_CM 25.0f         // resume above this (hysteresis gap)

// ---- I2C (shared by OLED + MPU6050) ----
#define I2C_SDA 21
#define I2C_SCL 22

// ---- Servos ----
#define NUM_SERVOS 5
const int SERVO_PINS[NUM_SERVOS] = {26, 27, 14, 12, 13};

// Per-servo trim (deg) so each truly centers. Adjust if a joint sags.
int servoTrim[NUM_SERVOS] = {0, 0, 0, 0, 0};

// Flip a servo if it's mounted mirrored: use +1 or -1.
int servoDir[NUM_SERVOS] = {1, 1, 1, 1, 1};

// ---- Gait defaults (all live-adjustable over Serial) ----
struct GaitConfig {
  float amplitude; // degrees of swing from center
  float waveLag;   // phase offset between adjacent segments (rad)
  float speed;     // phase step per update -> wave frequency
  float turnBias;  // degrees added to every joint to steer
  int centerAngle; // neutral position
};
GaitConfig gait = {40.0f, 0.8f, 0.12f, 0.0f, 90};

// ---- Timing (non-blocking, ms) ----
const unsigned long SERVO_INTERVAL = 20;    // ~50 Hz gait update
const unsigned long SENSOR_INTERVAL = 60;   // ultrasonic + IMU poll
const unsigned long DISPLAY_INTERVAL = 120; // OLED refresh

// ---- Safety ----
#define ENABLE_FLIP_STOP true
#define FLIP_ACCEL_Z -4.0f // Az below this => robot is upside down

// ============================================================
//  STATE
// ============================================================
enum Mode {
  MODE_FORWARD,
  MODE_BACKWARD,
  MODE_LEFT,
  MODE_RIGHT,
  MODE_IDLE,
  MODE_AUTO
};
Mode currentMode = MODE_AUTO;

Servo servos[NUM_SERVOS];
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
Adafruit_MPU6050 mpu;
bool mpuOk = false;
bool displayOk = false;

float phase = 0.0f;
float distSmooth = MAX_DISTANCE_CM;
bool moving = true;
bool flipped = false;

sensors_event_t accel, gyro, mtemp;
unsigned long tServo = 0, tSensor = 0, tDisplay = 0;

// Forward declarations (safe whether compiled as .ino or .cpp)
void printStatus();
const char *modeName(Mode m);

// ============================================================
//  ULTRASONIC
// ============================================================
float readDistanceRaw() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  unsigned long dur = pulseIn(ECHO_PIN, HIGH, 25000UL); // ~4 m timeout
  if (dur == 0)
    return MAX_DISTANCE_CM; // no echo = clear
  float d = dur * 0.0343f / 2.0f;
  return (d > MAX_DISTANCE_CM) ? MAX_DISTANCE_CM : d;
}

void filterDistance(float raw) {
  const float alpha = 0.4f; // 0..1, higher = snappier, lower = smoother
  distSmooth = alpha * raw + (1.0f - alpha) * distSmooth;
}

// ============================================================
//  GAIT
// ============================================================
void applyGait(float waveDir, float bias) {
  for (int i = 0; i < NUM_SERVOS; i++) {
    float a =
        gait.centerAngle + servoTrim[i] + bias +
        servoDir[i] * gait.amplitude * sin(phase + waveDir * i * gait.waveLag);
    a = constrain(a, 0.0f, 180.0f);
    servos[i].write((int)a);
  }
  phase += gait.speed;
  if (phase >= TWO_PI)
    phase -= TWO_PI;
}

void holdNeutral() {
  for (int i = 0; i < NUM_SERVOS; i++)
    servos[i].write(constrain(gait.centerAngle + servoTrim[i], 0, 180));
}

void updateGait() {
  switch (currentMode) {
  case MODE_FORWARD:
    applyGait(+1, gait.turnBias);
    break;
  case MODE_BACKWARD:
    applyGait(-1, gait.turnBias);
    break;
  case MODE_LEFT:
    applyGait(+1, gait.turnBias + 25);
    break;
  case MODE_RIGHT:
    applyGait(+1, gait.turnBias - 25);
    break;
  case MODE_IDLE:
    holdNeutral();
    break;
  case MODE_AUTO:
    if (flipped)
      holdNeutral(); // tipped over
    else if (moving)
      applyGait(+1, gait.turnBias); // clear path
    else
      applyGait(+1, gait.turnBias + 30); // veer around obstacle
    break;
  }
}

// ============================================================
//  IMU SAFETY
// ============================================================
void checkFlip() {
  if (!ENABLE_FLIP_STOP || !mpuOk) {
    flipped = false;
    return;
  }
  flipped = (accel.acceleration.z < FLIP_ACCEL_Z); // upright Az ~ +9.8
}

// ============================================================
//  SERIAL COMMAND INTERFACE
// ============================================================
const char *modeName(Mode m) {
  switch (m) {
  case MODE_FORWARD:
    return "FWD";
  case MODE_BACKWARD:
    return "REV";
  case MODE_LEFT:
    return "LEFT";
  case MODE_RIGHT:
    return "RIGHT";
  case MODE_IDLE:
    return "IDLE";
  case MODE_AUTO:
    return "AUTO";
  }
  return "?";
}

void printStatus() {
  Serial.println(F("---- SURGE090 ----"));
  Serial.print(F("Mode      : "));
  Serial.println(modeName(currentMode));
  Serial.print(F("Amplitude : "));
  Serial.println(gait.amplitude, 1);
  Serial.print(F("Speed     : "));
  Serial.println(gait.speed, 3);
  Serial.print(F("WaveLag   : "));
  Serial.println(gait.waveLag, 3);
  Serial.print(F("TurnBias  : "));
  Serial.println(gait.turnBias, 1);
  Serial.print(F("Center    : "));
  Serial.println(gait.centerAngle);
  Serial.print(F("Distance  : "));
  Serial.println(distSmooth, 1);
  Serial.println(F("Cmds: f b l r s a | A# S# W# T# C# | ?"));
}

void handleSerial() {
  if (!Serial.available())
    return;
  String line = Serial.readStringUntil('\n');
  line.trim();
  if (line.length() == 0)
    return;

  char c = line.charAt(0);
  float val = line.substring(1).toFloat();

  switch (c) {
  case 'f':
    currentMode = MODE_FORWARD;
    break;
  case 'b':
    currentMode = MODE_BACKWARD;
    break;
  case 'l':
    currentMode = MODE_LEFT;
    break;
  case 'r':
    currentMode = MODE_RIGHT;
    break;
  case 's':
    currentMode = MODE_IDLE;
    break;
  case 'a':
    currentMode = MODE_AUTO;
    break;
  case 'A':
    gait.amplitude = constrain(val, 0.0f, 90.0f);
    break;
  case 'S':
    gait.speed = constrain(val, 0.01f, 1.0f);
    break;
  case 'W':
    gait.waveLag = val;
    break;
  case 'T':
    gait.turnBias = constrain(val, -60.0f, 60.0f);
    break;
  case 'C':
    gait.centerAngle = (int)constrain(val, 0.0f, 180.0f);
    break;
  case '?':
    printStatus();
    return;
  default:
    Serial.println(F("Unknown cmd. Type ? for help."));
    return;
  }
  Serial.print(F("OK -> "));
  printStatus();
}

// ============================================================
//  DISPLAY
// ============================================================
void updateDisplay() {
  if (!displayOk)
    return;
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  display.setCursor(0, 0);
  display.print("SURGE090 [");
  display.print(modeName(currentMode));
  display.print("]");

  display.setCursor(0, 12);
  display.print("Dist: ");
  display.print(distSmooth, 1);
  display.print(" cm");

  // distance bar (0..60 cm mapped to full width)
  int barW = map((int)constrain(distSmooth, 0.0f, 60.0f), 0, 60, 0, 120);
  display.drawRect(0, 24, 122, 6, SSD1306_WHITE);
  display.fillRect(1, 25, barW, 4, SSD1306_WHITE);

  display.setCursor(0, 34);
  display.print("Ax");
  display.print(accel.acceleration.x, 1);
  display.print(" Ay");
  display.print(accel.acceleration.y, 1);
  display.setCursor(0, 44);
  display.print("Az");
  display.print(accel.acceleration.z, 1);

  display.setCursor(0, 54);
  if (flipped)
    display.print("STATUS: FLIPPED!");
  else if (currentMode == MODE_IDLE)
    display.print("STATUS: IDLE");
  else if (moving)
    display.print("STATUS: MOVING");
  else
    display.print("STATUS: OBSTACLE");

  display.display();
}

// ============================================================
//  SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);

  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  for (int i = 0; i < NUM_SERVOS; i++) {
    servos[i].setPeriodHertz(50);
    servos[i].attach(SERVO_PINS[i], 500, 2400); // full-range pulse width
  }
  holdNeutral();

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

  Wire.begin(I2C_SDA, I2C_SCL);

  displayOk = display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR);
  if (displayOk) {
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("SURGE090 boot...");
    display.display();
  } else {
    Serial.println(F("OLED init failed (continuing)"));
  }

  mpuOk = mpu.begin();
  if (mpuOk) {
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  } else {
    Serial.println(F("MPU6050 not found (continuing)"));
  }

  Serial.println(F("SURGE090 ready. Type ? for commands."));
  printStatus();
}

// ============================================================
//  MAIN LOOP (non-blocking)
// ============================================================
void loop() {
  unsigned long now = millis();

  handleSerial();

  if (now - tSensor >= SENSOR_INTERVAL) {
    tSensor = now;
    filterDistance(readDistanceRaw());
    if (mpuOk)
      mpu.getEvent(&accel, &gyro, &mtemp);
    checkFlip();

    if (distSmooth < OBSTACLE_CM)
      moving = false; // hysteresis
    else if (distSmooth > CLEAR_CM)
      moving = true;
  }

  if (now - tServo >= SERVO_INTERVAL) {
    tServo = now;
    updateGait();
  }

  if (now - tDisplay >= DISPLAY_INTERVAL) {
    tDisplay = now;
    updateDisplay();
  }
}
