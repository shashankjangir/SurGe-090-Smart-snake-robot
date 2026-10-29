document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    const form = $('operator-login-form');
    if (!form) return;
    let isOperator = false;
    let pending = false;

    async function request(action, body) {
        const response = await fetch(`/api/gen3/session${action}`, body === undefined ? {} : {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok || data.success === false) throw new Error(data.error || 'Session request failed');
        return data;
    }

    function render(data) {
        isOperator = Boolean(data.is_current_operator);
        $('mode-badge').textContent = isOperator ? 'Operator' : 'Viewer';
        $('user-badge').textContent = `User: ${data.current_user?.name || 'Viewer'}`;
        $('user-badge').style.display = 'inline-flex';
        form.style.display = isOperator ? 'none' : 'inline-flex';
        $('btn-logout').style.display = isOperator ? 'inline-block' : 'none';
    }

    function showError(error) {
        let msg = error?.message || 'Error';
        if (/failed to fetch/i.test(msg) || error instanceof TypeError) {
            msg = 'Cannot reach the dashboard server. Check that it is running.';
        }
        $('login-error').textContent = msg;
        $('login-error').style.display = 'inline';
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (pending) return;
        pending = true;
        $('btn-login').disabled = true;
        $('login-error').style.display = 'none';
        try {
            const result = await request('/login', {name: $('login-name').value, password: $('login-password').value});
            render(await request(''));
            if (isOperator) {
                $('login-password').value = '';
                window.morphingPasswordButton?.collapse();
            } else {
                throw new Error(result.message || 'Operator access unavailable');
            }
        } catch (error) {
            showError(error);
            window.morphingPasswordButton?.shake();
        } finally {
            pending = false;
            $('btn-login').disabled = false;
        }
    });

    $('btn-logout').addEventListener('click', async () => {
        try {
            await request('/logout', {});
            render(await request(''));
            $('login-error').style.display = 'none';
        } catch (error) { showError(error); }
    });

    let refreshing = false;
    async function refresh() {
        if (refreshing || pending) return;
        refreshing = true;
        try {
            if (isOperator) await request('/heartbeat', {});
            render(await request(''));
        } catch (error) {
            render({is_current_operator: false});
            showError(error);
        } finally { refreshing = false; }
    }
    refresh();
    setInterval(refresh, 1000);
});
