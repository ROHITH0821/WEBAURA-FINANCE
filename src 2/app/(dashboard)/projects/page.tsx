import Link from 'next/link'
import { Plus, Search, Filter, ExternalLink } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getProjectsArchive, getFounders } from '@/lib/data'

export default async function ProjectsPage() {
  // Use high-performance cached data
  const [projects, foundersData] = await Promise.all([
    getProjectsArchive(),
    getFounders()
  ])

  const foundersByEmail = new Map(
    (foundersData || [])
      .filter((f) => Boolean(f?.email))
      .map((f) => [String(f.email), String(f.full_name || f.email)]),
  )

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2 uppercase">Project Archive</h2>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">
            Financial breakdown and collection tracking • {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link 
          href="/projects/new"
          className="flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-black transition-all shadow-xl shadow-slate-200 uppercase tracking-widest text-[10px]"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      <div className="glass-card overflow-hidden bg-white">
        <div className="p-8 border-b border-slate-100 flex flex-wrap gap-6 items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search projects by ID or client..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-xs outline-none focus:border-slate-900 transition-all font-medium"
            />
          </div>
          <div className="flex gap-4">
            <button className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-[10px] font-black uppercase tracking-widest text-slate-500">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] border-b border-slate-100 bg-slate-50/50">
                <th className="px-10 py-6">Project ID</th>
                <th className="px-6 py-6">Client Details</th>
                <th className="px-6 py-6 text-right">Contract Value</th>
                <th className="px-6 py-6 text-right">Collected</th>
                <th className="px-6 py-6 text-right">Outstanding</th>
                <th className="px-6 py-6">Lead Founder</th>
                <th className="px-10 py-6 text-center">Status</th>
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
                      <td className="px-10 py-8">
                        <Link href={`/projects/${project.id}`} className="font-black text-slate-900 hover:translate-x-1 transition-transform flex items-center gap-2 uppercase tracking-tight">
                          {project.project_code}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </td>
                      <td className="px-6 py-8">
                        <div className="font-black text-slate-900 uppercase tracking-tight text-sm">
                          {project.project_name || project.client_name}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                          {project.client_name} • {project.project_type}
                        </div>
                      </td>
                      <td className="px-6 py-8 text-right font-black text-slate-400 text-sm">
                        {formatCurrency(project.agreed_value)}
                      </td>
                      <td className="px-6 py-8 text-right">
                        <div className="font-black text-emerald-600 text-base">{formatCurrency(project.received)}</div>
                        <div className="w-24 h-1 bg-slate-100 rounded-full mt-2 ml-auto overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full" 
                            style={{ width: `${percentPaid}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-8 text-right font-black text-rose-500 text-base">
                        {project.outstanding > 0 ? formatCurrency(project.outstanding) : 'Settled'}
                      </td>
                      <td className="px-6 py-8">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-[10px] font-black text-white uppercase tracking-tighter">
                            {leadFounder[0]}
                          </div>
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{leadFounder}</span>
                        </div>
                      </td>
                      <td className="px-10 py-8 text-center">
                        <span className={project.status === 'active' ? 'badge-green' : 'badge-slate'}>
                          {project.status}
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-10 py-20 text-center">
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
