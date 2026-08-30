# Snake Robot Starter Kit Manual (Dynamixel Edition)

Welcome to the Starter Kit for the self-adaptive snake robot project! This manual focuses on testing individual motor movement, reading current (load) feedback, and testing the `dynamixel_sdk` using Python.

By the end of this guide, you will have your first Dynamixel XL330 motor spinning and reporting its load back to your computer.

---

## 1. Hardware Requirements for Testing

To begin testing, you need the following connected to your computer:
1. **Dynamixel XL330-M288 Motor** (At least 1 unit, though you can daisy chain 2 for this test)
2. **Robotis U2D2** (USB to TTL interface)
3. **U2D2 Power Hub Board (PHB)** (To inject power into the data line)
4. **5V Power Supply** (e.g., Mean Well SMPS or a 5V bench power supply capable of at least 3A)
5. **Dynamixel X3P Cables** (To connect everything together)

---

## 2. Hardware Assembly

1. Connect the **U2D2** to your computer via USB.
2. Mount the **U2D2 Power Hub Board** onto the U2D2.
3. Wire the **5V Power Supply** to the screw terminals on the Power Hub Board. Make sure the polarity (+ and -) is correct.
4. Plug one end of the **X3P Cable** into the Power Hub Board, and the other end into your **Dynamixel XL330** motor.
5. Turn on the 5V power supply. The LED on the back of the Dynamixel motor should flash red once to indicate it has power.

---

## 3. Software Setup (Python)

We are using Python to control the snake robot, relying on the official `dynamixel_sdk`.

### Step 3.1: Identify the COM Port
- **Windows:** Open Device Manager, look under "Ports (COM & LPT)" and find the "USB Serial Port". Note the number (e.g., `COM3`).
- **Linux/Raspberry Pi:** Open a terminal and run `ls /dev/ttyUSB*`. It will usually be `/dev/ttyUSB0`.

### Step 3.2: Install Requirements
Open a terminal in the root of the `SURGE-SNAKE` project and install the dependencies:
```bash
pip install -r requirements.txt
```
*(This installs `dynamixel-sdk` and other necessary libraries).*

---

## 4. Running the Feedback Test

To ensure everything is working and to calibrate your obstacle avoidance thresholds, run the motor feedback test script.

1. Open `tests/test_motor_feedback.py` in your code editor.
2. Verify the configuration at the top of the file:
   - Make sure `DXL_ID = 1` matches your motor's ID (brand new motors default to ID 1).
   - Ensure `DEVICENAME` is set to your COM port (e.g., `'COM3'`).
3. Run the script:
   ```bash
   python tests/test_motor_feedback.py
   ```

### What to Expect:
- The motor will enable its torque and stiffen up, holding its center position.
- Your terminal will print a continuous stream of Position, Velocity, and Current (mA).
- **The Obstacle Test:** Gently try to force the motor horn to rotate with your fingers. You will see the `Current (mA)` value spike up on your screen. This spike is exactly what the `ObstacleAvoidance` script in `main.py` looks for to detect collisions!

---

## 5. Next Steps

Once the feedback test is successful, you can connect all **10 motors** in a daisy chain. 
*(Note: You will need to use the Dynamixel Wizard 2.0 software to change each motor's ID from 1 to 10 so they don't conflict on the network).*

After setting the IDs, you are ready to run `python main.py` and watch the snake slither!
