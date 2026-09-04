import Link from "next/link";
import PublicHeader from "@/Components/PublicHeader";
import { getSiteContent } from "@/lib/data/site";
export default async function PaymentFailedPage({ searchParams }) { const [site, query] = await Promise.all([getSiteContent(), searchParams]); return <main className="public-page"><PublicHeader site={site} /><section className="payment-result public-note"><p className="eyebrow">PAYMENT NOT COMPLETED</p><h1 className="page-title">Your course access has not changed.</h1><p>{query.reason || "The payment failed or was cancelled. You can safely try again."}</p><Link className="button" href="/courses">Return to courses</Link></section></main>; }
