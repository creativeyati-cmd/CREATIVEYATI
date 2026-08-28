"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { registerCarouselEntry } from "@/lib/carousel/entry-controller";
import ProjectMedia from "./ProjectMedia";
import { AdminIcon } from "./Icons";

const MIN_WEBGL_WIDTH = 1025;

export default function CarouselSection({ projects, showMetadata = true }) {
  const mountRef = useRef(null); const cursorRef = useRef(null); const engineRef = useRef(null);
  const [active, setActive] = useState(0); const [focused, setFocused] = useState(false); const [screen, setScreen] = useState("pending"); const [entryDone, setEntryDone] = useState(false);
  const project = projects[active];
  useEffect(() => {
    const query = window.matchMedia(`(min-width: ${MIN_WEBGL_WIDTH}px)`); const update = () => setScreen(query.matches ? "webgl" : "native"); update(); query.addEventListener("change", update); return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (screen !== "webgl" || !mountRef.current || !projects.length) return;
    let cancelled = false; let unregisterEntry = () => {}; let gui = null;
    async function mountCarousel() {
      const { createCarousel } = await import("@/lib/carousel/engine");
      if (cancelled || !mountRef.current) return;
      const engine = createCarousel(mountRef.current, { projects, cursorElement: cursorRef.current, onActiveChange: setActive, onFocusChange: setFocused, onEntryDone: setEntryDone });
      engineRef.current = engine;
      unregisterEntry = registerCarouselEntry("desktop", engine.replayEntry);
      if (process.env.NODE_ENV === "development") {
        const { createCarouselGui } = await import("@/lib/carousel/gui");
        if (!cancelled) gui = createCarouselGui(engine);
      }
    }
    mountCarousel();
    return () => { cancelled = true; unregisterEntry(); gui?.destroy(); engineRef.current?.destroy(); engineRef.current = null; };
  }, [screen, projects]);
  useEffect(() => { const close = (event) => { if (event.key === "Escape") engineRef.current?.closeFocus(); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, []);
  if (screen !== "webgl") return null;
  return <section ref={mountRef} className={`carousel-shell ${entryDone ? "entry-done" : "is-entering"}`} aria-label="Selected video work">
    {showMetadata && <div className="carousel-meta"><span>{project?.category?.name || project?.clientName || "Selected work"}</span><h2>{project?.title}</h2><p>{project?.year || ""} · {project?.orientation === "portrait" ? "9:16" : "16:9"}</p></div>}
    <p className="carousel-count">{String(active + 1).padStart(2, "0")}/{String(projects.length).padStart(2, "0")}</p>{projects.length > 1 && <p className="carousel-hint">Scroll to navigate</p>}<span className="play-label"><AdminIcon name="play" />Play film</span>
    <span ref={cursorRef} className="carousel-cursor" aria-hidden="true">View</span>
    {focused && project && <div className="focus-project"><div className="focus-project-copy"><h2>{project.title}</h2>{(project.description || project.shortDescription) && <p>{project.description || project.shortDescription}</p>}<Link className="button focus-view-more" href={`/work/${project.slug}`}>View More</Link></div><ProjectMedia project={project} context="focus-player" autoPlay onClose={() => engineRef.current?.closeFocus()} /></div>}
  </section>;
}
