"""Shared conversions for Waveshare ST3215 (Feetech SMS/STS) registers."""

from .robot_config import Config
import math


def to_signed_magnitude(raw: int) -> int:
    """
    Decode a 16-bit Feetech field where bit 15 is direction and bits 0–14
    are magnitude (present current and present speed).
    """
    raw &= 0xFFFF
    magnitude = raw & 0x7FFF
    return -magnitude if (raw & 0x8000) else magnitude


def to_signed_current(raw: int) -> int:
    """
    Convert ST3215 PRESENT_CURRENT (addr 69) to signed milliamps.

    Unit is 6.5 mA per count. Bit 15 is sign (SCServo convention), not
    XL330 two's-complement.
    """
    return int(to_signed_magnitude(raw) * Config.CURRENT_UNIT_MA)


def encoder_to_radians(ticks: int, center: int = Config.ENCODER_CENTER) -> float:
    return (ticks - center) * math.tau / 4096


def radians_to_encoder(angle_rad: float, center: int = Config.ENCODER_CENTER) -> int:
    if not math.isfinite(angle_rad):
        raise ValueError("Angle must be finite")
    ticks = round(center + angle_rad * 4096 / math.tau)
    return max(Config.ENCODER_MIN, min(Config.ENCODER_MAX, ticks))
