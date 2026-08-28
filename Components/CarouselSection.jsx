"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createCarousel } from "@/lib/carousel/engine";
import { createCarouselGui } from "@/lib/carousel/gui";
import YouTubePlayer from "./YouTubePlayer";
import { AdminIcon } from "./Icons";

const MIN_WEBGL_WIDTH = 1025;

export default function CarouselSection({ projects }) {
  const router = useRouter();
  const mountRef = useRef(null); const cursorRef = useRef(null); const engineRef = useRef(null);
  const [active, setActive] = useState(0); const [focused, setFocused] = useState(false); const [screen, setScreen] = useState("pending");
  const project = projects[active];
  useEffect(() => {
    const query = window.matchMedia(`(min-width: ${MIN_WEBGL_WIDTH}px)`); const update = () => setScreen(query.matches ? "webgl" : "native"); update(); query.addEventListener("change", update); return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (screen !== "webgl" || !mountRef.current || !projects.length) return;
    const engine = createCarousel(mountRef.current, { projects, cursorElement: cursorRef.current, onActiveChange: setActive, onFocusChange: setFocused, onProjectOpen: (index) => router.push(`/work/${projects[index].slug}`) });
    engineRef.current = engine;
    const gui = process.env.NODE_ENV === "development" ? createCarouselGui(engine) : null;
    return () => { gui?.destroy(); engine.destroy(); engineRef.current = null; };
  }, [screen, projects, router]);
  useEffect(() => { const close = (event) => { if (event.key === "Escape") engineRef.current?.closeFocus(); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, []);
  if (screen !== "webgl") return null;
  return <section ref={mountRef} className="carousel-shell" aria-label="Selected video work">
    <div className="carousel-meta"><span>{project?.category?.name || project?.clientName || "Selected work"}</span><h2>{project?.title}</h2><p>{project?.year || ""} · {project?.orientation === "portrait" ? "9:16" : "16:9"}</p></div>
    <p className="carousel-count">{String(active + 1).padStart(2, "0")}/{String(projects.length).padStart(2, "0")}</p><p className="carousel-hint">Scroll to navigate</p><span className="play-label"><AdminIcon name="play" />Play film</span>
    <span ref={cursorRef} className="carousel-cursor" aria-hidden="true">View</span>
    {focused && project && <div className="focus-project"><div><span>{project.category?.name || "Selected work"} · {project.year || ""}</span><h2>{project.title}</h2><p>{project.description || project.shortDescription}</p></div><YouTubePlayer video={project} onClose={() => engineRef.current?.closeFocus()} /></div>}
  </section>;
}
