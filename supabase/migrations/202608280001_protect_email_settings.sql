-- Public portfolio settings remain readable, but encrypted email delivery
-- configuration is restricted to the server-side service role and admins.
drop policy if exists "public settings" on public.site_settings;
create policy "public non-sensitive settings"
on public.site_settings
for select
using (key <> 'email');
