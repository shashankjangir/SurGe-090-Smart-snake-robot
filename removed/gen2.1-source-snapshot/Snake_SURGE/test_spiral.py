import time
import math
import sys
import serial.tools.list_ports
import platform

# Import the interface from the existing codebase
from src.st3215_interface import ST3215Interface

def main():
    print("="*50)
    print(" Snake SURGE - Spiral Curl Test")
    print("="*50)
    
    # 1. Auto-detect COM port just like the main app does
    default_port = 'COM12' if platform.system() == 'Windows' else '/dev/ttyUSB0'
    for p in serial.tools.list_ports.comports():
        if 'AMA' not in p.device and 'Bluetooth' not in p.description:
            default_port = p.device
            break
            
    print(f"Connecting to ESP32 Bridge on port {default_port}...")
    
    # 2. Initialize Hardware Interface
    iface = ST3215Interface(num_motors=10, port=default_port)
    success, msg = iface.connect()
    
    if not success:
        print(f"Failed to connect: {msg}")
        sys.exit(1)
        
    print("Connected successfully. Starting spiral curl test.")
    print("Press Ctrl+C to stop.")
    
    try:
        # --- ALIGNMENT SEQUENCE ---
        print("Aligning all servos to center (straightening up slowly)...")
        center_pos = {i: 2048 for i in range(1, 11)}
        
        for step in range(200): # 200 ticks * 0.05s = 10 seconds max
            iface.write_positions(center_pos, speed=600)
            
            all_centered = all(iface.last_positions.get(i, 2048) == 2048 for i in range(1, 11))
            if all_centered and step > 10: 
                break
                
            time.sleep(0.05)
            
        print("Alignment complete! Starting spiral curl...")
        time.sleep(1)
        
        # --- SPIRAL PARAMETERS ---
        max_degrees = 45
        ticks_per_degree = 4096 / 360.0
        max_offset = int(max_degrees * ticks_per_degree) # Max curl at the tail
        
        curl_duration = 15.0 # Seconds to reach full curl
        start_time = time.time()
        
        while True:
            t = time.time() - start_time
            # Progress goes from 0.0 to 1.0
            progress = min(1.0, t / curl_duration)
            
            positions = {}
            for i in range(1, 11):
                # Head (i=1) curls up to max_degrees (87)
                # Tail (i=10) curls proportionally less
                target_offset = int(max_offset * ((11 - i) / 10.0))
                current_offset = int(target_offset * progress)
                
                positions[i] = 2048 + current_offset
                
            iface.write_positions(positions, speed=300)
            
            if progress < 1.0:
                print(f"Curling... {progress*100:.1f}%    ", end='\r')
            else:
                print("Spiral complete! Holding position...    ", end='\r')
                
            time.sleep(0.05)
            
    except KeyboardInterrupt:
        print("\nStopping test...")
    finally:
        print("\nUnfurling and centering motors before exit...")
        # Unfurl slowly before exit
        center_pos = {i: 2048 for i in range(1, 11)}
        
        # Send center command and wait a few seconds so it finishes
        for _ in range(60): # 3 seconds
            iface.write_positions(center_pos, speed=400)
            time.sleep(0.05)
            
        iface.disconnect()
        print("Hardware Shutdown Complete.")

if __name__ == "__main__":
    main()
