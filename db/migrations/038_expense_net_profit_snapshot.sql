-- ==========================================
-- 038: Snapshot net profit remaining when an expense is paid
-- ==========================================
-- Stores the portal remaining balance (revenue − paid expenses) at the moment this
-- expense hits the paid ledger. Display-only historical figure — never recomputed
-- when later revenue/expenses change. Safe to re-run.

alter table finance.expense_requests
  add column if not exists net_profit_snapshot numeric;

comment on column finance.expense_requests.net_profit_snapshot is
  'Portal remaining (net profit) immediately after this expense was marked paid. Frozen snapshot.';
