"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AdminIcon } from "./Icons";
import ExternalVideoPlayer from "./ExternalVideoPlayer";
import { projectAspectRatio, projectCovers, projectOrientation, variantSrcSet } from "@/lib/project-media";

const contextSizes = {
  carousel: "(max-width: 720px) 92vw, 60vw",
  "project-page": "(max-width: 720px) 92vw, 800px",
  "focus-player": "(orientation: portrait) 88vw, 94vw",
  "admin-preview": "(max-width: 720px) 92vw, 520px",
};

export default function ProjectMedia({
  project,
  context = "carousel",
  priority = false,
  allowPlayback = false,
  autoPlay = false,
  preferMobile = false,
  onClose,
  className = "",
}) {
  const orientation = projectOrientation(project);
  const videoAspectRatio = projectAspectRatio(project);
  const covers = useMemo(() => projectCovers(project), [project]);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [overrideSource, setOverrideSource] = useState("");
  const hasMobileCover = Boolean(covers.mobileUrl || Object.keys(covers.mobileVariants).length);
  const mainSrcSet = variantSrcSet(preferMobile && hasMobileCover ? covers.mobileVariants : covers.mainVariants);
  const mobileSrcSet = variantSrcSet(covers.mobileVariants);
  const source = overrideSource || (preferMobile && covers.mobileUrl) || covers.mainUrl || covers.youtubeUrl || covers.fallbackUrl;
  const attemptedFallbacks = useRef(new Set());

  useEffect(() => {
    if (!autoPlay) return;
    const timer = window.setTimeout(() => setPlaying(true), 100);
    return () => window.clearTimeout(timer);
  }, [autoPlay]);

  function useNextFallback(event) {
    const failed = event.currentTarget.getAttribute("src");
    const current = event.currentTarget.currentSrc || event.currentTarget.src;
    attemptedFallbacks.current.add(failed);
    attemptedFallbacks.current.add(current);
    const candidates = [preferMobile && covers.mobileUrl, covers.mainUrl, covers.youtubeUrl, covers.fallbackUrl, "/img1.png"].filter((value, index, values) => value && values.indexOf(value) === index);
    const next = candidates.find((candidate) => !attemptedFallbacks.current.has(candidate) && !attemptedFallbacks.current.has(new URL(candidate, window.location.href).href));
    setLoaded(!next);
    if (next) setOverrideSource(next);
  }

  return <div
    className={`project-media project-media--${context} ${className}`.trim()}
    data-video-orientation={orientation}
    data-ratio={playing && orientation === "portrait" ? "9:16" : "16:9"}
    data-playing={playing ? "true" : "false"}
    style={{ "--media-aspect": playing ? videoAspectRatio : 16 / 9, "--cover-fit": "cover", "--focal-x": `${covers.focalX}%`, "--focal-y": `${covers.focalY}%` }}
  >
    {playing ? <ExternalVideoPlayer video={project} onClose={onClose} /> : <>
      <picture>
        {preferMobile && !overrideSource && (covers.mobileUrl || mobileSrcSet) && <source srcSet={mobileSrcSet || covers.mobileUrl} sizes={contextSizes[context]} />}
        <img
          key={source}
          ref={(image) => { if (image?.complete && image.naturalWidth && !loaded) requestAnimationFrame(() => setLoaded(true)); }}
          src={source}
          srcSet={!overrideSource ? mainSrcSet || undefined : undefined}
          sizes={contextSizes[context]}
          alt={covers.alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={useNextFallback}
          draggable="false"
        />
      </picture>
      {!loaded && <span className="project-media-loading" aria-hidden="true" />}
      {allowPlayback && <button className="project-media-play" type="button" onClick={() => setPlaying(true)}><AdminIcon name="play" /> Play</button>}
    </>}
  </div>;
}
