"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { registerCarouselEntry } from "@/lib/carousel/entry-controller";
import ProjectMedia from "./ProjectMedia";
import { AdminIcon } from "./Icons";

export default function CarouselSection({ projects, showMetadata = true, motion }) {
  const mountRef = useRef(null); const cursorRef = useRef(null); const engineRef = useRef(null);
  const [active, setActive] = useState(0); const [focused, setFocused] = useState(false); const [entryDone, setEntryDone] = useState(false);
  const project = projects[active];
  useEffect(() => {
    if (!mountRef.current || !projects.length) return;
    let cancelled = false; let unregisterDesktop = () => {}; let unregisterMobile = () => {}; let gui = null;
    async function mountCarousel() {
      const { createCarousel } = await import("@/lib/carousel/engine");
      if (cancelled || !mountRef.current) return;
      const engine = createCarousel(mountRef.current, { projects, motion, cursorElement: cursorRef.current, onActiveChange: setActive, onFocusChange: setFocused, onEntryDone: setEntryDone });
      engineRef.current = engine;
      unregisterDesktop = registerCarouselEntry("desktop", engine.replayEntry);
      unregisterMobile = registerCarouselEntry("mobile", engine.replayEntry);
      if (process.env.NODE_ENV === "development") {
        const { createCarouselGui } = await import("@/lib/carousel/gui");
        if (!cancelled) gui = createCarouselGui(engine);
      }
    }
    mountCarousel();
    return () => { cancelled = true; unregisterDesktop(); unregisterMobile(); gui?.destroy(); engineRef.current?.destroy(); engineRef.current = null; };
  }, [projects, motion]);
  useEffect(() => { const close = (event) => { if (event.key === "Escape") engineRef.current?.closeFocus(); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, []);
  useEffect(() => { if (!focused) return; const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = previous; }; }, [focused]);
  return <section ref={mountRef} className={`carousel-shell ${entryDone ? "entry-done" : "is-entering"}`} aria-label="Selected video work">
    {showMetadata && <div className="carousel-meta"><span>{project?.category?.name || project?.clientName || "Selected work"}</span><h2>{project?.title}</h2><p>{project?.year || ""} · {project?.orientation === "portrait" ? "9:16" : "16:9"}</p></div>}
    <p className="carousel-count">{String(active + 1).padStart(2, "0")}/{String(projects.length).padStart(2, "0")}</p>{projects.length > 1 && <p className="carousel-hint"><span className="desktop-copy">Drag to explore</span><span className="mobile-copy">Swipe to explore</span></p>}<button className="play-label" type="button" disabled={!entryDone} onClick={(event) => { if (event.detail > 0) event.currentTarget.blur(); engineRef.current?.openActive(); }} aria-label={`Play ${project?.title || "selected project"}`}><AdminIcon name="play" />Play</button>
    <span ref={cursorRef} className="carousel-cursor" aria-hidden="true">View</span>
    {focused && project && <div className="focus-project"><div className="focus-project-copy"><h2>{project.title}</h2>{(project.description || project.shortDescription) && <p>{project.description || project.shortDescription}</p>}<Link className="button focus-view-more" href={`/work/${project.slug}`}>View More</Link></div><ProjectMedia project={project} context="focus-player" autoPlay onClose={() => engineRef.current?.closeFocus()} /></div>}
  </section>;
}
