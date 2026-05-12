import Link from 'next/link'
import { createClient, createStaticClient } from '@/lib/supabaseServer'
import {
  ArrowLeft,
  Plus,
  History,
  Calendar,
  AlertCircle,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getProjectDetail, getProjectPayments, getFounders } from '@/lib/data'

export const dynamic = 'force-dynamic'

interface Project {
  id: string
  project_name: string | null
  client_name: string | null
  status: string
  project_type: string
  project_code: string
  project_lead: string | null
  agreed_value: number
  payment_structure: string | null
  total_received?: number
}

interface Payment {
  id: string
  project_id: string
  amount: number
  payment_date: string
  payment_stage: string
  verified: boolean
}

interface AdminUser {
  email: string
  full_name: string | null
  role: string
  is_active: boolean
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const resolved = await Promise.resolve(params)
  const id = String(resolved?.id || '')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const myEmail = String(user?.email || '').toLowerCase()

  // Use cached data functions
  const [project, payments, founders] = await Promise.all([
    getProjectDetail(id),
    getProjectPayments(id),
    getFounders()
  ])

  if (!project) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Project Not Found</p>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
          ID: {id || '—'}
        </p>
      </div>
    )
  }

  const foundersByEmail = new Map(
    (founders || [])
      .filter((f: any) => Boolean(f?.email))
      .map((f: any) => [String(f.email), String(f.full_name || f.email)]),
  )
  const me = (founders || []).find((f: any) => String(f.email || '').toLowerCase() === myEmail)
  const isSuperAdmin = Boolean(me?.is_active && me?.role === 'super_admin')

  const received = (payments || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0)
  const agreed = Math.max(0, Number(project.agreed_value || 0))
  const percentPaid = agreed > 0 ? Math.round((received / agreed) * 100) : 0
  const outstanding = Math.max(0, Number(project.agreed_value) - received)

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/projects"
          className="flex items-center gap-3 text-slate-400 hover:text-slate-900 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Back to Archive</span>
        </Link>
        {isSuperAdmin && (
          <div className="flex gap-3 w-full sm:w-auto">
            <Link
              href={`/projects/${id}/edit`}
              className="flex-1 sm:flex-none px-6 md:px-8 py-3 md:py-4 rounded-xl border border-slate-200 text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all text-slate-500 text-center"
            >
              Edit
            </Link>
            <button className="flex-1 sm:flex-none px-6 md:px-8 py-3 md:py-4 rounded-xl bg-slate-900 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
              Export
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <div className="glass-card p-6 md:p-10 bg-white">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8 md:mb-12">
              <div className="w-full sm:w-auto">
                <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3 md:mb-4">Project Dossier</div>
                <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase break-words">
                  {project.project_name || project.client_name}
                </h2>
                <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 md:mt-3">
                  Client: {project.client_name}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <span className={`badge-${project.status === 'active' ? 'green' : 'slate'} px-4`}>
                    {project.status}
                  </span>
                  <span className="text-slate-200 text-sm font-bold hidden sm:block">/</span>
                  <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{project.project_type}</span>
                </div>
              </div>
              <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0">
                <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">{project.project_code}</div>
                <div className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 md:mt-2">
                  Lead: {foundersByEmail.get(project.project_lead || '') || project.project_lead || 'Unassigned'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-12 py-8 md:py-12 border-y border-slate-100">
              <div>
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 md:mb-4">Total Agreed Value</p>
                <div className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">{formatCurrency(project.agreed_value)}</div>
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 md:mb-4">Capital Collected</p>
                <div className="flex items-baseline gap-2 md:gap-3">
                  <span className="text-2xl md:text-4xl font-black text-emerald-600 tracking-tight">{formatCurrency(received)}</span>
                  <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase">({percentPaid}%)</span>
                </div>
              </div>
            </div>

            <div className="pt-8 md:pt-12">
              <div className="flex justify-between items-end mb-4">
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Collection Velocity</p>
                <p className="text-[9px] md:text-[10px] font-black text-rose-500 uppercase tracking-widest">{formatCurrency(outstanding)} Remaining</p>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-slate-900 transition-all duration-1000"
                  style={{ width: `${percentPaid}%` }}
                />
              </div>
            </div>
          </div>

          <div className="glass-card overflow-hidden bg-white">
            <div className="p-4 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <History className="w-4 h-4 md:w-5 h-5 text-slate-900" />
                <h3 className="text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-widest">Transaction History</h3>
              </div>
              <Link 
                href={`/projects/${id}/payment/new`}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-200"
              >
                <Plus className="w-4 h-4" />
                Record Payment
              </Link>
            </div>
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="text-[8px] md:text-[9px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-100">
                    <th className="px-6 md:px-10 py-4 md:py-6">Date</th>
                    <th className="px-4 md:px-6 py-4 md:py-6">Stage</th>
                    <th className="px-4 md:px-6 py-4 md:py-6 text-right">Amount</th>
                    <th className="px-6 md:px-10 py-4 md:py-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(payments || []).length > 0 ? (
                    (payments || []).map((p: any) => (
                      <tr key={p.id} className="hover:bg-[#f7f7dc]/30 transition-colors">
                        <td className="px-6 md:px-10 py-6 md:py-8">
                          <div className="flex items-center gap-2 md:gap-3 text-slate-900 font-bold text-[11px] md:text-xs">
                            <Calendar className="w-3.5 h-3.5 md:w-4 h-4 text-slate-300" />
                            {new Date(p.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-6 md:py-8">
                          <span className="text-[9px] md:text-[10px] font-black text-slate-900 uppercase tracking-widest truncate max-w-[100px] inline-block">{p.payment_stage}</span>
                        </td>
                        <td className="px-4 md:px-6 py-6 md:py-8 text-right font-black text-slate-900 text-sm md:text-base">{formatCurrency(p.amount)}</td>
                        <td className="px-6 md:px-10 py-6 md:py-8 text-center">
                          <span className={p.verified ? 'badge-green' : 'badge-slate'}>
                            {p.verified ? 'verified' : 'unverified'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 md:px-10 py-12 md:py-20 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No transactions found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6 md:space-y-8">
          <div className="glass-card p-6 md:p-8 bg-white">
            <h4 className="font-black text-slate-900 text-[10px] md:text-xs mb-6 md:mb-8 uppercase tracking-widest flex items-center gap-3">
              <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded bg-slate-900" />
              Contract Metadata
            </h4>
            <div className="space-y-6 md:space-y-8">
              <div>
                <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-3">Revenue Split Clause</p>
                <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-bold uppercase tracking-tight">
                  10% Platform • 45% Lead • 45% Equal Share
                </p>
              </div>
              <div className="pt-6 md:pt-8 border-t border-slate-100">
                <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-3">Payment Structure</p>
                <p className="text-[11px] md:text-xs text-slate-500 leading-relaxed font-medium italic">
                  "{project.payment_structure}"
                </p>
              </div>
            </div>
          </div>

          {isSuperAdmin && (
            <div className="p-6 md:p-8 rounded-2xl bg-slate-900 text-white shadow-2xl shadow-slate-200/50 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <h4 className="font-black text-[10px] md:text-xs mb-6 md:mb-8 uppercase tracking-[0.3em] flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Quick Actions
              </h4>
              <div className="grid gap-3 md:gap-4 relative z-10">
                <button className="w-full py-3 md:py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300">
                  Generate Invoice
                </button>
                <button className="w-full py-3 md:py-4 rounded-xl bg-emerald-500 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-300">
                  Mark as Settled
                </button>
                <button className="w-full py-3 md:py-4 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300">
                  Request Archival
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
