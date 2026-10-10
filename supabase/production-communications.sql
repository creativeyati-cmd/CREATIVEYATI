-- Communications: private queue, consent, per-course communities. Apply once before enabling the UI.
begin;
alter table public.enrolments add column if not exists paid_approved boolean not null default false;
create table if not exists public.course_communities (
 course_id uuid primary key references public.courses(id) on delete cascade,
 name text not null default '', welcome text not null default '', whatsapp text not null default '', telegram text not null default '', enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
create table if not exists public.email_preferences (
 student_id uuid primary key references auth.users(id) on delete cascade,
 subscribed boolean not null default false, suppressed boolean not null default false,
 consent_at timestamptz, source text not null default 'profile', unsubscribe_token uuid not null unique default gen_random_uuid(), updated_at timestamptz not null default now()
);
create table if not exists public.email_campaigns (
 id uuid primary key, kind text not null check(kind in ('message','newsletter','template')), subject text not null default '', body text not null default '',
 filters jsonb not null default '{}', state text not null default 'draft' check(state in ('draft','queued','cancelled')), revision integer not null default 1,
 scheduled_at timestamptz, created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.email_deliveries (
 id uuid primary key default gen_random_uuid(), campaign_id uuid references public.email_campaigns(id), enrolment_id uuid references public.enrolments(id),
 student_id uuid not null references auth.users(id), course_id uuid references public.courses(id), email text, student_name text, course_title text,
 state text not null default 'queued' check(state in ('queued','processing','accepted','failed','unknown','suppressed')), attempts integer not null default 0,
 available_at timestamptz not null default now(), claimed_at timestamptz, sent_at timestamptz, error text, created_at timestamptz not null default now(),
 unique(campaign_id,student_id), unique(enrolment_id), check(campaign_id is not null or enrolment_id is not null)
);
create index if not exists email_delivery_due on public.email_deliveries(state,available_at);
create table if not exists public.communication_events (
 id bigint generated always as identity primary key, actor uuid, action text not null, target uuid, detail jsonb not null default '{}', created_at timestamptz not null default now()
);
do $$ declare t text; begin
 foreach t in array array['course_communities','email_preferences','email_campaigns','email_deliveries','communication_events'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
grant usage,select on sequence public.communication_events_id_seq to service_role;

create or replace function public.communication_audience(f jsonb, marketing boolean)
returns table(student_id uuid,email text,student_name text,course_id uuid,course_title text)
language sql stable security definer set search_path=public as $$
 select distinct on(u.id) u.id,u.email,coalesce(p.full_name,'Student'),e.course_id,c.title
 from auth.users u
 left join public.student_profiles p on p.id=u.id
 left join public.email_preferences pref on pref.student_id=u.id
 left join public.enrolments e on e.student_id=u.id
 left join public.courses c on c.id=e.course_id
 where u.email_confirmed_at is not null and u.email is not null
 and not coalesce(pref.suppressed,false)
 and (not marketing or pref.subscribed=true)
 and (nullif(f->>'courseId','') is null or e.course_id=(f->>'courseId')::uuid)
 and (coalesce(f->>'status','active')='all' or (f->>'status'='inactive' and e.active=false) or (coalesce(f->>'status','active')='active' and e.active=true))
 and (nullif(f->>'from','') is null or e.created_at >= (f->>'from')::timestamptz)
 and (nullif(f->>'to','') is null or e.created_at < (f->>'to')::date + interval '1 day')
 and (coalesce(jsonb_array_length(f->'ids'),0)=0 or u.id::text in(select jsonb_array_elements_text(f->'ids')))
 and (nullif(f->>'search','') is null or coalesce(p.full_name,'') ilike '%'||(f->>'search')||'%' or u.email ilike '%'||(f->>'search')||'%')
 and (coalesce(f->>'segment','all')='all'
 or (f->>'segment'='paid' and e.active and (e.paid_approved or exists(select 1 from public.orders o where o.student_id=u.id and o.course_id=e.course_id and o.payment_status='successful' and o.amount_minor>0)))
 or (f->>'segment'='free' and e.active and not e.paid_approved and not exists(select 1 from public.orders o where o.student_id=u.id and o.course_id=e.course_id and o.payment_status='successful' and o.amount_minor>0)))
 order by u.id,e.created_at desc nulls last;
$$;
create or replace function public.queue_communication(target uuid, expected_revision integer, due timestamptz, actor uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare c public.email_campaigns%rowtype; n integer;
begin
 select * into c from public.email_campaigns where id=target for update;
 if not found then raise exception 'Campaign unavailable'; end if;
 if c.state='queued' then select count(*) into n from public.email_deliveries where campaign_id=target;return n;end if;
 if c.state<>'draft' or c.revision<>expected_revision or c.kind='template' or length(trim(c.subject))=0 or length(trim(c.body))=0 then raise exception 'Reload the draft before sending';end if;
 insert into public.email_deliveries(campaign_id,student_id,email,student_name,course_id,course_title,available_at)
 select c.id,a.student_id,a.email,a.student_name,a.course_id,a.course_title,greatest(now(),coalesce(due,now())) from public.communication_audience(c.filters,c.kind='newsletter') a
 on conflict(campaign_id,student_id) do nothing;
 get diagnostics n=row_count;
 if n=0 then raise exception 'No eligible recipients';end if;
 update public.email_campaigns set state='queued',scheduled_at=coalesce(due,now()),revision=revision+1,updated_at=now() where id=target;
 insert into public.communication_events(actor,action,target,detail) values(actor,'campaign_queued',target,jsonb_build_object('recipients',n,'scheduled_at',due));
 return n;
end;$$;
create or replace function public.claim_communication_batch()
returns setof public.email_deliveries language plpgsql security definer set search_path=public as $$
begin
 -- Never resend abandoned claims: the provider may already have accepted them.
 update public.email_deliveries set state='unknown',error='Delivery outcome unknown; inspect provider logs before taking action.' where state='processing' and claimed_at<now()-interval '10 minutes';
 return query update public.email_deliveries d set state='processing',claimed_at=now(),attempts=attempts+1
 where d.id in(select q.id from public.email_deliveries q where q.state='queued' and q.available_at<=now() order by q.available_at limit 20 for update skip locked) returning d.*;
end;$$;
create or replace function public.queue_enrolment_welcome()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.active then
 insert into public.email_deliveries(enrolment_id,student_id,course_id) values(new.id,new.student_id,new.course_id) on conflict(enrolment_id) do nothing;
 end if;return new;
end;$$;
drop trigger if exists enrollment_welcome on public.enrolments;
create trigger enrollment_welcome after insert or update of active on public.enrolments for each row execute function public.queue_enrolment_welcome();
revoke all on function public.communication_audience(jsonb,boolean),public.queue_communication(uuid,integer,timestamptz,uuid),public.claim_communication_batch(),public.queue_enrolment_welcome() from public,anon,authenticated;
grant execute on function public.communication_audience(jsonb,boolean),public.queue_communication(uuid,integer,timestamptz,uuid),public.claim_communication_batch() to service_role;
notify pgrst,'reload schema';
commit;
