"use client";

import Link from "next/link";

export default function MobilePortfolio({ videos }) {
  return <div className="mobile-work">
    <div className="project-grid">
      {videos.map((video) => <Link key={video.id} href={`/work/${video.slug}`} className={`project-card ${video.orientation === "portrait" ? "portrait" : ""}`}>
        <img src={video.posterUrl} alt={`${video.title} poster`} />
        <span>{video.clientName || "Selected work"}</span><strong>{video.title}</strong>
      </Link>)}
    </div>
  </div>;
}
