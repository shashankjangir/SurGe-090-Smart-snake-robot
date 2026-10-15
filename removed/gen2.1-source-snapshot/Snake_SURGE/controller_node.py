import pygame
import requests
import time

URL = "http://127.0.0.1:5000/api/controller"

def main():
    pygame.init()
    pygame.joystick.init()
    
    if pygame.joystick.get_count() == 0:
        print("No gamepad found. Exiting.")
        return
        
    joystick = pygame.joystick.Joystick(0)
    joystick.init()
    print(f"Controller Connected: {joystick.get_name()}")
    
    prev_buttons = {}
    
    while True:
        pygame.event.pump()
        
        x_axis = joystick.get_axis(0)
        y_axis = joystick.get_axis(1)
        
        rt_val = 0.0
        num_axes = joystick.get_numaxes()
        num_buttons = joystick.get_numbuttons()
        
        if num_axes >= 6:
            try:
                val4 = (joystick.get_axis(4) + 1.0) / 2.0
                val5 = (joystick.get_axis(5) + 1.0) / 2.0
                if val4 > 0.1 or val5 > 0.1:
                    rt_val = max(val4, val5)
            except: pass
                
        if rt_val < 0.05:
            for i in range(2, num_axes):
                try:
                    val = abs(joystick.get_axis(i))
                    if val > 0.1:
                        rt_val = max(rt_val, val)
                except: pass
        
        if rt_val < 0.05:
            for btn_idx in [4, 5, 6, 7]:
                if btn_idx < num_buttons:
                    try:
                        if joystick.get_button(btn_idx):
                            rt_val = 1.0
                            break
                    except: pass

        btn_start_pressed = joystick.get_button(0)
        btn_stop_pressed = joystick.get_button(1)
        btn_reverse_pressed = joystick.get_button(2)
        btn_preset_pressed = joystick.get_button(3)
        
        is_start = btn_start_pressed and not prev_buttons.get('start', False)
        is_stop = btn_stop_pressed and not prev_buttons.get('stop', False)
        is_reverse = btn_reverse_pressed and not prev_buttons.get('reverse', False)
        is_preset = btn_preset_pressed and not prev_buttons.get('preset', False)
        
        prev_buttons = {
            'start': btn_start_pressed, 'stop': btn_stop_pressed,
            'reverse': btn_reverse_pressed, 'preset': btn_preset_pressed
        }
        
        raw_buttons = {}
        for i in range(num_buttons):
            raw_buttons[f"btn_{i}"] = joystick.get_button(i)
            
        payload = {
            'stick_x': x_axis,
            'stick_y': -y_axis,
            'trigger_rt': rt_val,
            'raw_buttons': raw_buttons,
            'btn_start': is_start,
            'btn_stop': is_stop,
            'btn_reverse': is_reverse,
            'btn_preset': is_preset
        }
        
        try:
            requests.post(URL, json=payload, timeout=0.1)
        except:
            pass
            
        time.sleep(0.05)

if __name__ == "__main__":
    main()
