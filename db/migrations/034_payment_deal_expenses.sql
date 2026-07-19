-- ==========================================
-- 034: Deal expenses on payment logs
-- ==========================================
-- Corrects the gross/share model from migration 032: the agency deducts costs like salaries and
-- infrastructure from the gross amount BEFORE the remaining balance is split by share_percentage.
-- Net = (gross_amount - deal_expenses) * share_percentage / 100.
-- Nullable/additive column, no existing row touched — historical payments with no gross/share
-- breakdown are unaffected (deal_expenses stays null, same as gross_amount/share_percentage).

alter table finance.payments_received
  add column if not exists deal_expenses numeric;

alter table finance.payments_received
  drop constraint if exists payments_received_deal_expenses_check;

alter table finance.payments_received
  add constraint payments_received_deal_expenses_check
  check (deal_expenses is null or deal_expenses >= 0);

alter table finance.recurring_payments_log
  add column if not exists deal_expenses numeric;

alter table finance.recurring_payments_log
  drop constraint if exists recurring_payments_log_deal_expenses_check;

alter table finance.recurring_payments_log
  add constraint recurring_payments_log_deal_expenses_check
  check (deal_expenses is null or deal_expenses >= 0);
