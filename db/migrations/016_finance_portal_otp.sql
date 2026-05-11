-- ==========================================
-- 016: WebAura Finance Portal — OTP Security
-- ==========================================
-- This table manages short-lived access codes for the internal finance portal.
-- Access is restricted to emails defined in the FOUNDER_EMAILS environment variable.

-- 1) OTP Requests Table
create table if not exists public.finance_otp_requests (
    email text primary key,
    otp_secret text not null,
    otp_expires_at timestamptz not null,
    otp_attempts integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2) Security: Row Level Security (RLS)
-- This table contains sensitive secrets. Only the service role (backend) should access it.
alter table public.finance_otp_requests enable row level security;

-- Drop existing policy if it exists to avoid conflicts
drop policy if exists "Service role only access" on public.finance_otp_requests;

-- Allow service_role full access
create policy "Service role only access" 
on public.finance_otp_requests
for all 
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- 3) Auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_finance_otp_updated_at on public.finance_otp_requests;
create trigger trg_finance_otp_updated_at
    before update on public.finance_otp_requests
    for each row
    execute function public.handle_updated_at();

-- 4) Indexes for performance
create index if not exists finance_otp_expiry_idx on public.finance_otp_requests(otp_expires_at);

-- 5) Commentary
comment on table public.finance_otp_requests is 'Stores temporary 6-digit access codes for founders.';
