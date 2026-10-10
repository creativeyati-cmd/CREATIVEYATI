import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync('proxy.js','utf8').replace(/^import .*;\r?$/gm,'').replace('export async function proxy','async function proxy').replace('export const config','const config');
const run=new Function('NextResponse','createServerClient',source+';return proxy;')({next:()=>({next:true}),redirect:url=>({redirect:url.href})},()=>{throw Error('Unexpected auth call')});
for(const [path,method,forward] of [
 ['/?code=valid','GET',true],
 ['/reset-password/update?code=valid','GET',true],
 ['/?token_hash=valid&type=recovery','GET',true],
 ['/auth/callback?code=valid','GET',false],
 ['/reset-password/confirm?token_hash=valid&type=recovery','GET',false],
 ['/api/payments?code=valid','GET',false],
 ['/courses?code=discount','GET',false],
 ['/?code=','GET',false],
 ['/?code=valid','POST',false],
 ['/?token_hash=valid&type=signup','GET',false],
]){
 const result=await run({url:'https://www.aivideocreator.cv'+path,method,cookies:{getAll:()=>[]}});
 assert.equal(!!result.redirect,forward,path);
 if(forward)assert.equal(new URL(result.redirect).pathname,'/auth/callback');
}
console.log('Passed 10 recovery forwarding cases');
