"use client";

import { useRef, useState } from "react";

export default function CourseVideoPlayer({ lesson, admin = false }) {
  const [state, setState] = useState("loading");
  const lastSaved = useRef(0);
  const orientation = lesson.orientation === "portrait" ? "portrait" : "landscape";
  const ratio = Number(lesson.aspectRatio) || (orientation === "portrait" ? 9 / 16 : 16 / 9);
  const uploaded = lesson.sourceType === "upload" || lesson.videoProvider === "upload";
  const src = uploaded ? `/api/learn/media/video/${lesson.id}${admin ? "?admin=1" : ""}` : lesson.embedUrl || "";
  const poster = lesson.posterStorageKey ? `/api/learn/media/poster/${lesson.id}${admin ? "?admin=1" : ""}` : lesson.posterUrl || "";
  if (!src) return <div className="course-video-state is-error" role="alert">Video source unavailable.</div>;

  return <div className={`course-video-player is-${orientation}`} style={{ "--course-video-ratio": ratio }}>
    {state === "loading" && <div className="course-video-state">Loading video…</div>}
    {state === "error" && <div className="course-video-state is-error" role="alert">This video could not be played. Check its source and access settings.</div>}
    {uploaded ? <video src={src} poster={poster || undefined} controls controlsList={lesson.allowDownload ? undefined : "nodownload"} preload="metadata" playsInline onLoadedMetadata={(event) => { setState("ready"); if (!admin && lesson.lastPosition > 0 && lesson.lastPosition < event.currentTarget.duration - 5) event.currentTarget.currentTime = lesson.lastPosition; }} onTimeUpdate={(event) => { if (admin || !lesson.courseId || event.currentTarget.currentTime - lastSaved.current < 10) return; lastSaved.current = event.currentTarget.currentTime; fetch("/api/learn/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId: lesson.courseId, lessonId: lesson.id, position: Math.floor(event.currentTarget.currentTime) }) }).catch(() => {}); }} onError={() => setState("error")}>
      {lesson.captionsUrl && <track kind="captions" src={lesson.captionsUrl} srcLang="en" label="Captions" default />}
    </video> : <iframe src={src} title={lesson.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" onLoad={() => setState("ready")} />}
  </div>;
}
