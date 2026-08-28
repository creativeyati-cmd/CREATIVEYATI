alter table public.videos
  add column if not exists cover_image_url text,
  add column if not exists cover_image_storage_key text,
  add column if not exists mobile_cover_image_url text,
  add column if not exists mobile_cover_storage_key text,
  add column if not exists cover_fit text not null default 'cover',
  add column if not exists cover_focal_x numeric not null default 50,
  add column if not exists cover_focal_y numeric not null default 50,
  add column if not exists cover_alt text,
  add column if not exists cover_variants jsonb not null default '{}'::jsonb,
  add column if not exists mobile_cover_variants jsonb not null default '{}'::jsonb;

alter table public.videos
  drop constraint if exists videos_cover_fit_check,
  add constraint videos_cover_fit_check check (cover_fit in ('cover', 'contain')),
  drop constraint if exists videos_cover_focal_x_check,
  add constraint videos_cover_focal_x_check check (cover_focal_x between 0 and 100),
  drop constraint if exists videos_cover_focal_y_check,
  add constraint videos_cover_focal_y_check check (cover_focal_y between 0 and 100);

update public.videos
set
  cover_image_url = coalesce(cover_image_url, custom_poster_url),
  mobile_cover_image_url = coalesce(mobile_cover_image_url, mobile_poster_url),
  cover_fit = coalesce(display_mode, cover_fit, 'cover'),
  cover_focal_x = coalesce(focal_x * 100, cover_focal_x, 50),
  cover_focal_y = coalesce(focal_y * 100, cover_focal_y, 50)
where cover_image_url is null
   or mobile_cover_image_url is null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-covers',
  'project-covers',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public project cover images" on storage.objects;
create policy "public project cover images"
on storage.objects for select
using (bucket_id = 'project-covers');
