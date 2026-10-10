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
