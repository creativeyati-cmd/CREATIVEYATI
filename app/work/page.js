import Link from "next/link";
import ThemeToggle from "@/Components/ThemeToggle";
import MobilePortfolio from "@/Components/MobilePortfolio";
import { getPublicPortfolio } from "@/lib/data/public";
export const metadata = { title: "Work | Frame / Motion" };
export default async function WorkPage() { const { videos, error } = await getPublicPortfolio(); return <main><header className="site-header"><Link href="/" className="wordmark">FRAME / MOTION</Link><nav><Link href="/about">About</Link><Link href="/contact">Contact</Link><ThemeToggle /></nav></header><section className="work-page"><p>SELECTED WORK</p><h1>Films made to hold attention.</h1>{error ? <p className="empty-state">{error}</p> : videos.length ? <MobilePortfolio videos={videos} /> : <p className="empty-state">No published work yet.</p>}</section></main>; }
