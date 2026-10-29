'use strict';

const planarTabs = Array.from(document.querySelectorAll('.cockpit-tabs [role="tab"]'));
function selectPlanarTab(index, focus = false) {
  planarTabs.forEach((tab, i) => {
    const selected = i === index;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
  });
  if (focus) planarTabs[index].focus();
}
planarTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectPlanarTab(index));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % planarTabs.length;
    else if (event.key === 'ArrowLeft') next = (index + planarTabs.length - 1) % planarTabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = planarTabs.length - 1;
    else return;
    event.preventDefault();
    selectPlanarTab(next, true);
  });
});
function selectPlanarHash() {
  if (location.hash === '#telemetry-hub') selectPlanarTab(1);
  else if (location.hash === '#control-hub' || location.hash === '#canvas-hub') selectPlanarTab(0);
}
window.addEventListener('hashchange', selectPlanarHash);
document.querySelectorAll('a[href="#control-hub"], a[href="#canvas-hub"], a[href="#telemetry-hub"]').forEach(link => {
  link.addEventListener('click', () => selectPlanarTab(link.getAttribute('href') === '#telemetry-hub' ? 1 : 0));
});
selectPlanarHash();
