"use client";

import { useRef, useState } from "react";
import { notify } from "@/Components/ToastHost";
import { streamVideoId } from "@/lib/stream-reference";
import LessonWatermark from "@/Components/LessonWatermark";

export default function CourseVideoPlayer({ lesson, admin = false, watermark = "" }) {
  const [state, setState] = useState("loading");
  const lastSaved = useRef(0);
  const [attempt,setAttempt]=useState(0);
  const orientation = lesson.orientation === "portrait" ? "portrait" : "landscape";
  const ratio = Number(lesson.aspectRatio) || (orientation === "portrait" ? 9 / 16 : 16 / 9);
  const uploaded = lesson.sourceType === "upload" || lesson.videoProvider === "upload";
  const src = uploaded && admin && lesson.storageKey ? `/api/admin/course-draft-media?courseId=${lesson.courseId}&kind=video&key=${encodeURIComponent(lesson.storageKey)}` : uploaded ? `/api/learn/media/video/${lesson.id}${admin ? "?admin=1" : ""}` : lesson.embedUrl || "";
  const poster = admin && lesson.posterStorageKey ? `/api/admin/course-draft-media?courseId=${lesson.courseId}&kind=poster&key=${encodeURIComponent(lesson.posterStorageKey)}` : lesson.posterStorageKey ? `/api/learn/media/poster/${lesson.id}${admin ? "?admin=1" : ""}` : lesson.posterUrl || "";
  const Video = "video";
  async function downloadVideo() {
    try {
      notify("Preparing video download...");
      const route=admin ? `${src}&download=1` : `/api/learn/media/video/${lesson.id}?download=1`;
      const response=await fetch(`${route}&link=1`);
      const data=await response.json();
      if(!response.ok || !data.url) throw new Error(data.error || "Download unavailable.");
      const a=document.createElement("a");a.href=data.url;a.click();
      notify("Video download requested.");
    } catch(error) {notify(error.message,"error");}
  }
  if(streamVideoId(lesson.storageKey)) return <div role="alert" className="course-video-state is-error">This video is awaiting migration to R2. Contact the course administrator.</div>;
  if (!src) return <div className="course-video-state is-error" role="alert">Video source unavailable.</div>;

  return <div className={`course-video-player is-${orientation}`} style={{ "--course-video-ratio": ratio }}>
    {state === "loading" && <div className="course-video-state">Loading video…</div>}
    {state === "error" && <div className="course-video-state is-error" role="alert">This video could not be played. Check its source and access settings. <button type="button" onClick={()=>{setState("loading");setAttempt(n=>n+1);}}>Retry playback</button></div>}
    {uploaded ? <Video key={attempt} src={`${src}${src.includes("?") ? "&" : "?"}attempt=${attempt}`} poster={poster || undefined} controls controlsList={lesson.allowDownload ? undefined : "nodownload"} disablePictureInPicture preload="metadata" playsInline onLoadedMetadata={(event) => { setState("ready"); if (!admin && lesson.lastPosition > 0 && lesson.lastPosition < event.currentTarget.duration - 5) event.currentTarget.currentTime = lesson.lastPosition; }} onTimeUpdate={(event) => { if (admin || !lesson.courseId || event.currentTarget.currentTime - lastSaved.current < 10) return; lastSaved.current = event.currentTarget.currentTime; fetch("/api/learn/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId: lesson.courseId, lessonId: lesson.id, position: Math.floor(event.currentTarget.currentTime) }) }).catch(() => {}); }} onError={() => setState("error")}>
      {lesson.captionsUrl && <track kind="captions" src={lesson.captionsUrl} srcLang="en" label="Captions" default />}
    </Video> : <iframe src={src} title={lesson.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" onLoad={() => setState("ready")} />}
    {uploaded && (admin || lesson.allowDownload) && <button type="button" className="button" onClick={downloadVideo}>Download video</button>}
    {watermark && <LessonWatermark label={watermark} />}
  </div>;
}
