'use strict';

const Gen3Records = {
  loadCalibration: () => api('map', undefined, 'GET'),
  saveCalibration: (config, revision) => api('map', {config, expected_revision: revision}),
  loadGaitPresets: () => api('presets', undefined, 'GET'),
  saveGaitPreset: (preset, expected) => api('presets', {preset, expected}),
  deleteGaitPreset: name => api(`presets/${encodeURIComponent(name)}`, undefined, 'DELETE'),
  loadPosePresets: () => api('pose/presets', undefined, 'GET'),
  savePosePreset: pose => api('pose/presets', pose),
  loadRuns: () => api('runs', undefined, 'GET'),
  annotateRun: (id, annotations) => api(`runs/${id}/annotate`, annotations),
  async loadRun(id) {
    const response = await fetch(`/api/gen3/log/${id}.json`);
    if (!response.ok) throw Error('Could not load the run; try again.');
    return response.json();
  }
};
