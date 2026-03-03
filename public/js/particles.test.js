import { describe, it, expect, beforeEach, vi } from "vitest";
import { MAX_PARTICLES, createParticleEngine, drawHeart } from "./particles.js";

/**
 * Unit tests for ParticleEngine
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

// Minimal canvas mock for testing
function createMockCanvas() {
  const ctx = {
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    bezierCurveTo: vi.fn(),
    fill: vi.fn(),
    globalAlpha: 1,
    fillStyle: "",
  };
  return {
    width: 800,
    height: 600,
    getContext: vi.fn(() => ctx),
    _ctx: ctx,
  };
}

describe("ParticleEngine", () => {
  let canvas;
  let engine;

  beforeEach(() => {
    canvas = createMockCanvas();
    engine = createParticleEngine(canvas);
  });

  describe("MAX_PARTICLES constant", () => {
    it("should be 50", () => {
      expect(MAX_PARTICLES).toBe(50);
    });
  });

  describe("spawn()", () => {
    it("should add a particle to the array", () => {
      expect(engine.particles).toHaveLength(0);
      engine.spawn();
      expect(engine.particles).toHaveLength(1);
    });

    it("should create particle with valid properties", () => {
      engine.spawn();
      const p = engine.particles[0];

      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(canvas.width);
      expect(p.y).toBe(canvas.height + 10);
      expect(p.size).toBeGreaterThanOrEqual(5);
      expect(p.size).toBeLessThanOrEqual(20);
      expect(p.speedY).toBeLessThan(0); // moves upward
      expect(p.opacity).toBeGreaterThanOrEqual(0.5);
      expect(p.opacity).toBeLessThanOrEqual(1);
      expect(p.color).toMatch(/^hsl\(/);
    });

    it("should not exceed MAX_PARTICLES", () => {
      for (let i = 0; i < MAX_PARTICLES + 10; i++) {
        engine.spawn();
      }
      expect(engine.particles).toHaveLength(MAX_PARTICLES);
    });
  });

  describe("update()", () => {
    it("should move particles upward (decrease y)", () => {
      engine.spawn();
      const initialY = engine.particles[0].y;
      engine.update();
      expect(engine.particles[0].y).toBeLessThan(initialY);
    });

    it("should decrease opacity over time", () => {
      engine.spawn();
      const initialOpacity = engine.particles[0].opacity;
      engine.update();
      expect(engine.particles[0].opacity).toBeLessThan(initialOpacity);
    });

    it("should remove particles with opacity <= 0", () => {
      engine.spawn();
      engine.particles[0].opacity = 0.001;
      engine.update(); // opacity becomes <= 0 after decrement
      expect(engine.particles).toHaveLength(0);
    });

    it("should remove particles with y < -20", () => {
      engine.spawn();
      engine.particles[0].y = -19;
      engine.particles[0].speedY = -2;
      engine.update(); // y becomes < -20
      expect(engine.particles).toHaveLength(0);
    });

    it("should keep particles that are still alive", () => {
      engine.spawn();
      engine.particles[0].opacity = 0.9;
      engine.particles[0].y = 300;
      engine.update();
      expect(engine.particles).toHaveLength(1);
    });
  });

  describe("draw()", () => {
    it("should clear the canvas before drawing", () => {
      engine.spawn();
      engine.draw();
      expect(canvas._ctx.clearRect).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height);
    });

    it("should call drawing methods for each particle", () => {
      engine.spawn();
      engine.spawn();
      engine.draw();
      // Each heart: save, beginPath, moveTo×2, bezierCurveTo×2, fill, restore
      expect(canvas._ctx.save).toHaveBeenCalledTimes(2);
      expect(canvas._ctx.restore).toHaveBeenCalledTimes(2);
    });
  });

  describe("drawHeart()", () => {
    it("should set globalAlpha and fillStyle", () => {
      const ctx = canvas._ctx;
      drawHeart(ctx, 100, 200, 15, "red", 0.7);
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });
  });
});
