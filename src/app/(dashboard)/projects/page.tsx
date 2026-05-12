import Link from 'next/link'
import { Plus, Filter, ExternalLink } from 'lucide-react'
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

  // Use high-performance cached data
  const [allProjects, foundersData] = await Promise.all([
    getProjectsArchive(),
    getFounders()
  ])

  const projects = allProjects.filter((p) => {
    if (!searchParam) return true
    const code = String(p.project_code || '').toLowerCase()
    const name = String(p.project_name || '').toLowerCase()
    const client = String(p.client_name || '').toLowerCase()
    const type = String(p.project_type || '').toLowerCase()
    return code.includes(searchParam) || name.includes(searchParam) || client.includes(searchParam) || type.includes(searchParam)
  })

  const foundersByEmail = new Map(
    (foundersData || [])
      .filter((f) => Boolean(f?.email))
      .map((f) => [String(f.email), String(f.full_name || f.email)]),
  )

  return (
    <div className="space-y-6 md:space-y-10 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mb-2 uppercase">Project Archive</h2>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px]">
            Financial breakdown and collection tracking • {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link 
          href="/projects/new"
          className="flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-black transition-all shadow-xl shadow-slate-200 uppercase tracking-widest text-[9px] md:text-[10px] w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      <div className="glass-card overflow-hidden bg-white">
        <div className="p-4 md:p-8 border-b border-slate-100 flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center justify-between">
          <SearchInput placeholder="Search projects by code, name or client..." />
          <div className="flex gap-4 w-full md:w-auto">
            <button className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 w-full md:w-auto">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 md:px-10 py-4 md:py-6">Project ID</th>
                <th className="px-6 py-4 md:py-6">Client Details</th>
                <th className="px-6 py-4 md:py-6 text-right">Contract Value</th>
                <th className="px-6 py-4 md:py-6 text-right">Collected</th>
                <th className="px-6 py-4 md:py-6 text-right">Outstanding</th>
                <th className="px-6 py-4 md:py-6">Lead Founder</th>
                <th className="px-6 md:px-10 py-4 md:py-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.length > 0 ? (
                projects.map((project) => {
                  const agreed = Math.max(0, Number(project.agreed_value || 0))
                  const percentPaid = agreed > 0 ? (Number(project.received || 0) / agreed) * 100 : 0
                  const leadFounder =
                    foundersByEmail.get(String(project.project_lead || '')) ||
                    project.project_lead ||
                    'Unassigned'
                  
                  return (
                    <tr key={project.id} className="group hover:bg-[#f7f7dc]/30 transition-colors">
                      <td className="px-6 md:px-10 py-6 md:py-8">
                        <Link href={`/projects/${project.id}`} className="font-black text-slate-900 hover:translate-x-1 transition-transform flex items-center gap-2 uppercase tracking-tight text-xs">
                          {project.project_code}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </td>
                      <td className="px-6 py-6 md:py-8">
                        <div className="font-black text-slate-900 uppercase tracking-tight text-xs md:text-sm truncate max-w-[200px]">
                          {project.project_name || project.client_name}
                        </div>
                        <div className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 truncate max-w-[200px]">
                          {project.client_name} • {project.project_type}
                        </div>
                      </td>
                      <td className="px-6 py-6 md:py-8 text-right font-black text-slate-400 text-xs md:text-sm">
                        {formatCurrency(project.agreed_value)}
                      </td>
                      <td className="px-6 py-6 md:py-8 text-right">
                        <div className="font-black text-emerald-600 text-sm md:text-base">{formatCurrency(project.received)}</div>
                        <div className="w-20 md:w-24 h-1 bg-slate-100 rounded-full mt-2 ml-auto overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full" 
                            style={{ width: `${percentPaid}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-6 md:py-8 text-right font-black text-rose-500 text-sm md:text-base">
                        {project.outstanding > 0 ? formatCurrency(project.outstanding) : 'Settled'}
                      </td>
                      <td className="px-6 py-6 md:py-8">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-slate-900 flex items-center justify-center text-[8px] md:text-[10px] font-black text-white uppercase tracking-tighter">
                            {leadFounder[0]}
                          </div>
                          <span className="text-[9px] md:text-[10px] font-black text-slate-900 uppercase tracking-widest truncate max-w-[100px]">{leadFounder}</span>
                        </div>
                      </td>
                      <td className="px-6 md:px-10 py-6 md:py-8 text-center">
                        <span className={project.status === 'active' ? 'badge-green' : 'badge-slate'}>
                          {project.status}
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 md:px-10 py-12 md:py-20 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No projects initialized in archive</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
