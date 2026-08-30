# SURGE-SNAKE Wiring & Circuit Diagram

This document contains the exact wiring instructions and a visual flowchart showing how power and data travel through your robot.

## 1. Visual Flowchart
*If your markdown viewer supports Mermaid, this will render as a visual flowchart. Otherwise, follow the text-based connections below.*

```mermaid
graph TD
    subgraph Power Source (Mains)
        Wall[Wall Outlet AC] -->|AC Input| PS[5V 10A Power Supply]
        PS -->|Red Wire / V+| PHB_V[U2D2 PHB Terminal: +]
        PS -->|Black Wire / V-| PHB_G[U2D2 PHB Terminal: -]
    end

    subgraph Computing Brain
        PiPS[Official USB-C Pi Adapter] -->|5V 3A Power| PI[Raspberry Pi 4]
        PI <-->|Data: USB A to Micro USB| U2D2[U2D2 USB Interface]
    end

    subgraph Motor Network (Daisy Chain)
        U2D2 -->|Plugs Directly On Top| PHB[U2D2 PHB Power Hub]
        PHB_V --> PHB
        PHB_G --> PHB
        
        PHB <-->|X3P Robot Cable| M1[Dynamixel XL330 Motor 1]
        M1 <-->|X3P Robot Cable| M2[Dynamixel XL330 Motor 2]
        M2 <-.->|X3P Robot Cable| M10[Dynamixel XL330 Motor 10]
    end
    
    subgraph Future Head Sensors
        PI -.->|Bluetooth / WiFi Data| ESP[ESP32 Microcontroller]
        ESP <-->|Jumper Wires| SEN[HC-SR04 / VL53L0X Sensor]
    end

    style PS fill:#f9d0c4,stroke:#333,stroke-width:2px
    style PI fill:#c4e3f9,stroke:#333,stroke-width:2px
    style PHB fill:#d4f9c4,stroke:#333,stroke-width:2px
    style M1 fill:#fff2cc,stroke:#333
    style M2 fill:#fff2cc,stroke:#333
    style M10 fill:#fff2cc,stroke:#333
```

---

## 2. Step-by-Step Exact Wiring Instructions

### Step 1: Powering the Pi
1. Plug the **Official Raspberry Pi USB-C Power Adapter** into the wall.
2. Plug the USB-C end into the **Raspberry Pi 4**.
   - *Safety Note: NEVER try to power the Pi from the U2D2 or the 10A power supply. Always keep its power isolated via the official adapter to prevent blowing the Pi's fuses.*

### Step 2: The Motor Power Supply
1. Take your **5V 10A Power Supply**. Wire its AC input terminals (L, N, G) to a standard wall plug cable.
2. Take two thick wires (18 AWG recommended). 
3. Connect one wire to the **V+** terminal on the power supply, and the other to the **V- (or COM)** terminal.
4. On the **U2D2 PHB Power Hub Board**, locate the 2-pin screw terminal block.
5. Screw the **V+** wire into the **+** slot on the PHB.
6. Screw the **V-** wire into the **-** slot on the PHB.

### Step 3: The Data Bridge
1. The **U2D2 USB Interface** is a small stick. It physically mounts onto the pins of the **U2D2 PHB Power Hub Board**. Press it down firmly so the pins mate.
2. Use a Micro-USB to USB-A cable. Plug the Micro end into the **U2D2 USB Interface**, and plug the USB-A end into any USB 3.0 (blue) port on the **Raspberry Pi 4**.
   - *This provides the data link between the Pi's Python script and the motors.*

### Step 4: The Daisy Chain (Motors)
1. The XL330 motors have two identical ports on the back.
2. Take a **Robot Cable X3P**. Plug one end into any 3-pin TTL port on the **U2D2 PHB Power Hub Board**.
3. Plug the other end into either port on **Motor 1**.
4. Take a second **Robot Cable X3P**. Plug it into the remaining port on **Motor 1**.
5. Plug the other end into **Motor 2**.
6. Repeat this process for all remaining motors. Because the ports are identical, it does not matter which of the two ports on the motor is "in" or "out".

### Step 5: Setting Motor IDs (Crucial!)
Out of the box, all Dynamixel motors have an ID of `1`. If you daisy-chain them immediately, the code will fail because it cannot distinguish between them.
1. Plug in **only ONE motor** to the U2D2 PHB.
2. Use the **Dynamixel Wizard 2.0** software on your Windows PC to change its ID to `1`.
3. Unplug it. Plug in the next motor. Change its ID to `2`.
4. Repeat until you have motors 1 through 10. *Only then* can you daisy chain them all together at once!
