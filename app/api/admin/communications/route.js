import {randomUUID} from 'node:crypto';
import {communicationContext,filtersFor,audience,audit} from '@/lib/communications';
import {emailHtml,communityValues} from '@/lib/communications-format';
import {UUID} from '@/lib/course-workspace';
export async function POST(request){
 try{
 const {db,user}=await communicationContext();const input=await request.json();const action=input.action;
 if(action==='community-load'||action==='community-save'){
  if(!UUID.test(input.courseId||''))throw new Error('Save the course before configuring its community.');
  if(action==='community-load'){const {data,error}=await db.from('course_communities').select('*').eq('course_id',input.courseId).maybeSingle();if(error)throw new Error('Apply production-communications.sql first.');return Response.json({community:data});}
  const values=communityValues(input.community);const {error}=await db.from('course_communities').upsert({course_id:input.courseId,...values,updated_at:new Date().toISOString()});if(error)throw new Error('Community settings could not be saved. Save the course first.');await audit(db,user.id,'community_updated',input.courseId);return Response.json({ok:true});
 }
 const kind=['message','newsletter','template'].includes(input.kind)?input.kind:'newsletter';
 if(action==='audience'){const rows=await audience(db,filtersFor(input.filters,kind),kind==='newsletter');return Response.json({recipients:rows,count:rows.length});}
 if(action==='history'){const [{data,error},{data:events}]=await Promise.all([db.from('email_deliveries').select('id,campaign_id,student_id,email,student_name,course_title,state,attempts,available_at,sent_at,error,created_at').order('created_at',{ascending:false}).limit(200),db.from('communication_events').select('*').order('created_at',{ascending:false}).limit(50)]);if(error)throw new Error('History is unavailable. Apply production-communications.sql.');return Response.json({deliveries:data,events});}
 const id=String(input.id||'');if(!UUID.test(id))throw new Error('Invalid campaign.');
 if(action==='suppress'){const {error}=await db.from('email_preferences').upsert({student_id:id,suppressed:true,subscribed:false,source:'admin-suppression',updated_at:new Date().toISOString()});if(error)throw new Error('Recipient could not be suppressed.');await audit(db,user.id,'recipient_suppressed',id);return Response.json({ok:true});}
 if(action==='retry'){const {data,error}=await db.from('email_deliveries').update({state:'queued',error:null,available_at:new Date().toISOString()}).eq('id',id).eq('state','failed').select('id');if(error||!data?.length)throw new Error('Only confirmed failed requests can be retried. Unknown outcomes need provider review.');await audit(db,user.id,'delivery_retry',id);return Response.json({ok:true});}
 if(action==='save'){
 const subject=String(input.subject||'').trim().slice(0,200),body=String(input.body||'');if(body.length>100000)throw new Error('Message is too long.');
 const filters=filtersFor(input.filters,kind);const revision=Number(input.revision)||0;
 const record={subject,body,filters,kind,updated_at:new Date().toISOString(),revision:revision+1};
 const q=revision?db.from('email_campaigns').update(record).eq('id',id).eq('revision',revision).eq('state','draft'):db.from('email_campaigns').insert({...record,id,created_by:user.id});
 const {data,error}=await q.select('*').single();if(error||!data)throw new Error('Draft changed or could not be saved. Reload before editing.');await audit(db,user.id,'campaign_saved',id);return Response.json({campaign:data});
 }
 const {data:campaign,error}=await db.from('email_campaigns').select('*').eq('id',id).single();if(error)throw new Error('Campaign unavailable.');
 if(action==='cancel'){const {error:cancelError}=await db.from('email_campaigns').update({state:'cancelled',updated_at:new Date().toISOString()}).eq('id',id).eq('state','queued');if(cancelError)throw new Error('Campaign cancellation failed.');const {error:e}=await db.from('email_deliveries').update({state:'suppressed',error:'Cancelled by administrator.'}).eq('campaign_id',id).eq('state','queued');if(e)throw new Error('Cancellation could not be completed.');await audit(db,user.id,'campaign_cancelled',id);return Response.json({ok:true});}
 if(action==='duplicate'){const {data,error:e}=await db.from('email_campaigns').insert({id:randomUUID(),kind,subject:`Copy of ${campaign.subject}`,body:campaign.body,filters:filtersFor(campaign.filters,kind),created_by:user.id}).select('*').single();if(e)throw new Error('Copy could not be saved.');return Response.json({campaign:data});}
 if(action==='preview')return Response.json({html:emailHtml(campaign.body,{student_name:'Student name',course_title:'Course title'})});
 if(action==='queue'){
  if(!process.env.COMMUNICATIONS_JOB_SECRET || process.env.COMMUNICATIONS_JOB_SECRET.length<32)throw new Error('Configure the communications scheduler before queueing email.');
  if(input.confirm!==true)throw new Error('Confirm the recipient count before sending.');
  if(input.due&&(!Number.isFinite(Date.parse(input.due))||Date.parse(input.due)<Date.now()-60000))throw new Error('Choose a future date.');
  const {data,error:e}=await db.rpc('queue_communication',{target:id,expected_revision:input.revision,due:input.due||null,actor:user.id});if(e)throw new Error(e.message);return Response.json({ok:true,count:data});
 }
 // Test sends enter the same queue and are limited to the signed-in administrator.
 if(action==='test'){
  if(!process.env.COMMUNICATIONS_JOB_SECRET || process.env.COMMUNICATIONS_JOB_SECRET.length<32)throw new Error('Configure the communications scheduler before queueing tests.');
  if(!user.email)throw new Error('Administrator email unavailable.');
  const testId=String(input.testId||'');if(!UUID.test(testId))throw new Error('Invalid test request.');
  const {error:e}=await db.from('email_campaigns').upsert({id:testId,kind:'message',subject:`[TEST] ${campaign.subject}`,body:campaign.body,filters:{test:true},state:'queued',created_by:user.id},{onConflict:'id',ignoreDuplicates:true});if(e)throw new Error('Test could not be queued.');
  const {error:d}=await db.from('email_deliveries').upsert({campaign_id:testId,student_id:user.id,email:user.email,student_name:'Administrator',course_title:'Test course'},{onConflict:'campaign_id,student_id',ignoreDuplicates:true});if(d)throw new Error('Test could not be queued.');await audit(db,user.id,'test_queued',testId);return Response.json({ok:true});
 }
 throw new Error('Unknown action.');
 }catch(e){return Response.json({error:e.message||'Request failed.'},{status:400});}
}
