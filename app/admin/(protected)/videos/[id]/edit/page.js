import { PageHeader } from "@/Components/DashboardPageShell";
import Link from "next/link";
import { notFound } from "next/navigation";
import VideoForm from "@/Components/VideoForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveVideo } from "@/app/admin/actions";
export default async function EditVideo({ params }) { const { id } = await params; const supabase = await createSupabaseServerClient(); const [{ data: video }, { data: categories = [] }] = await Promise.all([supabase.from("videos").select("*").eq("id", id).maybeSingle(), supabase.from("categories").select("id,name").order("display_order")]); if (!video) notFound(); return <><PageHeader title={<>Edit video</>} eyebrow={<>VIDEOS</>} actions={<><Link href="/admin/videos">Back to videos</Link></>}/><VideoForm video={video} categories={categories} action={saveVideo} /></>; }
