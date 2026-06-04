"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import GUI from "lil-gui";

/**
 * Infinite straight carousel — SKELETON (no glass yet).
 *
 * Layout logic:
 *   Flat horizontal row. Every panel is PANEL_H (387px) tall; width follows
 *   each image's natural aspect ratio. Uniform 12px gap. No curve, no scaling,
 *   no z-motion — panels just translate horizontally.
 *
 *   WIDTH = aspect * PANEL_H, where aspect is measured from each image on load.
 *
 * Scroll: wheel feeds a target offset; we lerp toward it every
 * frame for a smooth, weighty, premium feel. Infinite by wrapping positions
 * around a virtual total width.
 */

const IMAGES = [
  {
    src: "/img1.png",
    aspect: null,
    brand: "Nothing",
    desc: "Phone (2a) Launch Microsite",
  },
  {
    src: "/img2.png",
    aspect: null,
    brand: "Apple",
    desc: "330 P4 Experience Page Concept",
  },

  {
    src: "/img12.jpg",
    aspect: null,
    brand: "Ferrari",
    desc: "499P Hypercar Configurator",
  },
  {
    src: "/img4.png",
    aspect: null,
    brand: "Aesop",
    desc: "Sensorial Fragrance Story",
  },
  {
    src: "/img5.png",
    aspect: null,
    brand: "Polestar",
    desc: "Polestar 5 Reveal Journey",
  },
  {
    src: "/img6.png",
    aspect: null,
    brand: "Bang & Olufsen",
    desc: "Beosound Acoustic Lab",
  },
  {
    src: "/img7.png",
    aspect: null,
    brand: "Off-White",
    desc: "FW Lookbook Digital Drop",
  },
  {
    src: "/img8.png",
    aspect: null,
    brand: "Rimowa",
    desc: "Aluminium Heritage Archive",
  },
  {
    src: "/img9.png",
    aspect: null,
    brand: "Loewe",
    desc: "Craft Maison Editorial",
  },
  {
    src: "/img10.png",
    aspect: null,
    brand: "Hermès",
    desc: "Petit h Atelier Stories",
  },
  {
    src: "/img11.png",
    aspect: null,
    brand: "Balenciaga",
    desc: "Couture Motion Capsule",
  },
  {
    src: "/img3.png",
    aspect: null,
    brand: "Teenage Engineering",
    desc: "OP-1 Field Interactive Showcase",
  },
];

const CONFIG = {
  PANEL_H: 450, // px height — SAME for every panel
  GAP: 12, // px gap between panels
  EASE: 0.09, // lerp factor toward target scroll (lower = heavier)
  WHEEL: 1.4, // wheel sensitivity
  DRAG: 1.6, // drag sensitivity
  FRICTION: 0.865, // flick momentum decay
  SNAP: true, // enable snap-to-center when scrolling settles
  SNAP_VELOCITY: 1, // momentum below this = "settling" → snap engages
  SNAP_SETTLE: 20, // remaining glide distance (px) below which snap can engage
  SNAP_EASE: 0.055, // glide ease used while settling onto the snapped panel
  SNAP_CURVE: "easeOutQuad", // easing curve applied to the snap glide (see EASINGS)
  SHRINK_MAX: 60, // scroll speed (px/frame) that = full 10% shrink
  SHRINK_ATTACK: 0.25, // how fast panels shrink when speeding up
  SHRINK_DECAY: 0.06, // how fast they grow back when settling
};

// Easing curves (t in 0..1 -> eased 0..1). Picked via CONFIG.SNAP_CURVE and
// applied to the snap glide so settling onto a panel feels shaped rather than
// a flat exponential. "linear" = the original raw lerp.
const EASINGS = {
  linear: (t) => t,
  easeOutQuad: (t) => 1 - (1 - t) * (1 - t),
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
  easeOutExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeInOutQuart: (t) =>
    t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
  easeOutBack: (t) => {
    const c1 = 1.70158,
      c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

// Two fixed disc lenses (one centered on each edge) that refract the carousel
// as planes slide through them. Ported from the hero explosion lens.
const LENS = {
  shape: "circle", // 'circle' (ellipse) | 'square' (rectangle)
  squareRound: 0, // corner rounding for rectangle (0 sharp .. 1 very round)
  rotation: 65, // static rotation in degrees
  spin: 0, // auto-spin speed (deg/sec, 0 = off)
  sizeX: 0.565, // half-width (fraction of viewport height)
  sizeY: 1, // half-height (fraction of viewport height)
  posX: 0.5, // center x in screen-UV (0 left .. 1 right)
  posY: 0.5, // center y in screen-UV (0 bottom .. 1 top)
  zoom: 0, // inward pull strength (hero uZoom)
  dispersion: 11, // chromatic dispersion (hero uDispersion)
  blur: 0.0, // blur amount (px)
  glow: 4.2, // overall glow multiplier (hero uGlow)
  whiteGlow: 0.24, // central white nova intensity
  novaSize: 12, // nova size
  blueRing: 6, // blue ring intensity
  ringRadius: 0.49, // ring radius (0..0.5)
  ringWidth: 0.014, // ring width
  shimmer: true, // animated ring shimmer
  shimmerFreq: 12, // shimmer wave count around the ring
  shimmerSpeed: 3.5, // shimmer animation speed
  shimmerDepth: 0.12, // shimmer intensity (0 = none .. 0.5 = strong)
  rimStart: 0.578, // where the rim fluid wave begins
  rimTangential: 0.6, // tangential fluid-wave displacement
  rimInward: 0, // extra inward pull at the rim
  rimFreq1: 2, // fluid wave frequency 1
  rimFreq2: 1, // fluid wave frequency 2
  blueColor: "#009dff", // the soul: blue tint / ring color
  rimLine: 1.4, // bright white border line intensity (0 = off)
  rimLinePos: 0.488, // where the white border sits (0..0.5)
  rimLineWidth: 0.003, // sharpness of the white border
  vignette: 0, // overall screen vignette strength (0 = off)
  vignetteSize: 0.3, // how far in the vignette reaches (smaller = tighter)
  samples: 16, // dispersion samples
};

// A curated set of GSAP ease strings for the focus dropdowns.
const GSAP_EASES = [
  "none",
  "power1.out",
  "power2.out",
  "power3.out",
  "power4.out",
  "power1.inOut",
  "power2.inOut",
  "power3.inOut",
  "power4.inOut",
  "sine.out",
  "sine.inOut",
  "expo.out",
  "expo.inOut",
  "circ.out",
  "circ.inOut",
  "back.out(1.7)",
  "back.inOut(1.7)",
  "elastic.out(1,0.3)",
];

// Focus mode: on click, the lens effect ramps down to invisible and every
// other image sweeps down out of view in a center-out stagger, leaving the
// clicked image centered and slightly enlarged as a clean focal view.
const FOCUS = {
  cardDuration: 0.7, // seconds for the OTHER cards to drop
  focusDuration: 0.9, // seconds for the MAIN card to scale into focus
  cardEase: "power4.out", // easing for the OTHER cards sweeping down
  focusEase: "power3.out", // easing for the MAIN card scaling into focus
  stagger: 0.06, // seconds between successive panels leaving (center-out)
  dropDist: 1.4, // how far panels drop, as a fraction of viewport height
  centerScale: 1.18, // how much the focused image grows when alone
  lensFade: 0.85, // seconds for the lens props to ramp to invisible
};

// Entry animation (auto on load) — STEP 1: panels start at startH (100px) below
// the screen and rise up into the row, center panel first.
const ENTRY = {
  enabled: true,
  delay: 0.5, // seconds to wait before the entry animation begins
  startH: 80, // px height each panel starts at
  riseDuration: 1.0, // seconds for a panel to rise + grow into place
  stagger: 0.07, // seconds between center and successive outward panels
  riseEase: "power3.out", // easing for the rise/grow
  fromBelow: 0.9, // start offset below screen, as a fraction of viewport H
  growDelay: 0.25, // seconds to wait after the rise before growing
  growDuration: 2.15, // seconds for each panel to grow from startH to full
  growEase: "expo.inOut", // easing for the grow
  growStagger: 0.085, // seconds between successive panels growing
  growDir: "inward", // "outward" = center grows first, "inward" = edges first
  lensBloom: 1.4, // seconds for the lens effect to fade back in
  lensBloomEase: "power2.inOut", // easing for the lens bloom
};

const CarouselSection = () => {
  const mountRef = useRef(null);
  const cursorRef = useRef(null);
  const closeBtnHandlerRef = useRef(null); // set by effect; called by close button
  const topTextRef = useRef(null); // brand/desc — GSAP-animated on focus
  const counterRef = useRef(null); // 01/12 counter — GSAP-animated on focus
  const [active, setActive] = useState(0); // index of the centered image
  const [focused, setFocused] = useState(false); // a focus session is open
  const [entryDone, setEntryDone] = useState(false); // entry fully settled
  const setEntryDoneRef = useRef(null); // bridge so the canvas effect can flip it
  setEntryDoneRef.current = setEntryDone;

  // GSAP-driven UI transitions when focus toggles (kept in GSAP so they share
  // the same easing vocabulary as the canvas animation). Tunable here:
  const UI_ANIM = {
    duration: 0.4, // seconds (focus transitions)
    ease: "power3.out", // any GSAP ease string (see options below)
    topShiftVh: -5, // how far the top text moves (vh) when focused
    // entry-settle reveal: slower + gentler for a premium fade-in
    revealDuration: 1.6, // seconds for the fade-in once entry settles
    revealEase: "power2.out", // soft, gradual ease
    revealStagger: 0.18, // counter follows the top text by this delay
  };

  useEffect(() => {
    if (!topTextRef.current || !counterRef.current) return;
    if (!entryDone && ENTRY.enabled) {
      gsap.set([topTextRef.current, counterRef.current], { autoAlpha: 0 });
      return; // stay hidden until entry settles
    }
    gsap.set(topTextRef.current, { xPercent: -50 }); // GSAP owns the transform
    gsap.set(counterRef.current, { xPercent: -50 });
    const y = focused ? (UI_ANIM.topShiftVh / 100) * window.innerHeight : 0;

    if (entryDone && !focused) {
      // premium settle reveal: slow gentle fade only (no movement), counter
      // trailing the top text slightly.
      gsap.fromTo(
        topTextRef.current,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          duration: UI_ANIM.revealDuration,
          ease: UI_ANIM.revealEase,
        },
      );
      gsap.fromTo(
        counterRef.current,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          duration: UI_ANIM.revealDuration,
          ease: UI_ANIM.revealEase,
          delay: UI_ANIM.revealStagger,
        },
      );
      return;
    }

    // focus toggle transitions (quicker)
    gsap.to(topTextRef.current, {
      y,
      autoAlpha: 1,
      duration: UI_ANIM.duration,
      ease: UI_ANIM.ease,
    });
    gsap.to(counterRef.current, {
      autoAlpha: focused ? 0 : 1,
      duration: UI_ANIM.duration,
      ease: UI_ANIM.ease,
    });
  }, [focused, entryDone]);

  useEffect(() => {
    const mount = mountRef.current;
    let W = mount.clientWidth;
    let H = mount.clientHeight;

    // ---- renderer / scene / camera (orthographic, 1 unit = 1 px) ----
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0xffffff, 1); // match CSS bg so FBO gaps blend
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(
      -W / 2,
      W / 2,
      H / 2,
      -H / 2,
      -100,
      100,
    );
    camera.position.z = 10;

    // straight row — no vertical curve.

    // ---- load the N source images (textures + measured aspect) ----
    const loader = new THREE.TextureLoader();
    const sources = IMAGES.map((img) => {
      const s = {
        tex: null,
        aspect: img.aspect || 1,
        locked: img.aspect != null,
      };
      loader.load(img.src, (tex) => {
        tex.minFilter = THREE.LinearFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        if (!s.locked && tex.image)
          s.aspect = tex.image.width / tex.image.height;
        s.tex = tex;
        // aspect is now known -> rebuild slot offsets so spacing matches widths
        recomputeTotal();
        // re-center the row on the real widths (init used default aspects).
        // Only while the user hasn't scrolled yet (load / entry phase).
        if (!userInteracted) {
          scroll = snapTarget(centerSrcScroll(0));
          target = scroll;
        }
      });
      return s;
    });

    // width of one slot. Height is fixed (PANEL_H) for every panel, so width =
    // aspect * PANEL_H + gap. Nothing breathes -> gaps stay even, no z-motion.
    function slotWidth(srcIndex) {
      return sources[srcIndex].aspect * CONFIG.PANEL_H + CONFIG.GAP;
    }

    // scroll value that centers a given source index on screen
    function centerSrcScroll(i) {
      let acc = 0;
      for (let k = 0; k < i; k++) acc += slotWidth(k);
      return acc + slotWidth(i) / 2 - CONFIG.GAP / 2;
    }

    // cumulative x of each source's slot, and the total loop width
    let offsets = []; // offsets[i] = left edge of slot i within one loop
    let totalWidth = 0;
    function recomputeTotal() {
      offsets = [];
      let acc = 0;
      for (let i = 0; i < sources.length; i++) {
        offsets.push(acc);
        acc += slotWidth(i);
      }
      totalWidth = acc;
    }
    recomputeTotal();

    // Nearest scroll value that lands some image centered on screen. A slot i is
    // centered when scroll === offsets[i] + slotWidth(i)/2 - GAP/2  (mod totalWidth).
    // We pick whichever slot-center (across loop copies) is closest to `value`.
    function snapTarget(value) {
      if (!totalWidth) return value;
      let best = value;
      let bestDist = Infinity;
      for (let i = 0; i < sources.length; i++) {
        const center = offsets[i] + slotWidth(i) / 2 - CONFIG.GAP / 2;
        const k = Math.round((value - center) / totalWidth);
        const cand = center + k * totalWidth;
        const dist = Math.abs(cand - value);
        if (dist < bestDist) {
          bestDist = dist;
          best = cand;
        }
      }
      return best;
    }

    // which source index is currently closest to screen center (for overlay text)
    function centerIndex(value) {
      if (!totalWidth) return 0;
      let bestI = 0;
      let bestDist = Infinity;
      for (let i = 0; i < sources.length; i++) {
        const center = offsets[i] + slotWidth(i) / 2 - CONFIG.GAP / 2;
        const k = Math.round((value - center) / totalWidth);
        const dist = Math.abs(center + k * totalWidth - value);
        if (dist < bestDist) {
          bestDist = dist;
          bestI = i;
        }
      }
      return bestI;
    }
    let lastCenter = -1; // track to update React state only on change

    // ---- mesh pool: enough repeated meshes to cover viewport + buffer ----
    // We create REPEATS copies of the whole image set so wide screens never run dry.
    const REPEATS = 4; // REPEATS x sources.length meshes; plenty for any viewport
    const pool = [];
    for (let r = 0; r < REPEATS; r++) {
      for (let i = 0; i < sources.length; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: 0xdddddd,
          transparent: true,
        });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 1), mat);
        mesh.visible = false;
        scene.add(mesh);
        pool.push({ mesh, mat, srcIndex: i });
      }
    }

    // ---- scroll state ----
    // start with a panel centered on screen (row centered), not left-aligned
    let scroll = snapTarget(centerSrcScroll(0)); // current (center image 01)
    let target = scroll; // desired
    let userInteracted = false; // true once the user scrolls (stops auto-recenter)
    let velocity = 0; // flick momentum
    let snapped = false; // have we already snapped since last input?
    let lastInput = performance.now(); // timestamp of last drag/wheel input
    let prevScroll = 0; // scroll position last frame (for speed measurement)
    let scrollEnergy = 0; // smoothed 0..1 scroll activity, drives panel shrink

    // ---- liquid-glass lens: FBO + fullscreen pass ----
    // Carousel renders into rt; a fullscreen quad samples it and refracts a soft
    // circular region around the pointer with chromatic aberration + a rim shine.
    let rt = new THREE.WebGLRenderTarget(W, H);
    const lensScene = new THREE.Scene();
    const lensCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const lensUniforms = {
      uTex: { value: rt.texture },
      uRes: { value: new THREE.Vector2(W, H) },
      uCenter: { value: new THREE.Vector2(0.5, 0.5) }, // screen-UV center
      uSizeX: { value: LENS.sizeX }, // half-width (fraction of height units)
      uSizeY: { value: LENS.sizeY }, // half-height (fraction of height)
      uShape: { value: LENS.shape === "square" ? 1.0 : 0.0 },
      uSquareRound: { value: LENS.squareRound },
      uRotation: { value: 0.0 },
      uAspect: { value: W / H },
      uZoom: { value: LENS.zoom },
      uDispersion: { value: LENS.dispersion },
      uBlur: { value: LENS.blur },
      uGlow: { value: LENS.glow },
      uWhiteGlow: { value: LENS.whiteGlow },
      uNovaSize: { value: LENS.novaSize },
      uBlueRing: { value: LENS.blueRing },
      uRingRadius: { value: LENS.ringRadius },
      uRingWidth: { value: LENS.ringWidth },
      uShimmer: { value: LENS.shimmer ? 1.0 : 0.0 },
      uShimmerFreq: { value: LENS.shimmerFreq },
      uShimmerSpeed: { value: LENS.shimmerSpeed },
      uShimmerDepth: { value: LENS.shimmerDepth },
      uTime: { value: 0.0 },
      uRimStart: { value: LENS.rimStart },
      uRimTangential: { value: LENS.rimTangential },
      uRimInward: { value: LENS.rimInward },
      uRimFreq1: { value: LENS.rimFreq1 },
      uRimFreq2: { value: LENS.rimFreq2 },
      uBlueColor: { value: new THREE.Color(LENS.blueColor) },
      uRimLine: { value: LENS.rimLine },
      uRimLinePos: { value: LENS.rimLinePos },
      uRimLineWidth: { value: LENS.rimLineWidth },
      uVignette: { value: LENS.vignette },
      uVignetteSize: { value: LENS.vignetteSize },
      uSamples: { value: LENS.samples },
    };
    const lensMat = new THREE.ShaderMaterial({
      uniforms: lensUniforms,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        #define PI 3.14159265
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uTex;
        uniform vec2  uRes;
        uniform vec2  uCenter;
        uniform float uSizeX;         // half-width (height-fraction units)
        uniform float uSizeY;         // half-height (height-fraction units)
        uniform float uAspect;        // W/H
        uniform float uZoom;
        uniform float uDispersion;
        uniform float uBlur;
        uniform float uGlow;
        uniform float uWhiteGlow;
        uniform float uNovaSize;
        uniform float uBlueRing;
        uniform float uRingRadius;
        uniform float uRingWidth;
        uniform float uShimmer;
        uniform float uShimmerFreq;
        uniform float uShimmerSpeed;
        uniform float uShimmerDepth;
        uniform float uTime;
        uniform float uRimStart;
        uniform float uRimTangential;
        uniform float uRimInward;
        uniform float uRimFreq1;
        uniform float uRimFreq2;
        uniform vec3  uBlueColor;
        uniform float uRimLine;
        uniform float uRimLinePos;
        uniform float uRimLineWidth;
        uniform float uVignette;     // overall vignette strength (0 = off)
        uniform float uVignetteSize; // radius where vignette begins
        uniform float uShape;        // 0 = circle, 1 = square
        uniform float uSquareRound;  // corner rounding for square (0..1)
        uniform float uRotation;     // lens rotation in radians
        uniform int   uSamples;

        const int MAX_SAMPLES = 16;

        // rounded-box signed distance (negative inside)
        float sdRoundBox(vec2 p, vec2 b, float r){
          vec2 q = abs(p) - b + r;
          return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
        }

        // Evaluate one disc lens centered at 'center' (screen-UV). Returns the
        // lensed color; 'outA' = how opaque this lens is here (0 outside disc).
        // Ported from the hero explosion lens (disc refraction + nova + ring).
        vec3 discLens(vec2 center, float aspectCorrect, out float outA) {
          // local coords, aspect-corrected so x/y are in the same screen units
          vec2 p = (vUv - center);
          p.x *= aspectCorrect;            // scale x by aspect
          // rotate local space so the rect + all internals spin together
          float ca = cos(uRotation), sa = sin(uRotation);
          p = mat2(ca, -sa, sa, ca) * p;
          vec2 halfSize = vec2(uSizeX, uSizeY);
          // elliptical distance: 0 center .. 1 boundary
          float dist = length(p / halfSize);
          outA = 0.0;

          // ---- mask shape: ellipse OR rectangle, drives the CUTOFF ----
          // maskND: 0 inside .. 1 at the shape boundary (>1 outside).
          float maskND;
          if (uShape > 0.5) {
            // rounded-box field with independent half-width/height.
            float corner = min(uSizeX, uSizeY) * clamp(uSquareRound, 0.0, 1.0);
            float sd = sdRoundBox(p, halfSize, corner);
            // normalize by the smaller half-size so the edge band reads as ~1
            maskND = 1.0 + sd / min(uSizeX, uSizeY);
          } else {
            maskND = dist;               // ellipse
          }
          if (maskND > 1.0) return vec3(0.0);

          // shapeND: 0 center .. 1 boundary, following the chosen shape. Used by
          // nova / ring / border so they take the SAME shape.
          float shapeND = clamp(maskND, 0.0, 1.0);

          // ---- deflection uses the (elliptical) radial nd so it bends smoothly
          //      from the center even when the boundary is rectangular ----
          float nd = clamp(dist, 0.0, 1.0);
          vec2  offset = vUv - center;     // screen-space offset for refraction
          vec2  radialDir = normalize(offset + 1e-6);
          vec2  tangentDir = vec2(-radialDir.y, radialDir.x);
          // angle measured in ROTATED local space so the rim wave/shimmer spin too
          float angle = atan(p.y, p.x);

          // inward pull (hero: uZoom * 0.30 * nd^2)
          float pull = uZoom * 0.30 * (nd * nd);
          // rim fluid waves
          float rimStrength = smoothstep(uRimStart, 1.0, nd);
          float fluidWave = sin(angle * uRimFreq1) * 0.55 + sin(angle * uRimFreq2) * 0.25;
          float rScreen = (uSizeX + uSizeY) * 0.5; // mean size for rim scale
          vec2  rimOff = tangentDir * fluidWave * rimStrength * rScreen * uRimTangential;
          vec2  rimPull = -radialDir * rimStrength * rScreen * uRimInward;

          vec2 baseUV = center + offset * (1.0 - pull) + rimOff + rimPull;


          // chromatic dispersion (weighted multi-sample, per-channel normalized)
          float rimMask = smoothstep(0.55, 1.0, nd);
          vec2  dispDir = offset * uDispersion * 0.004 * rimMask;
          int N = uSamples;
          if (N < 2) N = 2;
          if (N > MAX_SAMPLES) N = MAX_SAMPLES;
          vec3 col = vec3(0.0);
          vec3 caW = vec3(0.0);
          for (int i = 0; i < MAX_SAMPLES; i++) {
            if (i >= N) break;
            float t = float(i) / float(N - 1);
            vec2 sUV = baseUV + dispDir * (t - 0.5);
            vec3 s = texture2D(uTex, sUV).rgb;
            vec3 w = vec3(
              exp(-pow((t - 0.00) / 0.38, 2.0)),
              exp(-pow((t - 0.50) / 0.38, 2.0)),
              exp(-pow((t - 1.00) / 0.38, 2.0))
            );
            col += s * w;
            caW += w;
          }
          col /= max(caW, vec3(0.001));

          // optional blur near the rim
          float blurFade = 1.0 - smoothstep(0.72, 0.98, nd);
          if (uBlur > 0.01 && blurFade > 0.01) {
            vec2 blurRad = vec2(uBlur) / uRes * blurFade;
            vec3 bcol = vec3(0.0);
            float btw = 0.0;
            for (float a = 0.0; a < PI * 2.0; a += PI * 2.0 / 6.0) {
              for (float rr = 0.4; rr <= 1.001; rr += 0.3) {
                vec2 o = vec2(cos(a), sin(a)) * blurRad * rr;
                float w = 1.0 - rr * 0.38;
                bcol += texture2D(uTex, baseUV + o).rgb * w;
                btw += w;
              }
            }
            col = mix(bcol / btw, col, rimMask);
          }

          // glassy darkening toward center (hero)
          col *= mix(0.91, 1.0, smoothstep(0.0, 0.38, shapeND));

          // white nova glow at center — follows the shape (square in box mode)
          float r2 = shapeND * shapeND * 0.25; // matches hero r2 scale
          float gs = max(uNovaSize * uGlow * 0.003, 0.004);
          float nova = exp(-r2 / gs) + exp(-r2 / (gs * 7.0)) * 0.18;
          nova *= uWhiteGlow * (uGlow / 17.0) * 1.15;
          col += vec3(nova);

          // blue ring + aura — contour follows the shape
          float dC = shapeND * 0.5;       // 0..0.5 like hero dist
          float tR = clamp(uRingRadius, 0.1, 0.49);
          float rW = max(uRingWidth, 0.003);
          float ring = exp(-pow((dC - tR) / rW, 2.0));
          ring *= uBlueRing * (uGlow / 17.0) * 1.8;
          if (uShimmer > 0.5) ring *= sin(angle * uShimmerFreq + uTime * uShimmerSpeed) * uShimmerDepth + (1.0 - uShimmerDepth);
          float ringAura = exp(-pow((dC - tR) / (rW * 6.0), 2.0)) * 0.28 * uBlueRing * (uGlow / 17.0);
          col += uBlueColor * (ring + ringAura);
          // bright border line — follows the shape
          col += vec3(exp(-pow((dC - uRimLinePos) / max(uRimLineWidth, 0.0001), 2.0)) * uRimLine);

          // lens alpha: solid inside, soft falloff at the very edge.
          // Uses maskND so the boundary is square in square mode (deflection
          // stays radial, so it bends like a circle — no 4-triangle seams).
          outA = smoothstep(1.0, 0.93, maskND);
          return col;
        }

        void main(){
          vec3 base = texture2D(uTex, vUv).rgb;  // carousel, untouched
          vec3 outc = base;

          float a = 0.0;
          vec3 c = discLens(uCenter, uAspect, a);
          outc = mix(outc, c, a);

          // overall vignette: darken toward screen corners (aspect-correct)
          if (uVignette > 0.001) {
            vec2 vc = vUv - 0.5;
            vc.x *= uAspect;
            float d = length(vc) / max(uVignetteSize, 0.0001);
            float vig = 1.0 - uVignette * smoothstep(0.5, 1.0, d);
            outc *= clamp(vig, 0.0, 1.0);
          }

          gl_FragColor = vec4(outc, 1.0);
        }
      `,
    });
    const lensQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), lensMat);
    lensScene.add(lensQuad);

    // ---- focus state ----
    // When focused, the lens props fade out (driven by lensFx 1->0) and every
    // panel except the focused one slides down off-screen, staggered center-out.
    const focusState = {
      active: false, // a focus session is open or animating
      srcIndex: -1, // which source is focused
      poolIdx: -1, // which pool entry is the focused panel
      lensFx: ENTRY.enabled ? 0 : 1, // 0 during entry (no distortion); blooms in later
      anim: null, // gsap timeline handle
    };
    // per-pool-entry drop progress (0 = in place, 1 = fully dropped) + scale-up
    // for the focused panel. Keyed by pool index, lazily filled in layout.
    const drop = new Array(REPEATS * sources.length).fill(0); // 0..1 each
    let focusScale = 1; // eased scale-up applied to the focused panel
    const lastCenterX = new Array(REPEATS * sources.length); // per-pool x (px), undefined if hidden

    // ---- entry state ----
    // pEntry[poolIdx]: 0 = below screen at startH, 1 = settled in the real row.
    // The settled state is the panel's REAL centerX / size / y, so the entry
    // resolves into the actual carousel layout with no separate coordinate math.
    const pEntry = new Array(REPEATS * sources.length).fill(
      ENTRY.enabled ? 0 : 1,
    );
    let entryActive = ENTRY.enabled;
    let entrySettled = false; // rise finished but panels held at small size
    const growArr = new Array(REPEATS * sources.length).fill(
      ENTRY.enabled ? 0 : 1,
    ); // per-panel grow 0..1
    let entryAnim = null;

    // snapshot of lens prop targets so we can fade between full and zero
    const LENS_FX_KEYS = [
      "uDispersion",
      "uBlueRing",
      "uRimLine",
      "uVignette",
      "uZoom",
      "uRimTangential",
      "uRimInward",
    ];
    const lensFxFull = {};
    LENS_FX_KEYS.forEach((k) => (lensFxFull[k] = lensUniforms[k].value));

    // pointer in px (y-up) for the lens, lerped toward the real cursor
    let panelRects = []; // visible panel screen rects {left,right,top,bottom} (px)
    let centeredPanel = null; // {srcIndex, centerX, wPx, h} nearest screen center
    function layout() {
      panelRects = [];
      centeredPanel = null;
      let centeredDist = Infinity;
      const half = W / 2;
      // For each pooled mesh we compute which "copy" of its slot to show so that
      // it lands inside [-half-buffer, half+buffer]. Each pool entry handles one
      // repetition rung of its source.
      const buffer = CONFIG.PANEL_H; // generous horizontal buffer
      pool.forEach((p, poolIdx) => {
        const rep = Math.floor(poolIdx / sources.length); // which set 0..REPEATS-1
        const i = p.srcIndex;
        const src = sources[i];

        // base position of this slot's center within one loop
        const slotCenterInLoop = offsets[i] + slotWidth(i) / 2 - CONFIG.GAP / 2;

        // world x before wrapping: slot center, shifted by scroll
        let x = slotCenterInLoop - scroll;
        // wrap into a window centered on 0, then push by this rung's loop
        x = ((x % totalWidth) + totalWidth) % totalWidth; // 0..totalWidth
        // distribute the REPEATS rungs across [-totalWidth*..]
        x += (rep - Math.floor(REPEATS / 2)) * totalWidth;
        // recenter so the visible band straddles 0
        if (x > half + totalWidth) x -= totalWidth * REPEATS;

        const centerX = x;
        const inEntry = entryActive || entrySettled;
        if (!inEntry && (centerX < -half - buffer || centerX > half + buffer)) {
          p.mesh.visible = false;
          lastCenterX[poolIdx] = undefined;
          return;
        }
        lastCenterX[poolIdx] = centerX;

        // FIXED size for every panel — width and height both from PANEL_H,
        // so aspect is always the image's natural ratio (no stretch, no crop).
        // Shrink up to 25% with scroll velocity, easing back to full at rest.
        const shrink = 1 - 0.25 * scrollEnergy;
        const h = CONFIG.PANEL_H * shrink;
        const wPx = src.aspect * CONFIG.PANEL_H * shrink;

        // bind texture once available
        if (src.tex && !p.bound) {
          p.mat.map = src.tex;
          p.mat.color.set(0xffffff);
          p.mat.needsUpdate = true;
          p.bound = true;
        }

        // straight row — flat, no arc
        let y = 0;

        // Focus mode: the focused panel grows and stays put; all others slide
        // down by their eased drop amount. drop[poolIdx] is animated by gsap.
        const isFocused = focusState.active && focusState.poolIdx === poolIdx;
        const d = drop[poolIdx] || 0;
        let drawW = wPx;
        let drawH = h;
        if (isFocused) {
          drawW = wPx * focusScale;
          drawH = h * focusScale;
        } else if (d > 0) {
          y = -d * H * FOCUS.dropDist; // slide downward off-screen
        }

        p.mesh.visible = true;

        // ---- entry animation ----
        // Interpolate from (below screen, startH) up to the real settled state.
        // pe = this panel's entry progress (0..1), eased already by gsap.
        let finalX = centerX;
        let finalY = y;
        let finalW = drawW;
        let finalH = drawH;
        if (entryActive || entrySettled) {
          const pe = pEntry[poolIdx] || 0;
          const g = growArr[poolIdx] || 0; // this panel's grow 0..1

          const curH = ENTRY.startH + (drawH - ENTRY.startH) * g;
          finalH = curH;
          finalW = curH * src.aspect;

          // constant-gap walk, one copy per source (max 12). Each slot in the
          // walk uses ITS OWN current grow height, so a grown panel takes more
          // space and pushes neighbours outward.
          const cSrc = centerIndex(scroll);
          let diLoop = i - cSrc;
          if (diLoop > sources.length / 2) diLoop -= sources.length;
          if (diLoop < -sources.length / 2) diLoop += sources.length;
          const N = sources.length;
          const midRep = Math.floor(REPEATS / 2);
          if (rep !== midRep) {
            p.mesh.visible = false;
            lastCenterX[poolIdx] = undefined;
            return;
          }
          const di = diLoop;
          // height of slot at source index s (its own grow), for the walk
          const slotH = (s) => {
            const pIdx = midRep * N + s; // canonical pool index for source s
            const gg = growArr[pIdx] || 0;
            return ENTRY.startH + (CONFIG.PANEL_H - ENTRY.startH) * gg;
          };
          let off = 0;
          if (di > 0) {
            for (let k = 0; k < di; k++) {
              const sa = (((cSrc + k) % N) + N) % N;
              const sb = (((cSrc + k + 1) % N) + N) % N;
              off +=
                (sources[sa].aspect * slotH(sa) +
                  sources[sb].aspect * slotH(sb)) /
                  2 +
                CONFIG.GAP;
            }
          } else if (di < 0) {
            for (let k = 0; k < -di; k++) {
              const sa = (((cSrc - k) % N) + N) % N;
              const sb = (((cSrc - k - 1) % N) + N) % N;
              off -=
                (sources[sa].aspect * slotH(sa) +
                  sources[sb].aspect * slotH(sb)) /
                  2 +
                CONFIG.GAP;
            }
          }
          finalX = off;
          if (finalX < -half - buffer || finalX > half + buffer) {
            p.mesh.visible = false;
            lastCenterX[poolIdx] = undefined;
            return;
          }

          // vertical: rise from below the screen up to real y
          const below = -H * ENTRY.fromBelow;
          finalY = below + (y - below) * pe;
        }

        p.mesh.position.set(finalX, finalY, 0);
        p.mesh.scale.set(finalW, finalH, 1);

        // screen rect (px, top-left origin) for pointer hit-testing.
        // ortho cam 1u=1px, centered: screenX = centerX + W/2, screenY = H/2 - y
        const sx = centerX + W / 2;
        const sy = H / 2 - y;
        panelRects.push({
          left: sx - drawW / 2,
          right: sx + drawW / 2,
          top: sy - drawH / 2,
          bottom: sy + drawH / 2,
        });

        // remember the panel nearest screen center (for click → focus target)
        if (Math.abs(centerX) < centeredDist) {
          centeredDist = Math.abs(centerX);
          centeredPanel = { srcIndex: i, centerX, wPx, h, poolIdx };
        }
      });
    }

    // is a viewport-space point (px) over any visible panel?
    function pointerOverPanel(px, py) {
      for (let i = 0; i < panelRects.length; i++) {
        const r = panelRects[i];
        if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom)
          return true;
      }
      return false;
    }

    // ---- interaction: scroll only (no drag), + dual cursor ----
    const dragging = false; // kept as const so existing tick refs stay valid
    const el = renderer.domElement;

    // "View" follower: GSAP-eased trailing label, shown only over a panel.
    const cursorEl = cursorRef.current;
    if (cursorEl)
      gsap.set(cursorEl, {
        xPercent: 20,
        yPercent: 30,
        scale: 0,
        autoAlpha: 0,
      });
    const moveX = cursorEl
      ? gsap.quickTo(cursorEl, "x", { duration: 0.5, ease: "power3.out" })
      : null;
    const moveY = cursorEl
      ? gsap.quickTo(cursorEl, "y", { duration: 0.5, ease: "power3.out" })
      : null;

    let overPanel = false; // current hover state, updated on move

    function setView(on) {
      // never show the "View" follower during the entry — only in full mode
      if (entryActive || entrySettled) on = false;
      el.style.cursor = on ? "pointer" : "";
      if (on === overPanel || !cursorEl) return;
      overPanel = on;
      gsap.to(cursorEl, {
        scale: on ? 1 : 0,
        autoAlpha: on ? 1 : 0,
        duration: on ? 0.35 : 0.25,
        ease: on ? "power3.out" : "power3.in",
      });
    }

    function onWheel(e) {
      e.preventDefault();
      if (focusState.active || entryActive || entrySettled) return; // locked during/after entry (pre-grow)
      userInteracted = true;
      target += (e.deltaY || e.deltaX) * CONFIG.WHEEL;
      lastInput = performance.now();
      snapped = false; // re-arm snap on every fresh scroll
    }
    function onPointerMove(e) {
      // view label: eased trail
      if (moveX) moveX(e.clientX);
      if (moveY) moveY(e.clientY);
      // hide the "View" label while focused
      if (focusState.active) {
        setView(false);
        return;
      }
      // show "View" only when the pointer is over a project image
      setView(pointerOverPanel(e.clientX, e.clientY));
    }
    function onEnter() {}
    function onLeave() {
      setView(false);
    }

    // ---- focus open / close ----
    // Drop every visible panel except the focused one, staggered from the center
    // outward, while the lens props ramp to zero and the focused panel scales up.
    function openFocus() {
      if (focusState.active || !centeredPanel) return;
      const src = sources[centeredPanel.srcIndex];
      if (!src || !src.tex) return;

      focusState.active = true;
      focusState.srcIndex = centeredPanel.srcIndex;
      const focusPoolIdx = centeredPanel.poolIdx;
      focusState.poolIdx = focusPoolIdx;

      // snap scroll precisely to center so the focused panel is dead-centre
      target = snapTarget(scroll);
      snapped = true;

      // Reference point = the FOCUSED card's current x, so the wave radiates
      // outward from the focused card itself (not absolute screen center).
      const focusX = lastCenterX[focusPoolIdx] || 0;

      // order the OTHER visible panels by horizontal distance FROM THE FOCUSED
      // CARD. Group panels at (near) equal distance so the left/right pair
      // leaves together — a real center-out wave.
      const others = pool
        .map((p, idx) => ({ idx, x: lastCenterX[idx] }))
        .filter((o) => o.idx !== focusPoolIdx && o.x !== undefined)
        .map((o) => ({ idx: o.idx, dist: Math.abs(o.x - focusX) }))
        .sort((a, b) => a.dist - b.dist); // nearest the focused card first

      // assign a stagger "rank" by distance bucket so equidistant panels match
      let rank = 0;
      let prevDist = -1;
      const ranked = others.map((o) => {
        if (prevDist >= 0 && o.dist - prevDist > 1) rank++; // new distance bucket
        prevDist = o.dist;
        return { idx: o.idx, rank };
      });

      // re-snapshot current lens values so the fade/restore tracks live sliders
      LENS_FX_KEYS.forEach((k) => (lensFxFull[k] = lensUniforms[k].value));

      if (focusState.anim) focusState.anim.kill();
      const tl = gsap.timeline();
      // lens fades to invisible — eased out so distortion melts away smoothly
      tl.to(
        focusState,
        { lensFx: 0, duration: FOCUS.lensFade, ease: "power3.out" },
        0,
      );
      // focused panel grows
      tl.to(
        { v: focusScale },
        {
          v: FOCUS.centerScale,
          duration: FOCUS.focusDuration,
          ease: FOCUS.focusEase,
          onUpdate() {
            focusScale = this.targets()[0].v;
          },
        },
        0,
      );
      // others drop, staggered center-out (by distance rank)
      ranked.forEach((o) => {
        tl.to(
          drop,
          {
            [o.idx]: 1,
            duration: FOCUS.cardDuration,
            ease: FOCUS.cardEase,
          },
          o.rank * FOCUS.stagger,
        );
      });
      focusState.anim = tl;

      setView(false);
      el.style.cursor = "";
      setFocused(true); // React: show close button
    }

    function closeFocus() {
      if (!focusState.active) return;
      if (focusState.anim) focusState.anim.kill();

      // reference = focused card's x so the return wave is symmetric about it
      const focusX = lastCenterX[focusState.poolIdx] || 0;
      const others = pool
        .map((p, idx) => ({ idx, x: lastCenterX[idx] }))
        .filter((o) => o.x !== undefined && (drop[o.idx] || 0) > 0)
        .map((o) => ({ idx: o.idx, dist: Math.abs(o.x - focusX) }))
        .sort((a, b) => b.dist - a.dist); // farthest first (edges-in)

      // distance-bucket ranks so symmetric pairs return together
      let rank = 0;
      let prevDist = -1;
      const ranked = others.map((o) => {
        if (prevDist >= 0 && prevDist - o.dist > 1) rank++;
        prevDist = o.dist;
        return { idx: o.idx, rank };
      });

      // flip the React flag NOW so the UI text reset (top text + counter) and
      // the Close button hide animate immediately, in sync with the cards
      // returning. The internal focusState.active stays true until the timeline
      // finishes (it still gates scroll input and the lens render).
      setFocused(false);

      const tl = gsap.timeline({
        onComplete: () => {
          focusState.active = false;
          focusState.srcIndex = -1;
        },
      });
      tl.to(
        focusState,
        { lensFx: 1, duration: FOCUS.lensFade * 0.8, ease: "power3.inOut" },
        0,
      );
      tl.to(
        { v: focusScale },
        {
          v: 1,
          duration: FOCUS.focusDuration * 0.85,
          ease: FOCUS.focusEase,
          onUpdate() {
            focusScale = this.targets()[0].v;
          },
        },
        0,
      );
      ranked.forEach((o) => {
        tl.to(
          drop,
          {
            [o.idx]: 0,
            duration: FOCUS.cardDuration * 0.85,
            ease: FOCUS.cardEase,
          },
          o.rank * FOCUS.stagger * 0.7,
        );
      });
      focusState.anim = tl;
    }

    function onClick(e) {
      // only open on canvas click; closing happens via the Close button only
      if (focusState.active || entryActive || entrySettled) return;
      if (pointerOverPanel(e.clientX, e.clientY)) openFocus();
    }
    el.addEventListener("click", onClick);
    closeBtnHandlerRef.current = closeFocus; // expose to React close button

    // ---- entry animation (step 1: rise from bottom, center-first) ----
    function playEntry() {
      if (entryAnim) entryAnim.kill();
      for (let k = 0; k < pEntry.length; k++) pEntry[k] = 0;
      entryActive = true;
      entrySettled = false;
      if (setEntryDoneRef.current) setEntryDoneRef.current(false);
      for (let k = 0; k < growArr.length; k++) growArr[k] = 0; // start small
      focusState.lensFx = 0; // no lens distortion during entry (nova + glow stay)

      // snap a panel cleanly to center; that panel rises first
      target = snapTarget(scroll);
      scroll = target;
      velocity = 0;
      snapped = true;

      // build the visible panels (mid-rep set)
      layout(); // populate lastCenterX
      const visible = [];
      for (let k = 0; k < lastCenterX.length; k++) {
        if (lastCenterX[k] !== undefined) visible.push(k);
      }

      const tl = gsap.timeline({ delay: ENTRY.delay });
      // random stagger: each card rises after its own random delay (still
      // staggered, but with no positional/center-out pattern).
      const spread = ENTRY.stagger * Math.max(visible.length - 1, 1);
      let lastRiseEnd = 0;
      visible.forEach((idx) => {
        const at = Math.random() * spread;
        lastRiseEnd = Math.max(lastRiseEnd, at + ENTRY.riseDuration);
        tl.to(
          pEntry,
          {
            [idx]: 1,
            duration: ENTRY.riseDuration,
            ease: ENTRY.riseEase,
          },
          at,
        );
      });

      // rise done -> hold at small size briefly, then grow to full (staggered)
      tl.call(
        () => {
          entryActive = false;
          entrySettled = true;
        },
        null,
        lastRiseEnd,
      );

      // grow stagger ranked by INTEGER slot distance from the centered source,
      // so the center is rank 0 and each symmetric left/right pair shares a rank
      // (they grow together). outward = rank ascending, inward = descending.
      const cSrcG = centerIndex(scroll);
      const Ng = sources.length;
      const midRepG = Math.floor(REPEATS / 2);
      const growList = [];
      let maxRank = 0;
      for (let k = 0; k < lastCenterX.length; k++) {
        if (lastCenterX[k] === undefined) continue;
        const rep = Math.floor(k / Ng);
        if (rep !== midRepG) continue; // only the 12 entry panels
        const srcIdx = k % Ng;
        let di = srcIdx - cSrcG;
        if (di > Ng / 2) di -= Ng;
        if (di < -Ng / 2) di += Ng;
        const r = Math.abs(di); // 0 center, 1 = both neighbours, ...
        maxRank = Math.max(maxRank, r);
        growList.push({ idx: k, rank: r });
      }
      const growRanked = growList.map((v) => ({
        idx: v.idx,
        rank: ENTRY.growDir === "outward" ? v.rank : maxRank - v.rank,
      }));

      const growStart = lastRiseEnd + ENTRY.growDelay;
      let growEnd = growStart;

      // lens effect blooms back in the moment the grow begins
      tl.to(
        focusState,
        {
          lensFx: 1,
          duration: ENTRY.lensBloom,
          ease: ENTRY.lensBloomEase,
        },
        growStart,
      );

      growRanked.forEach((o) => {
        const at = growStart + o.rank * ENTRY.growStagger;
        growEnd = Math.max(growEnd, at + ENTRY.growDuration);
        tl.to(
          growArr,
          {
            [o.idx]: 1,
            duration: ENTRY.growDuration,
            ease: ENTRY.growEase,
          },
          at,
        );
      });
      // hand off to the normal full-size carousel once all panels are grown
      tl.call(
        () => {
          entrySettled = false;
          for (let k = 0; k < growArr.length; k++) growArr[k] = 1;
          if (setEntryDoneRef.current) setEntryDoneRef.current(true);
        },
        null,
        growEnd,
      );
      entryAnim = tl;
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);

    // ---- animation loop ----
    let raf;
    function tick() {
      if (!dragging) {
        target += velocity;
        velocity *= CONFIG.FRICTION;

        // Snap as the scroll is *about to settle*: when remaining glide distance
        // and momentum are both small, redirect onto the nearest panel so it
        // eases into place seamlessly.
        const remaining = Math.abs(target - scroll);
        if (
          CONFIG.SNAP &&
          !snapped &&
          Math.abs(velocity) < CONFIG.SNAP_VELOCITY &&
          remaining < CONFIG.SNAP_SETTLE
        ) {
          target = snapTarget(target);
          snapped = true;
          velocity = 0;
        }
        if (Math.abs(velocity) < 0.05) velocity = 0;
      }
      // normal scroll uses the raw lerp; while gliding onto a snapped panel,
      // shape the snap ease through the chosen easing curve.
      let ease = CONFIG.EASE;
      if (snapped) {
        const curve = EASINGS[CONFIG.SNAP_CURVE] || EASINGS.linear;
        ease = curve(CONFIG.SNAP_EASE);
      }
      scroll += (target - scroll) * ease;

      // swap overlay text/counter to whatever image is centered (no animation)
      const ci = centerIndex(scroll);
      if (ci !== lastCenter) {
        lastCenter = ci;
        setActive(ci);
      }

      // ---- scroll velocity → energy 0..1 (drives panel shrink) ----
      const rawSpeed = scroll - prevScroll; // signed px/frame
      prevScroll = scroll;
      const norm = Math.min(
        1,
        Math.abs(rawSpeed) / Math.max(1, CONFIG.SHRINK_MAX),
      );
      // attack fast when speeding up, decay slow when settling
      const k =
        norm > scrollEnergy ? CONFIG.SHRINK_ATTACK : CONFIG.SHRINK_DECAY;
      scrollEnergy += (norm - scrollEnergy) * k;

      layout();

      // single centered lens; position adjustable via posX/posY (screen-UV).
      lensUniforms.uCenter.value.set(LENS.posX, LENS.posY);
      lensUniforms.uAspect.value = W / H;
      lensUniforms.uTime.value = performance.now() * 0.001;
      const rad = (a) => (a * Math.PI) / 180;
      lensUniforms.uRotation.value =
        rad(LENS.rotation) + rad(LENS.spin) * (performance.now() * 0.001);

      // focus: ramp the lens FX props by lensFx (1 = full, 0 = invisible)
      const fx = focusState.lensFx;
      LENS_FX_KEYS.forEach((k) => {
        lensUniforms[k].value = lensFxFull[k] * fx;
      });

      // 1) render carousel into the FBO
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      // 2) render the FBO to screen through the lens shader
      renderer.setRenderTarget(null);
      renderer.render(lensScene, lensCam);

      raf = requestAnimationFrame(tick);
    }
    tick();

    if (ENTRY.enabled) playEntry();

    // ---- lil-gui ----
    const gui = new GUI({ title: "Carousel" });
    gui.hide(); // collapsed by default

    gui
      .add(CONFIG, "PANEL_H", 10, 600, 1)
      .name("panel height")
      .onChange(recomputeTotal);
    gui.add(CONFIG, "GAP", 0, 120, 1).name("gap").onChange(recomputeTotal);
    gui.add(CONFIG, "EASE", 0.02, 0.2, 0.005).name("ease");
    gui.add(CONFIG, "FRICTION", 0.8, 0.98, 0.005).name("friction");

    const scrollFolder = gui.addFolder("Scroll & Snap");
    scrollFolder.add(CONFIG, "WHEEL", 0.1, 4, 0.05).name("scroll sensitivity");
    scrollFolder.add(CONFIG, "EASE", 0.02, 0.3, 0.005).name("scroll ease");
    scrollFolder
      .add(CONFIG, "FRICTION", 0.8, 0.985, 0.005)
      .name("momentum decay");
    scrollFolder.add(CONFIG, "SNAP").name("snap to center");
    scrollFolder
      .add(CONFIG, "SNAP_VELOCITY", 0.5, 20, 0.5)
      .name("snap settle vel");
    scrollFolder.add(CONFIG, "SNAP_SETTLE", 5, 400, 5).name("snap settle dist");
    scrollFolder.add(CONFIG, "SNAP_EASE", 0.02, 0.3, 0.005).name("snap ease");
    scrollFolder
      .add(CONFIG, "SNAP_CURVE", Object.keys(EASINGS))
      .name("snap easing");

    const focusFolder = gui.addFolder("Focus Mode");
    focusFolder
      .add(FOCUS, "cardDuration", 0.2, 2.5, 0.05)
      .name("card duration");
    focusFolder
      .add(FOCUS, "focusDuration", 0.2, 2.5, 0.05)
      .name("focus duration");
    focusFolder.add(FOCUS, "cardEase", GSAP_EASES).name("card ease");
    focusFolder.add(FOCUS, "focusEase", GSAP_EASES).name("focus ease");
    focusFolder.add(FOCUS, "stagger", 0, 0.25, 0.005).name("stagger (s)");
    focusFolder.add(FOCUS, "dropDist", 0.6, 2.5, 0.05).name("drop distance");
    focusFolder.add(FOCUS, "centerScale", 1, 1.8, 0.01).name("focus scale");
    focusFolder.add(FOCUS, "lensFade", 0.2, 2, 0.05).name("lens fade (s)");

    const entryFolder = gui.addFolder("Entry Animation");
    entryFolder.add(ENTRY, "enabled").name("auto on load");
    entryFolder.add(ENTRY, "delay", 0, 2, 0.05).name("start delay (s)");
    entryFolder.add(ENTRY, "startH", 20, 300, 1).name("start height");
    entryFolder.add(ENTRY, "riseDuration", 0.3, 3, 0.05).name("rise dur (s)");
    entryFolder.add(ENTRY, "stagger", 0, 0.3, 0.005).name("stagger (s)");
    entryFolder.add(ENTRY, "riseEase", GSAP_EASES).name("rise ease");
    entryFolder.add(ENTRY, "fromBelow", 0.3, 1.5, 0.05).name("start below");
    entryFolder.add(ENTRY, "growDelay", 0, 1.5, 0.05).name("grow delay (s)");
    entryFolder.add(ENTRY, "growDuration", 0.2, 2.5, 0.05).name("grow dur (s)");
    entryFolder.add(ENTRY, "growEase", GSAP_EASES).name("grow ease");
    entryFolder.add(ENTRY, "growStagger", 0, 0.3, 0.005).name("grow stagger");
    entryFolder.add(ENTRY, "growDir", ["outward", "inward"]).name("grow dir");
    entryFolder.add(ENTRY, "lensBloom", 0.2, 3, 0.05).name("lens bloom (s)");
    entryFolder.add(ENTRY, "lensBloomEase", GSAP_EASES).name("lens bloom ease");
    entryFolder.add({ replay: () => playEntry() }, "replay").name("▶ replay");

    const lensFolder = gui.addFolder("Edge Lenses");
    lensFolder
      .add(LENS, "shape", ["circle", "square"])
      .onChange(
        (v) => (lensUniforms.uShape.value = v === "square" ? 1.0 : 0.0),
      );
    lensFolder
      .add(LENS, "squareRound", 0, 1, 0.01)
      .name("corner round")
      .onChange((v) => (lensUniforms.uSquareRound.value = v));
    lensFolder.add(LENS, "rotation", -180, 180, 1).name("rotation°");
    lensFolder.add(LENS, "spin", -180, 180, 1).name("spin °/s");
    lensFolder
      .add(LENS, "sizeX", 0.03, 0.6, 0.005)
      .name("width")
      .onChange((v) => (lensUniforms.uSizeX.value = v));
    lensFolder
      .add(LENS, "sizeY", 0.03, 0.6, 0.005)
      .name("height")
      .onChange((v) => (lensUniforms.uSizeY.value = v));
    lensFolder
      .add(LENS, "posX", 0, 1, 0.005)
      .name("pos X")
      .onChange((v) => (lensUniforms.uCenter.value.x = v));
    lensFolder
      .add(LENS, "posY", 0, 1, 0.005)
      .name("pos Y")
      .onChange((v) => (lensUniforms.uCenter.value.y = v));
    lensFolder
      .add(LENS, "zoom", 0, 2, 0.01)
      .name("inward pull")
      .onChange((v) => (lensUniforms.uZoom.value = v));
    lensFolder
      .add(LENS, "dispersion", 0, 120, 1)
      .onChange((v) => (lensUniforms.uDispersion.value = v));
    lensFolder
      .add(LENS, "blur", 0, 20, 0.1)
      .onChange((v) => (lensUniforms.uBlur.value = v));
    lensFolder
      .add(LENS, "samples", 2, 16, 1)
      .onChange((v) => (lensUniforms.uSamples.value = v));
    lensFolder
      .add(LENS, "vignette", 0, 1, 0.01)
      .name("vignette")
      .onChange((v) => (lensUniforms.uVignette.value = v));
    lensFolder
      .add(LENS, "vignetteSize", 0.3, 1.5, 0.01)
      .name("vignette size")
      .onChange((v) => (lensUniforms.uVignetteSize.value = v));
    const glowFolder = lensFolder.addFolder("Glow / nova / ring");
    glowFolder
      .add(LENS, "glow", 0, 40, 0.1)
      .onChange((v) => (lensUniforms.uGlow.value = v));
    glowFolder
      .add(LENS, "whiteGlow", 0, 1, 0.005)
      .name("white glow")
      .onChange((v) => (lensUniforms.uWhiteGlow.value = v));
    glowFolder
      .add(LENS, "novaSize", 0.1, 12, 0.1)
      .name("nova size")
      .onChange((v) => (lensUniforms.uNovaSize.value = v));
    glowFolder
      .add(LENS, "blueRing", 0, 6, 0.05)
      .name("blue ring")
      .onChange((v) => (lensUniforms.uBlueRing.value = v));
    glowFolder
      .add(LENS, "ringRadius", 0.1, 0.49, 0.005)
      .name("ring radius")
      .onChange((v) => (lensUniforms.uRingRadius.value = v));
    glowFolder
      .add(LENS, "ringWidth", 0.003, 0.3, 0.001)
      .name("ring width")
      .onChange((v) => (lensUniforms.uRingWidth.value = v));
    glowFolder
      .add(LENS, "shimmer")
      .onChange((v) => (lensUniforms.uShimmer.value = v ? 1.0 : 0.0));
    glowFolder
      .add(LENS, "shimmerFreq", 1, 60, 1)
      .name("shimmer freq")
      .onChange((v) => (lensUniforms.uShimmerFreq.value = v));
    glowFolder
      .add(LENS, "shimmerSpeed", 0, 20, 0.1)
      .name("shimmer speed")
      .onChange((v) => (lensUniforms.uShimmerSpeed.value = v));
    glowFolder
      .add(LENS, "shimmerDepth", 0, 0.5, 0.005)
      .name("shimmer depth")
      .onChange((v) => (lensUniforms.uShimmerDepth.value = v));
    glowFolder
      .add(LENS, "rimLine", 0, 2, 0.01)
      .name("white border")
      .onChange((v) => (lensUniforms.uRimLine.value = v));
    glowFolder
      .add(LENS, "rimLinePos", 0.1, 0.5, 0.001)
      .name("border pos")
      .onChange((v) => (lensUniforms.uRimLinePos.value = v));
    glowFolder
      .add(LENS, "rimLineWidth", 0.001, 0.05, 0.0005)
      .name("border width")
      .onChange((v) => (lensUniforms.uRimLineWidth.value = v));
    const rimFolder = lensFolder.addFolder("Rim fluid wave");
    rimFolder
      .add(LENS, "rimStart", 0, 1, 0.001)
      .onChange((v) => (lensUniforms.uRimStart.value = v));
    rimFolder
      .add(LENS, "rimTangential", 0, 0.6, 0.001)
      .onChange((v) => (lensUniforms.uRimTangential.value = v));
    rimFolder
      .add(LENS, "rimInward", 0, 1, 0.001)
      .onChange((v) => (lensUniforms.uRimInward.value = v));
    rimFolder
      .add(LENS, "rimFreq1", 1, 40, 1)
      .onChange((v) => (lensUniforms.uRimFreq1.value = v));
    rimFolder
      .add(LENS, "rimFreq2", 1, 40, 1)
      .onChange((v) => (lensUniforms.uRimFreq2.value = v));
    lensFolder
      .addColor(LENS, "blueColor")
      .name("blue color")
      .onChange((v) => lensUniforms.uBlueColor.value.set(v));

    // ---- resize ----
    function onResize() {
      W = mount.clientWidth;
      H = mount.clientHeight;
      renderer.setSize(W, H);
      camera.left = -W / 2;
      camera.right = W / 2;
      camera.top = H / 2;
      camera.bottom = -H / 2;
      camera.updateProjectionMatrix();
      rt.setSize(W, H);
      lensUniforms.uRes.value.set(W, H);
    }
    window.addEventListener("resize", onResize);

    // ---- cleanup ----
    return () => {
      cancelAnimationFrame(raf);
      gui.destroy();
      window.removeEventListener("resize", onResize);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("click", onClick);
      if (focusState.anim) focusState.anim.kill();
      renderer.dispose();
      rt.dispose();
      lensQuad.geometry.dispose();
      lensMat.dispose();
      pool.forEach((p) => {
        p.mesh.geometry.dispose();
        p.mat.dispose();
      });
      sources.forEach((s) => {
        if (s.tex) s.tex.dispose();
      });
      if (renderer.domElement.parentNode)
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div ref={mountRef} className="h-screen relative w-screen bg-white">
      <div
        ref={topTextRef}
        className="absolute px-4 left-1/2 top-[15%] mix-blend-exclusion text-white"
        style={ENTRY.enabled ? { opacity: 0, visibility: "hidden" } : undefined}
      >
        <div className="flex flex-col items-center justify-center">
          <p className="text-center text-base">{IMAGES[active].brand}</p>
          <p className="text-center">{IMAGES[active].desc}</p>
        </div>
      </div>

      <div
        ref={counterRef}
        className="absolute px-4 left-1/2 bottom-[15%] text-black"
        style={ENTRY.enabled ? { opacity: 0, visibility: "hidden" } : undefined}
      >
        <p className="text-center text-base">
          {String(active + 1).padStart(2, "0")}/
          {String(IMAGES.length).padStart(2, "0")}
        </p>
      </div>

      <div
        ref={cursorRef}
        className="fixed top-4 left-4 z-50 pointer-events-none text-white text-sm whitespace-nowrap mix-blend-exclusion"
        style={{ willChange: "transform" }}
      >
        View
      </div>

      <button
        type="button"
        onClick={() =>
          closeBtnHandlerRef.current && closeBtnHandlerRef.current()
        }
        aria-label="Close"
        className="fixed z-50 text-white text-sm whitespace-nowrap mix-blend-exclusion transition-opacity duration-300"
        style={{
          top: "2vh",
          right: "4vw",
          opacity: focused ? 1 : 0,
          pointerEvents: focused ? "auto" : "none",
          cursor: "pointer",
        }}
      >
        Close
      </button>
    </div>
  );
};

export default CarouselSection;
