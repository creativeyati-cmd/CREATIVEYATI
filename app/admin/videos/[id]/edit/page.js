import Link from "next/link";
import { notFound } from "next/navigation";
import VideoForm from "@/Components/VideoForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveVideo } from "../../../actions";
export default async function EditVideo({ params }) { const { id } = await params; const supabase = await createSupabaseServerClient(); const [{ data: video }, { data: categories = [] }] = await Promise.all([supabase.from("videos").select("*").eq("id", id).maybeSingle(), supabase.from("categories").select("id,name").order("display_order")]); if (!video) notFound(); return <><div className="admin-title"><p>VIDEOS</p><h1>Edit video</h1><Link href="/admin/videos">Back to videos</Link></div><VideoForm video={video} categories={categories} action={saveVideo} /></>; }
