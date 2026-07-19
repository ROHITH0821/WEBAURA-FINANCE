-- ==========================================
-- 039: logged_at — full timestamp for expenses added from now on
-- ==========================================
-- Old rows stay NULL (date-only display). New inserts set logged_at = now().
-- Does NOT delete or rewrite historical expense rows. Safe to re-run.

alter table finance.expense_requests
  add column if not exists logged_at timestamptz;

comment on column finance.expense_requests.logged_at is
  'Exact local add time for expenses created after migration 039. Null = legacy date-only rows.';

create index if not exists idx_expense_requests_logged_at
  on finance.expense_requests (logged_at desc nulls last);
