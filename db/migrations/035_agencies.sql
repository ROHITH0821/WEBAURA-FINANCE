-- ==========================================
-- 035: Agencies — named partners behind agency_digital_marketing revenue
-- ==========================================
-- One agency can have many projects and/or recurring clients feeding into it. This lets the
-- Revenue page roll up gross / expenses / net across ALL of an agency's projects, not just one
-- project at a time. Additive/nullable, no existing row touched.

create table if not exists finance.agencies (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  name text not null,
  default_share_percentage numeric not null default 100
    check (default_share_percentage >= 0 and default_share_percentage <= 100),
  is_active boolean not null default true,
  notes text
);

create unique index if not exists idx_agencies_name_unique on finance.agencies (lower(name));

alter table finance.projects
  add column if not exists agency_id uuid;

alter table finance.projects
  drop constraint if exists projects_agency_id_fkey;

alter table finance.projects
  add constraint projects_agency_id_fkey
  foreign key (agency_id) references finance.agencies(id) on delete set null;

create index if not exists idx_projects_agency_id on finance.projects(agency_id);

alter table finance.recurring_revenue
  add column if not exists agency_id uuid;

alter table finance.recurring_revenue
  drop constraint if exists recurring_revenue_agency_id_fkey;

alter table finance.recurring_revenue
  add constraint recurring_revenue_agency_id_fkey
  foreign key (agency_id) references finance.agencies(id) on delete set null;

create index if not exists idx_recurring_revenue_agency_id on finance.recurring_revenue(agency_id);
