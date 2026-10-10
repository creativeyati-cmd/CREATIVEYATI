import "server-only";
import {createSupabaseServiceClient,getAdminUser} from '@/lib/supabase/server';
import {readDashboardRows} from '@/lib/data/dashboard';
import {UUID} from '@/lib/course-workspace';
export async function communicationContext(){const user=await getAdminUser();if(!user)throw new Error('Administrator sign-in required.');const db=createSupabaseServiceClient();if(!db)throw new Error('Database unavailable.');return {user,db};}
export function filtersFor(input={},kind='newsletter'){
 const ids=Array.isArray(input.ids)?[...new Set(input.ids)]:[];if(ids.length>1000||ids.some(id=>!UUID.test(id)))throw new Error('Select up to 1,000 students.');
 const courseId=String(input.courseId||'');if(courseId&&!UUID.test(courseId))throw new Error('Invalid course.');
 for(const key of ['from','to'])if(input[key]&&!/^\d{4}-\d{2}-\d{2}$/.test(input[key]))throw new Error('Invalid enrollment date.');
 return {segment:kind==='message'?'paid':['all','paid','free'].includes(input.segment)?input.segment:'all',status:['active','inactive','all'].includes(input.status)?input.status:'active',courseId,from:input.from||'',to:input.to||'',ids,search:String(input.search||'').slice(0,100)};
}
export async function audience(db,filters,marketing){return readDashboardRows(()=>db.rpc('communication_audience',{f:filters,marketing}).order('student_id'));}
export async function audit(db,actor,action,target,detail={}){const {error}=await db.from('communication_events').insert({actor,action,target,detail});if(error)throw new Error('Audit record could not be saved.');}
export async function communicationData(kind){const {db}=await communicationContext();const [{data:campaigns,error},{data:courses=[]}]=await Promise.all([db.from('email_campaigns').select('*').eq('kind',kind).order('created_at',{ascending:false}).limit(100),db.from('courses').select('id,title').is('deleted_at',null).order('title')]);return {campaigns:campaigns||[],courses,error:error?'Apply production-communications.sql to enable communications.':null};}
