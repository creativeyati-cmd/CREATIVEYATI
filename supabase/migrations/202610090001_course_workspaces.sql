-- Private course workspaces. Apply before using the revised course editor.
begin;
alter table public.course_resources add column if not exists archived boolean not null default false;
alter table public.course_sections add column if not exists archived boolean not null default false;
create table if not exists public.course_workspaces (
 course_id uuid primary key references public.courses(id) on delete cascade,
 document jsonb not null check (jsonb_typeof(document) = 'object'),
 revision integer not null default 1,
 base_updated_at timestamptz not null,
 updated_by uuid,
 updated_at timestamptz not null default now()
);
create table if not exists public.course_workspace_history (
 id bigint generated always as identity primary key,
 course_id uuid not null references public.courses(id) on delete cascade,
 document jsonb not null,
 revision integer not null,
 created_at timestamptz not null default now(),
 unique(course_id, revision)
);
alter table public.course_workspaces enable row level security;
alter table public.course_workspace_history enable row level security;
grant select, insert, update, delete on public.course_workspaces, public.course_workspace_history to service_role;
grant usage, select on sequence public.course_workspace_history_id_seq to service_role;
-- Access goes through authenticated admin server actions; never through student APIs.
revoke all on public.course_workspaces, public.course_workspace_history from anon, authenticated;

create or replace function public.save_course_workspace(target_id uuid, expected_revision integer, draft jsonb, actor uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare current_draft public.course_workspaces%rowtype; live_updated timestamptz;
begin
 if jsonb_typeof(draft) <> 'object' or octet_length(draft::text) > 1500000 then raise exception 'Invalid draft' using errcode='22023'; end if;
 -- Stable client id makes retried first saves idempotent.
 insert into public.courses(id,title,slug,status,is_free,currency)
 values(target_id,'Untitled course','draft-' || target_id::text,'draft',true,'NGN') on conflict(id) do nothing;
 select updated_at into live_updated from public.courses where id=target_id and deleted_at is null for update;
 if not found then raise exception 'Course unavailable' using errcode='22023'; end if;
 select * into current_draft from public.course_workspaces where course_id=target_id for update;
 if coalesce(current_draft.revision,0) <> expected_revision then
  if current_draft.document = draft then return current_draft.revision; end if;
  raise exception 'Draft changed in another session' using errcode='40001';
 end if;
 if current_draft.course_id is not null and current_draft.base_updated_at is distinct from live_updated then
  raise exception 'Live course changed; reload before editing' using errcode='40001';
 end if;
 insert into public.course_workspaces(course_id,document,revision,base_updated_at,updated_by)
 values(target_id,draft,expected_revision+1,live_updated,actor)
 on conflict(course_id) do update set document=excluded.document, revision=excluded.revision,updated_by=actor,updated_at=now();
 return expected_revision+1;
end; $$;

-- Internal helper accepts only service-side normalized, editable fields.
create or replace function public.apply_course_workspace_row(target_table text, target_id uuid, fields jsonb)
returns void language plpgsql security invoker set search_path=public as $$
declare columns_sql text;
begin
 if target_table not in ('courses','course_sections','course_lessons','course_resources') then raise exception 'Invalid table'; end if;
 select string_agg(format('%I',key),',') into columns_sql from jsonb_object_keys(fields) key
 where key not in ('id','course_id','created_at','deleted_at');
 if columns_sql is not null then
  execute format('update public.%I t set (%s) = (select %s from jsonb_populate_record(t,$1)) where id=$2',target_table,columns_sql,columns_sql) using fields,target_id;
 end if;
end; $$;

create or replace function public.publish_course_workspace(target_id uuid, expected_revision integer, normalized jsonb)
returns integer language plpgsql security definer set search_path=public as $$
declare w public.course_workspaces%rowtype; live_updated timestamptz; s jsonb; l jsonb; r jsonb; sid uuid; lid uuid; rid uuid;
begin
 select updated_at into live_updated from public.courses where id=target_id and deleted_at is null for update;
 if not found then raise exception 'Course unavailable'; end if;
 select * into w from public.course_workspaces where course_id=target_id for update;
 if w.course_id is null or w.revision<>expected_revision or w.base_updated_at is distinct from live_updated then raise exception 'Draft changed; reload before publishing' using errcode='40001'; end if;
 set constraints all deferred;
 -- Archive omissions instead of cascading through lesson_progress.
 update public.course_sections s set archived=true,display_order=-2000000-r.position
 from (select id,row_number() over(order by id)::int position from public.course_sections where course_id=target_id) r where s.id=r.id;
 update public.course_lessons l set status='archived',is_preview=false,slug=l.id::text,display_order=-2000000-r.position
 from (select id,row_number() over(order by id)::int position from public.course_lessons where course_id=target_id) r where l.id=r.id;
 for s in select value from jsonb_array_elements(normalized->'sections') loop
  sid := (s->>'id')::uuid;
  if exists(select 1 from public.course_sections where id=sid and course_id<>target_id) then raise exception 'Module ownership mismatch'; end if;
  insert into public.course_sections(id,course_id,title,display_order) values(sid,target_id,'',-(1000000+(s->>'display_order')::int)) on conflict(id) do nothing;
  perform public.apply_course_workspace_row('course_sections',sid,(s-'lessons'-'id') || '{"archived":false}'::jsonb);
  for l in select value from jsonb_array_elements(s->'lessons') loop
   lid := (l->>'id')::uuid;
   if exists(select 1 from public.course_lessons where id=lid and course_id<>target_id) then raise exception 'Lesson ownership mismatch'; end if;
   insert into public.course_lessons(id,course_id,section_id,title,slug,status,display_order) values(lid,target_id,sid,'',lid::text,'draft',-(1000000+(l->>'display_order')::int)) on conflict(id) do nothing;
   perform public.apply_course_workspace_row('course_lessons',lid,(l-'resources'-'id') || jsonb_build_object('section_id',sid));
  end loop;
 end loop;
 -- Remove only resource metadata; retain blobs for version restore.
 update public.course_resources r set archived=true, display_order=-2000000-x.position
 from (select id,row_number() over(order by id)::int position from public.course_resources where course_id=target_id) x where r.id=x.id;
 for r in select value from jsonb_array_elements(normalized->'resources') loop
  rid := (r->>'id')::uuid;
  if exists(select 1 from public.course_resources where id=rid and course_id<>target_id) then raise exception 'Resource ownership mismatch'; end if;
  insert into public.course_resources(id,course_id,lesson_id,title,storage_key) values(rid,target_id,(r->>'lesson_id')::uuid,'',r->>'storage_key') on conflict(id) do nothing;
  perform public.apply_course_workspace_row('course_resources',rid,(r-'id') || '{"archived":false}'::jsonb);
 end loop;
 perform public.apply_course_workspace_row('courses',target_id,(normalized->'course') || jsonb_build_object('status','published','scheduled_for',null,'published_at',now(),'updated_at',now()));
 insert into public.course_workspace_history(course_id,document,revision) values(target_id,w.document,w.revision) on conflict do nothing;
 update public.course_workspaces set base_updated_at=(select updated_at from public.courses where id=target_id),revision=revision+1,updated_at=now() where course_id=target_id;
 return expected_revision+1;
end; $$;
revoke all on function public.save_course_workspace(uuid,integer,jsonb,uuid), public.publish_course_workspace(uuid,integer,jsonb), public.apply_course_workspace_row(text,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.save_course_workspace(uuid,integer,jsonb,uuid), public.publish_course_workspace(uuid,integer,jsonb), public.apply_course_workspace_row(text,uuid,jsonb) to service_role;
create or replace function public.course_workspace_lifecycle(target_id uuid, expected_revision integer, intent text)
returns integer language plpgsql security definer set search_path=public as $$
declare w public.course_workspaces%rowtype; live_updated timestamptz;
begin
 select updated_at into live_updated from public.courses where id=target_id for update;
 if not found then raise exception 'Course unavailable'; end if;
 select * into w from public.course_workspaces where course_id=target_id for update;
 if (w.course_id is null and not (intent='restore' and expected_revision=0)) or (w.course_id is not null and w.revision<>expected_revision) then raise exception 'Draft changed' using errcode='40001'; end if;
 if w.course_id is not null and w.base_updated_at is distinct from live_updated then raise exception 'Live course changed' using errcode='40001'; end if;
 if intent not in ('archive','unpublish','restore','delete') then raise exception 'Invalid action'; end if;
 update public.courses set status=case when intent='unpublish' then 'unpublished' when intent='restore' then 'draft' else 'archived' end,
 deleted_at=case when intent='delete' then now() else null end,scheduled_for=null,updated_at=now() where id=target_id;
 update public.course_workspaces set revision=revision+1,base_updated_at=(select updated_at from public.courses where id=target_id),updated_at=now() where course_id=target_id;
 return case when w.course_id is null then 0 else expected_revision+1 end;
end; $$;
revoke all on function public.course_workspace_lifecycle(uuid,integer,text) from public,anon,authenticated;
grant execute on function public.course_workspace_lifecycle(uuid,integer,text) to service_role;
create or replace function public.rebase_course_workspace(target_id uuid, expected_revision integer, expected_live_updated timestamptz, live_document jsonb)
returns integer language plpgsql security definer set search_path=public as $$
declare live_updated timestamptz; w public.course_workspaces%rowtype;
begin
 select updated_at into live_updated from public.courses where id=target_id and deleted_at is null for update;
 select * into w from public.course_workspaces where course_id=target_id for update;
 if w.course_id is null or w.revision<>expected_revision or live_updated is distinct from expected_live_updated then raise exception 'Course changed during reload' using errcode='40001'; end if;
 insert into public.course_workspace_history(course_id,document,revision) values(target_id,w.document,w.revision) on conflict do nothing;
 update public.course_workspaces set document=live_document,base_updated_at=live_updated,revision=revision+1,updated_at=now() where course_id=target_id;
 return expected_revision+1;
end; $$;
revoke all on function public.rebase_course_workspace(uuid,integer,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.rebase_course_workspace(uuid,integer,timestamptz,jsonb) to service_role;
-- Detect changes from older clients or direct administrator tools as conflicts.
create or replace function public.touch_course_workspace_parent()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='DELETE' then update public.courses set updated_at=clock_timestamp() where id=old.course_id;
 else update public.courses set updated_at=clock_timestamp() where id=new.course_id;
 end if;
 return null;
end; $$;
drop trigger if exists course_workspace_section_changed on public.course_sections;
create trigger course_workspace_section_changed after insert or update or delete on public.course_sections for each row execute function public.touch_course_workspace_parent();
drop trigger if exists course_workspace_lesson_changed on public.course_lessons;
create trigger course_workspace_lesson_changed after insert or update or delete on public.course_lessons for each row execute function public.touch_course_workspace_parent();
drop trigger if exists course_workspace_resource_changed on public.course_resources;
create trigger course_workspace_resource_changed after insert or update or delete on public.course_resources for each row execute function public.touch_course_workspace_parent();
notify pgrst,'reload schema';
commit;
