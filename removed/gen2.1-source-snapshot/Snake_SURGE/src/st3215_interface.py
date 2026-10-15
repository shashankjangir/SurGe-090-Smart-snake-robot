import serial
import time

class ST3215Interface:
    """
    Hardware interface for connecting to an ESP32 acting as a bridge to ST3215 servos.
    """
    def __init__(self, num_motors=10, port='COM3', baudrate=115200):
        self.num_motors = num_motors
        self.port_name = port
        self.baudrate = baudrate
        self.serial_port = None
        self.is_connected = False
        self.last_positions = {}
        self.max_speed_delta = 10  # Maximum position change per update (approx 200 units/sec at 20Hz). Lower = slower.
        
    def connect(self):
        """Opens serial port to the ESP32."""
        try:
            self.serial_port = serial.Serial(self.port_name, self.baudrate, timeout=1)
            time.sleep(2)  # Wait for ESP32 to reset upon serial connection
            self.is_connected = True
            self.last_positions = {} # Reset positions on connect
            return True, "Connected successfully"
        except Exception as e:
            return False, f"Failed to open port {self.port_name}: {e}"
            
    def disconnect(self):
        """Closes serial port."""
        if self.is_connected and self.serial_port:
            self.serial_port.close()
            self.is_connected = False
            
    def write_positions(self, positions_dict, speed=2400):
        """
        Sends target positions and speed to the ESP32 bridge.
        Format: P,1:2048:2400,2:2048:2400,...,10:2048:2400\n
        ST3215 uses 0-4095 for position (2047 is center).
        Speed is in ST3215 units (0-3999 typically, where higher is faster).
        """
        if not self.is_connected: return
        
        # Build command string
        parts = ["P"]
        for motor_id, target_pos in positions_dict.items():
            # Clamp target to ST3215 safe range 0-4095
            target_pos = max(0, min(4095, int(target_pos)))
            
            # Save position for reference
            self.last_positions[motor_id] = target_pos
            
            # Format: motor_id:target_pos:speed
            parts.append(f"{motor_id}:{target_pos}:{speed}")
            
        command = ",".join(parts) + "\n"
        self.serial_port.write(command.encode('utf-8'))
        
    def read_telemetry(self):
        """
        Requests and parses telemetry from the ESP32 bridge.
        Sends: T\n
        Expects: T,1:load:vel:pos,2:load:vel:pos...\n
        """
        telemetry = {}
        if not self.is_connected: return telemetry
        
        try:
            # Clear input buffer to get fresh telemetry
            self.serial_port.reset_input_buffer()
            self.serial_port.write(b"T\n")
            
            # Read line with timeout
            response = self.serial_port.readline().decode('utf-8').strip()
            
            if response.startswith("T,"):
                data_parts = response[2:].split(',')
                for part in data_parts:
                    vals = part.split(':')
                    if len(vals) == 4:
                        motor_id = int(vals[0])
                        load = int(vals[1])
                        vel = int(vals[2])
                        pos = int(vals[3])
                        telemetry[motor_id] = {'load': load, 'velocity': vel, 'position': pos}
        except Exception as e:
            pass # Ignore read timeouts to keep UI smooth
            
        # Ensure all motors have at least default telemetry so UI doesn't break if a packet drops
        for motor_id in range(1, self.num_motors + 1):
            if motor_id not in telemetry:
                telemetry[motor_id] = {'load': 0, 'velocity': 0, 'position': 2048}
                
        return telemetry
