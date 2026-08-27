import Link from "next/link";
import VideoForm from "@/Components/VideoForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveVideo } from "../../actions";
export default async function NewVideo() { const supabase = await createSupabaseServerClient(); const { data: categories = [] } = await supabase.from("categories").select("id,name").order("display_order"); return <><div className="admin-title"><p>VIDEOS</p><h1>Add video</h1><Link href="/admin/videos">Back to videos</Link></div><VideoForm categories={categories} action={saveVideo} /></>; }
