-- Portfolio ordering repair. Run in the live project's Supabase SQL Editor.
-- Leaves courses, payments, admin membership and MFA policies unchanged.
begin;

create or replace function public.reorder_videos(video_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  expected integer;
  supplied integer;
begin
  if not coalesce(public.is_admin(), false)
     and not coalesce(auth.role() = 'service_role', false) then
    raise exception 'Administrator verification required' using errcode = '42501';
  end if;

  -- Serialize reorders with inserts/deletes so a complete order stays complete.
  lock table public.videos in share row exclusive mode;
  select count(*) into expected from public.videos;
  select count(distinct id) into supplied from unnest(video_ids) as ids(id);
  if coalesce(cardinality(video_ids), 0) <> expected or supplied <> expected then
    raise exception 'complete unique video order required' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(video_ids) as ids(id)
    left join public.videos v on v.id = ids.id
    where v.id is null
  ) then
    raise exception 'unknown video in order' using errcode = '22023';
  end if;

  -- Original migrations have this constraint; SQL Editor bootstrap may not.
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.videos'::regclass
      and conname = 'videos_display_order_unique' and condeferrable
  ) then
    set constraints public.videos_display_order_unique deferred;
  end if;
  update public.videos v
  set display_order = ordered.position - 1, updated_at = now()
  from unnest(video_ids) with ordinality as ordered(id, position)
  where v.id = ordered.id;
end;
$$;

revoke all on function public.reorder_videos(uuid[]) from public, anon;
grant execute on function public.reorder_videos(uuid[]) to authenticated, service_role;
notify pgrst, 'reload schema';
commit;

-- This result must not be null.
select to_regprocedure('public.reorder_videos(uuid[])') as portfolio_order_function;
