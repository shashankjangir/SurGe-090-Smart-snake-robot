"""Offline browser checks: python generations/gen3-experimental-3d/tests/test_generation_transition_browser.py.
Requires Python playwright and an installed Chrome. Never starts a control worker;
the test server rejects every non-GET request.
"""
import asyncio
import importlib.util
import json
import logging
from pathlib import Path
import threading
import time

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / '.scratch/generation-switch'


async def verify(base):
    from playwright.async_api import async_playwright
    results = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='chrome', headless=True, args=['--enable-unsafe-swiftshader'])
        context = await browser.new_context(viewport={'width': 1440, 'height': 960})
        page = await context.new_page()
        errors, writes = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: writes.append(request.url) if request.method != 'GET' else None)
        await page.goto(base + '/')
        await page.wait_for_timeout(300)
        assert await page.locator('.generation-stage').count() == 0
        baseline_errors = list(errors)
        errors.clear()

        async def switch(target, keyboard=False, rapid=False):
            link = page.locator(f'.generation-switch a[href="{target}"]')
            await link.focus()
            before = time.monotonic()
            if rapid:
                await link.evaluate("el => { el.click(); el.click(); el.click(); }")
            elif keyboard:
                await page.keyboard.press('Enter')
            else:
                await link.click(no_wait_after=True)
            await page.wait_for_url(base + target, wait_until='domcontentloaded')
            await page.wait_for_function("!document.querySelector('.generation-stage') && !document.documentElement.classList.contains('generation-entering')", timeout=13000)
            assert await page.locator('.generation-switch a[aria-current="page"]').get_attribute('href') == target
            assert await page.evaluate("document.activeElement.matches('.generation-switch a[aria-current=page]')")
            assert await page.evaluate("!window.gsap || !gsap.getById('generation-switch')")
            return time.monotonic() - before

        for width in [1440, 390]:
            await page.set_viewport_size({'width': width, 'height': 960 if width == 1440 else 844})
            for target in ['/gen3', '/']:
                elapsed = await switch(target, keyboard=True)
                assert 2.6 < elapsed < 5.5, (width, target, elapsed)
                # Existing Gen 2.1 focused tooltip extends four pixels at 390px.
                assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth + 4')
                results.append(f'{width}px keyboard {target}: {elapsed:.2f}s, focus restored, overlay disposed')

        before = await page.evaluate('history.length')
        await switch('/gen3', rapid=True)
        assert await page.evaluate('history.length') == before + 1
        await page.go_back(wait_until='domcontentloaded')
        await page.wait_for_timeout(300)
        assert page.url == base + '/'
        assert await page.locator('.generation-stage').count() == 0
        await page.go_forward(wait_until='domcontentloaded')
        assert page.url == base + '/gen3'
        assert await page.locator('.generation-stage').count() == 0
        results.append('Rapid triple activation: one history entry; back/forward: no stale overlay')

        await page.emulate_media(reduced_motion='reduce')
        for target in ['/', '/gen3']:
            elapsed = await switch(target)
            assert elapsed < 2.5, elapsed
            assert await page.locator('.generation-stage canvas').count() == 0
        results.append('Reduced motion: both directions reveal without the three-second motion')
        await page.emulate_media(reduced_motion='no-preference')
        await page.goto(base + '/')

        async def slow_map(route):
            await asyncio.sleep(4)
            await route.continue_()
        await page.route('**/api/gen3/map', slow_map)
        await page.locator('.generation-switch a[href="/gen3"]').click(no_wait_after=True)
        await page.wait_for_url(base + '/gen3', wait_until='domcontentloaded')
        await page.wait_for_timeout(3100)
        assert await page.locator('.generation-stage').count() == 1
        assert await page.locator('.generation-failed').count() == 0
        await page.wait_for_function("!document.querySelector('.generation-stage')", timeout=6000)
        await page.unroute('**/api/gen3/map', slow_map)
        results.append('Slow critical map: holds at readiness gate, reveals after initialization')

        await page.goto(base + '/')
        async def hang_map(route):
            await asyncio.sleep(12)
            await route.abort()
        await page.route('**/api/gen3/map', hang_map)
        await page.locator('.generation-switch a[href="/gen3"]').click(no_wait_after=True)
        await page.wait_for_url(base + '/gen3', wait_until='domcontentloaded')
        await page.wait_for_selector('.generation-failed', timeout=12000)
        assert await page.locator('.generation-recovery button').evaluate('el => el === document.activeElement')
        assert await page.locator('.generation-stage canvas').count() == 0
        await page.wait_for_timeout(2500)  # Let the deliberately stalled routes settle before navigation.
        await page.locator('.generation-recovery a').click()
        await page.wait_for_load_state('domcontentloaded')
        await page.wait_for_timeout(300)  # Existing native page transition temporarily suppresses clicks.
        assert page.url == base + '/'
        await page.unroute('**/api/gen3/map', hang_map)
        results.append('Hung critical map: bounded timeout, canvas released, keyboard recovery works')

        async def fail_map(route):
            await route.fulfill(status=503, content_type='application/json', body='{"error":"Offline test"}')
        await page.route('**/api/gen3/map', fail_map)
        await page.locator('.generation-switch a[href="/gen3"]').click(no_wait_after=True)
        await page.wait_for_url(base + '/gen3', wait_until='domcontentloaded')
        await page.wait_for_selector('.generation-failed', timeout=4000)
        assert await page.locator('.generation-recovery button').is_visible()
        await page.unroute('**/api/gen3/map', fail_map)
        await page.locator('.generation-recovery button').click()
        await page.wait_for_load_state('domcontentloaded')
        await page.wait_for_timeout(500)
        assert await page.locator('.generation-stage').count() == 0
        results.append('Critical initialization failure: explicit recovery; reload clears transition')

        await context.close()

        # Separate context for the canvas renderer, navigation cancellation, and screenshots.
        context = await browser.new_context(viewport={'width': 1440, 'height': 960})
        page = await context.new_page()
        await page.goto(base + '/gen3')
        await page.locator('.generation-switch a[href="/"]').click(no_wait_after=True)
        await page.wait_for_url(base + '/', wait_until='domcontentloaded')
        await page.wait_for_selector('.generation-stage .generation-canvas')
        assert await page.locator('.generation-stage').get_attribute('data-variant') == 'gen2'
        assert 'Switching to Gen 2.1' in await page.locator('#generation-status').text_content()
        await page.screenshot(path=str(OUT / 'desktop-transition.png'), timeout=5000)
        await page.wait_for_function("!document.querySelector('.generation-stage')")
        assert await page.locator('.generation-canvas').count() == 0
        results.append('Gen 3 -> Gen 2.1: flat snake variant; canvas removed at finish')
        await page.set_viewport_size({'width': 390, 'height': 844})
        await page.locator('.generation-switch a[href="/gen3"]').click(no_wait_after=True)
        await page.wait_for_url(base + '/gen3', wait_until='domcontentloaded')
        await page.wait_for_selector('.generation-stage[data-variant="gen3"] .generation-canvas')
        await page.wait_for_timeout(300)
        await page.screenshot(path=str(OUT / 'mobile-transition.png'), timeout=5000)
        await page.go_back(wait_until='domcontentloaded')
        await page.wait_for_timeout(400)
        assert await page.locator('.generation-stage').count() == 0
        results.append('Gen 2.1 -> Gen 3: shaded snake variant; Browser Back during animation: no orphan overlay')
        await context.close()

        # A renderer exception drops the snake and still completes the switch.
        context = await browser.new_context(viewport={'width': 1440, 'height': 960})
        await context.add_init_script("""const fillRect = CanvasRenderingContext2D.prototype.fillRect;
          CanvasRenderingContext2D.prototype.fillRect = function(...args) {
            if (this.canvas.classList.contains('generation-canvas')) throw new Error('renderer test');
            return fillRect.apply(this, args);
          };""")
        page = await context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: writes.append(request.url) if request.method != 'GET' else None)
        await page.goto(base + '/')
        await page.wait_for_timeout(300)
        await switch('/gen3')
        await switch('/')
        results.append('Renderer exception: overlay removed, switch completes both ways')

        await page.locator('.generation-switch a[href="/gen3"]').evaluate("el => { el.href = '/gen3?transition-test-delay=1'; }")
        await page.locator('.generation-switch a[href*="transition-test-delay"]').click(no_wait_after=True)
        await page.wait_for_selector('.generation-failed', timeout=12000)
        assert page.url == base + '/'
        assert await page.locator('.generation-recovery button').text_content() == 'Try again'
        await page.locator('.generation-recovery button').click(no_wait_after=True)
        await page.wait_for_url(base + '/gen3', wait_until='domcontentloaded')
        await page.wait_for_function("!document.querySelector('.generation-stage')", timeout=5000)
        results.append('Stalled document request: navigation aborted at deadline; retry initializes destination')
        assert not writes, writes
        assert not errors, errors
        results.append(f'No non-GET requests; no new uncaught errors (baseline: {baseline_errors})')
        await browser.close()
    print(json.dumps(results, indent=2))
    (OUT / 'browser-results.json').write_text(json.dumps(results, indent=2))


def main():
    from werkzeug.serving import make_server
    from flask import request, abort
    spec = importlib.util.spec_from_file_location('switch_test_app', ROOT / 'generations/gen3-experimental-3d/backend/web_dashboard/web_app.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    app = module.create_app()
    @app.before_request
    def read_only():
        if request.method != 'GET':
            abort(403)
        if request.args.get('transition-test-delay') == '1':
            time.sleep(12)
    logging.getLogger('werkzeug').setLevel(logging.ERROR)
    server = make_server('127.0.0.1', 0, app, threaded=True)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    OUT.mkdir(parents=True, exist_ok=True)
    try:
        asyncio.run(verify(f'http://127.0.0.1:{server.server_port}'))
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()





