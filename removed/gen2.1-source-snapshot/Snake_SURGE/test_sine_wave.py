import time
import math
import sys
import serial.tools.list_ports
import platform

# Import the interface from the existing codebase
from src.st3215_interface import ST3215Interface

def main():
    print("="*50)
    print(" Snake SURGE - Slow Sine Wave Test")
    print("="*50)
    
    # 1. Auto-detect COM port just like the main app does
    default_port = 'COM12' if platform.system() == 'Windows' else '/dev/ttyUSB0'
    for p in serial.tools.list_ports.comports():
        if 'AMA' not in p.device and 'Bluetooth' not in p.description:
            default_port = p.device
            break
            
    print(f"Connecting to ESP32 Bridge on port {default_port}...")
    
    # 2. Initialize Hardware Interface
    # Since data is shared across all 10 daisy-chained servos, we only need 1 port.
    iface = ST3215Interface(num_motors=10, port=default_port)
    success, msg = iface.connect()
    
    if not success:
        print(f"Failed to connect: {msg}")
        sys.exit(1)
        
    print("Connected successfully. Starting slow sine wave test.")
    print("Press Ctrl+C to stop.")
    
    try:
        # --- ALIGNMENT SEQUENCE ---
        print("Aligning all servos to center (straightening up slowly)...")
        center_pos = {i: 2048 for i in range(1, 11)}
        
        # Send the center command with a very slow hardware speed (e.g., 600) so it doesn't violently curl
        for step in range(200): # 200 ticks * 0.05s = 10 seconds max
            iface.write_positions(center_pos, speed=600)
            
            # Check if all motors have reached 2048
            all_centered = all(iface.last_positions.get(i, 2048) == 2048 for i in range(1, 11))
            if all_centered and step > 10: 
                break
                
            time.sleep(0.05)
            
        print("Alignment complete! Starting sine wave...")
        time.sleep(1) # Brief pause before the wave starts
        
        start_time = time.time()
        
        # --- TEST PARAMETERS ---
        amplitude = 400       
        frequency = 0.4       
        phase_offset = 0.6    
        sine_wave_speed = 1500 # Medium speed for the sine wave motion
        
        while True:
            t = time.time() - start_time
            
            positions = {}
            for i in range(1, 11):
                sine_val = math.sin(2 * math.pi * frequency * t - (i * phase_offset))
                pos = 2048 + int(amplitude * sine_val)
                positions[i] = pos
                
            # Send positions with medium hardware speed
            iface.write_positions(positions, speed=sine_wave_speed)
            
            # We skip reading telemetry here to avoid serial timeouts that cause stuttering in the motion
            print(f"Time: {t:.1f}s | Sending sine wave positions...    ", end='\r')
            
            # Update at 20Hz
            time.sleep(0.05)
            
    except KeyboardInterrupt:
        print("\nStopping test...")
    finally:
        # Gracefully center all motors on exit so it doesn't stay twisted
        print("\nCentering motors before exit...")
        center_pos = {i: 2048 for i in range(1, 11)}
        iface.write_positions(center_pos)
        time.sleep(0.5)
        iface.disconnect()
        print("Hardware Shutdown Complete.")

if __name__ == "__main__":
    main()
