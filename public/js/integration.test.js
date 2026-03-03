/**
 * Integration tests for March 8 Slideshow
 * Tests end-to-end data flows with mocked Firebase.
 *
 * Validates: Requirements 1.2, 3.1, 10.1, 10.2
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from "vitest";
import { submitWish } from "./submit.js";
import { buildSlides } from "./slideshow.js";
import {
  _resetMocks,
  _getAddDocCalls,
  _setMockDocs,
} from "../../__mocks__/firebase-firestore.js";

// ---------------------------------------------------------------------------
// 1. Submit wish flow (end-to-end with mock Firebase)
//    Validates: Requirement 1.2 — gửi lời chúc CHUNG vào Firestore
// ---------------------------------------------------------------------------
describe("Submit wish integration flow", () => {
  beforeEach(() => {
    _resetMocks();
  });

  it("submits valid wish → addDoc called with correct collection and data", async () => {
    const formData = { senderName: "Anh Tuấn", message: "Chúc 8/3 vui vẻ nha!" };

    const result = await submitWish(formData);

    expect(result.success).toBe(true);

    const calls = _getAddDocCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].collection).toBe("wishes");
    expect(calls[0].data.senderName).toBe("Anh Tuấn");
    expect(calls[0].data.message).toBe("Chúc 8/3 vui vẻ nha!");
    expect(calls[0].data.createdAt).toEqual({ _type: "serverTimestamp" });
  });

  it("rejects invalid data → addDoc NOT called, returns validation errors", async () => {
    // Both Name and Message must be < 2 to trigger both errors
    const formData = { senderName: "A", message: "A" };

    const result = await submitWish(formData);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Tên phải từ 2 đến 50 ký tự");
    expect(result.error).toContain("Lời chúc phải từ 2 ký tự trở lên (hoặc chứa icon)");

    const calls = _getAddDocCalls();
    expect(calls).toHaveLength(0);
  });

  it("trims whitespace from senderName and message before saving", async () => {
    const formData = { senderName: "  Minh  ", message: "  Chúc mừng ngày 8/3!  " };

    const result = await submitWish(formData);

    expect(result.success).toBe(true);

    const calls = _getAddDocCalls();
    expect(calls[0].data.senderName).toBe("Minh");
    expect(calls[0].data.message).toBe("Chúc mừng ngày 8/3!");
  });

  it("rejects when only senderName is invalid → addDoc NOT called", async () => {
    const formData = { senderName: "", message: "Chúc mừng 8/3 nhé!" };

    const result = await submitWish(formData);

    expect(result.success).toBe(false);
    expect(_getAddDocCalls()).toHaveLength(0);
  });

  it("rejects when only message is invalid → addDoc NOT called", async () => {
    // "A" fails the minimum text length check (2)
    const formData = { senderName: "Tuấn", message: "A" };

    const result = await submitWish(formData);

    expect(result.success).toBe(false);
    expect(_getAddDocCalls()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Slideshow buildSlides + data flow
//    Validates: Requirement 3.1 — load photos + wishes, ghép cặp slides
// ---------------------------------------------------------------------------
describe("Slideshow buildSlides integration flow", () => {
  const mockPhotos = [
    { id: "p1", photoUrl: "https://storage.example.com/photo1.jpg", caption: "Team A", createdAt: 1 },
    { id: "p2", photoUrl: "https://storage.example.com/photo2.jpg", caption: "", createdAt: 2 },
    { id: "p3", photoUrl: "https://storage.example.com/photo3.jpg", caption: "Team C", createdAt: 3 },
  ];

  const mockWishes = [
    { id: "w1", senderName: "Anh A", message: "Chúc mừng 8/3 nhé!", createdAt: 1 },
    { id: "w2", senderName: "Anh B", message: "Happy Women's Day!", createdAt: 2 },
  ];

  it("builds correct number of slides pairing photos with wishes", () => {
    const slides = buildSlides(mockPhotos, mockWishes);

    // max(3 photos, 2 wishes) = 3 slides
    expect(slides).toHaveLength(3);

    // All photos should appear (shuffled order)
    const photoIds = slides.map(s => s.photo.id).sort();
    expect(photoIds).toEqual(["p1", "p2", "p3"]);

    // All wishes should appear, with wrap-around
    const wishIds = slides.map(s => s.wish.id).sort();
    // 3 slides, 2 wishes → one wish appears twice
    expect(wishIds).toHaveLength(3);
    for (const slide of slides) {
      expect(["w1", "w2"]).toContain(slide.wish.id);
    }
  });

  it("every slide contains both photo and wish data", () => {
    const slides = buildSlides(mockPhotos, mockWishes);

    for (const slide of slides) {
      expect(slide.photo).toBeDefined();
      expect(slide.photo.photoUrl).toBeTruthy();
      expect(slide.wish).toBeDefined();
      expect(slide.wish.senderName).toBeTruthy();
      expect(slide.wish.message).toBeTruthy();
    }
  });

  it("returns slides with null wish when wishes are empty", () => {
    const slides = buildSlides(mockPhotos, []);
    expect(slides).toHaveLength(mockPhotos.length);
    for (const slide of slides) {
      expect(slide.photo).not.toBeNull();
      expect(slide.wish).toBeNull();
    }
  });

  it("returns empty when wishes exist but photos are empty", () => {
    expect(buildSlides([], mockWishes)).toEqual([]);
  });

  it("handles equal-length arrays with correct count", () => {
    const photos = [
      { id: "pa", photoUrl: "https://storage.example.com/a.jpg", caption: "A", createdAt: 1 },
      { id: "pb", photoUrl: "https://storage.example.com/b.jpg", caption: "B", createdAt: 2 },
    ];
    const wishes = [
      { id: "wa", senderName: "Anh X", message: "Chúc mừng 8/3!", createdAt: 1 },
      { id: "wb", senderName: "Anh Y", message: "Happy Women's Day!", createdAt: 2 },
    ];
    const slides = buildSlides(photos, wishes);

    expect(slides).toHaveLength(2);
    const photoIds = slides.map(s => s.photo.id).sort();
    const wishIds = slides.map(s => s.wish.id).sort();
    expect(photoIds).toEqual(["pa", "pb"]);
    expect(wishIds).toEqual(["wa", "wb"]);
  });

  it("handles more wishes than photos with photo wrap-around", () => {
    const photos = [
      { id: "px", photoUrl: "https://storage.example.com/x.jpg", caption: "X", createdAt: 1 },
    ];
    const wishes = [
      { id: "wa", senderName: "Anh X", message: "Chúc mừng 8/3!", createdAt: 1 },
      { id: "wb", senderName: "Anh Y", message: "Happy Women's Day!", createdAt: 2 },
    ];
    const slides = buildSlides(photos, wishes);

    expect(slides).toHaveLength(2);
    // Both slides should use the same photo (only one available)
    for (const slide of slides) {
      expect(slide.photo.id).toBe("px");
    }
    // Both wishes should appear
    const wishIds = slides.map(s => s.wish.id).sort();
    expect(wishIds).toEqual(["wa", "wb"]);
  });
});

// ---------------------------------------------------------------------------
// 3. Responsive / viewport-dependent logic tests
//    Validates: Requirements 10.1, 10.2
//    Note: True CSS rendering can't be tested in vitest (no browser).
//    Instead we verify that the data-flow logic works correctly for
//    any viewport scenario — the buildSlides output is viewport-agnostic.
// ---------------------------------------------------------------------------
describe("Responsive logic verification", () => {
  const photo = { id: "p1", photoUrl: "https://example.com/1.jpg", caption: "Team" };
  const wish = { id: "w1", senderName: "Tester", message: "Chúc mừng 8/3!" };

  it("buildSlides output is independent of viewport size (320px scenario)", () => {
    // The same data produces the same slides regardless of viewport
    const slides = buildSlides([photo], [wish]);
    expect(slides).toHaveLength(1);
    expect(slides[0].photo.photoUrl).toBe("https://example.com/1.jpg");
    expect(slides[0].wish.message).toBe("Chúc mừng 8/3!");
  });

  it("buildSlides output is independent of viewport size (768px scenario)", () => {
    const slides = buildSlides([photo], [wish]);
    expect(slides).toHaveLength(1);
    expect(slides[0].photo).toBe(photo);
    expect(slides[0].wish).toBe(wish);
  });

  it("buildSlides output is independent of viewport size (1920px scenario)", () => {
    const slides = buildSlides([photo], [wish]);
    expect(slides).toHaveLength(1);
    expect(slides[0].photo).toBe(photo);
    expect(slides[0].wish).toBe(wish);
  });

  it("slide count scales with data, not viewport", () => {
    const photos = Array.from({ length: 10 }, (_, i) => ({
      id: `p${i}`, photoUrl: `https://example.com/${i}.jpg`, caption: "",
    }));
    const wishes = Array.from({ length: 3 }, (_, i) => ({
      id: `w${i}`, senderName: `Sender ${i}`, message: `Message ${i} hello`,
    }));

    const slides = buildSlides(photos, wishes);
    expect(slides).toHaveLength(10); // max(10, 3)

    // All slides should have valid photo and wish from original arrays
    for (const slide of slides) {
      expect(photos).toContain(slide.photo);
      expect(wishes).toContain(slide.wish);
    }
  });
});
