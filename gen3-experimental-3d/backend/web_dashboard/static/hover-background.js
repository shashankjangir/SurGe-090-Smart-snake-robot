'use strict';

function highlightBounds(group, item, scrollLeft = 0, scrollTop = 0) {
  return { x: item.left - group.left + scrollLeft, y: item.top - group.top + scrollTop,
    width: item.width, height: item.height };
}
if (typeof module !== 'undefined') module.exports = { highlightBounds };

if (typeof document !== 'undefined') {
  for (const [groupSelector, itemSelector] of [
    ['.cockpit-tabs', '[role="tab"]'],
    ['.tab-nav', '.tab-btn'],
    ['.mode-toggles', '.mode-btn'],
    ['#presets-list', '.preset-card'],
    ['#console-search-list', 'li'],
  ]) {
    const group = document.querySelector(groupSelector);
    if (!group) continue;
    group.classList.add('moving-background');
    let hovered = null;
    const findItem = node => node instanceof Element ? node.closest(itemSelector) : null;

    function update() {
      const focused = group.contains(document.activeElement) ? findItem(document.activeElement) : null;
      const item = hovered?.isConnected ? hovered : focused;
      if (!item || !group.contains(item) || item.disabled) {
        group.classList.remove('has-highlight');
        return;
      }
      const box = highlightBounds(group.getBoundingClientRect(), item.getBoundingClientRect(), group.scrollLeft, group.scrollTop);
      // Absolute coordinates start inside the container border.
      group.style.setProperty('--highlight-x', `${box.x - group.clientLeft}px`);
      group.style.setProperty('--highlight-y', `${box.y - group.clientTop}px`);
      group.style.setProperty('--highlight-width', `${box.width}px`);
      group.style.setProperty('--highlight-height', `${box.height}px`);
      group.classList.add('has-highlight');
    }
    group.addEventListener('pointerover', event => {
      if (event.pointerType === 'touch') return;
      hovered = findItem(event.target);
      update();
    });
    group.addEventListener('pointerleave', () => { hovered = null; update(); });
    group.addEventListener('focusin', () => { hovered = null; update(); });
    group.addEventListener('focusout', () => queueMicrotask(update));
    group.addEventListener('scroll', update, { passive: true });
    new ResizeObserver(update).observe(group);
  }
}
