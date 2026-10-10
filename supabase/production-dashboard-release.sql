-- Admin account email is configured below; no placeholder replacement is needed.
-- This account must already exist in Supabase Authentication > Users.
-- Enable authenticator-app MFA in Supabase before deploying the new login flow.
-- Applying this script changes admin RLS immediately to require AAL2.
begin;

do $$
declare
  admin_email text := 'creativeyati@gmail.com';
  admin_id uuid;
begin
  if admin_email is null or position('@' in admin_email) < 2 then
    raise exception 'Set admin_email to your confirmed Supabase Auth account email.';
  end if;
  select id into admin_id from auth.users
    where lower(email) = lower(trim(admin_email)) and email_confirmed_at is not null;
  if admin_id is null then
    raise exception 'A confirmed Supabase Auth user with this email must exist first.';
  end if;
  insert into public.admin_users (id, role) values (admin_id, 'admin')
    on conflict (id) do update set role = excluded.role;
end;
$$;

-- 202610040001_admin_mfa.sql
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

-- 202610040002_invoice_receipt_settlement.sql
-- Settlement and receipt issuance must commit together. The row lock serialises
-- a manual settlement with webhook retries for the same invoice.
create or replace function public.settle_invoice_with_receipt(
  target_invoice uuid, expected_amount bigint, expected_currency text,
  settled_channel text, settled_reference text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  document public.invoices%rowtype;
  receipt_id uuid;
begin
  select * into document from public.invoices where id = target_invoice for update;
  if not found then raise exception 'Invoice not found'; end if;
  if document.total_minor <> expected_amount or document.currency <> expected_currency
    then raise exception 'Settlement does not match invoice'; end if;
  if document.status in ('void', 'declined') then raise exception 'Invoice is not payable'; end if;
  if expected_amount <= 0 then raise exception 'A payment receipt requires a positive amount'; end if;
  select id into receipt_id from public.receipts where invoice_id = target_invoice order by issued_at limit 1;
  if receipt_id is null then
    insert into public.receipts(invoice_id, receipt_number, amount_minor, currency, issued_to, channel, reference)
      values(target_invoice, public.next_receipt_number(), expected_amount, expected_currency,
        coalesce(nullif(document.client_company, ''), document.client_name),
        settled_channel, settled_reference)
      returning id into receipt_id;
  end if;
  update public.invoices set status = 'paid', paid_at = coalesce(paid_at, now()),
    payment_channel = coalesce(payment_channel, settled_channel),
    payment_reference = coalesce(payment_reference, settled_reference), updated_at = now()
    where id = target_invoice;
  return receipt_id;
end; $$;
revoke all on function public.settle_invoice_with_receipt(uuid,bigint,text,text,text) from public, anon, authenticated;
grant execute on function public.settle_invoice_with_receipt(uuid,bigint,text,text,text) to service_role;

-- 202610050001_admin_finance_summary.sql
-- Aggregate before PostgREST row limits; never combine different currencies.
create or replace function public.admin_finance_summary()
returns jsonb language plpgsql stable security invoker set search_path = public as $$
declare
  result jsonb;
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode = '42501'; end if;
  select jsonb_build_object(
    'orders', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.currency) from (
        select currency, sum(amount_minor)::text as collected_minor
        from public.orders where payment_status = 'successful' group by currency
      ) t
    ), '[]'::jsonb),
    'invoices', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.currency) from (
        select currency,
          coalesce(sum(total_minor) filter (where status = 'paid'), 0)::text as collected_minor,
          coalesce(sum(total_minor) filter (where document_type = 'invoice' and status in ('sent', 'accepted')), 0)::text as outstanding_minor,
          count(*) filter (where document_type = 'invoice' and status in ('sent', 'accepted') and due_at < now()) as overdue_count,
          count(*) as document_count
        from public.invoices group by currency
      ) t
    ), '[]'::jsonb)
  ) into result;
  return result;
end; $$;
revoke all on function public.admin_finance_summary() from public, anon;
grant execute on function public.admin_finance_summary() to authenticated;

notify pgrst, 'reload schema';
commit;

-- All three results should be non-null.
select
  to_regprocedure('public.is_admin()') as admin_access_function,
  to_regprocedure('public.settle_invoice_with_receipt(uuid,bigint,text,text,text)') as receipt_function,
  to_regprocedure('public.admin_finance_summary()') as finance_function;
