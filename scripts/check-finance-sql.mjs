import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// An isolated PostgreSQL engine: no network, production data or credentials.
const db = new PGlite();
try {
  await db.exec(`
    create role anon; create role authenticated;
    create function public.is_admin() returns boolean language sql stable as
      $$ select coalesce(current_setting('test.admin', true), '') = 'yes' $$;
    create table orders(currency text, amount_minor bigint, payment_status text);
    create table invoices(currency text, total_minor bigint, document_type text, status text, due_at timestamptz);
    grant select on orders, invoices to authenticated;
    alter table orders enable row level security;
    alter table invoices enable row level security;
    create policy admins on orders for select to authenticated using (public.is_admin());
    create policy admins on invoices for select to authenticated using (public.is_admin());
  `);
  const migration = await readFile(new URL("../supabase/migrations/202610050001_admin_finance_summary.sql", import.meta.url), "utf8");
  await db.exec(migration);
  await db.exec(migration);
  await db.exec("set role authenticated; set test.admin = 'yes';");
  const summary = async () => (await db.query("select admin_finance_summary() as summary")).rows[0].summary;
  assert.deepEqual(await summary(), { orders: [], invoices: [] });
  await db.exec(`reset role;
    insert into orders select 'NGN', 100, 'successful' from generate_series(1,1501);
    insert into orders values ('USD',250,'successful'),('NGN',99999,'failed');
    insert into invoices select 'NGN',100,'invoice','paid',null from generate_series(1,501);
    insert into invoices values
      ('NGN',200,'invoice','sent',now()-interval '1 day'),
      ('NGN',300,'invoice','accepted',now()+interval '1 day'),
      ('NGN',999,'invoice','draft',now()-interval '1 day'),
      ('NGN',999,'invoice','declined',now()-interval '1 day'),
      ('NGN',999,'invoice','void',now()-interval '1 day'),
      ('NGN',999,'quote','sent',now()-interval '1 day'),
      ('USD',700,'invoice','paid',null);
    set role authenticated;
  `);
  const result = await summary();
  assert.deepEqual(result.orders, [
    {currency:"NGN",collected_minor:"150100"},
    {currency:"USD",collected_minor:"250"},
  ]);
  assert.deepEqual(result.invoices, [
    {currency:"NGN",collected_minor:"50100",outstanding_minor:"500",overdue_count:1,document_count:507},
    {currency:"USD",collected_minor:"700",outstanding_minor:"0",overdue_count:0,document_count:1},
  ]);
  await db.exec("set test.admin = 'no';");
  await assert.rejects(summary, error => error.code === "42501");
  await db.exec("reset role; set role anon;");
  await assert.rejects(summary, error => error.code === "42501");
  console.log("Passed: empty state, uncapped totals, separate currencies, payable-only outstanding/overdue, repeatable migration and role restrictions.");
} finally {
  await db.close();
}
