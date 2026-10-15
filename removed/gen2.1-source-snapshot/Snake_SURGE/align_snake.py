import time
import sys
import serial.tools.list_ports
import platform
from src.st3215_interface import ST3215Interface

def main():
    print("="*50)
    print(" Snake SURGE - 3D Center Alignment Tool")
    print("="*50)
    
    # 1. Auto-detect COM port (Transmitter or Receiver)
    default_port = 'COM12' if platform.system() == 'Windows' else '/dev/ttyUSB0'
    for p in serial.tools.list_ports.comports():
        if 'AMA' not in p.device and 'Bluetooth' not in p.description:
            default_port = p.device
            break
            
    print(f"Connecting to ESP32 on port {default_port}...")
    iface = ST3215Interface(num_motors=10, port=default_port)
    success, msg = iface.connect()
    
    if not success:
        print(f"Failed to connect: {msg}")
        sys.exit(1)
        
    print("Connected successfully.")
    print("\nSending SLOW alignment command to center all motors...")
    print("The snake should gently uncurl into a straight line.")
    
    # Center position is 2048 for all ST3215 servos.
    # Because 2048 is the absolute center of the servo horn, this works perfectly 
    # to straighten out the snake regardless of if a motor is mounted as Pitch or Yaw, 
    # or if its mounting is inverted.
    center_pos = {i: 2048 for i in range(1, 11)}
    
    # Send the command repeatedly for a few seconds to ensure it gets there slowly
    # speed=400 is very slow and gentle
    try:
        for _ in range(100):
            iface.write_positions(center_pos, speed=400)
            time.sleep(0.05)
            
        print("\nAlignment complete. You can now safely power it off or run other scripts.")
        
    except KeyboardInterrupt:
        print("\nAlignment interrupted.")
    finally:
        iface.disconnect()

if __name__ == "__main__":
    main()
