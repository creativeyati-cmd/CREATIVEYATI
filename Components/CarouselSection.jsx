"use client";

// React wrapper around the carousel. All the WebGL/animation logic lives in
// lib/carousel/engine.js — this component only owns the DOM overlay: the
// heading, the counter, the "View" cursor label and the Close button.
import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { PROJECTS, ENTRY, UI_ANIM } from "@/lib/carousel/config";
import { createCarousel } from "@/lib/carousel/engine";
import { createCarouselGui } from "@/lib/carousel/gui";

// The carousel is a desktop experience (wheel-driven, heavy shader work).
// At this viewport width or below we show a plain black screen instead.
const MIN_VIEWPORT_WIDTH = 1025; // px

const CarouselSection = () => {
  const mountRef = useRef(null); // engine mounts its canvas here
  const cursorRef = useRef(null); // trailing "View" label, moved by the engine
  const topTextRef = useRef(null); // brand/desc — GSAP-animated on focus
  const counterRef = useRef(null); // 01/12 counter — GSAP-animated on focus
  const engineRef = useRef(null); // createCarousel() handle
  const revealPlayedRef = useRef(false); // entry reveal fade runs exactly once

  const [active, setActive] = useState(0); // index of the centered image
  const [focused, setFocused] = useState(false); // a focus session is open
  const [entryDone, setEntryDone] = useState(false); // entry fully settled
  const [noClick, setNoClick] = useState(false); // drag-only mode (GUI toggle)
  // "pending" until we know the viewport (SSR-safe), then "ok" | "small"
  const [screen, setScreen] = useState("pending");

  // ---- viewport gate ----
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MIN_VIEWPORT_WIDTH - 1}px)`);
    const update = () => setScreen(mq.matches ? "small" : "ok");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // ---- engine lifecycle ----
  useEffect(() => {
    if (screen !== "ok") return; // never boot WebGL on small screens
    const engine = createCarousel(mountRef.current, {
      cursorElement: cursorRef.current,
      onActiveChange: setActive,
      onFocusChange: setFocused,
      onEntryDone: setEntryDone,
      onModeChange: (mode) => setNoClick(mode.noClick), // swaps the label text
    });
    engineRef.current = engine;
    const gui = createCarouselGui(engine); // dev panel (hidden by default)
    return () => {
      gui.destroy();
      engine.destroy();
      engineRef.current = null;
    };
  }, [screen]);

  // ---- overlay text transitions ----
  // GSAP-driven so they share the canvas animations' easing vocabulary.
  useEffect(() => {
    if (!topTextRef.current || !counterRef.current) return;
    if (!entryDone && ENTRY.enabled) {
      gsap.set([topTextRef.current, counterRef.current], { autoAlpha: 0 });
      revealPlayedRef.current = false;
      return; // stay hidden until entry settles
    }
    gsap.set(topTextRef.current, { xPercent: -50 }); // GSAP owns the transform
    gsap.set(counterRef.current, { xPercent: -50 });
    const y = focused ? (UI_ANIM.topShiftVh / 100) * window.innerHeight : 0;

    if (entryDone && !focused && !revealPlayedRef.current) {
      // premium settle reveal: slow gentle fade only (no movement), counter
      // trailing the top text slightly. Runs ONCE after entry — closing focus
      // must not replay it (the heading would blink out and fade back in).
      revealPlayedRef.current = true;
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

  // small screens: a plain black holding screen instead of the carousel.
  // "pending" (first paint, viewport not measured yet) stays black too so
  // mobile users never see a flash of the desktop experience booting.
  if (screen !== "ok") {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        {screen === "small" && (
          <p className="px-8 text-center text-sm text-white/70">
            This experience is designed for larger screens.
            <br />
            Please visit on a display wider than 1024px.
          </p>
        )}
      </div>
    );
  }

  return (
    <div ref={mountRef} className="h-screen relative w-screen bg-white">
      <div
        ref={topTextRef}
        className="absolute px-4 left-1/2 top-[15%] mix-blend-exclusion text-white pointer-events-none"
        style={ENTRY.enabled ? { opacity: 0, visibility: "hidden" } : undefined}
      >
        <div className="flex flex-col items-center justify-center">
          <p className="text-center text-base">{PROJECTS[active].brand}</p>
          <p className="text-center">{PROJECTS[active].desc}</p>
        </div>
      </div>

      <div
        ref={counterRef}
        className="absolute px-4 left-1/2 bottom-[15%] text-black pointer-events-none"
        style={ENTRY.enabled ? { opacity: 0, visibility: "hidden" } : undefined}
      >
        <p className="text-center text-base">
          {String(active + 1).padStart(2, "0")}/
          {String(PROJECTS.length).padStart(2, "0")}
        </p>
      </div>

      <div
        ref={cursorRef}
        className="fixed top-4 left-4 z-50 pointer-events-none text-white text-sm whitespace-nowrap mix-blend-exclusion"
        style={{ willChange: "transform", opacity: 0, visibility: "hidden" }}
      >
        {noClick ? "Drag" : "View"}
      </div>

      <button
        type="button"
        onClick={() => engineRef.current?.closeFocus()}
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
