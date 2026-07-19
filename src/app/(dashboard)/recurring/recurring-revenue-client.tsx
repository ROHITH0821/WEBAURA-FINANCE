'use client'

import { Fragment, useMemo, useState, useTransition } from 'react'
import * as navigation from 'next/navigation'
import {
  Plus,
  Loader2,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  RefreshCw,
  Pencil,
  Receipt,
  History,
  Trash2,
} from 'lucide-react'
import ExpiryBadge from '@/components/credentials/ExpiryBadge'
import { formatCurrency } from '@/lib/utils'
import type {
  RecurringFounderOption,
  RecurringPageData,
  RecurringProjectOption,
  RecurringRevenueRow,
  RecurringPaymentLogRow,
  RecurringAgencyOption,
} from '@/lib/recurring-revenue/data'
import {
  createRecurringClientAction,
  deleteRecurringPaymentLogAction,
  logRecurringPaymentAction,
  toggleRecurringActiveAction,
  updateRecurringClientAction,
} from '@/lib/recurring-revenue/actions'
import { createAgencyAction } from '@/lib/agency-actions'
import { REVENUE_TYPES, REVENUE_TYPE_LABELS, type RevenueType } from '@/types/finance'

type BillingCycle = 'monthly' | 'quarterly' | 'annual'

const billingCycles: BillingCycle[] = ['monthly', 'quarterly', 'annual']

function cycleLabel(cycle: BillingCycle) {
  if (cycle === 'quarterly') return 'Quarterly'
  if (cycle === 'annual') return 'Annual'
  return 'Monthly'
}

function emptyAddForm() {
  return {
    clientName: '',
    projectId: '',
    serviceDescription: '',
    amount: '',
    billingCycle: 'monthly' as BillingCycle,
    nextDueDate: '',
    revenueType: 'direct_client' as RevenueType,
    sharePercentage: '100',
    agencyId: '',
  }
}

function rowToEditForm(row: RecurringRevenueRow) {
  return {
    clientName: row.client_name,
    projectId: row.project_id || '',
    serviceDescription: row.service_description,
    amount: String(row.amount),
    billingCycle: row.billing_cycle,
    nextDueDate: row.next_due_date,
    revenueType: (row.revenue_type || 'direct_client') as RevenueType,
    sharePercentage: String(row.share_percentage ?? 100),
    agencyId: row.agency_id || '',
  }
}

function emptyPaymentForm(defaultReceivedBy: string, defaultAmount: number, defaultShare: number = 100) {
  return {
    amountReceived: String(defaultAmount || ''),
    grossAmount: '',
    sharePercentage: String(defaultShare ?? 100),
    paymentDate: new Date().toISOString().slice(0, 10),
    transactionRef: '',
    receivedBy: defaultReceivedBy,
    notes: '',
  }
}

function formatLogDate(dateStr: string) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function founderName(founders: RecurringFounderOption[], email: string) {
  const match = founders.find((f) => f.email.toLowerCase() === email.toLowerCase())
  return match?.name || email
}

export default function RecurringRevenueClient({
  data,
  defaultReceivedBy,
}: {
  data: RecurringPageData
  defaultReceivedBy: string
}) {
  const router = typeof navigation.useRouter === 'function' ? navigation.useRouter() : null
  const [isPending, startTransition] = useTransition()

  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState(emptyAddForm())
  const [addError, setAddError] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyAddForm())
  const [editError, setEditError] = useState('')

  const [loggingId, setLoggingId] = useState<string | null>(null)
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm(defaultReceivedBy, 0))
  const [paymentError, setPaymentError] = useState('')

  const [inactiveOpen, setInactiveOpen] = useState(false)
  const [toggleError, setToggleError] = useState('')
  const [historyId, setHistoryId] = useState<string | null>(null)
  const [deleteLogError, setDeleteLogError] = useState('')

  const [agencies, setAgencies] = useState<RecurringAgencyOption[]>(data.agencies || [])
  const [showNewAgency, setShowNewAgency] = useState(false)
  const [newAgencyName, setNewAgencyName] = useState('')
  const [agencyBusy, setAgencyBusy] = useState(false)
  const [agencyError, setAgencyError] = useState('')

  const handleAddAgency = async (onCreated: (agencyId: string) => void) => {
    const name = newAgencyName.trim()
    if (!name) return
    setAgencyBusy(true)
    setAgencyError('')
    try {
      const res = await createAgencyAction({ name })
      if (res.ok) {
        setAgencies((prev) =>
          [...prev.filter((a) => a.id !== res.agency.id), res.agency].sort((a, b) => a.name.localeCompare(b.name)),
        )
        onCreated(res.agency.id)
        setNewAgencyName('')
        setShowNewAgency(false)
      } else {
        setAgencyError(res.error)
      }
    } finally {
      setAgencyBusy(false)
    }
  }

  const metricCards = useMemo(
    () => [
      {
        label: 'Active Recurring Clients',
        value: String(data.metrics.activeClientCount),
        isCurrency: false,
      },
      {
        label: 'Monthly Recurring Revenue',
        value: formatCurrency(data.metrics.monthlyRecurringRevenue),
        isCurrency: true,
      },
      {
        label: 'Collected This Month',
        value: formatCurrency(data.metrics.collectedThisMonth),
        isCurrency: true,
      },
    ],
    [data.metrics],
  )

  const handleAddSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setAddError('')
    startTransition(async () => {
      const result = await createRecurringClientAction({
        clientName: addForm.clientName,
        projectId: addForm.projectId || null,
        serviceDescription: addForm.serviceDescription,
        amount: Number(addForm.amount),
        billingCycle: addForm.billingCycle,
        nextDueDate: addForm.nextDueDate,
        revenueType: addForm.revenueType,
        sharePercentage: Number(addForm.sharePercentage),
        agencyId: addForm.agencyId || null,
      })
      if (!result.ok) {
        setAddError(result.error)
        return
      }
      setAddForm(emptyAddForm())
      setShowAddForm(false)
      router?.refresh()
    })
  }

  const handleEditSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingId) return
    setEditError('')
    startTransition(async () => {
      const result = await updateRecurringClientAction({
        id: editingId,
        clientName: editForm.clientName,
        projectId: editForm.projectId || null,
        serviceDescription: editForm.serviceDescription,
        amount: Number(editForm.amount),
        billingCycle: editForm.billingCycle,
        nextDueDate: editForm.nextDueDate,
        revenueType: editForm.revenueType,
        sharePercentage: Number(editForm.sharePercentage),
        agencyId: editForm.agencyId || null,
      })
      if (!result.ok) {
        setEditError(result.error)
        return
      }
      setEditingId(null)
      router?.refresh()
    })
  }

  const handleLogPayment = (event: React.FormEvent) => {
    event.preventDefault()
    if (!loggingId) return
    setPaymentError('')
    startTransition(async () => {
      const result = await logRecurringPaymentAction({
        recurringId: loggingId,
        amountReceived: Number(paymentForm.amountReceived),
        paymentDate: paymentForm.paymentDate,
        transactionRef: paymentForm.transactionRef,
        receivedBy: paymentForm.receivedBy,
        notes: paymentForm.notes,
        grossAmount: paymentForm.grossAmount ? Number(paymentForm.grossAmount) : null,
        sharePercentage: paymentForm.sharePercentage ? Number(paymentForm.sharePercentage) : null,
      })
      if (!result.ok) {
        setPaymentError(result.error)
        return
      }
      setLoggingId(null)
      router?.refresh()
    })
  }

  const handleToggleActive = (row: RecurringRevenueRow) => {
    setToggleError('')
    startTransition(async () => {
      const result = await toggleRecurringActiveAction({
        id: row.id,
        isActive: !row.is_active,
      })
      if (!result.ok) {
        setToggleError(result.error)
        return
      }
      router?.refresh()
    })
  }

  const handleDeleteLog = (logId: string) => {
    if (!window.confirm('Delete this payment log? This cannot be undone.')) return
    setDeleteLogError('')
    startTransition(async () => {
      const result = await deleteRecurringPaymentLogAction({ logId })
      if (!result.ok) {
        setDeleteLogError(result.error)
        return
      }
      router?.refresh()
    })
  }

  return (
    <div className="space-y-6 md:space-y-10 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
      <div>
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 mb-2">
          Recurring Revenue
        </h2>
        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          Maintenance, SEO retainers, hosting, and other recurring client billing
        </p>
      </div>

      {data.loadError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900">
          {data.loadError}
        </div>
      ) : null}

      {toggleError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {toggleError}
        </div>
      ) : null}

      {deleteLogError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {deleteLogError}
        </div>
      ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3 md:gap-6">
        {metricCards.map((card) => (
          <div key={card.label} className="glass-card min-w-0 border-l-4 border-slate-900 p-4 sm:p-5 md:p-8">
            <p className="mb-1 text-[8px] font-black uppercase tracking-[0.18em] text-slate-400 sm:text-[9px] md:mb-2 md:text-[10px] md:tracking-[0.2em]">
              {card.label}
            </p>
            <h3 className="break-words text-lg font-black tabular-nums tracking-tight text-slate-900 sm:text-xl md:text-2xl lg:text-3xl">
              {card.value}
            </h3>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => {
            setShowAddForm((open) => !open)
            setAddError('')
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-[9px] font-black uppercase tracking-widest text-white transition-colors hover:bg-slate-800 md:px-8 md:py-4 md:text-[10px]"
        >
          <Plus className="h-4 w-4" />
          Add Recurring Client
        </button>
      </div>

      {showAddForm ? (
        <form onSubmit={handleAddSubmit} className="glass-card space-y-5 bg-white p-4 md:p-8">
          <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 md:text-base">
            New Recurring Client
          </h3>
          <RecurringClientFields
            form={addForm}
            projects={data.projects}
            onChange={setAddForm}
            agencies={agencies}
            showNewAgency={showNewAgency}
            newAgencyName={newAgencyName}
            agencyBusy={agencyBusy}
            agencyError={agencyError}
            onShowNewAgency={setShowNewAgency}
            onNewAgencyNameChange={setNewAgencyName}
            onAddAgency={handleAddAgency}
          />
          {addError ? <p className="text-sm font-medium text-rose-600">{addError}</p> : null}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Save Client
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setAddError('')
              }}
              className="rounded-xl border border-slate-200 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="glass-card min-w-0 overflow-hidden bg-white">
        <div className="border-b border-slate-100 px-4 py-4 md:px-8 md:py-6">
          <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 md:text-base">
            Active Recurring Clients
          </h3>
        </div>

        {data.activeRows.length === 0 ? (
          <div className="px-6 py-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
            No active recurring clients yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[9px] font-black uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3 md:px-6">Client</th>
                  <th className="px-4 py-3 md:px-6">Type</th>
                  <th className="px-4 py-3 md:px-6">Service</th>
                  <th className="px-4 py-3 md:px-6">Amount</th>
                  <th className="px-4 py-3 md:px-6">Next Due</th>
                  <th className="px-4 py-3 md:px-6">Active</th>
                  <th className="px-4 py-3 md:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.activeRows.map((row) => (
                  <Fragment key={row.id}>
                    <tr className="text-sm">
                      <td className="px-4 py-4 md:px-6">
                        <p className="font-black uppercase tracking-tight text-slate-900">{row.client_name}</p>
                        <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          {cycleLabel(row.billing_cycle)}
                        </p>
                      </td>
                      <td className="px-4 py-4 md:px-6">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-700">
                          {REVENUE_TYPE_LABELS[(row.revenue_type || 'direct_client') as RevenueType]}
                        </span>
                        <p className="mt-1 text-[9px] font-bold text-slate-400">{row.share_percentage ?? 100}% share</p>
                      </td>
                      <td className="px-4 py-4 md:px-6 text-slate-700">{row.service_description}</td>
                      <td className="px-4 py-4 md:px-6 font-black tabular-nums text-slate-900">
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="px-4 py-4 md:px-6">
                        <ExpiryBadge date={row.next_due_date} />
                      </td>
                      <td className="px-4 py-4 md:px-6">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleToggleActive(row)}
                          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                            row.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          aria-label={row.is_active ? 'Deactivate client' : 'Activate client'}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                              row.is_active ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-4 md:px-6">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setHistoryId(historyId === row.id ? null : row.id)
                              setLoggingId(null)
                              setEditingId(null)
                              setDeleteLogError('')
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-700 hover:border-slate-900"
                          >
                            <History className="h-3.5 w-3.5" />
                            History
                            {(data.paymentLogsByRecurringId[row.id] || []).length > 0 ? (
                              <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[8px] text-white">
                                {data.paymentLogsByRecurringId[row.id].length}
                              </span>
                            ) : null}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLoggingId(loggingId === row.id ? null : row.id)
                              setEditingId(null)
                              setHistoryId(null)
                              setPaymentForm(emptyPaymentForm(defaultReceivedBy, row.amount, row.share_percentage))
                              setPaymentError('')
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-700 hover:border-slate-900"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                            Log Payment
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(editingId === row.id ? null : row.id)
                              setLoggingId(null)
                              setHistoryId(null)
                              setEditForm(rowToEditForm(row))
                              setEditError('')
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-700 hover:border-slate-900"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>

                    {historyId === row.id ? (
                      <tr>
                        <td colSpan={7} className="bg-white px-4 py-4 md:px-6">
                          <PaymentHistoryPanel
                            logs={data.paymentLogsByRecurringId[row.id] || []}
                            founders={data.founders}
                            isPending={isPending}
                            onDelete={handleDeleteLog}
                          />
                        </td>
                      </tr>
                    ) : null}

                    {loggingId === row.id ? (
                      <tr>
                        <td colSpan={7} className="bg-slate-50/80 px-4 py-4 md:px-6">
                          <form onSubmit={handleLogPayment} className="space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                              Log payment for {row.client_name}
                            </p>
                            <PaymentFields
                              form={paymentForm}
                              founders={data.founders}
                              onChange={setPaymentForm}
                            />
                            {paymentError ? (
                              <p className="text-sm font-medium text-rose-600">{paymentError}</p>
                            ) : null}
                            <button
                              type="submit"
                              disabled={isPending}
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-60"
                            >
                              {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <IndianRupee className="h-4 w-4" />
                              )}
                              Record Payment
                            </button>
                          </form>
                        </td>
                      </tr>
                    ) : null}

                    {editingId === row.id ? (
                      <tr>
                        <td colSpan={7} className="bg-[#f7f7dc]/30 px-4 py-4 md:px-6">
                          <form onSubmit={handleEditSubmit} className="space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                              Edit {row.client_name}
                            </p>
                            <RecurringClientFields
                              form={editForm}
                              projects={data.projects}
                              onChange={setEditForm}
                              agencies={agencies}
                              showNewAgency={showNewAgency}
                              newAgencyName={newAgencyName}
                              agencyBusy={agencyBusy}
                              agencyError={agencyError}
                              onShowNewAgency={setShowNewAgency}
                              onNewAgencyNameChange={setNewAgencyName}
                              onAddAgency={handleAddAgency}
                            />
                            {editError ? (
                              <p className="text-sm font-medium text-rose-600">{editError}</p>
                            ) : null}
                            <button
                              type="submit"
                              disabled={isPending}
                              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-60"
                            >
                              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                              Save Changes
                            </button>
                          </form>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data.inactiveRows.length > 0 ? (
        <div className="glass-card overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => setInactiveOpen((open) => !open)}
            className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-4 text-left md:px-8 md:py-6"
          >
            <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 md:text-base">
              Inactive Clients ({data.inactiveRows.length})
            </h3>
            {inactiveOpen ? (
              <ChevronUp className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            )}
          </button>

          {inactiveOpen ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[9px] font-black uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="px-4 py-3 md:px-6">Client</th>
                    <th className="px-4 py-3 md:px-6">Service</th>
                    <th className="px-4 py-3 md:px-6">Amount</th>
                    <th className="px-4 py-3 md:px-6">Next Due</th>
                    <th className="px-4 py-3 md:px-6">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.inactiveRows.map((row) => (
                    <tr key={row.id} className="text-sm opacity-80">
                      <td className="px-4 py-4 md:px-6 font-black uppercase tracking-tight text-slate-900">
                        {row.client_name}
                      </td>
                      <td className="px-4 py-4 md:px-6 text-slate-700">{row.service_description}</td>
                      <td className="px-4 py-4 md:px-6 font-black tabular-nums text-slate-900">
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="px-4 py-4 md:px-6">
                        <ExpiryBadge date={row.next_due_date} />
                      </td>
                      <td className="px-4 py-4 md:px-6">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleToggleActive(row)}
                          className="relative inline-flex h-7 w-12 items-center rounded-full bg-slate-300 transition-colors"
                          aria-label="Reactivate client"
                        >
                          <span className="inline-block h-5 w-5 translate-x-1 transform rounded-full bg-white" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function PaymentHistoryPanel({
  logs,
  founders,
  isPending,
  onDelete,
}: {
  logs: RecurringPaymentLogRow[]
  founders: RecurringFounderOption[]
  isPending: boolean
  onDelete: (logId: string) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Payment history</p>
      {logs.length === 0 ? (
        <p className="text-sm text-slate-400">No payments logged yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-[9px] font-black uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Received by</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{formatLogDate(log.payment_date)}</td>
                  <td className="px-4 py-3 font-black tabular-nums text-emerald-700">
                    {formatCurrency(log.amount_received)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{log.transaction_ref}</td>
                  <td className="px-4 py-3 text-slate-600">{founderName(founders, log.received_by)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => onDelete(log.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function RecurringClientFields({
  form,
  projects,
  onChange,
  agencies,
  showNewAgency,
  newAgencyName,
  agencyBusy,
  agencyError,
  onShowNewAgency,
  onNewAgencyNameChange,
  onAddAgency,
}: {
  form: ReturnType<typeof emptyAddForm>
  projects: RecurringProjectOption[]
  onChange: (next: ReturnType<typeof emptyAddForm>) => void
  agencies: RecurringAgencyOption[]
  showNewAgency: boolean
  newAgencyName: string
  agencyBusy: boolean
  agencyError: string
  onShowNewAgency: (v: boolean) => void
  onNewAgencyNameChange: (v: string) => void
  onAddAgency: (onCreated: (agencyId: string) => void) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <label className="space-y-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Client name</span>
        <input
          required
          value={form.clientName}
          onChange={(event) => onChange({ ...form, clientName: event.target.value })}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
          placeholder="Client or business name"
        />
      </label>

      <label className="space-y-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Linked project</span>
        <select
          value={form.projectId}
          onChange={(event) => onChange({ ...form, projectId: event.target.value })}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
        >
          <option value="">Skip — no linked project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.label}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2 md:col-span-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Service description</span>
        <input
          required
          value={form.serviceDescription}
          onChange={(event) => onChange({ ...form, serviceDescription: event.target.value })}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
          placeholder="Website Maintenance, Monthly SEO, Hosting Management…"
        />
      </label>

      <label className="space-y-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Amount (₹)</span>
        <input
          required
          type="number"
          min={1}
          step={1}
          value={form.amount}
          onChange={(event) => onChange({ ...form, amount: event.target.value })}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
          placeholder="5000"
        />
      </label>

      <label className="space-y-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Revenue type</span>
        <select
          value={form.revenueType}
          onChange={(event) => onChange({ ...form, revenueType: event.target.value as RevenueType })}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
        >
          {REVENUE_TYPES.map((rt) => (
            <option key={rt} value={rt}>{REVENUE_TYPE_LABELS[rt]}</option>
          ))}
        </select>
      </label>

      <label className="space-y-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Default share (%)</span>
        <input
          required
          type="number"
          min={0}
          max={100}
          step="0.01"
          value={form.sharePercentage}
          onChange={(event) => onChange({ ...form, sharePercentage: event.target.value })}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
          placeholder="100"
        />
      </label>

      {form.revenueType === 'agency_digital_marketing' ? (
        <div className="space-y-2 md:col-span-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Agency</span>
          <select
            value={form.agencyId}
            onChange={(event) => onChange({ ...form, agencyId: event.target.value })}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
          >
            <option value="">Select agency</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          {showNewAgency ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newAgencyName}
                onChange={(event) => onNewAgencyNameChange(event.target.value)}
                placeholder="New agency name"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={agencyBusy || !newAgencyName.trim()}
                onClick={() => onAddAgency((agencyId) => onChange({ ...form, agencyId }))}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40"
              >
                {agencyBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => onShowNewAgency(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-widest hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onShowNewAgency(true)}
              className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900"
            >
              <Plus className="w-3 h-3" />
              New agency
            </button>
          )}
          {agencyError ? <p className="text-[10px] font-bold text-rose-600">{agencyError}</p> : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Billing cycle</span>
        <div className="flex flex-wrap gap-2">
          {billingCycles.map((cycle) => (
            <button
              key={cycle}
              type="button"
              onClick={() => onChange({ ...form, billingCycle: cycle })}
              className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                form.billingCycle === cycle
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 text-slate-600 hover:border-slate-900'
              }`}
            >
              {cycleLabel(cycle)}
            </button>
          ))}
        </div>
      </div>

      <label className="space-y-2 md:col-span-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Next due date</span>
        <input
          required
          type="date"
          value={form.nextDueDate}
          onChange={(event) => onChange({ ...form, nextDueDate: event.target.value })}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
        />
      </label>
    </div>
  )
}

function PaymentFields({
  form,
  founders,
  onChange,
}: {
  form: ReturnType<typeof emptyPaymentForm>
  founders: RecurringFounderOption[]
  onChange: (next: ReturnType<typeof emptyPaymentForm>) => void
}) {
  const handleGrossOrShareChange = (next: { grossAmount?: string; sharePercentage?: string }) => {
    const merged = { ...form, ...next }
    const gross = Number(merged.grossAmount)
    const share = Number(merged.sharePercentage)
    const computedNet =
      merged.grossAmount && Number.isFinite(gross) && Number.isFinite(share)
        ? Math.round(gross * (share / 100))
        : merged.amountReceived
    onChange({ ...merged, amountReceived: merged.grossAmount ? String(computedNet) : merged.amountReceived })
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <label className="space-y-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Gross amount (₹) — optional</span>
        <input
          type="number"
          value={form.grossAmount}
          onChange={(event) => handleGrossOrShareChange({ grossAmount: event.target.value })}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
          placeholder="Total deal value"
        />
      </label>

      <label className="space-y-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Share %</span>
        <input
          type="number"
          min={0}
          max={100}
          step="0.01"
          value={form.sharePercentage}
          onChange={(event) => handleGrossOrShareChange({ sharePercentage: event.target.value })}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
        />
      </label>

      <label className="space-y-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Amount received / net (₹) — gross × share %</span>
        <input
          required
          type="number"
          min={1}
          step={1}
          value={form.amountReceived}
          onChange={(event) => onChange({ ...form, amountReceived: event.target.value })}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
        />
      </label>

      <label className="space-y-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Payment date</span>
        <input
          required
          type="date"
          value={form.paymentDate}
          onChange={(event) => onChange({ ...form, paymentDate: event.target.value })}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
        />
      </label>

      <label className="space-y-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Transaction reference</span>
        <input
          required
          value={form.transactionRef}
          onChange={(event) => onChange({ ...form, transactionRef: event.target.value })}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
          placeholder="UPI ref / bank txn id"
        />
      </label>

      <label className="space-y-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Received by</span>
        <select
          required
          value={form.receivedBy}
          onChange={(event) => onChange({ ...form, receivedBy: event.target.value })}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
        >
          <option value="">Select founder</option>
          {founders.map((founder) => (
            <option key={founder.email} value={founder.email}>
              {founder.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
