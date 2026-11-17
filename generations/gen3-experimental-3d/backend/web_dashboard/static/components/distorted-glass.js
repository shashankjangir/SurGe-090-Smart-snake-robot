'use strict';

/**
 * DistortedGlass - Interactive SVG fractal noise displacement & glassmorphism effect.
 * Inspired by Cult UI / 21st.dev DistortedGlass component.
 */

const DISTORTED_GLASS_SVG_ID = 'distorted-glass-defs-svg';

function createDistortedGlassDefs() {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.id = DISTORTED_GLASS_SVG_ID;
  svg.setAttribute('class', 'distorted-glass-defs');
  svg.setAttribute('aria-hidden', 'true');

  svg.innerHTML = `
    <defs>
      <!-- Liquid Distorted Glass Filter for Headers & Headlines -->
      <filter id="distorted-glass-filter" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
        <feTurbulence id="glass-turbulence" type="fractalNoise" baseFrequency="0.04 0.08" numOctaves="3" result="noise" seed="42" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G" result="displaced" />
        <feGaussianBlur in="displaced" stdDeviation="0.4" result="blurred" />
        <feMerge>
          <feMergeNode in="blurred" />
        </feMerge>
      </filter>

      <!-- Headlight Glass Lens Filter with Specular Light Point -->
      <filter id="headlight-glass-filter" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.06 0.12" numOctaves="2" result="noise" seed="17" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="B" result="displaced" />
        <feSpecularLighting in="noise" surfaceScale="2" specularConstant="1.2" specularExponent="20" lighting-color="#ffffff" result="specular">
          <fePointLight x="-50" y="-100" z="200" />
        </feSpecularLighting>
        <feComposite in="specular" in2="displaced" operator="in" result="specularDisplaced" />
        <feMerge>
          <feMergeNode in="displaced" />
          <feMergeNode in="specularDisplaced" />
        </feMerge>
      </filter>
    </defs>
  `;
  return svg;
}

function initDistortedGlass(options = {}) {
  if (typeof document === 'undefined') return;

  // 1. Ensure SVG defs are in DOM
  if (!document.getElementById(DISTORTED_GLASS_SVG_ID)) {
    const defs = createDistortedGlassDefs();
    document.body.prepend(defs);
  }

  // 2. Apply classes to headlines, top-nav, and headlights
  const topNav = document.querySelector('.top-nav');
  if (topNav) {
    topNav.classList.add('distorted-glass-header');
  }

  const headlines = document.querySelectorAll('.display-headline');
  headlines.forEach(headline => {
    headline.classList.add('distorted-glass-headline');
  });

  const headlights = document.querySelectorAll('.status-indicator .dot, #status-dot');
  headlights.forEach(hl => {
    hl.classList.add('headlight-glass');
  });

  const logoBadge = document.querySelector('.logo-badge');
  if (logoBadge) {
    logoBadge.classList.add('distorted-glass-logo');
  }

  // 3. Interactive glass refraction on mouse movement (parallax effect)
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reducedMotion) {
    const turbulence = document.getElementById('glass-turbulence');
    const hero = document.querySelector('.hero-section');
    if (turbulence && hero) {
      hero.addEventListener('mousemove', (e) => {
        const rect = hero.getBoundingClientRect();
        const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        const baseFreqX = (0.035 + normX * 0.015).toFixed(4);
        const baseFreqY = (0.075 + normY * 0.015).toFixed(4);
        turbulence.setAttribute('baseFrequency', `${baseFreqX} ${baseFreqY}`);
      });
    }
  }
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initDistortedGlass());
  } else {
    initDistortedGlass();
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    DISTORTED_GLASS_SVG_ID,
    createDistortedGlassDefs,
    initDistortedGlass
  };
}
