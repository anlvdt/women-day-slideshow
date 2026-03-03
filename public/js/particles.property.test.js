import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";
import { MAX_PARTICLES, createParticleEngine } from "./particles.js";

/**
 * Property P4: Tính ổn định của particle engine
 * Validates: Requirements 4.2, 4.3
 *
 * Invariants:
 * - particles.length ≤ MAX_PARTICLES at all times
 * - All surviving particles after update() have opacity > 0
 * - Dead particles (opacity ≤ 0 or y < -20) are removed after update()
 */

function createMockCanvas() {
  const ctx = {
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    fill: vi.fn(),
    globalAlpha: 1,
    fillStyle: "",
  };
  return {
    width: 800,
    height: 600,
    getContext: vi.fn(() => ctx),
  };
}

describe("Property P4: Particle engine stability", () => {
  /**
   * P4.1: Particle count stability
   * After any sequence of spawn() and update() calls,
   * particles.length <= MAX_PARTICLES always holds.
   *
   * **Validates: Requirements 4.2**
   */
  it("particles.length <= MAX_PARTICLES after any sequence of spawn/update operations", () => {
    // Generate a sequence of operations: true = spawn, false = update
    const operationArb = fc.array(fc.boolean(), { minLength: 1, maxLength: 200 });

    fc.assert(
      fc.property(operationArb, (operations) => {
        const canvas = createMockCanvas();
        const engine = createParticleEngine(canvas);

        for (const op of operations) {
          if (op) {
            engine.spawn();
          } else {
            engine.update();
          }
          expect(engine.particles.length).toBeLessThanOrEqual(MAX_PARTICLES);
        }
      })
    );
  });

  /**
   * P4.2: Particle opacity invariant
   * After any update(), all remaining particles have opacity > 0.
   *
   * **Validates: Requirements 4.3**
   */
  it("all surviving particles have opacity > 0 after update()", () => {
    const spawnCountArb = fc.integer({ min: 1, max: MAX_PARTICLES });
    const updateCountArb = fc.integer({ min: 1, max: 100 });

    fc.assert(
      fc.property(spawnCountArb, updateCountArb, (spawnCount, updateCount) => {
        const canvas = createMockCanvas();
        const engine = createParticleEngine(canvas);

        for (let i = 0; i < spawnCount; i++) {
          engine.spawn();
        }

        for (let i = 0; i < updateCount; i++) {
          engine.update();
          for (const p of engine.particles) {
            expect(p.opacity).toBeGreaterThan(0);
          }
        }
      })
    );
  });

  /**
   * P4.3: Dead particle removal
   * Particles with opacity <= 0 or y < -20 are always removed after update().
   *
   * **Validates: Requirements 4.3**
   */
  it("particles with opacity <= 0 or y < -20 are removed after update()", () => {
    const spawnCountArb = fc.integer({ min: 1, max: MAX_PARTICLES });

    fc.assert(
      fc.property(spawnCountArb, (spawnCount) => {
        const canvas = createMockCanvas();
        const engine = createParticleEngine(canvas);

        for (let i = 0; i < spawnCount; i++) {
          engine.spawn();
        }

        // Manually set some particles to dead state
        if (engine.particles.length > 0) {
          engine.particles[0].opacity = 0.001; // will become <= 0 after update
        }
        if (engine.particles.length > 1) {
          engine.particles[1].y = -19;
          engine.particles[1].speedY = -2; // will become < -20 after update
        }

        engine.update();

        // After update, no particle should have opacity <= 0 or y < -20
        for (const p of engine.particles) {
          expect(p.opacity).toBeGreaterThan(0);
          expect(p.y).toBeGreaterThanOrEqual(-20);
        }
      })
    );
  });
});
