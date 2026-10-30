"""Gen 3 & Gen 2.1 Gamepad controller node.
A=start, B=stop, X=reverse/action, Y=preset cycle.
Left stick: steer yaw (horizontal) / pitch amplitude (vertical).
"""
import argparse
import sys
import time


def create_payload(stick_x, stick_y, buttons, previous_buttons):
    payload = {
        "stick_x": float(stick_x),
        "stick_y": float(stick_y),
        "raw_buttons": {f"btn_{i}": int(val) for i, val in enumerate(buttons)}
    }
    for i, name in enumerate(("btn_start", "btn_stop", "btn_reverse", "btn_preset")):
        payload[name] = bool(buttons[i] and not previous_buttons[i])
    return payload


def run_controller(url="http://127.0.0.1:5000", generation="3", mock=False, operator=None):
    import requests

    base_url = url.rstrip("/")
    print(f"SURGE Controller Node active -> {base_url} (Gen {generation})")

    if mock:
        print("Mock mode enabled: simulating controller heartbeat and start/stop.")
        # Single iteration verification in mock mode
        payload = create_payload(0.0, 0.0, [0, 0, 0, 0], [0, 0, 0, 0])
        endpoint = "/api/gen3/stop" if str(generation) == "3" else "/api/stop"
        try:
            requests.post(f"{base_url}{endpoint}", json={}, timeout=0.5)
        except requests.RequestException:
            pass
        return 0

    if not operator:
        raise ValueError('Use --operator NAME to authenticate before controlling motion')
    import getpass
    client = requests.Session()
    response = client.post(f'{base_url}/api/gen3/session/login', json={
        'name': operator, 'password': getpass.getpass('Operator password: ')}, timeout=3)
    response.raise_for_status()
    if response.json().get('role') != 'operator':
        client.close()
        raise RuntimeError(response.json().get('message', 'Operator lease unavailable'))

    try:
        import pygame
        pygame.init()
        pygame.joystick.init()
        if pygame.joystick.get_count() < 1:
            raise RuntimeError("No gamepad found. Connect a USB/Bluetooth controller or pass --mock")
        joystick = pygame.joystick.Joystick(0)
        joystick.init()
        if joystick.get_numaxes() < 2 or joystick.get_numbuttons() < 4:
            raise RuntimeError("Controller requires at least two axes and four buttons")

        previous = [0] * 4
        presets = [
            {"yaw": 0.0, "pitch": 5.0, "duration": 10.0, "frequency": 0.1},
            {"yaw": 0.0, "pitch": 10.0, "duration": 30.0, "frequency": 0.1},
            {"yaw": 5.0, "pitch": 0.0, "duration": 15.0, "frequency": 0.1},
        ]
        preset_idx = 0

        last_heartbeat = 0.
        while True:
            if time.monotonic() - last_heartbeat >= 1:
                heartbeat = client.post(f'{base_url}/api/gen3/session/heartbeat', json={}, timeout=.4)
                heartbeat.raise_for_status()
                if not heartbeat.json().get('active'):
                    raise RuntimeError('Operator lease expired; stopping')
                last_heartbeat = time.monotonic()
            pygame.event.pump()
            if not joystick.get_attached():
                print("Controller detached.")
                break

            buttons = [joystick.get_button(i) for i in range(4)]
            stick_x = joystick.get_axis(0)
            stick_y = -joystick.get_axis(1)

            payload = create_payload(stick_x, stick_y, buttons, previous)

            if str(generation) == "3":
                # Gen 3 API target
                if payload["btn_start"]:
                    p = presets[preset_idx]
                    req_id = f"gamepad-{int(time.time() * 1000)}"
                    start_data = {
                        "request_id": req_id,
                        "mode": "gait",
                        "execution": "preview",
                        "yaw": p["yaw"],
                        "pitch": p["pitch"],
                        "bias": round(stick_x * 5.0, 1),
                        "frequency": p["frequency"],
                        "duration": p["duration"],
                        "speed": 100
                    }
                    try:
                        client.post(f"{base_url}/api/gen3/start", json=start_data, timeout=0.4).raise_for_status()
                        print(f"[Gen 3] Preview requested for preset {preset_idx}: pitch={p['pitch']}°, yaw={p['yaw']}°")
                    except requests.RequestException as exc:
                        print(f"[Gen 3] Start error: {exc}")

                elif payload["btn_stop"]:
                    try:
                        client.post(f"{base_url}/api/gen3/stop", json={}, timeout=0.4).raise_for_status()
                        print("[Gen 3] Stopped.")
                    except requests.RequestException as exc:
                        print(f"[Gen 3] Stop error: {exc}")

                elif payload["btn_preset"]:
                    preset_idx = (preset_idx + 1) % len(presets)
                    p = presets[preset_idx]
                    print(f"[Gen 3] Selected Preset {preset_idx}: pitch={p['pitch']}°, yaw={p['yaw']}°")

            else:
                # Gen 2.1 API target
                try:
                    endpoint = '/api/stop' if payload['btn_stop'] else '/api/controller'
                    client.post(f"{base_url}{endpoint}", json=payload, timeout=0.3).raise_for_status()
                except requests.RequestException as exc:
                    print(f"[Gen 2.1] Control link error: {exc}")

            previous = buttons
            time.sleep(0.05)

    except KeyboardInterrupt:
        print("\nExiting controller loop on user interrupt.")
    finally:
        stop_endpoint = "/api/gen3/stop" if str(generation) == "3" else "/api/stop"
        try:
            client.post(f"{base_url}{stop_endpoint}", json={}, timeout=0.5).raise_for_status()
        except requests.RequestException:
            pass
        try:
            pygame.quit()
        except Exception:
            pass
        try:
            client.post(f'{base_url}/api/gen3/session/logout', json={}, timeout=.5).raise_for_status()
        except requests.RequestException:
            pass
        client.close()
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:5000", help="Web dashboard base URL")
    parser.add_argument("--gen", choices=["2.1", "3"], default="3", help="Target robot generation (default: 3)")
    parser.add_argument("--mock", action="store_true", help="Run self-test without physical gamepad")
    parser.add_argument("--operator", help="Operator name; password is prompted without echo")
    args = parser.parse_args()
    return run_controller(url=args.url, generation=args.gen, mock=args.mock, operator=args.operator)


if __name__ == "__main__":
    sys.exit(main())
