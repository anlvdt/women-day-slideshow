/**
 * ParticleEngine — Heart particle animation on canvas overlay
 *
 * Exports:
 *   - animateHearts(canvas): main entry point, starts animation loop
 *   - createParticleEngine(canvas): factory returning { particles, spawn, update, draw, animate }
 *   - MAX_PARTICLES: constant (50)
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

export const MAX_PARTICLES = 50;

/**
 * Draw a heart shape using bezier curves.
 */
export function drawHeart(ctx, x, y, size, color, opacity) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.beginPath();
  const topY = y - size * 0.4;
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x - size / 2, topY, x - size, y, x, y + size * 0.6);
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x + size / 2, topY, x + size, y, x, y + size * 0.6);
  ctx.fill();
  ctx.restore();
}

/**
 * Draw a star shape.
 */
export function drawStar(ctx, x, y, size, color, opacity) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.beginPath();
  const spikes = 5;
  const outerR = size * 0.5;
  const innerR = outerR * 0.4;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / spikes) * i - Math.PI / 2;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Create a particle engine bound to a canvas.
 * Returns an object with internal state + methods for testability.
 *
 * @param {HTMLCanvasElement} canvas
 * @returns {{ particles: Array, spawn: Function, update: Function, draw: Function, animate: Function }}
 */
export function createParticleEngine(canvas) {
  const ctx = canvas.getContext("2d");
  const particles = [];

  /** Resize canvas to match window dimensions */
  function resizeCanvas() {
    if (typeof window !== "undefined") {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }

  resizeCanvas();
  if (typeof window !== "undefined") {
    let _resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(resizeCanvas, 150);
    });
  }

  /**
   * Spawn a new heart particle at the bottom of the canvas.
   * Does nothing if particles.length >= MAX_PARTICLES.
   */
  function spawn() {
    if (particles.length >= MAX_PARTICLES) return;

    particles.push({
      x: Math.random() * canvas.width,
      y: canvas.height + 10,
      size: 5 + Math.random() * 15,
      speedY: -(1 + Math.random() * 2),
      speedX: (Math.random() - 0.5) * 1,
      opacity: 0.5 + Math.random() * 0.5,
      color: `hsl(${340 + Math.random() * 30}, 80%, ${60 + Math.random() * 20}%)`,
      shape: Math.random() < 0.75 ? 'heart' : 'star',
    });
  }

  /**
   * Update all particles: move them, fade opacity, remove dead ones.
   * Removes particles with opacity <= 0 or y < -20.
   */
  function update() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.y += p.speedY;
      p.x += p.speedX;
      p.opacity -= 0.003;

      if (p.opacity <= 0 || p.y < -20) {
        particles.splice(i, 1);
      }
    }
  }

  /**
   * Draw all living particles onto the canvas.
   */
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      if (p.shape === 'star') {
        drawStar(ctx, p.x, p.y, p.size, p.color, p.opacity);
      } else {
        drawHeart(ctx, p.x, p.y, p.size, p.color, p.opacity);
      }
    }
  }

  /**
   * Main animation loop: spawn (10% chance), update, draw, repeat.
   * Can be stopped via stop().
   */
  let animationId = null;

  function animate() {
    if (Math.random() < 0.1) spawn();
    update();
    draw();
    animationId = requestAnimationFrame(animate);
  }

  /**
   * Stop the animation loop and clear all particles.
   */
  function stop() {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    particles.length = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return { particles, spawn, update, draw, animate, stop };
}

/**
 * Main entry point — start heart particle animation on the given canvas.
 * Resizes canvas to window dimensions and begins the animation loop.
 *
 * @param {HTMLCanvasElement} canvas
 */
export function animateHearts(canvas) {
  const engine = createParticleEngine(canvas);
  engine.animate();
  return engine;
}
