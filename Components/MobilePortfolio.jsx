"use client";

import { useEffect, useRef, useState } from "react";
import { AdminIcon } from "./Icons";
import YouTubePlayer from "./YouTubePlayer";

const twoDigits = (value) => String(value).padStart(2, "0");

export default function MobilePortfolio({ videos }) {
  const trackRef = useRef(null);
  const frameRef = useRef(0);
  const mouseDrag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const video = videos[active];

  useEffect(() => {
    if (!focused) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [focused]);

  function updateActive() {
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
    if (event.pointerType !== "mouse") return;
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
  return <section className="mobile-work mobile-carousel" aria-label="Selected video work">
    <div className="mobile-project-meta" aria-live="polite"><span>{video.category?.name || video.clientName || "Selected work"}</span><h2>{video.title}</h2><p>{video.year || ""}{video.year ? " · " : ""}{video.orientation === "portrait" ? "9:16 portrait" : "16:9 landscape"}</p></div>
    <div ref={trackRef} className={`mobile-carousel-track active-${video.orientation}`} onScroll={updateActive} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
      {videos.map((item, index) => <button type="button" key={item.id} className={`mobile-project ${item.orientation === "portrait" ? "portrait" : "landscape"} ${active === index ? "is-active" : ""}`} onClick={() => openProject(index)} aria-label={`Play ${item.title}`} aria-current={active === index ? "true" : undefined}>
        <img src={item.posterUrl} alt={`${item.title} poster`} draggable="false" />
        <span className="mobile-card-caption"><small>{item.category?.name || item.clientName || "Selected work"}</small><strong>{item.title}</strong></span>
      </button>)}
    </div>
    <button className="mobile-play" type="button" onClick={() => setFocused(true)}><AdminIcon name="play" /> Play film</button>
    <div className="mobile-carousel-indicators"><span>{videos.length > 1 ? "Swipe to navigate" : ""}</span><span>{twoDigits(active + 1)}/{twoDigits(videos.length)}</span></div>
    {focused && <div className="mobile-player" role="dialog" aria-modal="true" aria-label={`${video.title} player`}><YouTubePlayer video={video} onClose={() => setFocused(false)} /></div>}
  </section>;
}
