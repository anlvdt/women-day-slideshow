// SlideshowEngine — Fetch photos + wishes from Firestore, build slides, autoplay
// ES module: imports Firebase SDK from CDN

import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/**
 * Sanitize wish HTML to only allow safe SVG icons and basic text.
 * Strips all tags except <svg>, <path>, <circle>, <line>, <polyline>,
 * <polygon>, <rect>, <ellipse>, <g>, <defs>, <radialGradient>, <stop>.
 * Removes event handler attributes (on*) and javascript: URLs.
 *
 * @param {string} html - Raw HTML string from Firestore
 * @returns {string} - Sanitized HTML safe for innerHTML
 */
export function sanitizeWishHTML(html) {
  if (!html) return "";

  const ALLOWED_TAGS = new Set([
    'svg', 'path', 'circle', 'line', 'polyline', 'polygon',
    'rect', 'ellipse', 'g', 'defs', 'radialgradient', 'stop',
    'br', 'b', 'i', 'em', 'strong', 'span',
  ]);

  const ALLOWED_SVG_ATTRS = new Set([
    'viewbox', 'd', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
    'width', 'height', 'fill', 'stroke', 'stroke-width', 'stroke-linecap',
    'stroke-linejoin', 'opacity', 'transform', 'points', 'rx', 'ry',
    'offset', 'stop-color', 'id', 'class', 'style',
  ]);

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstChild;

  function cleanNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return;
    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.remove();
      return;
    }

    const tag = node.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      // Replace disallowed element with its text content
      const text = document.createTextNode(node.textContent);
      node.parentNode.replaceChild(text, node);
      return;
    }

    // Remove dangerous attributes
    const attrs = Array.from(node.attributes);
    for (const attr of attrs) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on') || attr.value.includes('javascript:')) {
        node.removeAttribute(attr.name);
      } else if (tag === 'svg' || ALLOWED_TAGS.has(tag)) {
        if (!ALLOWED_SVG_ATTRS.has(name) && name !== 'xmlns') {
          node.removeAttribute(attr.name);
        }
      }
    }

    // Recurse into children (iterate backwards since we may remove nodes)
    const children = Array.from(node.childNodes);
    for (const child of children) {
      cleanNode(child);
    }
  }

  const children = Array.from(root.childNodes);
  for (const child of children) {
    cleanNode(child);
  }

  return root.innerHTML;
}

/**
 * Fisher-Yates shuffle algorithm to randomly reorder an array in place.
 * @param {Array} array
 * @returns {Array} - The shuffled array
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Build slides by pairing photos with wishes using round-robin re-shuffled distribution.
 * Each wish appears floor(N/W) or ceil(N/W) times (differs by at most 1).
 * Each round of wishes is independently shuffled for variety.
 * Returns [] if photos is empty.
 *
 * @param {Array} photos - PhotoDocument[]
 * @param {Array} wishes - WishDocument[]
 * @returns {Array<{photo: object, wish: object}>}
 */
export function buildSlides(photos, wishes) {
  if (photos.length === 0) {
    return [];
  }

  // Defensive copy before shuffle to avoid mutating caller's arrays
  const photosCopy = [...photos];
  const wishesCopy = wishes.length > 0 ? [...wishes] : [];

  shuffleArray(photosCopy);

  // If no wishes, return slides with photo only (no wish overlay)
  if (wishesCopy.length === 0) {
    return photosCopy.map(photo => ({
      photo,
      wish: null
    }));
  }

  const slideCount = Math.max(photosCopy.length, wishesCopy.length);

  // Build evenly-distributed wish list via round-robin with re-shuffle per round
  const distributedWishes = [];
  while (distributedWishes.length < slideCount) {
    const batch = [...wishesCopy];
    shuffleArray(batch);
    distributedWishes.push(...batch);
  }
  distributedWishes.length = slideCount; // trim to exact count

  const slides = [];
  for (let i = 0; i < slideCount; i++) {
    slides.push({
      photo: photosCopy[i % photosCopy.length],
      wish: distributedWishes[i]
    });
  }

  return slides;
}

// --- Ken Burns classes (enhanced with combo effects) ---
const KENBURNS_CLASSES = [
  'kenburns-zoom-in', 'kenburns-zoom-out',
  'kenburns-pan-left', 'kenburns-pan-right',
  'kenburns-pan-up', 'kenburns-pan-down',
  'kenburns-zoom-pan-diag', 'kenburns-zoom-pan-diag2'
];

// --- Transition effects (enhanced) ---
const TRANSITION_EFFECTS = ['crossfade', 'slide-right', 'slide-left', 'zoom', 'flip', 'fade-blur', 'scale-fade', 'curtain'];

// --- Orientation cache (#13) — bounded to prevent unbounded growth ---
const _orientationCache = new Map();
const _ORIENTATION_CACHE_MAX = 200;

/**
 * Detect image orientation with caching.
 */
export function detectOrientation(imageUrl) {
  if (_orientationCache.has(imageUrl)) {
    return Promise.resolve(_orientationCache.get(imageUrl));
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const result = img.naturalWidth >= img.naturalHeight ? "landscape" : "portrait";
      if (_orientationCache.size >= _ORIENTATION_CACHE_MAX) {
        // Evict oldest entry
        const firstKey = _orientationCache.keys().next().value;
        _orientationCache.delete(firstKey);
      }
      _orientationCache.set(imageUrl, result);
      resolve(result);
    };
    img.onerror = () => {
      _orientationCache.set(imageUrl, "landscape");
      resolve("landscape");
    };
    img.src = imageUrl;
  });
}

/**
 * Apply Ken Burns effect to an element, synced with slide duration.
 */
function applyKenBurns(el, config) {
  if (!config.enableKenBurns) return;
  const kbClass = KENBURNS_CLASSES[Math.floor(Math.random() * KENBURNS_CLASSES.length)];
  el.classList.add(kbClass);
  // Sync KB duration with slide duration
  const kbDuration = (config.slideDuration || 8) + (config.transitionDuration || 1.5);
  el.style.setProperty('--kb-duration', `${kbDuration}s`);
}

/**
 * Build a slide DOM element from slideData (shared by renderSlide and transitionToSlide).
 * @returns {Promise<HTMLElement>}
 */
async function buildSlideElement(slideData) {
  const slide = document.createElement("div");
  slide.classList.add("slide");
  const config = window.slideshowConfig || { slideDuration: 8, transitionDuration: 1.5, enableKenBurns: true };

  // Guard against missing photo URL
  if (!slideData.photo?.photoUrl) {
    const placeholder = document.createElement("div");
    placeholder.classList.add("slide-placeholder");
    slide.appendChild(placeholder);
    return slide;
  }

  const orientation = await detectOrientation(slideData.photo.photoUrl);

  if (orientation === "portrait") {
    const blurBg = document.createElement("div");
    blurBg.classList.add("slide-blur-bg");
    applyKenBurns(blurBg, config);
    blurBg.style.backgroundImage = `url('${slideData.photo.photoUrl.replace(/'/g, "\\'")}')`;

    const foreImg = document.createElement("img");
    foreImg.classList.add("slide-foreground");
    applyKenBurns(foreImg, config);
    foreImg.src = slideData.photo.photoUrl;
    foreImg.alt = slideData.photo.caption || "Ảnh team nữ";
    foreImg.onerror = () => {
      foreImg.remove();
      blurBg.remove();
      const placeholder = document.createElement("div");
      placeholder.classList.add("slide-placeholder");
      slide.insertBefore(placeholder, slide.firstChild);
    };

    slide.appendChild(blurBg);
    slide.appendChild(foreImg);
  } else {
    const landBg = document.createElement("div");
    landBg.classList.add("slide-bg");
    landBg.setAttribute("role", "img");
    landBg.setAttribute("aria-label", slideData.photo.caption || "Ảnh team nữ");
    landBg.style.backgroundImage = `url('${slideData.photo.photoUrl.replace(/'/g, "\\'")}')`;
    landBg.style.backgroundSize = "cover";
    landBg.style.backgroundPosition = "center";
    applyKenBurns(landBg, config);
    slide.appendChild(landBg);

    const testImg = new Image();
    testImg.onerror = () => {
      landBg.remove();
      const placeholder = document.createElement("div");
      placeholder.classList.add("slide-placeholder");
      slide.insertBefore(placeholder, slide.firstChild);
    };
    testImg.src = slideData.photo.photoUrl;
  }

  // Wish overlay with stagger animation (skip if no wish)
  if (slideData.wish) {
    const overlay = document.createElement("div");
    overlay.classList.add("wish-overlay");

    const senderEl = document.createElement("h2");
    senderEl.classList.add("wish-sender");
    senderEl.textContent = slideData.wish.senderName;

    const messageEl = document.createElement("div");
    messageEl.classList.add("wish-message");

    // Truncate long messages for slideshow display (keeps SVG icons, trims text)
    const MAX_DISPLAY_CHARS = 200;
    let msgHtml = sanitizeWishHTML(slideData.wish.message);
    // Strip tags to measure text length
    const textOnly = msgHtml.replace(/<[^>]*>?/gm, "").trim();
    if (textOnly.length > MAX_DISPLAY_CHARS) {
      // Truncate text-only version and re-wrap
      const truncated = textOnly.substring(0, MAX_DISPLAY_CHARS) + "…";
      messageEl.textContent = truncated;
    } else {
      messageEl.innerHTML = msgHtml;
    }

    overlay.appendChild(senderEl);
    overlay.appendChild(messageEl);
    slide.appendChild(overlay);
  }

  if (slideData.photo.caption) {
    const caption = document.createElement("p");
    caption.classList.add("slide-caption");
    caption.textContent = slideData.photo.caption;
    slide.appendChild(caption);
  }

  return slide;
}

/**
 * Create a slide DOM element for the given slideData and render it.
 */
export async function renderSlide(container, slideData) {
  const slide = await buildSlideElement(slideData);
  slide.classList.add("active");
  container.innerHTML = "";
  container.appendChild(slide);
}

export async function transitionToSlide(container, slideData) {
  const oldSlide = container.querySelector(".slide.active, .intro-slide.active, .outro-slide.active");
  const config = window.slideshowConfig || { slideDuration: 8, transitionDuration: 1.5, enableKenBurns: true };

  const newSlide = await buildSlideElement(slideData);
  newSlide.style.transitionDuration = `${config.transitionDuration}s`;

  // Pick a random transition effect
  const effect = TRANSITION_EFFECTS[Math.floor(Math.random() * TRANSITION_EFFECTS.length)];

  if (effect !== 'crossfade') {
    newSlide.classList.add(`transition-${effect}`);
    const transProps = effect === 'fade-blur'
      ? `filter ${config.transitionDuration}s ease, opacity ${config.transitionDuration}s ease`
      : effect === 'curtain'
        ? `clip-path ${config.transitionDuration}s ease`
        : `transform ${config.transitionDuration}s ease, opacity ${config.transitionDuration}s ease`;
    newSlide.style.transition = transProps;
  }

  container.appendChild(newSlide);
  void newSlide.offsetWidth;
  newSlide.classList.add("active");

  if (oldSlide) {
    if (effect === 'slide-right') {
      oldSlide.style.transition = `transform ${config.transitionDuration}s ease, opacity ${config.transitionDuration}s ease`;
      oldSlide.classList.add("transition-exit-left");
    } else if (effect === 'slide-left') {
      oldSlide.style.transition = `transform ${config.transitionDuration}s ease, opacity ${config.transitionDuration}s ease`;
      oldSlide.classList.add("transition-exit-right");
    } else {
      oldSlide.classList.remove("active");
    }
  }

  setTimeout(() => {
    // Remove all old slides except the newly added one (last child)
    Array.from(container.children).forEach(child => {
      if (child !== newSlide) child.remove();
    });
  }, config.transitionDuration * 1000 + 100);
}

/**
 * Create an intro slide DOM element.
 * Reads event config from window.eventConfig if available.
 * @returns {HTMLElement}
 */
export function createIntroSlide() {
  const ev = window.eventConfig || {};
  const slide = document.createElement("div");
  slide.classList.add("intro-slide");

  const title = document.createElement("h1");
  title.classList.add("intro-title");
  title.textContent = ev.introTitle || "Chúc mừng ngày Quốc tế Phụ nữ";

  const divider = document.createElement("div");
  divider.classList.add("intro-divider");

  const subtitle = document.createElement("p");
  subtitle.classList.add("intro-subtitle");
  subtitle.textContent = ev.introSubtitle || "Gửi tặng những bông hoa đẹp nhất của công ty";

  const date = document.createElement("p");
  date.classList.add("intro-date");
  date.textContent = ev.introDate || "8 / 3";

  slide.appendChild(title);
  slide.appendChild(divider);
  slide.appendChild(subtitle);
  slide.appendChild(date);

  // Add continuous glow after initial reveal, respecting config timing
  const cfg = window.slideshowConfig || { slideDuration: 8 };
  const glowDelay = Math.max(0, Math.min(1600, cfg.slideDuration * 1000 - 200));
  setTimeout(() => title.classList.add("title-glow"), glowDelay);

  return slide;
}

/**
 * Create an outro slide DOM element.
 * Reads event config from window.eventConfig if available.
 * @returns {HTMLElement}
 */
export function createOutroSlide() {
  const ev = window.eventConfig || {};
  const slide = document.createElement("div");
  slide.classList.add("outro-slide");

  const title = document.createElement("h1");
  title.classList.add("outro-title");
  title.textContent = ev.outroTitle || "Cảm ơn các chị em";

  const divider = document.createElement("div");
  divider.classList.add("outro-divider");

  const subtitle = document.createElement("p");
  subtitle.classList.add("outro-subtitle");
  subtitle.textContent = ev.outroSubtitle || "Chúc luôn rạng rỡ, hạnh phúc và thành công";

  const tagline = document.createElement("p");
  tagline.classList.add("outro-tagline");
  tagline.textContent = ev.outroTagline || "Happy Women's Day";

  slide.appendChild(title);
  slide.appendChild(divider);
  slide.appendChild(subtitle);
  slide.appendChild(tagline);

  // Add continuous glow after initial reveal, respecting config timing
  const cfg2 = window.slideshowConfig || { slideDuration: 8 };
  const glowDelay2 = Math.max(0, Math.min(1600, cfg2.slideDuration * 1000 - 200));
  setTimeout(() => title.classList.add("title-glow"), glowDelay2);

  return slide;
}

export function transitionToSpecialSlide(container, type) {
  const oldSlide = container.querySelector(".slide.active, .intro-slide.active, .outro-slide.active");
  const newSlide = type === "intro" ? createIntroSlide() : createOutroSlide();
  const config = window.slideshowConfig || { slideDuration: 8, transitionDuration: 1.5, enableKenBurns: true };

  newSlide.style.transitionDuration = `${config.transitionDuration}s`;
  if (config.enableKenBurns) {
    // Add a subtle Ken Burns zoom to intro/outro
    newSlide.classList.add("kenburns-zoom-in");
  }

  container.appendChild(newSlide);

  // Trigger reflow
  void newSlide.offsetWidth;
  newSlide.classList.add("active");
  if (oldSlide) oldSlide.classList.remove("active");

  setTimeout(() => {
    // Remove all old slides except the newly added one (last child)
    Array.from(container.children).forEach(child => {
      if (child !== newSlide) child.remove();
    });
  }, config.transitionDuration * 1000 + 100);
}

/**
 * Initialize the slideshow: fetch photos + wishes from Firestore with realtime sync,
 * build slides, show intro first, then autoplay slides, then outro, then loop.
 * When photos or wishes change in Firestore, the sequence is rebuilt seamlessly.
 *
 * @param {HTMLElement} containerEl
 */
export async function initSlideshow(containerEl) {
  // Show loading state while fetching data
  containerEl.innerHTML = '<div class="loading-message">Đang tải dữ liệu...</div>';

  // Fetch Settings (one-time, not realtime)
  const configQuery = await getDocs(query(collection(db, "config")));
  let config = { slideDuration: 8, transitionDuration: 1.5, enableKenBurns: true };
  let eventConfig = {};
  configQuery.forEach(d => {
    if (d.id === "slideshow") {
      config = { ...config, ...d.data() };
    }
    if (d.id === "event") {
      eventConfig = d.data();
    }
  });
  window.slideshowConfig = config;
  window.eventConfig = eventConfig;

  // Realtime data state
  let photos = [];
  let wishes = [];
  let sequence = [];
  let currentIndex = 0;
  let isPlaying = false;
  let loopMode = "once"; // "once" = intro→slides→outro→stop, "loop" = continuous
  let loopTimeoutId = null;
  let initialized = false;
  let _unsubPhotos = null;
  let _unsubWishes = null;

  function rebuildSequence() {
    const slides = buildSlides([...photos], [...wishes]);
    if (slides.length === 0) {
      sequence = [];
      if (initialized) {
        containerEl.innerHTML = '<div class="empty-message">Chưa có ảnh nào</div>';
      }
      return;
    }
    sequence = ["intro", ...slides, "outro"];
    // Keep currentIndex in bounds
    if (currentIndex >= sequence.length) currentIndex = 0;
  }

  // Slide counter element
  let counterEl = null;

  function updateCounter() {
    if (!counterEl) {
      counterEl = document.querySelector('.slide-counter');
      if (!counterEl) {
        counterEl = document.createElement('div');
        counterEl.classList.add('slide-counter');
        document.body.appendChild(counterEl);
      }
    }
    if (sequence.length > 0) {
      counterEl.textContent = `${currentIndex + 1} / ${sequence.length}`;
      counterEl.hidden = false;
    } else {
      counterEl.hidden = true;
    }
  }

  /**
   * Preload the next slide's image to avoid visible loading delay.
   */
  const _prefetchedUrls = new Set();
  function preloadNextImage() {
    if (sequence.length === 0) return;
    const nextIdx = (currentIndex + 1) % sequence.length;
    const nextItem = sequence[nextIdx];
    if (nextItem && typeof nextItem === 'object' && nextItem.photo?.photoUrl) {
      const url = nextItem.photo.photoUrl;
      if (!_prefetchedUrls.has(url)) {
        _prefetchedUrls.add(url);
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'image';
        link.href = url;
        document.head.appendChild(link);
      }
    }
  }

  function playLoop() {
    if (!isPlaying) return;
    clearTimeout(loopTimeoutId);
    loopTimeoutId = setTimeout(async () => {
      if (!isPlaying || sequence.length === 0) return;

      currentIndex = (currentIndex + 1) % sequence.length;
      const item = sequence[currentIndex];

      try {
        if (item === "intro") {
          transitionToSpecialSlide(containerEl, "intro");
        } else if (item === "outro") {
          transitionToSpecialSlide(containerEl, "outro");
          // In "once" mode, stop after outro finishes displaying
          if (loopMode === "once") {
            updateCounter();
            setTimeout(() => {
              isPlaying = false;
              clearTimeout(loopTimeoutId);
              if (typeof window.pauseGlobalMusic === "function") window.pauseGlobalMusic();
              if (typeof window.onPlaybackStop === "function") window.onPlaybackStop();
            }, config.slideDuration * 1000);
            return;
          }
        } else {
          await transitionToSlide(containerEl, item);
        }
      } catch (err) {
        console.error("Slide transition error", err);
      }

      updateCounter();
      preloadNextImage();
      if (isPlaying) playLoop();
    }, config.slideDuration * 1000);
  }

  // Wait for both initial snapshots before rendering
  let photosReady = false;
  let wishesReady = false;

  function tryInitialize() {
    if (!photosReady || !wishesReady) return;
    if (initialized) {
      // Data changed after initial load — just rebuild sequence
      rebuildSequence();
      return;
    }
    initialized = true;

    rebuildSequence();
    containerEl.innerHTML = "";

    if (sequence.length === 0) {
      containerEl.innerHTML = '<div class="empty-message">Chưa có ảnh nào</div>';
      return;
    }

    // Show intro first
    const introEl = createIntroSlide();
    if (config.enableKenBurns) introEl.classList.add("kenburns-zoom-in");
    introEl.classList.add("active");
    containerEl.appendChild(introEl);
    updateCounter();

    // If user already pressed play/fullscreen before data loaded, start loop now
    if (isPlaying) {
      playLoop();
    }
  }

  // Realtime listeners (store unsubscribe functions for cleanup)
  const photosQuery = query(collection(db, "photos"), orderBy("createdAt", "asc"));
  _unsubPhotos = onSnapshot(photosQuery, async (snapshot) => {
    let allPhotos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Apply custom order if available
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
    } catch (_) { /* ignore */ }

    photos = allPhotos;
    photosReady = true;
    tryInitialize();
  });

  const wishesQuery = query(collection(db, "wishes"), orderBy("createdAt", "asc"));
  _unsubWishes = onSnapshot(wishesQuery, (snapshot) => {
    wishes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    wishesReady = true;
    tryInitialize();
  });

  // Expose playback controls globally
  window.setSlideshowPlaying = (forcePlay) => {
    if (forcePlay !== undefined) {
      if (forcePlay === true && isPlaying === true) {
        if (typeof window.playGlobalMusic === "function") window.playGlobalMusic();
        return isPlaying;
      }
      if (isPlaying === forcePlay) return isPlaying;
      isPlaying = forcePlay;
    } else {
      isPlaying = !isPlaying;
    }

    if (isPlaying) {
      playLoop();
      if (typeof window.playGlobalMusic === "function") window.playGlobalMusic();
    } else {
      clearTimeout(loopTimeoutId);
      if (typeof window.pauseGlobalMusic === "function") window.pauseGlobalMusic();
    }
    return isPlaying;
  };

  window.toggleSlideshowPlayback = () => window.setSlideshowPlaying();

  // Playback mode controls
  window.setPlaybackMode = (mode) => {
    if (mode === "once" || mode === "loop") loopMode = mode;
    return loopMode;
  };
  window.getPlaybackMode = () => loopMode;

  // Cleanup Firestore listeners on page unload to prevent memory leaks
  window.addEventListener('beforeunload', () => {
    if (_unsubPhotos) { _unsubPhotos(); _unsubPhotos = null; }
    if (_unsubWishes) { _unsubWishes(); _unsubWishes = null; }
    clearTimeout(loopTimeoutId);
  });
}
