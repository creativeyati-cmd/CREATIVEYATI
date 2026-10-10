import "server-only";
import {randomUUID} from "node:crypto";
import {r2Upload,r2Head,r2VerifyMp4} from "./r2";
import {isR2Video} from "./r2-reference";
export async function courseR2Upload(db,actor,body) {
 const {courseId,lessonId}=body;
 const {data:course}=await db.from("courses").select("id").eq("id",courseId).is("deleted_at",null).maybeSingle();
 if(!course) throw new Error("Save the course draft before uploading.");
 if(body.action==="sign") {
  if(body.mimeType!=="video/mp4" || !/\.mp4$/i.test(body.fileName||"")) throw new Error("Use MP4 exported with H.264 video and AAC audio. R2 does not convert MOV files.");
  if(!Number.isInteger(body.fileSize)||body.fileSize<=0||body.fileSize>2*1024**3) throw new Error("Choose a video no larger than 2 GB.");
  const key=`${courseId}/r2/${lessonId}/${randomUUID()}.mp4`;
  const signedUrl=await r2Upload(key,body.fileSize);
  const {error}=await db.from("media_assets").insert({course_id:courseId,lesson_id:null,asset_type:"video",bucket:"cloudflare-r2",storage_key:key,mime_type:"video/mp4",file_size:body.fileSize,uploaded_by:actor.id,original_filename:String(body.fileName).replace(/[^a-zA-Z0-9._ -]/g,"_").slice(0,120),processing_status:"uploading"});
  if(error) throw new Error("Upload record could not be saved. Apply production-r2-video-storage.sql and retry.");
  return {provider:"r2",signedUrl,storageKey:key,headers:{"Content-Type":"video/mp4","If-None-Match":"*"}};
 }
 const key=body.storageKey;
 if(body.action!=="finalize" || !isR2Video(key) || !key.startsWith(`${courseId}/r2/${lessonId}/`)) throw new Error("Invalid R2 upload reference.");
 const {data:asset}=await db.from("media_assets").select("id,file_size,uploaded_by").eq("storage_key",key).eq("course_id",courseId).eq("bucket","cloudflare-r2").maybeSingle();
 if(!asset || asset.uploaded_by!==actor.id) throw new Error("This upload belongs to another account or course.");
 const stored=await r2Head(key);
 if(Number(stored.ContentLength)!==Number(asset.file_size)||stored.ContentType!=="video/mp4") throw new Error("R2 file size or type does not match the upload record. Choose the file again.");
 await r2VerifyMp4(key);
 const width=Math.round(Number(body.width)),height=Math.round(Number(body.height)),duration=Math.ceil(Number(body.durationSeconds));
 if(![width,height,duration].every(n=>Number.isFinite(n)&&n>0)) throw new Error("Invalid video dimensions or duration.");
 const values={width,height,duration_seconds:duration,orientation:width>=height?"landscape":"portrait",aspect_ratio:width/height,processing_status:"ready",updated_at:new Date().toISOString()};
 const {error}=await db.from("media_assets").update(values).eq("id",asset.id);
 if(error) throw new Error("Video uploaded but metadata could not be saved. Retry verification.");
 return {storageKey:key,width,height,durationSeconds:duration,orientation:values.orientation,aspectRatio:values.aspect_ratio,processingStatus:"ready",previewUrl:`/api/admin/course-draft-media?courseId=${courseId}&kind=video&key=${encodeURIComponent(key)}`};
}
