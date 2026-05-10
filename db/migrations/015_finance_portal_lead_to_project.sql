-- ==========================================
-- 015: WebAura Finance Portal — Lead → Project
-- ==========================================
-- Creates a project automatically when a lead status changes to 'Converted'.
--
-- Supports either leads table name:
-- - public.contact_submissions
-- - public.leads
--
-- Requires the leads table to have:
-- - id, name, email, phone, status (text)
-- Optional:
-- - status_updated_by (text) to store the converting admin email

create or replace function public.tg_lead_converted_to_project()
returns trigger
language plpgsql
as $$
declare
  updater text;
begin
  if (tg_op <> 'UPDATE') then
    return new;
  end if;

  if (old.status is distinct from new.status and new.status = 'Converted') then
    updater := coalesce(nullif(new.status_updated_by, ''), 'unknown');

    insert into public.projects(
      client_name,
      client_email,
      client_phone,
      lead_id,
      project_type,
      agreed_value,
      payment_structure,
      advance_amount,
      status,
      project_lead,
      notes
    ) values (
      new.name,
      new.email,
      new.phone,
      new.id,
      'basic',
      0,
      'custom',
      null,
      'active',
      updater,
      'Auto-created from converted lead. Please update agreed value and payment structure.'
    );
  end if;

  return new;
end;
$$;

do $$
begin
  if to_regclass('public.contact_submissions') is not null then
    execute 'drop trigger if exists trg_lead_converted_to_project on public.contact_submissions';
    execute 'create trigger trg_lead_converted_to_project after update on public.contact_submissions for each row execute function public.tg_lead_converted_to_project()';
  elsif to_regclass('public.leads') is not null then
    execute 'drop trigger if exists trg_lead_converted_to_project on public.leads';
    execute 'create trigger trg_lead_converted_to_project after update on public.leads for each row execute function public.tg_lead_converted_to_project()';
  else
    raise notice 'Finance: skipping lead->project trigger because no leads table was detected.';
  end if;
end
$$;

