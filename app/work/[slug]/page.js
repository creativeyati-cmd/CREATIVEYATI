import Link from "next/link";
import { notFound } from "next/navigation";
import PublicHeader from "@/Components/PublicHeader";
import YouTubePlayer from "@/Components/YouTubePlayer";
import { getPublicVideo } from "@/lib/data/public";
import { getSiteContent } from "@/lib/data/site";
export async function generateMetadata({ params }) { const { slug } = await params; const video = await getPublicVideo(slug); return video ? { title: `${video.title} | Frame / Motion`, description: video.shortDescription } : {}; }
export default async function ProjectPage({ params }) { const { slug } = await params; const [video, site] = await Promise.all([getPublicVideo(slug), getSiteContent()]); if (!video) notFound(); return <main><PublicHeader site={site} current="/work" /><article className="project-page"><Link className="inline-link" href="/work">Back to work</Link><p className="eyebrow">{video.category?.name || video.clientName || "Selected work"}</p><h1 className="page-title">{video.title}</h1><p className="project-meta">{video.year || ""} · {video.orientation === "portrait" ? "9:16" : "16:9"}</p><YouTubePlayer video={video} onClose={() => {}} /><p className="project-description">{video.description || video.shortDescription}</p></article></main>; }
