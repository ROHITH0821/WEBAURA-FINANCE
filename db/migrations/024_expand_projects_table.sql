-- ==========================================
-- 024: WebAura Admin Console — Expand Projects Table
-- ==========================================
-- This migration adds missing columns to the 'projects' table to support
-- the Admin Console's portfolio management features.

alter table finance.projects add column if not exists client text;
alter table finance.projects add column if not exists tagline text;
alter table finance.projects add column if not exists brief text;
alter table finance.projects add column if not exists category text;
alter table finance.projects add column if not exists image_url text;
alter table finance.projects add column if not exists video_url text;
alter table finance.projects add column if not exists live_url text;
alter table finance.projects add column if not exists tech_stack jsonb not null default '[]'::jsonb;
alter table finance.projects add column if not exists order_index integer not null default 0;
alter table finance.projects add column if not exists is_published boolean not null default true;
alter table finance.projects add column if not exists is_featured boolean not null default true;
alter table finance.projects add column if not exists slug text;

-- Ensure name exists (if renamed from project_name)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'finance' and table_name = 'projects' and column_name = 'name') then
    alter table finance.projects add column name text;
    update finance.projects set name = project_name where name is null;
  end if;
end
$$;

create index if not exists idx_projects_order_index on finance.projects(order_index);
create index if not exists idx_projects_slug on finance.projects(slug);
create index if not exists idx_projects_is_published on finance.projects(is_published);
