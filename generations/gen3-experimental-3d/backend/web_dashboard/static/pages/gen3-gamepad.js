'use strict';

window.SurgeGamepad.mount($('hardware-controller'), {
  generation: '3',
  accepts: state => state.execution !== 'simulation',
  visible: () => $('tab-operate').getAttribute('aria-selected') === 'true',
  start: async (controller, freshInput) => {
    if (!currentIsOperator || !statusOnline || pendingAction) throw Error('Operator connection required');
    if (Object.keys(readJointOverrides()).length) throw Error('Reset per-joint overrides before controller mode');
    const execution = hardwareExecution();
    const draft = getDraftSettings();
    if (execution === 'hardware' && !(await confirmParameterChanges([{
      key: 'controller', label: 'Hold-to-run controller', oldVal: 'Stopped', newVal: controller.inspection ? 'Head inspection' : 'Live gait', unit: '',
      warning: `Hold LB throughout motion. Speed limit ${draft.speed} counts/s; duration ${draft.duration}s. Verify clearance and all twelve servo replies. Release or B stops.`
    }], 'Confirm Controller Motion'))) throw Error('Start cancelled');
    const input = freshInput();
    return api('start', {request_id: crypto.randomUUID(), mode: 'gait', execution,
      port: $('port').value, ...draft, controller, input});
  }
});

window.SurgeGamepad.mount($('simulation-controller'), {
  generation: '3',
  accepts: state => state.execution === 'simulation',
  visible: () => $('tab-simulation').getAttribute('aria-selected') === 'true',
  start: async (controller, freshInput) => {
    const {simulation_path, ...payload} = window.SurgeSimulation.startPayload();
    if (controller.assist === 'route' && !controller.path) controller.path = simulation_path;
    const steering = window.SurgeSimulation.steering();
    if (steering) controller.steering = steering;
    // Hold-to-run already bounds a controller run; use the longest run the server allows.
    return api('start', {...payload, duration: 300, controller, input: freshInput()});
  }
});
