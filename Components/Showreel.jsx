"use client";

import { useRef } from "react";
import Link from "next/link";

// The showreel is the hero's only pointer-driven element: over the frame the
// native cursor is replaced by a circular PLAY badge that tracks the pointer.
export default function Showreel({ still, alt }) {
  const frame = useRef(null);
  const badge = useRef(null);

  function track(event) {
    const box = frame.current?.getBoundingClientRect();
    if (!box || !badge.current) return;
    badge.current.style.setProperty("--x", `${event.clientX - box.left}px`);
    badge.current.style.setProperty("--y", `${event.clientY - box.top}px`);
  }

  return (
    <Link className="lh-reel" href="/work" ref={frame} onPointerMove={track} aria-label="Play showreel — view selected work">
      <img className="lh-reel-still" src={still} alt={alt} />
      <span className="lh-reel-grain" aria-hidden="true" />
      <span className="lh-reel-play">
        <span className="lh-reel-play-ring" aria-hidden="true" />
        PLAY SHOWREEL
      </span>
      <span className="lh-reel-chrome" aria-hidden="true">
        <span className="lh-reel-track"><span className="lh-reel-fill" /></span>
        <span className="lh-reel-chrome-meta"><span>SHOWREEL · 2026</span><span>00:48</span></span>
      </span>
      <span className="lh-reel-cursor" ref={badge} aria-hidden="true">PLAY</span>
    </Link>
  );
}
