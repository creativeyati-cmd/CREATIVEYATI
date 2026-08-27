import Link from "next/link";
import PublicHeader from "@/Components/PublicHeader";
import { getSiteContent } from "@/lib/data/site";
import MobilePortfolio from "@/Components/MobilePortfolio";
import { getPublicPortfolio } from "@/lib/data/public";
export const metadata = { title: "Work | Frame / Motion" };
export default async function WorkPage() { const [{ videos, error }, site] = await Promise.all([getPublicPortfolio(), getSiteContent()]); return <main><PublicHeader site={site} current="/work" /><section className="work-page"><p>SELECTED WORK</p><h1>Films made to hold attention.</h1>{error ? <p className="empty-state">{error}</p> : videos.length ? <MobilePortfolio videos={videos} /> : <p className="empty-state">No published work yet.</p>}</section></main>; }
