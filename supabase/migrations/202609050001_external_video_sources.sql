-- Project videos remain externally hosted. This migration stores only provider
-- links and playback metadata for YouTube and publicly shared Google Drive files.

do $$
begin
  if to_regclass('public.videos') is null then
    raise exception 'Run 202608270001_initial.sql before this migration.';
  end if;
end $$;

alter table public.videos
  add column if not exists video_provider text not null default 'youtube',
  add column if not exists video_url text,
  add column if not exists video_asset_id text,
  add column if not exists video_embed_url text,
  add column if not exists video_thumbnail_url text;

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
where video_url is null
   or video_asset_id is null
   or video_embed_url is null;

alter table public.videos
  alter column video_url set not null,
  alter column video_asset_id set not null,
  alter column video_embed_url set not null,
  drop constraint if exists videos_video_provider_check,
  add constraint videos_video_provider_check check (video_provider in ('youtube', 'google_drive'));

do $$
begin
  if to_regclass('public.course_lessons') is not null then
    execute 'alter table public.course_lessons drop constraint if exists course_lessons_video_provider_check';
    execute $constraint$
      alter table public.course_lessons
      add constraint course_lessons_video_provider_check
      check (video_provider is null or video_provider in ('youtube','google_drive','vimeo','mux','bunny','cloudflare'))
    $constraint$;
  end if;
end $$;
