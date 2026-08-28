"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { registerCarouselEntry } from "@/lib/carousel/entry-controller";
import { AdminIcon } from "./Icons";
import YouTubePlayer from "./YouTubePlayer";

const twoDigits = (value) => String(value).padStart(2, "0");

function waitForPoster(image, timeout = 1600) {
  return new Promise((resolve) => {
    if (!image) return resolve();
    let finished = false;
    const done = () => { if (finished) return; finished = true; clearTimeout(timer); image.removeEventListener("load", ready); image.removeEventListener("error", done); resolve(); };
    const ready = () => { if (image.decode) image.decode().catch(() => {}).finally(done); else done(); };
    const timer = setTimeout(done, timeout);
    if (image.complete) ready();
    else { image.addEventListener("load", ready, { once: true }); image.addEventListener("error", done, { once: true }); }
  });
}

export default function MobilePortfolio({ videos }) {
  const rootRef = useRef(null);
  const metaRef = useRef(null);
  const trackRef = useRef(null);
  const playRef = useRef(null);
  const indicatorsRef = useRef(null);
  const frameRef = useRef(0);
  const timelineRef = useRef(null);
  const replayRef = useRef(null);
  const runTokenRef = useRef(0);
  const entryCompleteRef = useRef(false);
  const mouseDrag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const activeRef = useRef(active);
  const signature = videos.map((item) => item.id).join("|");
  const previousSignature = useRef(signature);
  const video = videos[active];

  useEffect(() => { activeRef.current = active; }, [active]);

  useLayoutEffect(() => {
    if (!window.matchMedia("(max-width: 1024px)").matches) {
      entryCompleteRef.current = true;
      return;
    }
    const mountedRoot = rootRef.current;
    let cancelled = false;

    function finishEntry(elements) {
      if (elements?.length) gsap.set(elements, { clearProps: "transform,opacity,visibility" });
      rootRef.current?.classList.remove("is-entering");
      rootRef.current?.removeAttribute("aria-busy");
      entryCompleteRef.current = true;
    }

    async function playEntry({ waitForImage = true } = {}) {
      const token = ++runTokenRef.current;
      timelineRef.current?.kill();
      const root = rootRef.current; const track = trackRef.current;
      if (!root || !track) return;
      const frames = [...track.children];
      const currentIndex = Math.min(activeRef.current, Math.max(frames.length - 1, 0));
      const activeFrame = frames[currentIndex];
      const adjacentFrame = frames.length > 1 ? frames[(currentIndex + 1) % frames.length] : null;
      const liquid = activeFrame?.querySelector(".mobile-liquid-overlay");
      const meta = metaRef.current; const play = playRef.current; const indicators = indicatorsRef.current;
      const animated = [...frames, liquid, meta, play, indicators].filter(Boolean);
      mouseDrag.current.active = false;
      entryCompleteRef.current = false;
      root.classList.add("is-entering");
      root.setAttribute("aria-busy", "true");
      gsap.set(frames, { yPercent: 55, opacity: 0 });
      gsap.set(activeFrame, { yPercent: 78, opacity: 0, scale: 0.97 });
      if (liquid) gsap.set(liquid, { yPercent: 40, opacity: 0, scale: 0.96 });
      gsap.set(meta, { y: 12, opacity: 0 });
      gsap.set([play, indicators], { opacity: 0 });

      if (waitForImage) await waitForPoster(activeFrame?.querySelector("img"));
      if (cancelled || token !== runTokenRef.current) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        gsap.set(animated, { clearProps: "transform,opacity,visibility" });
        const timeline = gsap.timeline({ onComplete: () => finishEntry(animated) });
        timeline.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power1.out", clearProps: "opacity" });
        timelineRef.current = timeline;
        return;
      }

      const timeline = gsap.timeline({
        defaults: { duration: 0.72, ease: "back.out(1.35)" },
        onComplete: () => finishEntry(animated),
      });
      timeline.to(activeFrame, { yPercent: 0, opacity: 1, scale: 1 }, 0);
      if (adjacentFrame) timeline.to(adjacentFrame, { yPercent: 0, opacity: 1 }, 0.06);
      if (liquid) timeline.to(liquid, { yPercent: 0, opacity: 0.72, scale: 1, duration: 0.68 }, 0.12);
      timeline
        .to(meta, { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" }, 0.3)
        .to(play, { opacity: 1, duration: 0.25, ease: "power1.out" }, 0.46)
        .to(indicators, { opacity: 1, duration: 0.25, ease: "power1.out" }, 0.52);
      timelineRef.current = timeline;
    }

    replayRef.current = playEntry;
    playEntry();
    return () => {
      cancelled = true;
      runTokenRef.current += 1;
      timelineRef.current?.kill();
      const root = mountedRoot;
      const elements = root ? root.querySelectorAll(".mobile-project,.mobile-liquid-overlay,.mobile-project-meta,.mobile-play,.mobile-carousel-indicators") : [];
      if (elements.length) gsap.set(elements, { clearProps: "transform,opacity,visibility" });
      root?.classList.remove("is-entering");
      root?.removeAttribute("aria-busy");
      entryCompleteRef.current = true;
    };
  }, []);

  useEffect(() => {
    const unregister = registerCarouselEntry("mobile", () => replayRef.current?.({ waitForImage: false }));
    return () => { unregister(); cancelAnimationFrame(frameRef.current); };
  }, []);

  useEffect(() => {
    if (previousSignature.current === signature) return;
    previousSignature.current = signature;
    let transition;
    const frame = requestAnimationFrame(() => {
      setActive(0);
      trackRef.current?.scrollTo({ left: 0, behavior: "instant" });
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      transition = gsap.fromTo([metaRef.current, trackRef.current, indicatorsRef.current], { y: 8, opacity: 0.55 }, { y: 0, opacity: 1, duration: 0.32, ease: "power2.out", clearProps: "transform,opacity" });
    });
    return () => { cancelAnimationFrame(frame); transition?.kill(); };
  }, [signature]);

  useEffect(() => {
    if (!focused) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [focused]);

  function updateActive() {
    if (!entryCompleteRef.current) return;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const track = trackRef.current;
      if (!track) return;
      const centre = track.getBoundingClientRect().left + track.clientWidth / 2;
      let next = 0; let distance = Infinity;
      [...track.children].forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        const candidate = Math.abs(rect.left + rect.width / 2 - centre);
        if (candidate < distance) { distance = candidate; next = index; }
      });
      setActive(next);
    });
  }

  function pointerDown(event) {
    if (!entryCompleteRef.current || event.pointerType !== "mouse") return;
    mouseDrag.current = { active: true, startX: event.clientX, startScroll: trackRef.current.scrollLeft, moved: false };
    trackRef.current.setPointerCapture(event.pointerId);
  }

  function pointerMove(event) {
    if (!mouseDrag.current.active) return;
    const delta = event.clientX - mouseDrag.current.startX;
    if (Math.abs(delta) > 6) mouseDrag.current.moved = true;
    trackRef.current.scrollLeft = mouseDrag.current.startScroll - delta;
  }

  function pointerUp(event) {
    if (!mouseDrag.current.active) return;
    mouseDrag.current.active = false;
    if (trackRef.current.hasPointerCapture(event.pointerId)) trackRef.current.releasePointerCapture(event.pointerId);
  }

  function openProject(index) {
    if (!entryCompleteRef.current) return;
    if (mouseDrag.current.moved) { mouseDrag.current.moved = false; return; }
    if (index !== active && window.matchMedia("(max-width: 1024px)").matches) {
      trackRef.current?.children[index]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      setActive(index);
      return;
    }
    setActive(index);
    setFocused(true);
  }

  if (!video) return null;
  return <section ref={rootRef} className="mobile-work mobile-carousel" aria-label="Selected video work">
    <div ref={metaRef} className="mobile-project-meta" aria-live="polite"><span>{video.category?.name || video.clientName || "Selected work"}</span><h2>{video.title}</h2><p>{video.year || ""}{video.year ? " · " : ""}{video.orientation === "portrait" ? "9:16 portrait" : "16:9 landscape"}</p></div>
    <div ref={trackRef} className={`mobile-carousel-track active-${video.orientation}`} onScroll={updateActive} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
      {videos.map((item, index) => <button type="button" key={item.id} className={`mobile-project ${item.orientation === "portrait" ? "portrait" : "landscape"} ${active === index ? "is-active" : ""}`} onClick={() => openProject(index)} aria-label={`Play ${item.title}`} aria-current={active === index ? "true" : undefined}>
        <img src={item.posterUrl} alt={`${item.title} poster`} draggable="false" />
        <span className="mobile-liquid-overlay" aria-hidden="true" />
        <span className="mobile-card-caption"><small>{item.category?.name || item.clientName || "Selected work"}</small><strong>{item.title}</strong></span>
      </button>)}
    </div>
    <button ref={playRef} className="mobile-play" type="button" onClick={() => { if (entryCompleteRef.current) setFocused(true); }}><AdminIcon name="play" /> Play film</button>
    <div ref={indicatorsRef} className="mobile-carousel-indicators"><span>{videos.length > 1 ? "Swipe to navigate" : ""}</span><span>{twoDigits(active + 1)}/{twoDigits(videos.length)}</span></div>
    {focused && <div className="mobile-player" role="dialog" aria-modal="true" aria-label={`${video.title} player`}><YouTubePlayer video={video} onClose={() => setFocused(false)} /></div>}
  </section>;
}
