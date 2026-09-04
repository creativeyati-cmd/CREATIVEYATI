// Visual and interaction defaults only. Project data is supplied by the CMS.
export const CONFIG = {
  PANEL_H: 450, GAP: 12, EASE: 0.09, WHEEL: 1.4, DRAG: 1.6,
  FRICTION: 0.865, SNAP: true, SNAP_IDLE_MS: 120, SNAP_EASE: 0.05,
  SHRINK_MAX: 60, SHRINK_ATTACK: 0.25, SHRINK_DECAY: 0.06,
};

export const MOTION = {
  enabled: true,
  direction: "left",
  desktopSpeed: 32,
  mobileSpeed: 22,
  resumeDelay: 1000,
  disableForReducedMotion: true,
};

export const INTERACT = {
  drag: true, noClick: false, CLICK_SLOP: 6, FLICK_IDLE_MS: 90,
  TOUCH_DRAG: 1, TOUCH_EASE: 0.22, TOUCH_CLICK_SLOP: 6,
};

export const LENS = {
  shape: "circle", squareRound: 0, rotation: 65, spin: 0,
  sizeX: 0.565, sizeY: 1, posX: 0.5, posY: 0.5, zoom: 0,
  dispersion: 11, blur: 0, glow: 4.2, whiteGlow: 0.24, novaSize: 12,
  blueRing: 6, ringRadius: 0.49, ringWidth: 0.014, shimmer: true,
  shimmerFreq: 12, shimmerSpeed: 3.5, shimmerDepth: 0.12,
  rimStart: 0.578, rimTangential: 0.6, rimInward: 0, rimFreq1: 2, rimFreq2: 1,
  blueColor: "#009dff", rimLine: 1.4, rimLinePos: 0.488, rimLineWidth: 0.003,
  vignette: 0, vignetteSize: 0.3, samples: 16,
};

export const FOCUS = {
  cardDuration: 0.7, focusDuration: 0.9, cardEase: "power4.out",
  focusEase: "power3.out", stagger: 0.06, dropDist: 1.4,
  centerScale: 1.18, lensFade: 0.85,
};

export const ENTRY = {
  enabled: true, delay: 0.08, startScale: 0.85, scaleOvershoot: 1.02,
  positionOvershoot: 1.018, riseDuration: 0.68, settleDuration: 0.24,
  stagger: 0.07, riseEase: "power3.out", settleEase: "back.out(1.6)",
  fromBelow: 0.9, lensBloom: 0.72, lensBloomEase: "back.out(1.35)",
};

export const UI_ANIM = {
  duration: 0.4, ease: "power3.out", topShiftVh: -5,
  revealDuration: 1.6, revealEase: "power2.out", revealStagger: 0.18,
};
