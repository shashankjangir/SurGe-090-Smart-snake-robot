"""Gen 3 & Gen 2.1 Gamepad controller node.
Xbox-style SDL joystick layout: LB=hold, A=start, B=stop, X=reverse, Y=shape.
Left stick steers; axis 5 (RT) controls gait rate; right stick controls inspection.
Use the browser controller for navigation and hardware Gen 3 jobs.
"""
import argparse
import sys
import time


def create_payload(stick_x, stick_y, buttons, previous_buttons, throttle=0., head_x=0., head_y=0.):
    def down(i):
        return bool(buttons[i]) if i < len(buttons) else False
    def edge(i):
        return down(i) and not (bool(previous_buttons[i]) if i < len(previous_buttons) else False)
    def axis(value):
        return 0. if abs(value) < .15 else max(-1., min(1., value))
    return dict(stick_x=axis(stick_x), stick_y=axis(stick_y), head_x=axis(head_x), head_y=axis(head_y),
                throttle=max(0., min(1., throttle)), trigger_rt=max(0., min(1., throttle)), deadman=down(4),
                captured_at=time.time(), raw_buttons={f'btn_{i}': int(val) for i, val in enumerate(buttons)},
                btn_start=edge(0), btn_stop=edge(1), reverse=edge(2), preset=edge(3),
                yaw_up=edge(15), yaw_down=edge(14), pitch_up=edge(12), pitch_down=edge(13))


def run_controller(url="http://127.0.0.1:5000", generation="3", mock=False, operator=None, port=None):
    import requests

    base_url = url.rstrip("/")
    gen3 = str(generation) == '3'
    stop_endpoint = '/api/gen3/stop' if gen3 else '/api/stop'
    input_endpoint = '/api/gen3/controller' if gen3 else '/api/controller'
    print(f"SURGE Controller Node active -> {base_url} (Gen {generation})")

    if mock:
        print("Mock mode enabled: sending one Stop to check the dashboard link.")
        try:
            requests.post(f"{base_url}{stop_endpoint}", json={}, timeout=0.5)
        except requests.RequestException:
            pass
        return 0

    if not operator:
        raise ValueError('Use --operator NAME to authenticate before controlling motion')
    import getpass
    client = requests.Session()
    response = client.post(f'{base_url}/api/gen3/session/login', json={
        'name': operator, 'password': getpass.getpass('Operator password: ')}, timeout=3)
    if response.status_code == 401:
        client.close()
        raise RuntimeError(response.json().get('error', 'Operator login rejected'))
    response.raise_for_status()
    if response.json().get('role') != 'operator':
        client.close()
        raise RuntimeError(response.json().get('message', 'Operator lease unavailable'))

    try:
        if not gen3:
            response = client.get(f'{base_url}/api/status', timeout=.5)
            response.raise_for_status()
            status = response.json()
            engine = 'ST3215' if port else 'SIM'
            if status.get('is_running') and not status.get('is_paused'):
                raise RuntimeError('Stop existing motion before starting the controller helper')
            if status.get('is_running') and status.get('engine') != engine:
                client.post(f'{base_url}/api/connect', json={}, timeout=3).raise_for_status()
            if not status.get('is_running') or status.get('engine') != engine:
                client.post(f'{base_url}/api/connect', json=dict(engine=engine, port=port, headless=True), timeout=3).raise_for_status()
        import pygame
        pygame.init()
        pygame.joystick.init()
        if pygame.joystick.get_count() < 1:
            raise RuntimeError("No gamepad found. Connect a USB/Bluetooth controller or pass --mock")
        joystick = pygame.joystick.Joystick(0)
        joystick.init()
        instance_id = joystick.get_instance_id()
        if joystick.get_numaxes() < 6 or joystick.get_numbuttons() < 6:
            raise RuntimeError('Helper requires Xbox-style SDL layout with 6 axes and LB; use browser setup for other mappings')
        previous = None
        sequence = 0
        run_id = None
        last_heartbeat = 0.
        while True:
            if time.monotonic() - last_heartbeat >= 1:
                heartbeat = client.post(f'{base_url}/api/gen3/session/heartbeat', json={}, timeout=.4)
                heartbeat.raise_for_status()
                if not heartbeat.json().get('active'):
                    raise RuntimeError('Operator lease expired; stopping')
                last_heartbeat = time.monotonic()
            events = pygame.event.get()
            if any(event.type == pygame.JOYDEVICEREMOVED and event.instance_id == instance_id
                   for event in events):
                print("Controller detached.")
                break

            buttons = [joystick.get_button(i) for i in range(joystick.get_numbuttons())]
            throttle = (joystick.get_axis(5) + 1.) / 2.
            if previous is None:
                if not any(buttons) and throttle < .05:
                    previous = buttons
                time.sleep(.05)
                continue
            payload = create_payload(joystick.get_axis(0), -joystick.get_axis(1), buttons, previous,
                                     throttle, joystick.get_axis(2), -joystick.get_axis(3))
            sequence += 1
            payload['sequence'] = sequence
            if payload['btn_stop'] or (run_id and not payload['deadman']):
                client.post(f"{base_url}/api/stop", json={}, timeout=.4).raise_for_status()
                run_id = None
            elif payload['btn_start'] and payload['deadman'] and run_id is None:
                if gen3:
                    response = client.post(f"{base_url}/api/gen3/start", json=dict(
                        request_id=f'gamepad-{time.time_ns()}', mode='gait', execution='preview',
                        yaw=5., pitch=5., frequency=.1, duration=15., ramp=4., speed=100,
                        controller={}, input=payload), timeout=.4)
                else:
                    response = client.post(f"{base_url}/api/controller", json=dict(payload, options={}), timeout=.4)
                response.raise_for_status()
                run_id = response.json()['run_id']
            elif run_id:
                client.post(f"{base_url}{input_endpoint}", json=dict(payload, run_id=run_id), timeout=.3).raise_for_status()
            previous = buttons
            time.sleep(0.05)

    except requests.RequestException as exc:
        raise RuntimeError(f'Controller link failed; stopping: {exc}') from exc
    except KeyboardInterrupt:
        print("\nExiting controller loop on user interrupt.")
    finally:
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
    parser.add_argument("--port", help="Gen 2.1 transmitter port for hardware; otherwise the helper connects simulation")
    args = parser.parse_args()
    try:
        return run_controller(url=args.url, generation=args.gen, mock=args.mock, operator=args.operator, port=args.port)
    except RuntimeError as exc:
        print(f'Controller: {exc}', file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
