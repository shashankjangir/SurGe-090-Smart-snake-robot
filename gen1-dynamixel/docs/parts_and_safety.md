# SURGE-SNAKE Parts and Safety Protocol (Gen 1 / Dynamixel — HISTORICAL)

> [!IMPORTANT]
> **This document is a historical record of the Gen 1 XL330 build. It is not an inventory and not
> a safety protocol for the current robot.**
>
> - **None of the hardware listed below is still held** (confirmed 2026-08-24). The XL330 motors,
>   U2D2, PHB, X3P cables, and Raspberry Pi 4 are gone.
> - **The 6.0 V limit stated further down applies to the XL330 only.** The current Gen 2 robot runs
>   a **12 V** rail with ST3215 servos (6.0–12.6 V). Applying the 6 V rule to Gen 2 hardware is
>   wrong; applying the Gen 2 12 V rail to XL330 hardware would destroy it. Know which generation
>   is on your bench before following any voltage instruction in this file.
>
> **Current inventory and power rails:**
> [`gen2-st3215/docs/additional_parts_spreadsheet.md`](../../gen2-st3215/docs/additional_parts_spreadsheet.md)

## Parts Ordered (Gen 1, 2026 — no longer held)
1. **SD card (32GB A1 class 10)** - For Raspberry Pi OS.
2. **Raspberry Pi 4 Model B (4GB RAM)** - Main compute brain.
3. **Power Adapter (USB-C 5V 3A)** - Dedicated power for the Raspberry Pi.
4. **Raspberry Pi Heat Sink (Double Fans)** - Cooling for Pi.
5. **Dynamixel XL330-M288-T (x2)** - Smart servos for the joints (currently 2 for testing).
6. **U2D2 USB Interface** - Translates USB to TTL half-duplex for the Dynamixels.
7. **U2D2 PHB Power Hub Board** - Distributes power and signals to the daisy-chained Dynamixels.
8. **Robot Cable X3P 180mm** - TTL cables to connect motors.
9. **Power Supply (5V 10A - 50W)** - Power source for the Dynamixel network.
10. **ESP32 (38 pin WiFi + Bluetooth)** - Sensor node/secondary controller.

## Missing Parts (Gen 1 plan — superseded, never completed)

The eight additional XL330 motors below were **never obtainable in India**; this shortfall is what
ended Gen 1 and forced the ST3215 redesign. Retained to document the original 10-motor plan.

Based on the plan for a 10-motor serpentine robot:

1. **Additional Dynamixel XL330-M288-T (x8):** To complete the 10-motor setup (5 pitch, 5 yaw).
2. **Dynamixel X3P Cables (x8):** Need more cables to daisy-chain the new motors.
3. **Mechanical Brackets / Frame:**
   - 3D Printed custom links OR BIOLOID frame components to mechanically connect the motors in alternating Pitch/Yaw configurations.
4. **Friction Pads (CRITICAL):**
   - TPU feet, rubber pads, or passive wheels (that only roll forward/back) attached to the underside of the snake. *Required for Friction Anisotropy so the snake pushes forward instead of wriggling in place.*
5. **Front Obstacle Sensor:** 
   - 1x **HC-SR04** (Ultrasonic) or **VL53L0X** (Time-of-Flight) module to attach to the ESP32 for head-on obstacle detection.
5. **Miscellaneous Wiring:** 
   - Jumper wires to connect ESP32 and sensors.
   - 18 AWG wires to connect the 5V 10A Power Supply to the U2D2 PHB Terminal block.

---

## ⚡ Safety Protocols & Voltage Limits ⚡

> [!CAUTION]
> **CRITICAL — XL330 HARDWARE ONLY: NEVER exceed 6.0V on the Dynamixel XL330 network!**
> This rule does **not** apply to the Gen 2 ST3215 servos, which require a 9.0–12.6 V rail.

### 1. Motor Power Line (5V System)
- **Component Limit:** Dynamixel XL330-M288-T operates safely between **3.7V and 6.0V**.
- **Current Setup:** You are using a 5V 10A power supply. This is **PERFECT** and very safe. The U2D2 PHB simply passes the input voltage directly to the motors.
- **Safety Rule:** Ensure the polarity (+ and -) from the 5V power supply to the U2D2 PHB terminal block is correct. Reversing the polarity will permanently damage the U2D2 PHB and the motors.

### 2. Microcontroller Power Limits
- **Raspberry Pi 4:** Must be powered via its official 5V 3A USB-C adapter. Do not back-power it from the U2D2 PHB. Keep the logic connections (USB from Pi to U2D2) isolated from the motor power supply.
- **ESP32:** Can be powered via USB (5V) or via its VIN/VCC pin (5V). Its GPIO pins are **3.3V logic ONLY**. Do not connect a 5V sensor output directly to an ESP32 GPIO pin without a logic level shifter or a voltage divider.

### 3. Untethered / Battery Operation (Future Upgrade)
If you decide to make the snake wireless, you cannot plug a 2S LiPo battery (7.4V - 8.4V) directly into the U2D2 PHB, as it will fry the 6.0V limit XL330 motors.
- **Required Safety Barrier:** You will need a **5V Buck Converter (Step-Down Module)** rated for at least 10 Amps to sit between the LiPo battery and the U2D2 PHB.

### 4. Overcurrent & Stall Safety
The Python code includes software safety limits to prevent motors from burning out if the snake gets stuck on an obstacle:
- We read the `Present_Current` of each Dynamixel. 
- If the current exceeds a set threshold (e.g., indicating a stall or collision), the robot will automatically halt and execute an avoidance maneuver.
