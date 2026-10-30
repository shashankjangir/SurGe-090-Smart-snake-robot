const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const elements = {};
for (const id of ['operator-login-form', 'mode-badge', 'user-badge', 'btn-login', 'btn-logout', 'login-error', 'login-name', 'login-password']) {
    elements[id] = {style: {}, value: '', listeners: {}, addEventListener(type, fn) { this.listeners[type] = fn; }};
}
let operator = false;
let calls = [];
let refresh;
const context = {
    document: {getElementById: id => elements[id], addEventListener: (_, fn) => fn()},
    window: {morphingPasswordButton: {collapse() {}, shake() {}}, dispatchEvent() {}},
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    setInterval: fn => { refresh = fn; },
    fetch: async (url, options) => {
        calls.push(url);
        const body = options?.body && JSON.parse(options.body);
        if (url.endsWith('/login')) {
            if (body.password !== 'test-password') return {ok: false, json: async () => ({error: 'Incorrect password'})};
            operator = true;
        }
        if (url.endsWith('/logout')) operator = false;
        return {ok: true, json: async () => ({success: true, is_current_operator: operator, current_user: {name: 'Shashank'}})};
    },
};
const settle = () => new Promise(resolve => setImmediate(resolve));
(async () => {
    const html = fs.readFileSync('gen3-experimental-3d/backend/web_dashboard/templates/index.html', 'utf8');
    assert(html.includes('src="/static/operator-session.js"'), 'Dashboard must load session handler');
    vm.runInNewContext(fs.readFileSync('gen3-experimental-3d/backend/web_dashboard/static/operator-session.js', 'utf8'), context);
    await settle();
    assert.equal(elements['mode-badge'].textContent, 'Viewer');
    assert.equal(elements['user-badge'].style.display, 'none');
    elements['login-name'].value = 'Shashank';
    elements['login-password'].value = 'wrong';
    const submit = () => elements['operator-login-form'].listeners.submit({preventDefault() {}});
    await submit();
    assert.equal(elements['mode-badge'].textContent, 'Viewer');
    assert.equal(elements['login-error'].textContent, 'Incorrect password');
    elements['login-password'].value = 'test-password';
    calls = [];
    await Promise.all([submit(), submit()]);
    assert.equal(calls.filter(url => url.endsWith('/login')).length, 1);
    assert.equal(elements['mode-badge'].textContent, 'Operator');
    assert.equal(elements['user-badge'].textContent, 'Shashank');
    assert.equal(elements['user-badge'].style.display, 'inline-flex');
    assert.equal(elements['operator-login-form'].style.display, 'none');
    assert.equal(elements['login-password'].value, '');
    await refresh();
    assert(calls.some(url => url.endsWith('/heartbeat')));
    await elements['btn-logout'].listeners.click();
    assert.equal(elements['mode-badge'].textContent, 'Viewer');
    assert.equal(elements['operator-login-form'].style.display, 'inline-flex');
    console.log('Operator session: rejected password, login, duplicate submit, heartbeat and logout passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
