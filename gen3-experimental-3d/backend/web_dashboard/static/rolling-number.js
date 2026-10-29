'use strict';

/**
 * Updates or initializes a rolling number element with animated digit columns.
 * @param {HTMLElement} element - Target container element
 * @param {number|string} target - Target value or formatted string
 * @param {Object} [options]
 * @param {number} [options.precision] - Decimal places if target is a number
 * @param {function} [options.format] - Custom string formatter
 * @param {number} [options.duration] - Animation duration in ms (default 420)
 * @param {function} [options.onAnimationStart] - Callback when rolling begins
 * @param {function} [options.onAnimationComplete] - Callback when rolling finishes
 */
function updateRollingNumber(element, target, options = {}) {
  if (!element) return;

  const duration = options.duration ?? 420;
  let text = '';
  if (typeof options.format === 'function') {
    text = options.format(target);
  } else if (typeof target === 'number') {
    text = typeof options.precision === 'number'
      ? target.toFixed(options.precision)
      : String(target);
  } else {
    text = String(target ?? '');
  }

  element.setAttribute('aria-label', text);
  if (!element.getAttribute('role')) {
    element.setAttribute('role', 'text');
  }

  // If already rendered with matching text, do nothing
  if (element.dataset.currentText === text) return;
  element.dataset.currentText = text;

  if (typeof options.onAnimationStart === 'function') {
    try { options.onAnimationStart(); } catch (e) { console.error(e); }
  }

  element.classList.add('rolling-number');

  // Match characters into columns
  const chars = Array.from(text);
  const currentCols = Array.from(element.children);

  // If column structure doesn't match, rebuild column layout
  const needsRebuild = currentCols.length !== chars.length || currentCols.some((col, idx) => {
    const isDigitCol = col.classList && col.classList.contains('rolling-digit');
    const isDigitChar = /\d/.test(chars[idx]);
    return isDigitCol !== isDigitChar;
  });

  if (needsRebuild) {
    element.replaceChildren();
    for (const ch of chars) {
      if (/\d/.test(ch)) {
        const colWrapper = document.createElement('span');
        colWrapper.className = 'rolling-digit';
        colWrapper.setAttribute('aria-hidden', 'true');
        const colInner = document.createElement('span');
        colInner.className = 'rolling-column';
        for (let d = 0; d <= 9; d++) {
          const digitSpan = document.createElement('span');
          digitSpan.textContent = String(d);
          colInner.appendChild(digitSpan);
        }
        colWrapper.appendChild(colInner);
        element.appendChild(colWrapper);
      } else {
        const charSpan = document.createElement('span');
        charSpan.className = 'rolling-char';
        charSpan.setAttribute('aria-hidden', 'true');
        charSpan.textContent = ch;
        element.appendChild(charSpan);
      }
    }
  }

  // Apply transforms
  const updatedCols = Array.from(element.children);
  chars.forEach((ch, idx) => {
    const col = updatedCols[idx];
    if (/\d/.test(ch)) {
      const inner = col.firstElementChild;
      if (inner) {
        const digit = parseInt(ch, 10);
        inner.style.transitionDuration = `${duration}ms`;
        inner.style.transform = `translateY(-${digit * 10}%)`;
      }
    } else {
      col.textContent = ch;
    }
  });

  if (typeof options.onAnimationComplete === 'function') {
    setTimeout(() => {
      try { options.onAnimationComplete(); } catch (e) { console.error(e); }
    }, duration);
  }
}

if (typeof module !== 'undefined') {
  module.exports = { updateRollingNumber };
}
