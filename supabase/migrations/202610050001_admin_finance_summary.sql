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
