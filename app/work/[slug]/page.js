import Link from "next/link";
import { notFound } from "next/navigation";
import PublicHeader from "@/Components/PublicHeader";
import PublicTextReveal from "@/Components/PublicTextReveal";
import ProjectMedia from "@/Components/ProjectMedia";
import { getPublicVideo } from "@/lib/data/public";
import { getSiteContent } from "@/lib/data/site";
export async function generateMetadata({ params }) { const { slug } = await params; const video = await getPublicVideo(slug); return video ? { title: `${video.title} | Frame / Motion`, description: video.shortDescription } : {}; }
export default async function ProjectPage({ params }) { const { slug } = await params; const [video, site] = await Promise.all([getPublicVideo(slug), getSiteContent()]); if (!video) notFound(); return <main className="public-page"><PublicHeader site={site} current="/work" /><PublicTextReveal as="article" className="project-page public-note"><Link className="inline-link" href="/work">Back to work</Link><p className="eyebrow" data-reveal>{video.category?.name || video.clientName || "Selected work"}</p><h1 className="page-title" data-reveal>{video.title}</h1><p className="project-meta" data-reveal>{video.year || ""} · {video.orientation === "portrait" ? "9:16" : "16:9"}</p><ProjectMedia project={video} context="project-page" priority allowPlayback /><p className="project-description" data-reveal>{video.description || video.shortDescription}</p></PublicTextReveal></main>; }
