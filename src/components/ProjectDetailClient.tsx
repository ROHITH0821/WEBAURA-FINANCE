'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import * as navigation from 'next/navigation'
import { History, Receipt, Shield, Plus, Calendar } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import ClientVault from '@/components/credentials/ClientVault'
import { ToastProvider } from '@/components/Toast'

type TabId = 'payments' | 'expenses' | 'vault'

export default function ProjectDetailClient({
  project,
  payments,
  expenses,
  foundersByEmail,
  vaultHasRecord,
  defaultWebsiteUrl,
}: {
  project: any
  payments: any[]
  expenses: any[]
  foundersByEmail: Record<string, string>
  vaultHasRecord: boolean
  defaultWebsiteUrl: string
}) {
  const searchParams =
    typeof navigation.useSearchParams === 'function' ? navigation.useSearchParams() : null
  const [tab, setTab] = useState<TabId>('payments')
  const id = String(project.id)

  useEffect(() => {
    const t =
      searchParams?.get('tab') ??
      (typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('tab')
        : null)
    if (t === 'vault' || t === 'expenses' || t === 'payments') setTab(t)
  }, [searchParams])

  const tabs: { id: TabId; label: string; icon: typeof History }[] = [
    { id: 'payments', label: 'Payment History', icon: History },
    { id: 'expenses', label: 'Project Expenses', icon: Receipt },
    { id: 'vault', label: 'Client Vault', icon: Shield },
  ]

  return (
    <ToastProvider>
      <div className="glass-card overflow-hidden bg-white">
        <div className="flex flex-wrap gap-1 p-2 md:p-3 border-b border-slate-100 bg-slate-50/50">
          {tabs.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
                  active
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                    : 'text-slate-500 hover:bg-white hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            )
          })}
        </div>

        {tab === 'payments' ? (
          <>
            <div className="p-4 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-widest">
                Transaction History
              </h3>
              <Link
                href={`/projects/${id}/payment/new`}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest"
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
                  {payments.length > 0 ? (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-[#f7f7dc]/30 transition-colors">
                        <td className="px-6 md:px-10 py-6 md:py-8">
                          <div className="flex items-center gap-2 text-slate-900 font-bold text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-slate-300" />
                            {new Date(p.payment_date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-6 md:py-8">
                          <span className="text-[9px] font-black uppercase tracking-widest">{p.payment_stage}</span>
                        </td>
                        <td className="px-4 md:px-6 py-6 md:py-8 text-right font-black text-sm">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="px-6 md:px-10 py-6 md:py-8 text-center">
                          <span className={p.verified ? 'badge-green' : 'badge-slate'}>
                            {p.verified ? 'verified' : 'unverified'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-10 py-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                        No transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {tab === 'expenses' ? (
          <div className="p-4 md:p-8">
            <h3 className="text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-widest mb-6">
              Project Expenses
            </h3>
            {expenses.length > 0 ? (
              <div className="space-y-3">
                {expenses.map((e) => (
                  <div
                    key={e.id}
                    className="flex flex-wrap justify-between gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50/50"
                  >
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase">{e.spent_on}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {e.category} ·{' '}
                        {foundersByEmail[String(e.requested_by || '').toLowerCase()] || e.requested_by}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">{formatCurrency(e.amount)}</p>
                      <span className={`text-[9px] font-black uppercase ${e.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {e.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-8 text-center">
                No expenses linked to this project
              </p>
            )}
          </div>
        ) : null}

        {tab === 'vault' ? (
          <div className="space-y-4 p-4 md:p-6">
            <div className="rounded-xl border-2 border-slate-200 bg-gradient-to-br from-[#f7f7dc]/40 to-white px-5 py-4">
              <p className="font-mono text-sm font-black tracking-tight text-slate-600">
                {project.project_code || '—'}
              </p>
              <h3 className="mt-1 text-xl font-black leading-tight tracking-tight text-slate-900 md:text-2xl">
                {String(project.project_name || project.client_name || 'Project')}
              </h3>
              {project.project_name &&
              project.client_name &&
              String(project.project_name).toLowerCase() !==
                String(project.client_name).toLowerCase() ? (
                <p className="mt-1 text-sm font-bold text-slate-700">
                  Client: <span className="font-black text-slate-900">{project.client_name}</span>
                </p>
              ) : null}
            </div>
            <ClientVault
              projectId={id}
              defaultClientName={String(project.client_name || '')}
              defaultWebsiteUrl={defaultWebsiteUrl}
              hasRecord={vaultHasRecord}
              expandAllOnLoad
              hideProjectHeader
              startInEditMode={!vaultHasRecord}
            />
          </div>
        ) : null}
      </div>
    </ToastProvider>
  )
}
