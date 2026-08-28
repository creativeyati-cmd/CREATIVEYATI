import Link from "next/link";
import { notFound } from "next/navigation";
import PublicHeader from "@/Components/PublicHeader";
import PublicTextReveal from "@/Components/PublicTextReveal";
import ProjectMedia from "@/Components/ProjectMedia";
import { getPublicVideo } from "@/lib/data/public";
import { getSiteContent } from "@/lib/data/site";
export async function generateMetadata({ params }) { const { slug } = await params; const video = await getPublicVideo(slug); return video ? { title: `${video.title} | Frame / Motion`, description: video.shortDescription } : {}; }

function creditLabel(credit) {
  if (typeof credit === "string") return credit;
  if (!credit || typeof credit !== "object") return "";
  return [credit.role || credit.title, credit.name || credit.value].filter(Boolean).join(" — ");
}

export default async function ProjectPage({ params }) {
  const { slug } = await params;
  const [video, site] = await Promise.all([getPublicVideo(slug), getSiteContent()]);
  if (!video) notFound();
  const facts = [
    ["Client", video.clientName],
    ["Category", video.category?.name],
    ["Creative role", video.creativeRole],
    ["Director", video.director],
    ["Production", video.productionCompany],
    ["Year", video.year],
    ["Location", video.location],
    ["Format", video.orientation === "portrait" ? "9:16 portrait" : "16:9 landscape"],
  ].filter(([, value]) => value !== "" && value !== null && value !== undefined);
  const credits = video.credits.map(creditLabel).filter(Boolean);
  return <main className="public-page"><PublicHeader site={site} current="/work" /><PublicTextReveal as="article" className="project-page public-note"><Link className="inline-link" href="/work">Back to work</Link><h1 className="page-title" data-reveal>{video.title}</h1>{video.shortDescription && <p className="public-lede" data-reveal>{video.shortDescription}</p>}<ProjectMedia project={video} context="project-page" priority allowPlayback />{video.description && <section className="project-information"><h2 data-reveal>About the project</h2><p className="project-description" data-reveal>{video.description}</p></section>}<dl className="project-facts">{facts.map(([label, value]) => <div key={label} data-reveal><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{video.tags.length > 0 && <section className="project-information"><h2 data-reveal>Tags</h2><p className="project-tags" data-reveal>{video.tags.join(" · ")}</p></section>}{credits.length > 0 && <section className="project-information"><h2 data-reveal>Credits</h2><ul className="project-credits">{credits.map((credit, index) => <li key={`${credit}-${index}`} data-reveal>{credit}</li>)}</ul></section>}<div className="project-actions">{video.youtubeUrl && <a className="button" href={video.youtubeUrl} target="_blank" rel="noreferrer">Watch on YouTube</a>}{video.externalProjectUrl && <a className="inline-link" href={video.externalProjectUrl} target="_blank" rel="noreferrer">Visit project link</a>}</div></PublicTextReveal></main>;
}
