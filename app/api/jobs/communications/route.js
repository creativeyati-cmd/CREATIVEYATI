import {timingSafeEqual} from 'node:crypto';
import {processCommunications} from '@/lib/communication-worker';
export const maxDuration=300;
export async function GET(request){
 const secret=process.env.COMMUNICATIONS_JOB_SECRET||'';const supplied=request.headers.get('authorization')||'';const expected=`Bearer ${secret}`;
 if(secret.length<32||supplied.length!==expected.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return Response.json({error:'Unauthorized'},{status:401});
 try{return Response.json(await processCommunications(),{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Delivery worker failed. Check email settings, schema and server logs.'},{status:503});}
}
export const POST=GET;
