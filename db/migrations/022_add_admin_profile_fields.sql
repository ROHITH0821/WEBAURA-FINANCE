-- ADMIN CONSOLE MIGRATION 022
-- Purpose: Add profile fields, expand roles, and ensure Admin Console tables exist.

-- 1. Allow 'admin' role
alter table finance.admin_users drop constraint if exists admin_users_role_check;
alter table finance.admin_users add constraint admin_users_role_check check (role in ('super_admin', 'admin', 'founder'));

-- 2. Add profile fields
alter table finance.admin_users add column if not exists designation text;
alter table finance.admin_users add column if not exists phone text;
alter table finance.admin_users add column if not exists bio text;
alter table finance.admin_users add column if not exists profile_photo_url text;
alter table finance.admin_users add column if not exists login_count int not null default 0;
alter table finance.admin_users add column if not exists last_login timestamptz;
alter table finance.admin_users add column if not exists notification_prefs jsonb not null default '{"new_lead": true, "reward_approved": true, "new_referrer": true}'::jsonb;
alter table finance.admin_users add column if not exists id uuid default gen_random_uuid() unique;
alter table finance.admin_users add column if not exists added_at timestamptz not null default now();
alter table finance.admin_users add column if not exists added_by text references finance.admin_users(email);

-- 3. Ensure Admin Console tables exist
create table if not exists finance.admin_access_log (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null references finance.admin_users(email),
  event_type text not null default 'login',
  ip_address text,
  user_agent text,
  city text,
  device text,
  success boolean not null default true,
  failure_reason text,
  created_at timestamptz not null default now()
);

create table if not exists finance.admin_invitations (
  id uuid primary key default gen_random_uuid(),
  invited_email text not null,
  invited_name text,
  invited_by text not null references finance.admin_users(email),
  invitation_token text not null unique,
  designation text,
  expires_at timestamptz not null,
  status text not null default 'pending',
  revoked_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists finance.admin_settings (
  id text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
