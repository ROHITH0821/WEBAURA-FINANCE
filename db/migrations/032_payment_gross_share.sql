-- ==========================================
-- 032: Gross amount + share % on payment logs
-- ==========================================
-- Nullable, additive columns on finance.payments_received and finance.recurring_payments_log.
-- `amount` / `amount_received` are NOT touched — they remain the canonical net-recognized-revenue
-- figure that dashboard-stats.ts, revenue/page.tsx, and the total_received rollup triggers already
-- sum. Existing rows are left with gross_amount/share_percentage = null (no backfill), which
-- correctly signals "recorded as a plain net amount, no gross/share breakdown available" — exactly
-- how those historical rows have always been treated. Safe to re-run.

alter table finance.payments_received
  add column if not exists gross_amount numeric;

alter table finance.payments_received
  add column if not exists share_percentage numeric;

alter table finance.payments_received
  drop constraint if exists payments_received_share_percentage_check;

alter table finance.payments_received
  add constraint payments_received_share_percentage_check
  check (share_percentage is null or (share_percentage >= 0 and share_percentage <= 100));

alter table finance.payments_received
  drop constraint if exists payments_received_gross_amount_check;

alter table finance.payments_received
  add constraint payments_received_gross_amount_check
  check (gross_amount is null or gross_amount >= 0);

alter table finance.recurring_payments_log
  add column if not exists gross_amount numeric;

alter table finance.recurring_payments_log
  add column if not exists share_percentage numeric;

alter table finance.recurring_payments_log
  drop constraint if exists recurring_payments_log_share_percentage_check;

alter table finance.recurring_payments_log
  add constraint recurring_payments_log_share_percentage_check
  check (share_percentage is null or (share_percentage >= 0 and share_percentage <= 100));

alter table finance.recurring_payments_log
  drop constraint if exists recurring_payments_log_gross_amount_check;

alter table finance.recurring_payments_log
  add constraint recurring_payments_log_gross_amount_check
  check (gross_amount is null or gross_amount >= 0);
