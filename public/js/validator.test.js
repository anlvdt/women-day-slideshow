import { describe, it, expect } from "vitest";
import {
  validateWishForm,
  validatePhotoUpload,
  sanitizeFilename,
} from "./validator.js";

describe("validateWishForm", () => {
  it("returns isValid true when all fields are valid", () => {
    const result = validateWishForm({
      senderName: "Nguyễn Văn A",
      message: "Chúc 8/3 vui vẻ nha!",
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects senderName shorter than 2 chars", () => {
    const result = validateWishForm({ senderName: "A", message: "Chúc mừng 8/3!" });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Tên phải từ 2 đến 50 ký tự");
  });

  it("rejects senderName longer than 50 chars", () => {
    const result = validateWishForm({
      senderName: "A".repeat(51),
      message: "Chúc mừng 8/3!",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Tên phải từ 2 đến 50 ký tự");
  });

  it("accepts senderName at boundary 2 chars", () => {
    const result = validateWishForm({ senderName: "AB", message: "Hello world" });
    expect(result.isValid).toBe(true);
  });

  it("accepts senderName at boundary 50 chars", () => {
    const result = validateWishForm({
      senderName: "A".repeat(50),
      message: "Hello world",
    });
    expect(result.isValid).toBe(true);
  });

  it("rejects message shorter than 2 chars with no SVGs", () => {
    const result = validateWishForm({ senderName: "Test", message: "A" });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Lời chúc phải từ 2 ký tự trở lên (hoặc chứa icon)");
  });

  it("rejects message longer than 5000 chars", () => {
    const result = validateWishForm({
      senderName: "Test",
      message: "A".repeat(5001),
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Độ dài lời chúc vượt quá giới hạn hệ thống (tối đa 5000 ký tự)");
  });

  it("accepts message at boundary 5 chars", () => {
    const result = validateWishForm({ senderName: "Test", message: "Hello" });
    expect(result.isValid).toBe(true);
  });

  it("accepts message at boundary 5000 chars", () => {
    const result = validateWishForm({
      senderName: "Test",
      message: "A".repeat(5000),
    });
    expect(result.isValid).toBe(true);
  });

  it("accepts short messages if they contain an SVG", () => {
    const result = validateWishForm({
      senderName: "Test",
      message: '<svg viewBox="0 0 24 24"></svg>',
    });
    expect(result.isValid).toBe(true);
  });

  it("trims whitespace before validating senderName", () => {
    const result = validateWishForm({ senderName: "  A  ", message: "Hello world" });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Tên phải từ 2 đến 50 ký tự");
  });

  it("trims whitespace before validating message", () => {
    const result = validateWishForm({ senderName: "Test", message: "   " });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Lời chúc không được để trống");
  });

  it("returns multiple errors when both fields are invalid", () => {
    const result = validateWishForm({ senderName: "", message: "" });
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it("handles undefined/null fields gracefully", () => {
    const result = validateWishForm({});
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });
});

describe("validatePhotoUpload", () => {
  function makeFile(type, size) {
    return { type, size };
  }

  it("accepts valid JPEG file", () => {
    const result = validatePhotoUpload(makeFile("image/jpeg", 1024));
    expect(result.isValid).toBe(true);
  });

  it("accepts valid PNG file", () => {
    const result = validatePhotoUpload(makeFile("image/png", 1024));
    expect(result.isValid).toBe(true);
  });

  it("accepts valid GIF file", () => {
    const result = validatePhotoUpload(makeFile("image/gif", 1024));
    expect(result.isValid).toBe(true);
  });

  it("accepts valid WebP file", () => {
    const result = validatePhotoUpload(makeFile("image/webp", 1024));
    expect(result.isValid).toBe(true);
  });

  it("rejects invalid MIME type", () => {
    const result = validatePhotoUpload(makeFile("application/pdf", 1024));
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Chỉ chấp nhận ảnh JPG, PNG, GIF hoặc WebP");
  });

  it("rejects text/plain MIME type", () => {
    const result = validatePhotoUpload(makeFile("text/plain", 1024));
    expect(result.isValid).toBe(false);
  });

  it("accepts file exactly 5MB", () => {
    const result = validatePhotoUpload(makeFile("image/jpeg", 5 * 1024 * 1024));
    expect(result.isValid).toBe(true);
  });

  it("rejects file over 5MB", () => {
    const result = validatePhotoUpload(
      makeFile("image/jpeg", 5 * 1024 * 1024 + 1)
    );
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Kích thước ảnh tối đa 5MB");
  });

  it("rejects null file", () => {
    const result = validatePhotoUpload(null);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Vui lòng chọn ảnh");
  });

  it("accepts valid file with no caption", () => {
    const result = validatePhotoUpload(makeFile("image/jpeg", 1024));
    expect(result.isValid).toBe(true);
  });

  it("accepts valid file with caption under 100 chars", () => {
    const result = validatePhotoUpload(makeFile("image/jpeg", 1024), "Team nữ");
    expect(result.isValid).toBe(true);
  });

  it("rejects caption over 100 chars", () => {
    const result = validatePhotoUpload(
      makeFile("image/jpeg", 1024),
      "A".repeat(101)
    );
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Chú thích tối đa 100 ký tự");
  });
});

describe("sanitizeFilename", () => {
  it("keeps alphanumeric characters", () => {
    expect(sanitizeFilename("photo123.jpg")).toBe("photo123.jpg");
  });

  it("replaces special characters with underscore", () => {
    expect(sanitizeFilename("my photo (1).jpg")).toBe("my_photo__1_.jpg");
  });

  it("keeps hyphens and underscores", () => {
    expect(sanitizeFilename("my-photo_2.png")).toBe("my-photo_2.png");
  });

  it("handles empty string", () => {
    expect(sanitizeFilename("")).toBe("");
  });

  it("handles null/undefined", () => {
    expect(sanitizeFilename(null)).toBe("");
    expect(sanitizeFilename(undefined)).toBe("");
  });

  it("removes unicode/Vietnamese characters", () => {
    expect(sanitizeFilename("ảnh đẹp.jpg")).toBe("_nh___p.jpg");
  });
});
