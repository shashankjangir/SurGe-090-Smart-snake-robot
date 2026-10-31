"""Offline browser checks for the snake-driven header fluid. No robot app is started."""
from pathlib import Path
import mimetypes
import re

from jinja2 import Environment, FileSystemLoader
try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sync_playwright = None

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / 'gen3-experimental-3d/backend/web_dashboard'
OUT = ROOT / '.scratch/hero-fluid'


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    env = Environment(loader=FileSystemLoader(WEB / 'templates'))
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True,
                                    args=['--enable-unsafe-swiftshader'])
        page = browser.new_page(viewport={'width': 1280, 'height': 900})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))

        def route(request):
            url = request.request.url
            if '/static/' in url:
                file = WEB / 'static' / url.split('/static/', 1)[1].split('?')[0]
                if file.is_file():
                    request.fulfill(body=file.read_bytes(), content_type=
                                    mimetypes.guess_type(file)[0] or 'application/octet-stream')
                    return
            if url in ('http://surge-preview.local/', 'http://surge-preview.local/gen3'):
                name = 'gen3.html' if url.endswith('/gen3') else 'index.html'
                html = re.sub(r'<script\b[^>]*>[\s\S]*?</script>', '', env.get_template(name).render())
                request.fulfill(body=html, content_type='text/html')
                return
            request.abort()

        page.route('**/*', route)
        for name, path in [('gen21', '/'), ('gen3', '/gen3')]:
            for width in (1280, 390):
                page.set_viewport_size({'width': width, 'height': 900})
                page.goto('http://surge-preview.local' + path)
                for script in ('hero-fluid-trail.js', 'hero-snake-motion.js'):
                    page.add_script_tag(path=str(WEB / 'static' / script))
                page.wait_for_timeout(1800)
                assert page.evaluate('!!window.heroSnakeMotionInstance.fluidTrail')
                assert page.evaluate("getComputedStyle(document.querySelector('.hero-fluid-canvas')).pointerEvents === 'none'")
                result = page.evaluate("""() => {
                    const sim = window.heroSnakeMotionInstance;
                    sim.stop();
                    const trail = sim.fluidTrail;
                    const original = trail.advance;
                    let emitted;
                    trail.advance = (...args) => { emitted = {...args[0]}; original(...args); };
                    sim.lastTime = performance.now() / 1000 - 0.033;
                    sim.isRunning = true;
                    sim.loop(performance.now());
                    sim.stop();
                    const tail = sim.segments.at(-1);
                    const gl = sim.fluidCanvas.getContext('webgl2');
                    const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
                    original(tail, sim.width, sim.height, 0.016, sim.waveTime);
                    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                    return { followsTail: emitted.x === tail.x && emitted.y === tail.y,
                             visibleDye: pixels.some((value, i) => i % 4 === 3 && value > 0),
                             error: gl.getError(), count: gl._fluidTargets.length };
                }""")
                assert result == {'followsTail': True, 'visibleDye': True, 'error': 0, 'count': 8}, result
                page.locator('.hero-section').screenshot(path=str(OUT / f'{name}-{width}.png'))
                print(f'{name} {width}px: tail-driven emission, visible GPU dye, transparent overlay PASS')

        # Resize repeatedly: old GPU allocations must be released.
        assert page.evaluate("""() => {
            const sim=window.heroSnakeMotionInstance;
            const gl=sim.fluidCanvas.getContext('webgl2');
            const old=gl._fluidTargets.map(target => target.tex);
            for(let i=0;i<4;i++) sim.fluidTrail.clear();
            return gl._fluidTargets.length===8 && old.every(tex=>!gl.isTexture(tex));
        }""")
        page.emulate_media(reduced_motion='reduce')
        page.wait_for_timeout(100)
        assert page.evaluate('window.heroSnakeMotionInstance.fluidTrail === null')
        assert page.locator('.hero-fluid-canvas').is_hidden()
        page.emulate_media(reduced_motion='no-preference')
        page.wait_for_timeout(100)
        assert page.evaluate('!!window.heroSnakeMotionInstance.fluidTrail')
        assert page.evaluate("""() => {
            const sim=window.heroSnakeMotionInstance;
            const gl=sim.fluidCanvas.getContext('webgl2');
            const textures=gl._fluidTargets.map(target=>target.tex);
            sim.destroy();
            return textures.every(tex=>!gl.isTexture(tex)) && !document.querySelector('.hero-fluid-canvas');
        }""")
        # No WebGL: the original 2D snake still starts.
        page.goto('http://surge-preview.local/')
        page.evaluate("""() => {
            const original=HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext=function(type,...args) {
                return type==='webgl2' ? null : original.call(this,type,...args);
            };
        }""")
        for script in ('hero-fluid-trail.js', 'hero-snake-motion.js'):
            page.add_script_tag(path=str(WEB / 'static' / script))
        assert page.evaluate('window.heroSnakeMotionInstance.isRunning && !window.heroSnakeMotionInstance.fluidTrail')
        assert not errors, errors
        print('Resize cleanup, reduced-motion toggle, teardown, no-WebGL fallback PASS')
        browser.close()


if __name__ == '__main__':
    main()
