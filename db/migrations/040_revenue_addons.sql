-- ==========================================
-- 040: Revenue Add-ons — misc / other income ledger
-- ==========================================
-- Separate from projects, recurring, and founder profit-share. Entries only add to
-- company total revenue / net profit. Safe to re-run.

create table if not exists finance.revenue_addons (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  logged_at timestamptz not null default now(),
  title text not null,
  category text not null default 'other',
  amount numeric not null check (amount > 0),
  received_date date not null,
  transaction_ref text,
  notes text,
  added_by text not null
);

create index if not exists idx_revenue_addons_received_date
  on finance.revenue_addons (received_date desc);

create index if not exists idx_revenue_addons_logged_at
  on finance.revenue_addons (logged_at desc);

comment on table finance.revenue_addons is
  'Misc / other revenue add-ons. Counts toward company totals and equal founder share.';

-- Ensure API roles can read/write (service role used by portal server).
grant usage on schema finance to anon, authenticated, service_role;
grant all privileges on table finance.revenue_addons to anon, authenticated, service_role;

-- Refresh PostgREST schema cache so finance.revenue_addons is queryable immediately.
notify pgrst, 'reload schema';
