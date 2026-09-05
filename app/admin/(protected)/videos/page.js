import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ReorderProjects from "@/Components/ReorderProjects";

export default async function Videos() {
  const supabase = await createSupabaseServerClient();
  const { data: videos = [] } = await supabase.from("videos").select("id,title,slug,status,orientation,display_order,updated_at").order("display_order");
  return <><div className="admin-title"><p>VIDEOS</p><h1>Projects</h1><Link className="button" href="/admin/videos/new">Add video</Link></div><ReorderProjects videos={videos} />{videos.length ? <div className="admin-list">{videos.map((video) => <Link key={video.id} href={`/admin/videos/${video.id}/edit`}><span>{video.title}</span><small>#{video.display_order + 1} · {video.orientation} · {video.status}</small></Link>)}</div> : <p className="empty-state">No videos yet. Add a YouTube or Google Drive project to start your portfolio.</p>}</>;
}
