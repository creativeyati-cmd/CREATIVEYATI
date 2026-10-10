import {S3Client,PutObjectCommand,HeadObjectCommand,GetObjectCommand,DeleteObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {readFile} from "node:fs/promises";
import {randomUUID} from "node:crypto";
const Bucket=process.env.R2_BUCKET_NAME;
const client=new S3Client({region:"auto",endpoint:process.env.R2_ENDPOINT,credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},requestChecksumCalculation:"WHEN_REQUIRED"});
const Key=`diagnostics/${randomUUID()}.mp4`;
const file=await readFile(process.argv[2]);
let created=false;
try {
 const url=await getSignedUrl(client,new PutObjectCommand({Bucket,Key,ContentType:"video/mp4",ContentLength:file.length,IfNoneMatch:"*"}),{expiresIn:300,signableHeaders:new Set(["content-type","if-none-match"])});
 const cors=await fetch(url,{method:"OPTIONS",headers:{Origin:"https://www.aivideocreator.cv","Access-Control-Request-Method":"PUT","Access-Control-Request-Headers":"content-type,if-none-match"}});
 if(!cors.ok || cors.headers.get("access-control-allow-origin")!=="https://www.aivideocreator.cv") throw new Error("CORS failed");
 const upload=await fetch(url,{method:"PUT",headers:{"Content-Type":"video/mp4","If-None-Match":"*"},body:file});
 if(!upload.ok) throw new Error(`PUT ${upload.status}`);created=true;
 const head=await client.send(new HeadObjectCommand({Bucket,Key}));if(head.ContentLength!==file.length) throw new Error("size mismatch");
 const denied=await fetch(url,{method:"PUT",headers:{"Content-Type":"video/mp4","If-None-Match":"*"},body:file});if(denied.status!==412) throw new Error("overwrite protection failed");
 const play=await getSignedUrl(client,new GetObjectCommand({Bucket,Key}),{expiresIn:300});
 const range=await fetch(play,{headers:{Range:"bytes=0-31"}});if(range.status!==206||(await range.arrayBuffer()).byteLength!==32) throw new Error("Range failed");
 const download=await getSignedUrl(client,new GetObjectCommand({Bucket,Key,ResponseContentDisposition:'attachment; filename="test-video.mp4"'}),{expiresIn:300});
 const result=await fetch(download);if(!result.ok||!result.headers.get("content-disposition")?.includes('test-video.mp4'))throw new Error("download failed");await result.body.cancel();
 console.log("PASS: real R2 MP4 upload, size verification, CORS, overwrite prevention, HTTP Range playback, signed download");
} finally {if(created){await client.send(new DeleteObjectCommand({Bucket,Key}));console.log("Diagnostic object removed");}}
