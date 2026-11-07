"""Browser smoke check with temporary credentials and blocked serial access."""

def main():
    from pathlib import Path
    import sys,tempfile,threading,json,shutil
    from unittest.mock import patch
    from werkzeug.serving import make_server
    from playwright.sync_api import sync_playwright
    root=Path(__file__).resolve().parents[3];gen=root/'generations/gen3-dashboard-refined';out=root/'.scratch/dashboard-refined'
    sys.path[:0]=[str(gen),str(gen/'backend')]
    from web_dashboard.web_app import create_app
    app=create_app();ctrl=app.config['GEN3'];runtime=app.config['CONTROL'];ctrl.sessions._config['password']='refined-browser-test'
    with tempfile.TemporaryDirectory() as d:
     ctrl.map_path=Path(d)/'joint_map.json';shutil.copy2(gen/'joint_map.json',ctrl.map_path)
     def forbidden(*a,**kw): raise AssertionError('Hardware transport must never open')
     ctrl.hardware_factory=forbidden
     server=make_server('127.0.0.1',5011,app,threaded=True);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();runtime.start_worker()
     try:
      with patch('serial.Serial',side_effect=forbidden),sync_playwright() as p:
       browser=p.chromium.launch();page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
       page.goto('http://127.0.0.1:5011/gen3');page.wait_for_timeout(1200)
       page.select_option('#login-name','Shashank');page.click('#btn-login');page.fill('#login-password','refined-browser-test');page.press('#login-password','Enter')
       page.wait_for_function("document.querySelector('#btn-logout').offsetWidth>0")
       page.click('#btn-gen3-sim-connect');page.wait_for_function("document.querySelector('#sim-connection-status').textContent === 'Simulation engine ready'",timeout=20000)
       print('Operator login and PyBullet connection passed')
       page.click('#btn-gen3-sim-start');page.wait_for_function("async () => { const s=await (await fetch('/api/gen3/status')).json(); return s.busy && s.execution==='simulation' && s.simulation_links; }",timeout=15000)
       page.wait_for_timeout(1000)
       assert ctrl.state['execution']=='simulation' and ctrl.state['simulation_links'],ctrl.state['status']
       page.screenshot(path=str(out/'gen3-running.png'),full_page=False)
       page.click('#floating-stop-btn');page.wait_for_function("async () => !(await (await fetch('/api/gen3/status')).json()).busy",timeout=12000)
       print('Simulation moved and Stop ended the run without hardware')
       for tab in ('tab-operate','tab-calibration','tab-runs','tab-simulation'):
        page.click('#'+tab);page.wait_for_timeout(150);assert page.get_attribute('#'+tab,'aria-selected')=='true'
       print('All four workspace tabs passed')
       page.emulate_media(reduced_motion='reduce')
       page.keyboard.press('Tab');page.locator('#tab-simulation').focus()
       assert page.locator('#tab-simulation').evaluate("e=>getComputedStyle(e).outlineStyle")!='none'
       assert page.locator('#tab-simulation').evaluate("e=>getComputedStyle(e).transitionDuration")=='0s'
       print('Visible keyboard focus and reduced motion passed')
       for width,height in ((1920,1080),(1280,800),(768,1024),(375,812),(320,812),(812,375)):
        page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(180)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(width,'overflow')
        for tab in ('tab-simulation','tab-operate','tab-calibration','tab-runs'):
         r=page.locator('#'+tab).bounding_box();assert r['x']>=0 and r['x']+r['width']<=width+1,(width,tab,'clipped')
       page.set_viewport_size({'width':375,'height':812});page.screenshot(path=str(out/'gen3-mobile-final.png'),full_page=False)
       print('Responsive layouts and visible tabs passed at 320, 375, 768, 1280, 1920 and landscape')
       assert not errors,errors
       browser.close()
     finally:
      ctrl.close();runtime.close();server.shutdown()


if __name__ == "__main__":
    main()
