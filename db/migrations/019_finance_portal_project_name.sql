-- ==========================================
-- 019: WebAura Finance Portal — Project Name
-- ==========================================
-- Purpose:
-- Add a human-friendly `project_name` to `public.projects`
-- (e.g. "Acme Website Revamp") separate from `client_name`.

alter table public.projects
  add column if not exists project_name text;

create index if not exists projects_project_name_idx
  on public.projects (project_name);

