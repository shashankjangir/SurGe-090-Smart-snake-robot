"""Dashboard recovery and annotation checks with temporary data and blocked motion."""
import importlib.util
import json
import logging
from pathlib import Path
import sys
import tempfile
import threading
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright
from werkzeug.serving import make_server


ROOT = Path(__file__).resolve().parents[1]


def verify(root=ROOT):
    spec = importlib.util.spec_from_file_location('recovery_web', root / 'backend/web_dashboard/web_app.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    app = module.create_app()
    control = app.config['GEN3']
    server = make_server('127.0.0.1', 0, app, threaded=True)
    base = f'http://127.0.0.1:{server.server_port}'
    try:
        with tempfile.TemporaryDirectory() as temporary, sync_playwright() as playwright:
            control.map_path = Path(temporary) / 'joint_map.json'
            control.map_path.write_bytes((root / 'joint_map.json').read_bytes())
            control.sessions._config = {'password': 'recovery-test-only', 'configured': True}
            control.hardware_factory = lambda **kwargs: (_ for _ in ()).throw(AssertionError('Physical transport requested'))
            runs = control.map_path.parent / 'runs'
            runs.mkdir()
            record = runs / 'web-123.json'
            record.write_text(json.dumps(dict(timestamp=1, mode='gait', execution='simulation',
                                             annotations={'notes': 'Original', 'surface': 'Carpet'})))
            threading.Thread(target=server.serve_forever, daemon=True).start()
            browser = playwright.chromium.launch(channel='chrome', headless=True,
                                                  args=['--enable-unsafe-swiftshader'])
            page = browser.new_page(reduced_motion='reduce')
            errors = []
            pending = []
            mode = 'normal'
            page.on('pageerror', lambda error: errors.append(str(error)))

            def intercept(route):
                path = urlsplit(route.request.url).path
                if path == '/api/phone/link':
                    route.fulfill(json={'lan': True, 'urls': [base + '/phone?key=test-only']})
                elif path == '/api/gen3/runs/web-123/annotate':
                    if mode == 'failed':
                        route.fulfill(status=503, json={'error': 'Test save refused'})
                    elif mode == 'delayed':
                        pending.append((route, route.fetch()))
                    else:
                        route.continue_()
                elif route.request.method == 'GET' or path == '/api/gen3/session/heartbeat':
                    route.continue_()
                else:
                    route.abort()

            page.route('**/*', intercept)
            response = page.request.post(base + '/api/gen3/session/login', data={
                'name': 'Shashank', 'password': 'recovery-test-only'})
            assert response.ok
            for path in ('/', '/gen3'):
                page.goto(base + path)
                expect(page.locator('[data-gamepad="phone"] a').first).to_be_visible()
            page.locator('#tab-runs').click()
            row = page.locator('#runs-table-body tr').filter(has_text='web-123')
            row.locator('summary').first.click()
            row.locator('.ann-notes').fill('Unsaved observation')
            page.locator('#tab-simulation').click()
            page.locator('#tab-runs').click()
            expect(row.locator('.ann-notes')).to_have_value('Unsaved observation')
            page.locator('#runs-workspace-filter').select_option('hardware')
            expect(row).to_have_count(0)
            page.locator('#runs-workspace-filter').select_option('simulation')
            expect(row.locator('.ann-notes')).to_have_value('Unsaved observation')
            row.locator('summary').first.click()
            mode = 'failed'
            row.locator('.btn-save-ann').click()
            expect(page.locator('#error')).to_contain_text('Test save refused')
            expect(row.locator('.ann-notes')).to_have_value('Unsaved observation')
            mode = 'delayed'
            row.locator('.btn-save-ann').click()
            page.wait_for_timeout(200)
            assert len(pending) == 1
            row.locator('.ann-notes').fill('Edit during save')
            route, response = pending.pop()
            route.fulfill(response=response)
            page.wait_for_function('!pendingAction')
            expect(row.locator('.ann-notes')).to_have_value('Edit during save')
            mode = 'normal'
            if row.locator('details.run-annotations').get_attribute('open') is None:
                row.locator('summary').first.click()
            row.locator('.ann-notes').fill('')
            row.locator('.ann-surf').fill('')
            with page.expect_response(lambda response: '/api/gen3/runs/web-123/annotate' in response.url
                                      and response.status == 200):
                row.locator('.btn-save-ann').click()
            page.wait_for_function('!pendingAction')
            page.reload()
            page.locator('#tab-runs').click()
            expect(row.locator('.ann-notes')).to_have_value('')
            expect(row.locator('.ann-surf')).to_have_value('')
            assert json.loads(record.read_text())['annotations'] == {'notes': '', 'surface': ''}
            assert not errors, errors
            page.close()
            fallback = browser.new_page()
            fallback.on('pageerror', lambda error: errors.append(str(error)))
            fallback.add_init_script("""const original = HTMLCanvasElement.prototype.getContext;
                HTMLCanvasElement.prototype.getContext = function(type, ...args) {
                    return type.includes('webgl') ? null : original.call(this, type, ...args);
                };""")
            fallback.goto(base + '/3d')
            expect(fallback.locator('#btn-draw')).to_be_disabled()
            fallback.evaluate('setDrawing(true); poll3DStatus();')
            fallback.wait_for_timeout(200)
            expect(fallback.locator('#status-text')).to_have_text('3D Viewer: WebGL unavailable')
            assert not errors, errors
            browser.close()
            print('Pairing links, draft refresh/filter/save recovery, clearing notes and WebGL fallback passed')
    finally:
        server.shutdown()
        control.close()
        app.config['CONTROL'].close()


if __name__ == '__main__':
    logging.getLogger('werkzeug').setLevel(logging.ERROR)
    verify(Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT)
