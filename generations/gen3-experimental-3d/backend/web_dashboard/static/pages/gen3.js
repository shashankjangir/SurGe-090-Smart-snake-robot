'use strict';

const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const COUNTS_PER_RADIAN = 4096 / (2 * Math.PI);
const JOINT_COUNT = 12; // 12-motor upgrade: IDs 11 (pitch) and 12 (yaw) at the tail

document.addEventListener('change', event => {
  if (event.target.matches('select') && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    event.target.animate([{ backgroundColor: '#dbeafe' }, { backgroundColor: '#f8fafc' }], { duration: 320, easing: 'ease-out' });
  }
});

let session = null;
let pendingAction = false;
let appliedSettings = null;
let currentRunId = null;
let statusOnline = false;

// Helper for showing user-facing error messages
function showError(error) {
  const el = $('error');
  if (error) {
    el.textContent = String(error.message || error);
    el.hidden = false;
  } else {
    el.textContent = '';
    el.hidden = true;
  }
}

function formatUnit(val, unit) {
  if (val === null || val === undefined || val === 'N/A' || !Number.isFinite(Number(val))) return 'N/A';
  return `${val}${unit}`;
}

function number(id) {
  return Number($(id).value);
}

async function action(callback) {
  if (pendingAction || !statusOnline) return;
  pendingAction = true;
  showError(null);
  document.querySelectorAll('.job').forEach(btn => btn.disabled = true);
  try {
    await callback();
  } catch (err) {
    showError(err);
  } finally {
    pendingAction = false;
    await poll();
  }
}

// Tab navigation
let tabNavAnimated = null;
let modeTogglesAnimated = null;
window.addEventListener('resize', () => {
  for (const pill of document.querySelectorAll('.animated-bg-pill')) pill.style.transition = 'none';
  tabNavAnimated?.sync();
  modeTogglesAnimated?.sync();
  requestAnimationFrame(() => {
    for (const pill of document.querySelectorAll('.animated-bg-pill')) pill.style.transition = '';
  });
});

function initAnimatedBackground(container, options = {}) {
  if (!container) return null;
  const {
    pillClass = 'animated-bg-pill',
    itemSelector = ':scope > *',
    enableHover = true,
    trackActive = false,
    activeSelector = '.active'
  } = options;

  container.classList.add('animated-bg-container');
  let pill = container.querySelector(`:scope > .${pillClass}`);
  if (!pill) {
    pill = document.createElement('div');
    pill.className = pillClass;
    container.prepend(pill);
  }

  function updateItems() {
    container.querySelectorAll(itemSelector).forEach(el => {
      if (el !== pill) {
        el.style.position = 'relative';
        el.style.zIndex = '1';
      }
    });
  }
  updateItems();

  function moveTo(target) {
    if (!target) {
      pill.style.opacity = '0';
      pill.style.display = 'none';
      return;
    }
    const cRect = container.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();
    // The pill lives inside the container, so add its scroll offset when the container scrolls.
    const left = tRect.left - cRect.left + container.scrollLeft;
    const top = tRect.top - cRect.top + container.scrollTop;
    pill.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    pill.style.width = `${tRect.width}px`;
    pill.style.height = `${tRect.height}px`;
    pill.style.display = 'block';
    pill.style.opacity = '1';
  }

  function sync() {
    if (trackActive) {
      const active = container.querySelector(itemSelector + activeSelector);
      if (active) {
        moveTo(active);
        return;
      }
    }
    pill.style.opacity = '0';
    pill.style.display = 'none';
  }

  if (enableHover) {
    container.addEventListener('mouseover', e => {
      const item = e.target.closest(itemSelector);
      if (item && item.parentElement === container && item !== pill) {
        moveTo(item);
      }
    });
    container.addEventListener('mouseleave', () => {
      sync();
    });
  }

  sync();
  return { moveTo, sync, updateItems };
}

const consoleTabs = Array.from(document.querySelectorAll('.tab-btn'));
function selectTab(index, focus = true) {
  consoleTabs.forEach((tab, i) => {
    const isTarget = i === index;
    tab.tabIndex = isTarget ? 0 : -1;
    tab.setAttribute('aria-selected', String(isTarget));
    if (tab.classList) {
      if (isTarget) tab.classList.add('active');
      else tab.classList.remove('active');
    }
    const panelId = tab.getAttribute('aria-controls');
    if ($(panelId) && $(panelId).classList) {
      if (isTarget) $(panelId).classList.add('active');
      else $(panelId).classList.remove('active');
    }
  });
  if (consoleTabs[index]) {
    const panelId = consoleTabs[index].getAttribute('aria-controls');
    if (panelId === 'panel-runs') loadRuns().catch(showError);
    if (window.location) window.location.hash = panelId;
    if (focus && typeof consoleTabs[index].focus === 'function') consoleTabs[index].focus();
  }
  if (tabNavAnimated) tabNavAnimated.sync();
}

consoleTabs.forEach((btn, index) => {
  btn.onclick = () => {
    selectTab(index, false);
  };
  btn.addEventListener('keydown', (e) => {
    let targetIndex = null;
    if (e.key === 'ArrowRight') {
      targetIndex = (index + 1) % consoleTabs.length;
    } else if (e.key === 'ArrowLeft') {
      targetIndex = (index - 1 + consoleTabs.length) % consoleTabs.length;
    } else if (e.key === 'Home') {
      targetIndex = 0;
    } else if (e.key === 'End') {
      targetIndex = consoleTabs.length - 1;
    }
    if (targetIndex !== null) {
      e.preventDefault();
      selectTab(targetIndex, true);
    }
  });
});

function syncHashTab() {
  if (window.location.hash) {
    const tabBtn = document.querySelector(`[aria-controls="${window.location.hash.slice(1)}"]`);
    if (tabBtn) tabBtn.click();
  }
}
window.addEventListener('hashchange', syncHashTab);
