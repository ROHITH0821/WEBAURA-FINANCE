-- ==========================================
-- 037: Dynamic expense category catalog
-- ==========================================
-- Replaces the hard-coded CHECK enum with a catalog table. Existing category slugs are seeded
-- unchanged so historical expense_requests rows keep working. New categories can be added at
-- runtime without a migration. Safe to re-run.

create table if not exists finance.expense_categories (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  slug text not null,
  label text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  is_system boolean not null default false
);

create unique index if not exists idx_expense_categories_slug on finance.expense_categories (slug);

insert into finance.expense_categories (slug, label, sort_order, is_system) values
  ('infrastructure', 'Infrastructure', 10, true),
  ('tools', 'Tools', 20, true),
  ('marketing', 'Marketing', 30, true),
  ('travel', 'Travel', 40, true),
  ('client_work', 'Client Work', 50, true),
  ('team', 'Team', 60, true),
  ('subscriptions', 'Subscriptions', 70, true),
  ('salaries', 'Salaries', 80, true),
  ('agency_payout', 'Agency Payout', 90, true),
  ('office', 'Office', 100, true),
  ('miscellaneous', 'Miscellaneous', 110, true),
  ('other', 'Other', 120, true)
on conflict (slug) do nothing;

alter table finance.expense_requests
  drop constraint if exists expense_requests_category_check;

alter table finance.expense_requests
  drop constraint if exists expense_requests_category_fkey;

alter table finance.expense_requests
  add constraint expense_requests_category_fkey
  foreign key (category) references finance.expense_categories (slug)
  on delete restrict;
