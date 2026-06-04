-- ==========================================
-- 027: Client Credentials Vault
-- ==========================================
-- Stores sensitive client operational data per finance project.
-- Run in Supabase SQL editor after finance schema is in place.

create extension if not exists "uuid-ossp";

-- 1) Main credentials table
create table if not exists finance.client_credentials (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id uuid not null references finance.projects(id) on delete cascade,
  added_by text not null,
  updated_by text,

  client_name text not null,
  client_email text,
  client_phone text,
  client_whatsapp text,
  client_alternate_phone text,
  client_business_name text,
  client_gst_number text,
  client_address text,
  client_city text,
  client_poc_name text,

  domain_name text,
  domain_registrar text,
  domain_registrar_email text,
  domain_registrar_password text,
  domain_expiry_date date,
  domain_auto_renew boolean not null default false,
  dns_provider text,
  dns_login_email text,
  dns_login_password text,

  hosting_provider text,
  hosting_plan text,
  hosting_login_email text,
  hosting_login_password text,
  hosting_expiry_date date,
  hosting_renewal_cost integer,
  server_ip text,
  cpanel_url text,
  cpanel_username text,
  cpanel_password text,
  ftp_host text,
  ftp_username text,
  ftp_password text,
  ssh_key text,

  business_email text,
  business_email_password text,
  email_provider text,
  google_workspace_admin text,
  google_workspace_password text,

  website_url text not null,
  staging_url text,
  cms_type text,
  cms_admin_url text,
  cms_username text,
  cms_password text,
  github_repo_url text,
  github_username text,
  vercel_project_url text,
  env_variables text,

  analytics_account text,
  search_console_email text,
  razorpay_account text,
  whatsapp_business_number text,
  google_maps_api_key text,
  other_integrations text,

  internal_notes text,
  project_status_notes text,
  last_accessed_by text,
  last_accessed_at timestamptz,

  constraint client_credentials_project_id_unique unique (project_id)
);

create index if not exists client_credentials_project_idx on finance.client_credentials(project_id);
create index if not exists client_credentials_domain_expiry_idx on finance.client_credentials(domain_expiry_date);
create index if not exists client_credentials_hosting_expiry_idx on finance.client_credentials(hosting_expiry_date);

drop trigger if exists trg_client_credentials_updated_at on finance.client_credentials;
create trigger trg_client_credentials_updated_at
before update on finance.client_credentials
for each row
execute function finance.handle_updated_at();

-- 2) Access audit log (append-only)
create table if not exists finance.credentials_access_log (
  id uuid primary key default uuid_generate_v4(),
  accessed_at timestamptz not null default now(),
  accessed_by text not null,
  project_id uuid references finance.projects(id) on delete set null,
  action_type text not null check (action_type in ('viewed', 'copied', 'edited')),
  field_name text,
  ip_address text
);

create index if not exists credentials_access_log_accessed_at_idx on finance.credentials_access_log(accessed_at desc);
create index if not exists credentials_access_log_project_idx on finance.credentials_access_log(project_id, accessed_at desc);

-- 3) Expiry alert deduplication
create table if not exists finance.credentials_expiry_alerts (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references finance.projects(id) on delete cascade,
  alert_type text not null check (alert_type in ('domain_expiry', 'hosting_expiry')),
  expiry_date date not null,
  alert_sent_at timestamptz,
  days_before_alert integer not null default 30,
  constraint credentials_expiry_alerts_unique unique (project_id, alert_type, expiry_date, days_before_alert)
);

create index if not exists credentials_expiry_alerts_project_idx on finance.credentials_expiry_alerts(project_id);

-- Prevent deletes on access log (no DELETE grants for app roles; service role should not delete in app code)
revoke delete on finance.credentials_access_log from authenticated, anon;
