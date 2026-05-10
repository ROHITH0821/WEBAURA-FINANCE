-- FINANCE PORTAL MIGRATION 018
-- Purpose: Ensure `admin_users` exists for Finance founder access + roles.
-- The Finance Portal uses `admin_users` for:
-- - super_admin gating (Rohith)
-- - enabling/disabling founders
-- - display name in UI

create table if not exists public.admin_users (
  email text primary key,
  full_name text,
  role text not null default 'founder' check (role in ('super_admin', 'founder')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists admin_users_role_idx on public.admin_users (role);
create index if not exists admin_users_is_active_idx on public.admin_users (is_active);

