-- ==========================================
-- 031: Revenue Type tagging + default share %
-- ==========================================
-- Adds revenue_type + share_percentage to finance.projects and finance.recurring_revenue.
-- Additive/backward-compatible: every existing row is backfilled to 'direct_client' / 100,
-- which reproduces today's implicit behavior exactly (amount already = 100% recognized revenue).
-- No existing column, row, or value is renamed, dropped, or altered. Safe to re-run.

-- 1) projects
alter table finance.projects
  add column if not exists revenue_type text;

alter table finance.projects
  add column if not exists share_percentage numeric;

update finance.projects
  set revenue_type = 'direct_client'
  where revenue_type is null;

update finance.projects
  set share_percentage = 100
  where share_percentage is null;

alter table finance.projects
  alter column revenue_type set default 'direct_client';

alter table finance.projects
  alter column share_percentage set default 100;

alter table finance.projects
  alter column revenue_type set not null;

alter table finance.projects
  alter column share_percentage set not null;

alter table finance.projects
  drop constraint if exists projects_revenue_type_check;

alter table finance.projects
  add constraint projects_revenue_type_check
  check (revenue_type in ('agency_digital_marketing','website_maintenance','direct_client'));

alter table finance.projects
  drop constraint if exists projects_share_percentage_check;

alter table finance.projects
  add constraint projects_share_percentage_check
  check (share_percentage >= 0 and share_percentage <= 100);

create index if not exists idx_projects_revenue_type on finance.projects(revenue_type);

-- 2) recurring_revenue
alter table finance.recurring_revenue
  add column if not exists revenue_type text;

alter table finance.recurring_revenue
  add column if not exists share_percentage numeric;

update finance.recurring_revenue
  set revenue_type = 'direct_client'
  where revenue_type is null;

update finance.recurring_revenue
  set share_percentage = 100
  where share_percentage is null;

alter table finance.recurring_revenue
  alter column revenue_type set default 'direct_client';

alter table finance.recurring_revenue
  alter column share_percentage set default 100;

alter table finance.recurring_revenue
  alter column revenue_type set not null;

alter table finance.recurring_revenue
  alter column share_percentage set not null;

alter table finance.recurring_revenue
  drop constraint if exists recurring_revenue_revenue_type_check;

alter table finance.recurring_revenue
  add constraint recurring_revenue_revenue_type_check
  check (revenue_type in ('agency_digital_marketing','website_maintenance','direct_client'));

alter table finance.recurring_revenue
  drop constraint if exists recurring_revenue_share_percentage_check;

alter table finance.recurring_revenue
  add constraint recurring_revenue_share_percentage_check
  check (share_percentage >= 0 and share_percentage <= 100);

create index if not exists idx_recurring_revenue_revenue_type on finance.recurring_revenue(revenue_type);
