'use strict';

function initMarqueeToggle() {
  const banner = document.querySelector('.marquee-banner');
  const toggleBtn = document.getElementById('marquee-toggle');
  if (!banner || !toggleBtn) return;

  const sessionPref = BrowserPreferences.readTickerPause();
  let isPaused = sessionPref !== null ? sessionPref === 'true' : true; // still by default while operating; Play opts in

  function applyState(paused) {
    banner.classList.toggle('is-paused', paused);
    toggleBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    toggleBtn.setAttribute('aria-label', paused ? 'Play announcement ticker' : 'Pause announcement ticker');
    const icon = toggleBtn.querySelector('.marquee-toggle-icon');
    const label = toggleBtn.querySelector('.marquee-toggle-label');
    if (icon) icon.dataset.icon = paused ? 'play' : 'pause';
    if (label) label.textContent = paused ? 'Play' : 'Pause';
  }

  applyState(isPaused);

  toggleBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    BrowserPreferences.saveTickerPause(isPaused);
    applyState(isPaused);
  });
}
