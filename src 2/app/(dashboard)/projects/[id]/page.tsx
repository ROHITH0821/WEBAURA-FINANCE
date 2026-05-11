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

export const dynamic = 'force-dynamic'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const resolved = await Promise.resolve(params)
  const id = String(resolved?.id || '')

  const supabase = await createClient()
  const admin = createStaticClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const myEmail = String(user?.email || '').toLowerCase()

  // Read via admin client so page never "randomly" fails under RLS.
  const [{ data: project, error: projectErr }, { data: payments }, { data: founders }] = await Promise.all([
    admin.from('projects').select('*').eq('id', id).maybeSingle(),
    admin.from('payments_received').select('*').eq('project_id', id).order('payment_date', { ascending: false }),
    admin.from('admin_users').select('email, full_name, role, is_active'),
  ])

  if (projectErr || !project) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Project Not Found</p>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
          ID: {id || '—'}
        </p>
        {projectErr?.message ? (
          <p className="text-[10px] font-bold text-rose-600 max-w-xl text-center">
            {projectErr.message}
          </p>
        ) : null}
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
  const agreed = Math.max(0, Number((project as any).agreed_value || 0))
  const percentPaid = agreed > 0 ? Math.round((received / agreed) * 100) : 0
  const outstanding = Math.max(0, Number((project as any).agreed_value) - received)

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <Link
          href="/projects"
          className="flex items-center gap-3 text-slate-400 hover:text-slate-900 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Back to Archive</span>
        </Link>
        {isSuperAdmin && (
          <div className="flex gap-4">
            <Link
              href={`/projects/${id}/edit`}
              className="px-8 py-4 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all text-slate-500"
            >
              Edit Details
            </Link>
            <button className="px-8 py-4 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
              Export Audit
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-10 bg-white">
            <div className="flex justify-between items-start mb-12">
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Project Dossier</div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">
                  {(project as any).project_name || (project as any).client_name}
                </h2>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3">
                  Client: {(project as any).client_name}
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <span className={`badge-${(project as any).status === 'active' ? 'green' : 'slate'} px-4`}>
                    {(project as any).status}
                  </span>
                  <span className="text-slate-200 text-sm font-bold">/</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{(project as any).project_type}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-slate-900 tracking-tighter">{(project as any).project_code}</div>
                <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">
                  Lead: {foundersByEmail.get((project as any).project_lead) || (project as any).project_lead || 'Unassigned'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 py-12 border-y border-slate-100">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Total Agreed Value</p>
                <div className="text-4xl font-black text-slate-900 tracking-tight">{formatCurrency((project as any).agreed_value)}</div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Capital Collected</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-black text-emerald-600 tracking-tight">{formatCurrency(received)}</span>
                  <span className="text-xs font-black text-slate-400 uppercase">({percentPaid}%)</span>
                </div>
              </div>
            </div>

            <div className="pt-12">
              <div className="flex justify-between items-end mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Collection Velocity</p>
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{formatCurrency(outstanding)} Remaining</p>
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
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-slate-900" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Transaction History</h3>
              </div>
              <Link 
                href={`/projects/${id}/payment/new`}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-200"
              >
                <Plus className="w-4 h-4" />
                Record Payment
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[9px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-100">
                    <th className="px-10 py-6">Date</th>
                    <th className="px-6 py-6">Stage</th>
                    <th className="px-6 py-6 text-right">Amount</th>
                    <th className="px-10 py-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(payments || []).length > 0 ? (
                    (payments || []).map((p: any) => (
                      <tr key={p.id} className="hover:bg-[#f7f7dc]/30 transition-colors">
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-3 text-slate-900 font-bold text-xs">
                            <Calendar className="w-4 h-4 text-slate-300" />
                            {new Date(p.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="px-6 py-8">
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{p.payment_stage}</span>
                        </td>
                        <td className="px-6 py-8 text-right font-black text-slate-900 text-base">{formatCurrency(p.amount)}</td>
                        <td className="px-10 py-8 text-center">
                          <span className={p.verified ? 'badge-green' : 'badge-slate'}>
                            {p.verified ? 'verified' : 'unverified'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-10 py-20 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No transactions found in ledger</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="glass-card p-8 bg-white">
            <h4 className="font-black text-slate-900 text-xs mb-8 uppercase tracking-widest flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-slate-900" />
              Contract Metadata
            </h4>
            <div className="space-y-8">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Revenue Split Clause</p>
                <p className="text-sm text-slate-700 leading-relaxed font-bold uppercase tracking-tight">
                  10% Platform • 45% Lead • 45% Equal Share
                </p>
              </div>
              <div className="pt-8 border-t border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Payment Structure</p>
                <p className="text-xs text-slate-500 leading-relaxed font-medium italic">
                  "{(project as any).payment_structure}"
                </p>
              </div>
            </div>
          </div>

          {isSuperAdmin && (
            <div className="glass-card p-8 bg-slate-900 text-white border-none shadow-2xl shadow-slate-200">
              <h4 className="font-black text-xs mb-8 uppercase tracking-[0.3em]">Quick Actions</h4>
              <div className="grid gap-4">
                <button className="w-full py-5 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest transition-all">
                  Generate Invoice
                </button>
                <button className="w-full py-5 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all">
                  Mark as Settled
                </button>
                <button className="w-full py-5 rounded-xl text-slate-500 hover:text-rose-500 text-[10px] font-black uppercase tracking-widest transition-all">
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
