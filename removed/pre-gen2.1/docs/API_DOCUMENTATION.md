# Snake SURGE API Documentation

This guide provides templates and documentation for writing custom code to interact with the Snake SURGE. The communication protocol is identical whether you plug directly into the snake's receiver via USB, or plug into the ESP-NOW Transmitter.

## Communication Protocol
- **Baud Rate**: 115200
- **DTR/RTS**: Must be disabled (`False`) to prevent resetting the ESP32 boards on connection.

### Commands
All commands must be terminated with a newline character (`\n`).

#### 1. Set Motor Positions (`P`)
Move one or more motors to a specific position (0-4095).
- **Format**: `P,<id>:<pos>,<id>:<pos>,...`
- **Example**: `P,1:2048,2:3000` (Moves motor 1 to center, motor 2 to 3000)

#### 2. Request Telemetry (`T`)
Request real-time telemetry from all connected motors.
- **Format**: `T`
- **Response**: `T,1:<load>:<vel>:<pos>,2:<load>:<vel>:<pos>,...`

#### 3. Assign Motor ID (`I`)
Assign a new ID to a physically connected motor. **WARNING: Only one motor should be plugged in when using this command.**
- **Format**: `I,<new_id>`
- **Example**: `I,5` (Assigns the connected motor as ID 5)

---

## Python Template (PySerial)
Use this template to write custom Python scripts (e.g. for computer vision, AI, or procedural animation).

```python
import serial
import time

class SnakeController:
    def __init__(self, port='COM12'):
        # DTR/RTS must be disabled to avoid resetting the transmitter/receiver
        self.s = serial.Serial()
        self.s.port = port
        self.s.baudrate = 115200
        self.s.timeout = 1
        
        # Disable DTR/RTS BEFORE opening the port
        self.s.dtr = False
        self.s.rts = False
        self.s.open()
        
        time.sleep(1) # Wait for connection to stabilize
        print(f"Connected to Snake on {port}")

    def move_motors(self, positions_dict):
        """Pass a dictionary like {1: 2048, 2: 3000}"""
        parts = ["P"]
        for motor_id, pos in positions_dict.items():
            parts.append(f"{motor_id}:{pos}")
            
        command = ",".join(parts) + "\n"
        self.s.write(command.encode('utf-8'))

    def get_telemetry(self):
        """Returns raw telemetry string from the snake"""
        self.s.reset_input_buffer()
        self.s.write(b"T\n")
        return self.s.readline().decode('utf-8').strip()
        
    def close(self):
        self.s.close()

# --- Example Usage ---
if __name__ == "__main__":
    snake = SnakeController('COM12')
    
    # Move motors 1 and 2
    snake.move_motors({1: 2048, 2: 2500})
    time.sleep(0.5)
    
    # Read telemetry
    data = snake.get_telemetry()
    print("Telemetry:", data)
    
    snake.close()
```

---

## C++ / Arduino Template
If you want to control the Transmitter from another microcontroller (e.g. Arduino Uno, Teensy) over Hardware Serial instead of a PC.

```cpp
// Assuming Transmitter is connected to Serial1 (TX1, RX1)
void setup() {
  Serial.begin(115200);   // Debug to PC
  Serial1.begin(115200);  // Connection to Snake Transmitter
  delay(1000);
}

void moveMotors(int id1, int pos1, int id2, int pos2) {
  // Construct the command string
  String cmd = "P," + String(id1) + ":" + String(pos1) + "," + String(id2) + ":" + String(pos2);
  
  // Send to Transmitter
  Serial1.println(cmd);
}

void loop() {
  // Move to center
  moveMotors(1, 2048, 2, 2048);
  delay(1000);
  
  // Move to side
  moveMotors(1, 1500, 2, 2500);
  delay(1000);
  
  // Read telemetry if available
  Serial1.println("T");
  if (Serial1.available()) {
    String telemetry = Serial1.readStringUntil('\n');
    Serial.println("Telemetry: " + telemetry);
  }
}
```
