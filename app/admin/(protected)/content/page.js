import Link from "next/link";
import { PageHeader, Card } from "@/Components/DashboardPageShell";
const groups = [
 ["Pages & media", [["/admin/content/hero", "Homepage & identity", "Hero text and your public identity."], ["/admin/content/about", "About", "Biography and contact copy."], ["/admin/content/services", "Services", "Upload images and videos for each service."]]],
 ["Portfolio & academy", [["/admin/videos", "Projects", "Manage and rearrange portfolio work."], ["/admin/course-settings", "Academy", "Featured courses and homepage presentation."]]],
 ["Contact & discovery", [["/admin/settings/contact", "Contact", "Public contact details and booking."], ["/admin/settings/social", "Social profiles", "Links shown across your website."], ["/admin/settings/seo", "Search & metadata", "Search titles, descriptions and social images."]]],
];
export default function Content() { return <><PageHeader title="Website content" eyebrow="WEBSITE" description="Choose an area to update its content and media."/><div className="dashboard-content-grid">{groups.map(([title,links]) => <Card key={title}><h2>{title}</h2><div className="dashboard-content-links">{links.map(([href,label,description]) => <Link href={href} key={href}><strong>{label}</strong><small>{description}</small></Link>)}</div></Card>)}</div></>; }
