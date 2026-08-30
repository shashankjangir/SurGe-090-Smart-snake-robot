# SURGE-SNAKE Actuator Selection: ROBOTIS Dynamixel XL330

This document outlines the engineering rationale behind standardizing on the **ROBOTIS Dynamixel XL330-M288-T** smart servo motors for the SURGE-090 snake robot project.

---

## 1. Actuator Comparison

A comparison of candidate actuators was conducted to assess suitability for a 10-degree-of-freedom (10-DOF) bio-inspired snake robot:

| Parameter | TowerPro SG90 (Micro Servo) | Dynamixel AX-12A (Classic) | Dynamixel XL330-M288-T (Selected) |
| :--- | :--- | :--- | :--- |
| **Control Interface** | PWM (Open loop) | TTL Half-Duplex (1 Mbps) | **TTL Half-Duplex (115200 bps - 1 Mbps)** |
| **Feedback Sensors** | None | Position, Temperature, Load | **Contactless Absolute Encoder, Temp, Load, Current** |
| **Operating Voltage**| 4.8V - 6.0V | 9.0V - 12.0V | **3.7V - 6.0V (Standard 5.0V)** |
| **Stall Torque** | 0.18 Nm @ 5V | 1.50 Nm @ 12V | **0.52 Nm @ 5V** |
| **Weight** | 9 grams | 54 grams | **18 grams** |
| **Resolution** | N/A | 0.29° (10-bit potentiometer) | **0.088° (12-bit magnetic absolute encoder)** |
| **Daisy Chainable** | No (requires individual PWM lines) | Yes | **Yes** |

---

## 2. Selection Rationale

### A. Real-Time Proprioceptive Current Feedback (Critical)
The defining feature of the SURGE-090 control system is **sensorless tactile collision detection**. Traditional micro servos (like SG90) do not report operational current or load. The Dynamixel XL330 features an internal current sensor that is readable over the register map (`Present_Current` address `126`). 
By monitoring the motor current at 50 Hz, we can detect torque spikes (> 350 mA) corresponding to external obstacle resistance. This allows the robot to sense collisions across any part of its body without a single external tactile or force sensor.

### B. Weight and Scale Optimization
For snake robots, torque-to-weight ratio is crucial. 
*   **AX-12A** motors are too heavy (54g each, totaling 540g for 10 joints). This would require significantly larger structural linkages and higher torques just to lift the snake's own body.
*   **XL330** weighs only 18g (180g total for 10 joints), keeping the mechanical structure incredibly light and highly agile.

### C. Standard 5.0V Voltage Rail
Unlike the larger AX-12A or XM430 motors which require 12.0V, the XL330 is optimized for **5.0V operation**. 
*   Allows the use of a simple 5V SMPS or a standard 2S LiPo battery with a buck converter.
*   Significantly lowers the voltage hazards and weight of the battery pack.

### D. Single-Bus Daisy Chaining
Instead of running 10 separate PWM wires down the length of the snake (which would result in cable tangling, high friction, and restricted bending), the TTL bus allows a single 3-pin cable (X3P) to daisy-chain all 10 joints sequentially. The entire robot interfaces with the host computer (Raspberry Pi 4) via a single USB-to-TTL bridge (Robotis U2D2).

---

## 3. XL330-M288-T Technical Details

*   **Gear Ratio:** 288.4 : 1
*   **No-load Speed:** 39 rpm (at 5.0V)
*   **Stall Current:** 1.5 A
*   **Control Modes:** Current Control, Velocity Control, Position Control (0° - 360°), Extended Position Control (Multi-turn), Current-based Position Control, PWM Control.
*   **Communication Protocol:** Dynamixel Packet 2.0
