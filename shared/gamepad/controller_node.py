"""Gamepad input for the local Gen 2.1 dashboard; A=start, B=stop, X=reverse, Y=preset."""
import argparse
import time


def main():
    import pygame
    import requests
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:5000")
    args = parser.parse_args()
    pygame.init()
    pygame.joystick.init()
    try:
        if pygame.joystick.get_count() < 1:
            raise RuntimeError("No gamepad found")
        joystick = pygame.joystick.Joystick(0)
        joystick.init()
        if joystick.get_numaxes() < 2 or joystick.get_numbuttons() < 4:
            raise RuntimeError("Requires two axes and four buttons")
        previous = [0]*4
        while True:
            pygame.event.pump()
            if not joystick.get_attached():
                break
            buttons = [joystick.get_button(i) for i in range(4)]
            payload = {"stick_x": joystick.get_axis(0), "stick_y": -joystick.get_axis(1),
                       "raw_buttons": {f"btn_{i}": value for i,value in enumerate(buttons)}}
            for i, name in enumerate(("btn_start", "btn_stop", "btn_reverse", "btn_preset")):
                payload[name] = bool(buttons[i] and not previous[i])
            previous = buttons
            try:
                requests.post(args.url.rstrip("/")+"/api/controller", json=payload, timeout=.3).raise_for_status()
            except requests.RequestException as exc:
                print(f"Control link: {exc}")
            time.sleep(.05)
    except KeyboardInterrupt:
        pass
    finally:
        try:
            requests.post(args.url.rstrip("/")+"/api/stop", json={}, timeout=.5)
        except requests.RequestException:
            pass
        pygame.quit()

if __name__ == "__main__":
    main()
