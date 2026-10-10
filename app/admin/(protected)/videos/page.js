import DataTable from "@/Components/DataTable";
import Badge, { toneForStatus } from "@/Components/Badge";
import { PageHeader } from "@/Components/DashboardPageShell";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ReorderProjects from "@/Components/ReorderProjects";

export default async function Videos() {
  const supabase = await createSupabaseServerClient();
  const { data: videos = [], error } = await supabase.from("videos").select("id,title,slug,status,orientation,display_order,updated_at,categories(name)").order("display_order");
  if (error) throw new Error("Portfolio projects could not be loaded. Please try again.");
  return <><PageHeader title={<>Projects</>} eyebrow={<>VIDEOS</>} description={<>Manage portfolio projects and published work.</>} actions={<><Link className="button" href="/admin/videos/new">Add project</Link></>}/><ReorderProjects videos={videos} /><DataTable label="Projects" emptyTitle="No projects yet" emptyDescription="Add a project to start your portfolio."><div><b>Project</b><b>Position</b><b>Category</b><b>Format</b><b>Status</b><b>Actions</b></div>{videos.map(video => <div key={video.id}><span>{video.title}</span><span>{video.display_order + 1}</span><span>{video.categories?.name || "Uncategorised"}</span><span>{video.orientation}</span><Badge tone={toneForStatus(video.status)}>{video.status}</Badge><span><Link className="inline-link" href={`/admin/videos/${video.id}/edit`}>Edit project</Link>{video.status === "published" && <Link className="inline-link" href={`/work/${video.slug}`} target="_blank">Preview</Link>}</span></div>)}</DataTable></>;
}
