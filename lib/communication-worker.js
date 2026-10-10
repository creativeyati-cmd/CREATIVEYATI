import "server-only";
import {createSupabaseServiceClient} from '@/lib/supabase/server';
import {getServiceEmailSettings} from '@/lib/data/settings';
import {emailHtml,communityValues} from '@/lib/communications-format';
export async function processCommunications(){
 const db=createSupabaseServiceClient();const settings=await getServiceEmailSettings();
 if(!db||!settings.enabled||!settings.fromEmail||!process.env.SENDHIIV_API_KEY)throw new Error('Email delivery is not configured.');
 const {data:jobs,error}=await db.rpc('claim_communication_batch');if(error)throw new Error('Communications schema is unavailable.');
 const counts={accepted:0,failed:0,unknown:0,suppressed:0,queued:0};
 for(const job of jobs||[]){let state='failed',detail=null,deliveryMeta={};
 try{
  const {data:{user},error:ue}=await db.auth.admin.getUserById(job.student_id);if(ue)throw new Error('Account verification unavailable.');
  const {data:pref,error:pe}=await db.from('email_preferences').select('*').eq('student_id',job.student_id).maybeSingle();if(pe)throw new Error('Email preferences unavailable.');
  if(!user?.email_confirmed_at||!user.email||pref?.suppressed){state='suppressed';throw new Error('Account is unverified or email is suppressed.');}
  deliveryMeta={email:user.email,student_name:job.student_name||user.user_metadata?.full_name||'Student'};
  let subject,body,marketing=false,vars={student_name:job.student_name||user.user_metadata?.full_name||'Student',course_title:job.course_title};
  if(job.enrolment_id){
   const {data:e,error:ee}=await db.from('enrolments').select('*,courses(title,slug,status,scheduled_for,deleted_at)').eq('id',job.enrolment_id).maybeSingle();if(ee)throw new Error('Enrollment check unavailable.');
   if(!e?.active||e.courses?.deleted_at||!(e.courses?.status==='published'||(e.courses?.status==='scheduled'&&Date.parse(e.courses.scheduled_for)<=Date.now()))){state='suppressed';throw new Error('Enrollment or course is no longer active.');}
   if(e.access_source==='purchase'||e.order_id){const {data:o,error:oe}=await db.from('orders').select('payment_status').eq('id',e.order_id).eq('student_id',job.student_id).eq('course_id',job.course_id).maybeSingle();if(oe)throw new Error('Payment check unavailable.');if(o?.payment_status!=='successful'){state='suppressed';throw new Error('Payment is not verified.');}}
   const {data:community,error:ce}=await db.from('course_communities').select('*').eq('course_id',job.course_id).maybeSingle();if(ce)throw new Error('Community check unavailable.');
   const c=communityValues(community||{});vars.course_title=e.courses.title;
   subject=`Welcome to ${e.courses.title}`;body=`## Welcome, {{student_name}}\nYour enrollment in {{course_title}} is confirmed.\nCTA:[Open your course](https://www.aivideocreator.cv/learn/${encodeURIComponent(e.courses.slug)})`;
   if(c.enabled){body+=`\n## ${c.name||'Your course community'}\n${c.welcome}\nJoining is optional. Open a link below and follow the group's joining instructions.`;if(c.whatsapp)body+=`\n[Join WhatsApp Group](${c.whatsapp})`;if(c.telegram)body+=`\n[Join Telegram Group](${c.telegram})`;}
  }else{
   const {data:c,error:ce}=await db.from('email_campaigns').select('*').eq('id',job.campaign_id).single();if(ce)throw new Error('Campaign unavailable.');
   if(c.state!=='queued'){state='suppressed';throw new Error('Campaign is not queued.');}
   marketing=c.kind==='newsletter';
   if(!(c.filters?.test===true&&c.created_by===job.student_id)){
    const {data:eligible,error:ae}=await db.rpc('communication_audience',{f:{...c.filters,ids:[job.student_id]},marketing});if(ae)throw new Error('Audience check unavailable.');
    if(!eligible?.length){state='suppressed';throw new Error('Recipient no longer matches consent or enrollment filters.');}
   }
   subject=c.subject;body=c.body;
  }
  if(marketing){if(!pref?.subscribed){state='suppressed';throw new Error('Marketing consent withdrawn.');}body+=`\n[Unsubscribe from newsletters](https://www.aivideocreator.cv/email/unsubscribe?token=${pref.unsubscribe_token})`;}
  deliveryMeta.course_title=vars.course_title||null;
  const rendered=emailHtml(body,vars);
  state='unknown';
  const response=await fetch('https://api.sendhiiv.com/api/v1/messages',{method:'POST',headers:{Authorization:`Bearer ${process.env.SENDHIIV_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:`${settings.fromName||'AI Video Creator'} <${settings.fromEmail}>`,to:user.email,subject:subject.replace(/\{\{student_name\}\}/g,vars.student_name).replace(/\{\{course_title\}\}/g,vars.course_title||'your course'),html:rendered,text:body.replace(/\{\{student_name\}\}/g,vars.student_name).replace(/\{\{course_title\}\}/g,vars.course_title||'your course')}),signal:AbortSignal.timeout(15000)});
  if(response.ok){state='accepted';}
  else if(response.status===429&&job.attempts<4){state='queued';detail='Provider rate limit; scheduled for retry.';}
  else if(response.status>=400&&response.status<500){state='failed';detail=`Provider rejected request (HTTP ${response.status}). Review email settings or content before retrying.`;}
  else{state='unknown';detail='Provider outcome unknown. Inspect Sendhiiv logs; automatic resend is disabled.';}
 }catch(e){detail=e.message||'Delivery outcome unknown.';}
 const {error:updateError}=await db.from('email_deliveries').update({...deliveryMeta,state,error:detail,sent_at:state==='accepted'?new Date().toISOString():null,...(state==='queued'?{available_at:new Date(Date.now()+5*60000).toISOString()}:{})}).eq('id',job.id).eq('state','processing');
 if(updateError)throw new Error('Could not record delivery outcome; stale claims will be held for review.');counts[state]++;
 }
 return counts;
}
