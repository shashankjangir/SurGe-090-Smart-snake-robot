"""Explicit offline UI check. Mocked motion; no controller worker or serial access."""
import asyncio
import copy
import importlib.util
import json
import logging
from pathlib import Path
import threading

from flask import abort, request
try:
    from playwright.async_api import async_playwright
except ImportError:
    async_playwright = None
from werkzeug.serving import make_server

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.scratch/gen3-simulation-proposal'


async def verify(base, initial):
    state = copy.deepcopy(initial)
    state.update(simulation_state='connected', busy=False)
    writes, errors = [], []
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='chrome', headless=True, args=['--enable-unsafe-swiftshader'])
        page = await browser.new_page(viewport={'width': 1440, 'height': 1000})
        page.on('pageerror', lambda error: errors.append(str(error)))

        async def status(route):
            await route.fulfill(json=state)

        async def session(route):
            await route.fulfill(json=dict(is_current_operator=True,
                                         current_user=dict(name='Offline UI test', role='operator', session_id='offline-test')))

        async def start(route):
            payload = route.request.post_data_json
            writes.append(payload)
            state.update(execution='simulation', busy=True, status='Running', run_id='browser-sim',
                         simulation_head=dict(position=[.2, .05, .04], quaternion=[0, 0, 0, 1], yaw=0),
                         simulation_links=[[.2-i*.1, .05, .04] for i in range(11)],
                         simulation_poses=[dict(position=[.2-i*.1, .05, .04], quaternion=[0, 0, 0, 1]) for i in range(11)],
                         simulation_route=dict(target_path=payload['simulation_path'], actual_path=[[-.05, 0, .04], [.2, .05, .04]],
                                               state='tracking', progress=.2, error_m=.05, target=[.35, 0], rejected_samples=0))
            await route.fulfill(status=202, json={'success': True})

        async def stop(route):
            state['busy'] = False
            state['status'] = 'Stopped'
            state['simulation_route']['state'] = 'stopped'
            await route.fulfill(json={'success': True})

        await page.route('**/api/gen3/status', status)
        await page.route('**/api/gen3/session', session)
        await page.route('**/api/gen3/session/heartbeat', session)
        await page.route('**/api/gen3/start', start)
        await page.route('**/api/gen3/stop', stop)
        await page.goto(base + '/gen3')
        await page.wait_for_function("document.querySelector('#sim-model-status').textContent.includes('11 connectors')")
        assert await page.locator('.sim-cad-layer').count() == 1
        assert 'ID 10: Waveshare bus servo driver + ESP32' in await page.locator('#sim-model-status').text_content()
        await page.locator('#sim-route-line').click()
        assert len((await page.locator('#sim-route-points').input_value()).splitlines()) == 41
        await page.locator('#sim-camera-mode').select_option('follow')
        await page.locator('#sim-tracking-verified').check()
        await page.evaluate("window.dispatchEvent(new CustomEvent('surge-session',{detail:{is_current_operator:true}}))")
        await page.locator('#btn-gen3-sim-start').click()
        await page.wait_for_function("document.querySelector('#sim-route-status').textContent.includes('20%')")
        assert len(writes) == 1
        assert writes[0]['execution'] == 'simulation'
        assert writes[0]['speed'] == 1500
        assert writes[0]['duration'] == 120
        assert len(writes[0]['simulation_path']) == 41
        assert await page.locator('#sim-route-clear').is_disabled()
        await page.locator('#sim-fullscreen').click()
        await page.wait_for_function('!!document.fullscreenElement')
        assert await page.locator('#sim-fullscreen-stop').is_visible()
        await page.locator('#sim-fullscreen-stop').click()
        await page.wait_for_function("document.querySelector('#sim-route-status').textContent.includes('stopped')")
        await page.locator('#sim-fullscreen').click()
        await page.wait_for_function('!document.fullscreenElement')
        await page.locator('#sim-camera-mode').select_option('overview')
        await page.locator('#sim-canvas-hub').screenshot(path=str(OUT / 'navigation-desktop.png'))
        for width in [1280, 1024, 768, 390, 320]:
            await page.set_viewport_size({'width': width, 'height': 1000})
            assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            assert await page.locator('#sim-route-status').is_visible()
        await page.locator('#sim-canvas-hub').screenshot(path=str(OUT / 'navigation-mobile.png'))
        await page.locator('#sim-route-draw').click()
        canvas = page.locator('#gen3SimCanvas')
        await canvas.click(position={'x': 90, 'y': 150})
        await canvas.click(position={'x': 150, 'y': 200})
        assert len((await page.locator('#sim-route-points').input_value()).splitlines()) >= 2
        await page.locator('#sim-route-draw').click()
        await page.locator('#sim-route-clear').click()
        assert await page.locator('#sim-route-points').input_value() == ''
        await page.evaluate("""() => {
            const canvas = document.querySelector('.sim-cad-layer');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            gl.getExtension('WEBGL_lose_context').loseContext();
        }""")
        await page.wait_for_function("document.querySelector('#sim-model-status').textContent.includes('context lost')")
        assert await page.locator('.sim-cad-layer').count() == 0
        assert not errors, errors
        print('CAD, route submission, progress/trail, fullscreen Stop, drawing, 320–1440px and context-loss fallback passed. Mocked UI motion; no hardware.')
        await browser.close()


def main():
    spec = importlib.util.spec_from_file_location('navigation_app', ROOT / 'gen3-experimental-3d/backend/web_dashboard/web_app.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    app = module.create_app()

    @app.before_request
    def read_only():
        if request.method != 'GET':
            abort(403)

    logging.getLogger('werkzeug').setLevel(logging.ERROR)
    OUT.mkdir(parents=True, exist_ok=True)
    server = make_server('127.0.0.1', 0, app, threaded=True)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        asyncio.run(verify(f'http://127.0.0.1:{server.server_port}', app.config['GEN3'].snapshot()))
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
