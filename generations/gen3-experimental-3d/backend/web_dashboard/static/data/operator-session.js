'use strict';

async function requestOperatorSession(action, body) {
    const response = await fetch(`/api/gen3/session${action}`, body === undefined ? {} : {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok || data.success === false) throw new Error(data.error || 'Session request failed');
    return data;
}
