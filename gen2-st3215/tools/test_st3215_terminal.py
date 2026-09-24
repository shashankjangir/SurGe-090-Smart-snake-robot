import time
import argparse
from src.st3215_interface import ST3215Interface

def main():
    parser = argparse.ArgumentParser(description="ST3215 Servo Live Terminal Tester")
    parser.add_argument('--port', type=str, default='COM3', help='COM port of the ESP32 (e.g. COM3)')
    args = parser.parse_args()

    print(f"Connecting to ESP32 on {args.port}...")
    iface = ST3215Interface(num_motors=2, port=args.port)
    success, msg = iface.connect()
    
    if not success:
        print(f"Error: {msg}")
        print("Please check your COM port and ensure no other program (like Arduino IDE) is using it.")
        return

    print("Connected successfully!")
    print("\n--- ST3215 Live Terminal ---")
    print("Commands:")
    print("  p <id> <position>   -> Move servo <id> to <position> (0-4095, center is 2047)")
    print("  c                   -> Center both servos (ID 1 & 2 to 2047)")
    print("  t                   -> Read telemetry (Load, Speed, Position)")
    print("  q                   -> Quit")
    print("----------------------------")

    try:
        while True:
            cmd = input("\nEnter command: ").strip().lower()
            
            if cmd == 'q' or cmd == 'quit' or cmd == 'exit':
                print("Exiting...")
                break
                
            elif cmd == 'c':
                print("Centering servos 1 and 2...")
                iface.write_positions({1: 2047, 2: 2047})
                
            elif cmd == 't':
                print("Fetching telemetry...")
                data = iface.read_telemetry()
                for dxl_id in [1, 2]:
                    if dxl_id in data:
                        motor = data[dxl_id]
                        print(f"  ID {dxl_id} -> Pos: {motor['position']}, Speed: {motor['velocity']}, Load: {motor['load']}")
            
            elif cmd.startswith('i '):
                parts = cmd.split()
                try:
                    new_id = int(parts[1])
                    iface.serial_port.write(f"I,{new_id}\n".encode('utf-8'))
                    print(f"Sent command to change servo ID to {new_id}. Check the OLED screen!")
                except:
                    print("Invalid format. Use: i <new_id>")
                        
            elif cmd.startswith('p '):
                parts = cmd.split()
                if len(parts) == 3:
                    try:
                        motor_id = int(parts[1])
                        pos = int(parts[2])
                        if 0 <= pos <= 4095:
                            iface.write_positions({motor_id: pos})
                            print(f"Command sent to ID {motor_id}: Position {pos}")
                        else:
                            print("Position must be between 0 and 4095.")
                    except ValueError:
                        print("Invalid numbers provided.")
                else:
                    print("Usage: p <id> <position> (e.g. p 1 2047)")
                    
            else:
                print("Unknown command.")
                
    except KeyboardInterrupt:
        print("\nInterrupted by user.")
    finally:
        iface.disconnect()
        print("Disconnected.")

if __name__ == "__main__":
    main()
