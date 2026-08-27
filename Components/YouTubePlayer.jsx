"use client";

import { useEffect, useRef, useState } from "react";
import { embedUrl } from "@/lib/youtube";

export default function YouTubePlayer({ video, onClose }) {
  const frame = useRef(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => () => { if (frame.current) frame.current.src = "about:blank"; }, []);
  if (!video?.youtubeVideoId) return <div className="player-empty">A YouTube video has not been attached to this demo project.</div>;
  return <section className={`player ${video.orientation === "portrait" ? "player-portrait" : ""}`} aria-label={`${video.title} video`}>
    <iframe ref={frame} src={embedUrl(video.youtubeVideoId)} title={video.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen onError={() => setFailed(true)} />
    {failed && <p className="player-error">This video is unavailable or cannot be embedded.</p>}
    <button className="player-close" type="button" onClick={onClose}>Close project</button>
  </section>;
}
