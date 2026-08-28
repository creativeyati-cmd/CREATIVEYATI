"use client";

import { useMemo, useRef, useState } from "react";
import { AdminIcon } from "./Icons";
import YouTubePlayer from "./YouTubePlayer";
import { projectCovers, projectOrientation, variantSrcSet } from "@/lib/project-media";

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
  const covers = useMemo(() => projectCovers(project), [project]);
  const [playing, setPlaying] = useState(autoPlay);
  const [loaded, setLoaded] = useState(false);
  const [overrideSource, setOverrideSource] = useState("");
  const hasMobileCover = Boolean(covers.mobileUrl || Object.keys(covers.mobileVariants).length);
  const mainSrcSet = variantSrcSet(preferMobile && hasMobileCover ? covers.mobileVariants : covers.mainVariants);
  const mobileSrcSet = variantSrcSet(covers.mobileVariants);
  const source = overrideSource || (preferMobile && covers.mobileUrl) || covers.mainUrl || covers.youtubeUrl || covers.fallbackUrl;
  const youtubePortraitFallback = orientation === "portrait" && !covers.mainUrl && !(preferMobile && covers.mobileUrl) && source === covers.youtubeUrl;
  const attemptedFallbacks = useRef(new Set());

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
    data-orientation={orientation}
    data-playing={playing ? "true" : "false"}
    data-youtube-portrait-fallback={youtubePortraitFallback ? "true" : "false"}
    style={{ "--cover-fit": youtubePortraitFallback ? "contain" : covers.fit, "--focal-x": `${covers.focalX}%`, "--focal-y": `${covers.focalY}%` }}
  >
    {playing ? <YouTubePlayer video={project} onClose={onClose} /> : <>
      {youtubePortraitFallback && <span className="project-media-backdrop" style={{ backgroundImage: `url("${covers.youtubeUrl.replaceAll('"', "%22")}")` }} aria-hidden="true" />}
      <picture>
        {!preferMobile && !overrideSource && (covers.mobileUrl || mobileSrcSet) && <source media="(max-width: 720px)" srcSet={mobileSrcSet || covers.mobileUrl} sizes={contextSizes[context]} />}
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
      {allowPlayback && <button className="project-media-play" type="button" onClick={() => setPlaying(true)}><AdminIcon name="play" /> Play film</button>}
    </>}
  </div>;
}
