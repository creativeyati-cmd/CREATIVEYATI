import { r2Playback } from "@/lib/r2";
import { isR2Video } from "@/lib/r2-reference";
import { streamVideoId } from "@/lib/stream-reference";
import {
  createSupabaseServiceClient,
  getAdminUser,
} from "@/lib/supabase/server";
import { UUID } from "@/lib/course-workspace";
export async function GET(request) {
  if (!(await getAdminUser()))
    return Response.json(
      { error: "Administrator access required." },
      { status: 401 },
    );
  const url = new URL(request.url);
  const id = url.searchParams.get("courseId");
  const key = url.searchParams.get("key") || "";
  const kind = url.searchParams.get("kind");
  if (
    !UUID.test(id || "") ||
    !["video", "poster"].includes(kind) ||
    !key.startsWith(`${id}/`) ||
    key.includes("..")
  )
    return Response.json(
      { error: "Invalid media reference." },
      { status: 400 },
    );
  if (kind === "video" && streamVideoId(key)) return Response.json({error:"This legacy Stream video needs migration. Upload its original MP4 in the course editor."},{status:409});
  if (kind === "video" && isR2Video(key)) {
    try {
      const link=await r2Playback(createSupabaseServiceClient(), key, id, url.searchParams.get("download")==="1");
      if(url.searchParams.get("link")==="1") return Response.json({url:link},{headers:{"Cache-Control":"private, no-store"}});
      return new Response(null,{status:302,headers:{Location:link,"Cache-Control":"private, no-store"}});
    } catch {return Response.json({error:"R2 playback is unavailable. Check the saved video and storage configuration."},{status:502});}
  }

  const { data, error } = await createSupabaseServiceClient()
    .storage.from(kind === "video" ? "course-videos" : "course-posters")
    .createSignedUrl(key, 120, url.searchParams.get("download")==="1" ? {download:true} : undefined);
  if(!error && url.searchParams.get("link")==="1") return Response.json({url:data.signedUrl},{headers:{"Cache-Control":"private, no-store"}});
  return error
    ? Response.json({ error: "Media unavailable." }, { status: 404 })
    : Response.redirect(data.signedUrl);
}
