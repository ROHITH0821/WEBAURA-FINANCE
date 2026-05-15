import Link from 'next/link'
import { Plus, ExternalLink, Briefcase } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getProjectsArchive, getFounders } from '@/lib/data'
import SearchInput from '@/components/SearchInput'

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}) {
  const sp = (await searchParams) || {}
  const searchParam = String(Array.isArray(sp.q) ? sp.q[0] : sp.q || '').toLowerCase()

  const [allProjects, foundersData] = await Promise.all([getProjectsArchive(), getFounders()])

  const foundersByEmail = new Map(
    (foundersData || [])
      .filter((f) => Boolean(f?.email))
      .map((f) => [String(f.email), String(f.full_name || f.email)]),
  )

  const projects = allProjects.filter((p) => {
    if (!searchParam) return true
    const code = String(p.project_code || '').toLowerCase()
    const name = String(p.project_name || '').toLowerCase()
    const client = String(p.client_name || '').toLowerCase()
    const type = String(p.project_type || '').toLowerCase()
    const leadKey = String(p.project_lead || '').toLowerCase()
    const leadLabel = String(foundersByEmail.get(String(p.project_lead || '')) || p.project_lead || '').toLowerCase()
    return (
      code.includes(searchParam) ||
      name.includes(searchParam) ||
      client.includes(searchParam) ||
      type.includes(searchParam) ||
      leadKey.includes(searchParam) ||
      leadLabel.includes(searchParam)
    )
  })

  return (
    <div className="mx-auto min-w-0 max-w-full space-y-6 md:space-y-10 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
      <div className="flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <h2 className="mb-2 text-2xl font-black uppercase tracking-tight text-slate-900 md:text-3xl">
            Project Archive
          </h2>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 md:text-[10px]">
            Financial breakdown and collection tracking •{' '}
            {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link
          href="/projects/new"
          className="flex w-full shrink-0 items-center justify-center gap-3 rounded-xl bg-slate-900 px-6 py-3 text-[9px] font-black uppercase tracking-widest text-white shadow-xl shadow-slate-200 transition-colors hover:bg-slate-800 sm:w-auto md:px-8 md:py-4 md:text-[10px]"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </div>

      <div className="glass-card min-w-0 overflow-hidden bg-white">
        <div className="border-b border-slate-100 p-4 md:p-8">
          <SearchInput placeholder="Search by code, name, client, type, or lead…" />
        </div>

        <div className="min-w-0">
          {projects.length > 0 ? (
            <div className="min-w-0 divide-y divide-slate-100">
              {projects.map((project) => {
                const agreed = Math.max(0, Number(project.agreed_value || 0))
                const percentPaid = agreed > 0 ? (Number(project.received || 0) / agreed) * 100 : 0
                const leadFounder =
                  foundersByEmail.get(String(project.project_lead || '')) ||
                  project.project_lead ||
                  'Unassigned'

                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block min-w-0 touch-manipulation px-4 py-5 transition-colors hover:bg-[#f7f7dc]/25 md:px-8 md:py-6"
                  >
                    <div className="flex min-w-0 flex-col gap-3">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2">
                          <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" aria-hidden />
                          <div className="min-w-0">
                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Project ID</p>
                            <p className="flex min-w-0 items-center gap-2 font-black uppercase tracking-tight text-slate-900">
                              <span className="truncate text-sm">{project.project_code}</span>
                              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                            </p>
                          </div>
                        </div>
                        <span className={project.status === 'active' ? 'badge-green shrink-0' : 'badge-slate shrink-0'}>
                          {project.status}
                        </span>
                      </div>

                      <div className="min-w-0 border-t border-slate-100 pt-3">
                        <p className="break-words font-black uppercase tracking-tight text-slate-900 text-sm leading-snug">
                          {project.project_name || project.client_name || '—'}
                        </p>
                        <p className="mt-1 break-words text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          {project.client_name || '—'} • {project.project_type || '—'}
                        </p>
                      </div>

                      <dl className="grid min-w-0 grid-cols-1 gap-2.5 text-[9px] font-black uppercase tracking-wider text-slate-500 sm:grid-cols-3 sm:gap-3">
                        <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                          <dt className="text-slate-400">Contract</dt>
                          <dd className="mt-1 truncate tabular-nums text-xs text-slate-900 md:text-sm">
                            {formatCurrency(project.agreed_value)}
                          </dd>
                        </div>
                        <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                          <dt className="text-slate-400">Collected</dt>
                          <dd className="mt-1 truncate tabular-nums text-xs text-emerald-600 md:text-sm">
                            {formatCurrency(project.received)}
                          </dd>
                          <div className="mt-2 h-1 w-full max-w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${Math.min(100, percentPaid)}%` }}
                            />
                          </div>
                        </div>
                        <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                          <dt className="text-slate-400">Outstanding</dt>
                          <dd className="mt-1 truncate tabular-nums text-xs text-rose-600 md:text-sm">
                            {Number(project.outstanding) > 0 ? formatCurrency(project.outstanding) : 'Settled'}
                          </dd>
                        </div>
                      </dl>

                      <div className="flex min-w-0 items-center gap-2 border-t border-slate-100 pt-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-black uppercase tracking-tighter text-white">
                          {String(leadFounder)[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Lead founder</p>
                          <p className="truncate text-[10px] font-black uppercase tracking-wide text-slate-900">
                            {leadFounder}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="px-6 py-16 text-center md:px-10 md:py-24">
              <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
                  <Briefcase className="h-6 w-6 text-slate-200" />
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-900">
                    {searchParam ? 'No matching projects' : 'Archive Empty'}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    {searchParam ? 'Try a different search term or code' : 'Historical projects will appear here'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
