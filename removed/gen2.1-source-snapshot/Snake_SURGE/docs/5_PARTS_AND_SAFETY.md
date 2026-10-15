# SURGE-SNAKE Parts and Safety Protocol

## Parts Ordered (Existing Inventory)
1. **SD card (32GB A1 class 10)** - For Raspberry Pi OS.
2. **Raspberry Pi 4 Model B (4GB RAM)** - Main compute brain.
3. **Power Adapter (USB-C 5V 3A)** - Dedicated power for the Raspberry Pi.
4. **Raspberry Pi Heat Sink (Double Fans)** - Cooling for Pi.
5. **ST3215 Waveshare (x2)** - Smart servos for the joints (currently 2 for testing).
6. **Serial Bus Servo Driver USB Interface** - Translates USB to TTL half-duplex for the ST3215 servos.
7. **Serial Bus Servo Driver PHB Power Hub Board** - Distributes power and signals to the daisy-chained ST3215 servos.
8. **Robot Cable X3P 180mm** - TTL cables to connect motors.
9. **Power Supply (5V 10A - 50W)** - Power source for the ST3215 Waveshare network.
10. **ESP32 (38 pin WiFi + Bluetooth)** - Sensor node/secondary controller.

## Missing Parts (To Be Ordered)
Based on the plan for a 10-motor serpentine robot:

1. **Additional ST3215 Waveshare (x8):** To complete the 10-motor setup (5 pitch, 5 yaw).
2. **ST3215 Waveshare X3P Cables (x8):** Need more cables to daisy-chain the new motors.
3. **Mechanical Brackets / Frame:**
   - 3D Printed custom links OR BIOLOID frame components to mechanically connect the motors in alternating Pitch/Yaw configurations.
4. **Friction Pads (CRITICAL):**
   - TPU feet, rubber pads, or passive wheels (that only roll forward/back) attached to the underside of the snake. *Required for Friction Anisotropy so the snake pushes forward instead of wriggling in place.*
5. **Front Obstacle Sensor:** 
   - 1x **HC-SR04** (Ultrasonic) or **VL53L0X** (Time-of-Flight) module to attach to the ESP32 for head-on obstacle detection.
5. **Miscellaneous Wiring:** 
   - Jumper wires to connect ESP32 and sensors.
   - 18 AWG wires to connect the 5V 10A Power Supply to the Serial Bus Servo Driver PHB Terminal block.

---

## ⚡ Safety Protocols & Voltage Limits ⚡

> [!CAUTION]
> **CRITICAL: NEVER exceed 6.0V on the ST3215 Waveshare network!**

### 1. Motor Power Line (5V System)
- **Component Limit:** ST3215 Waveshare operates safely between **3.7V and 6.0V**.
- **Current Setup:** You are using a 5V 10A power supply. This is **PERFECT** and very safe. The Serial Bus Servo Driver PHB simply passes the input voltage directly to the motors.
- **Safety Rule:** Ensure the polarity (+ and -) from the 5V power supply to the Serial Bus Servo Driver PHB terminal block is correct. Reversing the polarity will permanently damage the Serial Bus Servo Driver PHB and the motors.

### 2. Microcontroller Power Limits
- **Raspberry Pi 4:** Must be powered via its official 5V 3A USB-C adapter. Do not back-power it from the Serial Bus Servo Driver PHB. Keep the logic connections (USB from Pi to Serial Bus Servo Driver) isolated from the motor power supply.
- **ESP32:** Can be powered via USB (5V) or via its VIN/VCC pin (5V). Its GPIO pins are **3.3V logic ONLY**. Do not connect a 5V sensor output directly to an ESP32 GPIO pin without a logic level shifter or a voltage divider.

### 3. Untethered / Battery Operation (Future Upgrade)
If you decide to make the snake wireless, you cannot plug a 2S LiPo battery (7.4V - 8.4V) directly into the Serial Bus Servo Driver PHB, as it will fry the 6.0V limit ST3215 motors.
- **Required Safety Barrier:** You will need a **5V Buck Converter (Step-Down Module)** rated for at least 10 Amps to sit between the LiPo battery and the Serial Bus Servo Driver PHB.

### 4. Overcurrent & Stall Safety
The Python code includes software safety limits to prevent motors from burning out if the snake gets stuck on an obstacle:
- We read the `Present_Current` of each ST3215 Waveshare. 
- If the current exceeds a set threshold (e.g., indicating a stall or collision), the robot will automatically halt and execute an avoidance maneuver.
