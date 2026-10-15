import time
import math
import sys
import serial.tools.list_ports
import platform

from src.st3215_interface import ST3215Interface

def main():
    print("="*50)
    print(" Snake SURGE - 3D Snake Basic Movement")
    print("="*50)
    
    # 1. Auto-detect COM port
    default_port = 'COM12' if platform.system() == 'Windows' else '/dev/ttyUSB0'
    for p in serial.tools.list_ports.comports():
        if 'AMA' not in p.device and 'Bluetooth' not in p.description:
            default_port = p.device
            break
            
    print(f"Connecting to ESP32 Bridge on port {default_port}...")
    iface = ST3215Interface(num_motors=10, port=default_port)
    success, msg = iface.connect()
    
    if not success:
        print(f"Failed to connect: {msg}")
        sys.exit(1)
        
    print("Connected successfully.")
    
    try:
        # --- ALIGNMENT SEQUENCE ---
        print("Aligning all servos to center (straightening up slowly)...")
        center_pos = {i: 2048 for i in range(1, 11)}
        
        for step in range(200):
            iface.write_positions(center_pos, speed=600)
            all_centered = all(iface.last_positions.get(i, 2048) == 2048 for i in range(1, 11))
            if all_centered and step > 10: 
                break
            time.sleep(0.05)
            
        print("Alignment complete! Starting 3D movement...")
        time.sleep(1)
        
        start_time = time.time()
        
        # --- 3D TEST PARAMETERS ---
        # The snake is now 3D (alternating Yaw and Pitch joints)
        amplitude_yaw = 900     # Horizontal sweep
        amplitude_pitch = 700   # Vertical lifting motion (crucial for wheel-less movement)
        frequency = 0.6         # Wave speed
        phase_offset = 1.57     # Exactly pi/2 (creates one perfectly balanced full wave across 5 segments)
        sine_wave_speed = 1500
        
        while True:
            t = time.time() - start_time
            positions = {}
            
            for i in range(1, 11):
                # Calculate if this motor is Yaw (Odd) or Pitch (Even)
                is_yaw = (i % 2 != 0)
                
                # Each "segment" of the snake consists of 2 motors (Yaw + Pitch).
                # Segment index: 0 (motors 1,2), 1 (motors 3,4), 2 (motors 5,6), 3 (motors 7,8), 4 (motors 9,10)
                segment_index = (i - 1) // 2
                
                # "no two alternate servos have same rotation direction"
                # This means Yaw segment 0 rotates normally, Yaw segment 1 is inverted, Yaw segment 2 is normal, etc.
                direction_mult = 1 if segment_index % 2 == 0 else -1
                
                if is_yaw:
                    # Apply horizontal wave (Yaw)
                    sine_val = math.sin(2 * math.pi * frequency * t - (segment_index * phase_offset))
                    pos = 2048 + int(amplitude_yaw * sine_val * direction_mult)
                else:
                    # Apply vertical wave (Pitch)
                    # We add a small phase shift (pi/2) to pitch relative to yaw to create a spiral/corkscrew if amplitude_pitch > 0
                    sine_val = math.sin(2 * math.pi * frequency * t - (segment_index * phase_offset) - (math.pi/2))
                    pos = 2048 + int(amplitude_pitch * sine_val * direction_mult)
                    
                positions[i] = pos
                
            iface.write_positions(positions, speed=sine_wave_speed)
            
            print(f"Time: {t:.1f}s | Sending 3D wave positions...    ", end='\r')
            time.sleep(0.05)
            
    except KeyboardInterrupt:
        print("\nStopping test...")
    finally:
        print("\nCentering motors before exit...")
        center_pos = {i: 2048 for i in range(1, 11)}
        iface.write_positions(center_pos)
        time.sleep(0.5)
        iface.disconnect()
        print("Hardware Shutdown Complete.")

if __name__ == "__main__":
    main()
