"use client";

import Link from "next/link";
import PublicTextReveal from "./PublicTextReveal";

export default function MobilePortfolio({ videos, revealText = false }) {
  return <div className="mobile-work">
    <div className="project-grid">
      {videos.map((video) => <Link key={video.id} href={`/work/${video.slug}`} className={`project-card ${video.orientation === "portrait" ? "portrait" : ""}`}>
        <img src={video.posterUrl} alt={`${video.title} poster`} />
        {revealText ? <PublicTextReveal className="project-card-copy"><span data-reveal>{video.clientName || "Selected work"}</span><strong data-reveal>{video.title}</strong></PublicTextReveal> : <><span>{video.clientName || "Selected work"}</span><strong>{video.title}</strong></>}
      </Link>)}
    </div>
  </div>;
}
