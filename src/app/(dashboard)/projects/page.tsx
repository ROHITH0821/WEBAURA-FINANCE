import { getProjectsArchive, getFounders } from '@/lib/data'
import ProjectsArchiveClient from './projects-archive-client'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const [allProjects, foundersData] = await Promise.all([getProjectsArchive(), getFounders()])

  const foundersByEmail: Record<string, string> = Object.fromEntries(
    (foundersData || [])
      .filter((f) => Boolean(f?.email))
      .map((f) => [String(f.email), String(f.full_name || f.email)]),
  )

  const projects = (allProjects || []).map((p: any) => ({
    id: String(p.id),
    project_code: p.project_code ?? null,
    project_name: p.project_name ?? null,
    client_name: p.client_name ?? null,
    project_type: p.project_type ?? null,
    project_lead: p.project_lead ?? null,
    status: p.status ?? null,
    agreed_value: p.agreed_value ?? 0,
    received: p.received ?? 0,
    outstanding: p.outstanding ?? 0,
  }))

  return <ProjectsArchiveClient projects={projects} foundersByEmail={foundersByEmail} />
}
