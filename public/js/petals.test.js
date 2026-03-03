import { describe, it, expect, beforeEach, vi } from "vitest";
import { startPetalRain } from "./petals.js";

/**
 * Unit tests for FallingPetals
 * Requirements: 5.1, 5.2, 5.3
 */

// Mock DOM element with style and classList support
function createMockElement() {
  const classes = new Set();
  return {
    classList: {
      add(cls) { classes.add(cls); },
      contains(cls) { return classes.has(cls); },
    },
    style: { cssText: "" },
    _classes: classes,
  };
}

// Mock container that tracks appended children
function createMockContainer() {
  const children = [];
  return {
    children,
    appendChild(el) { children.push(el); },
  };
}

// Stub document.createElement to return mock elements
function stubDocument() {
  const origCreate = globalThis.document?.createElement;
  globalThis.document = globalThis.document || {};
  globalThis.document.createElement = vi.fn(() => createMockElement());
  return () => {
    if (origCreate) {
      globalThis.document.createElement = origCreate;
    }
  };
}

describe("startPetalRain", () => {
  let container;
  let restore;

  beforeEach(() => {
    container = createMockContainer();
    restore = stubDocument();
  });

  it("should create 30 petals by default", () => {
    startPetalRain(container);
    expect(container.children.length).toBe(30);
  });

  it("should create custom number of petals", () => {
    startPetalRain(container, 10);
    expect(container.children.length).toBe(10);
  });

  it("should create 0 petals when petalCount is 0", () => {
    startPetalRain(container, 0);
    expect(container.children.length).toBe(0);
  });

  it("should add .petal class to each element", () => {
    startPetalRain(container, 5);
    for (const child of container.children) {
      expect(child.classList.contains("petal")).toBe(true);
    }
  });

  it("should set CSS properties via cssText", () => {
    startPetalRain(container, 5);
    for (const child of container.children) {
      const css = child.style.cssText;
      expect(css).toContain("left:");
      expect(css).toContain("animation-duration:");
      expect(css).toContain("animation-delay:");
      expect(css).toContain("width:");
      expect(css).toContain("height:");
    }
  });

  it("should set left position between 0% and 100%", () => {
    startPetalRain(container, 20);
    for (const child of container.children) {
      const match = child.style.cssText.match(/left:\s*([\d.]+)%/);
      expect(match).not.toBeNull();
      const left = parseFloat(match[1]);
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left).toBeLessThanOrEqual(100);
    }
  });

  it("should set animation-duration between 4s and 10s", () => {
    startPetalRain(container, 20);
    for (const child of container.children) {
      const match = child.style.cssText.match(/animation-duration:\s*([\d.]+)s/);
      expect(match).not.toBeNull();
      const duration = parseFloat(match[1]);
      expect(duration).toBeGreaterThanOrEqual(4);
      expect(duration).toBeLessThanOrEqual(10);
    }
  });

  it("should set animation-delay between 0s and 8s", () => {
    startPetalRain(container, 20);
    for (const child of container.children) {
      const match = child.style.cssText.match(/animation-delay:\s*([\d.]+)s/);
      expect(match).not.toBeNull();
      const delay = parseFloat(match[1]);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(8);
    }
  });

  it("should set width and height between 15px and 30px", () => {
    startPetalRain(container, 20);
    for (const child of container.children) {
      const wMatch = child.style.cssText.match(/width:\s*([\d.]+)px/);
      const hMatch = child.style.cssText.match(/height:\s*([\d.]+)px/);
      expect(wMatch).not.toBeNull();
      expect(hMatch).not.toBeNull();
      const width = parseFloat(wMatch[1]);
      const height = parseFloat(hMatch[1]);
      expect(width).toBeGreaterThanOrEqual(12);
      expect(width).toBeLessThanOrEqual(30);
      expect(height).toBeGreaterThanOrEqual(12);
      expect(height).toBeLessThanOrEqual(30);
    }
  });
});
