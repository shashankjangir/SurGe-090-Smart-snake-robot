/**
 * Morphing Button - Operator Password Login Component
 * Vanilla ES6 implementation adapted from MorphingButton (React / Motion)
 */
(function() {
  'use strict';

  function initMorphingPassword() {
    const container = document.getElementById('morphing-password-container');
    const input = document.getElementById('login-password');
    const actionBtn = document.getElementById('btn-login');
    const label = document.getElementById('morphing-btn-label');
    const form = document.getElementById('operator-login-form');
    const toggleBtn = document.getElementById('btn-toggle-password');

    if (!container || !input || !actionBtn) return null;

    let isExpanded = false;
    let isPasswordVisible = false;

    function setPasswordVisibility(visible) {
      isPasswordVisible = visible;
      input.type = isPasswordVisible ? 'text' : 'password';
      if (toggleBtn) {
        const eyeShow = toggleBtn.querySelector ? toggleBtn.querySelector('.eye-show') : null;
        const eyeHide = toggleBtn.querySelector ? toggleBtn.querySelector('.eye-hide') : null;
        if (eyeShow && eyeHide && eyeShow.style && eyeHide.style) {
          eyeShow.style.display = isPasswordVisible ? 'none' : 'block';
          eyeHide.style.display = isPasswordVisible ? 'block' : 'none';
        }
        toggleBtn.setAttribute('title', isPasswordVisible ? 'Hide password' : 'Show password');
        toggleBtn.setAttribute('aria-label', isPasswordVisible ? 'Hide password' : 'Show password');
      }
    }

    function focusInput() {
      if (!input) return;
      try {
        input.focus({ preventScroll: true });
        const len = input.value ? input.value.length : 0;
        if (typeof input.setSelectionRange === 'function') {
          input.setSelectionRange(len, len);
        }
      } catch (e) {}
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setPasswordVisibility(!isPasswordVisible);
        focusInput();
      });
    }

    function expand() {
      if (isExpanded) {
        focusInput();
        return;
      }
      isExpanded = true;
      input.tabIndex = 0;
      if (toggleBtn) toggleBtn.tabIndex = 0;
      container.classList.add('is-expanded');
      actionBtn.setAttribute('aria-expanded', 'true');
      if (label) label.textContent = 'Login →';
      // Immediate and staged focus to ensure cursor is active in password box
      focusInput();
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => focusInput());
      }
      setTimeout(focusInput, 40);
      setTimeout(focusInput, 120);
      setTimeout(focusInput, 240);
    }

    function collapse() {
      if (!isExpanded) return;
      isExpanded = false;
      input.tabIndex = -1;
      if (toggleBtn) toggleBtn.tabIndex = -1;
      container.classList.remove('is-expanded');
      container.classList.remove('has-error');
      actionBtn.setAttribute('aria-expanded', 'false');
      if (label) label.textContent = 'Password';
      setPasswordVisibility(false);
    }

    function shake() {
      container.classList.remove('has-error');
      // Force reflow to re-trigger animation
      void container.offsetWidth;
      container.classList.add('has-error');
      setTimeout(() => {
        container.classList.remove('has-error');
      }, 450);
      try {
        input.focus();
        input.select();
      } catch (e) {}
    }

    // Live update as operator writes password: clear errors immediately
    input.addEventListener('input', () => {
      container.classList.remove('has-error');
      const errEl = document.getElementById('login-error');
      if (errEl) errEl.style.display = 'none';
    });

    // Toggle button handler
    actionBtn.addEventListener('click', (e) => {
      if (!isExpanded) {
        e.preventDefault();
        e.stopPropagation();
        expand();
        focusInput();
      } else {
        const val = input.value.trim();
        if (!val) {
          e.preventDefault();
          shake();
        } else {
          // If inside a form and type="submit", letting it proceed or requesting submit
          if (form) {
            e.preventDefault();
            form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        }
      }
    });

    // Clicking anywhere on the pill container expands or focuses the input
    container.addEventListener('click', (e) => {
      if (!isExpanded) {
        expand();
      } else if (e.target !== actionBtn && !actionBtn.contains(e.target) && e.target !== toggleBtn && (!toggleBtn || !toggleBtn.contains(e.target))) {
        focusInput();
      }
    });

    // Handle Enter and Escape in password input
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = input.value.trim();
        if (!val) {
          e.preventDefault();
          shake();
        } else if (form) {
          e.preventDefault();
          form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        collapse();
        actionBtn.focus();
      }
    });

    // Click outside listener
    document.addEventListener('mousedown', (e) => {
      if (isExpanded && container && !container.contains(e.target)) {
        collapse();
      }
    });

    const api = {
      expand,
      collapse,
      shake,
      isExpanded: () => isExpanded,
      isPasswordVisible: () => isPasswordVisible,
      setPasswordVisibility,
    };

    window.morphingPasswordButton = api;
    return api;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMorphingPassword);
  } else {
    initMorphingPassword();
  }

  // CommonJS export for Node test runner
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initMorphingPassword };
  }
})();
