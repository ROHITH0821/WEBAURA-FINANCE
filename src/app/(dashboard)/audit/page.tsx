import { ShieldCheck, History, User, Database, Info, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { createClient, createStaticClient } from '@/lib/supabaseServer'
import { getFounders, getAuditLogs } from '@/lib/data'
import { requireSuperAdmin } from '@/lib/admin-gates'

export const dynamic = 'force-dynamic'

export default async function AuditPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}) {
  const gate = await requireSuperAdmin()
  if (!gate.ok) {
    return (
      <div className="glass-card bg-white p-12 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Access denied</p>
        <p className="mt-3 text-sm font-bold text-slate-700">Only super admin can view the audit ledger.</p>
      </div>
    )
  }

  const supabase = await createClient()
  const sp = await Promise.resolve(searchParams || {})
  const focus = typeof sp.focus === 'string' ? sp.focus : ''
  const limitRaw = typeof sp.limit === 'string' ? sp.limit : ''
  const limit = Math.max(5, Math.min(500, Number(limitRaw || 25)))

  // Use high-performance cached data
  const [
    { data: { user } },
    foundersData,
    auditLogsFull
  ] = await Promise.all([
    supabase.auth.getUser(),
    getFounders(),
    getAuditLogs()
  ])

  const auditLogs = (auditLogsFull || []).slice(0, limit)

  const foundersByEmail = new Map(
    (foundersData || [])
      .filter((f) => Boolean(f?.email))
      .map((f) => [String(f.email), String(f.full_name || f.email)]),
  )

  function getTimeAgo(date: string) {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="space-y-6 md:space-y-10 animate-in slide-in-from-bottom-4 duration-700">
      <div className="bg-slate-900 rounded-2xl p-6 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 shadow-2xl shadow-slate-200">
        <div className="p-3 md:p-4 rounded-2xl bg-white/10 text-white shrink-0">
          <ShieldCheck className="w-6 h-6 md:w-8 md:h-8" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white mb-1 md:mb-2 uppercase tracking-tight">Audit Log</h2>
          <p className="text-[11px] md:text-sm text-slate-400 font-medium max-w-2xl leading-relaxed">
            Immutable tracking of financial mutations with verification.
          </p>
        </div>
      </div>

      <div className="glass-card overflow-hidden bg-white">
        <div className="p-4 md:p-8 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="w-4 h-4 md:w-5 h-5 text-slate-900" />
            <h3 className="text-sm md:text-base font-black text-slate-900 uppercase tracking-tight">Real-time Activity</h3>
          </div>
          <Link
            href="/api/audit/export"
            className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors"
          >
            Download
          </Link>
        </div>

        <div className="divide-y divide-slate-50">
          {(auditLogs || []).length > 0 ? (
            (auditLogs || []).map((log) => (
              <div
                key={log.id}
                className={
                  'p-4 md:p-8 group hover:bg-[#f7f7dc]/30 transition-all ' +
                  (focus && String(log.id) === String(focus) ? 'bg-[#f7f7dc]/40 ring-1 ring-slate-200' : '')
                }
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-6 mb-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className={`px-2 py-0.5 rounded-lg text-[8px] md:text-[9px] font-black tracking-[0.2em] uppercase ${
                      log.action_type === 'INSERT' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      log.action_type === 'UPDATE' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                      'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}>
                      {log.action_type}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] md:text-xs font-black text-slate-900 uppercase tracking-tight">
                      <Database className="w-3.5 h-3.5 md:w-4 h-4 text-slate-400" />
                      {log.record_type}
                    </div>
                    <span className="text-slate-200 text-xs font-bold hidden sm:block">/</span>
                    <div className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[100px]">
                      ID: {String(log.record_id || '').slice(0, 8)}...
                    </div>
                  </div>
                  <div className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    {getTimeAgo(log.created_at)}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black text-slate-900 uppercase tracking-widest truncate max-w-[200px]">
                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-md bg-slate-100 flex items-center justify-center text-[8px] text-slate-400 shrink-0">
                      <User className="w-3 h-3" />
                    </div>
                    {foundersByEmail.get(log.action_by) || log.action_by || 'System Action'}
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 text-xs text-slate-500 font-medium overflow-hidden">
                    <Info className="w-3.5 h-3.5 md:w-4 h-4 text-slate-300 flex-shrink-0" />
                    <span className="truncate text-[10px] md:text-xs">
                      {log.action_type === 'INSERT'
                        ? `Initial Entry`
                        : log.action_type === 'DELETE'
                          ? `Deletion`
                          : `Mutation`}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 md:p-20 text-center">
              <AlertCircle className="w-8 h-8 text-slate-200 mx-auto mb-4" />
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">No activity recorded</p>
            </div>
          )}
        </div>
        
        <div className="p-6 md:p-8 border-t border-slate-50 bg-slate-50/50 text-center">
          <Link
            href={`/audit?limit=${encodeURIComponent(String(Math.min(500, limit + 50)))}`}
            className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 transition-all"
          >
            Load More
          </Link>
        </div>
      </div>
    </div>
  )
}
