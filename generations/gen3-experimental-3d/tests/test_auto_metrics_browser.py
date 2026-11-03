"""Real dashboard automatic metrics against fake hardware; never opens serial ports."""
import asyncio
import importlib.util
import json
import logging
from pathlib import Path
import sys
import tempfile
import threading
from unittest.mock import patch

from playwright.async_api import async_playwright
from werkzeug.serving import make_server

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))


async def verify(base, hardware):
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(channel='chrome', headless=True)
        page = await browser.new_page(viewport={'width': 1440, 'height': 1000})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        await page.route('**/api/gen3/ports', lambda route: route.fulfill(json={
            'ports': [{'device': 'FAKE', 'description': 'Fake transmitter'}], 'recommended': 'FAKE'}))
        await page.goto(base + '/gen3')
        await page.wait_for_function("document.querySelector('#port').value === 'FAKE'")
        assert hardware.reads == 0, 'Viewer/Simulation must not sample hardware'
        response = await page.request.post(base + '/api/gen3/session/login', data={
            'name': 'Shashank', 'password': 'browser-test-only'})
        assert response.ok
        await page.reload()
        await page.locator('#tab-operate').click()
        await page.wait_for_function("document.querySelector('#grid-metric-voltage').textContent === '11.9 V'")
        await page.wait_for_function("document.querySelector('#grid-metric-rate').textContent.endsWith('Hz')")
        assert await page.locator('#grid-metric-sync').inner_text() == 'Idle · torque off'
        hardware.voltage = 117
        await page.wait_for_function("document.querySelector('#grid-metric-voltage').textContent === '11.7 V'")
        await page.wait_for_function("document.querySelector('#battery-value').textContent === '40%'")
        assert '2200 mAh 3S LiPo' in await page.locator('#battery-indicator').get_attribute('title')
        await page.locator('#btn-pose-capture').click()
        await page.locator('#pose-save-name').fill('Browser shape')
        await page.locator('#btn-pose-save').click()
        await page.wait_for_function("document.querySelector('#pose-capture-status').textContent.startsWith('Pose saved')")
        hardware.position = 2060
        await page.locator('#btn-pose-recalibrate').click()
        await page.wait_for_function("document.querySelector('#pose-capture-status').textContent.startsWith('Captured replacement')")
        before = (await (await page.request.get(base + '/api/gen3/pose/presets')).json())['presets']
        assert before[0]['pose']['1'] == 0, 'Re-capture must not overwrite until saved'
        await page.locator('#btn-pose-save').click()
        await page.wait_for_function("document.querySelector('#pose-capture-status').textContent.startsWith('Updated')")
        after = (await (await page.request.get(base + '/api/gen3/pose/presets')).json())['presets']
        assert len(after) == 1 and after[0]['name'] == 'Browser shape'
        assert after[0]['pose']['1'] == (2060 - 2048) * 360 / 4096
        for width in (1440, 390):
            await page.set_viewport_size({'width': width, 'height': 1000})
            assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert not errors, errors
        await browser.close()
        print('Browser: automatic metrics, saved pose re-calibration and mobile width passed; fake hardware only')


def main():
    class Hardware:
        voltage = 119
        reads = 0
        position = 2048
        def connect(self): return True, 'Torque off'
        def read_telemetry(self):
            return {i: dict(valid=True, position=self.position) for i in range(1, 11)}
        def read_diagnostics(self):
            self.reads += 1
            return {i: dict(valid=True, reg8=1, torque=0, voltage=self.voltage, temperature=30, status=0)
                    for i in range(1, 11)}
        def disconnect(self): pass
    spec = importlib.util.spec_from_file_location('metrics_web', ROOT / 'backend/web_dashboard/web_app.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with tempfile.TemporaryDirectory() as temporary:
        config = Path(temporary) / 'operators.json'
        config.write_text(json.dumps({'operators': ['Shashank'], 'password': 'browser-test-only'}))
        with patch('surge_control.session.DEFAULT_CONFIG_PATH', config):
            app = module.create_app()
        hardware = Hardware()
        map_path = Path(temporary) / 'joint_map.json'
        map_path.write_bytes((ROOT / 'joint_map.json').read_bytes())
        app.config['GEN3'].map_path = map_path
        app.config['GEN3'].hardware_factory = lambda **kw: hardware
        logging.getLogger('werkzeug').setLevel(logging.ERROR)
        server = make_server('127.0.0.1', 0, app, threaded=True)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            asyncio.run(verify(f'http://127.0.0.1:{server.server_port}', hardware))
        finally:
            server.shutdown()
            app.config['GEN3'].close()
            app.config['CONTROL'].close()


if __name__ == '__main__':
    main()
