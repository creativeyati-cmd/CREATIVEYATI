-- Apply in the live Supabase SQL Editor to remove mandatory administrator AAL2.
-- Administrator membership remains required. Student email verification is unchanged.
begin;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admin_users where id = auth.uid());
$$;
notify pgrst, 'reload schema';
commit;
