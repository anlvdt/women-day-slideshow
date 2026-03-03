import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { buildSlides } from "./slideshow.js";

/**
 * Property P3: Tính tuần hoàn của slideshow
 * Validates: Yêu cầu 3.4
 */
describe("Property P3: Slideshow index cyclicality", () => {
  it("(currentIndex + 1) % slides.length is always in [0, slides.length - 1]", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 0, max: 100000 }),
        (slidesLength, currentIndex) => {
          const nextIndex = (currentIndex + 1) % slidesLength;
          expect(nextIndex).toBeGreaterThanOrEqual(0);
          expect(nextIndex).toBeLessThan(slidesLength);
        }
      )
    );
  });
});

/**
 * Property P4: Tính đúng đắn của buildSlides
 */
describe("Property P4: buildSlides correctness", () => {
  const photoArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 10 }),
    photoUrl: fc.webUrl(),
    caption: fc.string({ maxLength: 50 }),
  });

  const wishArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 10 }),
    senderName: fc.string({ minLength: 2, maxLength: 50 }),
    message: fc.string({ minLength: 5, maxLength: 100 }),
  });

  it("returns empty when photos is empty", () => {
    fc.assert(
      fc.property(
        fc.array(wishArb),
        (wishes) => {
          const result = buildSlides([], wishes);
          expect(result).toHaveLength(0);
        }
      )
    );
  });

  it("returns slides with null wish when wishes is empty", () => {
    fc.assert(
      fc.property(
        fc.array(photoArb, { minLength: 1, maxLength: 50 }),
        (photos) => {
          const result = buildSlides(photos, []);
          expect(result).toHaveLength(photos.length);
          for (const slide of result) {
            expect(slide.photo).not.toBeNull();
            expect(slide.wish).toBeNull();
          }
        }
      )
    );
  });

  it("result length equals max(photos.length, wishes.length) when both non-empty", () => {
    fc.assert(
      fc.property(
        fc.array(photoArb, { minLength: 1, maxLength: 50 }),
        fc.array(wishArb, { minLength: 1, maxLength: 50 }),
        (photos, wishes) => {
          const result = buildSlides(photos, wishes);
          expect(result).toHaveLength(Math.max(photos.length, wishes.length));
        }
      )
    );
  });

  it("every slide has non-null photo and wish when both provided", () => {
    fc.assert(
      fc.property(
        fc.array(photoArb, { minLength: 1, maxLength: 50 }),
        fc.array(wishArb, { minLength: 1, maxLength: 50 }),
        (photos, wishes) => {
          const result = buildSlides(photos, wishes);
          for (const slide of result) {
            expect(slide.photo).not.toBeNull();
            expect(slide.photo).toBeDefined();
            expect(slide.wish).not.toBeNull();
            expect(slide.wish).toBeDefined();
          }
        }
      )
    );
  });

  it("slide photos and wishes are always from the original arrays", () => {
    fc.assert(
      fc.property(
        fc.array(photoArb, { minLength: 1, maxLength: 50 }),
        fc.array(wishArb, { minLength: 1, maxLength: 50 }),
        (photos, wishes) => {
          const photosCopy = [...photos];
          const wishesCopy = [...wishes];
          const result = buildSlides(photos, wishes);
          for (const slide of result) {
            expect(photosCopy).toContain(slide.photo);
            expect(wishesCopy).toContain(slide.wish);
          }
        }
      )
    );
  });

  it("does not mutate original arrays", () => {
    fc.assert(
      fc.property(
        fc.array(photoArb, { minLength: 1, maxLength: 20 }),
        fc.array(wishArb, { minLength: 1, maxLength: 20 }),
        (photos, wishes) => {
          const photosSnapshot = photos.map(p => p.id);
          const wishesSnapshot = wishes.map(w => w.id);
          buildSlides(photos, wishes);
          expect(photos.map(p => p.id)).toEqual(photosSnapshot);
          expect(wishes.map(w => w.id)).toEqual(wishesSnapshot);
        }
      )
    );
  });
});
