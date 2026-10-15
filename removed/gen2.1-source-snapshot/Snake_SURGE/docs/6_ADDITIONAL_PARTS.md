# SURGE-SNAKE Additional Parts Spreadsheet

This document outlines everything else you need to complete the SURGE-SNAKE robot, explicitly **excluding the motors**. The items are separated into expensive structural/power upgrades and standard electronic components.

## 🔴 Expensive / Major Components
*These components represent the bulk of the remaining non-motor budget, primarily focusing on the mechanical structure and untethering the robot from the wall.*

| Component Name | Detailed Specifications | QTY | Est. Price (₹) | Trusted Product Link |
| :--- | :--- | :---: | :---: | :--- |
| **Robot Cable-X3P 180mm** | 3-pin JST TTL cables for ST3215 Waveshare X-Series. (Usually sold in packs of 10). You need these to daisy chain the remaining 8 joints. | 1 Pack | 2,659 | [MG Super Labs](https://www.mgsuperlabs.co.in/estore/Robot-Cable-X3P-180mm-10pcs) |
| **3D Printer Filament (PLA+)** | 1kg Spool, 1.75mm. Required to 3D print the custom U-brackets that connect the motors in the alternating pitch/yaw format. | 1 | 1,400 | [Robocraze (eSUN PLA+)](https://robocraze.com/products/esun-pla-pro-filament) |

---

## 🟢 Standard Components & Sensors
*These are the cheaper, everyday electronic components required for sensing, wiring, and friction.*

| Component Name | Detailed Specifications | QTY | Est. Price (₹) | Trusted Product Link |
| :--- | :--- | :---: | :---: | :--- |
| **High-Discharge 2S LiPo Battery** | 7.4V, ~2200mAh, 30C+ discharge rate. (Only needed if you want the snake to be completely wireless). | 1 | 1,200 | [Robocraze (Orange LiPo)](https://robocraze.com/collections/lipo-battery) |
| **VL53L0X Laser ToF Sensor** | High-precision Time-of-Flight laser ranging sensor for the head of the snake. Better accuracy than Ultrasonic. | 1 | 450 | [Robocraze (VL53L0X)](https://robocraze.com/products/gy-53-vl53l0x-laser-tof-flight-time-range-sensor-module) |
| **HC-SR04 Ultrasonic Sensor** | *Alternative to VL53L0X.* Cheaper, bulkier acoustic distance sensor. | 1 | 85 | [Robocraze (HC-SR04)](https://robocraze.com/products/ultrasonic-sensor-hc-sr04) |
| **5V 10A DC-DC Buck Converter** | Step-down module. **CRITICAL** if you buy the 7.4V LiPo battery. It drops the 7.4V down to the safe 5.0V needed for the ST3215 motors. | 1 | 600 | [ElectronicsComp / Robocraze](https://robocraze.com/collections/step-down-buck-converter) |
| **Logic Level Shifter** | 4-channel bi-directional (3.3V to 5V). Protects the ESP32's 3.3V pins if you use a 5V sensor. | 1 | 60 | [Robocraze (Level Shifter)](https://robocraze.com/products/4-channel-iic-i2c-logic-level-converter) |
| **Jumper Wires (M-F & F-F)** | 40-pin ribbon cables (Dupont). Needed to wire the front sensor to the ESP32. | 1 Set | 120 | [Robocraze (Jumper Wires)](https://robocraze.com/products/jumper-wires-male-to-female-40-pcs) |
| **18 AWG Silicone Wire** | 1 Meter Red, 1 Meter Black. Thick wire to connect the 5V 10A Power Supply to the Serial Bus Servo Driver PHB Terminal Block safely. | 1 | 150 | [Robocraze (Silicone Wire)](https://robocraze.com) |
| **TPU Filament OR Rubber Pads** | **CRITICAL for Locomotion.** Anti-slip rubber adhesive pads (or 3D printed TPU feet) for the underside of the brackets to provide Friction Anisotropy. | 1 Pack | 200 | [Amazon India (Rubber Pads)](https://www.amazon.in) |

---

### Usage Notes:
1. **Friction Pads:** You can simply buy a sheet of adhesive 3M rubber anti-slip pads from Amazon or a local hardware store and cut them into strips for the belly of the snake. You do not need to 3D print these if you don't have TPU filament.
2. **LiPo Battery:** If you stick to using the tethered 5V 10A power supply you already ordered, you can completely ignore the LiPo Battery and the 5V Buck Converter.
3. **Cables:** Ensure the ST3215 Waveshare cables you buy are exactly **X3P** (JST connectors), as older Bioloid AX-12 cables will not fit the ST3215.
