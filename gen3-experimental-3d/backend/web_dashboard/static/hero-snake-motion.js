/**
 * SurGe 090 Hero Snake Motion
 * -------------------------------------------------------------
 * Standalone autonomous serpentine locomotion simulation rendered
 * on a dedicated HTML5 2D canvas strictly constrained within .hero-section.
 *
 * Kinematics specification:
 * - 11 discrete links (1 head, 9 body segments, 1 tail)
 * - 10 articulated revolute joints connecting the links
 * - Joint limits: Hardware constrained to ±70° (±1.2217 rad), matching ST3215 servo limits
 * - Hirose Serpenoid locomotion wave propagation:
 *     theta_i(t) = A * sin(omega * t - i * alpha) + gamma_turn
 * - Organic autonomous wandering with smooth boundary repulsion field
 * - Retina / high-DPI canvas rendering with automatic ResizeObserver
 * - Zero external dependencies; pauses cleanly when tab is hidden
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.heroSnakeMotion = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  // Kinematic constants matching SurGe 090 physical robot
  const NUM_SEGMENTS = 11;
  const NUM_JOINTS = 10;
  const MAX_JOINT_LIMIT = 70 * (Math.PI / 180); // ±70° in radians (1.2217 rad)

  // Color palette (SurGe 090 Electric Blue + Ember + Carbon)
  const PALETTE = {
    headFill: '#f97316',        // Slush Ember
    headAccent: '#ea580c',      // Deep Ember
    bodyFill: '#0284c7',        // SurGe Electric Blue
    bodyFillAlt: '#0369a1',     // Alternating segment blue
    bodyStroke: '#0f172a',      // Slate Carbon outline
    jointCore: '#1e293b',       // Servo actuator chassis
    jointPin: '#e2e8f0',        // Titanium pivot pin
    jointAccent: '#38bdf8',     // Cyan telemetry LED
    tailLED: '#22c55e',         // Tail power LED
    headlight: '#38bdf8',       // Optical headlights
    headlightBeam: 'rgba(56, 189, 248, 0.25)',
    shadow: 'rgba(15, 23, 42, 0.12)',
  };

  class HeroSnakeMotion {
    constructor(canvasId = 'hero-snake-canvas', containerSelector = '.hero-section') {
      this.canvasId = canvasId;
      this.containerSelector = containerSelector;
      this.canvas = null;
      this.ctx = null;
      this.container = null;

      // Dimensions & Canvas Scaling
      this.width = 800;
      this.height = 220;
      this.dpr = 1;

      // Simulation parameters
      this.linkLength = 20;     // Segment spacing (pixels)
      this.speed = 82;          // Base forward speed (px/sec)
      this.waveFreq = 1.15;     // Undulation frequency (Hz)
      this.waveNum = 0.52;      // Inter-segment phase lag (rad/link)
      this.waveAmp = 0.38;      // Lateral undulation amplitude (rad ~22°)
      this.padding = 38;        // Boundary margin from edges (px)
      this.turnThreshold = 85;  // Boundary proximity where soft turn triggers (px)

      // Dynamic state
      this.segments = [];       // Array of 11 link positions {x, y, angle}
      this.jointAngles = [];    // Array of 10 relative angles
      this.currentHeading = 0;  // Current head orientation (rad)
      this.targetHeading = 0;   // Target steering orientation (rad)
      this.waveTime = 0;        // Undulation clock (sec)
      this.lastTime = 0;
      this.animId = null;
      this.isRunning = false;
      this.mouseTarget = null;  // Optional gentle cursor tracking {x, y}
      this.fluidTrail = null;
      this.fluidCanvas = null;

      // Event handlers / observers for clean teardown
      this._resizeObserver = null;
      this._visibilityHandler = null;
      this._mouseMoveHandler = null;
      this._mouseLeaveHandler = null;

      this.init();
    }

    init() {
      if (typeof document === 'undefined') return;

      this.canvas = document.getElementById(this.canvasId);
      this.container = document.querySelector(this.containerSelector);

      if (!this.canvas) {
        // Fallback: search for canvas in container
        if (this.container) {
          this.canvas = this.container.querySelector('canvas.hero-snake-canvas');
        }
      }

      if (!this.canvas || !this.canvas.getContext) {
        return;
      }

      this.ctx = this.canvas.getContext('2d');
      this.updateDimensions();
      this.resetKinematics();
      if (this.container && typeof window.createHeroFluidTrail === 'function') {
        this.fluidCanvas = document.createElement('canvas');
        this.fluidCanvas.className = 'hero-fluid-canvas';
        this.fluidCanvas.setAttribute('aria-hidden', 'true');
        this.container.insertBefore(this.fluidCanvas, this.canvas);
        this._fluidMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        this._fluidMotionHandler = () => {
          if (this.fluidTrail) this.fluidTrail.destroy();
          this.fluidTrail = null;
          this.fluidCanvas.style.display = this._fluidMotionQuery.matches ? 'none' : 'block';
          if (!this._fluidMotionQuery.matches) {
            this.fluidTrail = window.createHeroFluidTrail(this.fluidCanvas);
          }
        };
        this._fluidMotionQuery.addEventListener('change', this._fluidMotionHandler);
        this._fluidMotionHandler();
      }

      // Setup ResizeObserver for responsive boundary adaptation
      if (typeof ResizeObserver !== 'undefined' && this.container) {
        this._resizeObserver = new ResizeObserver(() => {
          this.updateDimensions();
          this.clampAllInsideBounds();
        });
        this._resizeObserver.observe(this.container);
      } else {
        window.addEventListener('resize', () => {
          this.updateDimensions();
          this.clampAllInsideBounds();
        });
      }

      // Setup Visibility Change Handler (pause when backgrounded to preserve CPU)
      this._visibilityHandler = () => {
        if (document.hidden) {
          this.stop();
        } else {
          this.start();
        }
      };
      document.addEventListener('visibilitychange', this._visibilityHandler);

      // Interaction: Snake follows the cursor ONLY when the cursor is strictly inside the
      // hero section box (.hero-section). Outside this box, it follows its regular autonomous path.
      const container = this.container || this.canvas;
      if (container) {
        this._mouseMoveHandler = (e) => {
          if (!this.canvas) return;
          const box = container.getBoundingClientRect();
          // Check strictly if cursor is inside the hero box
          if (
            e.clientX >= box.left &&
            e.clientX <= box.right &&
            e.clientY >= box.top &&
            e.clientY <= box.bottom
          ) {
            const canvasRect = this.canvas.getBoundingClientRect();
            const rawX = e.clientX - canvasRect.left;
            const rawY = e.clientY - canvasRect.top;
            const targetX = Math.max(this.padding + 10, Math.min(this.width - this.padding - 10, rawX));
            const targetY = Math.max(this.padding + 10, Math.min(this.height - this.padding - 10, rawY));
            this.mouseTarget = { x: targetX, y: targetY };
          } else {
            // Outside the hero box: follow regular autonomous path
            this.mouseTarget = null;
          }
        };

        this._mouseLeaveHandler = () => {
          this.mouseTarget = null;
        };

        this._windowBlurHandler = () => {
          this.mouseTarget = null;
        };

        container.addEventListener('mouseleave', this._mouseLeaveHandler);
        if (typeof document !== 'undefined') {
          document.addEventListener('mousemove', this._mouseMoveHandler);
        }
        if (typeof window !== 'undefined') {
          window.addEventListener('blur', this._windowBlurHandler);
        }
      }

      this.start();
    }

    updateDimensions() {
      if (!this.canvas) return;
      const rect = this.container ? this.container.getBoundingClientRect() : this.canvas.getBoundingClientRect();
      const w = Math.max(280, Math.round(rect.width || this.canvas.clientWidth || 800));
      const h = Math.max(140, Math.round(rect.height || this.canvas.clientHeight || 220));

      this.width = w;
      this.height = h;
      this.dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

      this.canvas.width = Math.round(w * this.dpr);
      this.canvas.height = Math.round(h * this.dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';

      // Adaptive link length based on container height
      this.linkLength = Math.max(16, Math.min(24, Math.round(h * 0.095)));
      this.padding = Math.max(28, Math.min(48, Math.round(h * 0.16)));
      this.turnThreshold = Math.max(60, Math.min(100, Math.round(h * 0.38)));
      if (this.fluidTrail) this.fluidTrail.clear();
    }

    resetKinematics() {
      this.segments = [];
      this.jointAngles = new Array(NUM_JOINTS).fill(0);

      // Place initial snake centrally with heading pointing rightward (+X)
      const startX = Math.round(this.width * 0.45);
      const startY = Math.round(this.height * 0.5);
      this.currentHeading = 0.15;
      this.targetHeading = 0.15;
      this.waveTime = 0;

      // Initialize all 11 segments
      for (let i = 0; i < NUM_SEGMENTS; i++) {
        this.segments.push({
          x: startX - i * this.linkLength,
          y: startY + Math.sin(i * this.waveNum) * 8,
          angle: 0
        });
      }
    }

    clampAllInsideBounds() {
      const minX = this.padding;
      const maxX = this.width - this.padding;
      const minY = this.padding;
      const maxY = this.height - this.padding;

      for (let i = 0; i < this.segments.length; i++) {
        this.segments[i].x = Math.max(minX, Math.min(maxX, this.segments[i].x));
        this.segments[i].y = Math.max(minY, Math.min(maxY, this.segments[i].y));
      }
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.lastTime = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
      this.loop = this.loop.bind(this);
      if (typeof requestAnimationFrame !== 'undefined') {
        this.animId = requestAnimationFrame(this.loop);
      }
    }

    stop() {
      this.isRunning = false;
      if (this.animId && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    }

    loop(timestamp) {
      if (!this.isRunning) return;

      const now = (typeof performance !== 'undefined' ? performance.now() : timestamp) / 1000;
      let dt = now - this.lastTime;
      this.lastTime = now;

      // Cap delta time to prevent physics explosions on frame stutter / tab switch
      if (dt > 0.1) dt = 0.033;
      if (dt <= 0) dt = 0.016;

      this.update(dt);
      if (this.fluidTrail) {
        this.fluidTrail.advance(this.segments[NUM_SEGMENTS - 1], this.width, this.height, dt, this.waveTime);
      }
      this.render();

      if (this.isRunning && typeof requestAnimationFrame !== 'undefined') {
        this.animId = requestAnimationFrame(this.loop);
      }
    }

    update(dt) {
      this.waveTime += dt;

      // Check if user prefers reduced motion
      const prefersReduced = typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const speedScale = prefersReduced ? 0.3 : 1.0;

      // 1. Strict Boundary Repulsion Field
      // Ensures the head smoothly turns away from all 4 walls well before touching
      const head = this.segments[0];
      const minX = this.padding;
      const maxX = this.width - this.padding;
      const minY = this.padding;
      const maxY = this.height - this.padding;

      let repulseX = 0;
      let repulseY = 0;

      // Left wall
      if (head.x < minX + this.turnThreshold) {
        const d = Math.max(1, head.x - minX);
        const strength = Math.pow(1 - d / this.turnThreshold, 2);
        repulseX += strength;
      }
      // Right wall
      if (head.x > maxX - this.turnThreshold) {
        const d = Math.max(1, maxX - head.x);
        const strength = Math.pow(1 - d / this.turnThreshold, 2);
        repulseX -= strength;
      }
      // Top wall
      if (head.y < minY + this.turnThreshold) {
        const d = Math.max(1, head.y - minY);
        const strength = Math.pow(1 - d / this.turnThreshold, 2);
        repulseY += strength;
      }
      // Bottom wall
      if (head.y > maxY - this.turnThreshold) {
        const d = Math.max(1, maxY - head.y);
        const strength = Math.pow(1 - d / this.turnThreshold, 2);
        repulseY -= strength;
      }

      const repulseMagnitude = Math.hypot(repulseX, repulseY);

      // 2. Autonomous Random Motion or Active Cursor Following
      if (this.mouseTarget) {
        // Cursor is in dashboard: actively steer towards cursor
        const dx = this.mouseTarget.x - head.x;
        const dy = this.mouseTarget.y - head.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 28) {
          const toMouseAngle = Math.atan2(dy, dx);
          if (repulseMagnitude > 0.08) {
            // Near wall: blend steering inward while pursuing cursor
            const boundaryAvoidAngle = Math.atan2(repulseY, repulseX);
            const blended = this.blendAngle(toMouseAngle, boundaryAvoidAngle, 0.45);
            this.targetHeading = this.blendAngle(this.targetHeading, blended, Math.min(1.0, 5.5 * dt));
          } else {
            this.targetHeading = this.blendAngle(this.targetHeading, toMouseAngle, Math.min(1.0, 6.0 * dt));
          }
        } else {
          // Reached cursor: orbit/circle softly around it
          const orbitAngle = Math.atan2(dy, dx) + Math.PI / 2;
          this.targetHeading = this.blendAngle(this.targetHeading, orbitAngle, Math.min(1.0, 3.5 * dt));
        }
        this.wanderAngle = this.targetHeading;
      } else {
        // Cursor not in dashboard: continuous autonomous random serpentine wandering
        if (this.wanderAngle === undefined) this.wanderAngle = this.currentHeading;
        const wanderNoise = (Math.random() - 0.5) * 2.8 * dt;
        this.wanderAngle += wanderNoise;
        this.targetHeading = this.wanderAngle;

        if (repulseMagnitude > 0.001) {
          const boundaryAvoidAngle = Math.atan2(repulseY, repulseX);
          const blendFactor = Math.min(1.0, repulseMagnitude * 3.5 * dt * 4.0);
          this.targetHeading = this.blendAngle(this.targetHeading, boundaryAvoidAngle, blendFactor);
          this.wanderAngle = this.targetHeading;
        }
      }

      // Smoothly steer current heading towards target heading
      this.currentHeading = this.blendAngle(this.currentHeading, this.targetHeading, Math.min(1.0, 5.0 * dt));

      // 3. Hirose Serpenoid Head Undulation Wave
      const waveOffset = this.waveAmp * Math.sin(2 * Math.PI * this.waveFreq * this.waveTime);
      const effectiveHeadAngle = this.currentHeading + waveOffset;

      // 4. Advance Head
      const v = this.speed * speedScale;
      head.x += Math.cos(effectiveHeadAngle) * v * dt;
      head.y += Math.sin(effectiveHeadAngle) * v * dt;
      head.angle = effectiveHeadAngle;

      // Hard clamp safety to strictly preserve .hero-section containment
      if (head.x < minX) {
        head.x = minX;
        this.targetHeading = 0; // Turn right
      } else if (head.x > maxX) {
        head.x = maxX;
        this.targetHeading = Math.PI; // Turn left
      }
      if (head.y < minY) {
        head.y = minY;
        this.targetHeading = Math.PI / 2; // Turn down
      } else if (head.y > maxY) {
        head.y = maxY;
        this.targetHeading = -Math.PI / 2; // Turn up
      }

      // 5. Follow-the-Leader Kinematics with Hardware Joint Angle Clamp (±70°)
      for (let i = 1; i < NUM_SEGMENTS; i++) {
        const prev = this.segments[i - 1];
        const curr = this.segments[i];

        // Desired vector from current to predecessor
        const dx = prev.x - curr.x;
        const dy = prev.y - curr.y;
        let angleToPrev = Math.atan2(dy, dx);

        // Hardware joint limit constraint relative to predecessor link
        let relAngle = this.normalizeAngle(angleToPrev - prev.angle);
        if (relAngle > MAX_JOINT_LIMIT) {
          relAngle = MAX_JOINT_LIMIT;
          angleToPrev = prev.angle + relAngle;
        } else if (relAngle < -MAX_JOINT_LIMIT) {
          relAngle = -MAX_JOINT_LIMIT;
          angleToPrev = prev.angle + relAngle;
        }

        // Record joint angle for robotics telemetry & testing
        this.jointAngles[i - 1] = relAngle;

        // Enforce rigid link length constraint
        curr.x = prev.x - Math.cos(angleToPrev) * this.linkLength;
        curr.y = prev.y - Math.sin(angleToPrev) * this.linkLength;
        curr.angle = angleToPrev;

        // Keep body segments within boundary
        curr.x = Math.max(minX - 10, Math.min(maxX + 10, curr.x));
        curr.y = Math.max(minY - 10, Math.min(maxY + 10, curr.y));
      }
    }

    render() {
      if (!this.ctx) return;
      const ctx = this.ctx;

      // Clear full canvas
      ctx.save();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.width, this.height);

      // Draw soft ambient depth shadows under all 11 segments
      this.renderShadows(ctx);

      // Draw 10 articulated joint pivot chassis/horns
      this.renderJoints(ctx);

      // Draw the 11 robot segment modules (Tail to Head for natural layering)
      for (let i = NUM_SEGMENTS - 1; i >= 0; i--) {
        this.renderSegment(ctx, i);
      }

      ctx.restore();
    }

    renderShadows(ctx) {
      ctx.save();
      ctx.fillStyle = PALETTE.shadow;
      for (let i = 0; i < NUM_SEGMENTS; i++) {
        const seg = this.segments[i];
        const radius = i === 0 ? 11 : (i === NUM_SEGMENTS - 1 ? 7 : 9);
        ctx.beginPath();
        ctx.ellipse(seg.x + 3, seg.y + 7, radius + 2, radius * 0.65, seg.angle, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    renderJoints(ctx) {
      ctx.save();
      for (let i = 0; i < NUM_JOINTS; i++) {
        const sA = this.segments[i];
        const sB = this.segments[i + 1];
        const midX = (sA.x + sB.x) / 2;
        const midY = (sA.y + sB.y) / 2;

        // Connector link beam
        ctx.beginPath();
        ctx.strokeStyle = PALETTE.jointCore;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.moveTo(sA.x, sA.y);
        ctx.lineTo(sB.x, sB.y);
        ctx.stroke();

        // High-torque servo actuator pivot disc
        ctx.beginPath();
        ctx.fillStyle = PALETTE.jointCore;
        ctx.arc(midX, midY, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Titanium center pin
        ctx.beginPath();
        ctx.fillStyle = PALETTE.jointPin;
        ctx.arc(midX, midY, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    renderSegment(ctx, index) {
      const seg = this.segments[index];
      const isHead = index === 0;
      const isTail = index === NUM_SEGMENTS - 1;

      ctx.save();
      ctx.translate(seg.x, seg.y);
      ctx.rotate(seg.angle);

      if (isHead) {
        // --- Head Segment (SurGe Ember Module with Optical Beams) ---
        // Forward optical headlights glow
        const glowGrad = ctx.createRadialGradient(10, 0, 2, 22, 0, 28);
        glowGrad.addColorStop(0, PALETTE.headlightBeam);
        glowGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.moveTo(8, -6);
        ctx.lineTo(38, -18);
        ctx.lineTo(38, 18);
        ctx.lineTo(8, 6);
        ctx.closePath();
        ctx.fill();

        // Head Capsule Body
        const headGrad = ctx.createLinearGradient(-10, -11, 10, 11);
        headGrad.addColorStop(0, '#fb923c');
        headGrad.addColorStop(0.5, PALETTE.headFill);
        headGrad.addColorStop(1, PALETTE.headAccent);

        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(-10, -10, 22, 20, 8) : ctx.rect(-10, -10, 22, 20);
        ctx.fillStyle = headGrad;
        ctx.fill();
        ctx.strokeStyle = PALETTE.bodyStroke;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Nose Sensor Cone
        ctx.beginPath();
        ctx.arc(10, 0, 6, -Math.PI / 2, Math.PI / 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();

        // Dual Headlights / Stereo Vision
        ctx.fillStyle = PALETTE.headlight;
        ctx.beginPath();
        ctx.arc(7, -5, 2.2, 0, Math.PI * 2);
        ctx.arc(7, 5, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Head glossy reflection
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.moveTo(-6, -7);
        ctx.lineTo(4, -7);
        ctx.stroke();

      } else if (isTail) {
        // --- Tail Segment (Tapered Hydrodynamic Module with Power LED) ---
        const tailGrad = ctx.createLinearGradient(-8, -7, 8, 7);
        tailGrad.addColorStop(0, PALETTE.bodyFill);
        tailGrad.addColorStop(1, PALETTE.bodyFillAlt);

        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(-8, -7, 16, 14, [4, 7, 7, 4]) : ctx.rect(-8, -7, 16, 14);
        ctx.fillStyle = tailGrad;
        ctx.fill();
        ctx.strokeStyle = PALETTE.bodyStroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Tail telemetry status LED (Mint green)
        ctx.beginPath();
        ctx.fillStyle = PALETTE.tailLED;
        ctx.arc(-4, 0, 2, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // --- Standard Body Segment (Electric Blue SurGe 090 Link) ---
        const fillCol = (index % 2 === 0) ? PALETTE.bodyFill : PALETTE.bodyFillAlt;
        const segGrad = ctx.createLinearGradient(-9, -8, 9, 8);
        segGrad.addColorStop(0, '#38bdf8');
        segGrad.addColorStop(0.3, fillCol);
        segGrad.addColorStop(1, '#0369a1');

        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(-9, -8, 18, 16, 6) : ctx.rect(-9, -8, 18, 16);
        ctx.fillStyle = segGrad;
        ctx.fill();
        ctx.strokeStyle = PALETTE.bodyStroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Link Top Specular Highlight
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
        ctx.lineWidth = 1;
        ctx.moveTo(-5, -5.5);
        ctx.lineTo(5, -5.5);
        ctx.stroke();

        // Micro-link ID badge (clean indicator dot)
        ctx.beginPath();
        ctx.fillStyle = '#0f172a';
        ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    blendAngle(a, b, t) {
      let diff = this.normalizeAngle(b - a);
      return a + diff * t;
    }

    normalizeAngle(a) {
      while (a > Math.PI) a -= Math.PI * 2;
      while (a < -Math.PI) a += Math.PI * 2;
      return a;
    }

    // Public API Methods & Diagnostics
    getState() {
      const minX = this.padding;
      const maxX = this.width - this.padding;
      const minY = this.padding;
      const maxY = this.height - this.padding;

      const allInside = this.segments.every(s =>
        s.x >= minX - 15 && s.x <= maxX + 15 && s.y >= minY - 15 && s.y <= maxY + 15
      );

      return {
        numSegments: this.segments.length,
        numJoints: this.jointAngles.length,
        maxJointLimit: MAX_JOINT_LIMIT,
        isRunning: this.isRunning,
        width: this.width,
        height: this.height,
        headPosition: this.segments[0] ? { x: this.segments[0].x, y: this.segments[0].y } : null,
        tailPosition: this.segments[NUM_SEGMENTS - 1] ? { x: this.segments[NUM_SEGMENTS - 1].x, y: this.segments[NUM_SEGMENTS - 1].y } : null,
        allSegmentsInsideBounds: allInside,
        jointAngles: [...this.jointAngles],
      };
    }

    setSpeed(newSpeed) {
      this.speed = Math.max(20, Math.min(200, Number(newSpeed) || 82));
    }

    destroy() {
      this.stop();
      if (this._fluidMotionQuery) {
        this._fluidMotionQuery.removeEventListener('change', this._fluidMotionHandler);
      }
      if (this.fluidTrail) this.fluidTrail.destroy();
      if (this.fluidCanvas) this.fluidCanvas.remove();
      this.fluidTrail = null;
      this.fluidCanvas = null;
      if (this._resizeObserver) {
        this._resizeObserver.disconnect();
        this._resizeObserver = null;
      }
      if (this._visibilityHandler) {
        document.removeEventListener('visibilitychange', this._visibilityHandler);
        this._visibilityHandler = null;
      }
      if (typeof document !== 'undefined') {
        if (this._mouseMoveHandler) document.removeEventListener('mousemove', this._mouseMoveHandler);
        if (this._mouseLeaveHandler) document.removeEventListener('mouseleave', this._mouseLeaveHandler);
      }
      if (typeof window !== 'undefined' && this._windowBlurHandler) {
        window.removeEventListener('blur', this._windowBlurHandler);
      }
      if (this.container) {
        if (this._mouseMoveHandler) this.container.removeEventListener('mousemove', this._mouseMoveHandler);
        if (this._mouseLeaveHandler) this.container.removeEventListener('mouseleave', this._mouseLeaveHandler);
      }
      if (this.canvas && this.ctx) {
        this.ctx.clearRect(0, 0, this.width, this.height);
      }
    }
  }

  // Factory initializer
  function initHeroSnakeMotion(canvasId, containerSelector) {
    return new HeroSnakeMotion(canvasId, containerSelector);
  }

  // Auto-boot on DOM ready if canvas exists
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.heroSnakeMotionInstance = initHeroSnakeMotion();
      });
    } else {
      window.heroSnakeMotionInstance = initHeroSnakeMotion();
    }
  }

  return {
    HeroSnakeMotion,
    initHeroSnakeMotion,
    NUM_SEGMENTS,
    NUM_JOINTS,
    MAX_JOINT_LIMIT,
  };
});
