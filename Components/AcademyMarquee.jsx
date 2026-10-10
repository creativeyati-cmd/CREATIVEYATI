"use client";

import { useState } from "react";

const words = ["CREATE", "PROMPT", "DIRECT", "EDIT", "TELL YOUR STORY"];

export default function AcademyMarquee() {
  const [paused, setPaused] = useState(false);
  return <section className="avc-marquee" aria-label="Learning areas">
    <div className="avc-marquee-track" style={{ animationPlayState: paused ? "paused" : "running" }}>
      {[0, 1].map(copy => <div className="avc-marquee-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>
        {words.map(word => <span key={word}>{word}<i aria-hidden="true">✳</i></span>)}
      </div>)}
    </div>
    <button className="avc-marquee-control" type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? "Resume scrolling text" : "Pause scrolling text"} title={paused ? "Resume scrolling text" : "Pause scrolling text"}>{paused ? "▶" : "Ⅱ"}</button>
  </section>;
}
