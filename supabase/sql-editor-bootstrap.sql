-- CreativeYati compatibility bootstrap for project xdcumjsuwmvtiohrqqzu.
-- Safe to run more than once in the Supabase SQL Editor.
-- It preserves the existing projects, inquiries, courses, orders, and payments tables.

create extension if not exists pgcrypto;

do $$
begin
  create type public.video_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.enquiry_status as enum ('new', 'read', 'replied', 'archived', 'spam');
exception when duplicate_object then null;
end $$;

alter table public.admin_users
  add column if not exists role text not null default 'admin';

alter table public.categories
  add column if not exists is_visible boolean not null default true;

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  short_description text,
  description text,
  youtube_url text,
  youtube_video_id text,
  youtube_embed_url text,
  youtube_thumbnail_url text,
  custom_poster_url text,
  mobile_poster_url text,
  video_provider text not null default 'youtube',
  video_url text not null,
  video_asset_id text not null,
  video_embed_url text not null,
  video_thumbnail_url text,
  orientation text not null default 'landscape',
  aspect_ratio numeric not null default 1.7777777778,
  display_mode text not null default 'cover',
  focal_x numeric default .5,
  focal_y numeric default .5,
  category_id integer references public.categories(id) on delete set null,
  tags text[] not null default '{}',
  client_name text,
  creative_role text,
  director text,
  production_company text,
  year integer,
  location text,
  credits jsonb not null default '[]'::jsonb,
  external_project_url text,
  featured boolean not null default false,
  display_order integer not null default 0,
  status public.video_status not null default 'draft',
  published_at timestamptz,
  seo_title text,
  seo_description text,
  og_image_url text,
  cover_image_url text,
  cover_image_storage_key text,
  mobile_cover_image_url text,
  mobile_cover_storage_key text,
  cover_fit text not null default 'cover',
  cover_focal_x numeric not null default 50,
  cover_focal_y numeric not null default 50,
  cover_alt text,
  cover_variants jsonb not null default '{}'::jsonb,
  mobile_cover_variants jsonb not null default '{}'::jsonb,
  cover_aspect_ratio numeric not null default 1.7777777778,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint videos_video_provider_check check (video_provider in ('youtube', 'google_drive')),
  constraint videos_orientation_check check (orientation in ('portrait', 'landscape')),
  constraint videos_display_mode_check check (display_mode in ('cover', 'contain')),
  constraint videos_cover_fit_check check (cover_fit in ('cover', 'contain')),
  constraint videos_focal_x_check check (focal_x between 0 and 1),
  constraint videos_focal_y_check check (focal_y between 0 and 1),
  constraint videos_cover_focal_x_check check (cover_focal_x between 0 and 100),
  constraint videos_cover_focal_y_check check (cover_focal_y between 0 and 100)
);

alter table public.videos
  add column if not exists video_provider text not null default 'youtube',
  add column if not exists video_url text,
  add column if not exists video_asset_id text,
  add column if not exists video_embed_url text,
  add column if not exists video_thumbnail_url text,
  add column if not exists cover_image_url text,
  add column if not exists cover_image_storage_key text,
  add column if not exists mobile_cover_image_url text,
  add column if not exists mobile_cover_storage_key text,
  add column if not exists cover_fit text not null default 'cover',
  add column if not exists cover_focal_x numeric not null default 50,
  add column if not exists cover_focal_y numeric not null default 50,
  add column if not exists cover_alt text,
  add column if not exists cover_variants jsonb not null default '{}'::jsonb,
  add column if not exists mobile_cover_variants jsonb not null default '{}'::jsonb,
  add column if not exists cover_aspect_ratio numeric not null default 1.7777777778;

alter table public.videos
  alter column youtube_url drop not null,
  alter column youtube_video_id drop not null,
  alter column youtube_embed_url drop not null;

update public.videos
set
  video_provider = coalesce(nullif(video_provider, ''), 'youtube'),
  video_url = coalesce(video_url, youtube_url),
  video_asset_id = coalesce(video_asset_id, youtube_video_id),
  video_embed_url = coalesce(video_embed_url, youtube_embed_url),
  video_thumbnail_url = coalesce(video_thumbnail_url, youtube_thumbnail_url)
where video_url is null or video_asset_id is null or video_embed_url is null;

alter table public.videos
  drop constraint if exists videos_video_provider_check;
alter table public.videos
  add constraint videos_video_provider_check check (video_provider in ('youtube', 'google_drive'));

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  company text,
  project_type text,
  budget text,
  timeline text,
  message text not null,
  source_page text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  status public.enquiry_status not null default 'new',
  internal_notes text,
  notification_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_content (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- The connected project already has a wide site_settings table. These two
-- compatibility columns let the current dashboard store structured settings
-- without deleting or rewriting the existing singleton settings row.
alter table public.site_settings
  add column if not exists key text,
  add column if not exists value jsonb;

create unique index if not exists site_settings_key_unique
  on public.site_settings(key);

create index if not exists videos_public_order_idx
  on public.videos(status, display_order)
  where status = 'published';
create index if not exists enquiries_status_idx
  on public.enquiries(status, created_at desc);

alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.videos enable row level security;
alter table public.enquiries enable row level security;
alter table public.site_content enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "creativeyati public published videos" on public.videos;
create policy "creativeyati public published videos"
  on public.videos for select
  using (status = 'published');

drop policy if exists "creativeyati public categories" on public.categories;
create policy "creativeyati public categories"
  on public.categories for select
  using (is_visible = true);

drop policy if exists "creativeyati public content" on public.site_content;
create policy "creativeyati public content"
  on public.site_content for select
  using (true);

drop policy if exists "creativeyati public settings" on public.site_settings;
create policy "creativeyati public settings"
  on public.site_settings for select
  using (true);

drop policy if exists "creativeyati admins manage videos" on public.videos;
create policy "creativeyati admins manage videos"
  on public.videos for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "creativeyati admins manage categories" on public.categories;
create policy "creativeyati admins manage categories"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "creativeyati admins manage enquiries" on public.enquiries;
create policy "creativeyati admins manage enquiries"
  on public.enquiries for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "creativeyati admins manage content" on public.site_content;
create policy "creativeyati admins manage content"
  on public.site_content for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "creativeyati admins manage settings" on public.site_settings;
create policy "creativeyati admins manage settings"
  on public.site_settings for all
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.categories, public.videos, public.site_content, public.site_settings
  to anon, authenticated;
grant insert on public.enquiries to anon, authenticated;
grant all on public.categories, public.videos, public.enquiries, public.site_content, public.site_settings
  to service_role;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values(
  'project-covers',
  'project-covers',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict(id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "creativeyati public project covers" on storage.objects;
create policy "creativeyati public project covers"
  on storage.objects for select
  using (bucket_id = 'project-covers');

select
  to_regclass('public.videos') as videos_table,
  to_regclass('public.enquiries') as enquiries_table,
  to_regclass('public.site_content') as content_table,
  exists(
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'site_settings'
      and column_name = 'key'
  ) as settings_ready;
