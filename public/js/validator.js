/**
 * Module validation cho March 8 Slideshow
 * - validateWishForm: validate form lời chúc CHUNG (senderName + message)
 * - validatePhotoUpload: validate ảnh upload cho admin panel
 * - sanitizeFilename: loại bỏ ký tự đặc biệt khỏi tên file
 */

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp"
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Validate form lời chúc CHUNG (chỉ senderName + message, KHÔNG có file/member)
 * @param {Object} formData - { senderName: String, message: String }
 * @returns {{ isValid: Boolean, errors: String[] }}
 */
export function validateWishForm(formData) {
  const errors = [];

  const senderName = (formData.senderName || "").trim();
  if (senderName.length < 2 || senderName.length > 50) {
    errors.push("Tên phải từ 2 đến 50 ký tự");
  }

  // The message now contains HTML/SVGs. We should check the raw text length or allow larger string limits.
  // We'll strip HTML tags just to check the raw text length if necessary, but since an SVG string alone is long,
  // we either up the limit or check both.
  const rawMessage = (formData.message || "").trim();

  // Basic strip tags purely for length validation of readable text
  const textOnly = rawMessage.replace(/<[^>]*>?/gm, "").trim();

  if (rawMessage.length === 0) {
    errors.push("Lời chúc không được để trống");
  } else if (textOnly.length < 2 && rawMessage.indexOf("<svg") === -1) {
    // If it's too short and has no SVGs
    errors.push("Lời chúc phải từ 2 ký tự trở lên (hoặc chứa icon)");
  }

  if (rawMessage.length > 5000) {
    errors.push("Độ dài lời chúc vượt quá giới hạn hệ thống (tối đa 5000 ký tự)");
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate ảnh upload cho admin panel
 * @param {File} file - File object từ input
 * @param {String} [caption] - Chú thích ảnh (tùy chọn)
 * @returns {{ isValid: Boolean, errors: String[] }}
 */
export function validatePhotoUpload(file, caption) {
  const errors = [];

  if (!file) {
    errors.push("Vui lòng chọn ảnh");
    return { isValid: false, errors };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    errors.push("Chỉ chấp nhận ảnh JPG, PNG, GIF hoặc WebP");
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push("Kích thước ảnh tối đa 5MB");
  }

  if (caption !== undefined && caption !== null) {
    const trimmed = String(caption).trim();
    if (trimmed.length > 100) {
      errors.push("Chú thích tối đa 100 ký tự");
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Loại bỏ ký tự đặc biệt khỏi tên file, giữ lại alphanumeric, dấu chấm, gạch ngang, gạch dưới
 * @param {String} filename
 * @returns {String}
 */
export function sanitizeFilename(filename) {
  if (!filename) return "";
  return String(filename).replace(/[^a-zA-Z0-9.\-_]/g, "_");
}
