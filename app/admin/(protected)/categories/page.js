import DataTable from "@/Components/DataTable";
import Badge from "@/Components/Badge";
import { Input, Textarea, Button } from "@/Components/FormControls";
import { PageHeader } from "@/Components/DashboardPageShell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveCategory } from "@/app/admin/actions";
export default async function Categories() { const supabase = await createSupabaseServerClient(); const { data: categories = [] } = await supabase.from("categories").select("*").order("display_order"); return <><PageHeader title="Categories" eyebrow={<>CATEGORIES</>} description={<>Group portfolio projects into categories.</>}/><form className="admin-form compact" action={saveCategory}><label>Name<Input required name="name" /></label><label>Slug<Input required name="slug" placeholder="music-video" /></label><label className="form-wide">Description<Textarea name="description" rows="2" /></label><Button className="button">Add category</Button></form><DataTable label="Categories" emptyTitle="No categories yet" emptyDescription="Add a category to organise your projects."><div><b>Category</b><b>Slug</b><b>Status</b></div>{categories.map(item => <div key={item.id}><strong>{item.name}</strong><span>/{item.slug}</span><Badge tone={item.is_visible ? "success" : "neutral"}>{item.is_visible ? "Visible" : "Hidden"}</Badge></div>)}</DataTable></>; }
