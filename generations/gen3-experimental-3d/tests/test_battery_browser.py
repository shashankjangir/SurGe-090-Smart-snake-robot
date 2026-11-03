"""Read-only browser verification against the real cached battery API."""
import asyncio
import importlib.util
import logging
from pathlib import Path
import sys
import threading
import time

from playwright.async_api import async_playwright
from werkzeug.serving import make_server

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'generations/gen3-experimental-3d/backend'))
OUT = ROOT / '.scratch/battery-indicator'


async def verify(base, control):
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='chrome', headless=True)
        page = await browser.new_page(viewport={'width': 1440, 'height': 1000})
        errors, requests = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: requests.append(request))
        for route in ('/gen3', '/'):
            control.last_diagnostic = None
            await page.goto(base + route)
            await page.wait_for_function("document.querySelector('#sys-cpu').textContent !== '--%'")
            assert await page.locator('#battery-value').inner_text() == 'N/A'
            for raw, percent, level in [(126, '100%', 'high'), (120, '60%', 'high'),
                                        (117, '40%', 'medium'), (111, '0%', 'low')]:
                control.last_diagnostic = dict(timestamp=time.time(), servos={
                    i: dict(valid=True, voltage=raw) for i in range(1, 11)})
                await page.wait_for_function(
                    'text => document.querySelector("#battery-value").textContent === text', arg=percent)
                assert await page.locator('#battery-indicator').get_attribute('data-level') == level
            name = 'gen3' if route == '/gen3' else 'gen21'
            await page.locator('.top-nav').screenshot(path=str(OUT / f'{name}-recharge-desktop.png'))
            for width in (1440, 1024, 768, 390, 320):
                await page.set_viewport_size({'width': width, 'height': 1000})
                assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (route, width)
                assert await page.locator('#battery-indicator').is_visible()
            await page.locator('.top-nav').screenshot(path=str(OUT / f'{name}-recharge-mobile.png'))
            control.last_diagnostic['timestamp'] = time.time() - 31
            await page.wait_for_function("document.querySelector('#battery-value').textContent === 'Stale'")
            assert await page.locator('#battery-indicator').get_attribute('data-level') == 'unavailable'
            await page.route('**/api/system_stats', lambda route: route.fulfill(status=503, body='offline'))
            await page.wait_for_function("document.querySelector('#battery-value').textContent === 'N/A'")
            await page.unroute('**/api/system_stats')
            await page.set_viewport_size({'width': 1440, 'height': 1000})
        assert not errors, errors
        assert all(request.method == 'GET' for request in requests), 'UI issued a mutation'
        assert not any('/diagnostics' in request.url for request in requests), 'Battery caused serial sampling'
        await browser.close()
        print('Both headers: actual API, all colors, stale/offline, 320–1440px, no mutations or diagnostics requests passed')


def main():
    spec = importlib.util.spec_from_file_location('battery_browser_web', ROOT / 'generations/gen3-experimental-3d/backend/web_dashboard/web_app.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    app = module.create_app()
    from flask import request, abort
    @app.before_request
    def read_only():
        if request.method != 'GET':
            abort(403)
    control = app.config['GEN3']
    control.hardware_factory = lambda **kw: (_ for _ in ()).throw(AssertionError('Hardware opened'))
    logging.getLogger('werkzeug').setLevel(logging.ERROR)
    server = make_server('127.0.0.1', 0, app, threaded=True)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    OUT.mkdir(parents=True, exist_ok=True)
    try:
        asyncio.run(verify(f'http://127.0.0.1:{server.server_port}', control))
    finally:
        server.shutdown()
        control.close()
        app.config['CONTROL'].close()


if __name__ == '__main__':
    main()
