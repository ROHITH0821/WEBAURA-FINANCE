-- Align finance.expense_requests with app expectations: created_at for ordering / audit UI.
-- Safe to run multiple times.

alter table if exists finance.expense_requests
  add column if not exists created_at timestamptz not null default now();

alter table if exists public.expense_requests
  add column if not exists created_at timestamptz not null default now();
