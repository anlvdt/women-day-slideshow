/**
 * Main entry point for slideshow page (index.html)
 *
 * Imports and initializes all slideshow modules on DOMContentLoaded:
 *   - SlideshowEngine: fetch photos + wishes, build slides, autoplay
 *   - ParticleEngine: heart particles on canvas overlay
 *   - FallingPetals: CSS-animated petal rain
 *   - BackgroundMusic: MP3 or YouTube playback
 *
 * Requirements: 3.1, 3.2, 4.1, 5.1, 7.1
 */

import { initSlideshow } from "./slideshow.js";
import { animateHearts } from "./particles.js";
import { startPetalRain } from "./petals.js";
import { initPlaylistMusic, initYouTubeMusic } from "./music.js";
import { db } from "./firebase-config.js";
import {
  doc as firestoreDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("slideshow-container");
  const canvas = document.getElementById("hearts-canvas");
  const petalsContainer = document.getElementById("petals-container");

  // Start visual effects immediately
  animateHearts(canvas);
  startPetalRain(petalsContainer, 30);

  // Fetch data from Firestore and start slideshow
  await initSlideshow(container);

  // Bind fullscreen & play/pause buttons immediately
  document.addEventListener("click", (e) => {
    const fsBtn = e.target.closest("#fullscreen-btn");
    if (fsBtn) {
      e.preventDefault();
      toggleFullScreen();
    }

    const playPauseBtn = e.target.closest("#play-pause-btn");
    if (playPauseBtn) {
      e.preventDefault();
      togglePlayPause();
    }
  });

  // Allow pressing 'F' (fullscreen), 'Space' (play/pause), 'N' (skip track)
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === 'f') {
      toggleFullScreen();
    }
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault(); // prevent page scroll
      togglePlayPause();
    }
    if (e.key.toLowerCase() === 'n') {
      if (typeof window.skipTrack === "function") window.skipTrack();
    }
  });

  function updatePlayPauseUI(isPlaying) {
    const btn = document.getElementById("play-pause-btn");
    if (btn) {
      if (isPlaying) {
        // Show Pause Icon
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
      } else {
        // Show Play Icon
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
      }
    }
  }

  // Sync initial UI state (Slideshow starts as Paused)
  updatePlayPauseUI(false);

  // Show play hint overlay to guide user
  const hint = document.createElement("div");
  hint.classList.add("play-hint-overlay");
  hint.innerHTML = `<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Bấm Fullscreen (F) hoặc Space để bắt đầu`;
  document.body.appendChild(hint);
  // Remove hint after animation ends
  hint.addEventListener("animationend", () => hint.remove());

  // QR code overlay linking to submit page
  const qrOverlay = document.createElement("div");
  qrOverlay.classList.add("qr-overlay");
  const submitUrl = new URL("submit.html", window.location.href).href;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(submitUrl)}`;
  qrOverlay.innerHTML = `<img src="${qrApiUrl}" alt="QR Code gửi lời chúc" width="80" height="80"><span>Gửi lời chúc</span>`;
  document.body.appendChild(qrOverlay);

  // Now-playing indicator
  const nowPlaying = document.createElement("div");
  nowPlaying.classList.add("now-playing-overlay");
  nowPlaying.hidden = true;
  nowPlaying.innerHTML = `<span class="now-playing-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg></span><span class="now-playing-text"></span><button class="now-playing-skip" title="Bài tiếp (N)"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z"/></svg></button>`;
  document.body.appendChild(nowPlaying);

  nowPlaying.querySelector(".now-playing-skip").addEventListener("click", (e) => {
    e.preventDefault();
    if (typeof window.skipTrack === "function") window.skipTrack();
  });

  // Track change callback from music.js
  window.onTrackChange = (index, track, total) => {
    if (total <= 0) { nowPlaying.hidden = true; return; }
    let label = "";
    if (track.type === "youtube") {
      label = track.youtubeUrl ? `YouTube` : `YouTube`;
    } else {
      label = track.name || "MP3";
    }
    nowPlaying.querySelector(".now-playing-text").textContent = `${index + 1}/${total} — ${label}`;
    nowPlaying.hidden = false;
    // Show skip button only if multiple tracks
    nowPlaying.querySelector(".now-playing-skip").hidden = total <= 1;
  };

  function togglePlayPause() {
    if (typeof window.toggleSlideshowPlayback === "function") {
      const isPlaying = window.toggleSlideshowPlayback();
      updatePlayPauseUI(isPlaying);
    }
  }

  function toggleFullScreen() {
    const doc = window.document;
    const docEl = doc.documentElement;

    const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
    const cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

    if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
      if (requestFullScreen) {
        requestFullScreen.call(docEl).then(() => {
          // Entering fullscreen naturally means "start playing"
          if (typeof window.setSlideshowPlaying === "function") {
            const isPlaying = window.setSlideshowPlaying(true);
            updatePlayPauseUI(isPlaying);
          } else if (typeof window.playGlobalMusic === "function") {
            window.playGlobalMusic();
          }
        }).catch(err => {
          console.warn(`Error attempting to enable full-screen mode: ${err.message}`);
        });
      }
    } else {
      if (cancelFullScreen) {
        cancelFullScreen.call(doc);
      }
    }
  }

  // Detect when user exits Fullscreen (via ESC key or toggle) and pause playback
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && !document.webkitIsFullScreen && !document.mozFullScreen && !document.msFullscreenElement) {
      if (typeof window.setSlideshowPlaying === "function") {
        const isPlaying = window.setSlideshowPlaying(false);
        updatePlayPauseUI(isPlaying);
      }
    }
  });

  // Initialize music — check URL params first, then fallback to Firebase config
  const params = new URLSearchParams(window.location.search);
  const urlMusicType = params.get("music");
  const urlVideoId = params.get("vid");

  if (urlMusicType === "youtube" && urlVideoId) {
    initYouTubeMusic(urlVideoId);
  } else {
    try {
      const configSnap = await getDoc(firestoreDoc(db, "config", "music"));

      if (configSnap.exists()) {
        const musicData = configSnap.data();
        let playlist = [];

        if (musicData.playlist && Array.isArray(musicData.playlist) && musicData.playlist.length > 0) {
          playlist = musicData.playlist;
        } else if (musicData.youtubeId) {
          playlist.push({ type: 'youtube', youtubeId: musicData.youtubeId });
        } else if (musicData.audioUrl) {
          playlist.push({ type: 'mp3', audioUrl: musicData.audioUrl });
        }

        if (playlist.length > 0) {
          initPlaylistMusic(playlist);
        }
      }
    } catch (err) {
      console.error("Error loading music config:", err);
    }
  }
});
