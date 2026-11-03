"""Explicit isolated Chrome controller check. Run with the Playwright Python env."""
import asyncio
import importlib.util
import json
import logging
import math
from pathlib import Path
import sys
import tempfile
import threading
import time

from werkzeug.serving import make_server

ROOT = Path(__file__).resolve().parents[3]
GEN = ROOT / 'generations/gen3-experimental-3d'
sys.path.insert(0, str(GEN / 'backend'))
sys.path.insert(0, str(ROOT / 'shared'))
OUT = ROOT / 'docs/gen3/workspace-separation'


class PlanarSimulator:
    def __init__(self): self.positions = {i: 2048 for i in range(1, 11)}
    def start(self): pass
    def stop(self): pass
    def disconnect(self): pass
    def write_positions(self, positions, **kw):
        self.positions = {i: round(2048 + angle * 4096 / (2 * math.pi)) for i, angle in positions.items()}
    def read_telemetry(self):
        return {i: dict(valid=True, position=v, velocity=0, load=0) for i, v in self.positions.items()}
    def get_robot_pose(self): return 0., 0., 0.
    def get_all_segment_positions(self): return [(0., 0.)] * 11
    def get_3d_state(self): return []
    def update_physics(self, *args): pass


async def verify(base, gen3, planar, session_id):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='chrome', headless=True, args=['--enable-unsafe-swiftshader'])
        context = await browser.new_context(extra_http_headers={'X-Session-ID': session_id}, viewport={'width': 1440, 'height': 1000})
        await context.add_init_script("""
          window.offlinePad = {id: 'Offline Xbox', index: 0, connected: true, mapping: 'standard', axes: [0,0,0,0],
            buttons: Array.from({length: 17}, () => ({pressed: false, value: 0}))};
          navigator.getGamepads = () => [window.offlinePad];
        """)
        page = await context.new_page()
        errors, inputs = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda req: inputs.append(dict(url=req.url, body=req.post_data_json))
                if req.method == 'POST' and req.url.endswith(('/controller', '/start', '/stop')) else None)
        for route in ('/gen3', '/gen3?hardware-dry-run', '/'):
            is_gen3 = route.startswith('/gen3')
            is_simulation = route == '/gen3'
            controller = 'simulation-controller' if is_simulation else 'hardware-controller' if is_gen3 else 'gen21-simulation-controller'
            if not is_gen3:
                with planar.lock:
                    planar.iface = PlanarSimulator()
                    planar.state.update(is_running=True, is_paused=True, engine='SIM', status='Connected')
                planar.start_worker()
            await page.goto(base + route)
            await page.bring_to_front()
            if is_gen3:
                if is_simulation:
                    await page.locator('#btn-gen3-sim-connect').click()
                    await page.wait_for_function("!document.querySelector('#btn-gen3-sim-start').disabled")
                    await page.locator('#sim-route-line').click()
                    await page.locator('#simulation-controller [data-gamepad=assist]').select_option('route')
                else:
                    await page.locator('#tab-operate').click()
                    await page.locator('#hardware-dry-run').check()
                    await page.fill('#duration', '30')
            await page.wait_for_function(f"!document.querySelector('#{controller} [data-gamepad=enable]').disabled")
            await page.locator(f'#{controller} [data-gamepad=enable]').click()
            await page.wait_for_timeout(150)
            await page.evaluate("offlinePad.buttons[0].pressed = true; offlinePad.buttons[4].pressed = true")
            await page.wait_for_timeout(1500)
            try:
                await page.wait_for_function(f"document.querySelector('#{controller} [data-gamepad=status]').textContent.includes('Hold to run')")
            except Exception:
                print(route, await page.locator(f'#{controller} [data-gamepad=status]').text_content(), gen3.state['status'], errors, flush=True)
                raise
            await page.evaluate("offlinePad.buttons[0].pressed = false; offlinePad.buttons[7].pressed = true; offlinePad.buttons[7].value = 1; offlinePad.axes[0] = .5")
            await page.wait_for_function(f"document.querySelector('#{controller} [data-gamepad=preset]').textContent.includes('rate')")
            if is_simulation:
                await page.wait_for_function("document.querySelector('#hud-sim-state').textContent !== 'No active simulation'")
                assert gen3.state['execution'] == 'simulation' and gen3.state['simulation_links']
                before = json.dumps(gen3.state['simulation_links'])
                await page.wait_for_timeout(400)
                assert json.dumps(gen3.state['simulation_links']) != before, 'PyBullet links must move'
            for width in (1280, 390, 320):
                await page.set_viewport_size({'width': width, 'height': 1000})
                await page.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
                if not await page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'):
                    await page.screenshot(path=str(OUT / 'overflow-debug.png'), full_page=True)
                    print(await page.evaluate("[...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => ({tag:el.tagName,id:el.id,cls:String(el.className),right:el.getBoundingClientRect().right})).slice(0,20)"))
                assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), (route, width, 'overflow')
                await page.screenshot(path=str(OUT / f'{controller}-{width}.png'), full_page=True)
            # Release is a real browser event stream; the server must stop the owned job.
            async with page.expect_response(lambda r: r.url.endswith('/api/stop')) as stopping:
                await page.evaluate("offlinePad.buttons[4].pressed = false")
            assert (await stopping.value).status == 200
            await page.wait_for_function(f"document.querySelector('#{controller} [data-gamepad=enable]').getAttribute('aria-pressed') === 'false'")
            if is_gen3:
                await asyncio.to_thread(gen3.thread.join, 2)
                assert not gen3.state['busy']
                if not is_simulation: assert gen3.state['telemetry'] == {}
            else:
                assert planar.state['is_paused']
            await page.locator(f'#{controller}').screenshot(path=str(OUT / ('gen3-controller.png' if is_gen3 else 'gen21-controller.png')))
            if is_simulation:
                await page.locator('#btn-gen3-sim-connect').click()
                await page.wait_for_function("document.querySelector('#sim-connection-status').textContent.includes('disconnected')")
            await page.evaluate('offlinePad.buttons.forEach(b => {b.pressed = false; b.value = 0})')
            if is_gen3 and not is_simulation:
                sim_yaw = await page.locator('#sim-param-yaw-amp').input_value()
                await page.locator('#yaw').fill('9')
                assert await page.locator('#sim-param-yaw-amp').input_value() == sim_yaw
                speed = await page.locator('#speed').input_value()
                await page.locator('#copy-from-simulation').click()
                assert float(await page.locator('#yaw').input_value()) == float(sim_yaw)
                assert await page.locator('#speed').input_value() == speed
                await page.locator('#yaw').fill('9')
                await page.locator('#tab-runs').click()
                await page.locator('#presets-list input[type=radio]').first.check()
                await page.locator('#load-preset-simulation').click()
                assert await page.locator('#tab-simulation').get_attribute('aria-selected') == 'true'
                assert await page.locator('#yaw').input_value() == '9'
                await page.locator('#tab-runs').click()
                await page.locator('#runs-workspace-filter').select_option('simulation')
                await page.wait_for_function("[...document.querySelectorAll('#runs-table-body tr')].length > 0 && [...document.querySelectorAll('#runs-table-body tr')].every(row=>row.children[3].textContent==='Simulation')")
                await page.locator('#tab-operate').click()
                await page.locator('#tab-runs').click()
                assert await page.locator('#runs-workspace-filter').input_value() == 'simulation'
                await page.locator('#tab-operate').click()
                await page.locator('#hardware-dry-run').uncheck()
                await page.locator('#port').select_option('')
                await page.evaluate("document.querySelector('#gait-form').requestSubmit()")
                await page.locator('#factor-confirm-proceed').click()
                await page.wait_for_function("document.querySelector('#error').textContent.includes('transmitter port')")
                assert not gen3.state['busy']

        await page.locator('#btn-connect').click()
        await page.wait_for_function("document.querySelector('#conn-status').textContent === 'Disconnected'")
        assert not await page.locator('#workspace-hardware').count()
        assert not await page.locator('#serial-port').count()
        assert await page.locator('#gen21-simulation-controller').is_visible()
        for width in (1280, 390):
            await page.set_viewport_size({'width': width, 'height': 1000})
            await page.evaluate('window.scrollTo(0, 0)')
            await page.wait_for_timeout(500)
            assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
            assert not await page.locator('#telemetry-grid .telem-box').count()
            assert await page.locator('#gen21-simulation-controller [data-gamepad=preset]').text_content() == 'Controller stopped'
            metrics = await page.evaluate("[...document.querySelectorAll('.hero-section,.hero-content,.display-headline,.modular-control-wrapper,.hero-actions')].map(el=>({class:el.className,rect:el.getBoundingClientRect().toJSON(),css:{display:getComputedStyle(el).display,opacity:getComputedStyle(el).opacity,transform:getComputedStyle(el).transform,height:getComputedStyle(el).height}}))")
            (OUT / f'hero-{width}.json').write_text(json.dumps(metrics, indent=2))
            assert metrics[2]['rect']['top'] >= metrics[0]['rect']['top'], metrics
            assert metrics[3]['rect']['bottom'] <= metrics[0]['rect']['bottom'], metrics
            await page.screenshot(path=str(OUT / f'gen21-simulation-{width}.png'), full_page=True)
        duplicates = await page.evaluate("[...document.querySelectorAll('[id]')].filter((el,i,all)=>all.findIndex(other=>other.id===el.id)!==i).map(el=>el.id)")
        assert not [item for item in duplicates if item != 'distorted-glass-filter'], duplicates
        assert not errors, errors
        assert any('/api/gen3/controller' in r['url'] for r in inputs)
        assert any(r['url'].endswith('/api/controller') for r in inputs)
        assert all(r['body'].get('execution') in ('preview', 'simulation') for r in inputs if r['url'].endswith('/api/gen3/start'))
        (OUT / 'browser-results.json').write_text(json.dumps(dict(page_errors=errors, motion_requests=inputs, widths=[1280, 390, 320]), indent=2))
        await browser.close()


def main():
    spec = importlib.util.spec_from_file_location('controller_browser_web', GEN / 'backend/web_dashboard/web_app.py')
    web = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(web)
    app = web.create_app()
    gen3, planar = app.config['GEN3'], app.config['CONTROL']
    gen3.hardware_factory = lambda **kw: (_ for _ in ()).throw(AssertionError('Physical transport prohibited'))
    with tempfile.TemporaryDirectory() as temp:
        gen3.map_path = Path(temp) / 'joint_map.json'
        gen3.map_path.write_bytes((GEN / 'joint_map.json').read_bytes())
        session = gen3.sessions.get_or_create()
        session.update(role='operator', name='Offline test')
        gen3.sessions.active_operator = dict(session_id=session['session_id'], name=session['name'],
                                             last_heartbeat=time.monotonic(), expires_at=time.monotonic() + 120)
        logging.getLogger('werkzeug').setLevel(logging.ERROR)
        server = make_server('127.0.0.1', 0, app, threaded=True)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            OUT.mkdir(parents=True, exist_ok=True)
            asyncio.run(verify(f'http://127.0.0.1:{server.server_port}', gen3, planar, session['session_id']))
            print('Both dashboards: streamed input, release Stop, no page errors or overflow at 1280/390/320 px. No hardware used.')
        finally:
            gen3.close()
            planar.close()
            server.shutdown()


if __name__ == '__main__': main()
