import { describe, it, expect } from "vitest";
import { buildSlides } from "./slideshow.js";

describe("buildSlides", () => {
  const photo1 = { id: "p1", photoUrl: "https://example.com/1.jpg", caption: "Team A" };
  const photo2 = { id: "p2", photoUrl: "https://example.com/2.jpg", caption: "" };
  const photo3 = { id: "p3", photoUrl: "https://example.com/3.jpg", caption: "Team C" };

  const wish1 = { id: "w1", senderName: "Anh A", message: "Chúc mừng 8/3!" };
  const wish2 = { id: "w2", senderName: "Anh B", message: "Happy Women's Day!" };

  it("returns empty array when photos is empty", () => {
    expect(buildSlides([], [wish1])).toEqual([]);
  });

  it("returns slides with null wish when wishes is empty", () => {
    const slides = buildSlides([photo1], []);
    expect(slides).toHaveLength(1);
    expect(slides[0].photo).toBe(photo1);
    expect(slides[0].wish).toBeNull();
  });

  it("returns empty array when both are empty", () => {
    expect(buildSlides([], [])).toEqual([]);
  });

  it("pairs 1 photo with 1 wish into 1 slide", () => {
    const slides = buildSlides([photo1], [wish1]);
    expect(slides).toHaveLength(1);
    expect(slides[0].photo).toBe(photo1);
    expect(slides[0].wish).toBe(wish1);
  });

  it("creates max(photos, wishes) slides when photos > wishes", () => {
    const photos = [photo1, photo2, photo3];
    const wishes = [wish1];
    const slides = buildSlides(photos, wishes);
    expect(slides).toHaveLength(3);
    // All wishes should be wish1 (only one available, wraps via modulo)
    for (const slide of slides) {
      expect(slide.wish).toBe(wish1);
    }
    // All 3 photos should appear (shuffled order)
    const photoIds = slides.map(s => s.photo.id).sort();
    expect(photoIds).toEqual(["p1", "p2", "p3"]);
  });

  it("creates max(photos, wishes) slides when wishes > photos", () => {
    const photos = [photo1];
    const wishes = [wish1, wish2];
    const slides = buildSlides(photos, wishes);
    expect(slides).toHaveLength(2);
    // Photo wraps around via modulo — both should be photo1
    for (const slide of slides) {
      expect(slide.photo).toBe(photo1);
    }
    // Both wishes should appear (shuffled order)
    const wishIds = slides.map(s => s.wish.id).sort();
    expect(wishIds).toEqual(["w1", "w2"]);
  });

  it("pairs equal-length arrays into correct count", () => {
    const slides = buildSlides([photo1, photo2], [wish1, wish2]);
    expect(slides).toHaveLength(2);
    const photoIds = slides.map(s => s.photo.id).sort();
    const wishIds = slides.map(s => s.wish.id).sort();
    expect(photoIds).toEqual(["p1", "p2"]);
    expect(wishIds).toEqual(["w1", "w2"]);
  });

  it("every slide has photo and wish when wishes provided", () => {
    const slides = buildSlides([photo1, photo2, photo3], [wish1, wish2]);
    for (const slide of slides) {
      expect(slide.photo).toBeDefined();
      expect(slide.wish).toBeDefined();
      expect(slide.photo).not.toBeNull();
      expect(slide.wish).not.toBeNull();
    }
  });

  it("does not mutate original arrays", () => {
    const photos = [photo1, photo2, photo3];
    const wishes = [wish1, wish2];
    const photosCopy = [...photos];
    const wishesCopy = [...wishes];
    buildSlides(photos, wishes);
    // Original arrays should be unchanged (same elements, same order)
    expect(photos).toEqual(photosCopy);
    expect(wishes).toEqual(wishesCopy);
  });
});
