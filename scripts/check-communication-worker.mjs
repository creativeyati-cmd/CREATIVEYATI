import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const u='11111111-1111-4111-8111-111111111111';
let updates=[],consent=true,status=202,calls=0;
const result=(data)=>({data,error:null});
const db={rpc:async(name)=>result(name==='claim_communication_batch'?[{id:u,campaign_id:u,student_id:u,attempts:1}]:[{student_id:u}]),auth:{admin:{getUserById:async()=>({data:{user:{id:u,email:'student@example.com',email_confirmed_at:'now',user_metadata:{}}}})}},from(table){let update;const q={select(){return q},eq(){return q},update(data){update=data;return q},single:async()=>result({state:'queued',kind:'newsletter',subject:'Hi',body:'Hello {{student_name}}',filters:{}}),maybeSingle:async()=>result({subscribed:consent,unsubscribe_token:u}),then(resolve){updates.push(update);return Promise.resolve(result([])).then(resolve)}};return q;}};
globalThis.__commDb=db;
registerHooks({resolve(s,c,n){if(s==='server-only'||s==='@/lib/supabase/server'||s==='@/lib/data/settings')return {url:'mock:'+s,shortCircuit:true};if(s.startsWith('@/'))return n(pathToFileURL(path.resolve(s.slice(2)+'.js')).href,c);return n(s,c);},load(url,c,n){if(url==='mock:server-only')return {format:'module',source:'',shortCircuit:true};if(url==='mock:@/lib/supabase/server')return {format:'module',source:'export const createSupabaseServiceClient=()=>globalThis.__commDb;',shortCircuit:true};if(url==='mock:@/lib/data/settings')return {format:'module',source:'export const getServiceEmailSettings=async()=>({enabled:true,fromEmail:"sender@example.com"});',shortCircuit:true};return n(url,c);}});
process.env.SENDHIIV_API_KEY='mock';globalThis.fetch=async()=>{calls++;if(status==='network')throw new Error('Network');return new Response('{}',{status});};
const {processCommunications}=await import('../lib/communication-worker.js');
for(const [response,expected] of [[202,'accepted'],[429,'queued'],[401,'failed'],[500,'unknown'],['network','unknown']]){status=response;updates=[];await processCommunications();assert.equal(updates[0].state,expected);}
consent=false;const before=calls;updates=[];await processCommunications();assert.equal(calls,before);assert.equal(updates[0].state,'suppressed');
const {emailHtml,communityValues}=await import('../lib/communications-format.js');assert(!emailHtml('<script>alert(1)</script>').includes('<script>'));assert.throws(()=>communityValues({whatsapp:'https://evil.com'}));assert(!emailHtml('[click](javascript:alert(1))').includes('href="javascript:'));assert(emailHtml('Hi {{student_name}}',{student_name:'<img>'}).includes('&lt;img&gt;'));
console.log('PASS: provider 202/429/401/500/network classification, withdrawn consent prevents sends, escaped content, community URL allowlist');
