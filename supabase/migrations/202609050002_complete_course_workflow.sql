-- Complete course authoring, lesson media, scheduling and protected uploads.
-- Safe to run more than once in the Supabase SQL Editor.

alter table public.courses
  add column if not exists cover_focal_x numeric not null default 50 check (cover_focal_x between 0 and 100),
  add column if not exists cover_focal_y numeric not null default 50 check (cover_focal_y between 0 and 100),
  add column if not exists cover_width integer,
  add column if not exists cover_height integer,
  add column if not exists promotional_video_source text,
  add column if not exists promotional_video_url text,
  add column if not exists promotional_video_id text,
  add column if not exists promotional_embed_url text,
  add column if not exists promotional_orientation text not null default 'landscape',
  add column if not exists promotional_aspect_ratio numeric not null default 1.7777778,
  add column if not exists sale_starts_at timestamptz,
  add column if not exists sale_ends_at timestamptz,
  add column if not exists payment_gateway text not null default 'bachs',
  add column if not exists scheduled_for timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists duplicated_from uuid references public.courses(id) on delete set null;

alter table public.courses drop constraint if exists courses_status_check;
alter table public.courses add constraint courses_status_check check (status in ('draft','scheduled','published','unpublished','archived'));
alter table public.courses drop constraint if exists courses_promotional_video_source_check;
alter table public.courses add constraint courses_promotional_video_source_check check (promotional_video_source is null or promotional_video_source in ('youtube','vimeo','google_drive'));
alter table public.courses drop constraint if exists courses_promotional_orientation_check;
alter table public.courses add constraint courses_promotional_orientation_check check (promotional_orientation in ('landscape','portrait'));
alter table public.courses drop constraint if exists courses_payment_gateway_check;
alter table public.courses add constraint courses_payment_gateway_check check (payment_gateway in ('bachs'));
alter table public.courses drop constraint if exists courses_sale_dates_check;
alter table public.courses add constraint courses_sale_dates_check check (sale_ends_at is null or sale_starts_at is null or sale_ends_at > sale_starts_at);

alter table public.course_lessons
  add column if not exists course_id uuid references public.courses(id) on delete cascade,
  add column if not exists description text not null default '',
  add column if not exists source_type text,
  add column if not exists source_url text,
  add column if not exists source_id text,
  add column if not exists storage_key text,
  add column if not exists embed_url text,
  add column if not exists orientation text not null default 'landscape',
  add column if not exists aspect_ratio numeric not null default 1.7777778,
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists poster_url text,
  add column if not exists poster_storage_key text,
  add column if not exists captions_url text,
  add column if not exists transcript text not null default '',
  add column if not exists privacy text not null default 'unlisted',
  add column if not exists allow_download boolean not null default false,
  add column if not exists status text not null default 'published',
  add column if not exists processing_status text not null default 'ready',
  add column if not exists processing_error text;

update public.course_lessons lesson
set course_id = section.course_id
from public.course_sections section
where lesson.section_id = section.id and lesson.course_id is null;

update public.course_lessons
set source_type = coalesce(source_type,
    case video_provider
      when 'youtube' then 'youtube'
      when 'vimeo' then 'vimeo'
      when 'google_drive' then 'google_drive'
      else case when video_url is not null then 'upload' else null end
    end),
    source_url = coalesce(source_url, video_url),
    source_id = coalesce(source_id, video_asset_id)
where source_type is null or source_url is null or source_id is null;

update public.course_lessons
set embed_url = case source_type
  when 'youtube' then 'https://www.youtube-nocookie.com/embed/' || source_id || '?playsinline=1&controls=1&rel=0&modestbranding=1'
  when 'vimeo' then 'https://player.vimeo.com/video/' || source_id || '?dnt=1'
  when 'google_drive' then 'https://drive.google.com/file/d/' || source_id || '/preview'
  else embed_url
end
where embed_url is null and source_id is not null;

-- Older provider types cannot satisfy the new four-source authoring contract.
-- Keep that content safely as a draft until an administrator chooses a source.
update public.course_lessons
set status = 'draft', is_preview = false
where lesson_type in ('video','mixed') and (
  source_type is null or
  (source_type = 'upload' and storage_key is null) or
  (source_type <> 'upload' and (source_url is null or source_id is null or embed_url is null))
);

alter table public.course_lessons alter column course_id set not null;
alter table public.course_lessons drop constraint if exists course_lessons_source_type_check;
alter table public.course_lessons add constraint course_lessons_source_type_check check (source_type is null or source_type in ('upload','youtube','vimeo','google_drive'));
alter table public.course_lessons drop constraint if exists course_lessons_video_provider_check;
update public.course_lessons set video_provider = null where video_provider is not null and video_provider not in ('upload','youtube','vimeo','google_drive');
alter table public.course_lessons add constraint course_lessons_video_provider_check check (video_provider is null or video_provider in ('upload','youtube','vimeo','google_drive'));
alter table public.course_lessons drop constraint if exists course_lessons_orientation_check;
alter table public.course_lessons add constraint course_lessons_orientation_check check (orientation in ('landscape','portrait'));
alter table public.course_lessons drop constraint if exists course_lessons_privacy_check;
alter table public.course_lessons add constraint course_lessons_privacy_check check (privacy in ('public','unlisted','private'));
alter table public.course_lessons drop constraint if exists course_lessons_status_check;
alter table public.course_lessons add constraint course_lessons_status_check check (status in ('draft','published','archived'));
alter table public.course_lessons drop constraint if exists course_lessons_processing_status_check;
alter table public.course_lessons add constraint course_lessons_processing_status_check check (processing_status in ('pending','uploading','processing','ready','failed'));
alter table public.course_lessons drop constraint if exists course_lessons_published_source_check;
alter table public.course_lessons add constraint course_lessons_published_source_check check (
  status <> 'published' or lesson_type not in ('video','mixed') or (
    source_type in ('upload','youtube','vimeo','google_drive') and
    processing_status = 'ready' and
    case when source_type = 'upload' then storage_key is not null else source_url is not null and source_id is not null and embed_url is not null end
  )
);

create or replace function public.sync_course_lesson_course_id()
returns trigger language plpgsql set search_path = public as $$
begin
  select course_id into new.course_id from public.course_sections where id = new.section_id;
  if new.course_id is null then raise exception 'Lesson section does not exist.'; end if;
  return new;
end; $$;

drop trigger if exists course_lesson_course_id_trigger on public.course_lessons;
create trigger course_lesson_course_id_trigger before insert or update of section_id on public.course_lessons
for each row execute function public.sync_course_lesson_course_id();

alter table public.course_resources
  add column if not exists course_id uuid references public.courses(id) on delete cascade,
  add column if not exists description text not null default '',
  add column if not exists preview_allowed boolean not null default false;

update public.course_resources resource
set course_id = section.course_id
from public.course_lessons lesson
join public.course_sections section on section.id = lesson.section_id
where resource.lesson_id = lesson.id and resource.course_id is null;

alter table public.course_resources alter column lesson_id drop not null;
alter table public.course_resources alter column course_id set not null;
alter table public.course_resources drop constraint if exists course_resources_owner_check;
alter table public.course_resources add constraint course_resources_owner_check check (lesson_id is not null or course_id is not null);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid references public.course_lessons(id) on delete cascade,
  asset_type text not null check (asset_type in ('video','poster','caption')),
  bucket text not null,
  storage_key text not null unique,
  mime_type text not null,
  file_size bigint not null check (file_size > 0),
  width integer,
  height integer,
  duration_seconds integer,
  orientation text check (orientation is null or orientation in ('landscape','portrait')),
  aspect_ratio numeric,
  processing_status text not null default 'pending' check (processing_status in ('pending','uploading','processing','ready','failed')),
  processing_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists course_lessons_course_status_idx on public.course_lessons(course_id, status, display_order);
create index if not exists media_assets_lesson_idx on public.media_assets(lesson_id, asset_type);
create index if not exists courses_schedule_idx on public.courses(status, scheduled_for) where deleted_at is null;

alter table public.media_assets enable row level security;
drop policy if exists "admins manage media assets" on public.media_assets;
create policy "admins manage media assets" on public.media_assets for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('course-videos', 'course-videos', false, 2147483648, array['video/mp4','video/webm','video/quicktime'])
on conflict(id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('course-posters', 'course-posters', false, 8388608, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
