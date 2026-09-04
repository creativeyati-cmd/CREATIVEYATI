import { getYouTubeId, embedUrl } from "@/lib/youtube";

function videoSource(lesson) {
  if (lesson.videoProvider === "youtube") { const id = lesson.videoAssetId || getYouTubeId(lesson.videoUrl); return id ? { kind: "iframe", src: embedUrl(id) } : null; }
  if (lesson.videoProvider === "vimeo" && lesson.videoAssetId) return { kind: "iframe", src: `https://player.vimeo.com/video/${encodeURIComponent(lesson.videoAssetId)}` };
  if (lesson.videoProvider === "mux" && lesson.videoAssetId) return { kind: "video", src: `https://stream.mux.com/${encodeURIComponent(lesson.videoAssetId)}.m3u8` };
  if (lesson.videoUrl) return { kind: "video", src: lesson.videoUrl };
  return null;
}

export default function CourseLessonContent({ lesson }) {
  const source = videoSource(lesson);
  return <div className="lesson-content">
    {source?.kind === "iframe" && <div className="lesson-player"><iframe src={source.src} title={lesson.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen /></div>}
    {source?.kind === "video" && <div className="lesson-player"><video src={source.src} controls controlsList="nodownload" preload="metadata" /></div>}
    {lesson.body && <div className="lesson-body">{lesson.body.split(/\n\n+/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>}
    {lesson.externalUrl && <p><a className="inline-link" href={lesson.externalUrl} target="_blank" rel="noreferrer">Open lesson resource</a></p>}
  </div>;
}
