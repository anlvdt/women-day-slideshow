/**
 * Unit tests for Background Music Module
 * Requirements: 8.1, 8.2
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initBackgroundMusic, initPlaylistMusic } from "./music.js";

function createMockAudio() {
  return {
    paused: true,
    loop: false,
    src: "",
    onended: null,
    firstChild: null,
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    load: vi.fn(),
    removeAttribute: vi.fn(),
    removeChild: vi.fn(),
  };
}

describe("initBackgroundMusic", () => {
  let mockAudio;
  let origGetElementById;

  beforeEach(() => {
    mockAudio = createMockAudio();
    origGetElementById = document.getElementById;
    document.getElementById = vi.fn((id) => {
      if (id === "bg-music") return mockAudio;
      return null;
    });
    delete globalThis.playGlobalMusic;
    delete globalThis.pauseGlobalMusic;
  });

  afterEach(() => {
    document.getElementById = origGetElementById;
    vi.restoreAllMocks();
    delete globalThis.playGlobalMusic;
    delete globalThis.pauseGlobalMusic;
  });

  it("should do nothing if audio element is missing", () => {
    document.getElementById = vi.fn(() => null);
    expect(() => initBackgroundMusic()).not.toThrow();
    expect(globalThis.playGlobalMusic).toBeUndefined();
  });

  it("should set up window.playGlobalMusic when audio element exists", () => {
    initBackgroundMusic();
    expect(globalThis.playGlobalMusic).toBeTypeOf("function");
  });

  it("should set up window.pauseGlobalMusic when audio element exists", () => {
    initBackgroundMusic();
    expect(globalThis.pauseGlobalMusic).toBeTypeOf("function");
  });

  it("window.playGlobalMusic should call audio.play()", () => {
    initBackgroundMusic();
    globalThis.playGlobalMusic();
    expect(mockAudio.play).toHaveBeenCalled();
  });

  it("window.pauseGlobalMusic should call audio.pause()", () => {
    initBackgroundMusic();
    globalThis.pauseGlobalMusic();
    expect(mockAudio.pause).toHaveBeenCalled();
  });

  it("window.playGlobalMusic should handle autoplay rejection gracefully", async () => {
    mockAudio.play = vi.fn(() => Promise.reject(new Error("Autoplay blocked")));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    initBackgroundMusic();
    globalThis.playGlobalMusic();

    await vi.waitFor(() => {
      expect(warnSpy).toHaveBeenCalled();
    });

    warnSpy.mockRestore();
  });
});

describe("initPlaylistMusic", () => {
  let mockAudio;
  let origGetElementById;

  beforeEach(() => {
    mockAudio = createMockAudio();
    origGetElementById = document.getElementById;
    document.getElementById = vi.fn((id) => {
      if (id === "bg-music") return mockAudio;
      return null;
    });
    delete globalThis.playGlobalMusic;
    delete globalThis.pauseGlobalMusic;
    delete globalThis.skipTrack;
    delete globalThis.getCurrentTrackInfo;
    delete globalThis.onTrackChange;
  });

  afterEach(() => {
    document.getElementById = origGetElementById;
    vi.restoreAllMocks();
    delete globalThis.playGlobalMusic;
    delete globalThis.pauseGlobalMusic;
    delete globalThis.skipTrack;
    delete globalThis.getCurrentTrackInfo;
    delete globalThis.onTrackChange;
  });

  it("should do nothing for empty playlist", () => {
    expect(() => initPlaylistMusic([])).not.toThrow();
    expect(globalThis.playGlobalMusic).toBeUndefined();
  });

  it("should do nothing for null playlist", () => {
    expect(() => initPlaylistMusic(null)).not.toThrow();
    expect(globalThis.playGlobalMusic).toBeUndefined();
  });

  it("should set loop=false on audio element", () => {
    const playlist = [{ type: "mp3", audioUrl: "test.mp3", name: "Test" }];
    initPlaylistMusic(playlist);
    expect(mockAudio.loop).toBe(false);
  });

  it("should set onended handler on audio element", () => {
    const playlist = [{ type: "mp3", audioUrl: "test.mp3", name: "Test" }];
    initPlaylistMusic(playlist);
    expect(mockAudio.onended).toBeTypeOf("function");
  });

  it("should expose playGlobalMusic, pauseGlobalMusic, skipTrack, getCurrentTrackInfo", () => {
    const playlist = [{ type: "mp3", audioUrl: "test.mp3", name: "Test" }];
    initPlaylistMusic(playlist);
    expect(globalThis.playGlobalMusic).toBeTypeOf("function");
    expect(globalThis.pauseGlobalMusic).toBeTypeOf("function");
    expect(globalThis.skipTrack).toBeTypeOf("function");
    expect(globalThis.getCurrentTrackInfo).toBeTypeOf("function");
  });

  it("getCurrentTrackInfo should return correct info", () => {
    const playlist = [
      { type: "mp3", audioUrl: "a.mp3", name: "Song A" },
      { type: "mp3", audioUrl: "b.mp3", name: "Song B" },
    ];
    initPlaylistMusic(playlist);
    const info = globalThis.getCurrentTrackInfo();
    expect(info.index).toBe(0);
    expect(info.total).toBe(2);
    expect(info.track.name).toBe("Song A");
  });

  it("playGlobalMusic should call audio.play for MP3 track", () => {
    const playlist = [{ type: "mp3", audioUrl: "test.mp3", name: "Test" }];
    initPlaylistMusic(playlist);
    globalThis.playGlobalMusic();
    expect(mockAudio.play).toHaveBeenCalled();
  });

  it("pauseGlobalMusic should call audio.pause", () => {
    const playlist = [{ type: "mp3", audioUrl: "test.mp3", name: "Test" }];
    initPlaylistMusic(playlist);
    globalThis.playGlobalMusic();
    mockAudio.paused = false; // simulate audio is playing
    globalThis.pauseGlobalMusic();
    expect(mockAudio.pause).toHaveBeenCalled();
  });

  it("should preload first MP3 track on init", () => {
    const playlist = [{ type: "mp3", audioUrl: "test.mp3", name: "Test" }];
    initPlaylistMusic(playlist);
    expect(mockAudio.src).toBe("test.mp3");
    expect(mockAudio.load).toHaveBeenCalled();
  });

  it("onended should advance to next track and loop", () => {
    const playlist = [
      { type: "mp3", audioUrl: "a.mp3", name: "A" },
      { type: "mp3", audioUrl: "b.mp3", name: "B" },
    ];
    initPlaylistMusic(playlist);
    globalThis.playGlobalMusic();
    // Simulate first track ended
    mockAudio.onended();
    expect(mockAudio.src).toBe("b.mp3");
    // Simulate second track ended — should loop to first
    mockAudio.onended();
    expect(mockAudio.src).toBe("a.mp3");
  });

  it("should call onTrackChange callback when track changes", () => {
    const callback = vi.fn();
    globalThis.onTrackChange = callback;
    const playlist = [
      { type: "mp3", audioUrl: "a.mp3", name: "A" },
      { type: "mp3", audioUrl: "b.mp3", name: "B" },
    ];
    initPlaylistMusic(playlist);
    globalThis.playGlobalMusic();
    expect(callback).toHaveBeenCalledWith(0, playlist[0], 2);
    mockAudio.onended(); // next track
    expect(callback).toHaveBeenCalledWith(1, playlist[1], 2);
  });

  it("should stop after all tracks error consecutively (infinite loop guard)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const playlist = [
      { type: "mp3", audioUrl: "a.mp3", name: "A" },
      { type: "mp3", audioUrl: "b.mp3", name: "B" },
    ];
    initPlaylistMusic(playlist);
    globalThis.playGlobalMusic(); // plays track 0 (a.mp3), errorCount=0
    // Simulate consecutive errors (onended without successful play resets)
    mockAudio.onended(); // errorCount=1, plays track 1 (b.mp3)
    mockAudio.onended(); // errorCount=2, plays track 0 (a.mp3)
    mockAudio.onended(); // errorCount=3 > length(2) → guard stops
    expect(warnSpy).toHaveBeenCalledWith("All tracks failed, stopping playlist.");
    warnSpy.mockRestore();
  });
});
