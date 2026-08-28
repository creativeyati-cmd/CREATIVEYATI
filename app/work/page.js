import Link from "next/link";
import PublicHeader from "@/Components/PublicHeader";
import PublicTextReveal from "@/Components/PublicTextReveal";
import { getSiteContent } from "@/lib/data/site";
import MobilePortfolio from "@/Components/MobilePortfolio";
import { getPublicPortfolio } from "@/lib/data/public";
export const metadata = { title: "Work" };
export default async function WorkPage() { const [{ videos, error }, site] = await Promise.all([getPublicPortfolio(), getSiteContent()]); return <main className="public-page"><PublicHeader site={site} current="/work" /><section className="work-page public-note"><PublicTextReveal><p className="eyebrow" data-reveal>SELECTED WORK</p><h1 className="page-title" data-reveal>Films made to hold attention.</h1></PublicTextReveal>{error ? <p className="empty-state">{error}</p> : videos.length ? <MobilePortfolio videos={videos} revealText /> : <p className="empty-state">No published work yet.</p>}</section></main>; }
