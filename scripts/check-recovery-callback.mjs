import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync('app/auth/callback/route.js','utf8').replace(/^import .*;\r?$/gm,'').replace('export async function GET','async function GET');
const scenarios=[
 ['?code=valid',{user:{id:'u'},redirectType:'recovery'},false,'/reset-password/update',1],
 ['?code=valid&next=%2Freset-password%2Fupdate%3Fnext%3D%2Fadmin',{user:{id:'u'},redirectType:'recovery'},false,'/reset-password/update',1],
 ['?token_hash=valid&type=recovery',{user:{id:'u'}},false,'/reset-password/confirm',0],
 ['?token_hash=valid&amp;type=recovery',{user:{id:'u'}},false,'/reset-password/confirm',0],
 ['?token_hash=valid&amp;amp;type=recovery',{user:{id:'u'}},false,'/reset-password/confirm',0],
 ['?token_hash=expired&amp;type=recovery',{},true,'/reset-password/confirm',0],
 ['?type=recovery',{},true,'/reset-password',0],
 ['?token_hash=valid&type=signup&amp;type=recovery',{},true,'/login',0],
 ['?token_hash=expired&type=recovery',{},true,'/reset-password/confirm',0],
 ['?code=signup&next=/reset-password/update',{user:{id:'u'},redirectType:null},false,'/reset-password',0],
 ['?code=signup',{user:{id:'u'},redirectType:null},false,'/learn',0],
];
for (const [query,data,error,expected,grants] of scenarios){
 let count=0,verifications=0;
 const client={auth:{exchangeCodeForSession:async()=>({data,error}),verifyOtp:async()=>{verifications++;return {data,error}}}};
 const get=new Function('NextResponse','createSupabaseAuthClient','safeNext','grantPasswordRecovery','ensureStudentProfile',source+';return GET;')({redirect:url=>url},async()=>client,x=>x.startsWith('/')&&!x.startsWith('//')?x:'/learn',async()=>{count++},async()=>{});
 const result=await get({url:'https://www.aivideocreator.cv/auth/callback'+query});
 assert.equal(result.pathname,expected);assert.equal(count,grants);assert.equal(verifications,0,'GET must never consume recovery tokens');
}
console.log(`Passed ${scenarios.length} recovery callback cases`);
