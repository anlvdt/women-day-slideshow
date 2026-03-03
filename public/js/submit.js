/**
 * Submit module cho March 8 Slideshow
 * Xử lý logic gửi lời chúc CHUNG (text + emoji, KHÔNG upload ảnh)
 */

import { db } from "./firebase-config.js";
import { validateWishForm } from "./validator.js";
import { sanitizeWishHTML } from "./slideshow.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/**
 * Gửi lời chúc CHUNG vào Firestore
 * @param {{ senderName: string, message: string }} formData
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function submitWish(formData) {
  const validation = validateWishForm(formData);
  if (!validation.isValid) {
    return { success: false, error: validation.errors.join(", ") };
  }

  const senderName = (formData.senderName || "").trim();
  const message = sanitizeWishHTML((formData.message || "").trim());

  await addDoc(collection(db, "wishes"), {
    senderName,
    message,
    createdAt: serverTimestamp()
  });

  return { success: true };
}

/**
 * Hiển thị thông báo thành công
 */
function showSuccess(successEl, errorEl) {
  errorEl.hidden = true;
  successEl.hidden = false;
}

/**
 * Hiển thị thông báo lỗi
 */
let _errorTimer = null;
function showError(errorEl, successEl, message) {
  successEl.hidden = true;
  errorEl.textContent = message;
  errorEl.hidden = false;
  clearTimeout(_errorTimer);
  _errorTimer = setTimeout(() => { errorEl.hidden = true; }, 6000);
}

/**
 * Ẩn tất cả thông báo
 */
function hideMessages(successEl, errorEl) {
  successEl.hidden = true;
  errorEl.hidden = true;
}

// --- Curated SVG Icons List (fun, teen, romantic) ---
const SVG_ICONS = [
  // Heart Filled
  '<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
  // Double Hearts
  '<svg viewBox="0 0 24 24"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z" opacity="0.5"/><path d="M16.5 5c-1.2 0-2.35.56-3.1 1.44L12 8l-1.4-1.56C9.85 5.56 8.7 5 7.5 5 5.5 5 4 6.5 4 8.5c0 2.89 3.14 5.74 7.9 10.05l.1.1.1-.1C16.86 14.24 20 11.39 20 8.5 20 6.5 18.5 5 16.5 5z"/></svg>',
  // Star
  '<svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>',
  // Sparkles / Magic
  '<svg viewBox="0 0 24 24"><path d="M7 5l1.5 3.5L12 10l-3.5 1.5L7 15l-1.5-3.5L2 10l3.5-1.5L7 5zm10 4l1 2.5L20.5 13l-2.5 1L17 16.5 16 14l-2.5-1L16 12l1-2.5zM12 15l.75 1.75L14.5 17.5l-1.75.75L12 20l-.75-1.75L9.5 17.5l1.75-.75L12 15z"/></svg>',
  // Flower / Rose
  '<svg viewBox="0 0 24 24"><path d="M12 2C9.5 2 8 4 8 6c0 1.5.8 2.8 2 3.5V11H8c-2.2 0-4 1.8-4 4 0 1.5.8 2.8 2 3.5-.5.8-.8 1.6-.8 2.5h1.6c0-1.1.9-2 2-2h6.4c1.1 0 2 .9 2 2H19c0-.9-.3-1.7-.8-2.5 1.2-.7 2-2 2-3.5 0-2.2-1.8-4-4-4h-2V9.5c1.2-.7 2-2 2-3.5 0-2-1.5-4-4-4zm0 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/></svg>',
  // Butterfly
  '<svg viewBox="0 0 24 24"><path d="M12 12c-1 0-2-1.5-2-3.5S11 2 12 2s2 4.5 2 6.5S13 12 12 12zm-5.5 0C4 12 2 14 2 16.5S4 22 6.5 22c1.5 0 3-.8 4-2-2-1-3.5-3.5-3.5-6 0-.7.1-1.4.2-2H6.5zm11 0h-.7c.1.6.2 1.3.2 2 0 2.5-1.5 5-3.5 6 1 1.2 2.5 2 4 2C20 22 22 19 22 16.5S20 12 17.5 12z"/></svg>',
  // Crown
  '<svg viewBox="0 0 24 24"><path d="M2 19h20v2H2v-2zm1-1l3-8 4 4 2-8 2 8 4-4 3 8H3z"/></svg>',
  // Gift
  '<svg viewBox="0 0 24 24"><path d="M20 7h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 3.54 10.05 3 9 3 7.34 3 6 4.34 6 6c0 .35.07.69.18 1H4c-1.1 0-2 .9-2 2v3c0 .55.45 1 1 1h1v6c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-6h1c.55 0 1-.45 1-1V9c0-1.1-.9-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 5c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 15H6v-6h5v6zm0-8H3V9h8v3zm2 8v-6h5v6h-5zm5-8h-5V9h5v3z"/></svg>',
  // Sun / Sunshine
  '<svg viewBox="0 0 24 24"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 0 0 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>',
  // Rainbow
  '<svg viewBox="0 0 24 24"><path d="M12 4C6.48 4 2 8.48 2 14h2c0-4.41 3.59-8 8-8s8 3.59 8 8h2c0-5.52-4.48-10-10-10zm0 4c-3.31 0-6 2.69-6 6h2c0-2.21 1.79-4 4-4s4 1.79 4 4h2c0-3.31-2.69-6-6-6z"/></svg>',
  // Music Note
  '<svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
  // Peace / Victory
  '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-6v4h2v-4h3l-4-4-4 4h3z"/></svg>',
  // Diamond
  '<svg viewBox="0 0 24 24"><path d="M19 3H5L2 9l10 12L22 9l-3-6zM9.62 8l1.5-3h1.76l1.5 3H9.62zM11 10v6.68L5.44 10H11zm2 0h5.56L13 16.68V10zm6.26-2h-2.65l-1.5-3h2.65l1.5 3zM6.24 5h2.65l-1.5 3H4.74l1.5-3z"/></svg>',
  // Lips / Kiss
  '<svg viewBox="0 0 24 24"><path d="M12 2C8 2 4 5 4 9c0 2.5 1.5 4.5 3 6l5 5 5-5c1.5-1.5 3-3.5 3-6 0-4-4-7-8-7zm0 2c3 0 6 2.2 6 5 0 1.8-1.2 3.4-2.5 4.7L12 17.2l-3.5-3.5C7.2 12.4 6 10.8 6 9c0-2.8 3-5 6-5z"/></svg>',
  // Cat Face
  '<svg viewBox="0 0 24 24"><path d="M12 2L8 6H4v4l-2 2 2 2v4h4l4 4 4-4h4v-4l2-2-2-2V6h-4l-4-4zm0 4c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4zm-2 3a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/></svg>',
  // Ribbon / Bow
  '<svg viewBox="0 0 24 24"><path d="M12 14c-1.65 0-3-1.35-3-3V5c0-1.65 1.35-3 3-3s3 1.35 3 3v6c0 1.65-1.35 3-3 3zm-7-3c0 3.53 2.61 6.43 6 6.92V21h-3v2h8v-2h-3v-3.08c3.39-.49 6-3.39 6-6.92h-2c0 2.76-2.24 5-5 5s-5-2.24-5-5H5z"/></svg>',
];

/**
 * Chèn SVG HTML vào vị trí con trỏ trong contenteditable div
 */
function insertHtmlAtCursor(html) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  let range = selection.getRangeAt(0);
  range.deleteContents();

  const el = document.createElement("div");
  el.innerHTML = html;
  const frag = document.createDocumentFragment();
  let node, lastNode;
  while ((node = el.firstChild)) {
    lastNode = frag.appendChild(node);
  }

  const spaceNode = document.createTextNode("\u00A0");
  frag.appendChild(spaceNode);

  range.insertNode(frag);

  // Move cursor after inserted content
  range = range.cloneRange();
  range.setStartAfter(spaceNode);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Khởi tạo SVG picker
 */
function setupSvgPicker(toggleBtn, pickerContainer, editableDiv) {
  let pickerPopulated = false;

  toggleBtn.addEventListener("click", () => {
    const isHidden = pickerContainer.hidden;
    pickerContainer.hidden = !isHidden;
    toggleBtn.classList.toggle("active", isHidden);
    toggleBtn.setAttribute("aria-pressed", isHidden ? "true" : "false");

    if (!pickerPopulated && isHidden) {
      SVG_ICONS.forEach(svgString => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "svg-icon-btn";
        btn.innerHTML = svgString;
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          // Ensure focus is in the div before inserting
          editableDiv.focus();
          insertHtmlAtCursor(svgString);
        });
        pickerContainer.appendChild(btn);
      });
      pickerPopulated = true;
    }
  });

  // Paste as plain text to prevent HTML injection from clipboard
  editableDiv.addEventListener("paste", (e) => {
    e.preventDefault();
    const text = (e.clipboardData || e.originalEvent?.clipboardData)?.getData('text/plain') || '';
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  });
}

/**
 * Khởi tạo form submit handler và emoji picker khi DOM sẵn sàng
 */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("wish-form");
  const submitBtn = document.getElementById("submit-btn");
  const senderNameInput = document.getElementById("sender-name");
  const messageEditable = document.getElementById("message-editable");
  const successEl = document.getElementById("success-message");
  const errorEl = document.getElementById("error-message");
  const svgToggle = document.getElementById("emoji-toggle"); // Reused ID for toggle button
  const svgPickerContainer = document.getElementById("svg-picker-container");
  const charCountEl = document.getElementById("char-count");
  const sendAnotherBtn = document.getElementById("send-another-btn");

  // Setup SVG picker
  if (svgToggle && svgPickerContainer && messageEditable) {
    setupSvgPicker(svgToggle, svgPickerContainer, messageEditable);
  }

  // Character count (#15)
  if (messageEditable && charCountEl) {
    const updateCharCount = () => {
      const len = messageEditable.textContent.length;
      charCountEl.textContent = `${len} ký tự`;
    };
    messageEditable.addEventListener("input", updateCharCount);
    messageEditable.addEventListener("keyup", updateCharCount);
  }

  // Live preview (#16)
  const wishPreview = document.getElementById("wish-preview");
  const previewSender = document.getElementById("preview-sender");
  const previewMessage = document.getElementById("preview-message");

  function updatePreview() {
    const name = senderNameInput.value.trim();
    const msgHtml = messageEditable.innerHTML.trim();
    const msgText = messageEditable.textContent.trim();
    const hasContent = name || msgText;

    if (wishPreview) {
      wishPreview.hidden = !hasContent;
      if (previewSender) previewSender.textContent = name || "...";
      if (previewMessage) {
        // Use innerHTML to preserve SVG icons, sanitized for safety
        previewMessage.innerHTML = msgHtml ? sanitizeWishHTML(msgHtml) : "...";
      }
    }
  }

  senderNameInput.addEventListener("input", updatePreview);
  messageEditable.addEventListener("input", updatePreview);

  // Send another button (#14)
  if (sendAnotherBtn) {
    sendAnotherBtn.addEventListener("click", () => {
      const savedName = senderNameInput.value;
      successEl.hidden = true;
      form.hidden = false;
      senderNameInput.value = savedName;
      messageEditable.innerHTML = "";
      if (charCountEl) charCountEl.textContent = "0 ký tự";
      if (wishPreview) wishPreview.hidden = true;
      senderNameInput.focus();
    });
  }

  // Form submit handler
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMessages(successEl, errorEl);

    const formData = {
      senderName: senderNameInput.value,
      message: messageEditable.innerHTML // Extract HTML, including SVGs
    };

    // Set loading state
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Đang gửi...";

    try {
      const result = await submitWish(formData);

      if (result.success) {
        showSuccess(successEl, errorEl);
        const savedName = senderNameInput.value;
        form.reset();
        senderNameInput.value = savedName;
        messageEditable.innerHTML = ""; // Clear contenteditable div
        if (charCountEl) charCountEl.textContent = "0 ký tự";
        // Hide SVG picker on success
        if (svgPickerContainer) {
          svgPickerContainer.hidden = true;
          if (svgToggle) {
            svgToggle.classList.remove("active");
            svgToggle.setAttribute("aria-pressed", "false");
          }
        }
        // Hide form, show success with send-another option
        form.hidden = true;
        if (wishPreview) wishPreview.hidden = true;
      } else {
        showError(errorEl, successEl, result.error);
      }
    } catch (err) {
      showError(
        errorEl,
        successEl,
        "Không thể gửi lời chúc. Vui lòng kiểm tra kết nối mạng và thử lại."
      );
    } finally {
      // Reset loading state
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
});
