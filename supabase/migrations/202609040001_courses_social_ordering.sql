create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.admin_users where id = auth.uid());
$$;

create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('instagram','youtube','tiktok','vimeo','linkedin','x','behance','dribbble','whatsapp','email')),
  label text not null,
  url text not null,
  display_order integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(platform)
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  short_description text not null default '',
  description text not null default '',
  cover_image_url text,
  instructor text not null default '',
  category text not null default '',
  difficulty text not null default 'All levels' check (difficulty in ('Beginner','Intermediate','Advanced','All levels')),
  language text not null default 'English',
  estimated_duration text not null default '',
  price_minor bigint not null default 0 check (price_minor >= 0),
  discounted_price_minor bigint check (discounted_price_minor is null or discounted_price_minor >= 0),
  currency text not null default 'NGN' check (char_length(currency) = 3),
  is_free boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published','unpublished','archived')),
  featured boolean not null default false,
  learning_outcomes jsonb not null default '[]'::jsonb,
  requirements jsonb not null default '[]'::jsonb,
  target_audience jsonb not null default '[]'::jsonb,
  seo_title text,
  seo_description text,
  og_image_url text,
  display_order integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text not null default '',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id, display_order) deferrable initially deferred
);

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.course_sections(id) on delete cascade,
  title text not null,
  slug text not null,
  lesson_type text not null default 'video' check (lesson_type in ('video','pdf','text','external','mixed')),
  body text not null default '',
  video_provider text check (video_provider is null or video_provider in ('youtube','vimeo','mux','bunny','cloudflare')),
  video_asset_id text,
  video_url text,
  external_url text,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  is_preview boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(section_id, slug),
  unique(section_id, display_order) deferrable initially deferred
);

create table if not exists public.course_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  title text not null,
  storage_key text not null,
  mime_type text not null default 'application/pdf',
  file_size bigint not null default 0 check (file_size >= 0),
  allow_download boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(lesson_id, display_order) deferrable initially deferred
);

create table if not exists public.student_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric not null check (discount_value > 0),
  currency text not null default 'NGN',
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemption_count integer not null default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  student_id uuid not null references auth.users(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  amount_minor bigint not null check (amount_minor >= 0),
  original_amount_minor bigint not null check (original_amount_minor >= 0),
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  currency text not null check (char_length(currency) = 3),
  gateway text not null default 'bachs',
  checkout_id text unique,
  gateway_reference text,
  payment_status text not null default 'pending' check (payment_status in ('pending','successful','failed','abandoned','refunded')),
  payment_channel text,
  refund_status text check (refund_status is null or refund_status in ('processing','paid','failed')),
  refund_response jsonb,
  refund_requested_at timestamptz,
  refunded_at timestamptz,
  coupon_id uuid references public.coupons(id) on delete set null,
  verification_response jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  gateway text not null,
  gateway_reference text not null,
  status text not null check (status in ('pending','successful','failed','abandoned','refunded')),
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null,
  channel text,
  provider_response jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique(gateway, gateway_reference)
);

create table if not exists public.enrolments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  access_source text not null default 'purchase' check (access_source in ('purchase','manual','free')),
  granted_by uuid references auth.users(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique(student_id, course_id)
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_position integer not null default 0 check (last_position >= 0),
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(student_id, lesson_id)
);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete restrict,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.download_logs (
  id bigint generated always as identity primary key,
  student_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.course_resources(id) on delete cascade,
  order_reference text,
  downloaded_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  actor_label text,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_webhook_events (
  id bigint generated always as identity primary key,
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now(),
  unique(provider, event_id)
);

create index if not exists admin_audit_logs_entity_idx on public.admin_audit_logs(entity_type, entity_id, created_at desc);

create index if not exists social_links_public_order_idx on public.social_links(enabled, display_order);
create index if not exists courses_public_order_idx on public.courses(status, featured, display_order) where deleted_at is null;
create index if not exists course_sections_course_order_idx on public.course_sections(course_id, display_order);
create index if not exists course_lessons_section_order_idx on public.course_lessons(section_id, display_order);
create index if not exists orders_student_created_idx on public.orders(student_id, created_at desc);
create index if not exists orders_status_created_idx on public.orders(payment_status, created_at desc);
create unique index if not exists orders_one_pending_per_course_idx on public.orders(student_id, course_id) where payment_status = 'pending';
create index if not exists enrolments_student_idx on public.enrolments(student_id, active);
create index if not exists lesson_progress_student_course_idx on public.lesson_progress(student_id, course_id);

with ranked as (
  select id, row_number() over(order by display_order, created_at, id) - 1 as position
  from public.videos
)
update public.videos v set display_order = ranked.position
from ranked where ranked.id = v.id;

do $$
begin
  if not exists(select 1 from pg_constraint where conname = 'videos_display_order_unique') then
    alter table public.videos add constraint videos_display_order_unique unique(display_order) deferrable initially deferred;
  end if;
end $$;

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
  if not public.is_admin() and auth.role() <> 'service_role' then raise exception 'unauthorised'; end if;
  select count(*) into expected from public.videos;
  select count(distinct id) into supplied from unnest(video_ids) as supplied_ids(id);
  if coalesce(array_length(video_ids, 1), 0) <> expected or supplied <> expected then
    raise exception 'complete unique video order required';
  end if;
  if exists(select 1 from unnest(video_ids) as supplied_ids(id) left join public.videos v on v.id = supplied_ids.id where v.id is null) then
    raise exception 'unknown video in order';
  end if;
  set constraints videos_display_order_unique deferred;
  update public.videos v
  set display_order = ordered.position - 1, updated_at = now()
  from unnest(video_ids) with ordinality as ordered(id, position)
  where v.id = ordered.id;
end;
$$;

create or replace function public.complete_course_purchase(
  order_reference text,
  provider_reference text,
  provider_channel text,
  provider_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.orders;
  enrolment_id uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  select * into target from public.orders where reference = order_reference for update;
  if target.id is null then raise exception 'order not found'; end if;
  if target.payment_status = 'successful' then
    select id into enrolment_id from public.enrolments where student_id = target.student_id and course_id = target.course_id;
    return enrolment_id;
  end if;
  update public.orders set payment_status = 'successful', gateway_reference = provider_reference,
    payment_channel = provider_channel, verification_response = provider_payload,
    paid_at = now(), updated_at = now() where id = target.id;
  insert into public.payments(order_id, gateway, gateway_reference, status, amount_minor, currency, channel, provider_response, paid_at)
  values(target.id, target.gateway, provider_reference, 'successful', target.amount_minor, target.currency, provider_channel, provider_payload, now())
  on conflict(gateway, gateway_reference) do update set status = 'successful', provider_response = excluded.provider_response, paid_at = coalesce(public.payments.paid_at, now());
  insert into public.enrolments(student_id, course_id, order_id, access_source)
  values(target.student_id, target.course_id, target.id, case when target.amount_minor = 0 then 'free' else 'purchase' end)
  on conflict(student_id, course_id) do update set active = true, order_id = excluded.order_id, revoked_at = null
  returning id into enrolment_id;
  if target.coupon_id is not null then
    insert into public.coupon_redemptions(coupon_id, student_id, order_id)
    values(target.coupon_id, target.student_id, target.id) on conflict(order_id) do nothing;
    if found then update public.coupons set redemption_count = redemption_count + 1 where id = target.coupon_id; end if;
  end if;
  return enrolment_id;
end;
$$;

revoke all on function public.complete_course_purchase(text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.complete_course_purchase(text,text,text,jsonb) to service_role;

create or replace function public.reorder_course_sections(target_course uuid, section_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare expected integer; supplied integer;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then raise exception 'unauthorised'; end if;
  select count(*) into expected from public.course_sections where course_id = target_course;
  select count(distinct id) into supplied from unnest(section_ids) supplied_ids(id);
  if coalesce(array_length(section_ids,1),0) <> expected or supplied <> expected then raise exception 'complete section order required'; end if;
  set constraints all deferred;
  update public.course_sections s set display_order = ordered.position - 1, updated_at = now()
  from unnest(section_ids) with ordinality ordered(id, position) where s.id = ordered.id and s.course_id = target_course;
  if not found and expected > 0 then raise exception 'section order failed'; end if;
end; $$;

create or replace function public.reorder_course_lessons(target_section uuid, lesson_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare expected integer; supplied integer;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then raise exception 'unauthorised'; end if;
  select count(*) into expected from public.course_lessons where section_id = target_section;
  select count(distinct id) into supplied from unnest(lesson_ids) supplied_ids(id);
  if coalesce(array_length(lesson_ids,1),0) <> expected or supplied <> expected then raise exception 'complete lesson order required'; end if;
  set constraints all deferred;
  update public.course_lessons l set display_order = ordered.position - 1, updated_at = now()
  from unnest(lesson_ids) with ordinality ordered(id, position) where l.id = ordered.id and l.section_id = target_section;
  if not found and expected > 0 then raise exception 'lesson order failed'; end if;
end; $$;

create or replace function public.reorder_course_resources(target_lesson uuid, resource_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare expected integer; supplied integer;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then raise exception 'unauthorised'; end if;
  select count(*) into expected from public.course_resources where lesson_id = target_lesson;
  select count(distinct id) into supplied from unnest(resource_ids) supplied_ids(id);
  if coalesce(array_length(resource_ids,1),0) <> expected or supplied <> expected then raise exception 'complete resource order required'; end if;
  set constraints all deferred;
  update public.course_resources r set display_order = ordered.position - 1, updated_at = now()
  from unnest(resource_ids) with ordinality ordered(id, position) where r.id = ordered.id and r.lesson_id = target_lesson;
  if not found and expected > 0 then raise exception 'resource order failed'; end if;
end; $$;

alter table public.social_links enable row level security;
alter table public.courses enable row level security;
alter table public.course_sections enable row level security;
alter table public.course_lessons enable row level security;
alter table public.course_resources enable row level security;
alter table public.student_profiles enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.enrolments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.download_logs enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.payment_webhook_events enable row level security;

create policy "public enabled social links" on public.social_links for select using (enabled = true);
create policy "public published courses" on public.courses for select using (status = 'published' and deleted_at is null);
create policy "students read own profile" on public.student_profiles for select using (id = auth.uid());
create policy "students update own profile" on public.student_profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "students read own orders" on public.orders for select using (student_id = auth.uid());
create policy "students read own payments" on public.payments for select using (exists(select 1 from public.orders o where o.id = order_id and o.student_id = auth.uid()));
create policy "students read own enrolments" on public.enrolments for select using (student_id = auth.uid());
create policy "students manage own progress" on public.lesson_progress for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "admins manage social links" on public.social_links for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage courses" on public.courses for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage course sections" on public.course_sections for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage course lessons" on public.course_lessons for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage course resources" on public.course_resources for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage student profiles" on public.student_profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage coupons" on public.coupons for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage payments" on public.payments for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage enrolments" on public.enrolments for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage progress" on public.lesson_progress for all using (public.is_admin()) with check (public.is_admin());
create policy "admins read redemptions" on public.coupon_redemptions for select using (public.is_admin());
create policy "admins read downloads" on public.download_logs for select using (public.is_admin());
create policy "admins read audit logs" on public.admin_audit_logs for select using (public.is_admin());
create policy "admins read payment events" on public.payment_webhook_events for select using (public.is_admin());

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('profile-images', 'profile-images', true, 8388608, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('course-resources', 'course-resources', false, 26214400, array['application/pdf'])
on conflict(id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "public profile images" on storage.objects for select using (bucket_id = 'profile-images');

insert into public.site_settings(key, value)
values('course', '{"homepageEnabled":false,"homepageHeading":"Learn the process","homepageCopy":"Practical lessons for creating intentional visual work.","homepageLimit":3}'::jsonb)
on conflict(key) do nothing;
