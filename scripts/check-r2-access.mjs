import assert from 'node:assert/strict';import {registerHooks} from 'node:module';import {pathToFileURL} from 'node:url';import path from 'node:path';
registerHooks({resolve(s,c,next){
 const mocks={
 '@/lib/supabase/server':'export const getAdminUser=async()=>globalThis.admin;export const getStudentUser=async()=>globalThis.user;export const createSupabaseServiceClient=()=>globalThis.db;',
 '@/lib/r2':'export const r2Playback=async()=>{globalThis.links++;return "https://r2.test/signed";};',
 'next/server':'export const NextResponse=Response;'
 };if(mocks[s])return {url:'data:text/javascript,'+encodeURIComponent(mocks[s]),shortCircuit:true};
 if(s.startsWith('@/'))return next(pathToFileURL(path.resolve(s.slice(2)+'.js')).href,c);return next(s,c);
}});
const {GET}=await import('../app/api/learn/media/[kind]/[lessonId]/route.js');
const cid='11111111-1111-4111-8111-111111111111',lid='22222222-2222-4222-8222-222222222222';
let enrolled=false,published=true,allowed=false;globalThis.links=0;globalThis.user=null;globalThis.admin=null;
globalThis.db={from(t){const q={select(){return q},eq(){return q},async maybeSingle(){return {data:t==='course_lessons'?{id:lid,course_id:cid,status:'published',is_preview:false,allow_download:allowed,storage_key:`${cid}/r2/${lid}/${lid}.mp4`}:t==='courses'?{status:published?'published':'draft'}:enrolled?{id:'enrolment'}:null}}};return q}};
const get=(query='')=>GET(new Request('https://site.test/api/learn/media/video/'+lid+query),{params:Promise.resolve({kind:'video',lessonId:lid})});
assert.equal((await get()).status,401);globalThis.user={id:'student'};assert.equal((await get()).status,403);enrolled=true;
assert.equal((await get()).status,302);assert.equal((await get('?download=1&link=1')).status,403);allowed=true;
assert.equal((await (await get('?download=1&link=1')).json()).url,'https://r2.test/signed');published=false;assert.equal((await get()).status,404);
assert.equal(globalThis.links,2);console.log('PASS: R2 student links require enrollment, published course, and explicit download permission');
