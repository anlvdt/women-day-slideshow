import { db, storage } from "./firebase-config.js";
import { validatePhotoUpload, sanitizeFilename } from "./validator.js";
import { ADMIN_PASSWORD } from "./admin-config.js";
import {
    buildSlides,
    createIntroSlide,
    transitionToSlide,
    transitionToSpecialSlide
} from "./slideshow.js";
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    setDoc,
    getDoc,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

// --- State ---
let photos = [];
let selectedFiles = []; // Store files separately to avoid FileList issues

// --- DOM refs (resolved after DOMContentLoaded) ---
let els = {};

document.addEventListener("DOMContentLoaded", () => {
    els = {
        passwordGate: document.getElementById("password-gate"),
        adminContent: document.getElementById("admin-content"),
        loginBtn: document.getElementById("login-btn"),
        passwordInput: document.getElementById("admin-password"),
        fileInput: document.getElementById("photo-file"),
        fileBtn: document.getElementById("photo-file-btn"),
        fileName: document.getElementById("photo-file-name"),
        previewArea: document.getElementById("preview-area"),
        uploadForm: document.getElementById("upload-form"),
        uploadBtn: document.getElementById("upload-btn"),
        caption: document.getElementById("photo-caption"),
        successMsg: document.getElementById("success-msg"),
        errorMsg: document.getElementById("error-msg"),
        photoGrid: document.getElementById("photo-grid"),
        musicForm: document.getElementById("music-form"),
        youtubeForm: document.getElementById("youtube-form"),
        youtubeInput: document.getElementById("youtube-url"),
        musicFileInput: document.getElementById("music-file"),
        musicFileName: document.getElementById("music-file-name"),
        musicBtn: document.getElementById("music-btn"),
        youtubeSaveBtn: document.getElementById("youtube-save-btn"),
        musicSuccessMsg: document.getElementById("music-success-msg"),
        musicErrorMsg: document.getElementById("music-error-msg"),
        tabYoutube: document.getElementById("tab-youtube"),
        tabUpload: document.getElementById("tab-upload"),

        // Settings
        settingsForm: document.getElementById("settings-form"),
        slideDurationInput: document.getElementById("setting-slide-duration"),
        transitionDurationInput: document.getElementById("setting-transition-duration"),
        enableKenBurnsInput: document.getElementById("setting-enable-kenburns"),
        settingsSaveBtn: document.getElementById("settings-save-btn"),
        settingsSuccessMsg: document.getElementById("settings-success-msg"),
        settingsErrorMsg: document.getElementById("settings-error-msg"),

        // Event config
        eventForm: document.getElementById("event-form"),
        eventIntroTitle: document.getElementById("event-intro-title"),
        eventIntroSubtitle: document.getElementById("event-intro-subtitle"),
        eventIntroDate: document.getElementById("event-intro-date"),
        eventOutroTitle: document.getElementById("event-outro-title"),
        eventOutroSubtitle: document.getElementById("event-outro-subtitle"),
        eventOutroTagline: document.getElementById("event-outro-tagline"),
        eventSaveBtn: document.getElementById("event-save-btn"),
        eventSuccessMsg: document.getElementById("event-success-msg"),
        eventErrorMsg: document.getElementById("event-error-msg"),

        // Preview
        previewBtn: document.getElementById("preview-btn"),
        previewModal: document.getElementById("preview-modal"),
        previewCloseBtn: document.getElementById("preview-close-btn"),
        previewContainer: document.getElementById("preview-container"),

        // Export
        exportBtn: document.getElementById("export-btn"),

        // Login error
        loginError: document.getElementById("login-error"),

        // Photo count
        photoCount: document.getElementById("photo-count"),

        // Pagination
        paginationBar: document.getElementById("pagination-bar"),

        // Optimize
        optimizeBtn: document.getElementById("optimize-btn"),
        optimizeStatus: document.getElementById("optimize-status"),

        // Bulk delete
        bulkSelectBtn: document.getElementById("bulk-select-btn"),
        bulkSelectAllBtn: document.getElementById("bulk-select-all-btn"),
        bulkDeleteBtn: document.getElementById("bulk-delete-btn"),
        bulkCancelBtn: document.getElementById("bulk-cancel-btn"),
        bulkCount: document.getElementById("bulk-count"),

        // Dedupe
        dedupeBtn: document.getElementById("dedupe-btn"),

        // Wishes
        wishList: document.getElementById("wish-list"),
        wishCount: document.getElementById("wish-count"),
    };

    init();
});

function init() {
    // --- Login ---
    els.loginBtn.addEventListener("click", handleLogin);
    els.passwordInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleLogin();
    });
    // Reset error state on re-input (#4)
    els.passwordInput.addEventListener("input", () => {
        els.loginError.hidden = true;
        els.passwordInput.classList.remove("input-error");
    });

    // --- Photo file picker ---
    // Label click triggers hidden input via JS
    els.fileBtn.addEventListener("click", (e) => {
        e.preventDefault();
        els.fileInput.click();
    });

    els.fileInput.addEventListener("change", () => {
        // Copy files to array immediately (FileList can be lost after form reset)
        selectedFiles = Array.from(els.fileInput.files);
        showPreview();
    });

    // --- Upload form: use click handler instead of submit to bypass native validation on hidden input ---
    els.uploadBtn.addEventListener("click", (e) => {
        e.preventDefault();
        handlePhotoUpload();
    });

    // Also prevent default form submit
    els.uploadForm.addEventListener("submit", (e) => e.preventDefault());

    // --- Music ---
    els.youtubeForm.addEventListener("submit", handleYoutubeSave);
    els.musicForm.addEventListener("submit", handleMusicUpload);

    if (els.tabYoutube && els.tabUpload) {
        els.tabYoutube.addEventListener("click", () => {
            els.tabYoutube.classList.add("active");
            els.tabUpload.classList.remove("active");
            els.youtubeForm.hidden = false;
            els.musicForm.hidden = true;
        });
        els.tabUpload.addEventListener("click", () => {
            els.tabUpload.classList.add("active");
            els.tabYoutube.classList.remove("active");
            els.musicForm.hidden = false;
            els.youtubeForm.hidden = true;
        });
    }

    if (els.musicFileInput) {
        els.musicFileInput.addEventListener("change", () => {
            if (els.musicFileName) {
                els.musicFileName.textContent = els.musicFileInput.files[0] ? els.musicFileInput.files[0].name : "";
            }
        });
    }

    if (els.settingsForm) {
        els.settingsForm.addEventListener("submit", handleSettingsSave);
    }

    if (els.eventForm) {
        els.eventForm.addEventListener("submit", handleEventSave);
    }

    // Preview slideshow
    if (els.previewBtn) {
        els.previewBtn.addEventListener("click", openPreview);
    }
    if (els.previewCloseBtn) {
        els.previewCloseBtn.addEventListener("click", closePreview);
    }
    // ESC key to close preview (#6)
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !els.previewModal.hidden) {
            closePreview();
        }
    });

    // Export video
    if (els.exportBtn) {
        els.exportBtn.addEventListener("click", startExport);
    }

    // Optimize old photos
    if (els.optimizeBtn) {
        els.optimizeBtn.addEventListener("click", optimizeExistingPhotos);
    }

    // Bulk select/delete
    if (els.bulkSelectBtn) {
        els.bulkSelectBtn.addEventListener("click", enterBulkMode);
    }
    if (els.bulkSelectAllBtn) {
        els.bulkSelectAllBtn.addEventListener("click", bulkSelectAll);
    }
    if (els.bulkDeleteBtn) {
        els.bulkDeleteBtn.addEventListener("click", bulkDeleteSelected);
    }
    if (els.bulkCancelBtn) {
        els.bulkCancelBtn.addEventListener("click", exitBulkMode);
    }

    // Dedupe
    if (els.dedupeBtn) {
        els.dedupeBtn.addEventListener("click", deleteDuplicates);
    }
}

// ===================== AUTH =====================

/**
 * Escape HTML special characters to prevent XSS in innerHTML contexts.
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}


function handleLogin() {
    const pwd = els.passwordInput.value.trim();
    if (pwd === ADMIN_PASSWORD) {
        els.passwordGate.hidden = true;
        els.adminContent.hidden = false;
        if (els.photoCount) els.photoCount.textContent = "...";
        loadPhotos();
        loadMusicConfig();
        loadSettingsConfig();
        loadEventConfig();
        loadWishes();
    } else {
        els.loginError.hidden = false;
        els.passwordInput.classList.add("input-error");
        els.passwordInput.focus();
    }
}

// ===================== PREVIEW =====================
function showPreview() {
    // Revoke old blob URLs to prevent memory leaks
    els.previewArea.querySelectorAll("img").forEach(img => {
      if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
    });
    els.previewArea.innerHTML = "";

    if (selectedFiles.length === 0) {
        if (els.fileName) els.fileName.textContent = "";
        return;
    }

    for (const file of selectedFiles) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.alt = "Preview";
        els.previewArea.appendChild(img);
    }

    if (els.fileName) {
        els.fileName.textContent = selectedFiles.length === 1
            ? selectedFiles[0].name
            : `${selectedFiles.length} ảnh đã chọn`;
    }

    hideMsg();
}

// ===================== IMAGE COMPRESSION =====================
const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.8;

/**
 * Compress an image file using Canvas API.
 * Resizes to max 1920px and converts to JPEG quality 0.8.
 * @param {File} file
 * @returns {Promise<Blob>}
 */
function compressImage(file) {
    return new Promise((resolve) => {
        if (file.type === "image/gif") { resolve(file); return; }
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(_compressFromImg(img));
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
        img.src = url;
    });
}

/**
 * Compress from an image URL (for existing photos). Uses crossOrigin to allow Canvas export.
 * @param {string} imageUrl
 * @returns {Promise<Blob|null>} compressed blob or null on error
 */
function compressImageFromUrl(imageUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(_compressFromImg(img));
        img.onerror = () => resolve(null);
        img.src = imageUrl;
    });
}

/**
 * Internal: compress from loaded HTMLImageElement
 */
function _compressFromImg(img) {
    return new Promise((resolve) => {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            if (width > height) {
                height = Math.round(height * (MAX_DIMENSION / width));
                width = MAX_DIMENSION;
            } else {
                width = Math.round(width * (MAX_DIMENSION / height));
                height = MAX_DIMENSION;
            }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
            (blob) => resolve(blob || null),
            "image/jpeg",
            JPEG_QUALITY
        );
    });
}

// ===================== OPTIMIZE EXISTING PHOTOS =====================
async function optimizeExistingPhotos() {
    if (photos.length === 0) {
        showError("Không có ảnh nào để tối ưu");
        return;
    }

    if (!confirm(`Tối ưu ${photos.length} ảnh? Ảnh sẽ được nén xuống max 1920px, JPEG 80%. Quá trình có thể mất vài phút.`)) return;

    els.optimizeBtn.disabled = true;
    const statusEl = els.optimizeStatus;
    let optimized = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        statusEl.textContent = `Đang xử lý ${i + 1}/${photos.length}...`;

        try {
            // Load image via <img> with crossOrigin to allow Canvas export
            const compressed = await compressImageFromUrl(photo.photoUrl);
            if (!compressed) {
                skipped++; // image failed to load (404, CORS, etc.)
                continue;
            }

            // 1. Upload compressed to new path FIRST
            const newFilename = `opt_${Date.now()}_${photo.filename}`;
            const newStorageRef = ref(storage, `photos/${newFilename}`);
            await uploadBytes(newStorageRef, compressed);
            const newUrl = await getDownloadURL(newStorageRef);

            // 2. Update Firestore doc BEFORE deleting old file
            const oldFilename = photo.filename;
            await setDoc(doc(db, "photos", photo.id), { photoUrl: newUrl, filename: newFilename }, { merge: true });
            photo.photoUrl = newUrl;
            photo.filename = newFilename;

            // 3. Delete old file LAST (safe — Firestore already points to new file)
            try {
                await deleteObject(ref(storage, `photos/${oldFilename}`));
            } catch (_) { /* ignore if old file already gone */ }

            optimized++;
        } catch (err) {
            console.error(`Optimize error (${photo.id}):`, err);
            errors++;
        }
    }

    els.optimizeBtn.disabled = false;
    statusEl.textContent = "";

    const parts = [];
    if (optimized > 0) parts.push(`${optimized} ảnh đã nén`);
    if (skipped > 0) parts.push(`${skipped} ảnh bỏ qua (đã nhỏ)`);
    if (errors > 0) parts.push(`${errors} lỗi`);

    if (optimized > 0) {
        showSuccess(`Tối ưu xong: ${parts.join(", ")}`);
        renderGrid();
    } else {
        showSuccess(`Tất cả ảnh đã tối ưu sẵn: ${parts.join(", ")}`);
    }
}

// ===================== UPLOAD =====================
async function handlePhotoUpload() {
    hideMsg();

    if (selectedFiles.length === 0) {
        showError("Vui lòng chọn ảnh");
        return;
    }

    const caption = els.caption.value.trim();

    // Validate files
    for (let i = 0; i < selectedFiles.length; i++) {
        const v = validatePhotoUpload(selectedFiles[i], caption);
        if (!v.isValid) {
            showError(`Ảnh ${i + 1}: ${v.errors.join(", ")}`);
            return;
        }
    }

    const total = selectedFiles.length;
    setLoading(els.uploadBtn, true, `Đang upload 0/${total}...`);

    let uploaded = 0;
    let lastError = "";

    for (let i = 0; i < total; i++) {
        const file = selectedFiles[i];
        try {
            setLoading(els.uploadBtn, true, `Đang nén & upload ${i + 1}/${total}...`);

            // Compress image before upload
            const compressed = await compressImage(file);
            const filename = `${Date.now()}_${i}_${sanitizeFilename(file.name)}`;
            const storageRef = ref(storage, `photos/${filename}`);

            await uploadBytes(storageRef, compressed);
            const photoUrl = await getDownloadURL(storageRef);

            await addDoc(collection(db, "photos"), {
                photoUrl,
                caption,
                filename,
                createdAt: serverTimestamp()
            });

            uploaded++;
            setLoading(els.uploadBtn, true, `Đang upload ${uploaded}/${total}...`);
        } catch (err) {
            console.error(`Upload error (file ${i + 1}):`, err);
            lastError = err.code ? `${err.code}: ${err.message}` : err.message;
        }
    }

    // Reset
    selectedFiles = [];
    els.uploadForm.reset();
    els.previewArea.innerHTML = "";
    if (els.fileName) els.fileName.textContent = "";
    setLoading(els.uploadBtn, false, "Upload ảnh");

    if (uploaded === total) {
        showSuccess(`Upload ${uploaded} ảnh thành công!`);
    } else if (uploaded > 0) {
        showError(`Upload ${uploaded}/${total} ảnh. Lỗi: ${lastError}`);
    } else {
        showError(`Không upload được ảnh nào. Lỗi: ${lastError}`);
    }

    loadPhotos();
}

// ===================== LOAD & RENDER PHOTOS =====================
async function loadPhotos() {
    try {
        const q = query(collection(db, "photos"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        let allPhotos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Apply custom order if saved
        try {
            const orderSnap = await getDoc(doc(db, "config", "photoOrder"));
            if (orderSnap.exists() && orderSnap.data().order) {
                const orderList = orderSnap.data().order;
                const orderMap = new Map(orderList.map((id, i) => [id, i]));
                allPhotos.sort((a, b) => {
                    const ai = orderMap.has(a.id) ? orderMap.get(a.id) : Infinity;
                    const bi = orderMap.has(b.id) ? orderMap.get(b.id) : Infinity;
                    return ai - bi;
                });
            }
        } catch (_) { /* ignore order fetch error */ }

        photos = allPhotos;
        renderGrid();
    } catch (err) {
        console.warn("Lỗi tải ảnh:", err.message);
    }
}

// --- Pagination state ---
const PHOTOS_PER_PAGE = 12;
let currentPage = 0;

function renderGrid() {
    // Update photo count
    if (els.photoCount) els.photoCount.textContent = photos.length;

    if (photos.length === 0) {
        els.photoGrid.innerHTML = '<p class="empty-grid">Chưa có ảnh nào</p>';
        if (els.paginationBar) els.paginationBar.hidden = true;
        return;
    }

    const totalPages = Math.ceil(photos.length / PHOTOS_PER_PAGE);
    if (currentPage >= totalPages) currentPage = totalPages - 1;
    if (currentPage < 0) currentPage = 0;

    const start = currentPage * PHOTOS_PER_PAGE;
    const pagePhotos = photos.slice(start, start + PHOTOS_PER_PAGE);

    els.photoGrid.innerHTML = pagePhotos.map((p, i) => {
        const globalIndex = start + i;
        return `
    <div class="photo-card" data-id="${p.id}" data-filename="${p.filename || ''}" data-index="${globalIndex}" draggable="true">
      <div class="drag-handle" title="Kéo để sắp xếp"><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><circle cx="8" cy="4" r="2"/><circle cx="16" cy="4" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="20" r="2"/><circle cx="16" cy="20" r="2"/></svg></div>
      <img src="${p.photoUrl}" alt="${escapeHTML(p.caption) || 'Ảnh team nữ'}" loading="lazy">
      <div class="card-caption">${escapeHTML(p.caption) || "&nbsp;"}</div>
      <button class="delete-btn" title="Xóa ảnh"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
  `;
    }).join("");

    // Delete buttons
    els.photoGrid.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            if (!confirm("Bạn có chắc chắn muốn xóa ảnh này?")) return;
            const card = btn.closest(".photo-card");
            await deletePhoto(card.dataset.id, card.dataset.filename);
        });
    });

    // Pagination controls
    if (els.paginationBar) {
        if (totalPages <= 1) {
            els.paginationBar.hidden = true;
        } else {
            els.paginationBar.hidden = false;
            els.paginationBar.innerHTML = `
                <button class="page-btn" data-dir="prev" ${currentPage === 0 ? 'disabled' : ''}>← Trước</button>
                <span class="page-info">Trang ${currentPage + 1} / ${totalPages}</span>
                <button class="page-btn" data-dir="next" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>Sau →</button>
            `;
            els.paginationBar.querySelectorAll(".page-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    if (btn.dataset.dir === "prev" && currentPage > 0) currentPage--;
                    else if (btn.dataset.dir === "next" && currentPage < totalPages - 1) currentPage++;
                    renderGrid();
                    // Scroll to top of photo section
                    els.photoGrid.scrollIntoView({ behavior: "smooth", block: "start" });
                });
            });
        }
    }

    // Drag & drop reorder (disabled in bulk mode)
    if (!bulkMode) {
        initDragAndDrop();
    } else {
        // Re-apply bulk mode UI to newly rendered cards
        els.photoGrid.querySelectorAll(".photo-card").forEach(card => {
            card.classList.add("bulk-mode");
            card.setAttribute("draggable", "false");
            card.addEventListener("click", handleBulkClick);
            if (bulkSelected.has(card.dataset.id)) {
                card.classList.add("bulk-selected");
            }
        });
    }
}

// ===================== DRAG & DROP REORDER =====================
let dragSrcIndex = null;

function initDragAndDrop() {
    const cards = els.photoGrid.querySelectorAll(".photo-card");

    cards.forEach(card => {
        card.addEventListener("dragstart", (e) => {
            dragSrcIndex = parseInt(card.dataset.index, 10);
            card.classList.add("dragging");
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", dragSrcIndex);
        });

        card.addEventListener("dragend", () => {
            card.classList.remove("dragging");
            els.photoGrid.querySelectorAll(".photo-card").forEach(c => c.classList.remove("drag-over"));
        });

        card.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            card.classList.add("drag-over");
        });

        card.addEventListener("dragleave", () => {
            card.classList.remove("drag-over");
        });

        card.addEventListener("drop", (e) => {
            e.preventDefault();
            card.classList.remove("drag-over");
            const targetIndex = parseInt(card.dataset.index, 10);
            if (dragSrcIndex === null || dragSrcIndex === targetIndex) return;

            // Reorder photos array
            const [moved] = photos.splice(dragSrcIndex, 1);
            photos.splice(targetIndex, 0, moved);

            renderGrid();
            savePhotoOrder();
        });
    });
}

async function savePhotoOrder() {
    try {
        const orderList = photos.map(p => p.id);
        await setDoc(doc(db, "config", "photoOrder"), { order: orderList }, { merge: true });
        showSuccess("Đã lưu thứ tự ảnh");
    } catch (err) {
        console.error("Lỗi lưu thứ tự ảnh:", err);
        showError("Lỗi lưu thứ tự ảnh");
    }
}

async function deletePhoto(id, filename) {
    try {
        await deleteDoc(doc(db, "photos", id));
        if (filename) {
            try {
                await deleteObject(ref(storage, `photos/${filename}`));
            } catch (e) { /* ignore */ }
        }
        photos = photos.filter(p => p.id !== id);
        renderGrid();
    } catch (err) {
        console.error("Delete error:", err);
        showError("Lỗi khi xóa ảnh: " + (err.message || "Không xác định"));
    }
}

// ===================== MUSIC / PLAYLIST =====================
function renderPlaylist(playlist = []) {
    const listEl = document.getElementById("playlist-area");
    const countEl = document.getElementById("playlist-count");
    if (!listEl || !countEl) return;

    countEl.textContent = playlist.length;

    if (playlist.length === 0) {
        listEl.innerHTML = '<li class="playlist-empty">Chưa có bài hát nào trong danh sách.</li>';
        return;
    }

    listEl.innerHTML = playlist.map((track, index) => {
        let title = track.type === "youtube" ? `YouTube: ${track.youtubeUrl || track.youtubeId}` : `MP3: ${track.name || "Audio"}`;
        return `
        <li class="playlist-item" draggable="true">
            <div class="playlist-drag-handle" title="Kéo để sắp xếp"><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><circle cx="8" cy="4" r="2"/><circle cx="16" cy="4" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="20" r="2"/><circle cx="16" cy="20" r="2"/></svg></div>
            <div class="playlist-item-info">
                <span class="playlist-item-index">#${index + 1}</span>
                <span class="playlist-item-title">${escapeHTML(title)}</span>
            </div>
            <button class="delete-track-btn" data-index="${index}">Xóa</button>
        </li>
        `;
    }).join("");

    listEl.querySelectorAll(".delete-track-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.index, 10);
            if (confirm("Xóa bài hát này khỏi danh sách?")) {
                deleteTrack(idx, playlist);
            }
        });
    });

    // Enable drag reorder on playlist
    initPlaylistDrag();
}

async function loadMusicConfig() {
    try {
        const snapshot = await getDoc(doc(db, "config", "music"));
        let playlist = [];
        if (snapshot.exists()) {
            const data = snapshot.data();
            // Migrate old single-track formats if they exist
            if (data.playlist && Array.isArray(data.playlist)) {
                playlist = data.playlist;
            } else if (data.youtubeId) {
                playlist.push({ id: Date.now().toString(), type: "youtube", youtubeId: data.youtubeId, youtubeUrl: data.youtubeUrl });
                // auto migrate
                await setDoc(doc(db, "config", "music"), { playlist });
            } else if (data.audioUrl) {
                playlist.push({ id: Date.now().toString(), type: "mp3", audioUrl: data.audioUrl, name: "Old MP3" });
                // auto migrate
                await setDoc(doc(db, "config", "music"), { playlist });
            }
        }
        renderPlaylist(playlist);
    } catch (err) {
        console.warn("Không tải được cài đặt nhạc:", err.message);
    }
}

async function getCurrentPlaylist() {
    const snapshot = await getDoc(doc(db, "config", "music"));
    let playlist = [];
    if (snapshot.exists() && snapshot.data().playlist) {
        playlist = snapshot.data().playlist;
    }
    return playlist;
}

async function deleteTrack(index, currentPlaylist) {
    if (index < 0 || index >= currentPlaylist.length) return;

    // Optional: Could delete MP3 from storage if type === 'mp3' here, but skipping for safety/simplicity
    currentPlaylist.splice(index, 1);

    try {
        await setDoc(doc(db, "config", "music"), { playlist: currentPlaylist }, { merge: true });
        renderPlaylist(currentPlaylist);
    } catch (err) {
        alert("Lỗi khi xóa bài hát");
    }
}

function extractYouTubeId(url) {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
}

async function handleYoutubeSave(e) {
    e.preventDefault();
    hideMusicMsg();
    setLoading(els.youtubeSaveBtn, true, "Đang lưu...");

    try {
        const ytUrl = els.youtubeInput.value.trim();
        if (!ytUrl) throw new Error("Vui lòng nhập link YouTube");
        const vidId = extractYouTubeId(ytUrl);
        if (!vidId) throw new Error("Link YouTube không hợp lệ");

        const playlist = await getCurrentPlaylist();
        playlist.push({
            id: Date.now().toString(),
            type: "youtube",
            youtubeUrl: ytUrl,
            youtubeId: vidId
        });

        await setDoc(doc(db, "config", "music"), { playlist }, { merge: true });

        showMusicSuccess("Đã thêm nhạc YouTube vào danh sách!");
        els.youtubeForm.reset();
        renderPlaylist(playlist);
    } catch (err) {
        showMusicError(err.message || "Lỗi lưu cài đặt");
    } finally {
        setLoading(els.youtubeSaveBtn, false, "Thêm vào danh sách");
    }
}

async function handleMusicUpload(e) {
    e.preventDefault();
    hideMusicMsg();
    setLoading(els.musicBtn, true, "Đang upload...");

    try {
        const audioFile = els.musicFileInput.files[0];
        if (!audioFile) throw new Error("Vui lòng chọn file nhạc");
        if (!audioFile.type.includes("audio")) throw new Error("Chỉ chấp nhận file MP3");
        if (audioFile.size > 10 * 1024 * 1024) throw new Error("Kích thước file tối đa 10MB");

        const filename = `bgm_${Date.now()}.mp3`;
        const storageRef = ref(storage, `audio/${filename}`);
        await uploadBytes(storageRef, audioFile);
        const audioUrl = await getDownloadURL(storageRef);

        const playlist = await getCurrentPlaylist();
        playlist.push({
            id: Date.now().toString(),
            type: "mp3",
            audioUrl: audioUrl,
            name: audioFile.name
        });

        await setDoc(doc(db, "config", "music"), { playlist }, { merge: true });

        showMusicSuccess("Upload và thêm nhạc thành công!");
        els.musicForm.reset();
        if (els.musicFileName) els.musicFileName.textContent = "";
        renderPlaylist(playlist);
    } catch (err) {
        showMusicError(err.message || "Lỗi upload nhạc");
    } finally {
        setLoading(els.musicBtn, false, "Thêm bài này");
    }
}

// ===================== SETTINGS =====================
async function loadSettingsConfig() {
    try {
        const snapshot = await getDoc(doc(db, "config", "slideshow"));
        if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.slideDuration) els.slideDurationInput.value = data.slideDuration;
            if (data.transitionDuration) els.transitionDurationInput.value = data.transitionDuration;
            if (data.enableKenBurns !== undefined) els.enableKenBurnsInput.checked = data.enableKenBurns;
        }
    } catch (err) {
        console.warn("Không tải được cài đặt trình chiếu:", err.message);
    }
}

async function handleSettingsSave(e) {
    e.preventDefault();
    hideSettingsMsg();
    setLoading(els.settingsSaveBtn, true, "Đang lưu...");

    try {
        const slideDuration = parseInt(els.slideDurationInput.value, 10) || 8;
        const transitionDuration = parseFloat(els.transitionDurationInput.value) || 1.5;
        const enableKenBurns = els.enableKenBurnsInput.checked;

        await setDoc(doc(db, "config", "slideshow"), {
            slideDuration,
            transitionDuration,
            enableKenBurns
        }, { merge: true });

        showSettingsSuccess("Lưu cài đặt thành công!");
    } catch (err) {
        showSettingsError(err.message || "Lỗi lưu cài đặt");
    } finally {
        setLoading(els.settingsSaveBtn, false, "Lưu Cài đặt");
    }
}

// ===================== EVENT CONFIG =====================
async function loadEventConfig() {
    try {
        const snapshot = await getDoc(doc(db, "config", "event"));
        if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.introTitle) els.eventIntroTitle.value = data.introTitle;
            if (data.introSubtitle) els.eventIntroSubtitle.value = data.introSubtitle;
            if (data.introDate) els.eventIntroDate.value = data.introDate;
            if (data.outroTitle) els.eventOutroTitle.value = data.outroTitle;
            if (data.outroSubtitle) els.eventOutroSubtitle.value = data.outroSubtitle;
            if (data.outroTagline) els.eventOutroTagline.value = data.outroTagline;
        }
    } catch (err) {
        console.warn("Không tải được cài đặt sự kiện:", err.message);
    }
}

async function handleEventSave(e) {
    e.preventDefault();
    hideEventMsg();
    setLoading(els.eventSaveBtn, true, "Đang lưu...");

    try {
        await setDoc(doc(db, "config", "event"), {
            introTitle: els.eventIntroTitle.value.trim(),
            introSubtitle: els.eventIntroSubtitle.value.trim(),
            introDate: els.eventIntroDate.value.trim(),
            outroTitle: els.eventOutroTitle.value.trim(),
            outroSubtitle: els.eventOutroSubtitle.value.trim(),
            outroTagline: els.eventOutroTagline.value.trim(),
        }, { merge: true });

        showEventSuccess("Lưu nội dung sự kiện thành công!");
    } catch (err) {
        showEventError(err.message || "Lỗi lưu cài đặt");
    } finally {
        setLoading(els.eventSaveBtn, false, "Lưu nội dung");
    }
}

// ===================== SLIDESHOW PREVIEW =====================
let previewInterval = null;

async function openPreview() {
    if (photos.length === 0) {
        showError("Chưa có ảnh nào để xem trước");
        return;
    }

    // Fetch wishes for preview
    let wishes = [];
    try {
        const wishSnap = await getDocs(query(collection(db, "wishes"), orderBy("createdAt", "asc")));
        wishes = wishSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (_) { /* ignore */ }

    if (wishes.length === 0) {
        wishes = [{ id: "preview-w", senderName: "Preview", message: "Chưa có lời chúc nào" }];
    }

    // Load event config for intro/outro
    try {
        const evSnap = await getDoc(doc(db, "config", "event"));
        if (evSnap.exists()) window.eventConfig = evSnap.data();
    } catch (_) { /* ignore */ }

    // Set slideshow config
    const slideDur = parseInt(els.slideDurationInput.value, 10) || 8;
    const transDur = parseFloat(els.transitionDurationInput.value) || 1.5;
    const kenBurns = els.enableKenBurnsInput.checked;
    window.slideshowConfig = { slideDuration: slideDur, transitionDuration: transDur, enableKenBurns: kenBurns };

    const slides = buildSlides([...photos], [...wishes]);
    const sequence = ["intro", ...slides, "outro"];
    let currentIndex = 0;

    els.previewModal.hidden = false;
    els.previewContainer.innerHTML = "";

    // Show intro
    const introEl = createIntroSlide();
    if (kenBurns) introEl.classList.add("kenburns-zoom-in");
    introEl.classList.add("active");
    els.previewContainer.appendChild(introEl);

    // Auto-play loop
    previewInterval = setInterval(async () => {
        currentIndex = (currentIndex + 1) % sequence.length;
        const item = sequence[currentIndex];
        try {
            if (item === "intro" || item === "outro") {
                transitionToSpecialSlide(els.previewContainer, item);
            } else {
                await transitionToSlide(els.previewContainer, item);
            }
        } catch (err) {
            console.error("Preview slide error:", err);
        }
    }, slideDur * 1000);
}

function closePreview() {
    if (previewInterval) {
        clearInterval(previewInterval);
        previewInterval = null;
    }
    els.previewModal.hidden = true;
    els.previewContainer.innerHTML = "";
}

// ===================== EXPORT VIDEO =====================
let isExporting = false;

async function startExport() {
    if (isExporting) return;
    if (photos.length === 0) {
        showError("Chưa có ảnh nào để xuất video");
        return;
    }

    // Fetch wishes
    let wishes = [];
    try {
        const wishSnap = await getDocs(query(collection(db, "wishes"), orderBy("createdAt", "asc")));
        wishes = wishSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (_) { /* ignore */ }
    if (wishes.length === 0) {
        wishes = [{ id: "export-w", senderName: "Team", message: "Chúc mừng ngày 8/3" }];
    }

    // Load event config
    try {
        const evSnap = await getDoc(doc(db, "config", "event"));
        if (evSnap.exists()) window.eventConfig = evSnap.data();
    } catch (_) { /* ignore */ }

    const slideDur = parseInt(els.slideDurationInput.value, 10) || 8;
    const transDur = parseFloat(els.transitionDurationInput.value) || 1.5;
    const kenBurns = els.enableKenBurnsInput.checked;
    window.slideshowConfig = { slideDuration: slideDur, transitionDuration: transDur, enableKenBurns: kenBurns };

    const slides = buildSlides([...photos], [...wishes]);
    const sequence = ["intro", ...slides, "outro"];
    const totalSlides = sequence.length;
    const totalDuration = totalSlides * slideDur;

    if (!confirm(`Xuất video ${totalSlides} slide (~${totalDuration}s). Quá trình sẽ mất khoảng ${totalDuration}s. Tiếp tục?`)) return;

    isExporting = true;
    els.previewModal.hidden = false;
    els.previewContainer.innerHTML = "";

    // Update header text
    const headerSpan = els.previewModal.querySelector(".preview-modal-header span");
    const origText = headerSpan.textContent;
    headerSpan.textContent = `Đang xuất video... (0/${totalSlides})`;

    // Show intro first
    const introEl = createIntroSlide();
    if (kenBurns) introEl.classList.add("kenburns-zoom-in");
    introEl.classList.add("active");
    els.previewContainer.appendChild(introEl);

    // Start recording the preview container
    const stream = els.previewContainer.captureStream
        ? els.previewContainer.captureStream(30)
        : null;

    if (!stream) {
        showError("Trình duyệt không hỗ trợ captureStream. Hãy dùng Chrome.");
        isExporting = false;
        closePreview();
        return;
    }

    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.start(100);

    // Play through all slides
    for (let i = 0; i < totalSlides; i++) {
        headerSpan.textContent = `Đang xuất video... (${i + 1}/${totalSlides})`;
        const item = sequence[i];
        if (i > 0) {
            try {
                if (item === "intro" || item === "outro") {
                    transitionToSpecialSlide(els.previewContainer, item);
                } else {
                    await transitionToSlide(els.previewContainer, item);
                }
            } catch (err) {
                console.error("Export slide error:", err);
            }
        }
        // Wait for slide duration
        await new Promise(r => setTimeout(r, slideDur * 1000));
    }

    // Stop recording
    recorder.stop();
    await new Promise(r => { recorder.onstop = r; });

    // Download
    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `slideshow-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);

    headerSpan.textContent = origText;
    isExporting = false;
    closePreview();
}

// ===================== WISHES MANAGEMENT =====================
async function loadWishes() {
    if (els.wishList) els.wishList.innerHTML = '<p class="empty-grid">Đang tải...</p>';
    try {
        const q = query(collection(db, "wishes"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const wishes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        renderWishes(wishes);
    } catch (err) {
        console.warn("Lỗi tải lời chúc:", err.message);
        if (els.wishList) els.wishList.innerHTML = '<p class="empty-grid">Không tải được lời chúc</p>';
    }
}

function renderWishes(wishes) {
    if (els.wishCount) els.wishCount.textContent = wishes.length;

    if (!els.wishList) return;

    if (wishes.length === 0) {
        els.wishList.innerHTML = '<p class="empty-grid">Chưa có lời chúc nào</p>';
        return;
    }

    els.wishList.innerHTML = wishes.map(w => {
        const date = w.createdAt?.toDate ? w.createdAt.toDate().toLocaleDateString("vi-VN") : "";
        return `
        <div class="wish-item" data-id="${w.id}">
            <div class="wish-item-content">
                <span class="wish-sender">${escapeHTML(w.senderName)}</span>
                <span class="wish-date">${date}</span>
                <p class="wish-message">${escapeHTML(w.message)}</p>
            </div>
            <button class="wish-delete-btn" title="Xóa lời chúc"><svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>`;
    }).join("");

    els.wishList.querySelectorAll(".wish-delete-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const item = btn.closest(".wish-item");
            const id = item.dataset.id;
            if (!confirm("Xóa lời chúc này?")) return;
            try {
                await deleteDoc(doc(db, "wishes", id));
                item.remove();
                // Update count
                const remaining = els.wishList.querySelectorAll(".wish-item").length;
                if (els.wishCount) els.wishCount.textContent = remaining;
                if (remaining === 0) {
                    els.wishList.innerHTML = '<p class="empty-grid">Chưa có lời chúc nào</p>';
                }
            } catch (err) {
                console.error("Lỗi xóa lời chúc:", err);
                showError("Lỗi xóa lời chúc: " + (err.message || ""));
            }
        });
    });
}

// ===================== BULK DELETE =====================
let bulkMode = false;
let bulkSelected = new Set();

function enterBulkMode() {
    bulkMode = true;
    bulkSelected.clear();
    els.bulkSelectBtn.hidden = true;
    els.bulkSelectAllBtn.hidden = false;
    els.bulkDeleteBtn.hidden = false;
    els.bulkCancelBtn.hidden = false;
    els.optimizeBtn.hidden = true;
    els.dedupeBtn.hidden = true;
    updateBulkCount();
    // Add checkboxes to photo cards
    els.photoGrid.querySelectorAll(".photo-card").forEach(card => {
        card.classList.add("bulk-mode");
        card.setAttribute("draggable", "false");
        card.addEventListener("click", handleBulkClick);
    });
}

function exitBulkMode() {
    bulkMode = false;
    bulkSelected.clear();
    els.bulkSelectBtn.hidden = false;
    els.bulkSelectAllBtn.hidden = true;
    els.bulkDeleteBtn.hidden = true;
    els.bulkCancelBtn.hidden = true;
    els.optimizeBtn.hidden = false;
    els.dedupeBtn.hidden = false;
    els.photoGrid.querySelectorAll(".photo-card").forEach(card => {
        card.classList.remove("bulk-mode", "bulk-selected");
        card.setAttribute("draggable", "true");
        card.removeEventListener("click", handleBulkClick);
    });
}

function bulkSelectAll() {
    // Select ALL photos, not just current page
    photos.forEach(p => bulkSelected.add(p.id));
    els.photoGrid.querySelectorAll(".photo-card").forEach(card => {
        card.classList.add("bulk-selected");
    });
    updateBulkCount();
}

function handleBulkClick(e) {
    // Don't toggle when clicking delete button
    if (e.target.closest(".delete-btn")) return;
    const card = e.currentTarget;
    const id = card.dataset.id;
    if (bulkSelected.has(id)) {
        bulkSelected.delete(id);
        card.classList.remove("bulk-selected");
    } else {
        bulkSelected.add(id);
        card.classList.add("bulk-selected");
    }
    updateBulkCount();
}

function updateBulkCount() {
    if (els.bulkCount) els.bulkCount.textContent = bulkSelected.size;
    els.bulkDeleteBtn.disabled = bulkSelected.size === 0;
}

async function bulkDeleteSelected() {
    if (bulkSelected.size === 0) return;
    if (!confirm(`Xóa ${bulkSelected.size} ảnh đã chọn?`)) return;

    els.bulkDeleteBtn.disabled = true;
    els.bulkDeleteBtn.textContent = "Đang xóa...";
    let deleted = 0;
    let errors = 0;

    for (const id of bulkSelected) {
        const photo = photos.find(p => p.id === id);
        if (!photo) continue;
        try {
            await deleteDoc(doc(db, "photos", id));
            if (photo.filename) {
                try { await deleteObject(ref(storage, `photos/${photo.filename}`)); } catch (_) {}
            }
            deleted++;
        } catch (err) {
            console.error("Bulk delete error:", err);
            errors++;
        }
    }

    // Remove deleted from local array
    photos = photos.filter(p => !bulkSelected.has(p.id));
    // Restore button content (was changed to "Đang xóa...")
    els.bulkDeleteBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Xóa đã chọn (<span id="bulk-count">0</span>)`;
    els.bulkCount = document.getElementById("bulk-count");
    exitBulkMode();
    renderGrid();

    if (errors > 0) {
        showError(`Đã xóa ${deleted} ảnh, ${errors} lỗi`);
    } else {
        showSuccess(`Đã xóa ${deleted} ảnh`);
    }
}

// ===================== DELETE DUPLICATES =====================

/**
 * Extract the original filename from a stored filename.
 * Patterns:
 *   "1772460762964_0_ECOM_0614.JPG"         → "ECOM_0614.JPG"
 *   "opt_1709400000_1772460762964_0_ECOM.JPG" → "ECOM.JPG" (best effort)
 * Fallback: return the full filename lowercased.
 */
function extractOriginalName(filename) {
    if (!filename) return "";
    let name = filename;
    // Strip "opt_timestamp_" prefix if present
    if (name.startsWith("opt_")) {
        name = name.replace(/^opt_\d+_/, "");
    }
    // Strip "timestamp_index_" prefix: digits_digits_rest
    const match = name.match(/^\d+_\d+_(.+)$/);
    if (match) return match[1].toLowerCase();
    // Fallback: strip single "timestamp_" prefix
    const match2 = name.match(/^\d+_(.+)$/);
    if (match2) return match2[1].toLowerCase();
    return name.toLowerCase();
}

async function deleteDuplicates() {
    if (photos.length < 2) {
        showError("Không đủ ảnh để kiểm tra trùng lặp");
        return;
    }

    // Group by extracted original filename
    const groups = new Map(); // originalName -> [photo, photo, ...]
    for (const photo of photos) {
        const key = extractOriginalName(photo.filename);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(photo);
    }

    // Find duplicates: keep first in each group, mark rest as duplicate
    const duplicateIds = new Set();
    for (const [, group] of groups) {
        if (group.length > 1) {
            // Keep the first, mark the rest
            for (let i = 1; i < group.length; i++) {
                duplicateIds.add(group[i].id);
            }
        }
    }

    if (duplicateIds.size === 0) {
        showSuccess("Không tìm thấy ảnh trùng lặp");
        return;
    }

    showSuccess(`Tìm thấy ${duplicateIds.size} ảnh trùng lặp — đã chọn sẵn, bạn có thể bỏ chọn rồi bấm Xóa`);

    // Enter bulk mode with duplicates pre-selected
    enterBulkMode();
    duplicateIds.forEach(id => {
        bulkSelected.add(id);
        const card = els.photoGrid.querySelector(`.photo-card[data-id="${id}"]`);
        if (card) card.classList.add("bulk-selected");
    });
    updateBulkCount();
}

// ===================== PLAYLIST DRAG REORDER =====================
function initPlaylistDrag() {
    const listEl = document.getElementById("playlist-area");
    if (!listEl) return;

    let dragItem = null;

    listEl.querySelectorAll(".playlist-item").forEach(item => {
        item.setAttribute("draggable", "true");

        item.addEventListener("dragstart", (e) => {
            dragItem = item;
            item.classList.add("playlist-dragging");
            e.dataTransfer.effectAllowed = "move";
        });

        item.addEventListener("dragend", () => {
            item.classList.remove("playlist-dragging");
            listEl.querySelectorAll(".playlist-item").forEach(i => i.classList.remove("playlist-drag-over"));
            dragItem = null;
        });

        item.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            item.classList.add("playlist-drag-over");
        });

        item.addEventListener("dragleave", () => {
            item.classList.remove("playlist-drag-over");
        });

        item.addEventListener("drop", async (e) => {
            e.preventDefault();
            item.classList.remove("playlist-drag-over");
            if (!dragItem || dragItem === item) return;

            const fromIdx = parseInt(dragItem.querySelector(".delete-track-btn").dataset.index, 10);
            const toIdx = parseInt(item.querySelector(".delete-track-btn").dataset.index, 10);

            try {
                const playlist = await getCurrentPlaylist();
                if (fromIdx < 0 || fromIdx >= playlist.length || toIdx < 0 || toIdx >= playlist.length) return;
                const [moved] = playlist.splice(fromIdx, 1);
                playlist.splice(toIdx, 0, moved);
                await setDoc(doc(db, "config", "music"), { playlist }, { merge: true });
                renderPlaylist(playlist);
                showMusicSuccess("Đã lưu thứ tự nhạc");
            } catch (err) {
                console.error("Playlist reorder error:", err);
                showMusicError("Lỗi sắp xếp danh sách nhạc");
            }
        });
    });
}

// ===================== UI HELPERS =====================
const _autoHideTimers = new WeakMap();
function autoHide(el, delay = 4000) {
    const prev = _autoHideTimers.get(el);
    if (prev) clearTimeout(prev);
    _autoHideTimers.set(el, setTimeout(() => { el.hidden = true; }, delay));
}

function showSuccess(msg) {
    els.errorMsg.hidden = true;
    els.successMsg.textContent = msg;
    els.successMsg.hidden = false;
    autoHide(els.successMsg);
}
function showError(msg) {
    els.successMsg.hidden = true;
    els.errorMsg.textContent = msg;
    els.errorMsg.hidden = false;
    autoHide(els.errorMsg, 6000);
}
function hideMsg() {
    els.successMsg.hidden = true;
    els.errorMsg.hidden = true;
}
function showMusicSuccess(msg) {
    els.musicErrorMsg.hidden = true;
    els.musicSuccessMsg.textContent = msg;
    els.musicSuccessMsg.hidden = false;
    autoHide(els.musicSuccessMsg);
}
function showMusicError(msg) {
    els.musicSuccessMsg.hidden = true;
    els.musicErrorMsg.textContent = msg;
    els.musicErrorMsg.hidden = false;
    autoHide(els.musicErrorMsg, 6000);
}
function hideMusicMsg() {
    els.musicSuccessMsg.hidden = true;
    els.musicErrorMsg.hidden = true;
}
function showSettingsSuccess(msg) {
    els.settingsErrorMsg.hidden = true;
    els.settingsSuccessMsg.textContent = msg;
    els.settingsSuccessMsg.hidden = false;
    autoHide(els.settingsSuccessMsg);
}
function showSettingsError(msg) {
    els.settingsSuccessMsg.hidden = true;
    els.settingsErrorMsg.textContent = msg;
    els.settingsErrorMsg.hidden = false;
    autoHide(els.settingsErrorMsg, 6000);
}
function hideSettingsMsg() {
    els.settingsSuccessMsg.hidden = true;
    els.settingsErrorMsg.hidden = true;
}
function setLoading(btn, loading, text) {
    btn.disabled = loading;
    btn.textContent = text;
}
function showEventSuccess(msg) {
    els.eventErrorMsg.hidden = true;
    els.eventSuccessMsg.textContent = msg;
    els.eventSuccessMsg.hidden = false;
    autoHide(els.eventSuccessMsg);
}
function showEventError(msg) {
    els.eventSuccessMsg.hidden = true;
    els.eventErrorMsg.textContent = msg;
    els.eventErrorMsg.hidden = false;
    autoHide(els.eventErrorMsg, 6000);
}
function hideEventMsg() {
    els.eventSuccessMsg.hidden = true;
    els.eventErrorMsg.hidden = true;
}
