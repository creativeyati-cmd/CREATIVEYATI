-- Apply after provisioning a Supabase Auth user in public.admin_users.
-- This closes direct Data API access at AAL1 as well as the application guard.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((auth.jwt() ->> 'aal') = 'aal2', false)
    and exists(select 1 from public.admin_users where id = auth.uid());
$$;

-- Support both the original migrations and the SQL Editor bootstrap policy names.
-- Bootstrap policies already call is_admin(); keep those and public read policies.
drop policy if exists "admins manage all" on public.videos;
create policy "admins manage all" on public.videos for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage categories" on public.categories;
create policy "admins manage categories" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage enquiries" on public.enquiries;
create policy "admins manage enquiries" on public.enquiries for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage content" on public.site_content;
create policy "admins manage content" on public.site_content for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage settings" on public.site_settings;
create policy "admins manage settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins read logs" on public.activity_logs;
create policy "admins read logs" on public.activity_logs for select to authenticated using (public.is_admin());
