import "server-only";
import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
export function r2Config() {
  const value = name => (process.env[name] || process.env[`CLOUDFLARE_${name}`] || "").trim();
  const account = value("R2_ACCOUNT_ID");
  const endpoint = value("R2_ENDPOINT") || (account ? `https://${account}.r2.cloudflarestorage.com` : "");
  const bucket = value("R2_BUCKET_NAME");
  const accessKeyId = value("R2_ACCESS_KEY_ID"), secretAccessKey = value("R2_SECRET_ACCESS_KEY");
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) throw new Error("R2 configuration missing. Set R2_ENDPOINT, R2_BUCKET_NAME, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in Vercel.");
  const parsed = new URL(endpoint);
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".r2.cloudflarestorage.com") || parsed.username || parsed.password) throw new Error("Invalid R2 endpoint.");
  return {bucket, client:new S3Client({region:"auto",endpoint:parsed.origin,credentials:{accessKeyId,secretAccessKey},requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED"})};
}
export async function r2Upload(key, size) {
 const {client,bucket}=r2Config();
 return getSignedUrl(client,new PutObjectCommand({Bucket:bucket,Key:key,ContentType:"video/mp4",ContentLength:size,IfNoneMatch:"*"}),{expiresIn:900,signableHeaders:new Set(["content-type","if-none-match"])});
}
export async function r2VerifyMp4(key) {
 const {client,bucket}=r2Config();
 const object=await client.send(new GetObjectCommand({Bucket:bucket,Key:key,Range:"bytes=0-63"}));
 const bytes=await object.Body.transformToByteArray();
 if(Buffer.from(bytes).subarray(4,8).toString()!=="ftyp" || Buffer.from(bytes).subarray(8,12).toString()==="qt  ") throw new Error("The video is not an MP4 container. Export H.264/AAC MP4 instead of renaming a MOV file.");
}
export async function r2Head(key) {const {client,bucket}=r2Config();return client.send(new HeadObjectCommand({Bucket:bucket,Key:key}));}
export async function r2Link(key, filename, download=false) {
 const {client,bucket}=r2Config();
 const safe=(filename || "lesson-video.mp4").replace(/[^a-zA-Z0-9._ -]/g,"_").slice(0,120);
 return getSignedUrl(client,new GetObjectCommand({Bucket:bucket,Key:key,ResponseContentDisposition:`${download ? "attachment" : "inline"}; filename="${safe}"`,ResponseContentType:"video/mp4"}),{expiresIn:3600});
}
export async function r2Copy(source,destination) {const {client,bucket}=r2Config();await client.send(new CopyObjectCommand({Bucket:bucket,Key:destination,CopySource:`${bucket}/${source.split("/").map(encodeURIComponent).join("/")}`}));}
export async function r2Playback(db,key,courseId,download=false) {
 const {data:asset}=await db.from("media_assets").select("id,original_filename").eq("course_id",courseId).eq("storage_key",key).eq("bucket","cloudflare-r2").eq("processing_status","ready").maybeSingle();
 if(!asset) throw new Error("R2 video unavailable or not verified.");
 return r2Link(key,asset.original_filename,download);
}
