import { PageHeader } from "@/Components/DashboardPageShell";
import Link from "next/link";
import ServiceMediaEditor from "@/Components/ServiceMediaEditor";
import { getServiceMedia } from "@/lib/data/service-media";
export default async function ServicesContent() {
  const media = await getServiceMedia({ strict: true });
  return <><PageHeader title={<>Services media</>} eyebrow={<>WEBSITE CONTENT</>} description={<>Upload a separate image or video for the hero and each service. Images: JPG, PNG, WebP or AVIF, up to 8MB. Videos: MP4 or WebM, up to 100MB. Media published here is public. Include captions in videos with speech.</>} actions={<><Link href="/services" target="_blank" rel="noreferrer">View Services page ↗</Link></>}/><ServiceMediaEditor media={media} /></>;
}
