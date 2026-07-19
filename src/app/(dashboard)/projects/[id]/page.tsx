import Link from 'next/link'
import { createClient } from '@/lib/supabaseServer'
import { AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
  getProjectDetail,
  getProjectPayments,
  getProjectExpenses,
  getCredentialsMetadata,
  getFounders,
} from '@/lib/data'
import { Suspense } from 'react'
import ProjectDetailClient from '@/components/ProjectDetailClient'
import ProjectDetailBackButton from './project-detail-back-button'

export const dynamic = 'force-dynamic'

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

  const [project, payments, expenses, credentialsMeta, founders] = await Promise.all([
    getProjectDetail(id),
    getProjectPayments(id),
    getProjectExpenses(id),
    getCredentialsMetadata(id),
    getFounders(),
  ])

  if (!project) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Project Not Found</p>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">ID: {id || '—'}</p>
      </div>
    )
  }

  const foundersByEmail: Record<string, string> = Object.fromEntries(
    (founders || [])
      .filter((f: { email?: string }) => Boolean(f?.email))
      .map((f: { email: string; full_name?: string }) => [
        String(f.email).toLowerCase(),
        String(f.full_name || f.email),
      ]),
  )
  const me = (founders || []).find(
    (f: { email?: string }) => String(f.email || '').toLowerCase() === myEmail,
  )
  const isSuperAdmin = Boolean(me?.is_active && me?.role === 'super_admin')

  const received = (payments || []).reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0)
  const agreed = Math.max(0, Number(project.agreed_value || 0))
  const percentPaid = agreed > 0 ? Math.round((received / agreed) * 100) : 0
  const outstanding = Math.max(0, Number(project.agreed_value) - received)

  const defaultWebsiteUrl =
    credentialsMeta?.website_url ||
    (project as { live_url?: string }).live_url ||
    ''

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <ProjectDetailBackButton />
        {isSuperAdmin ? (
          <div className="flex gap-3 w-full sm:w-auto">
            <Link
              href={`/projects/${id}/edit`}
              className="flex-1 sm:flex-none px-6 md:px-8 py-3 md:py-4 rounded-xl border border-slate-200 text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 text-slate-500 text-center"
            >
              Edit
            </Link>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <div className="glass-card p-6 md:p-10 bg-white">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8 md:mb-12">
              <div className="w-full sm:w-auto">
                <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3 md:mb-4">
                  Project Dossier
                </div>
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
                  <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {project.project_type}
                  </span>
                </div>
              </div>
              <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0">
                <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">
                  {project.project_code}
                </div>
                <div className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 md:mt-2">
                  Lead:{' '}
                  {foundersByEmail[String(project.project_lead || '').toLowerCase()] ||
                    project.project_lead ||
                    'Unassigned'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-12 py-8 md:py-12 border-y border-slate-100">
              <div>
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 md:mb-4">
                  Total Agreed Value
                </p>
                <div className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">
                  {formatCurrency(project.agreed_value)}
                </div>
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 md:mb-4">
                  Capital Collected
                </p>
                <div className="flex items-baseline gap-2 md:gap-3">
                  <span className="text-2xl md:text-4xl font-black text-emerald-600 tracking-tight">
                    {formatCurrency(received)}
                  </span>
                  <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase">({percentPaid}%)</span>
                </div>
              </div>
            </div>

            <div className="pt-8 md:pt-12">
              <div className="flex justify-between items-end mb-4">
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Collection Velocity
                </p>
                <p className="text-[9px] md:text-[10px] font-black text-rose-500 uppercase tracking-widest">
                  {formatCurrency(outstanding)} Remaining
                </p>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-900 transition-all duration-1000" style={{ width: `${percentPaid}%` }} />
              </div>
            </div>
          </div>

          <Suspense
            fallback={
              <div className="glass-card p-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                Loading…
              </div>
            }
          >
            <ProjectDetailClient
              project={project}
              payments={payments || []}
              expenses={expenses || []}
              foundersByEmail={foundersByEmail}
              vaultHasRecord={Boolean(credentialsMeta)}
              defaultWebsiteUrl={defaultWebsiteUrl}
            />
          </Suspense>
        </div>

        <div className="space-y-6 md:space-y-8">
          <div className="glass-card p-6 md:p-8 bg-white">
            <h4 className="font-black text-slate-900 text-[10px] md:text-xs mb-6 md:mb-8 uppercase tracking-widest flex items-center gap-3">
              <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded bg-slate-900" />
              Contract Metadata
            </h4>
            <div className="space-y-6 md:space-y-8">
              <div>
                <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-3">
                  Revenue Split Clause
                </p>
                <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-bold uppercase tracking-tight">
                  50% Lead · 50% Equal Share
                </p>
              </div>
              <div className="pt-6 md:pt-8 border-t border-slate-100">
                <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-3">
                  Payment Structure
                </p>
                <p className="text-[11px] md:text-xs text-slate-500 leading-relaxed font-medium italic">
                  &quot;{project.payment_structure}&quot;
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
