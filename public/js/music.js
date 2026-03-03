/**
 * Background Music Module — supports MP3 file and YouTube playback
 * Supports an Array (playlist) of tracks, switching automatically.
 */

// Global playlist state
let currentPlaylist = [];
let currentTrackIndex = 0;
let ytPlayer = null;
let ytPlayerReady = false;
let audioEl = null;
let isGlobalPlaying = false;
let _errorCount = 0; // Guard against infinite error loops

export function initBackgroundMusic() {
  const audio = document.getElementById("bg-music");
  if (!audio) return;

  window.playGlobalMusic = () => {
    audio.play().catch(err => console.warn("Autoplay still blocked:", err));
  };

  window.pauseGlobalMusic = () => {
    audio.pause();
  };
}

export function initYouTubeMusic(videoId) {
  initPlaylistMusic([{ type: 'youtube', youtubeId: videoId }]);
}

/**
 * Initialize a playlist of mixed tracks (YouTube / MP3)
 * @param {Array} playlist - Array of track objects
 */
export function initPlaylistMusic(playlist) {
  if (!playlist || playlist.length === 0) return;

  currentPlaylist = playlist;
  currentTrackIndex = 0;
  _errorCount = 0;

  // Set up HTML Audio tag if not exists
  audioEl = document.getElementById("bg-music");
  if (!audioEl) {
    audioEl = document.createElement("audio");
    audioEl.id = "bg-music";
    document.body.appendChild(audioEl);
  }
  // Remove default source and loop — we manage sequence ourselves
  audioEl.removeAttribute("loop");
  audioEl.loop = false;
  // Clear any <source> children (stale bgm.mp3 reference)
  while (audioEl.firstChild) audioEl.removeChild(audioEl.firstChild);
  audioEl.onended = playNextTrack;
  audioEl.addEventListener('playing', onTrackPlaying); // Reset error count when track actually plays
  audioEl.onerror = () => {
    console.error("Audio element error for track:", currentPlaylist[currentTrackIndex]);
    if (isGlobalPlaying) playNextTrack();
  };

  window.playGlobalMusic = () => {
    isGlobalPlaying = true;
    _errorCount = 0;
    playCurrentTrack();
  };

  window.pauseGlobalMusic = () => {
    isGlobalPlaying = false;
    if (audioEl && !audioEl.paused) audioEl.pause();
    if (ytPlayer && ytPlayerReady && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
  };

  /**
   * Skip to next track. Exposed globally for UI.
   */
  window.skipTrack = () => {
    if (currentPlaylist.length <= 1) return;
    _errorCount = 0; // User-initiated skip resets error count
    currentTrackIndex++;
    if (currentTrackIndex >= currentPlaylist.length) {
      currentTrackIndex = 0;
    }
    playCurrentTrack();
  };

  /**
   * Get current track info. Exposed globally for UI.
   * @returns {{ index: number, total: number, track: object }|null}
   */
  window.getCurrentTrackInfo = () => {
    if (currentPlaylist.length === 0) return null;
    return {
      index: currentTrackIndex,
      total: currentPlaylist.length,
      track: currentPlaylist[currentTrackIndex]
    };
  };

  // Prepare YouTube API if needed
  const hasYoutube = playlist.some(t => t.type === 'youtube');
  if (hasYoutube && (!window.YT || !window.YT.Player)) {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      preloadCurrentTrack();
    };
  } else {
    preloadCurrentTrack();
  }
}

function preloadCurrentTrack() {
  const track = currentPlaylist[currentTrackIndex];
  if (!track) return;

  if (track.type === "mp3") {
    audioEl.src = track.audioUrl;
    audioEl.load();
    if (isGlobalPlaying) {
      audioEl.play().catch(e => console.warn(e));
    }
  } else if (track.type === "youtube") {
    createOrUpdateYTPlayer(track.youtubeId, true);
  }
}

function playCurrentTrack() {
  if (!isGlobalPlaying) return;
  const track = currentPlaylist[currentTrackIndex];
  if (!track) return;

  // Notify UI of track change
  if (typeof window.onTrackChange === "function") {
    window.onTrackChange(currentTrackIndex, track, currentPlaylist.length);
  }

  if (track.type === "mp3") {
    // Pause YouTube first
    if (ytPlayer && ytPlayerReady && typeof ytPlayer.pauseVideo === 'function') {
      ytPlayer.pauseVideo();
    }
    audioEl.src = track.audioUrl;
    audioEl.onended = playNextTrack; // Re-attach after src change
    audioEl.onerror = () => { // Re-attach error handler after src change
      console.error("Audio playback error for track:", track);
      if (isGlobalPlaying) playNextTrack();
    };
    audioEl.load();
    audioEl.play().catch(e => console.warn(e));

  } else if (track.type === "youtube") {
    // Pause MP3 first
    audioEl.pause();

    if (!ytPlayerReady) {
      // YT API not ready yet — wait for it, then play (timeout after 15s)
      let _ytWaitElapsed = 0;
      const waitForYT = setInterval(() => {
        _ytWaitElapsed += 300;
        if (ytPlayerReady || !isGlobalPlaying || _ytWaitElapsed > 15000) {
          clearInterval(waitForYT);
          if (isGlobalPlaying && ytPlayerReady) createOrUpdateYTPlayer(track.youtubeId, false);
        }
      }, 300);
      // Also kick off player creation if API is loaded but player not created
      if (window.YT && window.YT.Player) {
        createOrUpdateYTPlayer(track.youtubeId, false);
      }
    } else {
      createOrUpdateYTPlayer(track.youtubeId, false);
    }
  }
}

function playNextTrack() {
  // Guard: if all tracks error consecutively, stop
  _errorCount++;
  if (_errorCount > currentPlaylist.length) {
    console.warn("All tracks failed, stopping playlist.");
    _errorCount = 0;
    // Notify UI that all tracks failed
    if (typeof window.onTrackChange === "function") {
      window.onTrackChange(-1, { type: "error", name: "Tất cả bài hát đều lỗi" }, 0);
    }
    return;
  }

  currentTrackIndex++;
  if (currentTrackIndex >= currentPlaylist.length) {
    currentTrackIndex = 0;
  }
  playCurrentTrack();
}

/**
 * Called on successful track play to reset error counter
 */
function onTrackPlaying() {
  _errorCount = 0;
}

/**
 * Creates or updates the YouTube iframe player.
 * @param {string} videoId
 * @param {boolean} isPreload - True if initial load before user interaction
 */
function createOrUpdateYTPlayer(videoId, isPreload) {
  let ytContainer = document.getElementById("yt-music-player");

  if (!ytContainer) {
    ytContainer = document.createElement("div");
    ytContainer.id = "yt-music-player";
    ytContainer.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none;";
    document.body.appendChild(ytContainer);
  }

  // Player already initialized and API ready
  if (ytPlayer && ytPlayerReady && typeof ytPlayer.loadVideoById === 'function') {
    if (isPreload && !isGlobalPlaying) {
      ytPlayer.cueVideoById(videoId); // cue instead of load+autoplay
    } else {
      ytPlayer.loadVideoById(videoId);
    }
    return;
  }

  // First time — need YT API
  if (!window.YT || !window.YT.Player) return;

  ytPlayer = new window.YT.Player(ytContainer.id, {
    width: "1",
    height: "1",
    videoId: videoId,
    playerVars: {
      autoplay: 0, // Never autoplay on creation — we control playback
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0,
      origin: window.location.origin,
    },
    events: {
      onReady: () => {
        ytPlayerReady = true;
        ytPlayer.setVolume(70);
        if (isGlobalPlaying) {
          ytPlayer.playVideo();
        }
      },
      onStateChange: (event) => {
        if (event.data === 1) {
          onTrackPlaying();
        }
        if (event.data === 0) {
          playNextTrack();
        }
      },
      onError: (event) => {
        console.error("YouTube Player Error:", event.data);
        playNextTrack(); // Skip broken track
      }
    }
  });
}
