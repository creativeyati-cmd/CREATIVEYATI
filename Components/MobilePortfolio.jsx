"use client";

import { useState } from "react";
import YouTubePlayer from "./YouTubePlayer";

export default function MobilePortfolio({ videos }) {
  const [selected, setSelected] = useState(null);
  return <div className="mobile-work">
    <div className="project-grid">
      {videos.map((video) => <button key={video.id} type="button" className={`project-card ${video.orientation === "portrait" ? "portrait" : ""}`} onClick={() => setSelected(video)}>
        <img src={video.posterUrl} alt={`${video.title} poster`} />
        <span>{video.clientName || "Selected work"}</span><strong>{video.title}</strong>
      </button>)}
    </div>
    {selected && <div className="mobile-player" role="dialog" aria-modal="true" aria-label={selected.title}><YouTubePlayer video={selected} onClose={() => setSelected(null)} /></div>}
  </div>;
}
