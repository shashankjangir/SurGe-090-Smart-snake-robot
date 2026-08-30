# SURGE-SNAKE ESP32 Sensor Node Wokwi Simulation

This directory contains the Wokwi simulation configuration and source code for the head-mounted distance sensor node.

## Hardware Configuration (`diagram.json`)

The simulation runs on an **ESP32 DevKit v4** connected to a **HC-SR04 Ultrasonic Distance Sensor**:
*   **VCC** -> ESP32 5V
*   **GND** -> ESP32 GND
*   **TRIG** -> ESP32 GPIO 5 (Output)
*   **ECHO** -> ESP32 GPIO 18 (Input)

## Firmware (`sketch.ino`)

The firmware:
1.  Triggers the HC-SR04 sensor at **10 Hz**.
2.  Reads the pulse-width echo response.
3.  Calculates the distance to any head-on obstacles in centimeters.
4.  Initializes the ESP32's Bluetooth stack and broadcasts as a Classic Bluetooth Serial device named `SURGE-SNAKE-ESP32`.
5.  Continuously transmits the data packet format `"DIST:<distance_cm>\r\n"` over Bluetooth Serial.

## How to Run the Wokwi Simulation

1.  Open [Wokwi.com](https://wokwi.com).
2.  Start a new ESP32 project.
3.  Replace the default `diagram.json`, `sketch.ino`, and `libraries.txt` with the files in this directory.
4.  Click the **Start Simulation** button in Wokwi.
5.  Observe the distance output printed in the virtual Serial Terminal. Drag the slider on the simulated HC-SR04 component to change the distance and see the outputs update dynamically.
