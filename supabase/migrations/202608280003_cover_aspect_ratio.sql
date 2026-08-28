alter table public.videos
  add column if not exists cover_aspect_ratio numeric not null default (16.0 / 9.0);

update public.videos
set cover_aspect_ratio = 16.0 / 9.0
where cover_aspect_ratio is distinct from (16.0 / 9.0);

alter table public.videos
  drop constraint if exists videos_cover_aspect_ratio_check,
  add constraint videos_cover_aspect_ratio_check
  check (abs(cover_aspect_ratio - (16.0 / 9.0)) < 0.0001);
