import { PageHeader } from "@/Components/DashboardPageShell";
import Link from "next/link";
import VideoForm from "@/Components/VideoForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveVideo } from "@/app/admin/actions";
export default async function NewVideo() { const supabase = await createSupabaseServerClient(); const { data: categories = [] } = await supabase.from("categories").select("id,name").order("display_order"); return <><PageHeader title={<>Add video</>} eyebrow={<>VIDEOS</>} actions={<><Link href="/admin/videos">Back to videos</Link></>}/><VideoForm categories={categories} action={saveVideo} /></>; }
