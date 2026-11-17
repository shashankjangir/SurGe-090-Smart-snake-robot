'use strict';

// Two modes: Viewer and Operator
let currentIsOperator = false;
let lastKnownOperator = undefined;

function setViewerMode(isViewer) {
  const mutatingButtons = [
    $('start'),
    $('btn-start'),
    $('btn-gen3-sim-start'),
    $('btn-apply'),
    $('jog-forward'),
    $('jog-reverse'),
    $('center'),
    $('read-all'),
    $('btn-pose-capture'),
    $('btn-pose-save'),
    $('btn-pose-recalibrate'),
    $('align-all'),
    $('btn-save-map'),
    $('run-diagnostics'),
    $('btn-save-preset'),
    $('btn-build-fw'),
    $('btn-upload-fw')
  ].filter(Boolean);

  document.querySelectorAll('.btn-del, .btn-save-ann').forEach(b => {
    b.disabled = isViewer || !statusOnline || pendingAction;
    mutatingButtons.push(b);
  });
  // Every other job button and the simulation connect button also need the operator lease.
  document.querySelectorAll('.job, #btn-gen3-sim-connect').forEach(b => mutatingButtons.push(b));

  // Viewers see the button flip to "Operator mode required" on hover (components.css);
  // screen readers get the same reason as the button's description.
  for (const btn of new Set(mutatingButtons)) {
    if (isViewer) {
      btn.disabled = true;
      btn.dataset.operatorRequired = 'true';
      btn.setAttribute('aria-disabled', 'true');
      btn.setAttribute('aria-description', 'Operator mode required');
    } else {
      btn.dataset.operatorRequired = 'false';
      btn.removeAttribute('aria-disabled');
      btn.removeAttribute('aria-description');
    }
    if (btn.title === 'Log in as Operator to start' || btn.title === 'Operator mode required') btn.title = '';
  }

  $('btn-save-preset').disabled = isViewer || !statusOnline || pendingAction;
  $('btn-pose-save').disabled = isViewer || !statusOnline || pendingAction || !capturedPose;
  document.querySelectorAll('.motion-permission-hint').forEach(hint => {
    hint.hidden = !isViewer;
  });
}

async function initSession() {
  const data = await api('session', undefined, 'GET');
  if (data.current_user) {
    session = data.current_user;
  }
  updateOperatorUI(data);
}

function updateOperatorUI(data) {
  currentIsOperator = Boolean(data.is_current_operator);

  if (data.current_user) session = data.current_user;

  setViewerMode(!currentIsOperator);
  if (typeof checkDraftDifferences === 'function') checkDraftDifferences();
}

window.addEventListener('surge-session', event => updateOperatorUI(event.detail));

$('login-password')?.addEventListener('input', () => {
  const error = $('login-error');
  if (error) error.style.display = 'none';
});
