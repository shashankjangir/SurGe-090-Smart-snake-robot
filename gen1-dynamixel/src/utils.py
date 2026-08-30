"""
utils.py — Shared low-level utilities for the SURGE-SNAKE project.
"""


def to_signed_current(raw: int) -> int:
    """
    Convert a raw XL330 'Present Current' register value to a signed integer in mA.

    The XL330 stores current as an unsigned 16-bit value using two's complement:
      - Values 0–32767  represent positive current (motor pushing forward)
      - Values 32768–65535 represent negative current (motor being back-driven)

    Args:
        raw: Unsigned integer read from the PRESENT_CURRENT register (0–65535).

    Returns:
        Signed current in mA.  Positive = motor driving, Negative = back-driven.
    """
    return raw - 65536 if raw > 32767 else raw
