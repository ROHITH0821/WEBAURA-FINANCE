import { getProjectsArchive } from '@/lib/data'
import NewExpenseForm, { type NewExpenseProjectOption } from './new-expense-form'

export const dynamic = 'force-dynamic'

function projectSelectLabel(p: {
  project_code?: string | null
  client_name?: string | null
  project_name?: string | null
}): string {
  const parts = [p.project_code, p.client_name, p.project_name].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'Project'
}

export default async function NewExpensePage() {
  const archive = await getProjectsArchive()
  const projects: NewExpenseProjectOption[] = (archive || []).map((p: any) => ({
    id: String(p.id),
    label: projectSelectLabel(p),
  }))

  return <NewExpenseForm projects={projects} />
}
