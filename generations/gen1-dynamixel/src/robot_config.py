import math


class DynamixelAddr:
    """
    Control Table addresses for ROBOTIS Dynamixel XL330-M288-T (Protocol 2.0).
    Centralised here so all scripts import from one place — changing hardware
    (e.g. XC330) only requires edits in this file.
    """
    TORQUE_ENABLE    = 64   # 1 byte  — 0: disable, 1: enable
    GOAL_POSITION    = 116  # 4 bytes — target encoder count (0–4095)
    PRESENT_CURRENT  = 126  # 2 bytes — unsigned, unit: 1 mA (sign-convert with to_signed_current)
    PRESENT_VELOCITY = 128  # 4 bytes — signed, unit: 0.229 rpm
    PRESENT_POSITION = 132  # 4 bytes — unsigned encoder count (0–4095)


class Config:
    # ---------------------------
    # Physical Robot Parameters
    # ---------------------------
    NUM_JOINTS = 10         # Fixed: must match the 10-motor daisy chain in main.py
    LINK_LENGTH_M = 0.076   # 76 mm per segment
    MODULE_MASS_KG = 0.2    # 0.2 kg per module

    # ---------------------------
    # Hardware Limits
    # ---------------------------
    # XL330-M288-T stall torque is 0.52 Nm @ 5V (per ROBOTIS datasheet)
    MAX_TORQUE_NM = 0.52
    MAX_ANGLE_RAD = math.pi / 2   # ±90 degrees joint limit

    # XL330 encoder range: 0 – 4095, center at 2048
    ENCODER_MIN    = 0
    ENCODER_MAX    = 4095
    ENCODER_CENTER = 2048

    # ---------------------------
    # Communication
    # ---------------------------
    BAUDRATE         = 57600
    PROTOCOL_VERSION = 2.0

    # ---------------------------
    # Bellows Gait Model Parameters
    # ---------------------------
    K_0   = 0.5             # Curvature amplitude
    K_S   = 1.0             # Spatial frequency (rad/m)
    K_T   = 2.0             # Temporal frequency — controls slither speed
    PSI_D = 0.0             # Dorsal phase offset
    PSI_L = math.pi / 2    # Lateral phase offset

    # ---------------------------
    # Control Loop
    # ---------------------------
    CONTROL_HZ = 50
    DT = 1.0 / CONTROL_HZ

    # ---------------------------
    # PD Position + P Velocity Gains
    # tau = P_POS*e_pos - D_POS*vel + P_VEL*e_vel
    # ---------------------------
    P_POS = 2.5
    D_POS = 0.1
    P_VEL = 0.5

    # ---------------------------
    # Shape Modification Module
    # (compliance when pressing against walls)
    # ---------------------------
    MU_MAX              = 1.0
    MU_MIN              = 0.1
    POS_ERROR_THRESHOLD = 0.3   # radians — above this, compliance kicks in

    # ---------------------------
    # Curve Radius Modification Module
    # ---------------------------
    K_RADIUS = 0.5   # Scaling factor for radius-deviation torque reduction

    # ---------------------------
    # Obstacle Avoidance
    # ---------------------------
    # Current threshold above which a motor is considered stalled against an obstacle.
    # XL330 free-run current is ~70 mA; 350 mA provides comfortable headroom.
    OBSTACLE_CURRENT_THRESHOLD_MA = 350
    EVASION_REVERSE_DURATION_S    = 2.5   # seconds to slither in reverse
    EVASION_TURN_DURATION_S       = 4.0   # seconds to slither in turning mode
