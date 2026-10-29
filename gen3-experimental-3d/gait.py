"""Calibrated alternating-axis targets; no hardware access."""
import json
import math
from pathlib import Path

COUNTS_PER_RADIAN = 4096 / (2 * math.pi)
MAP_PATH = Path(__file__).with_name("joint_map.json")


def number(value, name, low, high):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not low <= value <= high:
        raise ValueError(f"{name} must be finite and in {low}..{high}")
    return value


def load_map(path=MAP_PATH, require_calibrated=False):
    with open(path, encoding="utf-8") as stream:
        config = json.load(stream)
    validate_map(config, require_calibrated)
    return config


def validate_map(config, require_calibrated=False):
    if not isinstance(config, dict) or type(config.get("calibrated")) is not bool:
        raise ValueError("Map must contain a boolean calibrated flag")
    if require_calibrated and not config["calibrated"]:
        raise ValueError("Measure joint axes, signs, zeros, limits and tracking envelope; then set calibrated to true")
    joints = config.get("joints")
    if not isinstance(joints, list) or len(joints) != 10:
        raise ValueError("Exactly ten joints in physical head-to-tail order are required")
    ids = []
    for j in joints:
        if not isinstance(j, dict) or type(j.get("id")) is not int or j["id"] not in range(1, 11):
            raise ValueError("Joint IDs must be integers 1..10")
        ids.append(j["id"])
        if j.get("axis") not in ("yaw", "pitch") or type(j.get("sign")) is not int or j["sign"] not in (-1, 1):
            raise ValueError("Each joint needs yaw/pitch axis and sign +1/-1")
        for field in ("zero", "min", "max"):
            if type(j.get(field)) is not int:
                raise ValueError(f"Joint {j['id']} {field} must be integer counts")
        if not 1252 <= j["min"] < j["zero"] < j["max"] <= 2844:
            raise ValueError(f"Joint {j['id']} requires 1252 <= min < zero < max <= 2844")
    if set(ids) != set(range(1, 11)):
        raise ValueError("Duplicate or missing joint IDs")
    if any(a["axis"] == b["axis"] for a, b in zip(joints, joints[1:])):
        raise ValueError("Physical joint axes must alternate")
    number(config.get("speed"), "speed", 1, 1500)
    number(config.get("tracking_error"), "tracking_error", 1, 796)
    number(config.get("tracking_timeout"), "tracking_timeout", .1, 2)


def validate_gait(config, yaw, pitch, bias, frequency, lag, offset, duration, ramp, speed=None):
    validate_map(config)
    effective_speed = config["speed"] if speed is None else number(speed, "speed", 1, 1500)
    for name, value in (("yaw", yaw), ("pitch", pitch)):
        number(value, name, 0, math.pi / 2)
    number(bias, "bias", -math.pi / 2, math.pi / 2)
    number(frequency, "frequency", -.6, .6)
    number(lag, "lag", -2 * math.pi, 2 * math.pi)
    number(offset, "offset", -2 * math.pi, 2 * math.pi)
    number(duration, "duration", .1, 300)
    number(ramp, "ramp", 1, 30)
    if duration < 2 * ramp:
        raise ValueError("duration must be at least twice ramp")
    for j in config["joints"]:
        amplitude = yaw if j["axis"] == "yaw" else pitch
        center = bias if j["axis"] == "yaw" else 0
        ends = [j["zero"] + j["sign"] * (center + s * amplitude) * COUNTS_PER_RADIAN for s in (-1, 1)]
        if min(ends) < j["min"] or max(ends) > j["max"]:
            raise ValueError(f"Gait exceeds calibrated limits for joint {j['id']}")
        # Include the derivative of the cosine startup/shutdown envelope.
        peak_speed = COUNTS_PER_RADIAN * (2 * math.pi * abs(frequency) * amplitude + math.pi / (2 * ramp) * (amplitude + abs(center)))
        if peak_speed > effective_speed:
            raise ValueError(f"Gait exceeds speed envelope for joint {j['id']}: {peak_speed:.1f} > {effective_speed}")


def calc_peak_speed(config, yaw, pitch, bias, frequency, ramp):
    """Returns the peak instantaneous speed demand across all joints in counts/s."""
    max_demand = 0.0
    for j in config["joints"]:
        amplitude = yaw if j["axis"] == "yaw" else pitch
        center = bias if j["axis"] == "yaw" else 0
        speed_demand = COUNTS_PER_RADIAN * (2 * math.pi * abs(frequency) * amplitude + math.pi / (2 * ramp) * (amplitude + abs(center)))
        if speed_demand > max_demand:
            max_demand = speed_demand
    return max_demand


def envelope(t, duration, ramp):
    fraction = max(0., min(1., t / ramp, (duration - t) / ramp))
    return (1 - math.cos(math.pi * fraction)) / 2


def targets_at(t, config, yaw, pitch, bias, frequency, lag, offset, duration, ramp):
    scale = envelope(t, duration, ramp)
    phase = 2 * math.pi * frequency * t
    indices = {"yaw": 0, "pitch": 0}
    targets = {}
    for j in config["joints"]:
        axis = j["axis"]
        k = indices[axis]
        indices[axis] += 1
        angle = scale * ((bias if axis == "yaw" else 0) +
                         (yaw if axis == "yaw" else pitch) *
                         math.sin(phase - k * lag + (offset if axis == "pitch" else 0)))
        target = round(j["zero"] + j["sign"] * angle * COUNTS_PER_RADIAN)
        if not j["min"] <= target <= j["max"]:
            raise ValueError(f"Target outside joint {j['id']} limits")
        targets[j["id"]] = target
    return targets


def slew(previous, desired, speed, dt):
    limit = speed * min(max(dt, 0), .05)
    return {sid: value + max(-limit, min(limit, desired[sid] - value)) for sid, value in previous.items()}
