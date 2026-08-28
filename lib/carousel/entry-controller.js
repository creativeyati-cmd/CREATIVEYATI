"use client";

const replayHandlers = { desktop: null, mobile: null };

export function registerCarouselEntry(mode, replay) {
  replayHandlers[mode] = replay;
  return () => { if (replayHandlers[mode] === replay) replayHandlers[mode] = null; };
}

export const carouselEntry = {
  replayEntry() {
    const mode = window.matchMedia("(min-width: 1025px)").matches ? "desktop" : "mobile";
    replayHandlers[mode]?.();
  },
};

// Shared public replay API for the active responsive implementation.
export const carousel = carouselEntry;
