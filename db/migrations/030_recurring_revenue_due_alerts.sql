-- ==========================================
-- 030: Recurring revenue due-date alert dedup
-- ==========================================
-- Run in Supabase SQL editor after 029_recurring_revenue.sql.

create schema if not exists finance;

create table if not exists finance.recurring_revenue_due_alerts (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  recurring_id uuid not null references finance.recurring_revenue(id) on delete cascade,
  due_date date not null,
  days_before_alert integer not null,
  alert_sent_at timestamptz not null default now(),
  unique (recurring_id, due_date, days_before_alert)
);

create index if not exists idx_recurring_due_alerts_recurring
  on finance.recurring_revenue_due_alerts (recurring_id, due_date);
