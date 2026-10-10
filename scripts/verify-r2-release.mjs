import {S3Client,HeadBucketCommand,GetBucketCorsCommand} from "@aws-sdk/client-s3";
const required=["R2_ENDPOINT","R2_BUCKET_NAME","R2_ACCESS_KEY_ID","R2_SECRET_ACCESS_KEY","NEXT_PUBLIC_SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY"];
for(const key of required)if(!process.env[key])throw new Error(`Missing ${key}`);
const client=new S3Client({region:"auto",endpoint:process.env.R2_ENDPOINT,credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY}});
try {await client.send(new HeadBucketCommand({Bucket:process.env.R2_BUCKET_NAME}));const cors=await client.send(new GetBucketCorsCommand({Bucket:process.env.R2_BUCKET_NAME}));if(!cors.CORSRules?.some(r=>r.AllowedOrigins?.includes("https://www.aivideocreator.cv")&&r.AllowedMethods?.includes("PUT")))throw new Error("Missing website CORS");console.log("R2 access and CORS: PASS");}catch(e){console.error("R2 access/CORS failed:",e.name);process.exit(1);}
const response=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/media_assets?select=uploaded_by,original_filename&limit=0`,{headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`}});
console.log(`R2 metadata schema: HTTP ${response.status}`);
if(!response.ok){console.error("Apply supabase/production-r2-video-storage.sql before promoting this release.");process.exit(1);}
