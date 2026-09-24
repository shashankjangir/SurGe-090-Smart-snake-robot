# Telemetry, Diagnostics & Performance

This document outlines the onboard diagnostic tools (RGB LEDs) and the theoretical performance latency of the Snake SURGE architecture.

## 1. RGB LED Status Indicators
The Receiver ESP32 (Waveshare Servo Driver) features two WS2812 RGB NeoPixel LEDs on GPIO 23 that provide real-time hardware status and telemetry feedback.

### LED 0: Connection Status (Left LED)
Indicates the current communication link between the master controller and the ESP32.
* **🤍 Slow Breathing White:** Disconnected / Waiting for a signal.
* **🟦 Solid Blue:** USB Serial connection active.
* **🟩 Solid Green:** Wireless (ESP-NOW) connection active.
* **🟦🟩 Solid Cyan:** Both USB and Wireless are active simultaneously.

### LED 1: Motor Telemetry & Error Status (Right LED)
Monitors the physical effort (current/load) of all 10 ST3215 motors in real-time. This LED updates dynamically when the web app requests telemetry.
* **🟩 Solid Green (Normal):** The snake is slithering with minimal resistance (Max Load < 30%).
* **🟨 Solid Yellow (Moderate):** The snake is working hard or pushing against friction (Max Load 30% - 60%).
* **🟥 Flashing Red (Warning/Danger):** Overload! One or more motors are stalling or pushing past 60% load. Be aware that prolonged stalling may trigger the power supply's over-current protection.
* **🛑 Solid Red (Hardware Error):** The ESP32 is attempting to poll the servos, but zero servos are responding. Check the daisy-chain wiring and motor power.

---

## 2. System Pipeline Latency
The Snake SURGE architecture is designed for extreme low-latency performance. Because it bypasses traditional Wi-Fi routers (using ESP-NOW) and uses 1 Mbps TTL communication to the motors, the input delay is virtually unnoticeable.

Below is the calculated one-way latency from the Python Web App generating a path, to the physical motor starting its movement:

### Step 1: Raspberry Pi ➡️ Transmitter ESP32 (USB Serial)
* **Baud Rate:** 115,200 bps
* **Data Payload:** ~80 bytes for 10 motor coordinates (640 bits)
* **Calculation:** (640 / 115,200) + ~1ms Linux USB overhead
* **Delay:** **~6.5 ms**

### Step 2: Transmitter ➡️ Receiver (ESP-NOW Wireless)
* **Protocol:** 2.4 GHz direct Wi-Fi hardware layer (router-less)
* **Calculation:** ESP-NOW bypasses the standard TCP/IP stack for ultra-low latency.
* **Delay:** **~1.5 ms**

### Step 3: Receiver ESP32 Processing
* **Hardware:** 240 MHz Dual-Core Processor
* **Tasks:** Parsing the CSV string, updating the OLED, updating WS2812 LEDs.
* **Calculation:** WS2812 protocol requires ~0.11 ms for 2 pixels. String parsing takes microseconds.
* **Delay:** **~0.2 ms**

### Step 4: Receiver ➡️ Servos (Physical Serial1)
* **Baud Rate:** 1,000,000 bps (1 Mbps)
* **Data Payload:** 10 individual `WritePosEx` packets (~15 bytes each = 1500 bits)
* **Calculation:** (1500 / 1,000,000) + ~0.5ms inter-packet spacing
* **Delay:** **~2.0 ms**

### Total Pipeline Latency: ~10.2 Milliseconds
A one-way delay of **10.2 ms** means the snake is physically executing movements faster than a standard 60Hz video game monitor can draw a single frame (16.6 ms). This guarantees perfectly smooth, fluid biological motion without stuttering or input lag.
