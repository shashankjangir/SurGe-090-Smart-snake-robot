document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    const form = $('operator-login-form');
    if (!form) return;
    let isOperator = false;
    let pending = false;

    // The password control appears only after an operator is chosen.
    const nameSelect = $('login-name');
    const passwordWrapper = $('morphing-password-wrapper');
    const syncPasswordVisibility = () => {
        if (passwordWrapper && nameSelect) passwordWrapper.hidden = !nameSelect.value;
    };
    nameSelect?.addEventListener('change', syncPasswordVisibility);
    syncPasswordVisibility();

    function render(data) {
        isOperator = Boolean(data.is_current_operator);
        $('mode-badge').textContent = isOperator ? 'Operator' : 'Viewer';
        $('user-badge').textContent = data.current_user?.name || '';
        $('user-badge').style.display = isOperator ? 'inline-flex' : 'none';
        form.style.display = isOperator ? 'none' : 'inline-flex';
        $('btn-logout').style.display = isOperator ? 'inline-block' : 'none';
        window.dispatchEvent(new CustomEvent('surge-session', {detail: data}));
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
            const result = await requestOperatorSession('/login', {name: $('login-name').value, password: $('login-password').value});
            render(await requestOperatorSession(''));
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
            await requestOperatorSession('/logout', {});
            render(await requestOperatorSession(''));
            $('login-error').style.display = 'none';
        } catch (error) { showError(error); }
    });

    let refreshing = false;
    async function refresh() {
        if (refreshing || pending) return;
        refreshing = true;
        try {
            if (isOperator) await requestOperatorSession('/heartbeat', {});
            render(await requestOperatorSession(''));
        } catch (error) {
            render({is_current_operator: false});
            showError(error);
        } finally { refreshing = false; }
    }
    refresh();
    setInterval(refresh, 1000);
});
