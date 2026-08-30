import math
import os
import sys


class St3215Addr:
    """
    EEPROM / SRAM control table for Waveshare ST3215 (Feetech SMS/STS).

    Addresses are byte offsets. Multi-byte fields are little-endian.
    VIN on the Waveshare driver is passed straight to this bus — keep it
    inside 6.0–12.6 V (3S LiPo charged = 12.6 V max).
    """

    ID = 5  # 1 byte  EEPROM
    BAUD_RATE = 6  # 1 byte  EEPROM
    MIN_ANGLE_LIMIT = 9  # 2 bytes EEPROM
    MAX_ANGLE_LIMIT = 11  # 2 bytes EEPROM
    TORQUE_ENABLE = 40  # 1 byte  SRAM  0=off, 1=on
    ACC = 41  # 1 byte  SRAM
    GOAL_POSITION = 42  # 2 bytes SRAM
    GOAL_TIME = 44  # 2 bytes SRAM
    GOAL_SPEED = 46  # 2 bytes SRAM
    LOCK = 55  # 1 byte  EEPROM  0=unlock, 1=lock
    PRESENT_POSITION = 56  # 2 bytes SRAM
    PRESENT_SPEED = 58  # 2 bytes SRAM
    PRESENT_LOAD = 60  # 2 bytes SRAM
    PRESENT_VOLTAGE = 62  # 1 byte  SRAM  unit 0.1 V
    PRESENT_TEMPERATURE = 63  # 1 byte  SRAM  °C
    MOVING = 66  # 1 byte  SRAM
    PRESENT_CURRENT = 69  # 2 bytes SRAM  bit15=sign, unit 6.5 mA


class Config:
    # ---------------------------
    # Physical robot
    # ---------------------------
    NUM_JOINTS = 10
    LINK_LENGTH_M = 0.058  # v6 segment pitch (58 mm)
    MODULE_MASS_KG = 0.25

    # Planar ST3215 chain: every joint is yaw (shaft along Z).
    # Gen-1 alternating pitch/yaw is not used on this body.
    PLANAR_ALL_YAW = True

    # ---------------------------
    # ST3215 limits
    # ---------------------------
    MAX_TORQUE_NM = 2.94  # 30 kg·cm @ 12 V
    MAX_ANGLE_RAD = math.pi / 2
    STALL_CURRENT_MA = 2700
    NO_LOAD_CURRENT_MA = 200
    CURRENT_UNIT_MA = 6.5  # Feetech present-current LSB
    VIN_MIN_V = 6.0
    VIN_MAX_V = 12.6

    ENCODER_MIN = 0
    ENCODER_MAX = 4095
    ENCODER_CENTER = 2048  # 12-bit magnetic encoder, same span as XL330

    # ---------------------------
    # Servo bus (Waveshare driver ESP32 UART1)
    # ---------------------------
    BAUDRATE = 1_000_000
    PROTOCOL = "feetech-sts"
    BROADCAST_ID = 0xFE
    SERVO_RX_GPIO = 18  # Waveshare Servo Driver with ESP32 default
    SERVO_TX_GPIO = 19

    # ---------------------------
    # Gait (was buried in SnakeKinematics instance attrs)
    # ---------------------------
    GAIT_AMPLITUDE = 400  # encoder ticks (~35°)
    GAIT_FREQUENCY = 3.0  # rad/s of the travelling wave
    GAIT_PHASE_SHIFT = 1.2  # rad per joint index
    GAIT_TURN_OFFSET = 300  # ticks of uniform yaw bias while turning
    GOAL_SPEED = 2400  # STS speed units; caps slam on first move
    GOAL_ACC = 50

    # ---------------------------
    # Bellows model (optional; not the live gait)
    # ---------------------------
    K_0 = 0.5
    K_S = 1.0
    K_T = 2.0
    PSI_D = 0.0
    PSI_L = math.pi / 2

    # ---------------------------
    # Control loop
    # ---------------------------
    CONTROL_HZ = 50
    DT = 1.0 / CONTROL_HZ

    P_POS = 2.5
    D_POS = 0.1
    P_VEL = 0.5

    MU_MAX = 1.0
    MU_MIN = 0.1
    POS_ERROR_THRESHOLD = 0.3
    K_RADIUS = 0.5

    # ---------------------------
    # Obstacle avoidance (current / load)
    # Calibrate on the bench: free-run ~200 mA, stall 2.7 A.
    # 1200 mA is a starting trip, not a measured value.
    # ---------------------------
    OBSTACLE_CURRENT_THRESHOLD_MA = 1200
    EVASION_REVERSE_DURATION_S = 2.5
    EVASION_TURN_DURATION_S = 4.0

    # ---------------------------
    # MPU6050 on robot ESP32
    # ---------------------------
    IMU_I2C_ADDR = 0x68
    IMU_SDA_GPIO = 21
    IMU_SCL_GPIO = 22

    # ---------------------------
    # ESP-NOW
    # ---------------------------
    ESPNOW_CHANNEL = 1
    USB_TELEMETRY_BAUD = 115200


def default_serial_port() -> str:
    """USB CDC of the Waveshare driver (bench) or a USB-TTL adapter."""
    env = os.environ.get("SURGE_PORT")
    if env:
        return env
    if sys.platform.startswith("win"):
        return "COM3"
    for candidate in ("/dev/ttyUSB0", "/dev/ttyACM0"):
        if os.path.exists(candidate):
            return candidate
    return "/dev/ttyUSB0"
