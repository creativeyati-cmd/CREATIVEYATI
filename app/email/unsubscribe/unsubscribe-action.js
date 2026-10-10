"use server";
import {redirect} from 'next/navigation';
import {createSupabaseServiceClient} from '@/lib/supabase/server';
import {UUID} from '@/lib/course-workspace';
export async function unsubscribeMarketing(form){const token=String(form.get('token')||'');if(!UUID.test(token))throw new Error('Invalid unsubscribe link.');const {error}=await createSupabaseServiceClient().from('email_preferences').update({subscribed:false,updated_at:new Date().toISOString()}).eq('unsubscribe_token',token);if(error)throw new Error('Please retry.');redirect('/email/unsubscribe?done=1');}
